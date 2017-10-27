import React from 'react';
import { ActivityIndicator, Platform, Modal, StyleSheet, View } from 'react-native';

const Loading = ({ loading }) => (
  <Modal visible={loading} transparent onRequestClose={() => {}}>
    <View style={styles.modalContainer}>
      <View style={styles.modal}>
        <ActivityIndicator size="large" animating={loading} />
      </View>
    </View>
  </Modal>
);

export default Loading;

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: 'white',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Platform.OS === 'ios' ? 10 : 2,
  },
});
