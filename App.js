/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import { AppRegistry, Button, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StackNavigator } from 'react-navigation';
import FarPoint from './FarPoint';
import LayerList from './LayerList';
import LayerDetails from './LayerDetails';
import Form from './Form';
import { lightGreen, green } from './styles';

const AppStack = StackNavigator(
  {
    Home: { screen: FarPoint },
    LayerList: { screen: LayerList },
    LayerDetails: { screen: LayerDetails },
    Form: { screen: Form },
  },
  {
    navigationOptions: {
      headerStyle: {
        elevation: 6,
        backgroundColor: green,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      headerTitleStyle: {
        color: 'white',
      },
      headerTintColor: 'white',
    },
  }
);

export default class App extends React.Component {
  render() {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar backgroundColor={green} barStyle="light-content" />
        <AppStack />
      </View>
    );
  }
}
