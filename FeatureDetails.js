import React from 'react';
import { Button, Image, FlatList, StyleSheet, Text, View } from 'react-native';
import { sortBy } from 'lodash';
import { darkGray } from './styles';

const FeatureDetailsRow = ({ item }) => {
  let value;
  if (item.key === 'photos') {
    if (item.value && item.value.indexOf('data:image/jpeg;base64') > -1) {
      value = <Image style={styles.image} source={{ uri: item.value }} />;
    } else {
      value = '';
    }
  } else {
    value = item.value;
  }
  return (
    <View style={styles.cellRow}>
      <Text style={styles.cellName} numberOfLines={1}>
        {item.label}: {value}
      </Text>
    </View>
  );
};

const FeatureDetails = ({
  layer,
  selectedFeature,
  onEditClose,
  onEditLocation,
  onEditProperties,
}) => {
  const metadata = JSON.parse(layer.metadata);
  const fields = sortBy(metadata.schema.fields, f => f.position);
  const data = fields.map(field => {
    const label = field.field_label;
    const key = field.field_key;
    const value = selectedFeature.properties[field.field_key];
    return { key, label, value };
  });
  return (
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
          data={data}
          renderItem={({ item }) => <FeatureDetailsRow item={item} />}
          keyExtractor={item => item.key}
          style={{}}
        />
      </View>
    </View>
  );
};

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
  image: {
    height: 100,
    width: 100,
    backgroundColor: 'white',
  },
});

export default FeatureDetails;
