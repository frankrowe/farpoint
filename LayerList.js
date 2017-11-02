import React, { Component } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavigationActions } from 'react-navigation';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';

const FormCell = props => {
  const unsaved = props.layer.submissions.filtered(`insert_success == false`);
  const metadata = JSON.parse(props.layer.metadata);
  return (
    <View>
      <View style={styles.cellRow}>
        <View style={styles.cellContent}>
          <TouchableOpacity onPress={props.onSelect}>
            <Text style={styles.cellName} numberOfLines={1}>
              {metadata.Title}
            </Text>
            <Text style={styles.cellSubtitle}>Submissions: {props.layer.submissions.length}</Text>
          </TouchableOpacity>
        </View>

        {props.status === 'download' && (
          <View style={styles.cellRowIcons}>
            <TouchableOpacity style={styles.cellRowIcon} onPress={props.onDownload}>
              <Icon name="md-download" size={20} color={'#aaa'} />
            </TouchableOpacity>
          </View>
        )}
        {props.status === 'offline' && (
          <View style={styles.cellRowIcons}>
            <TouchableOpacity style={styles.cellRowIcon} onPress={props.onDownload}>
              <Icon name="md-refresh" size={20} color={'#aaa'} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cellRowIcon} onPress={props.onDelete}>
              <Icon name="md-trash" size={20} color={'#aaa'} />
            </TouchableOpacity>
          </View>
        )}
        {props.status === 'loading' && (
          <View style={styles.cellRowIcons}>
            <ActivityIndicator />
          </View>
        )}
        {props.status === 'fail' && (
          <View style={styles.cellRowIcons}>
            <TouchableOpacity style={styles.cellRowIcon} onPress={props.onDownload}>
              <Icon name="md-close" size={20} color={red} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default class LayerList extends Component {
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

  state = { layerStatus: {} };

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
        const success = await db.downloadFeatures(layer);
        this.setState({
          layerStatus: {
            ...this.state.layerStatus,
            [layer.key]: success ? 'offline' : 'fail',
          },
        });
      }
    );
  };

  onDelete = layer => {
    db.deleteFeatures(layer);
    this.setState({
      layerStatus: {
        ...this.state.layerStatus,
        [layer.key]: 'download',
      },
    });
  };

  componentWillMount() {
    const { wfs } = this.props.navigation.state.params;
    const layerStatus = {};
    wfs.layers.forEach(layer => {
      layerStatus[layer.key] = layer.features.length ? 'offline' : 'download';
    });
    this.setState({
      layerStatus: {
        ...this.state.layerStatus,
        ...layerStatus,
      },
    });
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
              onSelect={() => {
                navigate('LayerDetails', { layer: item, wfs });
              }}
              onDownload={() => this.onDownload(item)}
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
    paddingRight: 16,
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  cellRowIcons: {
    flex: 0.1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cellRowIcon: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cellContent: {
    flex: 0.9,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  iconStyle: {
    paddingRight: 16,
  },
});
