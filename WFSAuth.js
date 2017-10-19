import React, { Component } from 'react';
import { Button, Platform, Text, TextInput, StyleSheet, View } from 'react-native';
import { NavigationActions } from 'react-navigation';
import * as db from './db';
import * as exchange from './exchange';
import { blue, orange, gray, darkGray } from './styles';

class WFSAuth extends Component {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'Login',
    };
  };

  state = {
    user: '',
    password: '',
  };

  onChangeUser = user => {
    this.setState({ user });
  };

  onChangePassword = password => {
    this.setState({ password });
  };

  onPressAdd = async () => {
    const { navigate } = this.props.navigation;
    const { wfsUrl } = this.props.navigation.state.params;
    const wfs = await db.saveExchange(wfsUrl, this.state.user, this.state.password);
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

  render() {
    const { wfsUrl } = this.props.navigation.state.params;
    return (
      <View>
        <View style={styles.wfs}>
          <Text>{wfsUrl}</Text>
        </View>
        <View style={styles.container}>
          <Text style={styles.instructions}>Login with your Exchange Credentials</Text>
          <Text style={styles.inputLabel}>Username:</Text>
          <TextInput
            style={styles.input}
            onChangeText={this.onChangeUser}
            value={this.state.user}
            autoCapitalize={'none'}
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />
          <Text style={styles.inputLabel}>Password:</Text>
          <TextInput
            style={styles.input}
            onChangeText={this.onChangePassword}
            value={this.state.password}
            autoCapitalize={'none'}
            autoCorrect={false}
            secureTextEntry
            underlineColorAndroid="transparent"
          />
          <View style={styles.button}>
            <Button onPress={this.onPressAdd} title={'Login'} style={styles.button} />
          </View>
          <View style={styles.button}>
            <Button onPress={this.onPressCancel} title={'Cancel'} color={'#D9534F'} />
          </View>
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
  instructions: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'white',
    borderColor: 'gray',
    borderWidth: 1,
    padding: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Platform.OS === 'ios' ? 0 : 8,
    marginLeft: -8,
  },
});

export default WFSAuth;
