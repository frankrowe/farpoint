import React, { Component } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
} from 'react-native';
import * as db from './db';
import { blue, orange, gray, darkGray, green } from './styles';

const WFSCell = props => {
  const submissionCount = props.wfs.layers.reduce((prev, layer) => {
    return layer.submissions.length;
  }, 0);
  return (
    <View>
      <TouchableOpacity onPress={props.onSelect}>
        <View style={styles.cellRow}>
          <Text style={styles.cellName} numberOfLines={2}>
            {props.wfs.url}
          </Text>
          <Text style={styles.cellSubtitle}>
            Layers: {props.wfs.layers.length} Submissions: {submissionCount}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default class WFSList extends Component {
  keyExtractor = item => item.id;

  componentDidMount() {
    db.realm.objects('Layer').addListener((layers, changes) => {
      console.log('layer change');
      //this.forceUpdate();
      // changes.insertions.forEach(async index => {
      //   let submission = submissions[index];
      //   //insert(submission);
      // });
    });
  }

  render() {
    const { navigate } = this.props.navigation;
    const { wfs } = this.props;
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Your WFS Servers</Text>
        </View>
        <FlatList
          data={wfs}
          renderItem={({ item }) => (
            <WFSCell
              wfs={item}
              onSelect={() => {
                navigate('LayerList', { wfs: item });
              }}
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
  titleContainer: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  list: {
    flex: 1,
  },
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
    paddingRight: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexDirection: 'column',
    marginLeft: 16,
    borderBottomColor: darkGray,
    borderBottomWidth: 1,
  },
  iconStyle: {
    paddingRight: 16,
  },
});
