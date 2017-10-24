import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import scformschema from 'spatialconnect-form-schema/native';
import { find } from 'lodash';
import * as db from './db';
import { gray, darkGray } from './styles';

let self;
class Form extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: JSON.parse(navigation.state.params.layer.metadata).Title,
    headerRight: (
      <TouchableOpacity onPress={() => self.scform.onSubmit()}>
        <Icon style={styles.submitBtnStyle} name="md-checkmark" size={25} color={'white'} />
      </TouchableOpacity>
    ),
  });
  constructor(props) {
    super(props);
    self = this;
    this.state = {
      submitting: false,
      layer: null,
    };
    this.saveForm = this.saveForm.bind(this);
  }
  async saveForm(formData) {
    this.setState({ submitting: true });
    const { layer, feature, operation, makeAnnotations } = this.props.navigation.state.params;
    const gj = {
      id: feature.id,
      geometry: feature.geometry,
      properties: formData,
    };
    const submission = db.save(layer, gj, operation);
    if (submission) {
      const insertSuccess = await db.insert(submission);
      this.setState({ submitting: false });
      if (insertSuccess) {
        if (makeAnnotations) {
          makeAnnotations();
        }
        this.scform.formSubmitted();
      } else {
        this.scform.formSubmittedOffline();
      }
    } else {
      this.scform.formSubmittedError();
    }
  }
  componentWillMount() {
    const { layer, feature } = this.props.navigation.state.params;
    const metadata = JSON.parse(layer.metadata);
    const schema = metadata.schema;
    if (feature) {
      if (feature.properties) {
        Object.keys(feature.properties).forEach(field_key => {
          const field = find(schema.fields, { field_key });
          if (field) {
            let value = feature.properties[field_key];
            if (field.type === 'date') {
              value = new Date(feature.properties[field_key]);
            }
            field.constraints.initial_value = value;
          }
        });
      }
    }
    this.setState({ schema });
  }
  render() {
    const { layer, feature } = this.props.navigation.state.params;
    const { SCForm } = scformschema;
    const { submitting } = this.state;
    let coord;
    if (feature.geometry.type === 'Point') {
      coord = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'MultiPoint') {
      coord = feature.geometry.coordinates[0];
    }
    return (
      <View style={styles.container}>
        {feature &&
          feature.geometry && (
            <View style={styles.location}>
              <Text>
                Location: {coord[1]}, {coord[0]}
              </Text>
            </View>
          )}
        <SCForm
          ref={scform => {
            this.scform = scform;
          }}
          form={this.state.schema}
          submitting={submitting}
          saveForm={this.saveForm}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  submitBtnStyle: {
    paddingRight: 16,
    color: 'white',
  },
  location: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: darkGray,
    backgroundColor: gray,
  },
});

export default Form;
