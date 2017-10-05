import React from 'react';
import { Text, View } from 'react-native';

class FeatureCount extends React.PureComponent {
  render() {
    const { loading, geojson, limit } = this.props;
    let msg = '';
    if (loading) {
      msg = 'Loading...';
    } else if (!geojson || geojson.features.length == 0) {
      msg = 'No results.';
    } else if (geojson && geojson.features.length > 0 && geojson.features.length < limit) {
      msg = `${geojson.features.length} results.`;
    } else if (geojson && geojson.features.length === limit) {
      msg = `Over ${limit} results. Zoom in to see all`;
    }
    return (
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
          <Text>{msg}</Text>
        </View>
      </View>
    );
  }
}

export default FeatureCount;
