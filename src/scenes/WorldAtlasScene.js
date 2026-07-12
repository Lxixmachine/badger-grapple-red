import layouts from '../data/seasonOneLayouts.json';
import region from '../data/seasonOneRegion.json';
import campMetatiles from '../data/campRandallMetatileBuild.json';
import {setVirtualHandler} from '../systems/ui.js';

const Phaser = window.Phaser;
const CELL = layouts.contract.cellSize;
const WIDTH = layouts.contract.canvasWidth;
const HEIGHT = layouts.contract.canvasHeight;
const ORDER = layouts.region.reviewOrder;

const COLORS = {
  ink: 0x211f24,
  paper: 0xf5edd5,
  paperDark: 0xd6c69f,
  red: 0xa71930,
  redLight: 0xd64a58,
  gold: 0xd3a52f,
  lawn: 0x79b864,
  lawnDark: 0x447b45,
  forest: 0x2f6542,
  forestDark: 0x214333,
  water: 0x4b83bd,
  waterDark: 0x315d8e,
  shore: 0x8dbf73,
  urban: 0xa9a8a1,
  urbanDark: 0x6f7072,
  slope: 0x7ca765,
  terminal: 0xb8b5ad,
  dirt: 0xc9ad74,
  brick: 0xad4b44,
  stone: 0xbeb59f,
  dock: 0x9b7449,
  building: 0xd8c391,
  service: 0x43849a,
  shop: 0xb1444d,
  arena: 0x9d2937,
  landmark: 0xd2a73d,
  blocked: 0xb9363e,
  open: 0x45a268,
  event: 0xffe39a,
  connection: 0xefd256,
  camera: 0x54b8db
};

const DIRS = {
  up: {dx: 0, dy: -1},
  down: {dx: 0, dy: 1},
  left: {dx: -1, dy: 0},
  right: {dx: 1, dy: 0}
};

const SHORT_NAMES = {
  camp_randall: 'CAMP',
  r1: 'R1',
  field_house: 'FIELD',
  lakeshore_path: 'LAKE',
  picnic_point: 'PICNIC',
  state_street: 'STATE',
  bascom_hill: 'BASCOM',
  capitol_square: 'CAPITOL',
  monona_shore: 'MONONA',
  kohl_center: 'KOHL',
  airport: 'AIRPORT',
  st_louis: 'STL'
};

const fill = (graphics, color, x, y, width, height, alpha = 1) => {
  graphics.fillStyle(color, alpha);
  graphics.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
};

const stroke = (graphics, color, width, x, y, rectWidth, rectHeight, alpha = 1) => {
  graphics.lineStyle(width, color, alpha);
  graphics.strokeRect(Math.round(x), Math.round(y), Math.round(rectWidth), Math.round(rectHeight));
};

const line = (graphics, color, width, x1, y1, x2, y2, alpha = 1) => {
  graphics.lineStyle(width, color, alpha);
  graphics.lineBetween(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2));
};

const inRect = (x, y, rect) => x >= rect.x && y >= rect.y
  && x < rect.x + rect.width && y < rect.y + rect.height;

const blocksAt = (entry, x, y) => {
  if (!inRect(x, y, entry)) return false;
  if (!entry.collisionMask) return true;
  return entry.collisionMask[y - entry.y]?.[x - entry.x] === '#';
};

const doorAt = (entry, x, y) => entry.door?.x === x && entry.door?.y === y;

function connectionContains(map, connection, x, y) {
  if (connection.edge === 'north') return y === 0 && x >= connection.start && x < connection.start + connection.span;
  if (connection.edge === 'south') return y === map.size.height - 1 && x >= connection.start && x < connection.start + connection.span;
  if (connection.edge === 'west') return x === 0 && y >= connection.start && y < connection.start + connection.span;
  if (connection.edge === 'east') return x === map.size.width - 1 && y >= connection.start && y < connection.start + connection.span;
  return false;
}

function groundColor(kind) {
  return COLORS[kind] || COLORS.lawn;
}

function pathColor(material) {
  if (material === 'brick' || material === 'pedestrian_brick') return COLORS.brick;
  if (material === 'stone' || material === 'terminal_carpet') return COLORS.stone;
  if (material === 'dock') return COLORS.dock;
  if (material === 'water_lane') return 0x72a9d0;
  return COLORS.dirt;
}

function blockerColor(kind) {
  if (kind === 'water' || kind === 'deep_water') return COLORS.waterDark;
  if (kind === 'storefront' || kind === 'city' || kind === 'seating') return COLORS.urbanDark;
  if (kind === 'cliff') return 0x6c7151;
  if (kind === 'fence') return 0x4f5354;
  if (kind === 'hedge') return COLORS.forest;
  return COLORS.forestDark;
}

function structureColor(kind) {
  if (kind === 'trainer_room') return COLORS.service;
  if (kind === 'buckys_locker_room') return COLORS.shop;
  if (kind === 'arena') return COLORS.arena;
  if (kind === 'x_factor') return COLORS.landmark;
  if (kind === 'decision_required') return 0x775e88;
  return COLORS.building;
}

function clearingColor(ground) {
  if (ground === 'urban' || ground === 'terminal') return COLORS.stone;
  if (ground === 'water') return 0x72a9d0;
  return 0x91bd75;
}

export class WorldAtlasScene extends Phaser.Scene {
  constructor() {
    super('WorldAtlasScene');
    this.atlasVersion = layouts.revision;
    this.nativeWidth = WIDTH;
    this.nativeHeight = HEIGHT;
    this.cellSize = CELL;
    this.cameraTilesWide = layouts.contract.cameraCellsWide;
    this.cameraTilesHigh = layouts.contract.cameraCellsHigh;
    this.metatileVersion = campMetatiles.version;
  }

  preload() {
    this.load.image('camp-metatile-ground', campMetatiles.map.ground.path);
    this.load.spritesheet('camp-metatile-atlas', campMetatiles.atlas.path, {
      frameWidth: campMetatiles.cellSize,
      frameHeight: campMetatiles.cellSize
    });
  }

  create() {
    this.viewObjects = [];
    this.mode = 'region';
    this.overlayMode = 0;
    this.selectedIndex = 0;
    this.tilePos = null;
    this.facing = 'down';
    this.moving = false;
    this.inputLocked = false;
    this.messageOpen = false;
    this.heldDirection = null;
    this.pendingDirection = null;
    this.returnStack = [];
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#17161a');
    this.createPlayerTextures();
    this.bindKeyboard();
    setVirtualHandler(this);

    const params = new URLSearchParams(window.location.search);
    this.playtestMode = params.has('play');
    const requested = ORDER.includes(params.get('area')) ? params.get('area') : ORDER[0];
    const requestedInterior = layouts.interiors[params.get('interior')] ? params.get('interior') : null;
    this.selectedIndex = ORDER.indexOf(requested);
    const requestedX = Number(params.get('x'));
    const requestedY = Number(params.get('y'));
    const requestedSpawn = params.has('x') && params.has('y')
      && Number.isInteger(requestedX) && Number.isInteger(requestedY)
      ? {x: requestedX, y: requestedY, facing: params.get('facing') || layouts.maps[requested].start.facing}
      : null;
    if (requestedInterior) this.loadInterior(requestedInterior);
    else if (params.has('play')) this.loadWorldMap(requested, requestedSpawn);
    else this.drawRegion();
  }

  bindKeyboard() {
    if (!this.input.keyboard) return;
    const keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      action: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      back: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    ['up', 'down', 'left', 'right'].forEach(direction => {
      keys[direction].on('down', () => this.handleVirtualButton(direction, 'down'));
      keys[direction].on('up', () => this.handleVirtualButton(direction, 'up'));
    });
    keys.action.on('down', () => this.handleVirtualButton('a'));
    keys.enter.on('down', () => this.handleVirtualButton('a'));
    keys.back.on('down', () => this.handleVirtualButton('b'));
    this.holdClock = this.time.addEvent({
      delay: 145,
      loop: true,
      callback: () => {
        if (this.heldDirection) this.handleDirection(this.heldDirection);
      }
    });
  }

  createPlayerTextures() {
    ['down', 'up', 'right'].forEach(direction => {
      if (this.textures.exists(`atlas-player-${direction}`)) return;
      const graphics = this.make.graphics({x: 0, y: 0, add: false});
      const rect = (x, y, width, height, color) => fill(graphics, color, x, y, width, height);
      if (direction === 'down') {
        rect(8, 4, 16, 18, 0x34231f);
        rect(10, 10, 12, 14, 0xc98b64);
        rect(8, 5, 16, 7, 0x34231f);
        rect(11, 17, 2, 2, COLORS.ink);
        rect(19, 17, 2, 2, COLORS.ink);
      } else if (direction === 'up') {
        rect(8, 4, 16, 20, 0x34231f);
      } else {
        rect(9, 4, 15, 19, 0x34231f);
        rect(13, 10, 13, 14, 0xc98b64);
        rect(22, 16, 2, 2, COLORS.ink);
      }
      rect(8, 25, 16, 24, COLORS.red);
      rect(11, 28, 10, 18, 0x721827);
      rect(14, 27, 4, 20, COLORS.paper);
      rect(3, 29, 6, 21, 0xc98b64);
      rect(23, 29, 6, 21, 0xc98b64);
      rect(9, 48, 7, 12, 0x721827);
      rect(17, 48, 7, 12, 0x721827);
      rect(7, 58, 10, 6, COLORS.ink);
      rect(16, 58, 10, 6, COLORS.ink);
      graphics.generateTexture(`atlas-player-${direction}`, 32, 64);
      graphics.destroy();
    });
  }

  track(object) {
    this.viewObjects.push(object);
    return object;
  }

  clearView() {
    this.tweens.killAll();
    this.viewObjects.forEach(object => object?.destroy?.());
    this.viewObjects = [];
    this.player = null;
    this.shadow = null;
    this.messageBox = null;
    this.messageOpen = false;
    this.message = '';
  }

  drawRegion() {
    this.clearView();
    this.mode = 'region';
    this.tilePos = null;
    this.currentMapId = null;
    this.currentInteriorId = null;
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, WIDTH, HEIGHT);
    this.cameras.main.setScroll(0, 0);

    const graphics = this.track(this.add.graphics().setDepth(0));
    fill(graphics, 0x18171b, 0, 0, WIDTH, HEIGHT);
    fill(graphics, 0x23242a, 8, 43, 464, 238);
    stroke(graphics, COLORS.paperDark, 2, 8, 43, 464, 238);

    const atlasEntries = ORDER.map(id => {
      const map = layouts.maps[id];
      const position = map.origin || map.atlasPosition;
      return {id, map, position};
    });
    const minX = Math.min(...atlasEntries.map(entry => entry.position.x));
    const minY = Math.min(...atlasEntries.map(entry => entry.position.y));
    const maxX = Math.max(...atlasEntries.map(entry => entry.position.x + entry.map.size.width));
    const maxY = Math.max(...atlasEntries.map(entry => entry.position.y + entry.map.size.height));
    const regionViewport = {x: 16, y: 48, width: 448, height: 226};
    const scale = Math.min(
      regionViewport.width / (maxX - minX),
      regionViewport.height / (maxY - minY)
    );
    const offsetX = regionViewport.x + (regionViewport.width - (maxX - minX) * scale) / 2;
    const offsetY = regionViewport.y + (regionViewport.height - (maxY - minY) * scale) / 2;
    const centerOf = entry => ({
      x: offsetX + (entry.position.x - minX + entry.map.size.width / 2) * scale,
      y: offsetY + (entry.position.y - minY + entry.map.size.height / 2) * scale
    });

    for (const entry of atlasEntries) {
      for (const connection of entry.map.connections || []) {
        if (ORDER.indexOf(connection.to) < ORDER.indexOf(entry.id)) continue;
        const target = atlasEntries.find(candidate => candidate.id === connection.to);
        if (!target) continue;
        const a = centerOf(entry);
        const b = centerOf(target);
        line(graphics, 0x7f8b7c, 3, a.x, a.y, b.x, b.y);
      }
    }
    for (const transition of layouts.region.transitions) {
      const from = atlasEntries.find(entry => entry.id === transition.from);
      const to = atlasEntries.find(entry => entry.id === transition.to);
      if (!from || !to) continue;
      const a = centerOf(from);
      const b = centerOf(to);
      const segments = 9;
      for (let i = 0; i < segments; i += 2) {
        const t1 = i / segments;
        const t2 = Math.min(1, (i + 1) / segments);
        line(graphics, COLORS.gold, 2, Phaser.Math.Linear(a.x, b.x, t1), Phaser.Math.Linear(a.y, b.y, t1), Phaser.Math.Linear(a.x, b.x, t2), Phaser.Math.Linear(a.y, b.y, t2), 0.8);
      }
    }

    atlasEntries.forEach((entry, index) => {
      const x = offsetX + (entry.position.x - minX) * scale;
      const y = offsetY + (entry.position.y - minY) * scale;
      const width = Math.max(23, entry.map.size.width * scale);
      const height = Math.max(18, entry.map.size.height * scale);
      const selected = index === this.selectedIndex;
      const color = entry.map.kind === 'route' ? 0x477151
        : entry.map.kind === 'town' ? 0x8f3340
          : entry.map.kind === 'home_town' ? COLORS.red
            : entry.map.kind === 'transition' ? 0x6c627a : 0x7f6831;
      fill(graphics, COLORS.ink, x - 2, y - 2, width + 4, height + 4);
      fill(graphics, color, x, y, width, height);
      if (selected) stroke(graphics, COLORS.event, 3, x - 3, y - 3, width + 6, height + 6);
      const fontSize = width < 34 ? 6 : 7;
      const label = this.track(this.add.text(x + width / 2, y + height / 2, SHORT_NAMES[entry.id], {
        fontFamily: 'monospace',
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color: '#fff7dd',
        align: 'center'
      }).setOrigin(0.5).setDepth(2));
      label.setData('regionLabel', true);
    });

    this.drawRegionHud();
  }

  drawRegionHud() {
    const mapId = ORDER[this.selectedIndex];
    const map = layouts.maps[mapId];
    const graphics = this.track(this.add.graphics().setDepth(1000).setScrollFactor(0));
    fill(graphics, COLORS.ink, 0, 0, WIDTH, 40, 0.98);
    fill(graphics, COLORS.red, 0, 0, 8, 40);
    fill(graphics, COLORS.ink, 0, 284, WIDTH, 36, 0.98);
    this.track(this.add.text(18, 7, 'SEASON ONE WORLD ATLAS', {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#f7e7b5'
    }).setDepth(1001).setScrollFactor(0));
    this.track(this.add.text(462, 8, `${String(this.selectedIndex + 1).padStart(2, '0')} / ${ORDER.length}`, {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#d3a52f'
    }).setOrigin(1, 0).setDepth(1001).setScrollFactor(0));
    this.track(this.add.text(18, 291, map.displayName.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#fff6dc'
    }).setDepth(1001).setScrollFactor(0));
    const status = `${map.size.width}x${map.size.height}  |  ${map.kind.replaceAll('_', ' ').toUpperCase()}  |  ${map.cameraReviews.length} VIEWS`;
    this.track(this.add.text(462, 292, status, {
      fontFamily: 'monospace', fontSize: '8px', color: '#bfb399'
    }).setOrigin(1, 0).setDepth(1001).setScrollFactor(0));
  }

  loadWorldMap(id, spawn = null) {
    this.clearView();
    this.mode = 'map';
    this.currentMapId = id;
    this.currentInteriorId = null;
    this.layout = layouts.maps[id];
    this.mapWidth = this.layout.size.width;
    this.mapHeight = this.layout.size.height;
    this.returnStack = [];
    this.drawWorldBlockout(this.layout);
    this.createPlayer(spawn || this.layout.start);
    this.configureMapCamera();
    this.drawMapHud();
  }

  loadInterior(id, returnEntry = null, spawn = null) {
    if (returnEntry) this.returnStack.push(returnEntry);
    this.clearView();
    this.mode = 'interior';
    this.currentInteriorId = id;
    this.layout = layouts.interiors[id];
    this.mapWidth = this.layout.size.width;
    this.mapHeight = this.layout.size.height;
    this.drawInteriorBlockout(this.layout);
    const defaultSpawn = spawn || {
      x: this.layout.exit.x,
      y: Math.max(1, this.layout.exit.y - 1),
      facing: 'up'
    };
    this.createPlayer(defaultSpawn);
    this.configureMapCamera();
    this.drawMapHud();
  }

  configureMapCamera() {
    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, this.mapWidth * CELL, this.mapHeight * CELL);
    this.centerCamera();
  }

  drawWorldBlockout(map) {
    if (this.currentMapId === campMetatiles.map.id) {
      this.drawCampRandallMetatiles(map);
      return;
    }
    this.metatilePlacements = null;
    this.metatileRenderCount = 0;
    const graphics = this.track(this.add.graphics().setDepth(0));
    const width = map.size.width * CELL;
    const height = map.size.height * CELL;
    const base = groundColor(map.ground);
    fill(graphics, base, 0, 0, width, height);
    for (let y = 9; y < height; y += 27) {
      for (let x = 12 + (y % 11); x < width; x += 53) fill(graphics, 0xffffff, x, y, 3, 2, 0.12);
    }
    for (const path of map.paths || []) {
      const x = path.x * CELL;
      const y = path.y * CELL;
      const pathWidth = path.width * CELL;
      const pathHeight = path.height * CELL;
      fill(graphics, COLORS.ink, x - 2, y - 2, pathWidth + 4, pathHeight + 4, 0.35);
      fill(graphics, pathColor(path.material), x, y, pathWidth, pathHeight);
      this.drawMaterialMarks(graphics, path, x, y, pathWidth, pathHeight);
    }
    for (const clearing of map.clearings || []) {
      fill(graphics, clearingColor(map.ground), clearing.x * CELL, clearing.y * CELL, clearing.width * CELL, clearing.height * CELL);
      stroke(graphics, 0x5e8a54, 2, clearing.x * CELL, clearing.y * CELL, clearing.width * CELL, clearing.height * CELL, 0.65);
    }
    for (const blocker of map.blockers || []) this.drawBlocker(graphics, blocker);
    for (const structure of map.buildings || []) this.drawStructure(graphics, structure);
    for (const landmark of map.landmarks || []) this.drawStructure(graphics, landmark, true);
    this.drawConnections(graphics, map);
    this.drawEvents(map.events || []);
    this.drawOverlays(map);
  }

  drawCampRandallMetatiles(map) {
    this.metatileRenderCount = 0;
    this.track(this.add.image(0, 0, 'camp-metatile-ground').setOrigin(0).setDepth(0));
    const terrain = campMetatiles.map.terrain;
    for (let y = 0; y < terrain.length; y += 1) {
      for (let x = 0; x < terrain[y].length; x += 1) {
        const material = terrain[y][x];
        if (material === 'grass') continue;
        const visual = campMetatiles.terrain.tiles[material];
        if (Number.isInteger(visual)) {
          this.track(this.add.image((x + 0.5) * CELL, (y + 0.5) * CELL, 'camp-metatile-atlas', visual).setDepth(1));
          this.metatileRenderCount += 1;
        }
      }
    }

    const owners = [...(map.blockers || []), ...(map.buildings || []), ...(map.landmarks || [])];
    this.metatilePlacements = owners.map(owner => ({...owner, stamp: campMetatiles.stamps[owner.id]}))
      .filter(entry => entry.stamp);
    for (const patch of campMetatiles.patches || []) {
      this.metatilePlacements.push({...patch, stamp: {...patch, cells: patch.cells}});
    }
    for (const placement of this.metatilePlacements) {
      for (let y = 0; y < placement.stamp.height; y += 1) {
        for (let x = 0; x < placement.stamp.width; x += 1) {
          const tile = campMetatiles.metatiles[placement.stamp.cells[y][x]];
          if (!tile) continue;
          const worldY = placement.y + y;
          this.track(this.add.image(
            (placement.x + x + 0.5) * CELL,
            (worldY + 0.5) * CELL,
            'camp-metatile-atlas',
            tile.visual
          ).setDepth((worldY + 1) * CELL - 1));
          this.metatileRenderCount += 1;
        }
      }
    }
    if (!this.playtestMode || this.overlayMode > 0) {
      this.drawConnections(this.track(this.add.graphics().setDepth(650)), map);
      this.drawEvents(map.events || []);
    }
    this.drawOverlays(map);
  }

  campMetatileAt(x, y) {
    if (!this.metatilePlacements) return null;
    for (const placement of [...this.metatilePlacements].reverse()) {
      if (!inRect(x, y, placement)) continue;
      const localX = x - placement.x;
      const localY = y - placement.y;
      const tileId = placement.stamp.cells[localY]?.[localX];
      if (tileId) return campMetatiles.metatiles[tileId] || null;
    }
    return null;
  }

  campGroundBehaviorAt(x, y) {
    const tileId = campMetatiles.map.terrain[y]?.[x];
    return campMetatiles.terrain.behaviors?.[tileId] || 'walkable';
  }

  drawMaterialMarks(graphics, path, x, y, width, height) {
    const horizontal = width >= height;
    if (horizontal) {
      for (let mark = x + 12; mark < x + width; mark += 28) line(graphics, 0xffffff, 2, mark, y + height / 2, mark + 8, y + height / 2, 0.2);
    } else {
      for (let mark = y + 12; mark < y + height; mark += 28) line(graphics, 0xffffff, 2, x + width / 2, mark, x + width / 2, mark + 8, 0.2);
    }
  }

  drawBlocker(graphics, blocker) {
    const x = blocker.x * CELL;
    const y = blocker.y * CELL;
    const width = blocker.width * CELL;
    const height = blocker.height * CELL;
    fill(graphics, blockerColor(blocker.kind), x, y, width, height);
    stroke(graphics, COLORS.ink, 2, x, y, width, height, 0.58);
    const step = blocker.kind.includes('water') ? 22 : 28;
    for (let py = y + 8; py < y + height; py += step) {
      for (let px = x + 7 + ((py / step) % 2) * 8; px < x + width; px += step) {
        fill(graphics, 0xffffff, px, py, 7, 3, 0.16);
      }
    }
  }

  drawStructure(graphics, structure, landmark = false) {
    const x = structure.x * CELL;
    const y = structure.y * CELL;
    const width = structure.width * CELL;
    const height = structure.height * CELL;
    const color = structureColor(structure.kind);
    if (structure.walkable) {
      fill(graphics, color, x, y, width, height, 0.28);
      stroke(graphics, COLORS.ink, 3, x, y, width, height, 0.88);
    } else {
      fill(graphics, COLORS.ink, x - 3, y - 3, width + 6, height + 6);
      fill(graphics, color, x, y, width, height);
      fill(graphics, 0xffffff, x + 5, y + 5, width - 10, 7, 0.26);
    }
    if (structure.kind === 'decision_required') {
      for (let px = x; px < x + width; px += 16) line(graphics, COLORS.event, 2, px, y, Math.min(x + width, px + height), y + Math.min(height, x + width - px), 0.45);
    }
    if (structure.door) {
      const doorX = structure.door.x * CELL;
      const doorY = structure.door.y * CELL;
      fill(graphics, COLORS.ink, doorX + 7, doorY + 3, 18, 29);
      fill(graphics, COLORS.paperDark, doorX + 11, doorY + 8, 10, 24);
    }
    const maxWidth = Math.max(44, width - 8);
    this.track(this.add.text(x + width / 2, y + height / 2 - (landmark ? 1 : 0), structure.name.toUpperCase(), {
      fontFamily: 'monospace',
      fontSize: `${width < 150 ? 7 : 8}px`,
      fontStyle: 'bold',
      color: structure.kind === 'decision_required' ? '#fff1a8' : '#211f24',
      align: 'center',
      wordWrap: {width: maxWidth}
    }).setOrigin(0.5).setDepth(4));
  }

  drawConnections(graphics, map) {
    for (const connection of map.connections || []) {
      for (let offset = 0; offset < connection.span; offset += 1) {
        let x = 0;
        let y = 0;
        if (connection.edge === 'north' || connection.edge === 'south') {
          x = (connection.start + offset) * CELL;
          y = connection.edge === 'north' ? 0 : (map.size.height - 1) * CELL;
        } else {
          x = connection.edge === 'west' ? 0 : (map.size.width - 1) * CELL;
          y = (connection.start + offset) * CELL;
        }
        fill(graphics, COLORS.connection, x, y, CELL, CELL, 0.68);
        stroke(graphics, COLORS.ink, 2, x + 2, y + 2, CELL - 4, CELL - 4, 0.8);
      }
    }
  }

  drawEvents(events) {
    events.forEach((event, index) => {
      const x = (event.x + 0.5) * CELL;
      const y = (event.y + 0.5) * CELL;
      const marker = this.track(this.add.circle(x, y, 9, COLORS.event, 0.95).setDepth(700));
      marker.setStrokeStyle(2, COLORS.ink, 1);
      this.track(this.add.text(x, y, String(index + 1), {
        fontFamily: 'monospace', fontSize: '9px', fontStyle: 'bold', color: '#211f24'
      }).setOrigin(0.5).setDepth(701));
    });
  }

  drawOverlays(map) {
    if (this.overlayMode === 0) return;
    const graphics = this.track(this.add.graphics().setDepth(600));
    if (this.overlayMode === 1) {
      for (let y = 0; y < map.size.height; y += 1) {
        for (let x = 0; x < map.size.width; x += 1) {
          fill(graphics, this.isWorldPassable(map, x, y) ? COLORS.open : COLORS.blocked, x * CELL, y * CELL, CELL, CELL, 0.18);
        }
      }
    }
    if (this.overlayMode === 2) {
      for (const review of map.cameraReviews || []) {
        stroke(graphics, COLORS.camera, 3, review.x * CELL + 2, review.y * CELL + 2, review.width * CELL - 4, review.height * CELL - 4, 0.9);
        this.track(this.add.text(review.x * CELL + 7, review.y * CELL + 7, review.label.toUpperCase(), {
          fontFamily: 'monospace', fontSize: '8px', fontStyle: 'bold', color: '#d8f5ff', backgroundColor: '#1b3542'
        }).setDepth(602));
      }
    }
    for (let x = 0; x <= map.size.width; x += 1) line(graphics, 0xffffff, 1, x * CELL + 0.5, 0, x * CELL + 0.5, map.size.height * CELL, 0.16);
    for (let y = 0; y <= map.size.height; y += 1) line(graphics, 0xffffff, 1, 0, y * CELL + 0.5, map.size.width * CELL, y * CELL + 0.5, 0.16);
  }

  drawInteriorBlockout(interior) {
    const graphics = this.track(this.add.graphics().setDepth(0));
    const width = interior.size.width * CELL;
    const height = interior.size.height * CELL;
    fill(graphics, 0x242126, 0, 0, width, height);
    fill(graphics, 0xd6bd87, 12, 12, width - 24, height - 24);
    fill(graphics, 0xa52335, 12, 78, width - 24, 12);
    for (let y = 98; y < height - 16; y += 18) line(graphics, 0xecd7a3, 2, 16, y, width - 16, y, 0.78);
    for (const fixture of interior.fixtures || []) {
      const x = fixture.x * CELL;
      const y = fixture.y * CELL;
      const fixtureWidth = fixture.width * CELL;
      const fixtureHeight = fixture.height * CELL;
      fill(graphics, COLORS.ink, x - 2, y - 2, fixtureWidth + 4, fixtureHeight + 4);
      fill(graphics, fixture.to ? COLORS.connection : COLORS.building, x, y, fixtureWidth, fixtureHeight);
      this.track(this.add.text(x + fixtureWidth / 2, y + fixtureHeight / 2, fixture.name.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '8px', fontStyle: 'bold', color: '#211f24', align: 'center', wordWrap: {width: fixtureWidth - 8}
      }).setOrigin(0.5).setDepth(4));
    }
    const exitX = interior.exit.x * CELL;
    const exitY = interior.exit.y * CELL;
    fill(graphics, COLORS.connection, exitX, exitY, CELL, CELL, 0.75);
    stroke(graphics, COLORS.ink, 2, exitX + 2, exitY + 2, CELL - 4, CELL - 4);
    stroke(graphics, COLORS.paperDark, 3, 5, 5, width - 10, height - 10);
    this.drawEvents(interior.events || []);
    this.drawInteriorOverlay(interior);
  }

  drawInteriorOverlay(interior) {
    if (this.overlayMode === 0) return;
    const graphics = this.track(this.add.graphics().setDepth(600));
    for (let x = 0; x <= interior.size.width; x += 1) line(graphics, 0xffffff, 1, x * CELL + 0.5, 0, x * CELL + 0.5, interior.size.height * CELL, 0.18);
    for (let y = 0; y <= interior.size.height; y += 1) line(graphics, 0xffffff, 1, 0, y * CELL + 0.5, interior.size.width * CELL, y * CELL + 0.5, 0.18);
    if (this.overlayMode === 1) {
      for (let y = 0; y < interior.size.height; y += 1) {
        for (let x = 0; x < interior.size.width; x += 1) fill(graphics, this.isInteriorPassable(interior, x, y) ? COLORS.open : COLORS.blocked, x * CELL, y * CELL, CELL, CELL, 0.17);
      }
    }
  }

  createPlayer(spawn) {
    this.tilePos = {x: spawn.x, y: spawn.y};
    this.facing = DIRS[spawn.facing] ? spawn.facing : 'down';
    const position = this.worldPosition(spawn.x, spawn.y);
    this.shadow = this.track(this.add.ellipse(position.x, position.y - 3, 25, 8, 0x101614, 0.42).setDepth(position.y - 1));
    this.player = this.track(this.add.sprite(position.x, position.y, 'atlas-player-down').setOrigin(0.5, 1).setDepth(position.y));
    this.setFacing(this.facing);
  }

  worldPosition(x, y) {
    return {x: (x + 0.5) * CELL, y: (y + 1) * CELL};
  }

  centerCamera() {
    if (!this.player) return;
    const maxX = Math.max(0, this.mapWidth * CELL - WIDTH);
    const maxY = Math.max(0, this.mapHeight * CELL - HEIGHT);
    const scrollX = Phaser.Math.Clamp(this.player.x - WIDTH / 2, 0, maxX);
    const scrollY = Phaser.Math.Clamp(this.player.y - 32 - HEIGHT / 2, 0, maxY);
    this.cameras.main.setScroll(Math.round(scrollX), Math.round(scrollY));
  }

  drawMapHud() {
    const graphics = this.track(this.add.graphics().setScrollFactor(0).setDepth(2000));
    fill(graphics, COLORS.ink, 0, 0, WIDTH, 28, 0.95);
    fill(graphics, COLORS.red, 0, 0, 7, 28);
    fill(graphics, COLORS.ink, 0, 294, WIDTH, 26, 0.94);
    const name = this.mode === 'interior' ? this.layout.displayName : layouts.maps[this.currentMapId].displayName;
    this.track(this.add.text(16, 7, name.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#fff0bc'
    }).setScrollFactor(0).setDepth(2001));
    const overlay = this.playtestMode && this.currentMapId === campMetatiles.map.id && this.overlayMode === 0
      ? 'METATILE PLAYTEST'
      : ['CLEAN BLOCKOUT', 'OWNERSHIP', 'CAMERA WINDOWS'][this.overlayMode];
    this.track(this.add.text(466, 8, overlay, {
      fontFamily: 'monospace', fontSize: '8px', color: '#c8bea5'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2001));
    const position = this.tilePos ? `${this.tilePos.x},${this.tilePos.y}` : '';
    this.track(this.add.text(14, 301, `${this.mapWidth}x${this.mapHeight} CELLS`, {
      fontFamily: 'monospace', fontSize: '8px', color: '#bfb399'
    }).setScrollFactor(0).setDepth(2001));
    this.positionText = this.track(this.add.text(466, 301, position, {
      fontFamily: 'monospace', fontSize: '8px', color: '#d3a52f'
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(2001));
  }

  handleVirtualButton(key, phase = 'press') {
    if (DIRS[key]) {
      if (phase === 'up') {
        if (this.heldDirection === key) this.heldDirection = null;
        if (this.pendingDirection === key) this.pendingDirection = null;
        return;
      }
      if (phase === 'down') this.heldDirection = key;
      this.handleDirection(key);
      return;
    }
    if (phase === 'up') return;
    if (key === 'a') {
      if (this.mode === 'region') this.loadWorldMap(ORDER[this.selectedIndex]);
      else this.interact();
      return;
    }
    if (key === 'b' || key === 'menu') {
      if (this.messageOpen) this.closeMessage();
      else this.drawRegion();
      return;
    }
    if (key === 'save' && this.mode !== 'region') {
      this.overlayMode = (this.overlayMode + 1) % 3;
      if (this.mode === 'map') this.loadWorldMap(this.currentMapId, {...this.tilePos, facing: this.facing});
      else this.reloadInteriorPreservingState();
    }
  }

  handleDirection(direction) {
    if (this.inputLocked || this.messageOpen) return;
    if (this.mode === 'region') {
      const delta = direction === 'left' || direction === 'up' ? -1 : 1;
      this.selectedIndex = (this.selectedIndex + delta + ORDER.length) % ORDER.length;
      this.drawRegion();
      return;
    }
    this.queueDirection(direction);
  }

  queueDirection(direction) {
    if (!this.player || this.inputLocked || this.messageOpen) return;
    if (this.moving) {
      this.pendingDirection = direction;
      return;
    }
    if (this.facing !== direction) {
      this.setFacing(direction);
      return;
    }
    this.tryStep(direction);
  }

  setFacing(direction) {
    this.facing = direction;
    if (!this.player) return;
    const textureDirection = direction === 'left' ? 'right' : direction;
    this.player.setTexture(`atlas-player-${textureDirection}`);
    this.player.setFlipX(direction === 'left');
  }

  tryStep(direction) {
    const vector = DIRS[direction];
    const target = {x: this.tilePos.x + vector.dx, y: this.tilePos.y + vector.dy};
    const passable = this.mode === 'map'
      ? this.isWorldPassable(this.layout, target.x, target.y)
      : this.isInteriorPassable(this.layout, target.x, target.y);
    if (!passable) {
      this.bump(vector);
      return;
    }
    this.moving = true;
    this.pendingDirection = null;
    const position = this.worldPosition(target.x, target.y);
    this.tweens.add({
      targets: this.player,
      x: position.x,
      y: position.y,
      duration: 165,
      ease: 'Linear',
      onUpdate: () => {
        this.player.setDepth(Math.round(this.player.y));
        this.centerCamera();
      }
    });
    this.tweens.add({
      targets: this.shadow,
      x: position.x,
      y: position.y - 3,
      duration: 165,
      ease: 'Linear',
      onUpdate: () => this.shadow.setDepth(Math.round(this.shadow.y)),
      onComplete: () => this.finishStep(target)
    });
  }

  bump(vector) {
    if (this.moving) return;
    const origin = this.worldPosition(this.tilePos.x, this.tilePos.y);
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: origin.x + vector.dx * 3,
      y: origin.y + vector.dy * 3,
      duration: 45,
      yoyo: true,
      onComplete: () => {
        this.player.setPosition(origin.x, origin.y);
        this.moving = false;
      }
    });
  }

  finishStep(target) {
    this.tilePos = target;
    this.moving = false;
    this.setFacing(this.facing);
    this.player.setDepth(this.player.y);
    this.shadow.setDepth(this.player.y - 1);
    this.positionText?.setText(`${target.x},${target.y}`);
    if (this.mode === 'map' && this.handleWorldThreshold(target)) return;
    if (this.mode === 'interior' && this.handleInteriorThreshold(target)) return;
    const next = this.pendingDirection || this.heldDirection;
    this.pendingDirection = null;
    if (next) this.time.delayedCall(12, () => this.queueDirection(next));
  }

  handleWorldThreshold(target) {
    const structure = [...(this.layout.buildings || []), ...(this.layout.landmarks || [])]
      .find(entry => entry.interior && doorAt(entry, target.x, target.y));
    if (structure && (!structure.gate || structure.gate === 'always')) {
      const returnSpawn = this.outsideDoorSpawn(structure.door);
      this.transition(() => this.loadInterior(structure.interior, {
        type: 'map', id: this.currentMapId, spawn: returnSpawn
      }));
      return true;
    }
    const connection = (this.layout.connections || []).find(entry => connectionContains(this.layout, entry, target.x, target.y));
    if (!connection) return false;
    const destination = layouts.maps[connection.to];
    const offset = connection.edge === 'north' || connection.edge === 'south'
      ? target.x - connection.start : target.y - connection.start;
    const spawn = this.connectionSpawn(destination, connection.toEdge, connection.toStart + offset);
    this.selectedIndex = ORDER.indexOf(connection.to);
    this.transition(() => this.loadWorldMap(connection.to, spawn));
    return true;
  }

  handleInteriorThreshold(target) {
    const fixture = (this.layout.fixtures || []).find(entry => entry.to && inRect(target.x, target.y, entry));
    if (fixture) {
      const current = this.currentInteriorId;
      this.transition(() => this.loadInterior(fixture.to, {
        type: 'interior', id: current, spawn: {x: target.x, y: Math.min(this.layout.size.height - 2, target.y + 1), facing: 'down'}
      }));
      return true;
    }
    if (target.x !== this.layout.exit.x || target.y !== this.layout.exit.y) return false;
    const destination = this.returnStack.pop();
    if (!destination) {
      this.drawRegion();
      return true;
    }
    this.transition(() => {
      if (destination.type === 'map') this.loadWorldMap(destination.id, destination.spawn);
      else this.loadInterior(destination.id, null, destination.spawn);
    });
    return true;
  }

  transition(callback) {
    this.inputLocked = true;
    this.heldDirection = null;
    this.cameras.main.fadeOut(90, 20, 18, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      callback();
      this.cameras.main.fadeIn(110, 20, 18, 20);
      this.inputLocked = false;
    });
  }

  outsideDoorSpawn(door) {
    const candidates = [
      {x: door.x, y: door.y + 1, facing: 'down'},
      {x: door.x, y: door.y - 1, facing: 'up'},
      {x: door.x - 1, y: door.y, facing: 'left'},
      {x: door.x + 1, y: door.y, facing: 'right'}
    ];
    return candidates.find(candidate => this.isWorldPassable(this.layout, candidate.x, candidate.y)) || {...this.layout.start};
  }

  connectionSpawn(map, edge, axis) {
    if (edge === 'north') return {x: axis, y: 0, facing: 'down'};
    if (edge === 'south') return {x: axis, y: map.size.height - 1, facing: 'up'};
    if (edge === 'west') return {x: 0, y: axis, facing: 'right'};
    return {x: map.size.width - 1, y: axis, facing: 'left'};
  }

  isWorldPassable(map, x, y) {
    if (x < 0 || y < 0 || x >= map.size.width || y >= map.size.height) return false;
    if ((map.connections || []).some(connection => connectionContains(map, connection, x, y))) return true;
    if (this.currentMapId === campMetatiles.map.id) {
      const structureBehavior = this.campMetatileAt(x, y)?.behavior;
      if (structureBehavior === 'solid') return false;
      if (structureBehavior === 'warp') return true;
      return !['solid', 'water'].includes(this.campGroundBehaviorAt(x, y));
    }
    if ((map.buildings || []).some(entry => doorAt(entry, x, y))) return true;
    if ((map.landmarks || []).some(entry => doorAt(entry, x, y))) return true;
    if ((map.blockers || []).some(entry => blocksAt(entry, x, y))) return false;
    if ((map.buildings || []).some(entry => blocksAt(entry, x, y))) return false;
    if ((map.landmarks || []).some(entry => !entry.walkable && blocksAt(entry, x, y))) return false;
    if (map.walkableMode === 'open') return true;
    return (map.paths || []).some(entry => inRect(x, y, entry))
      || (map.clearings || []).some(entry => inRect(x, y, entry))
      || (map.landmarks || []).some(entry => entry.walkable && inRect(x, y, entry));
  }

  isInteriorPassable(interior, x, y) {
    if (x < 0 || y < 0 || x >= interior.size.width || y >= interior.size.height) return false;
    if (x === interior.exit.x && y === interior.exit.y) return true;
    if (x === 0 || y === 0 || x === interior.size.width - 1 || y === interior.size.height - 1) {
      return (interior.fixtures || []).some(entry => (entry.to || entry.walkable) && inRect(x, y, entry));
    }
    return !(interior.fixtures || []).some(entry => !entry.to && !entry.walkable && blocksAt(entry, x, y));
  }

  pass(x, y) {
    if (!this.layout) return false;
    return this.mode === 'map'
      ? this.isWorldPassable(this.layout, x, y)
      : this.isInteriorPassable(this.layout, x, y);
  }

  reloadInteriorPreservingState() {
    const id = this.currentInteriorId;
    const stack = [...this.returnStack];
    const spawn = {...this.tilePos, facing: this.facing};
    this.clearView();
    this.mode = 'interior';
    this.currentInteriorId = id;
    this.layout = layouts.interiors[id];
    this.mapWidth = this.layout.size.width;
    this.mapHeight = this.layout.size.height;
    this.returnStack = stack;
    this.drawInteriorBlockout(this.layout);
    this.createPlayer(spawn);
    this.configureMapCamera();
    this.drawMapHud();
  }

  interact() {
    if (this.messageOpen) {
      this.closeMessage();
      return;
    }
    const vector = DIRS[this.facing];
    const cells = [
      {x: this.tilePos.x, y: this.tilePos.y},
      {x: this.tilePos.x + vector.dx, y: this.tilePos.y + vector.dy}
    ];
    const event = (this.layout.events || []).find(entry => cells.some(cell => cell.x === entry.x && cell.y === entry.y));
    if (event) {
      this.showMessage(`BEAT ${event.beat || '-'}  |  ${event.label}`);
      return;
    }
    const structures = this.mode === 'map'
      ? [...(this.layout.buildings || []), ...(this.layout.landmarks || [])]
      : this.layout.fixtures || [];
    const structure = structures.find(entry => cells.some(cell => inRect(cell.x, cell.y, entry)));
    if (structure) this.showMessage(structure.name || structure.id);
  }

  showMessage(message) {
    this.closeMessage();
    this.messageOpen = true;
    this.message = message;
    const container = this.track(this.add.container(0, 0).setScrollFactor(0).setDepth(4000));
    const graphics = this.add.graphics();
    fill(graphics, COLORS.ink, 10, 238, 460, 70, 0.96);
    fill(graphics, COLORS.paper, 14, 242, 452, 62);
    stroke(graphics, COLORS.red, 2, 18, 246, 444, 54);
    const text = this.add.text(30, 259, message, {
      fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color: '#211f24', wordWrap: {width: 410}
    });
    container.add([graphics, text]);
    this.messageBox = container;
  }

  closeMessage() {
    if (!this.messageBox) return;
    const box = this.messageBox;
    this.messageBox = null;
    this.viewObjects = this.viewObjects.filter(object => object !== box);
    box.destroy(true);
    this.messageOpen = false;
    this.message = '';
  }
}
