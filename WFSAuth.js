import React, { Component } from 'react';
import { Button, Text, TextInput, StyleSheet, View } from 'react-native';
import { NavigationActions } from 'react-navigation';
import * as db from './db';
import { blue, orange, gray, darkGray } from './styles';

class WFSAuth extends Component {
  state = { user: '', password: '' };

  onChangeUser = user => {
    this.setState({ user });
  };

  onChangePassword = password => {
    this.setState({ password });
  };

  onPressAdd = async () => {
    const { navigate } = this.props.navigation;
    const { wfsUrl } = this.props.navigation.state.params;
    const wfs = await db.saveWFS(wfsUrl, this.state.user, this.state.password);
    this.props.navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LayerList', params: { wfs } })],
      })
    );
  };

  onPressAnon = async () => {
    const { navigate } = this.props.navigation;
    const { wfsUrl } = this.props.navigation.state.params;
    const wfs = await db.saveWFS(wfsUrl, '', '');
    this.props.navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName: 'LayerList', params: { wfs } })],
      })
    );
  };

  onPressCancel = () => {
    const { goBack } = this.props.navigation;
    goBack();
  };

  componentDidMount() {}

  render() {
    const { wfsUrl } = this.props.navigation.state.params;
    return (
      <View>
        <View style={styles.wfs}>
          <Text>{wfsUrl}</Text>
        </View>
        <View style={styles.container}>
          <Text>Username:</Text>
          <TextInput
            style={[styles.input, { marginBottom: 8 }]}
            onChangeText={this.onChangeUser}
            value={this.state.user}
            autoCapitalize={'none'}
            autoCorrect={false}
          />
          <Text>Password:</Text>
          <TextInput
            style={styles.input}
            onChangeText={this.onChangePassword}
            value={this.state.password}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry
          />
          <Button onPress={this.onPressAdd} title={'Add Credentials'} />
          <Button onPress={this.onPressAnon} title={'Continue without Credentials'} />
          <Button onPress={this.onPressCancel} title={'Cancel'} color={'#D9534F'} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  wfs: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: darkGray,
    backgroundColor: gray,
  },
  input: {
    backgroundColor: 'white',
    borderColor: 'gray',
    borderWidth: 1,
    padding: 8,
    fontSize: 16,
  },
});

export default WFSAuth;
