const FACING_ROWS = {down: 0, left: 1, right: 2, up: 3};

function rectContains(entry, x, y) {
  return x >= entry.x && y >= entry.y && x < entry.x + entry.width && y < entry.y + entry.height;
}

export class MapRenderer {
  constructor(canvas, requestRender) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', {alpha: false});
    this.context.imageSmoothingEnabled = false;
    this.requestRender = requestRender;
    this.images = new Map();
  }

  image(path) {
    if (!path) return null;
    if (this.images.has(path)) return this.images.get(path);
    const image = new Image();
    image.decoding = 'async';
    image.src = path;
    image.addEventListener('load', () => this.requestRender());
    image.addEventListener('error', () => this.requestRender());
    this.images.set(path, image);
    return image;
  }

  resize(map) {
    const width = map.width * map.cellSize;
    const height = map.height * map.cellSize;
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
    this.context.imageSmoothingEnabled = false;
  }

  render(state, clean = false) {
    const {map, project} = state;
    this.resize(map);
    const context = this.context;
    const cell = map.cellSize;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.fillStyle = '#537f4d';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const background = this.image(map.background?.path);
    if (background?.complete && background.naturalWidth) {
      context.drawImage(background, 0, 0, this.canvas.width, this.canvas.height);
    }

    const metatileAtlas = map.renderModel === 'metatile' ? this.image(map.metatileAtlas?.path) : null;
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        if (map.renderModel === 'metatile') this.drawTerrainMetatile(map, metatileAtlas, x, y);
        else if (map.terrain[y][x] !== map.originalTerrain[y][x]) this.drawTerrainCell(map, x, y);
      }
    }

    const commands = [];
    map.objects.forEach((object, objectIndex) => {
      const asset = project.assets.objects.find(entry => entry.id === object.assetId);
      const image = this.image(asset?.path);
      for (let row = 0; row < object.height; row += 1) {
        commands.push({
          kind: 'object', object, image, metatileAtlas, project, row,
          depth: object.depthMode === 'flat'
            ? (object.y + object.height) * cell - 1
            : (object.y + row + 1) * cell - 1,
          order: objectIndex
        });
      }
    });
    map.actors.forEach((actor, actorIndex) => {
      const asset = project.assets.actors.find(entry => entry.id === actor.assetId);
      commands.push({
        kind: 'actor', actor, asset, image: this.image(asset?.path),
        depth: (actor.y + 1) * cell,
        order: map.objects.length + actorIndex
      });
    });
    commands.sort((a, b) => a.depth - b.depth || a.order - b.order);
    for (const command of commands) {
      if (command.kind === 'object') {
        const hasMetatiles = command.object.metatiles
          && command.metatileAtlas?.complete && command.metatileAtlas.naturalWidth;
        const hasImage = command.image?.complete && command.image.naturalWidth;
        if (hasMetatiles || hasImage) this.drawObjectRow(command, cell);
      } else if (command.image?.complete && command.image.naturalWidth) {
        this.drawActor(command, cell);
      }
    }

    if (clean) return;
    this.drawMarkers(state);
    if (state.showCollision) this.drawCollision(map, cell, state.gridAnalysis);
    if (state.showGrid) this.drawGrid(map, cell);
    this.drawSelection(state, cell);
    this.drawPlacementPreview(state, cell);
    if (state.cameraPreview) this.drawCameraPreview(state, cell);
    if (state.hoverCell) {
      context.strokeStyle = '#fff1a8';
      context.lineWidth = 2;
      context.strokeRect(state.hoverCell.x * cell + 1, state.hoverCell.y * cell + 1, cell - 2, cell - 2);
    }
  }

  drawTerrainCell(map, x, y) {
    const context = this.context;
    const cell = map.cellSize;
    const material = map.terrain[y][x];
    const left = x * cell;
    const top = y * cell;
    const colors = {
      grass: ['#619e58', '#437f47'],
      brick: ['#ad473d', '#73342f'],
      stone: ['#c4bca5', '#97917f'],
      dirt: ['#cdb27a', '#9f8256'],
      water: ['#447aa7', '#82b9ce'],
      floor: ['#b99669', '#876646']
    }[material] || ['#777', '#555'];
    context.fillStyle = colors[0];
    context.fillRect(left, top, cell, cell);
    context.strokeStyle = colors[1];
    context.lineWidth = 2;
    if (material === 'brick') {
      for (let yy = 0; yy < cell; yy += 8) {
        context.beginPath(); context.moveTo(left, top + yy); context.lineTo(left + cell, top + yy); context.stroke();
        const offset = (yy / 8) % 2 ? 8 : 0;
        for (let xx = offset; xx < cell; xx += 16) {
          context.beginPath(); context.moveTo(left + xx, top + yy); context.lineTo(left + xx, top + Math.min(cell, yy + 8)); context.stroke();
        }
      }
    } else if (material === 'stone' || material === 'floor') {
      context.lineWidth = 1;
      context.beginPath(); context.moveTo(left, top + cell / 2); context.lineTo(left + cell, top + cell / 2); context.stroke();
      context.beginPath(); context.moveTo(left + cell / 2, top); context.lineTo(left + cell / 2, top + cell / 2); context.stroke();
    } else if (material === 'water') {
      context.strokeStyle = colors[1];
      for (const yy of [9, 21]) {
        context.beginPath(); context.moveTo(left + 5, top + yy); context.quadraticCurveTo(left + 12, top + yy - 4, left + 19, top + yy); context.stroke();
      }
    } else {
      context.fillStyle = colors[1];
      context.fillRect(left + 7, top + 8, 2, 2);
      context.fillRect(left + 22, top + 20, 3, 2);
    }
    const same = (xx, yy) => xx >= 0 && yy >= 0 && xx < map.width && yy < map.height && map.terrain[yy][xx] === material;
    context.strokeStyle = material === 'brick' ? '#e1a982' : '#ead8a9';
    context.lineWidth = 2;
    if (!same(x, y - 1)) { context.beginPath(); context.moveTo(left, top + 1); context.lineTo(left + cell, top + 1); context.stroke(); }
    if (!same(x - 1, y)) { context.beginPath(); context.moveTo(left + 1, top); context.lineTo(left + 1, top + cell); context.stroke(); }
    context.strokeStyle = material === 'brick' ? '#68332f' : '#6f7756';
    if (!same(x, y + 1)) { context.beginPath(); context.moveTo(left, top + cell - 1); context.lineTo(left + cell, top + cell - 1); context.stroke(); }
    if (!same(x + 1, y)) { context.beginPath(); context.moveTo(left + cell - 1, top); context.lineTo(left + cell - 1, top + cell); context.stroke(); }
  }

  drawTerrainMetatile(map, atlas, x, y) {
    const material = map.terrain[y][x];
    if (!atlas?.complete || !atlas.naturalWidth) return;
    const visual = map.terrainTiles?.[material];
    if (!Number.isInteger(visual)) return;
    this.drawAtlasVisual(atlas, map.metatileAtlas.columns, map.cellSize, visual, x * map.cellSize, y * map.cellSize);
  }

  drawAtlasVisual(atlas, columns, cell, visual, destinationX, destinationY) {
    const sourceX = (visual % columns) * cell;
    const sourceY = Math.floor(visual / columns) * cell;
    this.context.drawImage(atlas, sourceX, sourceY, cell, cell, destinationX, destinationY, cell, cell);
  }

  drawObjectRow(command, cell) {
    const {object, image, metatileAtlas, project, row} = command;
    if (object.metatiles && metatileAtlas?.complete && metatileAtlas.naturalWidth) {
      const lookup = new Map((project.assets.metatiles || []).map(tile => [tile.id, tile]));
      for (let column = 0; column < object.width; column += 1) {
        const tile = lookup.get(object.metatiles[row]?.[column]);
        if (!tile) continue;
        this.drawAtlasVisual(
          metatileAtlas,
          tile.atlasColumns,
          cell,
          tile.visual,
          (object.x + column) * cell,
          (object.y + row) * cell
        );
      }
      return;
    }
    if (!image?.complete || !image.naturalWidth) return;
    const sourceWidth = image.naturalWidth;
    const sourceRowHeight = image.naturalHeight / object.height;
    const sourceY = row * sourceRowHeight;
    const destinationY = object.y * cell + row * cell;
    this.context.drawImage(
      image,
      0, sourceY, sourceWidth, sourceRowHeight,
      object.x * cell, destinationY, object.width * cell, cell
    );
  }

  drawActor(command, cell) {
    const {actor, asset, image} = command;
    const row = FACING_ROWS[actor.facing] ?? 0;
    const sourceX = asset.frameWidth;
    const sourceY = row * asset.frameHeight;
    this.context.drawImage(
      image,
      sourceX, sourceY, asset.frameWidth, asset.frameHeight,
      actor.x * cell, (actor.y - 1) * cell, cell, cell * 2
    );
  }

  drawMarkers(state) {
    const {map} = state;
    const context = this.context;
    const cell = map.cellSize;
    for (const event of map.events) {
      const x = (event.x + 0.5) * cell;
      const y = (event.y + 0.5) * cell;
      context.fillStyle = 'rgba(255, 221, 116, .92)';
      context.beginPath(); context.arc(x, y, 7, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#332b27'; context.lineWidth = 2; context.stroke();
    }
    for (const object of map.objects) {
      if (!object.door) continue;
      const x = (object.x + object.door.x) * cell;
      const y = (object.y + object.door.y) * cell;
      context.fillStyle = 'rgba(46, 202, 113, .38)';
      context.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      context.strokeStyle = '#a7f3c3'; context.lineWidth = 2;
      context.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
    }
    for (const connection of map.connections || []) {
      for (let offset = 0; offset < connection.span; offset += 1) {
        let x = 0; let y = 0;
        if (connection.edge === 'north' || connection.edge === 'south') {
          x = connection.start + offset;
          y = connection.edge === 'north' ? 0 : map.height - 1;
        } else {
          x = connection.edge === 'west' ? 0 : map.width - 1;
          y = connection.start + offset;
        }
        context.strokeStyle = '#55b8e7'; context.lineWidth = 3;
        context.strokeRect(x * cell + 3, y * cell + 3, cell - 6, cell - 6);
      }
    }
  }

  drawCollision(map, cell, analysis) {
    const context = this.context;
    if (!analysis) return;
    for (const row of analysis.cells) {
      for (const entry of row) {
        const door = entry.objectCells.some(owner => owner.door);
        const conflict = entry.conflicts.some(issue => issue.severity === 'error');
        const solid = !entry.passable && entry.groundBehavior !== 'water';
        const water = entry.groundBehavior === 'water';
        const unreachable = entry.passable && !entry.reachable;
        context.fillStyle = conflict
          ? 'rgba(199, 48, 166, .48)'
          : door ? 'rgba(67, 198, 112, .4)'
            : water ? 'rgba(45, 121, 190, .38)'
              : solid ? 'rgba(208, 43, 57, .34)'
                : unreachable ? 'rgba(113, 72, 151, .3)'
                  : 'rgba(67, 166, 106, .06)';
        context.fillRect(entry.x * cell, entry.y * cell, cell, cell);
        context.strokeStyle = conflict
          ? '#ff75db'
          : door ? '#9df2bb'
            : water ? '#69bfe8'
              : solid ? '#ec6a76'
                : unreachable ? '#bc91e5' : 'rgba(97, 201, 134, .28)';
        context.lineWidth = conflict || door ? 2 : 1;
        context.strokeRect(entry.x * cell + 1, entry.y * cell + 1, cell - 2, cell - 2);
        if (conflict) {
          context.beginPath();
          context.moveTo(entry.x * cell + 5, entry.y * cell + 5);
          context.lineTo((entry.x + 1) * cell - 5, (entry.y + 1) * cell - 5);
          context.moveTo((entry.x + 1) * cell - 5, entry.y * cell + 5);
          context.lineTo(entry.x * cell + 5, (entry.y + 1) * cell - 5);
          context.stroke();
        }
      }
    }
  }

  drawGrid(map, cell) {
    const context = this.context;
    context.strokeStyle = 'rgba(255, 255, 255, .18)';
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= map.width; x += 1) {
      context.moveTo(x * cell + 0.5, 0); context.lineTo(x * cell + 0.5, map.height * cell);
    }
    for (let y = 0; y <= map.height; y += 1) {
      context.moveTo(0, y * cell + 0.5); context.lineTo(map.width * cell, y * cell + 0.5);
    }
    context.stroke();
  }

  drawSelection(state, cell) {
    const {selection, map} = state;
    if (!selection) return;
    const context = this.context;
    context.strokeStyle = '#ffe57a';
    context.lineWidth = 3;
    context.setLineDash([7, 4]);
    if (selection.kind === 'object') {
      const object = map.objects.find(entry => entry.id === selection.id);
      if (object) context.strokeRect(object.x * cell + 2, object.y * cell + 2, object.width * cell - 4, object.height * cell - 4);
    } else {
      const entry = selection.kind === 'actor'
        ? map.actors.find(candidate => candidate.id === selection.id)
        : map.events.find(candidate => candidate.id === selection.id);
      if (entry) context.strokeRect(entry.x * cell + 2, entry.y * cell + 2, cell - 4, cell - 4);
    }
    context.setLineDash([]);
  }

  drawPlacementPreview(state, cell) {
    const {placingAsset, movingEntry, placementAssessment, map, project} = state;
    if (!placementAssessment) return;
    const context = this.context;
    this.drawPlacementArtwork(state, cell);
    const drawCell = entry => {
      const blocked = entry.blocked;
      const door = entry.role === 'warp';
      const solid = entry.role === 'solid';
      const water = entry.role === 'water';
      context.fillStyle = blocked
        ? 'rgba(199, 48, 166, .5)'
        : door ? 'rgba(67, 198, 112, .44)'
          : solid ? 'rgba(208, 43, 57, .34)'
            : water ? 'rgba(45, 121, 190, .36)' : 'rgba(255, 226, 124, .24)';
      context.fillRect(entry.x * cell + 2, entry.y * cell + 2, cell - 4, cell - 4);
      context.strokeStyle = blocked ? '#ff75db' : door ? '#9df2bb' : solid ? '#e96876' : water ? '#69bfe8' : '#ffe27c';
      context.lineWidth = 2;
      context.strokeRect(entry.x * cell + 2, entry.y * cell + 2, cell - 4, cell - 4);
      if (blocked) {
        context.beginPath();
        context.moveTo(entry.x * cell + 6, entry.y * cell + 6);
        context.lineTo((entry.x + 1) * cell - 6, (entry.y + 1) * cell - 6);
        context.moveTo((entry.x + 1) * cell - 6, entry.y * cell + 6);
        context.lineTo(entry.x * cell + 6, (entry.y + 1) * cell - 6);
        context.stroke();
      }
    };
    placementAssessment.cells.forEach(drawCell);
  }

  drawPlacementArtwork(state, cell) {
    const {placingAsset, movingEntry, placementAssessment, map, project} = state;
    if (!placementAssessment || movingEntry) return;
    const context = this.context;
    const atlas = map.metatileAtlas?.path ? this.image(map.metatileAtlas.path) : null;
    const tileLookup = new Map((project.assets.metatiles || []).map(tile => [tile.id, tile]));
    const groundLookup = new Map((project.assets.groundTiles || []).map(tile => [tile.id, tile]));
    context.save();
    context.globalAlpha = .58;
    if (placingAsset?.kind === 'groundStamp' && atlas?.complete) {
      const stamp = (project.assets.groundStamps || []).find(entry => entry.id === placingAsset.id);
      stamp?.cells.forEach((row, y) => row.forEach((tileId, x) => {
        const tile = groundLookup.get(tileId);
        if (tileId && tile) this.drawAtlasVisual(atlas, map.metatileAtlas.columns, cell, tile.visual, (placementAssessment.origin.x + x) * cell, (placementAssessment.origin.y + y) * cell);
      }));
    } else if (placingAsset?.kind === 'object') {
      const asset = project.assets.objects.find(entry => entry.id === placingAsset.id);
      if (asset?.metatiles && atlas?.complete) {
        asset.metatiles.forEach((row, y) => row.forEach((tileId, x) => {
          const tile = tileLookup.get(tileId);
          if (tile) this.drawAtlasVisual(atlas, map.metatileAtlas.columns, cell, tile.visual, (placementAssessment.origin.x + x) * cell, (placementAssessment.origin.y + y) * cell);
        }));
      } else if (asset?.path) {
        const image = this.image(asset.path);
        if (image.complete && image.naturalWidth) context.drawImage(image, placementAssessment.origin.x * cell, placementAssessment.origin.y * cell, asset.width * cell, asset.height * cell);
      }
    } else if (placingAsset?.kind === 'actor') {
      const asset = project.assets.actors.find(entry => entry.id === placingAsset.id);
      const image = asset?.path ? this.image(asset.path) : null;
      if (asset && image?.complete && image.naturalWidth) {
        context.drawImage(image, asset.frameWidth, 0, asset.frameWidth, asset.frameHeight, placementAssessment.origin.x * cell, (placementAssessment.origin.y - 1) * cell, asset.frameWidth, asset.frameHeight);
      }
    }
    context.restore();
  }

  drawCameraPreview(state, cell) {
    const context = this.context;
    const camera = state.camera;
    const x = camera.x * cell;
    const y = camera.y * cell;
    const width = camera.width * cell;
    const height = camera.height * cell;
    context.fillStyle = 'rgba(0, 0, 0, .52)';
    context.fillRect(0, 0, this.canvas.width, y);
    context.fillRect(0, y + height, this.canvas.width, this.canvas.height - y - height);
    context.fillRect(0, y, x, height);
    context.fillRect(x + width, y, this.canvas.width - x - width, height);
    context.strokeStyle = '#6dd2f2';
    context.lineWidth = 3;
    context.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
  }

  hitTest(state, x, y) {
    const {map} = state;
    const event = [...map.events].reverse().find(entry => entry.x === x && entry.y === y);
    if (event) return {kind: 'event', id: event.id};
    const actor = [...map.actors].reverse().find(entry => entry.x === x && entry.y === y);
    if (actor) return {kind: 'actor', id: actor.id};
    const object = [...map.objects].reverse().find(entry => rectContains(entry, x, y));
    return object ? {kind: 'object', id: object.id} : null;
  }
}
