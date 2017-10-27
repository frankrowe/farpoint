import React, { Component } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationActions } from 'react-navigation';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';

const FormCell = props => {
  const unsaved = props.layer.submissions.filtered(`insert_success == false`);
  const metadata = JSON.parse(props.layer.metadata);
  return (
    <View>
      <TouchableOpacity onPress={props.onSelect}>
        <View style={styles.cellRow}>
          <Text style={styles.cellName} numberOfLines={1}>
            {metadata.Title}
          </Text>
          <Text style={styles.cellSubtitle}>Submissions: {props.layer.submissions.length}</Text>
        </View>
      </TouchableOpacity>
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
                navigate('LayerDetails', { layer: item, wfs });
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
