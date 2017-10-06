import React, { Component } from 'react';
import {
  Alert,
  Button,
  Image,
  InteractionManager,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapboxGL from '@mapbox/react-native-mapbox-gl';
import Icon from 'react-native-vector-icons/Ionicons';
import turfInside from '@turf/inside';
import bboxPolygon from '@turf/bbox-polygon';
import { throttle, debounce } from 'lodash';
import AddFeature from './AddFeature';
import FeatureCount from './FeatureCount';
import FeatureDetails from './FeatureDetails';
import FAnnotation, { FAnnotationView } from './FAnnotation';
import { blue, orange, lightOrange, green, gray, darkGray } from './styles';
import * as wfs from './wfs';
import * as db from './db';

const accessToken = 'pk.eyJ1IjoiZnNydyIsImEiOiJsSGQzaF8wIn0.aqDZlnSVjqRLPaDqtdnucg';
MapboxGL.setAccessToken(accessToken);

const layerStyles = MapboxGL.StyleSheet.create({
  points: {
    circleRadius: 7,
    circleColor: '#FF4136',
    circleOpacity: 0.9,
    circleStrokeWidth: 2,
    circleStrokeColor: '#fff',
  },
  selectedFeature: {
    circleRadius: 7,
    circleColor: '#FFDC00',
    circleOpacity: 1,
    circleStrokeWidth: 2,
    circleStrokeColor: '#111111',
  },
});

let self;
export default class LayerDetails extends Component {
  state = {
    renderPlaceholderOnly: true,
    loading: false,
    centerCoordinate: [0, 0],
    annotations: [],
    geojson: null,
    selectedFeature: null,
    editing: false,
    trackingLocation: false,
  };
  static navigationOptions = ({ navigation }) => ({
    title: JSON.parse(navigation.state.params.layer.metadata).Title,
    headerRight: navigation.state.params.adding ? null : (
      <TouchableOpacity
        onPress={() => {
          self.setState({ selectedFeature: null });
          navigation.setParams({ adding: true });
        }}
      >
        <Text style={styles.addBtnStyle}>Add</Text>
      </TouchableOpacity>
    ),
  });
  constructor(props) {
    super(props);
    self = this;
  }

  onOpenAnnotation = feature => {
    this.setState({ selectedFeature: feature });
  };

  onAddData = e => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    this.props.navigation.setParams({ adding: false });

    let feature;
    const metadata = JSON.parse(layer.metadata);
    if (metadata.geomType === 'gml:MultiPointPropertyType') {
      feature = {
        geometry: {
          type: 'MultiPoint',
          coordinates: [this.state.centerCoordinate],
        },
      };
    } else if (metadata.geomType === 'gml:PointPropertyType') {
      feature = {
        geometry: {
          type: 'Point',
          coordinates: this.state.centerCoordinate,
        },
      };
    }
    const operation = 'insert';
    navigate('Form', { layer, wfs, feature, operation });
  };

  onAddCancel = () => {
    this.props.navigation.setParams({ adding: false });
  };

  onRegionDidChange = e => {
    this.setState({ centerCoordinate: e.geometry.coordinates });
  };

  onEditClose = () => {
    this.setState({ selectedFeature: null });
  };

  onEditLocation = () => {
    let coord;
    if (this.state.selectedFeature.geometry.type === 'Point') {
      coord = this.state.selectedFeature.geometry.coordinates;
    } else if (this.state.selectedFeature.geometry.type === 'MultiPoint') {
      coord = this.state.selectedFeature.geometry.coordinates[0];
    }
    this.setState({
      centerCoordinate: coord,
      editing: true,
    });
    this._map.flyTo(coord, 1);
  };

  onEditLocationCancel = () => {
    this.setState({ editing: false });
  };

  onEditLocationSave = async () => {
    const { layer, wfs } = this.props.navigation.state.params;
    const operation = 'update';
    let gj;
    if (this.state.selectedFeature.geometry.type === 'Point') {
      gj = {
        ...this.state.selectedFeature,
        geometry: {
          type: 'Point',
          coordinates: this.state.centerCoordinate,
        },
      };
    } else if (this.state.selectedFeature.geometry.type === 'MultiPoint') {
      gj = {
        ...this.state.selectedFeature,
        geometry: {
          type: 'MultiPoint',
          coordinates: [this.state.centerCoordinate],
        },
      };
    }
    const submission = db.save(layer, gj, operation);
    if (submission) {
      const insertSuccess = await db.insert(submission);
      if (insertSuccess) {
        // success
        Alert.alert('Success', 'Location has been updated.', [{ text: 'OK' }]);
      } else {
        Alert.alert(
          'Saved',
          "This update was unable to be uploaded. It's been saved, and you can attempt to sync at a later time.",
          [{ text: 'OK' }]
        );
      }
    } else {
      Alert.alert('Error', 'There was an error saving this update. Please try again.', [
        { text: 'OK' },
      ]);
    }
    this.setState({ editing: false, selectedFeature: null });
    this.makeAnnotations();
  };

  onEditProperties = () => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    const feature = this.state.selectedFeature;
    const operation = 'update';
    navigate('Form', { layer, wfs, feature, operation });
  };

  onPressDelete = async () => {
    const feature = this.state.selectedFeature;
    const layer = this.props.navigation.state.params.layer;
    await db.deleteFeature(layer, feature);
    this.setState({ selectedFeature: null });
  };

  onTap = payload => {
    this.setState({ selectedFeature: null });
  };

  onMapPress = async e => {
    const { screenPointX, screenPointY } = e.properties;

    const featureCollection = await this._map.queryRenderedFeaturesInRect(
      [screenPointY + 10, screenPointX + 10, screenPointY - 10, screenPointX - 10],
      null,
      ['pointLayer']
    );
    if (featureCollection.features.length) {
      this.setState({
        selectedFeature: featureCollection.features[0],
      });
    } else {
      this.setState({
        selectedFeature: null,
      });
    }
  };

  onPressLocation = () => {
    if (this.state.trackingLocation) {
      this.setState({ trackingLocation: false });
    } else {
      this.setState({ trackingLocation: true });
      navigator.geolocation.getCurrentPosition(
        position => {
          this._map.setCamera({
            centerCoordinate: [position.coords.longitude, position.coords.latitude],
            zoomLevel: 16,
            duration: 100,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }
  };

  makeAnnotations = async () => {
    const { layer } = this.props.navigation.state.params;
    const metadata = JSON.parse(layer.metadata);
    this.setState({ loading: true });
    const featureCollection = await wfs.getFeatures(this.props.navigation.state.params.wfs, layer);
    this.setState({ geojson: featureCollection });
  };

  zoomToLayerBounds = () => {
    const { layer } = this.props.navigation.state.params;
    const metadata = JSON.parse(layer.metadata);
    setTimeout(() => {
      this._map.fitBounds(
        [+metadata.bbox[0], +metadata.bbox[1]],
        [+metadata.bbox[2], +metadata.bbox[3]],
        100,
        0
      );
    }, 1000);
  };

  onDidFinishRenderingMapFully = () => {
    this.setState({ loading: false });
  };

  componentDidMount() {
    InteractionManager.runAfterInteractions(() => {
      this.setState({ renderPlaceholderOnly: false }, () => {
        this.zoomToLayerBounds();
        this.makeAnnotations();
      });
    });
  }

  render() {
    const { navigate } = this.props.navigation;
    const { layer, adding } = this.props.navigation.state.params;
    if (this.state.renderPlaceholderOnly) {
      return <View />;
    }
    return (
      <View style={styles.container}>
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.toolbar} pointerEvents="box-none">
            <TouchableOpacity
              style={[
                styles.locationButton,
                { backgroundColor: this.state.trackingLocation ? '#4F8EF7' : 'white' },
              ]}
              onPress={this.onPressLocation}
            >
              <Icon
                name="md-locate"
                size={15}
                color={this.state.trackingLocation ? 'white' : '#4F8EF7'}
              />
            </TouchableOpacity>
          </View>
          {this.state.editing && (
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.centerOverlay} pointerEvents="none">
                <FAnnotationView
                  radius={15}
                  backgroundColor={'rgba(255,220,0,0.8)'}
                  selected={true}
                />
              </View>
              <View style={styles.topOverlay} pointerEvents="box-none">
                <View style={{ padding: 8, backgroundColor: 'white' }}>
                  <Text>Drag map to change location.</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                    <Button onPress={this.onEditLocationCancel} title="Cancel" color={'#D9534F'} />
                    <Button onPress={this.onEditLocationSave} title="Save" />
                  </View>
                </View>
              </View>
            </View>
          )}
          {adding && (
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.centerOverlay} pointerEvents="none">
                <FAnnotationView
                  radius={10}
                  backgroundColor={'rgba(255,220,0,0.8)'}
                  selected={true}
                />
              </View>
              <View style={styles.topOverlay} pointerEvents="box-none">
                <AddFeature onAddData={this.onAddData} onAddCancel={this.onAddCancel} />
              </View>
            </View>
          )}
          {!!!this.state.selectedFeature && (
            <View style={styles.bottomOverlay} pointerEvents="box-none">
              <FeatureCount
                loading={this.state.loading}
                geojson={this.state.geojson}
                limit={wfs.LIMIT}
              />
            </View>
          )}
        </View>
        <MapboxGL.MapView
          ref={map => {
            this._map = map;
          }}
          style={styles.map}
          onPress={this.onMapPress}
          onRegionDidChange={this.onRegionDidChange}
          onDidFinishRenderingMapFully={this.onDidFinishRenderingMapFully}
          showUserLocation={this.state.trackingLocation}
        >
          {!!this.state.geojson && (
            <MapboxGL.ShapeSource id="pointSource" shape={this.state.geojson}>
              <MapboxGL.CircleLayer id="pointLayer" style={layerStyles.points} />
            </MapboxGL.ShapeSource>
          )}
          {!!this.state.selectedFeature &&
            !this.state.editing && (
              <MapboxGL.ShapeSource id="selectedFeatureSource" shape={this.state.selectedFeature}>
                <MapboxGL.CircleLayer
                  id="selectedFeatureFill"
                  style={layerStyles.selectedFeature}
                  aboveLayerID="pointLayer"
                />
              </MapboxGL.ShapeSource>
            )}
        </MapboxGL.MapView>
        {!!this.state.selectedFeature &&
          !this.state.editing && (
            <View style={[styles.overlay, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
              <FeatureDetails
                layer={layer}
                key={`${this.state.selectedFeature.id}_details`}
                selectedFeature={this.state.selectedFeature}
                onEditClose={this.onEditClose}
                onEditProperties={this.onEditProperties}
                onEditLocation={this.onEditLocation}
                onPressDelete={this.onPressDelete}
              />
            </View>
          )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  centerOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  topOverlay: {
    justifyContent: 'flex-start',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  bottomOverlay: {
    justifyContent: 'flex-end',
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 100,
    width: 100,
  },

  centerPin: {
    height: 50,
    width: 50,
    tintColor: green,
  },
  map: {
    flex: 1,
    zIndex: 1,
  },
  addBtnStyle: {
    paddingRight: 16,
    color: 'white',
  },
  toolbar: {
    backgroundColor: 'rgba(0,0,0,0)',
    padding: 8,
  },
  locationButton: {
    height: 30,
    width: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
