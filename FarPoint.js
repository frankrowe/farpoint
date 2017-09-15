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
import { gray, darkGray } from './styles';

export default class FarPoint extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Collector',
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
        const wfs = db.realm.create('WFS', {
          id: uuid.v1(),
          url: this.state.wfsInput,
          layers: layers.map(l => ({
            id: uuid.v1(),
            layer_key: l.layer_key,
            schema: JSON.stringify(l.schema),
            submissions: [],
          })),
        });
        this.setState({ wfs: db.realm.objects('WFS') });
        const { navigate } = this.props.navigation;
        navigate('LayerList', { wfs });
      });
    } catch (error) {}
  };

  componentWillMount() {
    db.monitor();
    const wfs = db.realm.objects('WFS');
    db.realm.addListener('change', (realm, type) => {
      console.log('change');
      this.forceUpdate();
    });
    this.setState({ loading: false, wfs });
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
              <Text style={styles.welcome}>Welcome to Collector</Text>
              <Text style={styles.instructions}>
                To begin, enter the URL for your WFS enabled GIS Server:
              </Text>
            </View>
          )}
          {!empty && (
            <Text style={styles.instructions}>Add a URL for a WFS enabled GIS Server:</Text>
          )}
          <TextInput
            style={styles.input}
            multiline
            onChangeText={this.onChangeText}
            value={this.state.wfsInput}
          />
          <Button
            onPress={this.onPress}
            title={empty ? 'Continue' : 'Add'}
            color="#00f"
            accessibilityLabel="Learn more about this purple button"
          />
        </View>
        {!empty && (
          <View style={styles.bottom}>
            <WFSList wfs={this.state.wfs} navigation={this.props.navigation} />
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  top: {
    backgroundColor: gray,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 16,
    paddingRight: 15,
    justifyContent: 'center',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: darkGray,
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
  },
  headerBtn: {
    paddingRight: 16,
    color: 'white',
  },
});
