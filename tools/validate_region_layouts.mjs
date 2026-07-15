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

const blocksAt = (entry, x, y) => {
  if (!inRect(x, y, entry)) return false;
  if (!entry.collisionMask) return true;
  return entry.collisionMask[y - entry.y]?.[x - entry.x] === '#';
};

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
  if (blockers.some(rect => blocksAt(rect, x, y))) return false;
  if ((map.buildings || []).some(rect => blocksAt(rect, x, y))) return false;
  if ((map.landmarks || []).some(rect => !rect.walkable && blocksAt(rect, x, y))) return false;

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

function interiorPassable(interior, x, y) {
  if (!pointInBounds(interior, x, y)) return false;
  if (x === interior.exit.x && y === interior.exit.y) return true;
  if (x === 0 || y === 0 || x === interior.size.width - 1 || y === interior.size.height - 1) {
    return (interior.fixtures || []).some(entry => (entry.to || entry.walkable) && inRect(x, y, entry));
  }
  return !(interior.fixtures || []).some(entry => !entry.to && !entry.walkable && blocksAt(entry, x, y));
}

function reachableInteriorCells(interior) {
  const start = {x: interior.exit.x, y: Math.max(1, interior.exit.y - 1)};
  if (!interiorPassable(interior, start.x, start.y)) return new Set();
  const seen = new Set([`${start.x},${start.y}`]);
  const queue = [[start.x, start.y]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !interiorPassable(interior, nx, ny)) continue;
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

const localOverlaps = (a, b) => a.x < b.x + b.width
  && a.x + a.width > b.x
  && a.y < b.y + b.height
  && a.y + a.height > b.y;

const doorHasAuthoredApproach = (map, door) => [
  ...(map.paths || []),
  ...(map.clearings || [])
].some(entry => inRect(door.x, door.y + 1, entry));

function distanceFromEdge(map, rect, edge) {
  if (edge === 'north') return rect.y;
  if (edge === 'south') return map.size.height - (rect.y + rect.height);
  if (edge === 'west') return rect.x;
  return map.size.width - (rect.x + rect.width);
}

export function validateSeasonOneLayouts(region, layouts) {
  const errors = [];
  const maps = layouts.maps || {};
  const interiors = layouts.interiors || {};
  const contract = layouts.contract || {};
  const requiredIds = Object.keys(region.nodes || {});

  if (layouts.schemaVersion !== 1 || !Number.isInteger(layouts.revision) || layouts.revision < 1
    || layouts.status !== 'pre-art-blockout') {
    errors.push('Season One layouts must use schemaVersion 1, a positive revision, and pre-art-blockout status');
  }
  if (contract.cellSize !== region.tileSize
    || contract.canvasWidth !== region.camera?.canvasWidth
    || contract.canvasHeight !== region.camera?.canvasHeight
    || contract.cameraCellsWide !== region.camera?.outdoorTilesWide
    || contract.cameraCellsHigh !== region.camera?.outdoorTilesHigh) {
    errors.push('Season One layout contract diverges from region camera/scale authority');
  }
  if (!Number.isInteger(contract.majorVenueArrivalBuffer) || contract.majorVenueArrivalBuffer < 6) {
    errors.push('Season One layout contract must reserve at least six cells before a major venue reveal');
  }

  for (const id of requiredIds) {
    const node = region.nodes[id];
    if (node.layoutId !== id) errors.push(`Season One node '${id}' must point to its stable layout id`);
    if (!maps[id]) errors.push(`Season One layout map '${id}' is missing`);
    if (node.readyForFinalArt && region.productionPilot !== id) {
      errors.push(`Season One node '${id}' cannot enter final art before it becomes the declared production pilot`);
    }
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
        if (entry.collisionMask) {
          if (entry.collisionMask.length !== entry.height
            || entry.collisionMask.some(row => row.length !== entry.width || /[^.#]/.test(row))) {
            errors.push(`Layout '${id}' ${group} '${entry.id}' has an invalid collision mask`);
          }
        }
      }
    }
    const structures = [...(map.buildings || []), ...(map.landmarks || [])];
    for (let i = 0; i < structures.length; i += 1) {
      for (let j = i + 1; j < structures.length; j += 1) {
        if (localOverlaps(structures[i], structures[j])) {
          errors.push(`Layout '${id}' structures '${structures[i].id}' and '${structures[j].id}' overlap`);
        }
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
      if (Boolean(building.door) !== Boolean(building.interior)) {
        errors.push(`Layout '${id}' building '${building.id}' must declare both door and interior, or neither`);
      }
      if (building.door && !doorHasAuthoredApproach(map, building.door)) {
        errors.push(`Layout '${id}' building '${building.id}' door has no authored path or clearing`);
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
      if (building.kind === 'arena') {
        const canonical = layouts.canonicalFootprints?.competition_venue_minimum;
        const centeredDoorX = building.x + Math.floor(building.width / 2);
        const southDoorY = building.y + building.height - 1;
        if (!canonical || building.width < canonical.minimumWidth || building.height < canonical.minimumHeight
          || building.door?.x !== centeredDoorX || building.door?.y !== southDoorY) {
          errors.push(`Layout '${id}' arena '${building.id}' violates the competition venue footprint`);
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
      if (Boolean(landmark.door) !== Boolean(landmark.interior)) {
        errors.push(`Layout '${id}' landmark '${landmark.id}' must declare both door and interior, or neither`);
      }
      if (landmark.door && !doorHasAuthoredApproach(map, landmark.door)) {
        errors.push(`Layout '${id}' landmark '${landmark.id}' door has no authored path or clearing`);
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

  if (physicalMaps.length) {
    const minX = Math.min(...physicalMaps.map(([, map]) => map.origin.x));
    const minY = Math.min(...physicalMaps.map(([, map]) => map.origin.y));
    const maxX = Math.max(...physicalMaps.map(([, map]) => map.origin.x + map.size.width));
    const maxY = Math.max(...physicalMaps.map(([, map]) => map.origin.y + map.size.height));
    const computedBounds = {x: minX, y: minY, width: maxX - minX, height: maxY - minY};
    if (JSON.stringify(layouts.region?.madisonBounds) !== JSON.stringify(computedBounds)) {
      errors.push(`Madison bounds must match authored map plane ${JSON.stringify(computedBounds)}`);
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
    const map = maps[id];
    const kinds = (map?.buildings || []).map(entry => entry.kind);
    for (const service of canonicalServices) {
      if (!kinds.includes(service)) errors.push(`Town layout '${id}' is missing canonical service '${service}'`);
    }
    const structures = [...(map?.buildings || []), ...(map?.landmarks || [])];
    if (map && map.size.width * map.size.height < 1000) errors.push(`Town layout '${id}' is too compressed for the approved city scale`);
    if (structures.length < 5) errors.push(`Town layout '${id}' needs at least five structures to read as a neighborhood`);
    if ((map?.cameraReviews || []).length < 7) errors.push(`Town layout '${id}' needs at least seven authored camera compositions`);
    const serviceDoors = (map?.buildings || []).filter(entry => canonicalServices.includes(entry.kind)).map(entry => entry.door);
    if (serviceDoors.length === 2) {
      const distance = Math.abs(serviceDoors[0].x - serviceDoors[1].x) + Math.abs(serviceDoors[0].y - serviceDoors[1].y);
      if (distance < 18) errors.push(`Town layout '${id}' canonical services are compressed into one service row`);
    }
    const arenas = (map?.buildings || []).filter(entry => entry.kind === 'arena');
    for (const connection of map?.connections || []) {
      for (const arena of arenas) {
        if (distanceFromEdge(map, arena, connection.edge) < contract.majorVenueArrivalBuffer) {
          errors.push(`Town layout '${id}' arena '${arena.id}' overwhelms the '${connection.edge}' arrival sequence`);
        }
      }
    }
  }
  if (maps.camp_randall?.size.width !== 48 || maps.camp_randall?.size.height !== 31
    || (maps.camp_randall?.cameraReviews || []).length < 4) {
    errors.push('Camp Randall must retain the approved 48x31 grid-owned campus scale and four camera compositions');
  }
  if (maps.state_street?.size.width < 40 || maps.state_street?.size.height < 18
    || [...(maps.state_street?.buildings || []), ...(maps.state_street?.landmarks || [])].length < 5) {
    errors.push('State Street must retain its multi-block route scale and authored street-wall structures');
  }

  if (!region.productionPilot || !maps[region.productionPilot]
    || !region.nodes?.[region.productionPilot]?.readyForFinalArt) {
    errors.push('Season One must declare one ready-for-art production pilot');
  }

  for (const [id, interior] of Object.entries(interiors)) {
    if (!interior.displayName || !interior.size || !interior.exit) errors.push(`Interior '${id}' is missing identity, size, or exit`);
    if (!pointInBounds(interior, interior.exit.x, interior.exit.y)) errors.push(`Interior '${id}' exit is out of bounds`);
    for (const fixture of interior.fixtures || []) {
      if (!rectInBounds(interior, fixture)) errors.push(`Interior '${id}' fixture '${fixture.id}' is out of bounds`);
      if (fixture.collisionMask && (fixture.collisionMask.length !== fixture.height
        || fixture.collisionMask.some(row => row.length !== fixture.width || /[^.#]/.test(row)))) {
        errors.push(`Interior '${id}' fixture '${fixture.id}' has an invalid collision mask`);
      }
      if (fixture.to) referencedInteriors.add(fixture.to);
    }
    for (const event of interior.events || []) {
      if (!pointInBounds(interior, event.x, event.y)) errors.push(`Interior '${id}' event '${event.id}' is out of bounds`);
    }
    const reachable = reachableInteriorCells(interior);
    if (!reachable.size) errors.push(`Interior '${id}' has no reachable spawn cell`);
    const reachableOrAdjacent = (x, y) => reachable.has(`${x},${y}`)
      || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => reachable.has(`${x + dx},${y + dy}`));
    if (!reachable.has(`${interior.exit.x},${interior.exit.y}`)) errors.push(`Interior '${id}' exit is unreachable`);
    for (const fixture of interior.fixtures || []) {
      if (fixture.to) {
        const cells = [];
        for (let y = fixture.y; y < fixture.y + fixture.height; y += 1) {
          for (let x = fixture.x; x < fixture.x + fixture.width; x += 1) cells.push(`${x},${y}`);
        }
        if (!cells.some(cell => reachable.has(cell))) errors.push(`Interior '${id}' connection fixture '${fixture.id}' is unreachable`);
      }
    }
    for (const event of interior.events || []) {
      if (!reachableOrAdjacent(event.x, event.y)) errors.push(`Interior '${id}' event '${event.id}' has no reachable interaction cell`);
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
