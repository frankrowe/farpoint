/**
 * mapskin icon set component.
 * Usage: <mapskin name="icon-name" size={20} color="#4F8EF7" />
 * Look up the icon's hex code from mapskin.css,
 * convert hex to decimal
 * shell command to convert hex - echo $((16#e0e5))
 * hex value e0e5
 * add to glyphMap object - shell command to convert hex using val e0e5 in example`echo $((16#e0e5))`
 */

import createIconSet from 'react-native-vector-icons/lib/create-icon-set';
const glyphMap = {
  'ms-layer': 57455,
  'ms-layer-o': 57456,
  'ms-layer-base': 57457,
  'ms-layer-add': 57466,
  'ms-zoom': 57347,
  'ms-layers-overlay': 57458,
  'ms-layer-metadata': 57468,
  'ms-satellite': 57533,
  'ms-map-folded': 57439,
};

const iconSet = createIconSet(glyphMap, 'mapskin', 'mapskin.ttf');

export default iconSet;
