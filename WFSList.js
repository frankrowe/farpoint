import React, { Component } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
} from 'react-native';
import { blue, orange, gray, darkGray } from './styles';

const WFSCell = props => {
  return (
    <View>
      <TouchableOpacity onPress={props.onSelect}>
        <View style={styles.cellRow}>
          <Text style={styles.cellName} numberOfLines={2}>
            {props.wfs.url}
          </Text>
          <Text style={styles.cellSubtitle}>Layers: {props.wfs.layers.length}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default class WFSList extends Component {
  keyExtractor = item => item.id;

  render() {
    const { navigate } = this.props.navigation;
    const { wfs } = this.props;
    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={wfs}
          renderItem={({ item }) => (
            <FormCell
              layer={item}
              onSelect={() => {
                navigate('LayerList', { wfs: item });
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
  wfs: {
    padding: 8,
  },
  list: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
