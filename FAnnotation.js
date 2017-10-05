import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Annotation } from 'react-native-mapbox-gl';

const DEFAULT_RADIUS = 10;
const DEFAULT_BORDER_WIDTH = 2;
const DEFAULT_BORDER_COLOR = '#333';
const DEFAULT_COLOR = 'rgba(255,65,54,0.8)';

export const FAnnotationView = ({ radius, backgroundColor, selected }) => {
  const width = selected ? radius + 5 + DEFAULT_BORDER_WIDTH : radius;
  const height = width;
  const borderWidth = selected ? DEFAULT_BORDER_WIDTH : 0;
  const borderRadius = width / 2;
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: radius + 15,
        height: radius + 15,
      }}
    >
      <View
        style={{
          width,
          height,
          borderWidth,
          borderColor: DEFAULT_BORDER_COLOR,
          borderRadius,
          backgroundColor: backgroundColor,
        }}
      />
    </View>
  );
};

const FAnnotation = ({ feature, onOpenAnnotation, backgroundColor, radius, selected }) => {
  let _radius = radius ? radius : DEFAULT_RADIUS;
  let _backgroundColor = backgroundColor ? backgroundColor : 'red';
  let coordinate;
  if (feature.geometry.type === 'MultiPoint') {
    //TODO show all points, not just first
    coordinate = {
      latitude: feature.geometry.coordinates[0][1],
      longitude: feature.geometry.coordinates[0][0],
    };
  } else {
    //should be Point
    coordinate = {
      latitude: feature.geometry.coordinates[1],
      longitude: feature.geometry.coordinates[0],
    };
  }
  return (
    <Annotation
      id={feature.id}
      coordinate={coordinate}
      style={{ alignItems: 'center', justifyContent: 'center', position: 'absolute' }}
    >
      <TouchableOpacity onPress={() => onOpenAnnotation(feature)}>
        <FAnnotationView radius={_radius} backgroundColor={_backgroundColor} selected={selected} />
      </TouchableOpacity>
    </Annotation>
  );
};

export default FAnnotation;
