import React, { Component } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Swipeout from 'react-native-swipeout';
import { NavigationActions } from 'react-navigation';
import { withNavigationFocus } from 'react-navigation-is-focused-hoc';
import MapboxGL from '@mapbox/react-native-mapbox-gl';
import { distanceInWords } from 'date-fns';
import Color from 'color';
import * as db from './db';
import { blue, orange, gray, darkGray, red } from './styles';

const iconColor = Color(orange)
  .alpha(0.7)
  .string();

const FormCell = props => {
  const metadata = JSON.parse(props.layer.metadata);
  let subtext = `Changes: ${props.layer.submissions.length}`;
  if (props.layer.features.length && props.layer.featuresUpdated) {
    subtext += ` Updated: ${distanceInWords(props.layer.featuresUpdated, props.now)} ago`;
  }
  return (
    <Swipeout
      style={styles.swipe}
      right={[
        {
          text: 'Delete',
          type: 'delete',
          onPress: props.onDelete,
        },
      ]}
      autoClose
      disabled={props.status !== 'offline'}
    >
      <View>
        <View style={styles.cellRow}>
          <View style={styles.cellContent}>
            <TouchableOpacity onPress={props.onSelect}>
              <Text style={styles.cellName} numberOfLines={1}>
                {metadata.Title}
              </Text>
              <Text style={styles.cellSubtitle}>{subtext}</Text>
            </TouchableOpacity>
          </View>

          {props.status === 'download' && (
            <View style={styles.cellRowIcons}>
              <TouchableOpacity style={styles.cellRowIcon} onPress={props.onDownload}>
                <Icon name="md-download" size={30} color={iconColor} />
              </TouchableOpacity>
            </View>
          )}
          {props.status === 'offline' && (
            <View style={styles.cellRowIcons}>
              <TouchableOpacity style={styles.cellRowIcon} onPress={props.onRefresh}>
                <Icon name="md-refresh" size={30} color={iconColor} />
              </TouchableOpacity>
            </View>
          )}
          {props.status === 'loading' && (
            <View style={styles.cellRowIcons}>
              <View style={styles.cellRowIcon}>
                <ActivityIndicator />
              </View>
            </View>
          )}
          {props.status === 'fail' && (
            <View style={styles.cellRowIcons}>
              <TouchableOpacity style={styles.cellRowIcon} onPress={props.onDownload}>
                <Icon name="md-close" size={20} color={red} />
              </TouchableOpacity>
            </View>
          )}
          {props.status.indexOf('%') > -1 && (
            <View style={styles.cellRowIcons}>
              <View style={styles.cellRowIcon}>
                <Text style={styles.statusText}>{props.status}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Swipeout>
  );
};

class LayerList extends Component {
  static navigationOptions = ({ navigation }) => ({
    title: 'Layers',
    headerTitleStyle: { marginLeft: 'auto', marginRight: 'auto' },
    headerLeft: (
      <TouchableOpacity
        onPress={() =>
          navigation.dispatch(
            NavigationActions.reset({
              index: 0,
              actions: [NavigationActions.navigate({ routeName: 'Home' })],
            })
          )}
      >
        <Text style={styles.leftBtnStyle}>Servers</Text>
      </TouchableOpacity>
    ),
    headerRight: (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('WFSSettings', navigation.state.params);
        }}
      >
        <Text style={styles.rightBtnStyle}>Settings</Text>
      </TouchableOpacity>
    ),
  });

  state = { layerStatus: {}, now: new Date() };

  keyExtractor = item => item.key;

  onDownload = async layer => {
    this.setState(
      {
        layerStatus: {
          ...this.state.layerStatus,
          [layer.key]: 'loading',
        },
      },
      async () => {
        const metadata = JSON.parse(layer.metadata);
        try {
          let success = await db.downloadBasemap(
            layer,
            metadata.bbox,
            MapboxGL.StyleURL.Street,
            status => {
              const percentage = Math.round(status.percentage);
              this.setState({
                layerStatus: {
                  ...this.state.layerStatus,
                  [layer.key]: percentage === 100 ? '99%' : `${percentage}%`,
                },
              });
            }
          );
          if (success) {
            success = await db.downloadFeatures(layer);
            this.setState({
              now: new Date(),
              layerStatus: {
                ...this.state.layerStatus,
                [layer.key]: success ? 'offline' : 'fail',
              },
            });
          }
        } catch (error) {
          this.setState({
            layerStatus: {
              ...this.state.layerStatus,
              [layer.key]: 'fail',
            },
          });
        }
      }
    );
  };

  onRefresh = async layer => {
    this.setState(
      {
        layerStatus: {
          ...this.state.layerStatus,
          [layer.key]: 'loading',
        },
      },
      async () => {
        const success = await db.downloadFeatures(layer);
        this.setState({
          now: new Date(),
          layerStatus: {
            ...this.state.layerStatus,
            [layer.key]: success ? 'offline' : 'fail',
          },
        });
      }
    );
  };

  onDelete = layer => {
    this.setState(
      {
        layerStatus: {
          ...this.state.layerStatus,
          [layer.key]: 'loading',
        },
      },
      async () => {
        const success = await db.deleteFeatures(layer);
        this.setState({
          layerStatus: {
            ...this.state.layerStatus,
            [layer.key]: success ? 'download' : 'fail',
          },
        });
      }
    );
  };

  componentWillMount() {
    const { wfs } = this.props.navigation.state.params;
    const layerStatus = {};
    wfs.layers.forEach(layer => {
      layerStatus[layer.key] = layer.features.length ? 'offline' : 'download';
    });
    this.setState({
      now: new Date(),
      layerStatus: {
        ...this.state.layerStatus,
        ...layerStatus,
      },
    });
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.isFocused && nextProps.isFocused) {
      this.setState({ now: new Date() });
    }
  }

  render() {
    const { navigate } = this.props.navigation;
    const { wfs } = this.props.navigation.state.params;
    return (
      <View style={styles.container}>
        <View style={styles.wfs}>
          <Text>{wfs.url}</Text>
        </View>
        <FlatList
          data={wfs.layers}
          extraData={this.state}
          renderItem={({ item }) => (
            <FormCell
              layer={item}
              status={this.state.layerStatus[item.key]}
              now={this.state.now}
              onSelect={() => {
                navigate('LayerDetails', { layer: item, wfs });
              }}
              onDownload={() => this.onDownload(item)}
              onRefresh={() => this.onRefresh(item)}
              onDelete={() => this.onDelete(item)}
            />
          )}
          keyExtractor={this.keyExtractor}
          style={styles.list}
        />
      </View>
    );
  }
}

export default withNavigationFocus(LayerList);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  leftBtnStyle: {
    paddingLeft: 16,
    color: 'white',
  },
  rightBtnStyle: {
    paddingRight: 16,
    color: 'white',
  },
  wfs: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: darkGray,
    backgroundColor: gray,
  },
  list: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cellName: {
    fontSize: 16,
    color: 'black',
    paddingBottom: 4,
  },
  cellSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  cellRow: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
    marginLeft: 16,
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  cellRowIcons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  cellRowIcon: {
    width: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  statusText: {
    fontSize: 10,
    color: '#888',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'monospace',
  },
  cellContent: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  iconStyle: {
    paddingRight: 16,
  },
  trashIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  swipe: {
    backgroundColor: '#fff',
  },
});
