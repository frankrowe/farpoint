import React from 'react';
import { Button, Image, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sortBy } from 'lodash';
import Icon from 'react-native-vector-icons/Ionicons';
import { darkGray } from './styles';

const ImageRow = ({ uri, onImageTap }) => (
  <View>
    <Text>Photos</Text>
    <TouchableOpacity onPress={() => onImageTap(uri)}>
      <Image style={styles.image} source={{ uri }} />
    </TouchableOpacity>
  </View>
);

const FullScreenImage = ({ uri, onImageTap }) => (
  <View style={{ flex: 1, backgroundColor: 'black' }}>
    <TouchableOpacity style={styles.closeImage} onPress={() => onImageTap(false)}>
      <Icon name="md-close" size={30} color={'white'} />
    </TouchableOpacity>
    <Image style={{ flex: 1 }} resizeMode="contain" source={{ uri }} />
  </View>
);

class FeatureDetailsRow extends React.PureComponent {
  render() {
    const { item, onImageTap } = this.props;
    let value;
    if (item.key === 'photos') {
      try {
        if (item.value && item.value.indexOf('data:image/jpeg;base64') == 0) {
          value = <ImageRow uri={item.value} onImageTap={onImageTap} />;
        } else if (item.value && item.value.indexOf('[') == 0) {
          let uris = JSON.parse(item.value);
          if (typeof uris === 'object' && uris.length) {
            uri = uris[0].replace(/"/g, '');
            value = <ImageRow uri={uri} onImageTap={onImageTap} />;
          } else {
            value = '';
          }
        } else {
          value = '';
        }
      } catch (error) {
        value = '';
      }
    } else {
      value = (
        <Text style={styles.cellName} numberOfLines={1}>
          {item.label}: {value}
        </Text>
      );
    }
    return <View style={styles.cellRow}>{value}</View>;
  }
}

class FeatureDetails extends React.Component {
  state = { image: false };

  _keyExtractor = (item, index) => `${item.id}.${index}`;

  onImageTap = image => {
    this.setState({ image });
  };

  render() {
    const {
      layer,
      selectedFeature,
      onEditClose,
      onEditLocation,
      onEditProperties,
      onPressDelete,
    } = this.props;
    const metadata = JSON.parse(layer.metadata);
    const fields = sortBy(metadata.schema.fields, f => f.position);
    const data = fields.map(field => {
      const label = field.field_label;
      const key = field.field_key;
      const value = selectedFeature.properties[field.field_key];
      return { key, label, value };
    });
    if (this.state.image) {
      return <FullScreenImage uri={this.state.image} onImageTap={this.onImageTap} />;
    }
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
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <Button onPress={onEditLocation} title="Edit Location" style={{ fontSize: 14 }} />
          <Button onPress={onEditProperties} title="Edit Properties" style={{ fontSize: 14 }} />
          <Button
            onPress={onPressDelete}
            title="Delete"
            color={'#D9534F'}
            style={{ fontSize: 14 }}
          />
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
            renderItem={({ item }) => (
              <FeatureDetailsRow item={item} onImageTap={this.onImageTap} />
            )}
            keyExtractor={this._keyExtractor}
          />
        </View>
      </View>
    );
  }
}

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
  closeImage: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 999,
    backgroundColor: 'rgba(0, 0, 0, 0)',
  },
});

export default FeatureDetails;
