import React from 'react';
import { Button, Text, View } from 'react-native';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';

const WFSSettings = ({ navigation }) => (
  <View style={{ flex: 1, backgroundColor: 'white' }}>
    <View
      style={{
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: darkGray,
        backgroundColor: gray,
      }}
    >
      <Text>{navigation.state.params.wfs.url}</Text>
    </View>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
      <Button
        onPress={() => db.deleteWFS(wfs)}
        title="Delete"
        color={'#D9534F'}
        style={{ fontSize: 14 }}
      />
      <Button onPress={() => db.syncWFS(wfs)} title="Sync" />
    </View>
  </View>
);

export default WFSSettings;
