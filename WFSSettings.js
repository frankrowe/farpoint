import React, { Component } from 'react';
import { Button, Text, View, ActivityIndicator, StyleSheet, Modal, Platform } from 'react-native';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';


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
});

export default class WFSSettings extends Component {

  constructor(props) {
    super(props);
    this.state = { syncing: false };
  }

  syncSubmissions = async wfs => {
    this.setState({ syncing: true });
    await db.syncWFS(wfs);
    this.setState({ syncing: false });
  };

  render() {
    const { wfs } = this.props.navigation.state.params;

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
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <Button
            onPress={() => db.deleteWFS(wfs)}
            title="Delete"
            color={'#D9534F'}
            style={{ fontSize: 14 }}
          />
          <Button title='Sync' onPress={() => this.syncSubmissions(wfs)}/>
          <Button onPress={() => db.refreshWFS(this.props.navigation.state.params.wfs)} title="Refresh" />
        </View>
        <Modal visible={this.state.syncing} transparent>
          <View style={styles.modalContainer}>
            <View style={styles.modal}>
              <ActivityIndicator size='large' />
            </View>
          </View>
        </Modal>
      </View>
    );
  }
}
