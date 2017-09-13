import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import scformschema from 'spatialconnect-form-schema/native';
import * as wfs from './wfs';
import * as db from './db';

let self;
class Form extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: navigation.state.params.layer.layer_label,
    headerRight: (
      <TouchableOpacity onPress={() => self.scform.onSubmit()}>
        <Text style={styles.submitBtnStyle}>Submit</Text>
      </TouchableOpacity>
    ),
  });
  constructor(props) {
    super(props);
    self = this;
    this.state = {
      submitting: false,
      layer: null,
      geometry: null,
    };
    this.saveForm = this.saveForm.bind(this);
  }
  saveForm(formData) {
    this.setState({ submitting: true });
    const { layer } = this.props.navigation.state.params;
    const gj = {
      geometry: this.state.geometry,
      properties: formData,
    };
    db.save(layer, gj);
    this.scform.formSubmitted();
    this.setState({ submitting: false });
  }
  componentWillMount() {
    this.watchId = navigator.geolocation.watchPosition(
      position => {
        this.setState({
          geometry: {
            type: 'Point',
            coordinates: [position.coords.longitude, position.coords.latitude],
          },
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }
  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
  }
  render() {
    const { layer } = this.props.navigation.state.params;
    const { SCForm } = scformschema;
    const { submitting } = this.state;
    return (
      <View style={{ flex: 1 }}>
        {this.state.geometry && (
          <View style={styles.location}>
            <Text>
              Location: {this.state.geometry.coordinates[1]}, {this.state.geometry.coordinates[0]}
            </Text>
          </View>
        )}
        <SCForm
          ref={scform => {
            this.scform = scform;
          }}
          form={JSON.parse(layer.schema)}
          submitting={submitting}
          saveForm={this.saveForm}
        />
      </View>
    );
    return <Text>Form</Text>;
  }
}

const styles = StyleSheet.create({
  submitBtnStyle: {
    paddingRight: 16,
    color: 'white',
  },
  location: {
    padding: 8,
  },
});

export default Form;
