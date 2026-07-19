export const cellKey = (x, y) => `${x},${y}`;

export function inMapBounds(map, x, y) {
  return Number.isInteger(x) && Number.isInteger(y)
    && x >= 0 && y >= 0 && x < map.width && y < map.height;
}

function libraryById(entries = []) {
  return new Map(entries.map(entry => [entry.id, entry]));
}

function edgeCells(map) {
  const cells = new Map();
  for (const connection of map.connections || []) {
    if (!Number.isInteger(connection.start) || !Number.isInteger(connection.span)) continue;
    for (let offset = 0; offset < connection.span; offset += 1) {
      let x;
      let y;
      if (connection.edge === 'north' || connection.edge === 'south') {
        x = connection.start + offset;
        y = connection.edge === 'north' ? 0 : map.height - 1;
      } else if (connection.edge === 'west' || connection.edge === 'east') {
        x = connection.edge === 'west' ? 0 : map.width - 1;
        y = connection.start + offset;
      } else continue;
      if (!inMapBounds(map, x, y)) continue;
      const key = cellKey(x, y);
      const entries = cells.get(key) || [];
      entries.push(connection);
      cells.set(key, entries);
    }
  }
  return cells;
}

function inWaterRoute(map, x, y) {
  return (map.waterRoutes || []).some(route => x >= route.x && y >= route.y
    && x < route.x + route.width && y < route.y + route.height);
}

function objectBehavior(object, localX, localY, metatiles) {
  const tileId = object.metatiles?.[localY]?.[localX] || null;
  const tileBehavior = tileId ? metatiles.get(tileId)?.behavior : null;
  const explicitDoor = object.door?.x === localX && object.door?.y === localY;
  if (explicitDoor || tileBehavior === 'warp') return {behavior: 'warp', tileId, door: true};
  if (tileBehavior) return {behavior: tileBehavior, tileId, door: false};
  return {
    behavior: object.collisionMask?.[localY]?.[localX] === '#' ? 'solid' : 'walkable',
    tileId,
    door: false
  };
}

function conflict(type, severity, x, y, message, entries = []) {
  return {type, severity, x, y, message, entries};
}

export function analyzeMapGrid(project, map) {
  const groundTiles = libraryById(project.assets?.groundTiles);
  const metatiles = libraryById(project.assets?.metatiles);
  const connectionCells = edgeCells(map);
  const requestedStart = map.start || (map.exit
    ? {x: map.exit.x, y: Math.max(0, map.exit.y - 1)}
    : {x: Math.floor(map.width / 2), y: Math.max(0, map.height - 2)});
  const cells = Array.from({length: map.height}, (_, y) => Array.from({length: map.width}, (_, x) => {
    const terrainId = map.terrain?.[y]?.[x] || null;
    const groundBehavior = groundTiles.get(terrainId)?.behavior || 'walkable';
    return {
      x,
      y,
      terrainId,
      groundBehavior,
      waterRoute: inWaterRoute(map, x, y),
      objectCells: [],
      actors: [],
      events: [],
      connections: connectionCells.get(cellKey(x, y)) || [],
      critical: [
        ...(requestedStart.x === x && requestedStart.y === y ? ['spawn'] : []),
        ...(map.exit?.x === x && map.exit?.y === y ? ['exit'] : [])
      ],
      conflicts: [],
      passable: false,
      reachable: false
    };
  }));

  const cellAt = (x, y) => inMapBounds(map, x, y) ? cells[y][x] : null;
  for (const object of map.objects || []) {
    for (let localY = 0; localY < object.height; localY += 1) {
      for (let localX = 0; localX < object.width; localX += 1) {
        const cell = cellAt(object.x + localX, object.y + localY);
        if (!cell) continue;
        const semantic = objectBehavior(object, localX, localY, metatiles);
        cell.objectCells.push({
          object,
          localX,
          localY,
          ...semantic,
          solid: semantic.behavior === 'solid'
        });
      }
    }
  }
  for (const actor of map.actors || []) {
    const cell = cellAt(actor.x, actor.y);
    if (cell) cell.actors.push(actor);
  }
  for (const event of map.events || []) {
    const cell = cellAt(event.x, event.y);
    if (cell) cell.events.push(event);
  }

  const conflicts = [];
  for (const row of cells) {
    for (const cell of row) {
      const solidObjects = cell.objectCells.filter(entry => entry.solid);
      const doors = cell.objectCells.filter(entry => entry.door);
      const solidActors = cell.actors.filter(actor => actor.solid !== false);
      const groundBlocked = cell.groundBehavior === 'solid'
        || (cell.groundBehavior === 'water' && !cell.waterRoute);
      cell.passable = !groundBlocked && solidObjects.length === 0;

      if (cell.objectCells.length > 1) {
        cell.conflicts.push(conflict(
          'visual-overlap',
          'warning',
          cell.x,
          cell.y,
          `Multiple structure stamps own cell ${cell.x},${cell.y}`,
          cell.objectCells.map(entry => entry.object.id)
        ));
      }
      if (solidObjects.length > 1) {
        cell.conflicts.push(conflict(
          'solid-overlap',
          'warning',
          cell.x,
          cell.y,
          `Multiple solid structure cells overlap at ${cell.x},${cell.y}`,
          solidObjects.map(entry => entry.object.id)
        ));
      }
      if (doors.length > 1) {
        cell.conflicts.push(conflict(
          'door-overlap',
          'error',
          cell.x,
          cell.y,
          `Multiple door cells overlap at ${cell.x},${cell.y}`,
          doors.map(entry => entry.object.id)
        ));
      }
      if (doors.length && (groundBlocked || solidObjects.length || solidActors.length)) {
        const blockers = [
          ...(groundBlocked ? [`ground:${cell.terrainId}`] : []),
          ...solidObjects.map(entry => entry.object.id),
          ...solidActors.map(actor => actor.id)
        ];
        cell.conflicts.push(conflict(
          'door-blocked',
          'error',
          cell.x,
          cell.y,
          `Door cell ${cell.x},${cell.y} is blocked by another grid owner`,
          blockers
        ));
      }
      if (solidActors.length > 1) {
        cell.conflicts.push(conflict(
          'actor-overlap',
          'error',
          cell.x,
          cell.y,
          `Multiple solid actors occupy cell ${cell.x},${cell.y}`,
          solidActors.map(actor => actor.id)
        ));
      }
      if (solidActors.length && (!cell.passable || doors.length)) {
        cell.conflicts.push(conflict(
          'actor-blocked',
          'error',
          cell.x,
          cell.y,
          `Actor cell ${cell.x},${cell.y} is blocked by terrain or structure art`,
          solidActors.map(actor => actor.id)
        ));
      }
      if (cell.events.some(event => event.kind === 'message') && !cell.passable) {
        cell.conflicts.push(conflict(
          'step-event-blocked',
          'error',
          cell.x,
          cell.y,
          `Step event cell ${cell.x},${cell.y} is blocked`,
          cell.events.map(event => event.id)
        ));
      }
      conflicts.push(...cell.conflicts);
    }
  }

  const reachable = new Set();
  const startCell = cellAt(requestedStart.x, requestedStart.y);
  if (startCell?.passable) {
    reachable.add(cellKey(requestedStart.x, requestedStart.y));
    const queue = [[requestedStart.x, requestedStart.y]];
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y] = queue[index];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = cellAt(x + dx, y + dy);
        if (!next?.passable) continue;
        const key = cellKey(next.x, next.y);
        if (reachable.has(key)) continue;
        reachable.add(key);
        queue.push([next.x, next.y]);
      }
    }
  }
  for (const key of reachable) {
    const [x, y] = key.split(',').map(Number);
    cells[y][x].reachable = true;
  }

  return {
    width: map.width,
    height: map.height,
    cells,
    conflicts,
    reachable,
    requestedStart,
    cellAt
  };
}

function placementCell(role, x, y, localX = 0, localY = 0) {
  return {role, x, y, localX, localY, blocked: false, reasons: []};
}

function block(cell, reason) {
  cell.blocked = true;
  if (!cell.reasons.includes(reason)) cell.reasons.push(reason);
}

function placementOrigin(map, width, height, origin) {
  return {
    x: Math.max(0, Math.min(origin.x, Math.max(0, map.width - width))),
    y: Math.max(0, Math.min(origin.y, Math.max(0, map.height - height)))
  };
}

export function assessPlacement(project, map, placement, origin, options = {}) {
  const analysis = options.analysis || analyzeMapGrid(project, map);
  const ignoreObjectId = options.ignoreObjectId || null;
  const ignoreActorId = options.ignoreActorId || null;
  const ignoreEventId = options.ignoreEventId || null;
  const metatiles = libraryById(project.assets?.metatiles);
  const groundTiles = libraryById(project.assets?.groundTiles);
  const cells = [];
  let normalizedOrigin = {...origin};

  if (placement.kind === 'object') {
    normalizedOrigin = placementOrigin(map, placement.width, placement.height, origin);
    for (let localY = 0; localY < placement.height; localY += 1) {
      for (let localX = 0; localX < placement.width; localX += 1) {
        const semantic = objectBehavior(placement, localX, localY, metatiles);
        cells.push(placementCell(semantic.behavior, normalizedOrigin.x + localX, normalizedOrigin.y + localY, localX, localY));
      }
    }
  } else if (placement.kind === 'actor' || placement.kind === 'event') {
    cells.push(placementCell(placement.kind, origin.x, origin.y));
  } else if (placement.kind === 'groundStamp') {
    normalizedOrigin = placementOrigin(map, placement.width, placement.height, origin);
    for (let localY = 0; localY < placement.height; localY += 1) {
      for (let localX = 0; localX < placement.width; localX += 1) {
        const tileId = placement.cells?.[localY]?.[localX];
        if (!tileId) continue;
        const behavior = groundTiles.get(tileId)?.behavior || 'walkable';
        const cell = placementCell(behavior, normalizedOrigin.x + localX, normalizedOrigin.y + localY, localX, localY);
        cell.tileId = tileId;
        cells.push(cell);
      }
    }
  }

  for (const candidate of cells) {
    const current = analysis.cellAt(candidate.x, candidate.y);
    if (!current) {
      block(candidate, 'outside the map');
      continue;
    }
    const objectCells = current.objectCells.filter(entry => entry.object.id !== ignoreObjectId);
    const actors = current.actors.filter(actor => actor.id !== ignoreActorId);
    const events = current.events.filter(event => event.id !== ignoreEventId);
    const solidActors = actors.filter(actor => actor.solid !== false);
    const hasDoor = objectCells.some(entry => entry.door);
    const hasSolidObject = objectCells.some(entry => entry.solid);

    if (placement.kind === 'object') {
      if (objectCells.length) block(candidate, `structure stamp already owns ${candidate.x},${candidate.y}`);
      if (actors.length) block(candidate, `actor already occupies ${candidate.x},${candidate.y}`);
      if (events.length) block(candidate, `event already occupies ${candidate.x},${candidate.y}`);
      if (['solid', 'water'].includes(current.groundBehavior)) block(candidate, `${current.groundBehavior} ground owns ${candidate.x},${candidate.y}`);
      if (candidate.role === 'solid' && current.connections.length) block(candidate, `map connection uses ${candidate.x},${candidate.y}`);
      if (current.critical.length && candidate.role !== 'warp') block(candidate, `${current.critical.join('/')} cell uses ${candidate.x},${candidate.y}`);
      if (candidate.role === 'warp' && (hasSolidObject || solidActors.length || current.connections.length)) {
        block(candidate, `door approach is obstructed at ${candidate.x},${candidate.y}`);
      }
    } else if (placement.kind === 'actor') {
      if (!current.passable) block(candidate, `cell ${candidate.x},${candidate.y} is not walkable`);
      if (actors.length) block(candidate, `actor already occupies ${candidate.x},${candidate.y}`);
      if (hasDoor) block(candidate, `door uses ${candidate.x},${candidate.y}`);
      if (events.length) block(candidate, `event uses ${candidate.x},${candidate.y}`);
      if (current.critical.length) block(candidate, `${current.critical.join('/')} cell uses ${candidate.x},${candidate.y}`);
    } else if (placement.kind === 'event') {
      if (events.length) block(candidate, `event already occupies ${candidate.x},${candidate.y}`);
      if (actors.length) block(candidate, `actor occupies ${candidate.x},${candidate.y}`);
      if (hasDoor) block(candidate, `door uses ${candidate.x},${candidate.y}`);
      if (placement.eventKind === 'message' && !current.passable) {
        block(candidate, `step event requires a walkable cell at ${candidate.x},${candidate.y}`);
      }
    } else if (placement.kind === 'groundStamp' && ['solid', 'water'].includes(candidate.role)) {
      if (objectCells.length) block(candidate, `structure art owns ${candidate.x},${candidate.y}`);
      if (actors.length) block(candidate, `actor occupies ${candidate.x},${candidate.y}`);
      if (events.length) block(candidate, `event occupies ${candidate.x},${candidate.y}`);
      if (hasDoor) block(candidate, `door uses ${candidate.x},${candidate.y}`);
      if (current.connections.length) block(candidate, `map connection uses ${candidate.x},${candidate.y}`);
      if (current.critical.length) block(candidate, `${current.critical.join('/')} cell uses ${candidate.x},${candidate.y}`);
    }
  }

  const errors = [...new Set(cells.flatMap(cell => cell.reasons))];
  return {
    kind: placement.kind,
    origin: normalizedOrigin,
    width: placement.width || 1,
    height: placement.height || 1,
    cells,
    errors,
    valid: errors.length === 0
  };
}
