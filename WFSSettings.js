import React, { Component } from 'react';
import { Button, Text, View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { distanceInWords } from 'date-fns';
import Loading from './Loading';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';
import { NavigationActions } from 'react-navigation';

export default class WFSSettings extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Settings',
    };
  };

  constructor(props) {
    super(props);
    this.state = { syncing: false, refreshing: false, allSubmissionCount: 0, submissonCount: 0 };
  }

  syncSubmissions = async wfs => {
    this.props.navigation.navigate('Submissions', {
      wfs,
      updateSubmissionCount: this.updateSubmissionCount,
    });
  };

  deleteWFS = (navigate, wfs) => {
    const deleted = db.deleteObject(wfs);
    this.props.navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'Home' })],
      })
    );
  };

  refreshWFS = async () => {
    const { wfs } = this.props.navigation.state.params;
    const { navigate } = this.props.navigation;
    this.setState({ refreshing: true });
    const newWFS = await db.refreshWFS(wfs);
    this.setState({ refreshing: false });
    this.props.navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LayerList', params: { wfs: newWFS } })],
      })
    );
  };

  updateSubmissionCount = () => {
    const { wfs } = this.props.navigation.state.params;
    let submissonCount = 0;
    let allSubmissionCount = 0;
    if (wfs.layers) {
      wfs.layers.forEach(layer => {
        allSubmissionCount += layer.submissions.length;
        submissonCount += layer.submissions.filtered('insert_success == false').length;
      });
    }
    this.setState({ submissonCount, allSubmissionCount });
  };

  componentWillMount() {
    this.updateSubmissionCount();
  }

  render() {
    const { wfs } = this.props.navigation.state.params;
    const { navigate } = this.props.navigation;
    return (
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <View
          style={{
            padding: 8,
            borderBottomWidth: 1,
            borderBottomColor: darkGray,
            backgroundColor: gray,
          }}
        >
          <Text>{wfs.url}</Text>
        </View>
        <View>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button
                onPress={() => this.deleteWFS(navigate, wfs)}
                title="Delete"
                color={'#D9534F'}
                style={{ backgroundColor: 'red' }}
              />
            </View>
            <Text style={styles.note}>Delete this Exchange from your device.</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button
                color={orange}
                title={`View Changes`}
                onPress={() => this.syncSubmissions(wfs)}
              />
            </View>
            <Text style={styles.note}>
              View and sync all changes you have made on this device to Exchange.{'\n'}
              {'\n'}
              {this.state.allSubmissionCount} changes. {this.state.submissonCount} unsynced.
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.button}>
              <Button
                color={orange}
                onPress={this.refreshWFS}
                title="Refresh"
                style={styles.button}
              />
            </View>
            <Text style={styles.note}>
              Download new layers and metadata from this Exchange to your device. {'\n'}
              {'\n'}Last updated: {distanceInWords(wfs.updated, new Date())} ago
            </Text>
          </View>
        </View>
        {this.state.refreshing && <Loading loading={this.state.refreshing} />}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Platform.OS === 'ios' ? 0 : 8,
  },
  row: {
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  note: { paddingLeft: 8, paddingRight: 8, paddingBottom: 8, fontSize: 11, color: '#999' },
});
