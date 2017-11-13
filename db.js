import Realm from 'realm';
import { AppState, NetInfo } from 'react-native';
import MapboxGL from '@mapbox/react-native-mapbox-gl';
import uuid from 'react-native-uuid';
import turfArea from '@turf/area';
import bboxPolygon from '@turf/bbox-polygon';
import tileCover from 'tile-cover';
import { find } from 'lodash';
import * as wfs from './wfs';
import * as exchange from './exchange';

//MapboxGL.offlineManager.setTileCountLimit(1000);

const WFSSchema = {
  name: 'WFS',
  primaryKey: 'id',
  properties: {
    id: 'string',
    created: 'date',
    updated: 'date',
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
    offlinePacks: { type: 'list', objectType: 'OfflinePack' },
    features: { type: 'list', objectType: 'Feature' },
    featuresUpdated: { type: 'date', optional: true },
    submissions: { type: 'list', objectType: 'Submission' },
    wfs: { type: 'linkingObjects', objectType: 'WFS', property: 'layers' },
  },
};

const OfflinePackSchema = {
  name: 'OfflinePack',
  properties: {
    key: 'string',
  },
};

const SubmissionSchema = {
  name: 'Submission',
  primaryKey: 'id',
  properties: {
    id: 'string',
    created: 'date',
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
    layer: { type: 'linkingObjects', objectType: 'Layer', property: 'features' },
  },
};

//single exported Realm instance
export const realm = new Realm({
  schema: [WFSSchema, LayerSchema, SubmissionSchema, FeatureSchema, OfflinePackSchema],
  schemaVersion: 8,
  migration: (oldRealm, newRealm) => {
    if (oldRealm.schemaVersion < 1) {
      const oldObjects = oldRealm.objects('Submission');
      const newObjects = newRealm.objects('Submission');
      for (let i = 0; i < oldObjects.length; i++) {
        newObjects[i].created = new Date();
      }
    }
    if (oldRealm.schemaVersion < 4) {
      const oldObjects = oldRealm.objects('Layer');
      const newObjects = newRealm.objects('Layer');
      for (let i = 0; i < oldObjects.length; i++) {
        if (oldObjects[i].features.length) {
          newObjects[i].featuresUpdated = new Date();
        }
      }
    }
    if (oldRealm.schemaVersion < 6) {
      const oldObjects = oldRealm.objects('WFS');
      const newObjects = newRealm.objects('WFS');
      for (let i = 0; i < oldObjects.length; i++) {
        newObjects[i].updated = oldObjects[i].created;
      }
    }
    if (oldRealm.schemaVersion < 8) {
      const oldObjects = oldRealm.objects('Layer');
      const newObjects = newRealm.objects('Layer');
      for (let i = 0; i < oldObjects.length; i++) {
        newObjects.offlinePacks = [];
        if (oldObjects[i].offlineKey) {
          newObjects.offlinePacks.push({ key: oldObjects[i].offlineKey });
        }
      }
    }
  },
});

//track connection status
let connectionType = 'none';
let currentState = AppState.currentState;
let isConnected = false;
NetInfo.getConnectionInfo().then(async connectionInfo => {
  console.log(
    'Initial,  type: ' + connectionInfo.type + ', effectiveType: ' + connectionInfo.effectiveType
  );
});
export const monitor = () => {
  stateListener();
  //connectionListener();
  //insertListener();
};

export const newLayer = layer => ({
  id: uuid.v1(),
  key: layer.layer_key,
  offlinePacks: [],
  metadata: JSON.stringify(layer),
  submissions: [],
  features: [],
});

export const saveExchange = async (url, token, user, password) => {
  try {
    const layers = await exchange.getLayers(url, token);
    let newWfs;
    realm.write(() => {
      newWfs = realm.create('WFS', {
        id: uuid.v1(),
        created: new Date(),
        updated: new Date(),
        url,
        user,
        password,
        token: JSON.stringify(token),
        layers: layers.map(newLayer),
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
    const expiration = token.expires_in - token.expires_in * 0.1;
    if (dif > expiration) {
      const newToken = await exchange.refreshToken(wfs);
      if (newToken) {
        realm.write(() => {
          wfs.token = JSON.stringify(newToken);
          wfs.created = new Date();
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
      wfs.updated = new Date();
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

const getZoomsToCache = bbox => {
  let minZoom = 0,
    maxZoom = 0;
  const polygon = bboxPolygon([+bbox[0], +bbox[1], +bbox[2], +bbox[3]]);
  const area = turfArea(polygon);
  if (area < 1250000) {
    minZoom = 14;
    maxZoom = 16;
  } else if (area < 125000000) {
    minZoom = 12;
    maxZoom = 14;
  } else if (area < 50000000000) {
    minZoom = 8;
    maxZoom = 12;
  } else {
    minZoom = 0;
    maxZoom = 8;
  }
  //console.log(area, minZoom, maxZoom);
  return { minZoom, maxZoom };
};

export const downloadBasemap = (layer, bbox, styleURL, next) => {
  const bounds = [[+bbox[0], +bbox[1]], [+bbox[2], +bbox[3]]];
  const { minZoom, maxZoom } = getZoomsToCache(bbox);
  const offlineKey = uuid.v1();
  realm.write(() => {
    layer.offlinePacks.push({ key: offlineKey });
  });
  return new Promise((resolve, reject) => {
    const progressListener = (offlineRegion, status) => {
      if (status.percentage === 100 || status.state === 3) {
        resolve(true);
      } else {
        next(status);
      }
    };
    const errorListener = (offlineRegion, err) => {
      console.log(offlineRegion, err);
      reject(err);
    };

    MapboxGL.offlineManager.createPack(
      {
        name: offlineKey,
        styleURL,
        minZoom,
        maxZoom,
        bounds,
      },
      progressListener,
      errorListener
    );
  });
};

export const deleteBasemap = layer => {
  layer.offlinePacks.forEach(async offlinePack => {
    await MapboxGL.offlineManager.deletePack(offlinePack.key);
    MapboxGL.offlineManager.unsubscribe(offlinePack.key);
  });
  return true;
};

export const downloadFeatures = async layer => {
  try {
    const featureCollection = await wfs.getFeatures(layer.wfs[0], layer);
    const features = featureCollection.features.map(f => ({
      id: f.id,
      geojson: JSON.stringify(f),
    }));
    realm.write(() => {
      layer.features = features;
      layer.featuresUpdated = new Date();
    });
    return true;
  } catch (error) {
    console.log('download error', error);
    return false;
  }
};

export const deleteFeatures = async layer => {
  try {
    realm.write(() => {
      layer.features = [];
    });
    const success = await deleteBasemap(layer);
    return success;
  } catch (error) {
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

export const insert = async submission => {
  const point = JSON.parse(submission.point);
  const operation = submission.operation;
  const layer = submission.layer[0];
  const _wfs = layer.wfs[0];
  const success = await wfs.postTransaction(_wfs, layer, point, operation);
  if (success) {
    insertSuccessful(submission, success);
    return true;
  } else {
    insertFailure(submission);
    return false;
  }
};

export const save = (layer, point, operation = 'insert') => {
  let submission;
  try {
    realm.write(() => {
      submission = {
        id: uuid.v1(),
        operation,
        created: new Date(),
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

export const updateSubmission = point => {
  try {
    const id = point.id;
    const submissions = realm.objects('Submission').filtered(`id = "${id}"`);
    if (submissions.length) {
      const submission = submissions[0];
      realm.write(() => {
        submission.point = JSON.stringify(point);
      });
      return true;
    }
    return false;
  } catch (error) {
    console.log('save error', error);
    return false;
  }
};

export const deleteSubmission = point => {
  try {
    const id = point.id;
    const submissions = realm.objects('Submission').filtered(`id = "${id}"`);
    if (submissions.length) {
      const submission = submissions[0];
      realm.write(() => {
        realm.delete(submission);
      });
      return true;
    }
    return false;
  } catch (error) {
    console.log('delete error', error);
    return false;
  }
};

export const deleteFeature = async (layer, point) => {
  const _wfs = layer.wfs[0];
  let success = await wfs.postTransaction(_wfs, layer, point, 'delete');
  if (success && layer.features.length) {
    success = deleteFeatureCache(layer, point);
  }
  return success;
};

export const deleteFeatureCache = (layer, point) => {
  realm.write(() => {
    layer.features = layer.features.filter(f => f.id !== point.id);
  });
  return true;
};

export const updateFeatureCache = (submission, featureId) => {
  const layer = submission.layer[0];
  const wfs = layer.wfs[0];
  const feature = JSON.parse(submission.point);
  realm.write(() => {
    if (submission.operation === 'insert') {
      const newFeature = {
        id: featureId,
        ...feature,
      };
      layer.features.push({
        id: featureId,
        geojson: JSON.stringify(newFeature),
      });
    } else if (submission.operation === 'update') {
      layer.features = layer.features.map(f => {
        if (f.id === feature.id) {
          return {
            ...f,
            geojson: JSON.stringify(feature),
          };
        }
        return f;
      });
    }
  });
  return true;
};

// Private methods

const insertAll = () => {
  realm.objects('WFS').forEach(wfs => {
    wfs.layers.forEach(layer => {
      layer.submissions.filtered('insert_success == false').forEach(insert);
    });
  });
};

const insertSuccessful = (submission, featureId) => {
  console.log('insertSuccessful');
  updateFeatureCache(submission, featureId);
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

export const tileCount = (bbox, minZoom, maxZoom) => {
  const polygon = bboxPolygon(bbox);
  var sum = 0;
  for (var i = minZoom; i <= Math.min(16, maxZoom); i++) {
    sum += tileCover.tiles(polygon.geometry, { min_zoom: i, max_zoom: i }).length;
  }
  return sum;
};
