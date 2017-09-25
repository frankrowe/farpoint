import 'react-native';
import React from 'react';
import * as wfs from '../wfs';
import featuretype1 from './featuretype1.json';
import remoteschemas from './remoteschemas.json';

const url = 'http://localhost:8080/geoserver/ows';
const exchange = 'http://dev.exchange.boundlessps.com/geoserver/ows';

// it('parses feature types', async () => {
//   expect.assertions(1);
//   const layers = await wfs.parseFeatureTypes(featuretype1);
//   expect(layers.length).toEqual(9);
// });
//
// it('parses remote feature types', async () => {
//   expect.assertions(1);
//   const layers = await wfs.getFeatureType(url);
//   expect(layers.length).toBeGreaterThan(0);
// });

it('gets capabilities', async () => {
  expect.assertions(1);
  const featureTypeList = await wfs.getCapabilities(url);
  expect(featureTypeList.length).toBeGreaterThan(0);
});
