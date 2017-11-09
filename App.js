/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import { AppRegistry, Button, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StackNavigator, SafeAreaView } from 'react-navigation';
import { updateFocus } from 'react-navigation-is-focused-hoc';
import FarPoint from './FarPoint';
import LayerList from './LayerList';
import LayerDetails from './LayerDetails';
import Form from './Form';
import WFSAuth from './WFSAuth';
import WFSSettings from './WFSSettings';
import Submissions from './Submissions';
import { lightGreen, green } from './styles';

const AppStack = StackNavigator(
  {
    Home: { screen: FarPoint },
    LayerList: { screen: LayerList },
    LayerDetails: { screen: LayerDetails },
    Form: { screen: Form },
    WFSAuth: { screen: WFSAuth },
    WFSSettings: { screen: WFSSettings },
    Submissions: { screen: Submissions },
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
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        <SafeAreaView style={{ flex: 1 }} forceInset={{ top: 'never', bottom: 'always' }}>
          <StatusBar backgroundColor={green} barStyle="light-content" />
          <AppStack
            onNavigationStateChange={(prevState, currentState) => {
              updateFocus(currentState);
            }}
          />
        </SafeAreaView>
      </View>
    );
  }
}
