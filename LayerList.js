import React, { Component } from 'react';
import {
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
} from 'react-native';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';

const FormCell = props => {
  const unsaved = props.layer.submissions.filtered(`insert_success == false`);
  return (
    <View>
      <TouchableOpacity onPress={props.onSelect}>
        <View style={styles.cellRow}>
          <Text style={styles.cellName} numberOfLines={1}>
            {props.layer.layer_key}
          </Text>
          <Text style={styles.cellSubtitle}>
            Records: {props.layer.submissions.length} Unsaved: {unsaved.length}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default class LayerList extends Component {
  static navigationOptions = ({ navigation }) => ({
    title: 'Layers',
  });

  state = { submissions: {} };

  keyExtractor = item => item.id;

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
              onSelect={() => {
                navigate('Form', { layer: item, wfs });
              }}
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
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
    marginLeft: 16,
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  iconStyle: {
    paddingRight: 16,
  },
});
