import React, { Component } from 'react';
import { Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { orange, gray, darkGray } from './styles';

export default class FButton extends Component {
  render() {
    const { title, onPress, color, iconName, iconRight } = this.props;
    const hasIcon = !!iconName;
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: !!color ? color : orange,
          borderRadius: 4,
          flexDirection: 'row',
          padding: 8,
          alignSelf: 'flex-start',
        }}
      >
        {hasIcon &&
        !iconRight && (
          <Icon name={iconName} size={14} color={'white'} style={{ paddingRight: 8 }} />
        )}
        <Text
          style={{
            color: 'white',
            fontSize: 14,
            paddingLeft: hasIcon ? 0 : 8,
            paddingRight: hasIcon ? 0 : 8,
          }}
        >
          {title}
        </Text>
        {hasIcon &&
        iconRight && <Icon name={iconName} size={18} color={'white'} style={{ paddingLeft: 8 }} />}
      </TouchableOpacity>
    );
  }
}
