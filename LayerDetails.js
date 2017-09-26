import React, { Component } from 'react';
import { Button, Image, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Mapbox, { Annotation, MapView } from 'react-native-mapbox-gl';
import AddFeature from './AddFeature';
import FeatureCount from './FeatureCount';
import FeatureDetails from './FeatureDetails';
import FAnnotation, { FAnnotationView } from './FAnnotation';
import { blue, orange, lightOrange, green, gray, darkGray } from './styles';
import * as wfs from './wfs';
import * as db from './db';

const markerAdd = require('./marker-add.png');

const accessToken = 'pk.eyJ1IjoiZnNydyIsImEiOiJsSGQzaF8wIn0.aqDZlnSVjqRLPaDqtdnucg';
Mapbox.setAccessToken(accessToken);

let self;
export default class LayerDetails extends Component {
  state = { annotations: [], geojson: null, selectedFeature: null, editing: false };
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
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    this.setState({ selectedFeature: feature });
  };

  onAddData = e => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    this.props.navigation.setParams({ adding: false });
    this._map.getCenterCoordinateZoomLevel(data => {
      const feature = {
        geometry: {
          type: 'Point',
          coordinates: [data.longitude, data.latitude],
        },
      };
      const operation = 'insert';
      navigate('Form', { layer, wfs, feature, operation });
    });
  };

  onAddCancel = () => {
    this.props.navigation.setParams({ adding: false });
  };

  onRegionDidChange = () => {
    this.makeAnnotations();
  };

  onEditClose = () => {
    this.setState({ selectedFeature: null });
  };

  onEditLocation = () => {
    this._map.setCenterCoordinate(
      this.state.selectedFeature.geometry.coordinates[1],
      this.state.selectedFeature.geometry.coordinates[0],
      true,
      () => {
        this.setState({ editing: true });
      }
    );
  };

  onEditLocationCancel = () => {
    this.setState({ editing: false });
  };

  onEditLocationSave = () => {
    const { layer, wfs } = this.props.navigation.state.params;
    const operation = 'update';
    this._map.getCenterCoordinateZoomLevel(data => {
      const gj = {
        ...this.state.selectedFeature,
        geometry: {
          ...this.state.selectedFeature.geometry,
          coordinates: [data.longitude, data.latitude],
        },
      };
      db.save(layer, gj, operation);
      this.setState({ editing: false, selectedFeature: null });
      this.makeAnnotations();
    });
  };

  onEditProperties = () => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    const feature = this.state.selectedFeature;
    const operation = 'update';
    this.setState({ selectedFeature: null });
    navigate('Form', { layer, wfs, feature, operation });
  };

  makeAnnotations = async () => {
    const { layer } = this.props.navigation.state.params;
    this._map.getCenterCoordinateZoomLevel(data => {
      this._map.getBounds(async bounds => {
        const geojson = await wfs.getFeatures(
          this.props.navigation.state.params.wfs.url,
          layer,
          bounds
        );
        geojson.features = geojson.features.filter(
          feature =>
            feature.geometry &&
            (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint')
        );

        this.setState({ geojson });
      });
    });
  };

  zoomToLayerBounds = () => {
    const { layer } = this.props.navigation.state.params;
    const metadata = JSON.parse(layer.metadata);
    setTimeout(() => {
      this._map.setVisibleCoordinateBounds(
        +metadata.bbox[1],
        +metadata.bbox[0],
        +metadata.bbox[3],
        +metadata.bbox[2],
        100,
        100,
        100,
        100
      );
    }, 1000);
  };

  componentDidMount() {
    this.zoomToLayerBounds();
    this.makeAnnotations();
  }

  render() {
    const { navigate } = this.props.navigation;
    const { layer, adding } = this.props.navigation.state.params;
    return (
      <View style={styles.container}>
        <View style={styles.overlay} pointerEvents="box-none">
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
                  radius={15}
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
              <FeatureCount geojson={this.state.geojson} limit={wfs.LIMIT} />
            </View>
          )}
        </View>
        <MapView
          ref={map => {
            this._map = map;
          }}
          style={styles.map}
          annotationsAreImmutable
          annotationsPopUpEnabled={false}
          onOpenAnnotation={this.onOpenAnnotation}
          onRegionDidChange={this.onRegionDidChange}
        >
          {!!this.state.geojson &&
            !!this.state.geojson.features.length &&
            this.state.geojson.features.map(f => {
              let backgroundColor = 'rgba(255,65,54,0.9)';
              let selected = false;
              let radius = 10;
              if (this.state.selectedFeature && this.state.selectedFeature.id === f.id) {
                if (this.state.editing) return false;
                backgroundColor = 'rgba(255,220,0,0.8)';
                selected = true;
                radius = 15;
              }
              return (
                <FAnnotation
                  key={f.id}
                  feature={f}
                  onOpenAnnotation={this.onOpenAnnotation}
                  backgroundColor={backgroundColor}
                  radius={radius}
                  selected={selected}
                />
              );
            })}
        </MapView>
        {!!this.state.selectedFeature &&
          !this.state.editing && (
            <View style={[styles.overlay, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
              <FeatureDetails
                selectedFeature={this.state.selectedFeature}
                onEditClose={this.onEditClose}
                onEditProperties={this.onEditProperties}
                onEditLocation={this.onEditLocation}
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
});
