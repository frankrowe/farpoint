import Realm from 'realm';
import { NetInfo } from 'react-native';
import uuid from 'react-native-uuid';
import * as wfs from './wfs';
import * as exchange from './exchange';

const WFSSchema = {
  name: 'WFS',
  primaryKey: 'id',
  properties: {
    id: 'string',
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
    metadata: 'string',
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

//single exported Realm instance
export const realm = new Realm({ schema: [WFSSchema, LayerSchema, SubmissionSchema] });

//track connection status
let connectionType = 'none';
let isConnected = false;

export const monitor = () => {
  connectionListener();
  insertListener();
};

export const saveExchange = async (url, user, password) => {
  try {
    const token = await exchange.getToken(url, user, password);
    const layers = await exchange.getLayers(url, token);
    let newWfs;
    realm.write(() => {
      newWfs = realm.create('WFS', {
        id: uuid.v1(),
        url,
        user,
        password,
        token: JSON.stringify(token),
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

export const deleteWFS = wfs => {};

export const syncWFS = wfs => {};

export const save = (layer, point, operation = 'insert') => {
  console.log('saving', layer, point, operation);
  try {
    realm.write(() => {
      const submission = {
        id: uuid.v1(),
        operation,
        point: JSON.stringify(point),
        insert_success: false,
        insert_attempts: 0,
      };
      layer.submissions.push(submission);
    });
    realm.write(() => {}); //trigger notif
  } catch (error) {
    console.log('save error', error);
  }
};

// Private methods

const insert = async submission => {
  console.log('inserting submission', submission);
  if (isConnected) {
    console.log(submission.point);
    const point = JSON.parse(submission.point);
    const operation = submission.operation;
    const layer = submission.layer[0];
    const _wfs = layer.wfs[0];
    const success = await wfs.insert(_wfs, layer, point, operation);
    if (success) {
      insertSuccessful(submission);
      return;
    }
  }
  insertFailure(submission);
};

const insertAll = () => {
  //TODO fix
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

const insertListener = () => {
  realm.objects('Submission').addListener((submissions, changes) => {
    changes.insertions.forEach(async index => {
      let submission = submissions[index];
      insert(submission);
    });
  });
};
