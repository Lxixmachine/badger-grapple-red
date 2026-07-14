import {createSeedProject} from '../editor/project.js';

export const SEASON_ONE_PROJECT = createSeedProject();
export const CELL_SIZE = 32;
export const VIEW_WIDTH = 480;
export const VIEW_HEIGHT = 320;

export const LEGACY_AREA_ALIASES = {
  fieldhouse: 'team_locker_room',
  wrestlingroom: 'wrestling_room',
  campus: 'camp_randall',
  studyhall: 'coach_office',
  lakeshore: 'lakeshore_path',
  downtown: 'state_street',
  river: 'picnic_point',
  conference: 'kohl_bracket_floor',
  championship: 'kohl_center',
  shop: 'buckys_locker_room',
  recovery: 'trainer_room'
};

const groundById = new Map(SEASON_ONE_PROJECT.assets.groundTiles.map(tile => [tile.id, tile]));
const metatileById = new Map(SEASON_ONE_PROJECT.assets.metatiles.map(tile => [tile.id, tile]));
const objectAssetById = new Map(SEASON_ONE_PROJECT.assets.objects.map(asset => [asset.id, asset]));

export function resolveSeasonMapId(area) {
  const resolved = LEGACY_AREA_ALIASES[area] || area;
  return SEASON_ONE_PROJECT.maps[resolved] ? resolved : 'team_locker_room';
}

export function seasonMap(mapId) {
  return SEASON_ONE_PROJECT.maps[resolveSeasonMapId(mapId)];
}

export function defaultSeasonSpawn(mapId) {
  const map = seasonMap(mapId);
  if (map.start) return {...map.start};
  if (map.exit) return {x: map.exit.x, y: Math.max(1, map.exit.y - 1), facing: 'up'};
  return {x: Math.floor(map.width / 2), y: Math.max(1, map.height - 2), facing: 'up'};
}

export function validSeasonPosition(mapId, position) {
  const map = seasonMap(mapId);
  return Number.isInteger(position?.x) && Number.isInteger(position?.y)
    && position.x >= 0 && position.y >= 0 && position.x < map.width && position.y < map.height;
}

export function terrainVisual(map, x, y) {
  const terrainId = map.terrain[y]?.[x];
  return map.terrainTiles?.[terrainId];
}

export function terrainBehavior(map, x, y) {
  return groundById.get(map.terrain[y]?.[x])?.behavior || 'walkable';
}

export function objectAsset(object) {
  return objectAssetById.get(object.assetId) || null;
}

export function metatile(tileId) {
  return metatileById.get(tileId) || null;
}

export function objectCell(object, x, y) {
  if (x < object.x || y < object.y || x >= object.x + object.width || y >= object.y + object.height) return null;
  const localX = x - object.x;
  const localY = y - object.y;
  return {
    localX,
    localY,
    solid: object.collisionMask?.[localY]?.[localX] === '#',
    tileId: object.metatiles?.[localY]?.[localX] || null,
    door: object.door?.x === localX && object.door?.y === localY
  };
}

export function objectsAt(map, x, y) {
  return (map.objects || []).flatMap(object => {
    const cell = objectCell(object, x, y);
    return cell ? [{object, cell}] : [];
  });
}

export function mapDoorAt(map, x, y) {
  for (const {object, cell} of objectsAt(map, x, y).reverse()) {
    if (!object.interior) continue;
    if (cell.door || !cell.solid) return {object, to: object.interior};
  }
  return null;
}

export function mapEventAt(map, x, y) {
  return (map.events || []).find(event => event.x === x && event.y === y) || null;
}

export function actorConditionMet(actor, state) {
  const condition = actor.condition;
  if (!condition) return true;
  if (condition === 'office_unchecked') return !state.flags?.officeChecked;
  if (condition === 'ready_for_airport') return Boolean(state.keyItems?.flightTicket) && !state.flags?.sendoffComplete;
  if (condition === 'homecoming') return Boolean(state.flags?.nationalsComplete);
  if (condition.flag) {
    const value = Boolean(state.flags?.[condition.flag]);
    return condition.equals === undefined ? value : value === condition.equals;
  }
  if (condition.badge) return (state.badges || []).includes(condition.badge);
  if (condition.defeated) return Boolean(state.trainersDefeated?.[condition.defeated]);
  return true;
}

export function actorsForMap(map, state) {
  return (map.actors || []).filter(actor => actorConditionMet(actor, state));
}

export function isSeasonPassable(map, x, y, state, actors = []) {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false;
  if (terrainBehavior(map, x, y) === 'water') {
    const inKayakLane = (map.waterRoutes || []).some(route => x >= route.x && y >= route.y
      && x < route.x + route.width && y < route.y + route.height);
    if (!inKayakLane || !state.flags?.kayakVoucherRedeemed) return false;
  }
  if (objectsAt(map, x, y).some(({cell}) => cell.solid)) return false;
  if (actors.some(actor => actor.solid !== false && actor.x === x && actor.y === y)) return false;
  return true;
}

export function connectionForStep(map, x, y, direction) {
  const edge = direction === 'up' ? 'north' : direction === 'down' ? 'south' : direction === 'left' ? 'west' : 'east';
  const outside = (edge === 'north' && y < 0) || (edge === 'south' && y >= map.height)
    || (edge === 'west' && x < 0) || (edge === 'east' && x >= map.width);
  if (!outside) return null;
  const coordinate = edge === 'north' || edge === 'south' ? x : y;
  const connection = (map.connections || []).find(entry => entry.edge === edge
    && coordinate >= entry.start && coordinate < entry.start + entry.span);
  if (!connection) return null;
  const target = seasonMap(connection.to);
  const offset = coordinate - connection.start;
  const targetCoordinate = connection.toStart + offset;
  const spawn = connection.toEdge === 'north'
    ? {x: targetCoordinate, y: 0}
    : connection.toEdge === 'south'
      ? {x: targetCoordinate, y: target.height - 1}
      : connection.toEdge === 'west'
        ? {x: 0, y: targetCoordinate}
        : {x: target.width - 1, y: targetCoordinate};
  return {connection, target, spawn};
}

export function preloadSeasonOneAssets(scene) {
  const atlas = seasonMap('camp_randall').metatileAtlas;
  const atlasVersion = atlas.sha256?.slice(0, 16) || SEASON_ONE_PROJECT.metatileVersion;
  scene.load.spritesheet('season-one-metatiles', `${atlas.path}?v=${atlasVersion}`, {
    frameWidth: CELL_SIZE,
    frameHeight: CELL_SIZE
  });
  for (const [mapId, map] of Object.entries(SEASON_ONE_PROJECT.maps)) {
    if (map.background?.path) scene.load.image(`season-bg:${mapId}`, map.background.path);
  }
  for (const asset of SEASON_ONE_PROJECT.assets.objects) {
    if (asset.path && !asset.metatiles) scene.load.image(`season-object:${asset.id}`, asset.path);
  }
  for (const asset of SEASON_ONE_PROJECT.assets.actors) {
    scene.load.spritesheet(`season-actor:${asset.sourceId}`, asset.path, {
      frameWidth: asset.frameWidth,
      frameHeight: asset.frameHeight
    });
  }
}

export function stampSemanticsAt(map, x, y) {
  return objectsAt(map, x, y).map(({object, cell}) => ({
    object,
    cell,
    semantic: metatileById.get(cell.tileId)?.families?.[0] || object.sourceId || object.id
  }));
}
