import React from 'react';
import { Text, View } from 'react-native';

const FeatureCount = ({ geojson, limit }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
    <View
      style={{
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 3,
        paddingBottom: 3,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
        backgroundColor: 'white',
        alignSelf: 'flex-start',
      }}
    >
      {(!geojson || geojson.features.length == 0) && <Text>No results.</Text>}
      {geojson &&
      geojson.features.length > 0 &&
      geojson.features.length < limit && <Text>{geojson.features.length} results.</Text>}
      {geojson &&
      geojson.features.length === limit && <Text>Over {limit} results. Zoom in to see all.</Text>}
    </View>
  </View>
);

export default FeatureCount;
