const pointInBounds = (map, x, y) => Number.isInteger(x) && Number.isInteger(y)
  && x >= 0 && y >= 0 && x < map.size.width && y < map.size.height;

const rectInBounds = (map, rect) => Number.isInteger(rect.x) && Number.isInteger(rect.y)
  && Number.isInteger(rect.width) && Number.isInteger(rect.height)
  && rect.width > 0 && rect.height > 0
  && rect.x >= 0 && rect.y >= 0
  && rect.x + rect.width <= map.size.width
  && rect.y + rect.height <= map.size.height;

const inRect = (x, y, rect) => x >= rect.x && y >= rect.y
  && x < rect.x + rect.width && y < rect.y + rect.height;

const connectionContains = (map, connection, x, y) => {
  if (connection.edge === 'north') return y === 0 && x >= connection.start && x < connection.start + connection.span;
  if (connection.edge === 'south') return y === map.size.height - 1 && x >= connection.start && x < connection.start + connection.span;
  if (connection.edge === 'west') return x === 0 && y >= connection.start && y < connection.start + connection.span;
  if (connection.edge === 'east') return x === map.size.width - 1 && y >= connection.start && y < connection.start + connection.span;
  return false;
};

const doorAt = (entry, x, y) => entry.door?.x === x && entry.door?.y === y;

function passable(map, x, y) {
  if (!pointInBounds(map, x, y)) return false;
  if ((map.connections || []).some(connection => connectionContains(map, connection, x, y))) return true;
  if ((map.buildings || []).some(entry => doorAt(entry, x, y))) return true;
  if ((map.landmarks || []).some(entry => doorAt(entry, x, y))) return true;

  const blockers = map.blockers || [];
  if (blockers.some(rect => inRect(x, y, rect))) return false;
  if ((map.buildings || []).some(rect => inRect(x, y, rect))) return false;
  if ((map.landmarks || []).some(rect => !rect.walkable && inRect(x, y, rect))) return false;

  if (map.walkableMode === 'open') return true;
  return (map.paths || []).some(rect => inRect(x, y, rect))
    || (map.clearings || []).some(rect => inRect(x, y, rect))
    || (map.landmarks || []).some(rect => rect.walkable && inRect(x, y, rect));
}

function reachableCells(map) {
  const start = map.start;
  if (!passable(map, start.x, start.y)) return new Set();
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [[start.x, start.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !passable(map, nx, ny)) continue;
      seen.add(key);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

function opposite(edge) {
  return {north: 'south', south: 'north', west: 'east', east: 'west'}[edge];
}

function axisOrigin(map, edge) {
  return edge === 'north' || edge === 'south' ? map.origin.x : map.origin.y;
}

function boundaryCoordinate(map, edge) {
  if (edge === 'north') return map.origin.y;
  if (edge === 'south') return map.origin.y + map.size.height;
  if (edge === 'west') return map.origin.x;
  return map.origin.x + map.size.width;
}

function overlaps(a, b) {
  return a.origin.x < b.origin.x + b.size.width
    && a.origin.x + a.size.width > b.origin.x
    && a.origin.y < b.origin.y + b.size.height
    && a.origin.y + a.size.height > b.origin.y;
}

export function validateSeasonOneLayouts(region, layouts) {
  const errors = [];
  const maps = layouts.maps || {};
  const interiors = layouts.interiors || {};
  const contract = layouts.contract || {};
  const requiredIds = Object.keys(region.nodes || {});

  if (layouts.schemaVersion !== 1 || layouts.status !== 'pre-art-blockout') {
    errors.push('Season One layouts must use schemaVersion 1 and pre-art-blockout status');
  }
  if (contract.cellSize !== region.tileSize
    || contract.canvasWidth !== region.camera?.canvasWidth
    || contract.canvasHeight !== region.camera?.canvasHeight
    || contract.cameraCellsWide !== region.camera?.outdoorTilesWide
    || contract.cameraCellsHigh !== region.camera?.outdoorTilesHigh) {
    errors.push('Season One layout contract diverges from region camera/scale authority');
  }

  for (const id of requiredIds) {
    const node = region.nodes[id];
    if (node.layoutId !== id) errors.push(`Season One node '${id}' must point to its stable layout id`);
    if (!maps[id]) errors.push(`Season One layout map '${id}' is missing`);
    if (node.readyForFinalArt) errors.push(`Season One node '${id}' cannot enter final art while atlas status is pre-art-blockout`);
  }
  for (const id of Object.keys(maps)) {
    if (!region.nodes[id]) errors.push(`Season One layout '${id}' has no region node`);
  }

  const referencedInteriors = new Set();
  for (const [id, map] of Object.entries(maps)) {
    if (!map.displayName || !map.kind || !map.size || !map.start || !map.walkableMode) {
      errors.push(`Layout '${id}' is missing identity, size, start, or walkableMode`);
      continue;
    }
    if (!Number.isInteger(map.size.width) || !Number.isInteger(map.size.height)
      || map.size.width < 15 || map.size.height < 10) {
      errors.push(`Layout '${id}' must be at least one 15x10 camera window`);
    }
    if (!pointInBounds(map, map.start.x, map.start.y)) errors.push(`Layout '${id}' start is out of bounds`);

    for (const group of ['paths', 'clearings', 'blockers', 'buildings', 'landmarks']) {
      for (const entry of map[group] || []) {
        if (!rectInBounds(map, entry)) errors.push(`Layout '${id}' ${group} '${entry.id}' is out of bounds`);
      }
    }
    for (const building of map.buildings || []) {
      if (building.door && !inRect(building.door.x, building.door.y, building)) {
        errors.push(`Layout '${id}' building '${building.id}' door is outside its footprint`);
      }
      if (building.interior) {
        referencedInteriors.add(building.interior);
        if (!interiors[building.interior]) errors.push(`Layout '${id}' building '${building.id}' references missing interior '${building.interior}'`);
      }
      if (building.kind === 'trainer_room' || building.kind === 'buckys_locker_room') {
        const key = building.kind === 'trainer_room' ? 'trainer_room_exterior' : 'buckys_locker_room_exterior';
        const canonical = layouts.canonicalFootprints?.[key];
        const offset = [building.door.x - building.x, building.door.y - building.y];
        if (!canonical || building.width !== canonical.width || building.height !== canonical.height
          || JSON.stringify(offset) !== JSON.stringify(canonical.doorOffset)
          || building.interior !== canonical.interior) {
          errors.push(`Layout '${id}' service '${building.id}' diverges from canonical '${key}'`);
        }
      }
    }
    for (const landmark of map.landmarks || []) {
      if (landmark.door && !inRect(landmark.door.x, landmark.door.y, landmark)) {
        errors.push(`Layout '${id}' landmark '${landmark.id}' door is outside its footprint`);
      }
      if (landmark.interior) {
        referencedInteriors.add(landmark.interior);
        if (!interiors[landmark.interior]) errors.push(`Layout '${id}' landmark '${landmark.id}' references missing interior '${landmark.interior}'`);
      }
    }

    for (const event of map.events || []) {
      if (!pointInBounds(map, event.x, event.y)) errors.push(`Layout '${id}' event '${event.id}' is out of bounds`);
    }
    for (const review of map.cameraReviews || []) {
      if (review.width !== contract.cameraCellsWide || review.height !== contract.cameraCellsHigh) {
        errors.push(`Layout '${id}' camera review '${review.id}' must be exactly ${contract.cameraCellsWide}x${contract.cameraCellsHigh}`);
      }
      if (!rectInBounds(map, review)) errors.push(`Layout '${id}' camera review '${review.id}' is out of bounds`);
    }

    const reachable = reachableCells(map);
    if (!reachable.size) errors.push(`Layout '${id}' start is blocked`);
    const targets = [
      ...(map.events || []).map(entry => ({label: `event '${entry.id}'`, x: entry.x, y: entry.y})),
      ...(map.buildings || []).filter(entry => entry.door).map(entry => ({label: `door '${entry.id}'`, x: entry.door.x, y: entry.door.y})),
      ...(map.landmarks || []).filter(entry => entry.door).map(entry => ({label: `door '${entry.id}'`, x: entry.door.x, y: entry.door.y}))
    ];
    for (const connection of map.connections || []) {
      if (!['north', 'south', 'west', 'east'].includes(connection.edge) || connection.span !== 2) {
        errors.push(`Layout '${id}' connection to '${connection.to}' must use a cardinal two-cell threshold`);
        continue;
      }
      const first = connection.edge === 'north' || connection.edge === 'south'
        ? {x: connection.start, y: connection.edge === 'north' ? 0 : map.size.height - 1}
        : {x: connection.edge === 'west' ? 0 : map.size.width - 1, y: connection.start};
      targets.push({label: `connection '${connection.to}'`, ...first});
    }
    for (const target of targets) {
      if (!reachable.has(`${target.x},${target.y}`)) errors.push(`Layout '${id}' ${target.label} is unreachable from start`);
    }
  }

  const physicalMaps = Object.entries(maps).filter(([, map]) => map.plane === 'madison');
  for (let i = 0; i < physicalMaps.length; i += 1) {
    const [aId, a] = physicalMaps[i];
    if (!a.origin) errors.push(`Madison layout '${aId}' has no world origin`);
    for (let j = i + 1; j < physicalMaps.length; j += 1) {
      const [bId, b] = physicalMaps[j];
      if (a.origin && b.origin && overlaps(a, b)) errors.push(`Madison layouts '${aId}' and '${bId}' overlap`);
    }
  }

  for (const [id, map] of Object.entries(maps)) {
    for (const connection of map.connections || []) {
      const target = maps[connection.to];
      if (!target) {
        errors.push(`Layout '${id}' connects to missing '${connection.to}'`);
        continue;
      }
      const reciprocal = (target.connections || []).find(entry => entry.to === id);
      if (!reciprocal) {
        errors.push(`Layout connection '${id}' -> '${connection.to}' is not reciprocal`);
        continue;
      }
      if (connection.toEdge !== opposite(connection.edge)
        || reciprocal.edge !== connection.toEdge
        || reciprocal.toEdge !== connection.edge
        || reciprocal.start !== connection.toStart
        || reciprocal.toStart !== connection.start
        || reciprocal.span !== connection.span) {
        errors.push(`Layout connection '${id}' <-> '${connection.to}' has mismatched edge metadata`);
      }
      if (map.origin && target.origin) {
        const sourceAxis = axisOrigin(map, connection.edge) + connection.start;
        const targetAxis = axisOrigin(target, connection.toEdge) + connection.toStart;
        if (sourceAxis !== targetAxis || boundaryCoordinate(map, connection.edge) !== boundaryCoordinate(target, connection.toEdge)) {
          errors.push(`Layout connection '${id}' <-> '${connection.to}' does not align on the world plane`);
        }
      }
    }
  }

  const canonicalServices = ['trainer_room', 'buckys_locker_room'];
  for (const [id, node] of Object.entries(region.nodes || {})) {
    if (node.kind !== 'town') continue;
    const kinds = (maps[id]?.buildings || []).map(entry => entry.kind);
    for (const service of canonicalServices) {
      if (!kinds.includes(service)) errors.push(`Town layout '${id}' is missing canonical service '${service}'`);
    }
  }

  for (const [id, interior] of Object.entries(interiors)) {
    if (!interior.displayName || !interior.size || !interior.exit) errors.push(`Interior '${id}' is missing identity, size, or exit`);
    if (!pointInBounds(interior, interior.exit.x, interior.exit.y)) errors.push(`Interior '${id}' exit is out of bounds`);
    for (const fixture of interior.fixtures || []) {
      if (!rectInBounds(interior, fixture)) errors.push(`Interior '${id}' fixture '${fixture.id}' is out of bounds`);
      if (fixture.to) referencedInteriors.add(fixture.to);
    }
    for (const event of interior.events || []) {
      if (!pointInBounds(interior, event.x, event.y)) errors.push(`Interior '${id}' event '${event.id}' is out of bounds`);
    }
  }
  for (const id of referencedInteriors) if (!interiors[id]) errors.push(`Referenced interior '${id}' is missing`);
  for (const id of Object.keys(interiors)) if (!referencedInteriors.has(id)) errors.push(`Interior '${id}' is orphaned from every exterior or interior connection`);

  const reviewOrder = layouts.region?.reviewOrder || [];
  if (JSON.stringify(reviewOrder) !== JSON.stringify(requiredIds)) {
    errors.push('Region review order must cover each Season One node exactly once in authority order');
  }
  for (const transition of layouts.region?.transitions || []) {
    if (!maps[transition.from] || !maps[transition.to]) errors.push(`Atlas transition '${transition.from}' -> '${transition.to}' references a missing map`);
  }

  return errors;
}
