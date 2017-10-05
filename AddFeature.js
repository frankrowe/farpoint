import React from 'react';
import { Button, Platform, Text, View } from 'react-native';

const AddFeature = ({ onAddCancel, onAddData }) => (
  <View style={{ padding: 8, backgroundColor: 'white' }}>
    <Text>Move marker to your desired location, then add data to your collection.</Text>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: Platform.OS === 'android' ? 8 : 0,
      }}
    >
      <Button onPress={onAddCancel} title="Cancel" color={'#D9534F'} />
      <Button onPress={onAddData} title="Add Data" />
    </View>
  </View>
);

export default AddFeature;
