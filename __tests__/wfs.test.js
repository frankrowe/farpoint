import 'react-native';
import React from 'react';
//import * as wfs from '../wfs';
import * as exchange from '../exchange';
import featuretype1 from './featuretype1.json';
import remoteschemas from './remoteschemas.json';

const url = 'http://localhost:8080/geoserver/ows';
const exchangeUrl = 'http://dev.exchange.boundlessps.com/geoserver/ows';

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

// it('gets capabilities', async () => {
//   expect.assertions(1);
//   const featureTypeList = await wfs.getCapabilities(url);
//   expect(featureTypeList.length).toBeGreaterThan(0);
// });

it('gets token', async () => {
  expect.assertions(1);
  const token = await exchange.getToken('https://exchange.boundlessgeo.io');
  expect(token).toBeTruthy();
});
