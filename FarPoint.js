import React, { Component } from 'react';
import {
  AppRegistry,
  Button,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
  View,
} from 'react-native';
import Realm from 'realm';
import uuid from 'react-native-uuid';
import Icon from 'react-native-vector-icons/Ionicons';
import MapboxGL from '@mapbox/react-native-mapbox-gl';
import LayerList from './LayerList';
import WFSList from './WFSList';
import FButton from './FButton';
import { getFeatureType } from './wfs';
import * as db from './db';
import { orange, gray, darkGray } from './styles';

export default class FarPoint extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Farpoint',
    };
  };

  state = {
    loading: true,
    wfsInput: 'https://exchange-farpoint.boundlessgeo.io',
  };

  onChangeText = wfsInput => {
    this.setState({ wfsInput });
  };

  onPress = async () => {
    try {
      const { navigate } = this.props.navigation;
      navigate('WFSAuth', { wfsUrl: this.state.wfsInput });
    } catch (error) {
      console.log('wfs error', error);
    }
  };

  componentWillMount() {
    db.monitor();
    db.refreshExchangeTokens();
    const wfs = db.realm.objects('WFS');
    this.setState({ loading: false, wfs });
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'GPS permission',
            message: 'Farpoint needs access to your GPS',
          }
        );
      } catch (err) {
        console.warn(err);
      }
    }
  }

  componentDidMount() {
    const getpacks = async () => {
      const offlinePacks = await MapboxGL.offlineManager.getPacks();
      offlinePacks.forEach(pack => {
        console.log(pack);
        MapboxGL.offlineManager.deletePack(pack.name);
      });
    };
    //getpacks();
  }

  render() {
    if (this.state.loading) {
      return <Text>Loading</Text>;
    }
    const empty = this.state.wfs.length === 0;
    return (
      <View style={styles.container}>
        <View style={[styles.top, empty && { flex: 1 }]}>
          {empty && (
            <View>
              <Text style={styles.welcome}>Welcome to Farpoint</Text>
              <Text style={styles.instructions}>
                To begin, enter the base URL for your Exchange:
              </Text>
            </View>
          )}
          {!empty && <Text style={styles.instructions}>Add an Exchange Server:</Text>}
          <TextInput
            style={styles.input}
            multiline
            autoCapitalize={'none'}
            autoCorrect={false}
            keyboardType={'url'}
            onChangeText={this.onChangeText}
            value={this.state.wfsInput}
            underlineColorAndroid="transparent"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Button color={orange} onPress={this.onPress} title={empty ? 'Continue' : 'Add'} />
          </View>
        </View>

        <View style={styles.bottom}>
          {!empty && <WFSList wfs={this.state.wfs} navigation={this.props.navigation} />}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: gray,
  },
  top: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 16,
    paddingRight: 15,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  bottom: {
    flex: 1,
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 8,
    paddingBottom: 64,
  },
  instructions: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderColor: 'gray',
    borderWidth: 1,
    padding: 8,
    fontSize: 16,
    marginBottom: 16,
  },
  headerBtn: {
    paddingRight: 16,
    color: 'white',
  },
});
