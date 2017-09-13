import React, { Component } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
} from 'react-native';
import { blue, orange, gray, darkGray } from './styles';
import * as db from './db';

export default class LayerDetails extends Component {
  state = { unsent: 0, all: 0 };
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.layer.layer_label,
  });

  onPressGather = () => {
    const { navigate } = this.props.navigation;
    const { layer, wfs } = this.props.navigation.state.params;
    navigate('Form', { layer, wfs });
  };

  onPressUpload = () => {};

  componentWillMount() {
    const { layer, wfs } = this.props.navigation.state.params;
  }

  render() {
    const { navigate } = this.props.navigation;
    const { layer } = this.props.navigation.state.params;
    return (
      <View>
        <Button onPress={this.onPressGather} title="Gather" color="#00f" />
        <Button onPress={this.onPressUpload} title="Upload" color="#00f" />
        <Text>All: {this.state.all}</Text>
        <Text>Unsent: {this.state.unsent}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FAFAFA',
  },
});
