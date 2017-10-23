import Realm from 'realm';
import { AppState, NetInfo } from 'react-native';
import uuid from 'react-native-uuid';
import { find } from 'lodash';
import * as wfs from './wfs';
import * as exchange from './exchange';

const WFSSchema = {
  name: 'WFS',
  primaryKey: 'id',
  properties: {
    id: 'string',
    created: 'date',
    url: 'string',
    user: 'string',
    password: 'string',
    token: 'string',
    layers: { type: 'list', objectType: 'Layer' },
  },
};

const LayerSchema = {
  name: 'Layer',
  primaryKey: 'id',
  properties: {
    id: 'string',
    key: 'string',
    metadata: 'string',
    features: { type: 'list', objectType: 'Feature' },
    submissions: { type: 'list', objectType: 'Submission' },
    wfs: { type: 'linkingObjects', objectType: 'WFS', property: 'layers' },
  },
};

const SubmissionSchema = {
  name: 'Submission',
  primaryKey: 'id',
  properties: {
    id: 'string',
    operation: 'string', //insert || update
    point: 'string', // geojson
    insert_success: 'bool',
    insert_attempts: 'int',
    layer: { type: 'linkingObjects', objectType: 'Layer', property: 'submissions' },
  },
};

const FeatureSchema = {
  name: 'Feature',
  primaryKey: 'id',
  properties: {
    id: 'string',
    geojson: 'string',
  },
};

//single exported Realm instance
export const realm = new Realm({
  schema: [WFSSchema, LayerSchema, SubmissionSchema, FeatureSchema],
});

//track connection status
let connectionType = 'none';
let currentState = AppState.currentState;
let isConnected = false;

export const monitor = () => {
  stateListener();
  //connectionListener();
  //insertListener();
};

export const saveExchange = async (url, token, user, password) => {
  try {
    const layers = await exchange.getLayers(url, token);
    let newWfs;
    realm.write(() => {
      newWfs = realm.create('WFS', {
        id: uuid.v1(),
        created: new Date(),
        url,
        user,
        password,
        token: JSON.stringify(token),
        layers,
      });
    });
    return newWfs;
  } catch (error) {
    console.log('save error', error);
    return false;
  }
};

export const refreshExchangeTokens = () => {
  let instances = realm.objects('WFS');
  instances.forEach(async wfs => {
    let token = JSON.parse(wfs.token);
    let created = wfs.created;
    let dif = Math.abs(new Date().getTime() - created.getTime()) / 1000;
    if (dif > token.expires_in) {
      const newToken = await exchange.refreshToken(wfs);
      if (newToken) {
        realm.write(() => {
          wfs.token = JSON.stringify(newToken);
        });
      }
    }
  });
};

export const refreshWFS = async wfs => {
  try {
    const token = JSON.parse(wfs.token);
    const layers = await exchange.getLayers(wfs.url, token);
    realm.write(() => {
      layers.forEach(layer => {
        const existingLayer = find(wfs.layers, { key: layer.layer_key });
        if (existingLayer) {
          existingLayer.metadata = JSON.stringify(layer);
        } else {
          wfs.layers.push(newLayer(layer));
        }
      });
    });
    return wfs;
  } catch (error) {
    console.log('refresh error', error);
    return false;
  }
};

export const saveWFS = async (wfsUrl, user, password) => {
  try {
    const layers = await wfs.getFeatureType(wfsUrl);
    const token = await exchange.getToken(wfsUrl, user, password);
    let newWfs;
    realm.write(() => {
      newWfs = realm.create('WFS', {
        id: uuid.v1(),
        url: wfsUrl,
        user,
        password,
        token,
        layers: layers.map(l => ({
          id: uuid.v1(),
          metadata: JSON.stringify(l),
          submissions: [],
        })),
      });
    });
    return newWfs;
  } catch (error) {
    console.log('save error', error);
    return false;
  }
};

export const deleteObject = realmObject => {
  try {
    if (realm.isInTransaction) {
      realm.delete(realmObject);
    } else {
      realm.write(() => realm.delete(realmObject));
    }
    return true;
  } catch (e) {
    console.log('Error deleting', e);
    return false;
  }
};

export const syncWFS = wfs => {
  let inserts = [];
  wfs.layers.forEach(layer => {
    inserts = inserts.concat(layer.submissions.filtered('insert_success == false').map(insert));
  });
  return Promise.all(inserts);
};

export const save = (layer, point, operation = 'insert') => {
  console.log('saving', layer, point, operation);
  let submission;
  try {
    realm.write(() => {
      submission = {
        id: uuid.v1(),
        operation,
        point: JSON.stringify(point),
        insert_success: false,
        insert_attempts: 0,
      };
      layer.submissions.push(submission);
    });
    realm.write(() => {}); //trigger notif
    return layer.submissions[layer.submissions.length - 1];
  } catch (error) {
    console.log('save error', error);
    return false;
  }
};

export const deleteFeature = async (layer, point) => {
  const _wfs = layer.wfs[0];
  const success = await wfs.postTransaction(_wfs, layer, point, 'delete');
  return success;
};

// Private methods

export const insert = async submission => {
  console.log('inserting submission', submission);
  const point = JSON.parse(submission.point);
  const operation = submission.operation;
  const layer = submission.layer[0];
  const _wfs = layer.wfs[0];
  const success = await wfs.postTransaction(_wfs, layer, point, operation);
  if (success) {
    insertSuccessful(submission);
    return true;
  } else {
    insertFailure(submission);
    return false;
  }
};

const insertAll = () => {
  realm.objects('WFS').forEach(wfs => {
    wfs.layers.forEach(layer => {
      layer.submissions.filtered('insert_success == false').forEach(insert);
    });
  });
};

const insertSuccessful = submission => {
  console.log('insertSuccessful');
  if (realm.isInTransaction) {
    submission.insert_success = true;
    submission.insert_attempts = submission.insert_attempts + 1;
  } else {
    realm.write(() => {
      submission.insert_success = true;
      submission.insert_attempts = submission.insert_attempts + 1;
    });
  }
};

const insertFailure = submission => {
  console.log('insertFailure');
  if (realm.isInTransaction) {
    submission.insert_success = false;
    submission.insert_attempts = submission.insert_attempts + 1;
  } else {
    realm.write(() => {
      submission.insert_success = false;
      submission.insert_attempts = submission.insert_attempts + 1;
    });
  }
};

const connectionListener = () => {
  const updateConnectionInfo = connectionInfo => {
    connectionType = connectionInfo.type;
    isConnected = !(connectionType == 'none' || connectionType == 'unknown');
    console.log('isConnected', isConnected);
    if (isConnected) {
      //insertAll();
    }
  };
  NetInfo.getConnectionInfo().then(updateConnectionInfo);
  NetInfo.addEventListener('connectionChange', updateConnectionInfo);
};

const stateListener = () => {
  AppState.addEventListener('change', nextAppState => {
    console.log(nextAppState);
    if (currentState.match(/inactive|background/) && nextAppState === 'active') {
      refreshExchangeTokens();
    }
    currentState = nextAppState;
  });
};

const insertListener = () => {
  realm.objects('Submission').addListener((submissions, changes) => {
    changes.insertions.forEach(async index => {
      let submission = submissions[index];
      //insert(submission);
    });
  });
};
