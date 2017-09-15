import Realm from 'realm';
import { NetInfo } from 'react-native';
import uuid from 'react-native-uuid';
import * as wfs from './wfs';

const WFSSchema = {
  name: 'WFS',
  primaryKey: 'id',
  properties: {
    id: 'string',
    url: 'string',
    layers: { type: 'list', objectType: 'Layer' },
  },
};

const LayerSchema = {
  name: 'Layer',
  primaryKey: 'id',
  properties: {
    id: 'string',
    layer_key: 'string',
    schema: 'string',
    submissions: { type: 'list', objectType: 'Submission' },
    wfs: { type: 'linkingObjects', objectType: 'WFS', property: 'layers' },
  },
};

const SubmissionSchema = {
  name: 'Submission',
  primaryKey: 'id',
  properties: {
    id: 'string',
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

export const save = (layer, point) => {
  console.log('saving');
  try {
    realm.write(() => {
      const submission = {
        id: uuid.v1(),
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
    const point = JSON.parse(submission.point);
    const layer = submission.layer[0];
    const wfsUrl = layer.wfs[0].url;
    const success = await wfs.insert(wfsUrl, layer, point);
    //const success = true;
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
      insertAll();
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
