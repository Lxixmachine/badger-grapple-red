import {
  SLICE_CAMERA_COLS,
  SLICE_CAMERA_ROWS,
  SLICE_CELL,
  SLICE_NATIVE_HEIGHT,
  SLICE_NATIVE_WIDTH,
  visualSliceMap
} from '../data/visualSliceMaps.js';
import {FONT,setVirtualHandler} from '../systems/ui.js';

const Phaser = window.Phaser;

const COLORS = {
  grass: 0x75b85d,
  grassDark: 0x4c8d49,
  grassLight: 0x9acb6f,
  outline: 0x292523,
  shadow: 0x3e5938,
  brick: 0xaa342e,
  brickDark: 0x762823,
  brickLight: 0xcc5145,
  cream: 0xead39b,
  creamLight: 0xf4e2b3,
  creamDark: 0xb99360,
  stone: 0xc7b791,
  stoneLight: 0xe2d4ae,
  stoneDark: 0x887a62,
  glass: 0x8eb7b5,
  glassLight: 0xc5dcce,
  hedge: 0x29673b,
  hedgeLight: 0x4d944e,
  trunk: 0x704128,
  trunkLight: 0x99613b,
  red: 0xb61f32,
  redDark: 0x751827,
  skin: 0xc98b64,
  hair: 0x34231f,
  shoe: 0x202027,
  navy: 0x263c59,
  navyLight: 0x46637e,
  floor: 0xcaa86e,
  floorLight: 0xe1c58c,
  floorDark: 0xa47d4f,
  wall: 0xdac28e,
  wallLight: 0xf0dda9,
  wallDark: 0xa4774b,
  locker: 0xa72131,
  lockerLight: 0xcd4050,
  lockerDark: 0x6f1825,
  gold: 0xd4a746,
  white: 0xfff6dc
};

const DIRECTIONS = {
  up: {dx: 0, dy: -1},
  down: {dx: 0, dy: 1},
  left: {dx: -1, dy: 0},
  right: {dx: 1, dy: 0}
};

const keyFor = (x, y) => `${x},${y}`;

function fill(graphics, color, x, y, width, height, alpha = 1) {
  graphics.fillStyle(color, alpha);
  graphics.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

function stroke(graphics, color, width, x, y, rectWidth, rectHeight, alpha = 1) {
  graphics.lineStyle(width, color, alpha);
  graphics.strokeRect(Math.round(x), Math.round(y), Math.round(rectWidth), Math.round(rectHeight));
}

function line(graphics, color, width, x1, y1, x2, y2, alpha = 1) {
  graphics.lineStyle(width, color, alpha);
  graphics.lineBetween(Math.round(x1), Math.round(y1), Math.round(x2), Math.round(y2));
}

export class VisualSliceScene extends Phaser.Scene {
  constructor() {
    super('VisualSliceScene');
    this.sliceVersion = 1;
    this.cellSize = SLICE_CELL;
    this.nativeWidth = SLICE_NATIVE_WIDTH;
    this.nativeHeight = SLICE_NATIVE_HEIGHT;
    this.cameraTilesWide = SLICE_CAMERA_COLS;
    this.cameraTilesHigh = SLICE_CAMERA_ROWS;
  }

  create() {
    this.worldObjects = [];
    this.depthObjects = [];
    this.actorObjects = [];
    this.messageOpen = false;
    this.message = '';
    this.inputLocked = false;
    this.moving = false;
    this.pendingDirection = null;
    this.heldDirection = null;
    this.facing = 'up';
    this.tilePos = {x: 0, y: 0};
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#1b1718');

    this.createActorTextures();
    this.createAnimations();
    this.bindKeyboard();
    setVirtualHandler(this);

    const params = new URLSearchParams(window.location.search);
    const requestedArea = params.get('area') === 'teamRoom' ? 'teamRoom' : 'exterior';
    const map = visualSliceMap(requestedArea);
    const requestedX = Number(params.get('x'));
    const requestedY = Number(params.get('y'));
    const hasRequestedSpawn = params.has('x') && params.has('y')
      && Number.isInteger(requestedX) && Number.isInteger(requestedY);
    const spawn = hasRequestedSpawn
      ? {x: requestedX, y: requestedY, facing: params.get('facing') || map.spawn.facing}
      : map.spawn;

    this.ownershipVisible = params.has('ownership');
    this.loadArea(requestedArea, spawn, false);
    this.showAreaToast(map.label);
  }

  bindKeyboard() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      aMove: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      action: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      cancel: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    const directionKeys = [
      [keys.up, 'up'], [keys.w, 'up'],
      [keys.down, 'down'], [keys.s, 'down'],
      [keys.left, 'left'], [keys.aMove, 'left'],
      [keys.right, 'right'], [keys.d, 'right']
    ];
    directionKeys.forEach(([key, direction]) => {
      key.on('down', () => this.handleVirtualButton(direction, 'down'));
      key.on('up', () => this.handleVirtualButton(direction, 'up'));
    });
    keys.action.on('down', () => this.handleVirtualButton('a'));
    keys.enter.on('down', () => this.handleVirtualButton('a'));
    keys.cancel.on('down', () => this.handleVirtualButton('b'));
    this.holdClock = this.time.addEvent({
      delay: 145,
      loop: true,
      callback: () => {
        if (this.heldDirection) this.queueDirection(this.heldDirection);
      }
    });
  }

  createActorTextures() {
    const playerPalette = {
      hair: COLORS.hair,
      skin: COLORS.skin,
      body: COLORS.red,
      bodyDark: COLORS.redDark,
      accent: COLORS.creamLight,
      shoe: COLORS.shoe
    };
    const coachPalette = {
      hair: 0x2b211f,
      skin: 0xb97955,
      body: COLORS.navy,
      bodyDark: 0x17283d,
      accent: COLORS.navyLight,
      shoe: 0x19191e
    };
    ['down', 'up', 'right'].forEach(direction => {
      [0, 1, 2].forEach(step => {
        this.generateWrestlerTexture(`slice-player-${direction}-${step}`, direction, step, playerPalette);
        this.generateWrestlerTexture(`slice-coach-${direction}-${step}`, direction, step, coachPalette);
      });
    });
  }

  generateWrestlerTexture(key, direction, step, palette) {
    if (this.textures.exists(key)) return;
    const graphics = this.make.graphics({x: 0, y: 0, add: false});
    const bob = step === 1 ? 1 : 0;
    const legOffset = step === 0 ? -2 : step === 2 ? 2 : 0;
    const rect = (x, y, width, height, color) => fill(graphics, color, x, y + bob, width, height);

    if (direction === 'down') {
      rect(8, 4, 16, 18, palette.hair);
      rect(10, 10, 12, 14, palette.skin);
      rect(8, 5, 16, 7, palette.hair);
      rect(8, 11, 4, 9, palette.hair);
      rect(20, 11, 4, 9, palette.hair);
      rect(12, 17, 2, 2, COLORS.outline);
      rect(18, 17, 2, 2, COLORS.outline);
      rect(8, 25, 16, 24, palette.body);
      rect(11, 28, 10, 18, palette.bodyDark);
      rect(14, 27, 4, 20, palette.accent);
      rect(3, 28, 6, 21, palette.skin);
      rect(23, 28, 6, 21, palette.skin);
      rect(2, 45, 8, 7, palette.bodyDark);
      rect(22, 45, 8, 7, palette.bodyDark);
      rect(9 + legOffset, 48, 7, 12, palette.bodyDark);
      rect(17 - legOffset, 48, 7, 12, palette.bodyDark);
      rect(7 + legOffset, 58, 10, 6, palette.shoe);
      rect(16 - legOffset, 58, 10, 6, palette.shoe);
      rect(9 + legOffset, 59, 7, 2, palette.accent);
      rect(17 - legOffset, 59, 7, 2, palette.accent);
    } else if (direction === 'up') {
      rect(8, 4, 16, 20, palette.hair);
      rect(10, 8, 12, 14, palette.hair);
      rect(8, 25, 16, 24, palette.bodyDark);
      rect(11, 27, 10, 19, palette.body);
      rect(14, 29, 4, 15, palette.accent);
      rect(3, 28, 6, 21, palette.skin);
      rect(23, 28, 6, 21, palette.skin);
      rect(2, 45, 8, 7, palette.bodyDark);
      rect(22, 45, 8, 7, palette.bodyDark);
      rect(9 + legOffset, 48, 7, 12, palette.bodyDark);
      rect(17 - legOffset, 48, 7, 12, palette.bodyDark);
      rect(7 + legOffset, 58, 10, 6, palette.shoe);
      rect(16 - legOffset, 58, 10, 6, palette.shoe);
    } else {
      rect(9, 4, 15, 19, palette.hair);
      rect(13, 10, 13, 14, palette.skin);
      rect(9, 5, 15, 7, palette.hair);
      rect(10, 12, 4, 9, palette.hair);
      rect(22, 16, 2, 2, COLORS.outline);
      rect(9, 25, 15, 24, palette.body);
      rect(11, 28, 10, 18, palette.bodyDark);
      rect(15, 27, 4, 20, palette.accent);
      rect(5, 29, 6, 21, palette.skin);
      rect(23, 29, 6, 20, palette.skin);
      rect(3, 45, 9, 7, palette.bodyDark);
      rect(22, 45, 8, 7, palette.bodyDark);
      rect(9 + legOffset, 48, 7, 12, palette.bodyDark);
      rect(17 - legOffset, 48, 7, 12, palette.bodyDark);
      rect(7 + legOffset, 58, 10, 6, palette.shoe);
      rect(16 - legOffset, 58, 10, 6, palette.shoe);
    }
    graphics.generateTexture(key, 32, 64);
    graphics.destroy();
  }

  createAnimations() {
    ['player', 'coach'].forEach(actor => {
      ['down', 'up', 'right'].forEach(direction => {
        const key = `slice-${actor}-walk-${direction}`;
        if (this.anims.exists(key)) return;
        this.anims.create({
          key,
          frames: [0, 1, 2, 1].map(step => ({key: `slice-${actor}-${direction}-${step}`})),
          frameRate: 10,
          repeat: -1
        });
      });
    });
  }

  track(object) {
    this.worldObjects.push(object);
    return object;
  }

  clearWorld() {
    this.tweens.killAll();
    this.worldObjects.forEach(object => object?.destroy?.());
    this.worldObjects = [];
    this.depthObjects = [];
    this.actorObjects = [];
    this.player = null;
    this.shadow = null;
  }

  loadArea(area, spawn, transition = true) {
    this.clearWorld();
    this.area = area;
    this.map = visualSliceMap(area);
    this.mapWidth = this.map.width;
    this.mapHeight = this.map.height;
    this.blockedSet = new Set(this.map.blocked.map(([x, y]) => keyFor(x, y)));
    this.messageOpen = false;
    this.message = '';
    this.pendingDirection = null;
    this.moving = false;

    if (this.map.kind === 'exterior') this.drawExterior();
    else this.drawInterior();
    this.drawMapObjects();
    this.drawActors();
    this.createPlayer(spawn || this.map.spawn);
    if (this.ownershipVisible) this.drawOwnershipOverlay();

    const width = this.map.width * SLICE_CELL;
    const height = this.map.height * SLICE_CELL;
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.setZoom(1);
    this.cameras.main.stopFollow();
    this.centerCameraOnPlayer();
    this.cameras.main.roundPixels = true;
    this.inputLocked = false;
    if (transition) this.showAreaToast(this.map.label);
  }

  drawExterior() {
    const graphics = this.track(this.add.graphics().setDepth(0));
    const width = this.map.width * SLICE_CELL;
    const height = this.map.height * SLICE_CELL;
    fill(graphics, COLORS.grass, 0, 0, width, height);

    for (let y = 10; y < height; y += 24) {
      for (let x = 12 + ((y / 24) % 2) * 19; x < width; x += 51) {
        fill(graphics, COLORS.grassLight, x, y, 4, 2);
        fill(graphics, COLORS.grassDark, x + 5, y + 4, 2, 4);
      }
    }

    this.drawExteriorPath(graphics);
    this.drawBuilding(graphics);
    this.drawFlowerBeds(graphics);
    this.drawCampusEdge(graphics, width, height);
  }

  drawExteriorPath(graphics) {
    const {building} = this.map;
    const doorCenter = (building.door.x + 0.5) * SLICE_CELL;
    const landingX = building.landing.x * SLICE_CELL;
    const landingY = building.landing.y * SLICE_CELL;
    const landingWidth = building.landing.width * SLICE_CELL;
    fill(graphics, COLORS.outline, landingX - 4, landingY - 4, landingWidth + 8, SLICE_CELL + 8);
    fill(graphics, COLORS.stone, landingX, landingY, landingWidth, SLICE_CELL);
    line(graphics, COLORS.stoneLight, 2, landingX, landingY + 15, landingX + landingWidth, landingY + 15);
    for (let x = landingX + 16; x < landingX + landingWidth; x += 32) {
      line(graphics, COLORS.stoneDark, 2, x, landingY, x, landingY + SLICE_CELL);
    }

    const pathWidth = building.path.width * SLICE_CELL;
    const pathX = doorCenter - pathWidth / 2;
    const pathY = building.path.y * SLICE_CELL;
    const pathHeight = this.map.height * SLICE_CELL - pathY;
    fill(graphics, COLORS.brickDark, pathX - 4, pathY, pathWidth + 8, pathHeight);
    fill(graphics, COLORS.brick, pathX, pathY, pathWidth, pathHeight);
    for (let y = pathY + 12; y < pathY + pathHeight; y += 16) {
      line(graphics, COLORS.brickDark, 2, pathX, y, pathX + pathWidth, y);
      const offset = Math.floor((y - pathY) / 16) % 2 ? 16 : 0;
      for (let x = pathX + offset; x < pathX + pathWidth; x += 32) {
        line(graphics, COLORS.brickLight, 2, x, y - 10, x, y + 6);
      }
    }
  }

  drawBuilding(graphics) {
    const {building} = this.map;
    const x = building.x * SLICE_CELL;
    const y = building.y * SLICE_CELL;
    const width = building.width * SLICE_CELL;
    const height = building.height * SLICE_CELL;
    const wallY = y + 62;
    const doorX = building.door.x * SLICE_CELL;

    fill(graphics, COLORS.shadow, x - 6, y + height - 8, width + 12, 18, 0.52);
    fill(graphics, COLORS.outline, x, wallY, width, height - 62);
    fill(graphics, COLORS.cream, x + 6, wallY + 6, width - 12, height - 74);
    for (let row = wallY + 20; row < y + height - 4; row += 16) {
      line(graphics, COLORS.creamDark, 2, x + 8, row, x + width - 8, row, 0.78);
    }
    for (let col = x + 16; col < x + width - 8; col += 32) {
      line(graphics, 0xd8bd85, 2, col, wallY + 8, col, y + height - 8, 0.72);
    }

    graphics.fillStyle(COLORS.outline, 1);
    graphics.fillTriangle(x - 4, wallY + 4, x + 20, y + 16, x + 72, y - 4);
    graphics.fillTriangle(x + width + 4, wallY + 4, x + width - 20, y + 16, x + width - 72, y - 4);
    fill(graphics, COLORS.outline, x + 52, y - 4, width - 104, 14);
    graphics.fillStyle(COLORS.redDark, 1);
    graphics.fillTriangle(x + 4, wallY, x + 26, y + 21, x + 76, y + 2);
    graphics.fillTriangle(x + width - 4, wallY, x + width - 26, y + 21, x + width - 76, y + 2);
    fill(graphics, COLORS.redDark, x + 66, y + 2, width - 132, 48);
    graphics.fillStyle(COLORS.red, 1);
    graphics.fillTriangle(x + 12, wallY - 6, x + 34, y + 25, x + 80, y + 8);
    graphics.fillTriangle(x + width - 12, wallY - 6, x + width - 34, y + 25, x + width - 80, y + 8);
    fill(graphics, COLORS.red, x + 74, y + 8, width - 148, 40);
    for (let roofY = y + 14; roofY < wallY - 4; roofY += 10) {
      line(graphics, COLORS.brickLight, 2, x + 28, roofY, x + width - 28, roofY, 0.82);
    }
    for (let roofX = x + 46; roofX < x + width - 30; roofX += 26) {
      line(graphics, COLORS.redDark, 2, roofX, y + 8, roofX - 8, wallY - 6, 0.85);
    }
    fill(graphics, COLORS.outline, x - 6, wallY - 7, width + 12, 14);
    fill(graphics, COLORS.stoneLight, x + 2, wallY - 4, width - 4, 6);

    this.drawWindow(graphics, x + 28, wallY + 28);
    this.drawWindow(graphics, x + 76, wallY + 28);
    this.drawWindow(graphics, x + width - 108, wallY + 28);
    this.drawWindow(graphics, x + width - 60, wallY + 28);

    fill(graphics, COLORS.outline, doorX - 8, wallY + 8, 48, 28);
    fill(graphics, COLORS.redDark, doorX - 4, wallY + 12, 40, 20);
    fill(graphics, COLORS.creamLight, doorX + 11, wallY + 14, 10, 14);
    fill(graphics, COLORS.creamDark, doorX - 8, wallY + 36, 48, y + height - wallY - 36);
    fill(graphics, COLORS.outline, doorX, wallY + 36, SLICE_CELL, y + height - wallY - 36);
    fill(graphics, 0x5b2f2a, doorX + 6, wallY + 42, 20, y + height - wallY - 48);
    fill(graphics, COLORS.redDark, doorX + 9, wallY + 45, 14, y + height - wallY - 54);
    fill(graphics, COLORS.stoneLight, doorX + 23, wallY + 60, 4, 4);
    fill(graphics, COLORS.stoneLight, doorX - 8, y + height - 8, 48, 8);

    fill(graphics, COLORS.creamDark, x + 8, wallY + 4, 14, height - 72);
    fill(graphics, COLORS.creamLight, x + 13, wallY + 8, 6, height - 80);
    fill(graphics, COLORS.creamDark, x + width - 22, wallY + 4, 14, height - 72);
    fill(graphics, COLORS.creamLight, x + width - 19, wallY + 8, 6, height - 80);
  }

  drawWindow(graphics, x, y) {
    fill(graphics, COLORS.creamDark, x, y, 32, 32);
    fill(graphics, COLORS.outline, x + 4, y + 4, 24, 22);
    fill(graphics, COLORS.glass, x + 8, y + 8, 16, 14);
    fill(graphics, COLORS.glassLight, x + 10, y + 8, 4, 12);
    line(graphics, COLORS.outline, 2, x + 16, y + 8, x + 16, y + 22);
    fill(graphics, COLORS.stoneLight, x + 4, y + 26, 24, 4);
  }

  drawFlowerBeds(graphics) {
    const beds = [{x: 6, width: 3}, {x: 12, width: 3}];
    beds.forEach(bed => {
      const x = bed.x * SLICE_CELL;
      const y = 6 * SLICE_CELL;
      fill(graphics, COLORS.outline, x, y + 14, bed.width * SLICE_CELL, 18);
      fill(graphics, COLORS.hedge, x + 4, y + 16, bed.width * SLICE_CELL - 8, 12);
      for (let flowerX = x + 10; flowerX < x + bed.width * SLICE_CELL - 6; flowerX += 18) {
        fill(graphics, flowerX % 36 < 18 ? COLORS.red : COLORS.creamLight, flowerX, y + 9, 6, 7);
        fill(graphics, COLORS.hedgeLight, flowerX + 2, y + 15, 3, 5);
      }
    });
  }

  drawCampusEdge(graphics, width, height) {
    fill(graphics, COLORS.hedge, 0, 0, width, 12);
    fill(graphics, COLORS.hedgeLight, 0, 4, width, 5);
    fill(graphics, COLORS.hedge, 0, height - 16, width, 16);
    fill(graphics, COLORS.hedgeLight, 0, height - 16, width, 6);
    for (let x = 8; x < width; x += 28) {
      fill(graphics, COLORS.grassLight, x, 3, 8, 5);
      fill(graphics, COLORS.grassDark, x + 12, height - 12, 7, 5);
    }
  }

  drawInterior() {
    const graphics = this.track(this.add.graphics().setDepth(0));
    const width = this.map.width * SLICE_CELL;
    const height = this.map.height * SLICE_CELL;
    fill(graphics, 0x181719, 0, 0, width, height);
    fill(graphics, COLORS.wallDark, 10, 8, width - 20, 88);
    fill(graphics, COLORS.wall, 14, 12, width - 28, 80);
    fill(graphics, COLORS.wallLight, 18, 16, width - 36, 12);
    for (let x = 22; x < width - 18; x += 46) {
      line(graphics, COLORS.creamDark, 2, x, 28, x, 90, 0.6);
    }
    fill(graphics, COLORS.redDark, 10, 88, width - 20, 14);
    fill(graphics, COLORS.red, 14, 88, width - 28, 8);

    fill(graphics, COLORS.floorDark, 10, 100, width - 20, height - 108);
    fill(graphics, COLORS.floor, 14, 104, width - 28, height - 116);
    for (let y = 112; y < height - 10; y += 18) {
      line(graphics, COLORS.floorLight, 2, 16, y, width - 16, y, 0.82);
      const shift = Math.floor(y / 18) % 3 * 17;
      for (let x = 26 + shift; x < width - 18; x += 72) {
        line(graphics, COLORS.floorDark, 2, x, y - 16, x, y, 0.62);
      }
    }

    fill(graphics, COLORS.redDark, 7 * SLICE_CELL, 96, SLICE_CELL, height - 96);
    fill(graphics, COLORS.red, 7 * SLICE_CELL + 5, 96, SLICE_CELL - 10, height - 96);
    line(graphics, COLORS.brickLight, 2, 7 * SLICE_CELL + 8, 96, 7 * SLICE_CELL + 8, height);

    this.drawLockerBank(graphics, 1 * SLICE_CELL, 1 * SLICE_CELL, 4);
    this.drawLockerBank(graphics, 10 * SLICE_CELL, 1 * SLICE_CELL, 4);
    this.drawInteriorDoor(graphics);
    stroke(graphics, COLORS.outline, 6, 5, 4, width - 10, height - 8);
    stroke(graphics, COLORS.stoneLight, 2, 11, 10, width - 22, height - 20, 0.8);
  }

  drawLockerBank(graphics, x, y, count) {
    fill(graphics, COLORS.outline, x, y, count * SLICE_CELL, 64);
    for (let index = 0; index < count; index += 1) {
      const lockerX = x + index * SLICE_CELL + 3;
      fill(graphics, COLORS.lockerDark, lockerX, y + 4, 26, 56);
      fill(graphics, COLORS.locker, lockerX + 3, y + 5, 20, 51);
      fill(graphics, COLORS.lockerLight, lockerX + 5, y + 7, 16, 4);
      line(graphics, COLORS.lockerDark, 2, lockerX + 6, y + 18, lockerX + 20, y + 18);
      line(graphics, COLORS.lockerDark, 2, lockerX + 6, y + 23, lockerX + 20, y + 23);
      fill(graphics, COLORS.gold, lockerX + 19, y + 34, 3, 6);
    }
  }

  drawInteriorDoor(graphics) {
    const x = 7 * SLICE_CELL;
    const y = 9 * SLICE_CELL;
    fill(graphics, COLORS.outline, x - 10, y - 8, SLICE_CELL + 20, 40);
    fill(graphics, COLORS.creamDark, x - 5, y - 4, SLICE_CELL + 10, 36);
    fill(graphics, COLORS.redDark, x, y, SLICE_CELL, 32);
    fill(graphics, 0x4f2928, x + 5, y + 5, SLICE_CELL - 10, 27);
    fill(graphics, COLORS.stoneLight, x - 7, y - 5, SLICE_CELL + 14, 7);
  }

  drawMapObjects() {
    this.map.objects.forEach(definition => {
      let object;
      if (definition.kind === 'pineCluster') object = this.drawPineCluster(definition);
      if (definition.kind === 'bench') object = this.drawBench(definition);
      if (definition.kind === 'sign') object = this.drawSign(definition);
      if (definition.kind === 'trophyCase') object = this.drawTrophyCase(definition);
      if (definition.kind === 'lockerBench') object = this.drawLockerBench(definition);
      if (!object) return;
      object.setData('definition', definition);
      object.setData('ownerDepth', (definition.baseY + 1) * SLICE_CELL);
      object.setDepth((definition.baseY + 1) * SLICE_CELL);
      this.depthObjects.push(object);
      this.track(object);
    });
  }

  drawPineCluster(definition) {
    const graphics = this.add.graphics({
      x: definition.x * SLICE_CELL,
      y: (definition.baseY + 1) * SLICE_CELL
    });
    fill(graphics, COLORS.shadow, 3, -10, 58, 10, 0.45);
    fill(graphics, COLORS.trunk, 17, -36, 10, 34);
    fill(graphics, COLORS.trunkLight, 21, -34, 4, 30);
    fill(graphics, COLORS.trunk, 39, -39, 10, 37);
    fill(graphics, COLORS.trunkLight, 42, -37, 4, 32);
    this.drawPine(graphics, 2, -116, 38, 86);
    this.drawPine(graphics, 24, -126, 40, 94);
    this.drawPine(graphics, 12, -92, 44, 78);
    return graphics;
  }

  drawPine(graphics, x, y, width, height) {
    const center = x + width / 2;
    graphics.fillStyle(COLORS.hedge, 1);
    graphics.fillTriangle(center, y, x + 6, y + height * 0.48, x + width - 6, y + height * 0.48);
    graphics.fillTriangle(center, y + height * 0.2, x, y + height * 0.72, x + width, y + height * 0.72);
    graphics.fillTriangle(center, y + height * 0.4, x - 2, y + height, x + width + 2, y + height);
    graphics.fillStyle(COLORS.hedgeLight, 1);
    graphics.fillTriangle(center - 4, y + 8, x + 9, y + height * 0.48, center + 2, y + height * 0.42);
    graphics.fillTriangle(center - 5, y + height * 0.31, x + 6, y + height * 0.7, center + 4, y + height * 0.62);
    fill(graphics, COLORS.grassLight, center - 5, y + 23, 5, 8);
    fill(graphics, COLORS.grassLight, x + 10, y + height * 0.58, 7, 5);
  }

  drawBench(definition) {
    const graphics = this.add.graphics({
      x: definition.x * SLICE_CELL,
      y: (definition.baseY + 1) * SLICE_CELL
    });
    fill(graphics, COLORS.shadow, 0, -8, 64, 8, 0.46);
    fill(graphics, COLORS.outline, 4, -31, 56, 10);
    fill(graphics, COLORS.trunkLight, 7, -29, 50, 5);
    fill(graphics, COLORS.outline, 1, -18, 62, 10);
    fill(graphics, COLORS.trunkLight, 5, -16, 54, 5);
    fill(graphics, COLORS.outline, 8, -9, 7, 9);
    fill(graphics, COLORS.outline, 50, -9, 7, 9);
    return graphics;
  }

  drawSign(definition) {
    const graphics = this.add.graphics({
      x: definition.x * SLICE_CELL,
      y: (definition.baseY + 1) * SLICE_CELL
    });
    fill(graphics, COLORS.shadow, 4, -7, 24, 7, 0.45);
    fill(graphics, COLORS.outline, 12, -40, 8, 40);
    fill(graphics, COLORS.stoneDark, 14, -38, 4, 36);
    fill(graphics, COLORS.outline, 0, -64, 32, 30);
    fill(graphics, COLORS.redDark, 4, -60, 24, 22);
    fill(graphics, COLORS.creamLight, 8, -56, 16, 4);
    fill(graphics, COLORS.creamLight, 8, -48, 12, 4);
    return graphics;
  }

  drawTrophyCase(definition) {
    const graphics = this.add.graphics({
      x: definition.x * SLICE_CELL,
      y: (definition.baseY + 1) * SLICE_CELL
    });
    fill(graphics, COLORS.shadow, 0, -8, 96, 8, 0.42);
    fill(graphics, COLORS.outline, 0, -54, 96, 54);
    fill(graphics, COLORS.trunk, 4, -50, 88, 46);
    fill(graphics, COLORS.glass, 9, -46, 78, 30);
    fill(graphics, COLORS.glassLight, 12, -43, 8, 24, 0.72);
    line(graphics, COLORS.outline, 3, 32, -46, 32, -16);
    line(graphics, COLORS.outline, 3, 64, -46, 64, -16);
    fill(graphics, COLORS.gold, 16, -38, 10, 15);
    fill(graphics, COLORS.gold, 70, -36, 9, 13);
    fill(graphics, COLORS.creamLight, 45, -34, 7, 10);
    fill(graphics, COLORS.redDark, 42, -25, 13, 7);
    fill(graphics, COLORS.trunkLight, 6, -13, 84, 7);
    return graphics;
  }

  drawLockerBench(definition) {
    const graphics = this.add.graphics({
      x: definition.x * SLICE_CELL,
      y: (definition.baseY + 1) * SLICE_CELL
    });
    fill(graphics, COLORS.shadow, 0, -8, 96, 8, 0.42);
    fill(graphics, COLORS.outline, 0, -29, 96, 14);
    fill(graphics, COLORS.trunkLight, 5, -26, 86, 7);
    fill(graphics, COLORS.creamDark, 8, -15, 7, 15);
    fill(graphics, COLORS.creamDark, 81, -15, 7, 15);
    return graphics;
  }

  drawActors() {
    this.map.actors.forEach(definition => {
      const position = this.worldPosition(definition.x, definition.y);
      const shadow = this.track(this.add.ellipse(position.x, position.y - 3, 25, 8, 0x1c241b, 0.4));
      const direction = definition.facing === 'left' ? 'right' : definition.facing;
      const sprite = this.track(this.add.sprite(position.x, position.y, `slice-coach-${direction}-1`).setOrigin(0.5, 1));
      sprite.setFlipX(definition.facing === 'left');
      sprite.setData('definition', definition);
      sprite.setDepth(position.y);
      shadow.setDepth(position.y - 1);
      this.actorObjects.push({sprite, shadow, definition});
    });
  }

  createPlayer(spawn) {
    this.tilePos = {x: spawn.x, y: spawn.y};
    this.facing = DIRECTIONS[spawn.facing] ? spawn.facing : 'up';
    const position = this.worldPosition(spawn.x, spawn.y);
    this.shadow = this.track(this.add.ellipse(position.x, position.y - 3, 25, 8, 0x1c241b, 0.42));
    this.player = this.track(this.add.sprite(position.x, position.y, 'slice-player-down-1').setOrigin(0.5, 1));
    this.setFacing(this.facing);
    this.updateDepths();
  }

  worldPosition(x, y) {
    return {
      x: (x + 0.5) * SLICE_CELL,
      y: (y + 1) * SLICE_CELL
    };
  }

  centerCameraOnPlayer() {
    if (!this.player || !this.map) return;
    const maxScrollX = Math.max(0, this.map.width * SLICE_CELL - SLICE_NATIVE_WIDTH);
    const maxScrollY = Math.max(0, this.map.height * SLICE_CELL - SLICE_NATIVE_HEIGHT);
    const scrollX = Phaser.Math.Clamp(this.player.x - SLICE_NATIVE_WIDTH / 2, 0, maxScrollX);
    const scrollY = Phaser.Math.Clamp(this.player.y - 32 - SLICE_NATIVE_HEIGHT / 2, 0, maxScrollY);
    this.cameras.main.setScroll(Math.round(scrollX), Math.round(scrollY));
  }

  handleVirtualButton(key, phase = 'press') {
    if (DIRECTIONS[key]) {
      if (phase === 'up') {
        if (this.heldDirection === key) this.heldDirection = null;
        if (this.pendingDirection === key) this.pendingDirection = null;
        return;
      }
      if (phase === 'down') this.heldDirection = key;
      this.queueDirection(key);
      return;
    }
    if (phase === 'up') return;
    if (key === 'a') this.interact();
    if (key === 'b' && this.messageOpen) this.closeMessage();
  }

  queueDirection(direction) {
    if (this.inputLocked || this.messageOpen || !DIRECTIONS[direction]) return;
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
    this.player.anims.stop();
    this.player.setTexture(`slice-player-${textureDirection}-1`);
    this.player.setFlipX(direction === 'left');
  }

  tryStep(direction) {
    const vector = DIRECTIONS[direction];
    const target = {x: this.tilePos.x + vector.dx, y: this.tilePos.y + vector.dy};
    if (this.isBlocked(target.x, target.y)) {
      this.bump(direction);
      return;
    }
    this.moving = true;
    this.pendingDirection = null;
    const position = this.worldPosition(target.x, target.y);
    const textureDirection = direction === 'left' ? 'right' : direction;
    this.player.setFlipX(direction === 'left');
    this.player.anims.play(`slice-player-walk-${textureDirection}`, true);
    this.tweens.add({
      targets: this.player,
      x: position.x,
      y: position.y,
      duration: 165,
      ease: 'Linear',
      onUpdate: () => this.centerCameraOnPlayer()
    });
    this.tweens.add({
      targets: this.shadow,
      x: position.x,
      y: position.y - 3,
      duration: 165,
      ease: 'Linear',
      onUpdate: () => this.updateDepths(),
      onComplete: () => this.finishStep(target)
    });
  }

  finishStep(target) {
    this.tilePos = target;
    this.moving = false;
    this.setFacing(this.facing);
    this.updateDepths();
    this.centerCameraOnPlayer();
    const warp = this.map.warps.find(entry => entry.x === target.x && entry.y === target.y);
    if (warp) {
      this.performWarp(warp);
      return;
    }
    const next = this.pendingDirection || this.heldDirection;
    this.pendingDirection = null;
    if (next) this.time.delayedCall(12, () => this.queueDirection(next));
  }

  bump(direction) {
    if (this.inputLocked || this.moving) return;
    const vector = DIRECTIONS[direction];
    const origin = this.worldPosition(this.tilePos.x, this.tilePos.y);
    this.moving = true;
    this.tweens.add({
      targets: this.player,
      x: origin.x + vector.dx * 3,
      y: origin.y + vector.dy * 3,
      duration: 45,
      yoyo: true,
      onComplete: () => {
        this.moving = false;
        this.player.setPosition(origin.x, origin.y);
        const next = this.heldDirection;
        if (next) this.time.delayedCall(90, () => this.queueDirection(next));
      }
    });
  }

  isBlocked(x, y) {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return true;
    if (this.blockedSet.has(keyFor(x, y))) return true;
    return this.map.actors.some(actor => actor.x === x && actor.y === y);
  }

  pass(x, y) {
    return !this.isBlocked(x, y);
  }

  performWarp(warp) {
    this.inputLocked = true;
    this.heldDirection = null;
    this.pendingDirection = null;
    this.cameras.main.fadeOut(110, 20, 17, 19);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.loadArea(warp.to, warp.spawn, true);
      this.cameras.main.fadeIn(130, 20, 17, 19);
    });
  }

  updateDepths() {
    if (!this.player || !this.shadow) return;
    this.player.setDepth(Math.round(this.player.y));
    this.shadow.setDepth(Math.round(this.player.y) - 1);
    this.actorObjects.forEach(({sprite, shadow}) => {
      sprite.setDepth(Math.round(sprite.y));
      shadow.setDepth(Math.round(sprite.y) - 1);
    });
  }

  frontTile() {
    const vector = DIRECTIONS[this.facing];
    return {x: this.tilePos.x + vector.dx, y: this.tilePos.y + vector.dy};
  }

  interact() {
    if (this.inputLocked) return;
    if (this.messageOpen) {
      this.closeMessage();
      return;
    }
    const front = this.frontTile();
    const object = this.map.objects.find(entry => entry.footprint.some(([x, y]) => x === front.x && y === front.y));
    if (object?.message) {
      this.showMessage(object.message);
      return;
    }
    const actor = this.map.actors.find(entry => entry.x === front.x && entry.y === front.y);
    if (actor) {
      this.showMessage(actor.id === 'head-coach'
        ? 'Coach: The room should feel clear before it feels crowded.'
        : 'Assistant Coach: Every doorway and object owns an exact cell.');
    }
  }

  showMessage(message) {
    this.closeMessage();
    this.message = message;
    this.messageOpen = true;
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(20000);
    const graphics = this.add.graphics();
    fill(graphics, COLORS.outline, 10, 232, 460, 78, 0.92);
    fill(graphics, COLORS.white, 14, 236, 452, 70);
    stroke(graphics, COLORS.creamDark, 2, 18, 240, 444, 62);
    const text = this.add.text(30, 248, message, {
      fontFamily: FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#292523',
      lineSpacing: 4,
      wordWrap: {width: 410}
    });
    const prompt = this.add.text(446, 286, 'A', {
      fontFamily: FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#762823'
    });
    container.add([graphics, text, prompt]);
    this.messageBox = container;
  }

  closeMessage() {
    this.messageBox?.destroy(true);
    this.messageBox = null;
    this.message = '';
    this.messageOpen = false;
  }

  showAreaToast(label) {
    this.areaToast?.destroy(true);
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(19000);
    const graphics = this.add.graphics();
    const width = Math.max(148, label.length * 10 + 32);
    fill(graphics, COLORS.outline, 14, 12, width, 38, 0.94);
    fill(graphics, COLORS.white, 18, 16, width - 8, 30);
    stroke(graphics, COLORS.redDark, 2, 21, 19, width - 14, 24);
    const text = this.add.text(30, 23, label, {
      fontFamily: FONT,
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#292523'
    });
    container.add([graphics, text]);
    this.areaToast = container;
    this.tweens.add({
      targets: container,
      alpha: 0,
      delay: 900,
      duration: 280,
      onComplete: () => {
        container.destroy(true);
        if (this.areaToast === container) this.areaToast = null;
      }
    });
  }

  drawOwnershipOverlay() {
    const graphics = this.track(this.add.graphics().setDepth(18000));
    this.map.blocked.forEach(([x, y]) => fill(graphics, 0xb32d2d, x * SLICE_CELL, y * SLICE_CELL, SLICE_CELL, SLICE_CELL, 0.32));
    this.map.warps.forEach(warp => fill(graphics, 0xdca72d, warp.x * SLICE_CELL, warp.y * SLICE_CELL, SLICE_CELL, SLICE_CELL, 0.62));
    for (let x = 0; x <= this.map.width; x += 1) {
      line(graphics, 0xffffff, 1, x * SLICE_CELL + 0.5, 0, x * SLICE_CELL + 0.5, this.map.height * SLICE_CELL, 0.24);
    }
    for (let y = 0; y <= this.map.height; y += 1) {
      line(graphics, 0xffffff, 1, 0, y * SLICE_CELL + 0.5, this.map.width * SLICE_CELL, y * SLICE_CELL + 0.5, 0.24);
    }
  }
}
