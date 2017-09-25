import React from 'react';
import { Button, FlatList, StyleSheet, Text, View } from 'react-native';
import { darkGray } from './styles';

const FeatureDetails = ({ selectedFeature, onEditClose, onEditLocation, onEditProperties }) => (
  <View style={{ flex: 0.5 }}>
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderBottomColor: darkGray,
        borderTopColor: darkGray,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        backgroundColor: 'rgba(255, 255, 255, 1)',
      }}
    >
      <Button onPress={onEditLocation} title="Edit Location" style={{ fontSize: 14 }} />
      <Button onPress={onEditProperties} title="Edit Properties" style={{ fontSize: 14 }} />
      <Button onPress={onEditClose} title="Close" color={'#D9534F'} style={{ fontSize: 14 }} />
    </View>
    <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', paddingTop: 8, flex: 1 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '800',
          paddingLeft: 16,
        }}
      >
        Properties
      </Text>
      <FlatList
        data={Object.keys(selectedFeature.properties).map(key => {
          return { key, value: selectedFeature.properties[key] };
        })}
        renderItem={({ item }) => (
          <View style={styles.cellRow}>
            <Text style={styles.cellName} numberOfLines={1}>
              {item.key}: {item.value}
            </Text>
          </View>
        )}
        keyExtractor={item => item.key}
        style={{}}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
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
});

export default FeatureDetails;
