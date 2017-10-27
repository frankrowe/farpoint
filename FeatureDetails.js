import React from 'react';
import {
  ActivityIndicator,
  NetInfo,
  Alert,
  Button,
  Image,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { sortBy } from 'lodash';
import Icon from 'react-native-vector-icons/Ionicons';
import * as db from './db';
import { darkGray, orange, green, red } from './styles';

const ImageRow = ({ uri, onImageTap }) => (
  <TouchableOpacity onPress={() => onImageTap(uri)}>
    <Image style={styles.image} source={{ uri }} />
  </TouchableOpacity>
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
    let label, value;
    if (item.key === 'photos') {
      label = (
        <Text style={styles.cellLabel} numberOfLines={1}>
          Photos
        </Text>
      );
      value = <Text />;
      try {
        if (item.value && item.value.indexOf('data:image/jpeg;base64') == 0) {
          value = <ImageRow uri={item.value} onImageTap={onImageTap} />;
        } else if (item.value && item.value.indexOf('[') == 0) {
          let uris = JSON.parse(item.value);
          if (typeof uris === 'object' && uris.length) {
            uri = uris[0].replace(/"/g, '');
            value = <ImageRow uri={uri} onImageTap={onImageTap} />;
          }
        }
      } catch (error) {}
    } else {
      label = (
        <Text style={styles.cellLabel} numberOfLines={1}>
          {item.label}
        </Text>
      );
      value = <Text style={styles.cellName}>{item.value}</Text>;
    }
    return (
      <View style={styles.cellRow}>
        <View style={styles.cellRowIcon}>
          {item.key === 'location' && (
            <TouchableOpacity onPress={item.onEditLocation}>
              <Icon name="md-locate" size={32} color={orange} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cellRowContent}>
          {label}
          {value}
        </View>
      </View>
    );
  }
}

class FeatureDetails extends React.Component {
  state = { image: false, uploadStatus: false };

  _keyExtractor = (item, index) => `${item.id}.${index}`;

  onImageTap = image => {
    this.setState({ image });
  };

  onPressUpload = () => {
    NetInfo.getConnectionInfo().then(async connectionInfo => {
      const connectionType = connectionInfo.type;
      const isConnected = !(connectionType == 'none');
      if (isConnected) {
        const id = this.props.selectedFeature.id;
        const submissions = db.realm.objects('Submission').filtered(`id = "${id}"`);
        if (submissions.length) {
          const submission = submissions[0];
          this.setState({ uploadStatus: 'loading' });
          const success = await db.insert(submission);
          this.setState({ uploadStatus: success ? 'success' : 'fail' });
          this.props.makeAnnotations();
        }
      } else {
        requestAnimationFrame(() => {
          Alert.alert('Offline', 'Your device must be connected to upload submissions.', [
            { text: 'OK' },
          ]);
        });
      }
    });
  };

  render() {
    const {
      layer,
      selectedFeature,
      onEditClose,
      onEditLocation,
      onEditProperties,
      onPressDelete,
      deselectFeature,
    } = this.props;
    const metadata = JSON.parse(layer.metadata);
    const fields = sortBy(metadata.schema.fields, f => f.position);
    const data = fields.map(field => {
      const label = field.field_label;
      const key = field.field_key;
      const value = selectedFeature.properties[field.field_key];
      return { key, label, value };
    });
    data.unshift({
      key: 'location',
      label: 'Location',
      onEditLocation,
      value: selectedFeature.geometry.coordinates.join(', '),
    });
    if (this.state.image) {
      return <FullScreenImage uri={this.state.image} onImageTap={this.onImageTap} />;
    }
    return (
      <View style={styles.container}>
        <View style={styles.topbar}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '800',
              lineHeight: 32,
              width: 100,
            }}
          >
            Properties
          </Text>
          <TouchableOpacity style={styles.closeBtn} onPress={deselectFeature}>
            <Icon name="ios-arrow-down" size={24} color={'rgba(0,0,0,0.2)'} />
          </TouchableOpacity>
          <View style={styles.topbarBtns}>
            {selectedFeature.unsynced &&
              this.state.uploadStatus == false && (
                <TouchableOpacity style={styles.topbarBtn} onPress={this.onPressUpload}>
                  <Icon name="md-cloud-upload" size={32} color={orange} />
                </TouchableOpacity>
              )}
            {selectedFeature.unsynced &&
              this.state.uploadStatus == 'loading' && (
                <ActivityIndicator style={styles.topbarBtn} />
              )}
            {selectedFeature.unsynced &&
              this.state.uploadStatus == 'success' && (
                <Icon style={styles.topbarBtn} name="md-checkmark" size={32} color={green} />
              )}
            {selectedFeature.unsynced &&
              this.state.uploadStatus == 'fail' && (
                <TouchableOpacity style={styles.topbarBtn} onPress={this.onPressUpload}>
                  <Icon name="md-close" size={32} color={red} />
                </TouchableOpacity>
              )}
            <TouchableOpacity style={styles.topbarBtn} onPress={onEditProperties}>
              <Icon name="md-create" size={32} color={orange} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.topbarBtn} onPress={onPressDelete}>
              <Icon name="md-trash" size={32} color={'#D9534F'} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tableContainer}>
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
  container: {
    flex: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: 'black',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  topbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomColor: darkGray,
    borderTopColor: darkGray,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    paddingTop: 0,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
  },
  topbarBtns: {
    width: 100,
    height: 32,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  topbarBtn: {
    marginLeft: 24,
  },
  tableContainer: {
    flex: 1,
  },
  muted: {
    color: '#999',
  },
  cellLabel: {
    fontSize: 12,
    color: '#999',
    paddingBottom: 4,
  },
  cellName: {
    fontSize: 14,
    color: 'black',
  },
  cellSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  cellRow: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  cellRowIcon: {
    width: 40,
    justifyContent: 'center',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cellRowContent: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
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
  closeBtn: {},
});

export default FeatureDetails;
