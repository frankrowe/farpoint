import { find } from 'lodash';
import { parseString } from 'xml2js';

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
      return 'string';
  }
};

const wfsToSC = layer => {
  return {
    layer_key: layer.layer_key,
    layer_label: layer.layer_label,
    schema: {
      fields: layer.schema.map((field, idx) => ({
        id: idx + 1,
        type: chooseType(field.type),
        position: idx + 1,
        field_key: field.name,
        field_label: field.name,
        is_required: false,
        constraints: {},
      })),
    },
  };
};

export const getFeatureType = async (wfs, next) => {
  const describeFeatureType = '?service=WFS&request=DescribeFeatureType';
  const url = `${wfs}${describeFeatureType}`;
  try {
    const response = await fetch(url);
    const xml = await response.text();
    const result = await parseXml(xml);
    const schema = result['xsd:schema'];
    const layers = schema['xsd:complexType']
      .map((layer, idx) => {
        return {
          layer_key: schema['xsd:element'][idx]['$'].name,
          layer_label: schema['xsd:element'][idx]['$'].name,
          schema: layer['xsd:complexContent'][0]['xsd:extension'][0]['xsd:sequence'][0][
            'xsd:element'
          ].map(f => {
            return f['$'];
          }),
        };
      })
      .map(wfsToSC);
    return layers;
  } catch (error) {}
};

export const insert = async (wfsUrl, layer, point) => {
  const schema = JSON.parse(layer.schema);
  let xml = `<wfs:Transaction
  service="WFS"
  version="1.1.0"
  xmlns:geonode="http://geonode"
  xmlns:ows="http://www.opengis.net/ows"
  xmlns:wfs="http://www.opengis.net/wfs"
  xmlns:gml="http://www.opengis.net/gml"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <wfs:Insert>`;
  xml += `<${layer.layer_key}>`;
  if (point.geometry.coordinates.length) {
    xml += `
        <the_geom>
          <gml:Point>
            <gml:pos>${point.geometry.coordinates[1]} ${point.geometry.coordinates[0]}</gml:pos>
          </gml:Point>
        </the_geom>`;
  }
  xml += Object.keys(point.properties).map(key => {
    if (point.properties[key] !== null) {
      const field = find(schema.fields, { field_key: key });
      let value = point.properties[key];
      if (field.type === 'date') {
        value = new Date(value).toISOString();
      }
      return `<${key}>${value}</${key}>`;
    }
    return '';
  });

  xml += `
      </${layer.layer_key}>
    </wfs:Insert>
  </wfs:Transaction>`;

  try {
    const response = await fetch(wfsUrl, {
      headers: {
        'Content-Type': 'text/xml',
      },
      method: 'POST',
      body: xml,
    });
    const text = await response.text();
    const body = await parseXml(text);
    const success = false;
    const transactionResponse = body['wfs:TransactionResponse'];
    if (transactionResponse) {
      const summary = transactionResponse['wfs:TransactionSummary'];
      if (summary && summary[0]) {
        const totalInserted = summary[0]['wfs:totalInserted']
          ? summary[0]['wfs:totalInserted'][0]
          : false;
        if (totalInserted === '1') {
          success = true;
        }
      }
    }
    return success;
  } catch (error) {
    return false;
  }
};
