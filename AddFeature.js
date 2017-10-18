import React from 'react';
import { Button, Platform, Text, View } from 'react-native';

const AddFeature = ({ onAddCancel, onAddData }) => (
  <View>
    <Text>Move map to adjust location, then add data to the collection.</Text>
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
