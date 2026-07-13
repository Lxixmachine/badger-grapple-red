import layouts from '../data/seasonOneLayouts.json';
import production from '../data/campRandallProductionBuild.json';
import metatileBuild from '../data/campRandallMetatileBuild.json';

export const PROJECT_SCHEMA = 'badger-grapple-map-pack/v2';
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

function makeObjectAsset(mapId, entry, owner, mapType, stamp = null) {
  return {
    id: `${mapId}:${entry.id}`,
    sourceId: entry.id,
    mapId,
    name: owner?.name || entry.id.replaceAll('_', ' '),
    category: entry.ownerGroup || 'fixtures',
    mapType,
    path: entry.path,
    width: entry.width,
    height: entry.height,
    defaultCollisionMask: collisionMask(owner),
    defaultDoor: doorFor(owner),
    metatiles: stamp ? deepClone(stamp.cells) : null,
    minimumCoverage: entry.audit?.minimumCoverage ?? 1
  };
}

function makeObjectInstance(mapId, entry, owner, stamp = null) {
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
    metatiles: stamp ? deepClone(stamp.cells) : null,
    gate: owner?.gate || null,
    interior: owner?.interior || owner?.to || null
  };
}

function makeWorldStampAsset(stamp) {
  return {
    id: `world:${stamp.id}`,
    sourceId: stamp.id,
    sourceKind: 'metatile',
    name: stamp.name,
    category: stamp.category,
    mapType: 'exterior',
    path: stamp.thumbnail,
    width: stamp.width,
    height: stamp.height,
    defaultCollisionMask: [...stamp.collisionMask],
    defaultDoor: stamp.door ? {...stamp.door} : null,
    metatiles: deepClone(stamp.cells),
    minimumCoverage: 1
  };
}

const metatileById = new Map(Object.entries(metatileBuild.metatiles));
const behaviorVariants = new Map();
for (const [tileId, tile] of metatileById) {
  behaviorVariants.set(`${tile.visual}:${tile.behavior}`, tileId);
}

function behaviorVariant(tileId, behavior) {
  const tile = metatileById.get(tileId);
  return tile ? behaviorVariants.get(`${tile.visual}:${behavior}`) || tileId : tileId;
}

function sampleIndex(index, targetSize, sourceSize) {
  if (sourceSize <= 1 || targetSize <= 1) return Math.floor((sourceSize - 1) / 2);
  if (targetSize <= sourceSize) return Math.round(index * (sourceSize - 1) / (targetSize - 1));
  if (index === 0) return 0;
  if (index === targetSize - 1) return sourceSize - 1;
  if (sourceSize <= 2) return index % sourceSize;
  return 1 + ((index - 1) % (sourceSize - 2));
}

function resizeStampCells(stamp, width, height) {
  return Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => {
    const sourceY = sampleIndex(y, height, stamp.height);
    const sourceX = sampleIndex(x, width, stamp.width);
    return stamp.cells[sourceY][sourceX];
  }));
}

function stampForOwner(sourceStamp, owner) {
  const mask = collisionMask(owner);
  const door = doorFor(owner);
  const cells = resizeStampCells(sourceStamp, owner.width, owner.height).map((row, y) => row.map((tileId, x) => {
    const behavior = door?.x === x && door?.y === y ? 'warp' : mask[y][x] === '#' ? 'solid' : 'walkable';
    return behaviorVariant(tileId, behavior);
  }));
  return {...sourceStamp, width: owner.width, height: owner.height, cells};
}

function forestStamp(owner, mapWidth, mapHeight) {
  if (owner.width <= 2 && owner.height > owner.width) {
    return owner.x < mapWidth / 2 ? 'forest_edge_west' : 'forest_edge_east';
  }
  if (owner.height <= 2 && owner.width > owner.height) {
    return owner.y < mapHeight / 2 ? 'forest_edge_north' : 'forest_edge_south';
  }
  return 'forest_mass_core';
}

function sourceStampId(owner, group, layout) {
  const id = owner.id || '';
  const dedicatedLandmarks = {
    field_house_arena: 'field_house_arena_exterior',
    kohl_arena: 'kohl_arena_exterior',
    nationals_arena: 'nationals_arena_exterior',
    bascom_hall: 'bascom_hall_exterior',
    wisconsin_capitol: 'wisconsin_capitol_exterior',
    brittingham_boats: 'brittingham_boats_exterior'
  };
  if (dedicatedLandmarks[id]) return dedicatedLandmarks[id];
  const dedicatedOrdinaryBuildings = {
    equipment_annex: 'equipment_annex_exterior',
    campus_housing: 'campus_housing_exterior',
    bookstore_row: 'bookstore_row_exterior',
    theater_marquee: 'theater_marquee_exterior',
    food_cart_row: 'food_cart_row_exterior',
    capitol_hotel: 'capitol_hotel_exterior',
    civic_offices: 'civic_offices_exterior',
    transit_hotel: 'transit_hotel_exterior',
    team_hotel: 'team_hotel_exterior',
    riverfront_hotel: 'riverfront_hotel_exterior',
    north_storefront_west: 'state_facade_11x5',
    north_storefront_mid: 'state_facade_10x3',
    north_storefront_east: 'state_facade_13x5',
    north_terminal_block: 'state_facade_8x5',
    south_storefront_west: 'state_facade_8x5',
    south_storefront_mid_left: 'state_facade_8x4',
    south_storefront_mid_right: 'state_facade_10x5',
    south_storefront_east: 'state_facade_5x5'
  };
  if (dedicatedOrdinaryBuildings[id]) return dedicatedOrdinaryBuildings[id];
  if (owner.kind === 'city') {
    return owner.width > owner.height ? 'city_edge_horizontal' : 'city_edge_vertical';
  }
  if (owner.editorStampId && metatileBuild.stamps[owner.editorStampId]) return owner.editorStampId;
  if (id.includes('trainer_room')) return 'trainer_room_exterior';
  if (id.includes('buckys')) return 'buckys_locker_room_exterior';
  if (id.includes('locker') || id.includes('singlet') || id.includes('supply')) return 'wall_brick_wide';
  if (id.includes('bench') || id.includes('tables')) return 'wood_bench';
  if (id.includes('board')) return 'blank_plaque';
  if (id.includes('counter') || id.includes('desk') || id.includes('gallery')) return 'storefront_wide';
  if (id.includes('rack')) return 'fence_long';
  if (id.includes('statue') || id.includes('marker')) return 'campus_sign';
  if (id.includes('wall')) return 'wall_brick_wide';

  const byKind = {
    home: 'team_building',
    story: 'campus_house_exterior',
    closed_building: 'campus_house_exterior',
    trainer_room: 'trainer_room_exterior',
    buckys_locker_room: 'buckys_locker_room_exterior',
    arena: 'camp_randall_stadium',
    storefront: 'storefront_wide',
    city: 'storefront_wide',
    hedge: 'hedge_horizontal',
    shrub: 'shrub_round',
    cliff: 'cliff_run',
    fence: 'fence_long',
    seating: 'wood_bench',
    x_factor: owner.width >= 5 ? 'camp_randall_stadium' : 'campus_sign',
    decision_required: 'campus_house_exterior',
    route_landmark: 'campus_sign'
  };
  if (owner.kind === 'forest' || owner.kind === 'forest_mass') {
    return forestStamp(owner, layout.size.width, layout.size.height);
  }
  return byKind[owner.kind] || (group === 'buildings' ? 'campus_house_exterior' : 'wall_limestone_wide');
}

function plannedObject(mapId, owner, group, layout, mapType = 'exterior') {
  const sourceStamp = metatileBuild.stamps[sourceStampId(owner, group, layout)];
  if (!sourceStamp) throw new Error(`${mapId}.${owner.id}: missing source stamp`);
  const matchingDoorContract = (!owner.door && !sourceStamp.door) || (owner.door && sourceStamp.door);
  const inheritsSourceMask = !owner.collisionMask && !owner.walkable && matchingDoorContract
    && sourceStamp.width === owner.width && sourceStamp.height === owner.height;
  const effectiveOwner = inheritsSourceMask
    ? {...owner, collisionMask: [...sourceStamp.collisionMask]}
    : owner;
  const stamp = stampForOwner(sourceStamp, effectiveOwner);
  const entry = {
    id: owner.id,
    ownerGroup: group,
    path: sourceStamp.thumbnail,
    x: owner.x,
    y: owner.y,
    width: owner.width,
    height: owner.height,
    audit: {minimumCoverage: 1}
  };
  return {
    asset: makeObjectAsset(mapId, entry, effectiveOwner, mapType, stamp),
    object: {...makeObjectInstance(mapId, entry, effectiveOwner, stamp), sourceKind: 'planned-metatile'}
  };
}

function plannedExterior(mapId, layout, objectAssets) {
  const objects = [];
  for (const group of ['blockers', 'buildings', 'landmarks']) {
    for (const owner of layout[group] || []) {
      if (['water', 'deep_water'].includes(owner.kind) || owner.walkable) continue;
      const built = plannedObject(mapId, owner, group, layout);
      objectAssets.push(built.asset);
      objects.push(built.object);
    }
  }
  for (const patch of layout.editorObjects || []) objects.push(deepClone(patch));
  const planned = metatileBuild.plannedMaps[mapId];
  return {
    id: mapId,
    name: layout.displayName,
    type: 'exterior',
    width: layout.size.width,
    height: layout.size.height,
    cellSize: production.cellSize,
    renderModel: 'metatile',
    background: null,
    metatileAtlas: deepClone(metatileBuild.atlas),
    terrainTiles: deepClone(metatileBuild.terrain.tiles),
    originalTerrain: deepClone(planned.terrain),
    terrain: deepClone(planned.terrain),
    objects,
    actors: [],
    events: deepClone(layout.events || []),
    connections: deepClone(layout.connections || []),
    cameraReviews: deepClone(layout.cameraReviews || []),
    start: deepClone(layout.start || null),
    exit: null
  };
}

function roomShellOwners(layout) {
  const width = layout.size.width;
  const height = layout.size.height;
  const exitX = layout.exit?.x ?? Math.floor(width / 2);
  return [
    {id: 'room_wall_north', x: 0, y: 0, width, height: 1},
    {id: 'room_wall_west', x: 0, y: 1, width: 1, height: height - 2},
    {id: 'room_wall_east', x: width - 1, y: 1, width: 1, height: height - 2},
    ...(exitX > 0 ? [{id: 'room_wall_south_west', x: 0, y: height - 1, width: exitX, height: 1}] : []),
    ...(exitX < width - 1 ? [{id: 'room_wall_south_east', x: exitX + 1, y: height - 1, width: width - exitX - 1, height: 1}] : [])
  ];
}

function plannedInterior(mapId, layout, objectAssets) {
  const hasTerrainOverride = Boolean(layout.terrainOverride);
  const terrain = hasTerrainOverride
    ? deepClone(layout.terrainOverride)
    : Array.from({length: layout.size.height}, () => Array(layout.size.width).fill('stone'));
  const objects = [];
  const add = (owner, group = 'fixtures') => {
    const built = plannedObject(mapId, owner, group, layout, 'interior');
    objectAssets.push(built.asset);
    objects.push(built.object);
  };

  if (mapId !== 'stadium_tunnel') {
    for (const owner of roomShellOwners(layout)) add(owner, 'room_shell');
  }
  for (const fixture of layout.fixtures || []) {
    if (fixture.walkable) {
      if (!hasTerrainOverride) {
        const material = fixture.id.includes('lane') ? 'stone' : 'brick';
        for (let y = fixture.y; y < fixture.y + fixture.height; y += 1) {
          for (let x = fixture.x; x < fixture.x + fixture.width; x += 1) terrain[y][x] = material;
        }
      }
    } else {
      add(fixture);
    }
  }
  for (const patch of layout.editorObjects || []) objects.push(deepClone(patch));
  return {
    id: mapId,
    name: layout.displayName,
    type: 'interior',
    width: layout.size.width,
    height: layout.size.height,
    cellSize: production.cellSize,
    renderModel: 'metatile',
    background: null,
    metatileAtlas: deepClone(metatileBuild.atlas),
    terrainTiles: deepClone(metatileBuild.terrain.tiles),
    originalTerrain: deepClone(terrain),
    terrain,
    objects,
    actors: [],
    events: deepClone(layout.events || []),
    connections: [],
    cameraReviews: [],
    start: null,
    exit: deepClone(layout.exit || null)
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
  const usesMetatiles = mapId === metatileBuild.map.id;
  const originalTerrain = usesMetatiles ? deepClone(metatileBuild.map.terrain) : terrainRows(layout, interior);
  const objects = mapPackage.objects.map(entry => {
    const owner = findOwner(layout, entry);
    return makeObjectInstance(mapId, entry, owner, usesMetatiles ? metatileBuild.stamps[entry.id] : null);
  });
  if (usesMetatiles) {
    for (const patch of metatileBuild.patches || []) {
      objects.push({
        ...deepClone(patch),
        assetId: null,
        sourceKind: 'metatile',
        depthMode: patch.depthMode || 'row-sliced',
        gate: patch.gate || null,
        interior: patch.interior || null,
        metatiles: deepClone(patch.cells)
      });
      delete objects.at(-1).cells;
    }
  }
  return {
    id: mapId,
    name: layout.displayName,
    type,
    width: layout.size.width,
    height: layout.size.height,
    cellSize: production.cellSize,
    renderModel: usesMetatiles ? 'metatile' : 'object',
    background: usesMetatiles ? metatileBuild.map.ground : mapPackage.base,
    metatileAtlas: usesMetatiles ? deepClone(metatileBuild.atlas) : null,
    terrainTiles: usesMetatiles ? deepClone(metatileBuild.terrain.tiles) : null,
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
    objectAssets.push(makeObjectAsset(
      production.map.id,
      entry,
      findOwner(campLayout, entry),
      'exterior',
      metatileBuild.stamps[entry.id]
    ));
  }
  const productionStampIds = new Set(production.map.objects.map(entry => entry.id));
  for (const stamp of Object.values(metatileBuild.stamps)) {
    if (!productionStampIds.has(stamp.id) && stamp.tags?.includes('season_one_world_kit')) {
      objectAssets.push(makeWorldStampAsset(stamp));
    }
  }
  maps[production.map.id] = makeMap(production.map.id, production.map, campLayout, 'exterior');

  for (const mapId of layouts.region.reviewOrder) {
    if (mapId === production.map.id) continue;
    maps[mapId] = plannedExterior(mapId, layouts.maps[mapId], objectAssets);
  }

  for (const [mapId, layout] of Object.entries(layouts.interiors)) {
    const mapPackage = production.interiors[mapId];
    if (!mapPackage) {
      maps[mapId] = plannedInterior(mapId, layout, objectAssets);
      continue;
    }
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
    metatileVersion: metatileBuild.version,
    createdFrom: 'season-one-map-studio-atlas',
    activeMapId: production.map.id,
    assets: {
      objects: objectAssets,
      actors: actorAssets,
      groundTiles: (metatileBuild.terrain.catalog || []).map(tile => ({
        ...deepClone(tile),
        atlasPath: metatileBuild.atlas.path,
        atlasColumns: metatileBuild.atlas.columns,
        cellSize: metatileBuild.cellSize
      })),
      groundStamps: Object.values(metatileBuild.terrain.stamps || {}).map(stamp => deepClone(stamp)),
      metatiles: Object.values(metatileBuild.metatiles).map(tile => ({
        ...deepClone(tile),
        atlasPath: metatileBuild.atlas.path,
        atlasColumns: metatileBuild.atlas.columns,
        cellSize: metatileBuild.cellSize,
        palette: metatileBuild.palette.includes(tile.id)
      }))
    },
    maps
  };
}

export function validateProject(project) {
  const errors = [];
  const warnings = [];
  if (project.schema !== PROJECT_SCHEMA) errors.push(`Unsupported schema: ${project.schema || 'missing'}`);
  const metatileLibrary = new Map((project.assets?.metatiles || []).map(tile => [tile.id, tile]));
  const groundLibrary = new Set((project.assets?.groundTiles || []).map(tile => tile.id));
  for (const [mapId, map] of Object.entries(project.maps || {})) {
    if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width < 1 || map.height < 1) {
      errors.push(`${mapId}: invalid map dimensions`);
      continue;
    }
    if (!Array.isArray(map.terrain) || map.terrain.length !== map.height || map.terrain.some(row => row.length !== map.width)) {
      errors.push(`${mapId}: terrain must be exactly ${map.width}x${map.height} cells`);
    } else {
      const allowed = map.renderModel === 'metatile'
        ? groundLibrary
        : map.type === 'exterior' ? new Set(['grass', 'brick', 'stone', 'dirt']) : new Set(['floor']);
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
      if (map.renderModel === 'metatile') {
        if (!Array.isArray(object.metatiles) || object.metatiles.length !== object.height
          || object.metatiles.some(row => !Array.isArray(row) || row.length !== object.width)) {
          errors.push(`${mapId}.${object.id}: metatile stamp must match the object footprint`);
        } else {
          for (let y = 0; y < object.height; y += 1) {
            for (let x = 0; x < object.width; x += 1) {
              const tile = metatileLibrary.get(object.metatiles[y][x]);
              if (!tile) {
                errors.push(`${mapId}.${object.id}: unknown metatile at ${x},${y}`);
                continue;
              }
              const isDoor = object.door?.x === x && object.door?.y === y;
              const expected = isDoor ? 'warp' : object.collisionMask[y][x] === '#' ? 'solid' : 'walkable';
              if (tile.behavior !== expected) {
                errors.push(`${mapId}.${object.id}: metatile behavior at ${x},${y} is ${tile.behavior}, expected ${expected}`);
              }
            }
          }
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
