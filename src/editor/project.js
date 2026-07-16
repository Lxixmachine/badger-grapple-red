import layouts from '../data/seasonOneLayouts.json';
import production from '../data/campRandallProductionBuild.json';
import metatileBuild from '../data/campRandallMetatileBuild.json';
import {mapPolish} from '../data/seasonOneMapPolish.js';

export const PROJECT_SCHEMA = 'badger-grapple-map-pack/v2';
export const TERRAIN = {
  grass: {label: 'Grass', color: '#8ac9a5'},
  brick: {label: 'Campus Pavers', color: '#ded3b5'},
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
    interior: owner?.interior || owner?.to || null,
    kind: owner?.kind || null,
    inspectable: owner?.inspectable === true || owner?.kind === 'route_landmark'
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

const terrainTileIds = new Set((metatileBuild.terrain.catalog || []).map(tile => tile.id));
const productionCampObjectIds = new Set(production.map.objects.map(object => object.id));

function terrainBlobId(material, materialGrid, x, y) {
  const matches = (dx, dy) => materialGrid[y + dy]?.[x + dx] === material;
  const neighbors = [
    ['n', 0, -1],
    ['e', 1, 0],
    ['s', 0, 1],
    ['w', -1, 0],
    ['ne', 1, -1],
    ['se', 1, 1],
    ['sw', -1, 1],
    ['nw', -1, -1]
  ].filter(([, dx, dy]) => matches(dx, dy)).map(([name]) => name);
  const suffix = neighbors.length ? neighbors.join('_') : 'isolated';
  const family = {
    brick: 'surface_brick',
    stone: 'surface_stone',
    concrete: 'surface_concrete',
    dirt: 'surface_dirt',
    gravel: 'surface_gravel',
    sand: 'surface_sand',
    timber: 'surface_timber',
    mowed_grass: 'lawn_mowed',
    water: 'shore_water',
    asphalt: 'road_asphalt_grass'
  }[material] || `surface_${material}`;
  const candidate = `${family}_blob_${suffix}`;
  return terrainTileIds.has(candidate) ? candidate : material;
}

function campGridTerrain(layout) {
  if (layout.terrainOverride) return deepClone(layout.terrainOverride);
  const {width, height} = layout.size;
  const materials = Array.from({length: height}, () => Array(width).fill('grass'));
  const paint = (material, x, y, paintWidth, paintHeight) => {
    for (let row = y; row < y + paintHeight; row += 1) {
      for (let column = x; column < x + paintWidth; column += 1) {
        if (materials[row]?.[column] !== undefined) materials[row][column] = material;
      }
    }
  };

  for (const path of layout.paths || []) {
    paint(path.material, path.x, path.y, path.width, path.height);
  }

  return materials.map((row, y) => row.map((material, x) => {
    if (material !== 'grass') return terrainBlobId(material, materials, x, y);
    const variation = (x * 17 + y * 29) % 31;
    if (variation === 7) return 'grass_b';
    if (variation === 19) return 'grass_c';
    return 'grass';
  }));
}

function campGridObject(id, stampId, x, y, extra = {}) {
  const stamp = metatileBuild.stamps[stampId];
  if (!stamp) throw new Error(`Camp Randall grid object ${id}: missing stamp ${stampId}`);
  return {
    id,
    assetId: productionCampObjectIds.has(stampId)
      ? `${production.map.id}:${stampId}`
      : `world:${stampId}`,
    sourceId: stampId,
    sourceKind: productionCampObjectIds.has(stampId) ? 'planned-metatile' : 'metatile',
    name: extra.name || stamp.name || id.replaceAll('_', ' '),
    x,
    y,
    width: stamp.width,
    height: stamp.height,
    depthMode: extra.depthMode || 'owner',
    collisionMask: [...stamp.collisionMask],
    door: stamp.door ? {...stamp.door} : null,
    metatiles: deepClone(stamp.cells),
    gate: extra.gate || null,
    interior: extra.interior || null
  };
}

function createCampRandallGridMap() {
  const layout = layouts.maps.camp_randall;
  const {width, height} = layout.size;
  const stadium = layout.landmarks.find(owner => owner.id === 'camp_randall_stadium');
  const teamBuilding = layout.buildings.find(owner => owner.id === 'team_building');
  const coachOffice = layout.buildings.find(owner => owner.id === 'coach_office');
  const memoryGardenWest = layout.blockers.find(owner => owner.id === 'memory_garden_west');
  const memoryGardenEast = layout.blockers.find(owner => owner.id === 'memory_garden_east');
  const terrain = deepClone(metatileBuild.map.terrain || campGridTerrain(layout));
  const objects = [
    campGridObject(stadium.id, 'camp_randall_stadium', stadium.x, stadium.y, {
      name: stadium.name,
      interior: stadium.interior,
      gate: stadium.gate
    }),
    campGridObject(teamBuilding.id, 'team_building', teamBuilding.x, teamBuilding.y, {
      name: teamBuilding.name,
      interior: teamBuilding.interior
    }),
    campGridObject(coachOffice.id, 'coach_office', coachOffice.x, coachOffice.y, {
      name: coachOffice.name,
      interior: coachOffice.interior
    })
  ];

  const defaultDecorations = [
    {id: memoryGardenWest.id, stamp: memoryGardenWest.id, x: memoryGardenWest.x, y: memoryGardenWest.y, depthMode: 'row-sliced'},
    {id: memoryGardenEast.id, stamp: memoryGardenEast.id, x: memoryGardenEast.x, y: memoryGardenEast.y, depthMode: 'row-sliced'},
    ...(layout.decorations || [])
  ];
  if (!metatileBuild.patchesAuthoritative) {
    for (const decoration of defaultDecorations) {
      objects.push(campGridObject(
        decoration.id,
        decoration.stamp,
        decoration.x,
        decoration.y,
        {name: decoration.name, depthMode: decoration.depthMode}
      ));
    }
  }
  for (const patch of metatileBuild.patches || []) {
    const instance = {
      ...deepClone(patch),
      assetId: null,
      sourceId: patch.id,
      sourceKind: 'metatile',
      metatiles: deepClone(patch.cells)
    };
    delete instance.cells;
    const index = objects.findIndex(object => object.id === patch.id);
    if (index === -1) objects.push(instance);
    else objects[index] = instance;
  }

  return {
    id: 'camp_randall',
    name: layout.displayName,
    type: 'exterior',
    width,
    height,
    cellSize: metatileBuild.cellSize,
    renderModel: 'metatile',
    background: null,
    metatileAtlas: deepClone(metatileBuild.atlas),
    terrainTiles: deepClone(metatileBuild.terrain.tiles),
    originalTerrain: deepClone(terrain),
    terrain,
    objects,
    actors: (layout.actors || []).map(actor => makeActor(actor, 'camp_randall')),
    events: deepClone(layout.events),
    waterRoutes: [],
    connections: deepClone(layout.connections),
    cameraReviews: deepClone(layout.cameraReviews),
    start: deepClone(layout.start),
    exit: null,
    gridAuthority: layout.gridAuthority
  };
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

const DEDICATED_FIXTURE_STAMPS = {
  funk_mat: 'outdoor_wrestling_mat',
  competition_mat: 'field_house_competition_mat',
  rotunda: 'capitol_exhibition_mat',
  conference_mat: 'kohl_conference_mat',
  nationals_mat: 'nationals_championship_mat',
  fire_circle: 'picnic_fire_circle',
  west_seating: 'airport_departure_seats',
  east_seating: 'airport_departure_seats',
  departure_gate: 'airport_gate_desk',
  recovery_counter: 'recovery_counter',
  treatment_bench: 'recovery_counter',
  shop_counter: 'gear_shop_counter',
  singlet_wall: 'singlet_shelf',
  supply_wall: 'singlet_shelf',
  kayak_rack: 'kayak_rack',
  bracket_board: 'tournament_bracket_board',
  bracket_desk: 'tournament_bracket_board',
  trophy_case_west: 'championship_trophy_case',
  trophy_case_east: 'championship_trophy_case'
};

function sourceStampId(owner, group, layout) {
  const id = owner.id || '';
  if (DEDICATED_FIXTURE_STAMPS[id]) return DEDICATED_FIXTURE_STAMPS[id];
  const dedicatedLandmarks = {
    field_house_arena: 'field_house_arena_exterior',
    field_house_arch: 'field_house_entry_arch',
    kohl_arena: 'kohl_arena_exterior',
    nationals_arena: 'nationals_arena_exterior',
    bascom_hall: 'bascom_hall_exterior',
    abe_statue: 'bascom_lincoln_statue',
    memorial_terrace: 'bascom_memorial_balustrade',
    history_marker: 'bascom_history_marker',
    wisconsin_capitol: 'wisconsin_capitol_exterior',
    brittingham_boats: 'brittingham_boats_exterior',
    gateway_arch: 'gateway_arch_landmark'
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
    object: {
      ...makeObjectInstance(mapId, entry, effectiveOwner, stamp),
      sourceId: sourceStamp.id,
      sourceKind: 'planned-metatile'
    }
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
  for (const decoration of layout.decorations || []) {
    const sourceStamp = metatileBuild.stamps[decoration.stamp];
    if (!sourceStamp) throw new Error(`${mapId}.${decoration.id}: missing layout stamp ${decoration.stamp}`);
    const owner = {
      ...decoration,
      kind: decoration.kind || 'decoration',
      editorStampId: decoration.stamp,
      width: decoration.width || sourceStamp.width,
      height: decoration.height || sourceStamp.height
    };
    const built = plannedObject(mapId, owner, 'decorations', layout);
    objectAssets.push(built.asset);
    objects.push(built.object);
  }
  const polish = mapPolish(mapId);
  for (const owner of polish.objects || []) {
    const built = plannedObject(mapId, owner, 'decorations', layout);
    objectAssets.push(built.asset);
    objects.push(built.object);
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
    actors: [...(layout.actors || []), ...(polish.actors || [])].map(actor => makeActor(actor, mapId)),
    events: deepClone([...(layout.events || []), ...(polish.events || [])]),
    waterRoutes: deepClone((layout.paths || []).filter(path => path.material === 'water_lane')),
    connections: deepClone(layout.connections || []),
    cameraReviews: deepClone(layout.cameraReviews || []),
    start: deepClone(layout.start || null),
    exit: null,
    gridAuthority: layout.gridAuthority || 'metatile-behavior-v1'
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
      if (DEDICATED_FIXTURE_STAMPS[fixture.id]) add(fixture);
    } else {
      add(fixture);
    }
  }
  const polish = mapPolish(mapId);
  for (const owner of polish.objects || []) add(owner, 'decorations');
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
    actors: [...(layout.actors || []), ...(polish.actors || [])].map(actor => makeActor(actor, mapId)),
    events: deepClone([...(layout.events || []), ...(polish.events || [])]),
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
    patrol: deepClone(actor.patrol || null),
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
  // Map Studio and the game consume this same grid-owned Camp Randall map.
  maps[production.map.id] = createCampRandallGridMap();

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
    groundSystem: deepClone(metatileBuild.groundSystem),
    groundMaterialMetrics: deepClone(metatileBuild.groundMaterialMetrics),
    groundValueContract: deepClone(metatileBuild.groundValueContract),
    visualHierarchyMetrics: deepClone(metatileBuild.visualHierarchyMetrics),
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
  const groundBehavior = new Map((project.assets?.groundTiles || []).map(tile => [tile.id, tile.behavior]));
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
      if (event.kind && event.kind !== 'message') {
        errors.push(`${mapId}.${event.id}: unknown event kind "${event.kind}"`);
      }
      if (event.kind === 'message' && !event.text) {
        warnings.push(`${mapId}.${event.id}: message event has no text and will do nothing in game`);
      }
    }
    for (const object of map.objects || []) {
      if (object.interior && !project.maps?.[object.interior]) {
        errors.push(`${mapId}.${object.id}: door destination "${object.interior}" is not a map in this project`);
      }
      if (object.interior && project.maps?.[object.interior] && !object.door) {
        warnings.push(`${mapId}.${object.id}: has a destination but no door cell; the whole non-solid footprint will warp`);
      }
    }
    for (const object of map.objects || []) {
      const asset = project.assets?.objects?.find(entry => entry.id === object.assetId);
      if (asset && asset.minimumCoverage < 0.55) {
        warnings.push(`${mapId}.${object.id}: source art does not visibly fill every default solid cell`);
      }
    }

    const inBounds = (x, y) => Number.isInteger(x) && Number.isInteger(y)
      && x >= 0 && y >= 0 && x < map.width && y < map.height;
    const blockedByObject = (x, y) => (map.objects || []).some(object => {
      if (x < object.x || y < object.y || x >= object.x + object.width || y >= object.y + object.height) return false;
      return object.collisionMask?.[y - object.y]?.[x - object.x] === '#';
    });
    const inWaterRoute = (x, y) => (map.waterRoutes || []).some(route => x >= route.x && y >= route.y
      && x < route.x + route.width && y < route.y + route.height);
    const passable = (x, y) => inBounds(x, y)
      && (groundBehavior.get(map.terrain?.[y]?.[x]) !== 'water' || inWaterRoute(x, y))
      && !blockedByObject(x, y);
    const requestedStart = map.start || (map.exit
      ? {x: map.exit.x, y: Math.max(0, map.exit.y - 1)}
      : {x: Math.floor(map.width / 2), y: Math.max(0, map.height - 2)});
    const reachable = new Set();
    if (passable(requestedStart.x, requestedStart.y)) {
      reachable.add(`${requestedStart.x},${requestedStart.y}`);
      const queue = [[requestedStart.x, requestedStart.y]];
      while (queue.length) {
        const [x, y] = queue.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          const key = `${nx},${ny}`;
          if (reachable.has(key) || !passable(nx, ny)) continue;
          reachable.add(key);
          queue.push([nx, ny]);
        }
      }
    } else {
      errors.push(`${mapId}: live spawn cell ${requestedStart.x},${requestedStart.y} is blocked`);
    }
    const reachableOrAdjacent = (x, y) => reachable.has(`${x},${y}`)
      || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reachable.has(`${x + dx},${y + dy}`));
    for (const object of map.objects || []) {
      if (!object.interior || !object.door) continue;
      const x = object.x + object.door.x;
      const y = object.y + object.door.y;
      if (!reachable.has(`${x},${y}`)) errors.push(`${mapId}.${object.id}: live doorway is unreachable`);
    }
    if (map.exit && !reachable.has(`${map.exit.x},${map.exit.y}`)) {
      errors.push(`${mapId}: live exit is unreachable`);
    }
    const EDGES = ['north', 'south', 'east', 'west'];
    const edgeLength = (dims, edge) => (edge === 'north' || edge === 'south' ? dims.width : dims.height);
    for (const connection of map.connections || []) {
      const target = project.maps?.[connection.to];
      let structural = true;
      if (!EDGES.includes(connection.edge) || !EDGES.includes(connection.toEdge)) {
        errors.push(`${mapId}: connection to ${connection.to} has an invalid edge`);
        structural = false;
      }
      if (!Number.isInteger(connection.start) || !Number.isInteger(connection.span)
        || connection.start < 0 || connection.span < 1 || !Number.isInteger(connection.toStart) || connection.toStart < 0) {
        errors.push(`${mapId}: connection to ${connection.to} has non-grid start/span values`);
        structural = false;
      }
      if (!target || target.type !== 'exterior') {
        errors.push(`${mapId}: connection target "${connection.to}" is not an exterior map`);
        structural = false;
      }
      if (!structural) continue;
      if (connection.start + connection.span > edgeLength(map, connection.edge)) {
        errors.push(`${mapId}: connection to ${connection.to} overruns the ${connection.edge} edge`);
        continue;
      }
      if (connection.toStart + connection.span > edgeLength(target, connection.toEdge)) {
        errors.push(`${mapId}: connection to ${connection.to} overruns the target's ${connection.toEdge} edge`);
        continue;
      }
      const cells = Array.from({length: connection.span}, (_, offset) => connection.edge === 'north'
        ? [connection.start + offset, 0]
        : connection.edge === 'south'
          ? [connection.start + offset, map.height - 1]
          : connection.edge === 'west'
            ? [0, connection.start + offset]
            : [map.width - 1, connection.start + offset]);
      if (!cells.some(([x, y]) => reachable.has(`${x},${y}`))) {
        errors.push(`${mapId}: live connection to ${connection.to} is unreachable`);
      }
    }
    for (const actor of map.actors || []) {
      if (!inBounds(actor.x, actor.y)) continue;
      if (!passable(actor.x, actor.y)) errors.push(`${mapId}.${actor.id}: actor stands on blocked art`);
      else if (!reachableOrAdjacent(actor.x, actor.y)) errors.push(`${mapId}.${actor.id}: actor cannot be approached`);
    }
    for (const event of map.events || []) {
      if (inBounds(event.x, event.y) && !reachableOrAdjacent(event.x, event.y)) {
        errors.push(`${mapId}.${event.id}: event cannot be reached or approached`);
      }
    }
  }
  return {errors, warnings, valid: errors.length === 0};
}

export function cloneProject(project) {
  return deepClone(project);
}
