import { find, flattenDeep } from 'lodash';
import { parseString } from 'xml2js';
import base64 from 'base-64';

export const LIMIT = 9999999;

const parseXml = xml => {
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const chooseType = wfsType => {
  switch (wfsType) {
    case 'xsd:string':
      return 'string';
    case 'xsd:int':
    case 'xsd:double':
    case 'xsd:long':
      return 'number';
    case 'xsd:dateTime':
      return 'date';
    default:
      return false;
  }
};

const makeField = (field, idx) => ({
  id: idx + 1,
  type: chooseType(field.type),
  position: idx + 1,
  field_key: field.name,
  field_label: field.name,
  is_required: false,
  constraints: {},
});

const makeLayer = (schema, layer, idx) => {
  return {
    layer_key: schema['xsd:element'][idx]['$'].name,
    feature_type: schema['xsd:element'][idx]['$'].type.slice(0, -4),
    schema: {
      fields: layer['xsd:complexContent'][0]['xsd:extension'][0]['xsd:sequence'][0]['xsd:element']
        .map(f => f['$']) //xml lol
        .map(makeField)
        .filter(f => f.type),
    },
  };
};

export const getCapabilities = async wfs => {
  const url = `${wfs}?service=WFS&request=GetCapabilities`;
  try {
    const response = await fetch(url);
    const xml = await response.text();
    const result = await parseXml(xml);
    const featureTypeList = result['wfs:WFS_Capabilities']['FeatureTypeList'][0][
      'FeatureType'
    ].map(f => {
      return {
        namespace: f['$'],
        Name: f['Name'][0],
        Title: f['Title'][0],
        Abstract: f['Abstract'][0],
        'ows:Keywords': f['ows:Keywords'][0],
        DefaultCRS: f['DefaultCRS'][0],
        'ows:WGS84BoundingBox': f['ows:WGS84BoundingBox'][0],
        bbox: (f['ows:WGS84BoundingBox'][0]['ows:LowerCorner'][0] +
          ' ' +
          f['ows:WGS84BoundingBox'][0]['ows:UpperCorner'][0]
        ).split(' '),
      };
    });
    return featureTypeList;
  } catch (error) {
    console.log('getCapabilities error', error);
    return [];
  }
};

export const getFeatures = async (wfs, layer, bbox = [-90, -190, 90, 180]) => {
  const metadata = JSON.parse(layer.metadata);
  const typeName = metadata.feature_type;
  const token = JSON.parse(wfs.token);
  let url = `${wfs.url}/geoserver/ows
    ?service=WFS
    &version=1.1.0
    &request=GetFeature
    &maxFeatures=${LIMIT}
    &typeName=${typeName}
    &outputFormat=json
    &srsName=urn:ogc:def:crs:EPSG::4326
    &bbox=${bbox.join()},urn:ogc:def:crs:EPSG::4326`;
  try {
    if (token && token.access_token) {
      url += `&access_token=${token.access_token}`;
    }
    url = url.replace(/\s/g, '');
    console.log(url);
    const response = await fetch(url);
    const json = await response.json();
    return json;
  } catch (error) {
    console.log('getFeatures error', error);
    return false;
  }
};

export const getAllFeatures = async (wfsUrl, layerName, token) => {
  let url = `${wfsUrl}/geoserver/ows
    ?service=WFS
    &version=1.1.0
    &request=GetFeature
    &typeName=${layerName}
    &outputFormat=json
    &srsName=urn:ogc:def:crs:EPSG::4326`;
  try {
    if (token && token.access_token) {
      url += `&access_token=${token.access_token}`;
    }
    url = url.replace(/\s/g, '');
    console.log(url);
    const response = await fetch(url);
    const json = await response.json();
    return json;
  } catch (error) {
    console.log('getFeatures error', error);
    return false;
  }
};

const importsToSchema = async imports => {
  const promises = imports.map(async url => {
    const response = await fetch(url);
    const xml = await response.text();
    const result = await parseXml(xml);
    return await parseFeatureTypes(result);
  });
  return await Promise.all(promises);
};

export const parseFeatureTypes = async result => {
  try {
    const schema = result['xsd:schema'];
    if (!schema) return [];
    const imports = schema['xsd:import'].map(x => x['$']).map(x => x.schemaLocation);
    const importLayers = await importsToSchema(imports);
    const types = schema['xsd:complexType'] || [];
    const typeLayers = types.map(makeLayer.bind(null, schema));
    const layers = flattenDeep(importLayers.concat(typeLayers));
    return layers;
  } catch (error) {
    console.log('parseFeatureTypes error', error);
    return [];
  }
};

export const getFeatureType = async wfs => {
  const describeFeatureType = '?service=WFS&request=DescribeFeatureType';
  const url = `${wfs}${describeFeatureType}`;
  try {
    const response = await fetch(url);
    const xml = await response.text();
    const result = await parseXml(xml);
    const featureTypeList = await getCapabilities(wfs);
    const schemas = await parseFeatureTypes(result);
    const layers = schemas.map(layer => {
      const featureType = find(featureTypeList, { Name: layer.feature_type });
      return {
        ...layer,
        ...featureType,
      };
    });
    return layers;
  } catch (error) {
    console.log('error', error);
  }
};

const createInsertPayload = (layer, point) => {
  const metadata = JSON.parse(layer.metadata);
  const schema = metadata.schema;
  const namespaceName = Object.keys(metadata.namespace)[0];
  const namespaceUri = metadata.namespace[namespaceName];
  let xml = `<wfs:Transaction
    service="WFS"
    version="1.1.0"
    ${namespaceName}="${namespaceUri}"
    xmlns:ows="http://www.opengis.net/ows"
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:gml="http://www.opengis.net/gml"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    handle="Inserted 1 feature in '${metadata.feature_type}' via FarPoint.">
    <wfs:Insert>`;
  xml += `<${metadata.feature_type}>`;
  if (point.geometry.coordinates.length) {
    let pos;
    if (point.geometry.type === 'Point') {
      pos = `${point.geometry.coordinates[0]} ${point.geometry.coordinates[1]}`;
      xml += `<wkb_geometry>
                  <gml:Point srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">
                    <gml:pos>${pos}</gml:pos>
                 </gml:Point>
                </wkb_geometry>`;
    } else if (point.geometry.type === 'MultiPoint') {
      pos = `${point.geometry.coordinates[0][0]} ${point.geometry.coordinates[0][1]}`;
      xml += `<wkb_geometry><gml:MultiPoint xmlns:gml="http://www.opengis.net/gml" srsName="EPSG:4326"><gml:pointMember><gml:Point><gml:pos decimal="." cs="," ts=" ">${pos}</gml:pos></gml:Point></gml:pointMember></gml:MultiPoint></wkb_geometry>`;
    }
  }
  xml += Object.keys(point.properties)
    .map(key => {
      if (point.properties[key] !== null) {
        const field = find(schema.fields, { field_key: key });
        let value = point.properties[key];
        if (field.type === 'date') {
          value = new Date(value).toISOString();
        } else if (typeof value === 'string') {
          value = value.replace(/&/g, '&amp;');
        }
        return `<${key}>${value}</${key}>`;
      }
      return '';
    })
    .join('');

  xml += `
        </${metadata.feature_type}>
      </wfs:Insert>
    </wfs:Transaction>`;
  console.log(xml);
  return xml;
};

const createUpdatePayload = (layer, point) => {
  console.log(point);
  const metadata = JSON.parse(layer.metadata);
  const schema = metadata.schema;
  const namespaceName = Object.keys(metadata.namespace)[0];
  const namespaceUri = metadata.namespace[namespaceName];
  let xml = `<wfs:Transaction
      service="WFS"
      version="1.1.0"
      ${namespaceName}="${namespaceUri}"
      xmlns:ogc="http://www.opengis.net/ogc"
      xmlns:ows="http://www.opengis.net/ows"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      handle="Updated 1 feature in '${metadata.feature_type}' via FarPoint.">
      <wfs:Update typeName="${metadata.feature_type}">`;
  if (point.geometry.coordinates.length) {
    let pos;
    if (point.geometry.type === 'Point') {
      pos = `${point.geometry.coordinates[0]} ${point.geometry.coordinates[1]}`;
      xml += `
           <wfs:Property>
              <wfs:Name>wkb_geometry</wfs:Name>
                <wfs:Value>
                  <gml:Point srsName="http://www.opengis.net/gml/srs/epsg.xml#4326">
                    <gml:pos>${pos}</gml:pos>
                 </gml:Point>
                </wfs:Value>
            </wfs:Property>`;
    } else if (point.geometry.type === 'MultiPoint') {
      pos = `${point.geometry.coordinates[0][0]} ${point.geometry.coordinates[0][1]}`;
      xml += `<wfs:Property><wfs:Name>wkb_geometry</wfs:Name><wfs:Value><gml:MultiPoint xmlns:gml="http://www.opengis.net/gml" srsName="EPSG:4326"><gml:pointMember><gml:Point><gml:pos decimal="." cs="," ts=" ">${pos}</gml:pos></gml:Point></gml:pointMember></gml:MultiPoint></wfs:Value></wfs:Property>`;
    }
  }
  xml += Object.keys(point.properties)
    .map(key => {
      if (point.properties[key] !== null) {
        const field = find(schema.fields, { field_key: key });
        if (field) {
          let value = point.properties[key];
          if (field.type === 'date') {
            value = new Date(value).toISOString();
          } else if (typeof value === 'string') {
            value = value.replace(/&/g, '&amp;');
          }
          return `<wfs:Property>
        <wfs:Name>${key}</wfs:Name>
        <wfs:Value>${value}</wfs:Value>
        </wfs:Property>`;
        }
      }
      return '';
    })
    .join('');

  xml += `<ogc:Filter>
  <ogc:FeatureId fid="${point.id}"/>
 </ogc:Filter>
        </wfs:Update>
      </wfs:Transaction>`;
  console.log(xml);
  return xml;
};

const createDeletePayload = (layer, point) => {
  const metadata = JSON.parse(layer.metadata);
  const namespaceName = Object.keys(metadata.namespace)[0];
  const namespaceUri = metadata.namespace[namespaceName];
  let xml = `<wfs:Transaction
      service="WFS"
      version="1.1.0"
      ${namespaceName}="${namespaceUri}"
      xmlns:ogc="http://www.opengis.net/ogc"
      xmlns:ows="http://www.opengis.net/ows"
      xmlns:wfs="http://www.opengis.net/wfs"
      xmlns:gml="http://www.opengis.net/gml"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      handle="Deleted 1 feature in '${metadata.feature_type}' via FarPoint.">
	  <wfs:Delete typeName="${metadata.feature_type}">
	    <ogc:Filter>
	      <ogc:FeatureId fid="${point.id}" />
	    </ogc:Filter>
	  </wfs:Delete>
	</wfs:Transaction>`;
  return xml;
};

export const postTransaction = async (wfs, layer, point, operation = 'insert') => {
  try {
    let body;
    if (operation === 'insert') {
      body = createInsertPayload(layer, point);
    } else if (operation === 'update') {
      body = createUpdatePayload(layer, point);
    } else if (operation === 'delete') {
      body = createDeletePayload(layer, point);
    }
    const headers = {
      'Content-Type': 'text/xml',
    };
    const wfsUrl = wfs.url + '/geoserver/ows';
    if (wfs.user && wfs.password) {
      //headers['Authorization'] = 'Basic ' + base64.encode(wfs.user + ':' + wfs.password);
      // Bearer: token
    }
    const token = JSON.parse(wfs.token);
    if (token && token.access_token) {
      wfsUrl += `?access_token=${token.access_token}`;
    }
    console.log(wfsUrl);
    const request = await fetch(wfsUrl, {
      headers,
      method: 'POST',
      body,
    });
    const text = await request.text();
    const response = await parseXml(text);
    const success = false;
    const transactionResponse = response['wfs:TransactionResponse'];
    if (transactionResponse) {
      const summary = transactionResponse['wfs:TransactionSummary'];
      if (summary && summary[0]) {
        if (operation === 'insert') {
          const totalInserted = summary[0]['wfs:totalInserted']
            ? summary[0]['wfs:totalInserted'][0]
            : false;
          if (totalInserted === '1') {
            success = true;
          }
        } else if (operation === 'update') {
          const totalUpdated = summary[0]['wfs:totalUpdated']
            ? summary[0]['wfs:totalUpdated'][0]
            : false;
          if (totalUpdated === '1') {
            success = true;
          }
        } else if (operation === 'delete') {
          const totalDeleted = summary[0]['wfs:totalDeleted']
            ? summary[0]['wfs:totalDeleted'][0]
            : false;
          if (totalDeleted === '1') {
            success = true;
          }
        }
      }
    }
    return success;
  } catch (error) {
    console.log('insertFailure', error);
    return false;
  }
};
