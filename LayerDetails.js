import React, { Component } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Dimensions,
  InteractionManager,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapboxGL from '@mapbox/react-native-mapbox-gl';
import Icon from 'react-native-vector-icons/Ionicons';
import MapSkin from './MapSkin';
import turfInside from '@turf/inside';
import bboxPolygon from '@turf/bbox-polygon';
import { throttle, debounce } from 'lodash';
import FeatureCount from './FeatureCount';
import FeatureDetails from './FeatureDetails';
import FAnnotation, { FAnnotationView } from './FAnnotation';
import Loading from './Loading';
import CreateMenu from './CreateMenu';
import { blue, orange, lightOrange, green, gray, darkGray } from './styles';
import * as wfs from './wfs';
import * as db from './db';

const accessToken =
  'sk.eyJ1IjoiYm91bmRsZXNzIiwiYSI6ImNqOTV0Ym50ZjRsYWozM241c3JxOTJkZzcifQ.MgzQw0Pab-97VfWFfYzOpg';
MapboxGL.setAccessToken(accessToken);

const emptyFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const layerStyles = MapboxGL.StyleSheet.create({
  points: {
    circleRadius: 5,
    circleColor: '#FF4136',
    circleOpacity: 0.9,
    circleStrokeWidth: 2,
    circleStrokeColor: '#fff',
  },
  selectedFeature: {
    circleRadius: 5,
    circleColor: '#FF4136',
    circleOpacity: 0.9,
    circleStrokeWidth: 2,
    circleStrokeColor: '#FFDC00',
  },
  pointsUnsynced: {
    circleRadius: 5,
    circleColor: '#B10DC9',
    circleOpacity: 0.9,
    circleStrokeWidth: 2,
    circleStrokeColor: '#fff',
  },
  pointsUnsyncedSelected: {
    circleRadius: 5,
    circleColor: '#B10DC9',
    circleOpacity: 0.9,
    circleStrokeWidth: 2,
    circleStrokeColor: '#FFDC00',
  },
});

export default class LayerDetails extends Component {
  state = {
    renderPlaceholderOnly: true,
    loading: false,
    adding: false,
    centerCoordinate: [0, 0],
    annotations: [],
    geojson: null,
    unSyncedFeatureCollection: null,
    selectedFeature: null,
    editing: false,
    trackingLocation: false,
    working: false,
    useSatellite: false,
  };

  static navigationOptions = ({ navigation }) => ({
    title: JSON.parse(navigation.state.params.layer.metadata).Title,
  });

  onAddData = e => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    this.setState({ adding: false });

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
    requestAnimationFrame(() => {
      navigate('Form', {
        layer,
        wfs,
        feature,
        operation,
        makeAnnotations: this.makeAnnotations,
        selectFeature: this.selectFeature,
        deselectFeature: this.deselectFeature,
      });
    });
  };

  onAddCancel = () => {
    this.setState({ adding: false });
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
    this.setState({ working: true });
    if (this.state.selectedFeature.unsynced) {
      const success = db.updateSubmission(gj);
      this.setState({ working: false });
      if (success) {
        requestAnimationFrame(() => {
          Alert.alert('Success', 'Location has been updated.', [{ text: 'OK' }]);
        });
      } else {
        requestAnimationFrame(() => {
          Alert.alert('Error', 'There was an error saving this update. Please try again.', [
            { text: 'OK' },
          ]);
        });
      }
    } else {
      const submission = db.save(layer, gj, operation);
      if (submission) {
        const insertSuccess = await db.insert(submission);
        this.setState({ working: false });
        setTimeout(() => {
          if (insertSuccess) {
            requestAnimationFrame(() => {
              Alert.alert('Success', 'Location has been updated.', [{ text: 'OK' }]);
            });
          } else {
            requestAnimationFrame(() => {
              Alert.alert(
                'Saved',
                "This update was unable to be uploaded. It's been saved, and you can attempt to sync at a later time.",
                [{ text: 'OK' }]
              );
            });
          }
        }, 200);
      } else {
        this.setState({ working: false });
        requestAnimationFrame(() => {
          Alert.alert('Error', 'There was an error saving this update. Please try again.', [
            { text: 'OK' },
          ]);
        });
      }
    }
    this.setState({ editing: false, selectedFeature: null });
    this.makeAnnotations();
  };

  onEditProperties = () => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    const feature = this.state.selectedFeature;
    const operation = 'update';
    navigate('Form', {
      layer,
      wfs,
      feature,
      operation,
      makeAnnotations: this.makeAnnotations,
      selectFeature: this.selectFeature,
      deselectFeature: this.deselectFeature,
    });
  };

  onPressDelete = () => {
    if (this.state.selectedFeature.unsynced) {
      Alert.alert(
        'Delete Submission?',
        'This will delete this submission from your device.',
        [
          { text: 'Delete', onPress: this.deleteFeature },
          { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        'Delete Record?',
        'This will delete this record from your device and from Exchange.',
        [
          { text: 'Delete', onPress: this.deleteFeature },
          { text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel' },
        ],
        { cancelable: false }
      );
    }
  };

  onMapPress = async e => {
    const { screenPointX, screenPointY } = e.properties;
    let featureCollection = await this._map.queryRenderedFeaturesInRect(
      [screenPointY + 23, screenPointX + 23, screenPointY - 23, screenPointX - 23],
      null,
      ['pointLayer']
    );

    let featureCollectionUnsynced = await this._map.queryRenderedFeaturesInRect(
      [screenPointY + 23, screenPointX + 23, screenPointY - 23, screenPointX - 23],
      null,
      ['pointsUnsynced']
    );

    if (featureCollection.features.length) {
      this.selectFeature(featureCollection.features[0], false);
    } else if (featureCollectionUnsynced.features.length) {
      this.selectFeature(featureCollectionUnsynced.features[0], true);
    } else {
      this.deselectFeature();
    }
  };

  selectFeature = (feature, unsynced) => {
    const newState = {};
    if (unsynced) {
      feature.unsynced = true;
      newState.selectedFeature = feature;
      if (this.state.unSyncedFeatureCollection) {
        newState.unSyncedFeatureCollection = {
          type: 'FeatureCollection',
          features: this.state.unSyncedFeatureCollection.features.map(f => {
            if (f.id === feature.id) {
              f.properties.selected = true;
            } else {
              delete f.properties.selected;
            }
            return f;
          }),
        };
      }
      if (this.state.geojson) {
        newState.geojson = {
          type: 'FeatureCollection',
          features: this.state.geojson.features.map(f => {
            delete f.properties.selected;
            return f;
          }),
        };
      }
    } else {
      newState.selectedFeature = feature;
      if (this.state.geojson) {
        newState.geojson = {
          type: 'FeatureCollection',
          features: this.state.geojson.features.map(f => {
            if (f.id === feature.id) {
              f.properties.selected = true;
            } else {
              delete f.properties.selected;
            }
            return f;
          }),
        };
      }
      if (this.state.unSyncedFeatureCollection) {
        newState.unSyncedFeatureCollection = {
          type: 'FeatureCollection',
          features: this.state.unSyncedFeatureCollection.features.map(f => {
            delete f.properties.selected;
            return f;
          }),
        };
      }
    }
    this.setState(newState);
  };

  deselectFeature = () => {
    const newState = {
      selectedFeature: null,
    };
    if (this.state.geojson) {
      const features = this.state.geojson.features.map(f => {
        delete f.properties.selected;
        return f;
      });
      const geojson = {
        type: 'FeatureCollection',
        features,
      };
      newState.geojson = geojson;
    }
    if (this.state.unSyncedFeatureCollection) {
      const featuresU = this.state.unSyncedFeatureCollection.features.map(f => {
        delete f.properties.selected;
        return f;
      });
      const unSyncedFeatureCollection = {
        type: 'FeatureCollection',
        features: featuresU,
      };
      newState.unSyncedFeatureCollection = unSyncedFeatureCollection;
    }

    this.setState(newState);
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

  onPressSatellite = () => {
    this.setState({ useSatellite: !this.state.useSatellite });
  };

  makeAnnotations = async () => {
    const { layer } = this.props.navigation.state.params;
    const metadata = JSON.parse(layer.metadata);
    this.setState({ loading: true });
    const newState = {};
    if (layer.features.length) {
      //console.time('parsefeatures');
      const features = layer.features.map(f => JSON.parse(f.geojson));
      //console.timeEnd('parsefeatures');
      const featureCollection = {
        ...emptyFeatureCollection,
        features,
      };
      if (featureCollection) {
        newState.geojson = featureCollection;
      }
    } else {
      const featureCollection = await wfs.getFeatures(
        this.props.navigation.state.params.wfs,
        layer
      );
      if (featureCollection) {
        newState.geojson = featureCollection;
      }
    }

    const unSyncedFeatures = layer.submissions.filter(s => !s.insert_success).map(s => {
      const f = JSON.parse(s.point);
      f.id = s.id;
      f.type = 'Feature';
      return f;
    });

    const unSyncedFeatureCollection = {
      type: 'FeatureCollection',
      features: unSyncedFeatures,
    };
    newState.unSyncedFeatureCollection = unSyncedFeatureCollection;
    newState.loading = false;
    this.setState(newState, () => {
      if (this.state.selectedFeature) {
        this.selectFeature(this.state.selectedFeature, this.state.selectedFeature.unsynced);
      }
    });
  };

  zoomToLayerBounds = () => {
    const { layer } = this.props.navigation.state.params;
    const metadata = JSON.parse(layer.metadata);
    setTimeout(() => {
      if (this._map) {
        console.log('fitBounds', metadata.bbox);
        this._map.fitBounds(
          [+metadata.bbox[0], +metadata.bbox[1]],
          [+metadata.bbox[2], +metadata.bbox[3]],
          100,
          0
        );
      }
    }, 1000);
  };

  deleteFeature = async () => {
    const feature = this.state.selectedFeature;
    let success;
    let msg;
    this.setState({ working: true });
    if (feature.unsynced) {
      success = db.deleteSubmission(feature);
      msg = 'This submission has been deleted';
    } else {
      const layer = this.props.navigation.state.params.layer;
      success = await db.deleteFeature(layer, feature);
      msg = 'This record has been deleted';
    }
    this.setState({ working: false }, () => {
      setTimeout(() => {
        if (success) {
          requestAnimationFrame(() => {
            Alert.alert('Success', msg, [{ text: 'OK', onPress: this.makeAnnotations }]);
          });
        } else {
          requestAnimationFrame(() => {
            Alert.alert('Error', 'Unable to delete. Please try again later.', [{ text: 'OK' }]);
          });
        }
      }, 200);
    });

    this.setState({ selectedFeature: null });
  };

  componentDidMount() {
    InteractionManager.runAfterInteractions(() => {
      this.setState({ renderPlaceholderOnly: false }, () => {
        this.zoomToLayerBounds();
        this.makeAnnotations();
      });
    });
  }

  renderPoints() {
    let shape;
    if (this.state.geojson) {
      if (this.state.editing) {
        const newFeatures = this.state.geojson.features.filter(f => !f.properties.selected);
        shape = {
          ...this.state.geojson,
          features: newFeatures,
        };
      } else {
        shape = this.state.geojson;
      }
    } else {
      shape = emptyFeatureCollection;
    }
    return (
      <MapboxGL.ShapeSource id="pointSource" shape={shape}>
        <MapboxGL.CircleLayer
          id="pointLayer"
          sourceLayerID="pointLayer"
          filter={['!has', 'selected']}
          style={layerStyles.points}
        />
        <MapboxGL.CircleLayer
          id="selectedFeatureFill"
          sourceLayerID="selectedFeatureLayer"
          filter={['has', 'selected']}
          style={layerStyles.selectedFeature}
          aboveLayerID="pointLayer"
        />
      </MapboxGL.ShapeSource>
    );
  }

  renderPointsUnsynced() {
    let shape;
    if (this.state.unSyncedFeatureCollection) {
      if (this.state.editing) {
        const newFeatures = this.state.unSyncedFeatureCollection.features.filter(
          f => !f.properties.selected
        );
        shape = {
          ...this.state.unSyncedFeatureCollection,
          features: newFeatures,
        };
      } else {
        shape = this.state.unSyncedFeatureCollection;
      }
    } else {
      shape = emptyFeatureCollection;
    }
    return (
      <MapboxGL.ShapeSource id="pointsUnsyncedSource" shape={shape}>
        <MapboxGL.CircleLayer
          id="pointsUnsynced"
          sourceLayerID="pointsUnsyncedLayer"
          filter={['!has', 'selected']}
          style={layerStyles.pointsUnsynced}
        />
        <MapboxGL.CircleLayer
          id="pointsUnsyncedSelected"
          sourceLayerID="pointsUnsyncedSelectedLayer"
          filter={['has', 'selected']}
          style={layerStyles.pointsUnsyncedSelected}
        />
      </MapboxGL.ShapeSource>
    );
  }

  render() {
    const { navigate } = this.props.navigation;
    const { layer } = this.props.navigation.state.params;
    const { adding } = this.state;
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
                { backgroundColor: this.state.useSatellite ? '#4F8EF7' : 'white' },
              ]}
              onPress={this.onPressSatellite}
            >
              <MapSkin
                name="ms-satellite"
                color={this.state.useSatellite ? 'white' : '#4F8EF7'}
                size={25}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.locationButton,
                { backgroundColor: this.state.trackingLocation ? '#4F8EF7' : 'white' },
              ]}
              onPress={this.onPressLocation}
            >
              <Icon
                name="md-locate"
                size={20}
                color={this.state.trackingLocation ? 'white' : '#4F8EF7'}
              />
            </TouchableOpacity>
            {this.state.editing && (
              <CreateMenu
                adding={true}
                onAddCancel={this.onEditLocationCancel}
                onAddData={this.onEditLocationSave}
                onAddToggle={() => {}}
              />
            )}
            {!this.state.editing && (
              <CreateMenu
                adding={this.state.adding}
                onAddCancel={this.onAddCancel}
                onAddData={this.onAddData}
                onAddToggle={() => this.setState({ adding: true })}
              />
            )}
          </View>
          {this.state.editing && (
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.centerOverlay} pointerEvents="none">
                <FAnnotationView radius={7} backgroundColor={orange} selected={true} />
              </View>
              <View style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.mapOverlay}>
                  <Text>Move map to adjust location of this record.</Text>
                </View>
              </View>
            </View>
          )}
          {adding && (
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.centerOverlay} pointerEvents="none">
                <FAnnotationView radius={7} backgroundColor={orange} selected={true} />
              </View>
              <View style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.mapOverlay}>
                  <Text>Move map to adjust location of the new record.</Text>
                </View>
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
          styleURL={
            this.state.useSatellite ? MapboxGL.StyleURL.SatelliteStreet : MapboxGL.StyleURL.Street
          }
          style={styles.map}
          onPress={this.onMapPress}
          onRegionDidChange={this.onRegionDidChange}
          showUserLocation={this.state.trackingLocation}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {this.renderPoints()}
          {this.renderPointsUnsynced()}
        </MapboxGL.MapView>
        {!!this.state.selectedFeature &&
          !this.state.editing && (
            <View style={[styles.overlay, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
              <FeatureDetails
                layer={layer}
                makeAnnotations={this.makeAnnotations}
                key={`${this.state.selectedFeature.id}_details`}
                selectedFeature={this.state.selectedFeature}
                deselectFeature={this.deselectFeature}
                onEditClose={this.onEditClose}
                onEditProperties={this.onEditProperties}
                onEditLocation={this.onEditLocation}
                onPressDelete={this.onPressDelete}
              />
            </View>
          )}
        {this.state.working && <Loading loading={this.state.working} />}
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
    backgroundColor: 'rgba(0,255,0,0)',
    padding: 8,
    position: 'absolute',
    right: 0,
    bottom: 50,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  mapOverlay: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  locationButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
