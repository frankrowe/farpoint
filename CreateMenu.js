import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { Animated, Easing, Button, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { blue, orange, lightOrange, green, gray, darkGray } from './styles';

const ANIMATION_DURATION = 500;

export default class CreateMenu extends Component {
  state = { rightPosition: new Animated.Value(0) };

  onPressAdd = () => {
    if (this.props.adding) {
      Animated.timing(this.state.rightPosition, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }).start();
      this.props.onAddData();
    } else {
      this.props.onAddToggle();
      Animated.timing(this.state.rightPosition, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }).start();
    }
  };

  onPressCancel = () => {
    this.props.onAddCancel();
    Animated.timing(this.state.rightPosition, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      easing: Easing.elastic(1),
      useNativeDriver: true,
    }).start();
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.adding) {
      this.state.rightPosition.setValue(1);
    } else {
      this.state.rightPosition.setValue(0);
    }
  }

  render() {
    const { adding, onAddCancel } = this.props;

    const right = {
      transform: [
        {
          translateX: this.state.rightPosition.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -48],
          }),
        },
      ],
      width: 36,
      height: 36,
      top: 2,
      right: 2,
    };
    const cancelBtnStyle = [styles.button, { backgroundColor: '#D9534F' }, right];
    return (
      <View style={styles.container}>
        <TouchableOpacity style={cancelBtnStyle} onPress={this.onPressCancel}>
          <Icon name="md-close" size={20} color={'white'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: orange }]}
          onPress={this.onPressAdd}
        >
          {adding ? (
            <Icon name="md-checkmark" size={25} color={'white'} />
          ) : (
            <Icon name="md-add" size={25} color={'white'} />
          )}
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 40,
  },
  button: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginLeft: 8,
    position: 'absolute',
    top: 0,
    right: 0,
  },
});
