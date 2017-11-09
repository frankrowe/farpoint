import React, { Component } from 'react';
import {
  Button,
  TouchableOpacity,
  Text,
  View,
  Platform,
  NetInfo,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { NavigationActions } from 'react-navigation';
import { format, distanceInWordsStrict } from 'date-fns';
import * as db from './db';
import { blue, orange, gray, darkGray, green, red } from './styles';

const dateFormat = 'MM/DD/YY hh:mm:ssZ';

const ListCell = props => {
  const layer = props.item.layer[0];
  const metadata = JSON.parse(layer.metadata);
  const pt = JSON.parse(props.item.point);
  return (
    <View>
      <View style={styles.cellRow}>
        <View style={styles.cellContent}>
          <Text style={styles.cellName} numberOfLines={1}>
            {format(props.item.created, dateFormat)}{' '}
            <Text style={styles.cellSubtitle}>
              {distanceInWordsStrict(props.item.created, new Date())} ago
            </Text>
          </Text>
          <Text style={styles.cellSubtitle}>
            Layer: {metadata.Title} {'\n'}Type: {props.item.operation}
          </Text>
        </View>
        <View style={styles.cellRowIcon}>
          {props.status === 'upload' && (
            <TouchableOpacity onPress={props.onPressUpload}>
              <Icon name="md-cloud-upload" size={20} color={orange} />
            </TouchableOpacity>
          )}
          {props.status === 'loading' && <ActivityIndicator />}
          {props.status === 'success' && <Icon name="md-checkmark" size={20} color={green} />}
          {props.status === 'fail' && (
            <TouchableOpacity onPress={props.onPressUpload}>
              <Icon name="md-close" size={20} color={red} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default class Submissions extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Changes',
    };
  };

  state = { syncing: false, submissionStatus: {} };

  keyExtractor = item => item.id;

  syncSubmission = async submission => {
    if (submission.insert_success === false) {
      this.setState(
        {
          submissionStatus: {
            ...this.state.submissionStatus,
            [submission.id]: 'loading',
          },
        },
        async () => {
          const success = await db.insert(submission);
          this.props.navigation.state.params.updateSubmissionCount();
          this.setState({
            submissionStatus: {
              ...this.state.submissionStatus,
              [submission.id]: success ? 'success' : 'fail',
            },
          });
        }
      );
    }
  };

  syncSubmissions = () => {
    NetInfo.getConnectionInfo().then(connectionInfo => {
      const connectionType = connectionInfo.type;
      const isConnected = !(connectionType == 'none');
      if (isConnected) {
        const { wfs } = this.props.navigation.state.params;
        const submissions = wfs.layers.reduce((prev, layer) => {
          return prev.concat(Array.from(layer.submissions));
        }, []);
        //set all to loading
        let status = {};
        submissions.forEach(submission => {
          if (!submission.insert_success) {
            status[submission.id] = 'loading';
          }
        });
        this.setState(
          {
            submissionStatus: {
              ...this.state.submissionStatus,
              ...status,
            },
          },
          () => {
            //insert each
            submissions.forEach(async submission => {
              if (submission.insert_success === false) {
                const success = await db.insert(submission);
                this.props.navigation.state.params.updateSubmissionCount();
                this.setState({
                  submissionStatus: {
                    ...this.state.submissionStatus,
                    [submission.id]: success ? 'success' : 'fail',
                  },
                });
              }
            });
          }
        );
      } else {
        requestAnimationFrame(() => {
          Alert.alert('Offline', 'Your device must be connected to upload submissions.', [
            { text: 'OK' },
          ]);
        });
      }
    });
  };

  componentWillMount() {
    const { wfs } = this.props.navigation.state.params;
    const submissions = wfs.layers.reduce((prev, layer) => {
      return prev.concat(Array.from(layer.submissions));
    }, []);
    const submissionStatus = {};
    submissions.forEach(s => {
      submissionStatus[s.id] = s.insert_success ? 'success' : 'upload';
    });
    this.setState({ submissionStatus });
  }

  render() {
    const { wfs } = this.props.navigation.state.params;
    const { navigate } = this.props.navigation;
    const submissions = wfs.layers.reduce((prev, layer) => {
      return prev.concat(Array.from(layer.submissions));
    }, []);
    if (submissions.length == 0) {
      return (
        <View style={styles.container}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 8 }}>
            <Text style={styles.synced}>No changes to sync.</Text>
          </View>
        </View>
      );
    }
    let synced = true;
    for (let key in this.state.submissionStatus) {
      if (this.state.submissionStatus[key] === 'upload') {
        synced = false;
      }
    }
    return (
      <View style={styles.container}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 8 }}>
          {synced ? (
            <Text style={styles.synced}>All Synced</Text>
          ) : (
            <Button color={orange} title="Sync All" onPress={this.syncSubmissions} />
          )}
        </View>
        <FlatList
          data={submissions}
          extraData={this.state}
          renderItem={({ item }) => (
            <ListCell
              item={item}
              status={this.state.submissionStatus[item.id]}
              onPressUpload={() => this.syncSubmission(item)}
            />
          )}
          keyExtractor={this.keyExtractor}
          style={styles.list}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  list: {
    flex: 1,
  },
  cellName: {
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Medium' : 'monospace',
    fontSize: 14,
    color: 'black',
    paddingBottom: 4,
  },
  cellSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  cellRow: {
    justifyContent: 'flex-end',
    flexDirection: 'row',
    marginLeft: 16,
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  cellRowIcon: {
    flex: 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cellContent: {
    flex: 0.9,
    paddingTop: 8,
    paddingBottom: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  iconStyle: {
    paddingRight: 16,
  },
  synced: {
    fontSize: 16,
    color: '#888',
  },
});
