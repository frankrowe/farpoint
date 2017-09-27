import React, { Component } from 'react';
import { Button, Text, View } from 'react-native';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';

export default class WFSSettings extends Component {

  syncSubmissions = (wfs) => {
    // todo: start a spinner
    db.syncWFS(wfs);
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
      </View>
    );
  }
}
