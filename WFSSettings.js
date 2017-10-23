import React, { Component } from 'react';
import { Button, Text, View, ActivityIndicator, StyleSheet, Modal, Platform } from 'react-native';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';
import { NavigationActions } from 'react-navigation';

export default class WFSSettings extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Settings',
    };
  };

  constructor(props) {
    super(props);
    this.state = { syncing: false };
  }

  syncSubmissions = async wfs => {
    this.setState({ syncing: true });
    await db.syncWFS(wfs);
    this.setState({ syncing: false });
  };

  deleteWFS = (navigate, wfs) => {
    const deleted = db.deleteObject(wfs);
    this.props.navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Home' })],
      })
    );
  };

  refreshWFS = async () => {
    const { wfs } = this.props.navigation.state.params;
    const { navigate } = this.props.navigation;
    this.setState({ syncing: true });
    const newWFS = await db.refreshWFS(wfs);
    this.setState({ syncing: false });
    this.props.navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LayerList', params: { wfs: newWFS } })],
      })
    );
  };

  render() {
    const { wfs } = this.props.navigation.state.params;
    const { navigate } = this.props.navigation;
    let submissonCount = 0;
    if (wfs.layers) {
      wfs.layers.forEach(layer => {
        submissonCount += layer.submissions.filtered('insert_success == false').length;
      });
    }
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <View
          style={{
            padding: 8,
            borderBottomWidth: 1,
            borderBottomColor: darkGray,
            backgroundColor: gray,
          }}
        >
          <Text>{wfs.url}</Text>
        </View>
        <View>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button
                onPress={() => this.deleteWFS(navigate, wfs)}
                title="Delete"
                color={'#D9534F'}
                style={{ backgroundColor: 'red' }}
              />
            </View>
            <Text style={styles.note}>Delete this Server.</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button
                title={`Sync (${submissonCount})`}
                onPress={() => this.syncSubmissions(wfs)}
              />
            </View>
            <Text style={styles.note}>Upload all unsynced submissions.</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button onPress={this.refreshWFS} title="Refresh" style={styles.button} />
            </View>
            <Text style={styles.note}>Refresh Layers and Metadata for this Server.</Text>
          </View>
        </View>
        <Modal visible={this.state.syncing} transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              <ActivityIndicator size="large" />
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: 'white',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Platform.OS === 'ios' ? 10 : 2,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Platform.OS === 'ios' ? 0 : 8,
  },
  row: {
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  note: { paddingLeft: 8, paddingBottom: 8, fontSize: 11, color: '#999' },
});
