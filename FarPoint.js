import React, { Component } from 'react';
import {
  AppRegistry,
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Realm from 'realm';
import uuid from 'react-native-uuid';
import LayerList from './LayerList';
import WFSList from './WFSList';
import { getFeatureType } from './wfs';
import * as db from './db';

export default class FarPoint extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Collector',
      headerRight:
        navigation.state.params && navigation.state.params.configured ? (
          <TouchableOpacity onPress={() => navigation.setParams({ configured: false })}>
            <Text style={styles.headerBtn}>Reconfigure</Text>
          </TouchableOpacity>
        ) : null,
    };
  };

  state = {
    loading: true,
    wfsInput: 'https://dev.exchange.boundlessps.com/geoserver/ows',
  };

  onChangeText = wfsInput => {
    this.setState({ wfsInput });
  };

  onPress = async () => {
    try {
      const layers = await getFeatureType(this.state.wfsInput);
      db.realm.write(() => {
        let oldWFS = db.realm.objects('WFS');
        db.realm.delete(oldWFS);
        const wfs = db.realm.create('WFS', {
          id: uuid.v1(),
          url: this.state.wfsInput,
          layers: layers.map(l => ({
            layer_key: l.layer_key,
            schema: JSON.stringify(l.schema),
            submissions: [],
          })),
        });
        this.setState({ wfs });
        const { setParams } = this.props.navigation;
        setParams({ configured: true });
      });
    } catch (error) {}
  };

  componentWillMount() {
    db.monitor();
    const wfs = db.realm.objects('WFS');
    const configured = wfs.length > 0;
    db.realm.addListener('change', (realm, type) => {
      this.forceUpdate();
    });
    let state = { loading: false };
    if (configured) {
      state = { ...state, wfs: wfs[0] };
    }
    const { setParams } = this.props.navigation;
    setParams({ configured });
    this.setState(state);
  }

  render() {
    const { navigate } = this.props.navigation;
    const configured = this.props.navigation.state.params
      ? this.props.navigation.state.params.configured
      : false;
    if (this.state.loading) {
      return <Text>Loading</Text>;
    }
    if (configured) {
      return (
        <LayerList
          wfs={this.state.wfs}
          layers={this.state.wfs.layers}
          navigation={this.props.navigation}
        />
      );
    }
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to Collector</Text>
        <Text style={styles.instructions}>
          To begin, enter the URL for your WFS enabled GIS Server:
        </Text>
        <TextInput
          style={{ height: 40, width: 400, borderColor: 'gray', borderWidth: 1 }}
          onChangeText={this.onChangeText}
          value={this.state.wfsInput}
        />
        <Button
          onPress={this.onPress}
          title="Continue"
          color="#00f"
          accessibilityLabel="Learn more about this purple button"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
    paddingBottom: 60,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 10,
  },
  headerBtn: {
    paddingRight: 16,
    color: 'white',
  },
});
