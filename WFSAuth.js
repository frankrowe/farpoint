import React, { Component } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Platform,
  Text,
  TextInput,
  StyleSheet,
  View,
} from 'react-native';
import { NavigationActions } from 'react-navigation';
import * as db from './db';
import * as exchange from './exchange';
import Loading from './Loading';
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
    loading: false,
    error: false,
  };

  onChangeUser = user => {
    this.setState({ user });
  };

  onChangePassword = password => {
    this.setState({ password });
  };

  onPressLogin = async () => {
    const { navigate } = this.props.navigation;
    const { wfsUrl } = this.props.navigation.state.params;
    this.setState({ loading: true });
    try {
      const token = await exchange.getToken(wfsUrl, this.state.user, this.state.password);
      const wfs = await db.saveExchange(wfsUrl, token, this.state.user, this.state.password);
      this.setState({ loading: false });
      this.props.navigation.dispatch(
        NavigationActions.reset({
          index: 0,
          actions: [NavigationActions.navigate({ routeName: 'LayerList', params: { wfs } })],
        })
      );
    } catch (error) {
      this.setState({ loading: false });
      requestAnimationFrame(() => {
        Alert.alert('Login Unsuccessful ', error.message, [{ text: 'OK' }]);
      });
    }
  };

  onPressCancel = () => {
    const { goBack } = this.props.navigation;
    goBack();
  };

  onSubmitUser = () => {
    this._passwordInput.focus();
  };

  onSubmitPassword = () => {
    this.onPressLogin();
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
            onSubmitEditing={this.onSubmitUser}
            value={this.state.user}
            autoCapitalize={'none'}
            autoCorrect={false}
            autoFocus
            returnKeyType={'next'}
            underlineColorAndroid="transparent"
          />
          <Text style={styles.inputLabel}>Password:</Text>
          <TextInput
            ref={input => {
              this._passwordInput = input;
            }}
            style={styles.input}
            onChangeText={this.onChangePassword}
            onSubmitEditing={this.onSubmitPassword}
            value={this.state.password}
            autoCapitalize={'none'}
            autoCorrect={false}
            returnKeyType={'go'}
            secureTextEntry
            underlineColorAndroid="transparent"
          />
          <View style={styles.button}>
            <Button
              onPress={this.onPressLogin}
              title={'Login'}
              style={styles.button}
              color={orange}
            />
          </View>
        </View>
        {this.state.loading && <Loading loading={this.state.loading} />}
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
