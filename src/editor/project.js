import layouts from '../data/seasonOneLayouts.json';
import production from '../data/campRandallProductionBuild.json';

export const PROJECT_SCHEMA = 'badger-grapple-map-pack/v1';
export const TERRAIN = {
  grass: {label: 'Grass', color: '#5f9f58'},
  brick: {label: 'Brick', color: '#ad473d'},
  stone: {label: 'Stone', color: '#c4bca5'},
  dirt: {label: 'Dirt', color: '#cdb27a'},
  floor: {label: 'Floor', color: '#b99669'}
};

const deepClone = value => JSON.parse(JSON.stringify(value));

function findOwner(layout, entry) {
  if (entry.ownerGroup) {
    return (layout[entry.ownerGroup] || []).find(owner => owner.id === entry.id);
  }
  return (layout.fixtures || []).find(owner => owner.id === entry.id);
}

function collisionMask(owner) {
  if (!owner || owner.walkable || owner.to) {
    return Array.from({length: owner?.height || 1}, () => '.'.repeat(owner?.width || 1));
  }
  const rows = owner.collisionMask
    ? [...owner.collisionMask]
    : Array.from({length: owner.height}, () => '#'.repeat(owner.width));
  if (!owner.door) return rows;
  const localX = owner.door.x - owner.x;
  const localY = owner.door.y - owner.y;
  const row = rows[localY].split('');
  row[localX] = '.';
  rows[localY] = row.join('');
  return rows;
}

function doorFor(owner) {
  if (!owner?.door) return null;
  return {x: owner.door.x - owner.x, y: owner.door.y - owner.y};
}

function terrainRows(layout, interior = false) {
  const fill = interior ? 'floor' : (layout.ground === 'lawn' ? 'grass' : (layout.ground || 'grass'));
  const rows = Array.from({length: layout.size.height}, () => Array(layout.size.width).fill(fill));
  if (!interior) {
    for (const material of ['brick', 'stone', 'dirt']) {
      for (const path of (layout.paths || []).filter(entry => entry.material === material)) {
        for (let y = path.y; y < path.y + path.height; y += 1) {
          for (let x = path.x; x < path.x + path.width; x += 1) rows[y][x] = material;
        }
      }
    }
  }
  return rows;
}

function makeObjectAsset(mapId, entry, owner, mapType) {
  return {
    id: `${mapId}:${entry.id}`,
    sourceId: entry.id,
    name: owner?.name || entry.id.replaceAll('_', ' '),
    category: entry.ownerGroup || 'fixtures',
    mapType,
    path: entry.path,
    width: entry.width,
    height: entry.height,
    defaultCollisionMask: collisionMask(owner),
    defaultDoor: doorFor(owner),
    minimumCoverage: entry.audit?.minimumCoverage ?? 1
  };
}

function makeObjectInstance(mapId, entry, owner) {
  return {
    id: entry.id,
    assetId: `${mapId}:${entry.id}`,
    name: owner?.name || entry.id.replaceAll('_', ' '),
    x: entry.x,
    y: entry.y,
    width: entry.width,
    height: entry.height,
    depthMode: 'row-sliced',
    collisionMask: collisionMask(owner),
    door: doorFor(owner),
    gate: owner?.gate || null,
    interior: owner?.interior || owner?.to || null
  };
}

function makeActor(actor, mapId) {
  const sheet = production.actorSheets[actor.sheet];
  return {
    id: actor.id,
    assetId: `actor:${actor.sheet}`,
    mapId,
    name: actor.id.replaceAll('_', ' '),
    x: actor.x,
    y: actor.y,
    facing: actor.facing || 'down',
    solid: actor.solid !== false,
    condition: actor.condition || null,
    dialogue: actor.dialogue || '',
    path: sheet.path,
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight
  };
}

function makeMap(mapId, mapPackage, layout, type) {
  const interior = type === 'interior';
  const originalTerrain = terrainRows(layout, interior);
  const objects = mapPackage.objects.map(entry => {
    const owner = findOwner(layout, entry);
    return makeObjectInstance(mapId, entry, owner);
  });
  return {
    id: mapId,
    name: layout.displayName,
    type,
    width: layout.size.width,
    height: layout.size.height,
    cellSize: production.cellSize,
    background: mapPackage.base,
    originalTerrain,
    terrain: deepClone(originalTerrain),
    objects,
    actors: (mapPackage.actors || []).map(actor => makeActor(actor, mapId)),
    events: deepClone(layout.events || []),
    connections: deepClone(layout.connections || []),
    cameraReviews: deepClone(layout.cameraReviews || []),
    start: deepClone(layout.start || null),
    exit: deepClone(layout.exit || null)
  };
}

export function createSeedProject() {
  const objectAssets = [];
  const maps = {};
  const campLayout = layouts.maps[production.map.id];
  for (const entry of production.map.objects) {
    objectAssets.push(makeObjectAsset(production.map.id, entry, findOwner(campLayout, entry), 'exterior'));
  }
  maps[production.map.id] = makeMap(production.map.id, production.map, campLayout, 'exterior');

  for (const [mapId, mapPackage] of Object.entries(production.interiors)) {
    const layout = layouts.interiors[mapId];
    for (const entry of mapPackage.objects) {
      objectAssets.push(makeObjectAsset(mapId, entry, findOwner(layout, entry), 'interior'));
    }
    maps[mapId] = makeMap(mapId, mapPackage, layout, 'interior');
  }

  const actorAssets = Object.entries(production.actorSheets).map(([id, sheet]) => ({
    id: `actor:${id}`,
    sourceId: id,
    name: id === 'player' ? 'Player' : id[0].toUpperCase() + id.slice(1),
    category: 'actors',
    path: sheet.path,
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight
  }));

  return {
    schema: PROJECT_SCHEMA,
    revision: 1,
    productionVersion: production.version,
    layoutRevision: production.layoutRevision,
    createdFrom: 'camp-randall-production-pilot',
    activeMapId: production.map.id,
    assets: {objects: objectAssets, actors: actorAssets},
    maps
  };
}

export function validateProject(project) {
  const errors = [];
  const warnings = [];
  if (project.schema !== PROJECT_SCHEMA) errors.push(`Unsupported schema: ${project.schema || 'missing'}`);
  for (const [mapId, map] of Object.entries(project.maps || {})) {
    if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width < 1 || map.height < 1) {
      errors.push(`${mapId}: invalid map dimensions`);
      continue;
    }
    if (!Array.isArray(map.terrain) || map.terrain.length !== map.height || map.terrain.some(row => row.length !== map.width)) {
      errors.push(`${mapId}: terrain must be exactly ${map.width}x${map.height} cells`);
    } else {
      const allowed = map.type === 'exterior' ? new Set(['grass', 'brick', 'stone', 'dirt']) : new Set(['floor']);
      if (map.terrain.some(row => row.some(material => !allowed.has(material)))) {
        errors.push(`${mapId}: terrain contains a material that is invalid for ${map.type} maps`);
      }
    }
    const ids = new Set();
    for (const object of map.objects || []) {
      if (ids.has(object.id)) errors.push(`${mapId}: duplicate object id ${object.id}`);
      ids.add(object.id);
      if (![object.x, object.y, object.width, object.height].every(Number.isInteger)) {
        errors.push(`${mapId}.${object.id}: object geometry is not grid-native`);
      }
      if (object.x < 0 || object.y < 0 || object.x + object.width > map.width || object.y + object.height > map.height) {
        errors.push(`${mapId}.${object.id}: footprint leaves the map`);
      }
      if (!Array.isArray(object.collisionMask) || object.collisionMask.length !== object.height
        || object.collisionMask.some(row => row.length !== object.width || /[^.#]/.test(row))) {
        errors.push(`${mapId}.${object.id}: collision mask must match the object footprint`);
      }
      if (object.door) {
        const inside = object.door.x >= 0 && object.door.y >= 0
          && object.door.x < object.width && object.door.y < object.height;
        if (!inside) errors.push(`${mapId}.${object.id}: door is outside its footprint`);
        else if (object.collisionMask[object.door.y]?.[object.door.x] === '#') {
          errors.push(`${mapId}.${object.id}: door cell is still solid`);
        }
      }
      const asset = project.assets?.objects?.find(entry => entry.id === object.assetId);
      if (asset) {
        for (let y = 0; y < object.height; y += 1) {
          for (let x = 0; x < object.width; x += 1) {
            if (object.collisionMask[y]?.[x] === '#' && asset.defaultCollisionMask[y]?.[x] !== '#') {
              warnings.push(`${mapId}.${object.id}: added solid cell ${x},${y} needs visible-art coverage review`);
            }
          }
        }
      }
    }
    for (const actor of map.actors || []) {
      if (!Number.isInteger(actor.x) || !Number.isInteger(actor.y)
        || actor.x < 0 || actor.y < 0 || actor.x >= map.width || actor.y >= map.height) {
        errors.push(`${mapId}.${actor.id}: actor is off-grid or out of bounds`);
      }
    }
    for (const event of map.events || []) {
      if (!Number.isInteger(event.x) || !Number.isInteger(event.y)
        || event.x < 0 || event.y < 0 || event.x >= map.width || event.y >= map.height) {
        errors.push(`${mapId}.${event.id}: event is off-grid or out of bounds`);
      }
    }
    for (const object of map.objects || []) {
      const asset = project.assets?.objects?.find(entry => entry.id === object.assetId);
      if (asset && asset.minimumCoverage < 0.55) {
        warnings.push(`${mapId}.${object.id}: source art does not visibly fill every default solid cell`);
      }
    }
  }
  return {errors, warnings, valid: errors.length === 0};
}

export function cloneProject(project) {
  return deepClone(project);
}
