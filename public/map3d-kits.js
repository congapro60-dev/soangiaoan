// The registry of architecture kits for the 3D map. A kit is a function `(theme) => models` that builds the buildings of
// a world from its colours (theme.roof, theme.wall, theme.pillar, theme.trim) and returns these geometries (each one a
// single merged geometry with vertex colours, made with buildGeometry from map3d-models.js):
//
//   house      a small house, about 3 x 3 units on the ground, door on the +z side
//   tower      the tall building beside each gate (it stands on a plinth about 7 x 7)
//   arch       the gate over the road: the beam runs along local x (about 7.5 wide), the road along local z
//   wall       a wall segment 5 wide that flanks the gate
//   lampPost   a lamp post, about 2.4 tall; lampLight is the glowing part (it gets the emissive material)
//   pad        the stepping pad of a road cell; padCheck the larger pad of a gate cell
//   (optional) more tree kinds the theme lists in `trees`, a `walker(color)` that returns a small figure for the road
//
// Add a kit by writing it in its own file (public/map3d-kit-<name>.js, exporting a function) and listing it here.
// A kit may leave parts out: the missing ones fall back to the citadel's.
import { citadelKit } from './map3d-models.js';
import { scifiKit } from './map3d-kit-scifi.js';
import { cityKit, campusKit } from './map3d-kit-city.js';
import { farmKit, tropicalKit } from './map3d-kit-farm.js';
import { blocksKit } from './map3d-kit-blocks.js';
import { academyKit } from './map3d-kit-academy.js';

export const KITS = {
  citadel: citadelKit,
  scifi: scifiKit,
  city: cityKit,
  campus: campusKit,
  farm: farmKit,
  tropical: tropicalKit,
  blocks: blocksKit,
  academy: academyKit,
};
