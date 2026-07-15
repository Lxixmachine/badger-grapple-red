import {
  CAMP_DEMO_ACTORS,
  CAMP_DEMO_CAMERA_ZONES,
  CAMP_DEMO_DOORS,
  CAMP_DEMO_GRID,
  CAMP_DEMO_HEIGHT,
  CAMP_DEMO_OCCLUDERS,
  CAMP_DEMO_ORIGIN,
  CAMP_DEMO_SPAWN,
  CAMP_DEMO_WALKABLE,
  CAMP_DEMO_WIDTH,
  CAMP_DEMO_WORLD_HEIGHT,
  CAMP_DEMO_WORLD_WIDTH,
  campDemoCellKey,
  campDemoWorldPosition,
  campDemoZoneAt
} from '../data/campRandall25dDemo.js';
import {FONT, setVirtualHandler} from '../systems/ui.js';
import {sfx, unlockAudio} from '../systems/audio.js';

const Phaser = window.Phaser;
const STEP_MS = 165;
const DIRS = {
  down: {dx: 0, dy: 1, idle: 1, frames: [0, 1, 2]},
  left: {dx: -1, dy: 0, idle: 4, frames: [3, 4, 5]},
  right: {dx: 1, dy: 0, idle: 7, frames: [6, 7, 8]},
  up: {dx: 0, dy: -1, idle: 10, frames: [9, 10, 11]}
};

export class CampRandallDemoScene extends Phaser.Scene {
  constructor() {
    super('CampRandallDemoScene');
  }

  preload() {
    const version = '1';
    this.load.image('camp-demo-base', `./assets/demo/camp_randall_25d_base.png?v=${version}`);
    this.load.image('camp-demo-occluder-stadium', `./assets/demo/camp_randall_25d_stadium_entry.png?v=${version}`);
    this.load.image('camp-demo-occluder-team', `./assets/demo/camp_randall_25d_team_entry.png?v=${version}`);
    this.load.image('camp-demo-occluder-office', `./assets/demo/camp_randall_25d_office_entry.png?v=${version}`);
    this.load.spritesheet('camp-demo-player', `./assets/sprites/player_walk.png?v=${version}`, {frameWidth: 24, frameHeight: 36});
    ['coach', 'captain', 'student', 'athlete'].forEach(id => {
      this.load.spritesheet(`camp-demo-${id}`, `./assets/sprites/npc_${id}_walk.png?v=${version}`, {frameWidth: 24, frameHeight: 36});
    });
  }

  create() {
    const params = new URLSearchParams(window.location.search);
    const requestedSpawn = {
      x: Number(params.get('x')),
      y: Number(params.get('y')),
      facing: params.get('facing')
    };
    const hasRequestedSpawn = params.has('test')
      && Number.isInteger(requestedSpawn.x)
      && Number.isInteger(requestedSpawn.y)
      && CAMP_DEMO_WALKABLE.has(campDemoCellKey(requestedSpawn.x, requestedSpawn.y));
    this.demoContractVersion = 'camp-randall-25d-v1';
    this.layeredMapVersion = this.demoContractVersion;
    this.currentMapId = 'camp_randall_25d_demo';
    this.mapWidth = CAMP_DEMO_WIDTH;
    this.mapHeight = CAMP_DEMO_HEIGHT;
    this.cellSize = CAMP_DEMO_GRID;
    this.tilePos = hasRequestedSpawn
      ? {x: requestedSpawn.x, y: requestedSpawn.y}
      : {x: CAMP_DEMO_SPAWN.x, y: CAMP_DEMO_SPAWN.y};
    this.facing = DIRS[requestedSpawn.facing] && hasRequestedSpawn
      ? requestedSpawn.facing
      : CAMP_DEMO_SPAWN.facing;
    this.testMode = params.has('test');
    this.moving = false;
    this.inputLocked = !this.testMode;
    this.messageOpen = false;
    this.message = '';
    this.heldDirection = null;
    this.actorEntries = [];
    this.upperObjects = [];
    this.visitedCameraZones = new Set();

    this.cameras.main.setBackgroundColor('#101613');
    this.cameras.main.setRoundPixels(true);
    this.base = this.add.image(0, 0, 'camp-demo-base').setOrigin(0).setDepth(0);
    this.drawDebugContract();
    this.ensureAnimations();
    this.createActors();
    this.createPlayer();
    this.createOccluders();
    this.bindInput();
    setVirtualHandler(this);

    this.cameras.main.setBounds(0, 0, CAMP_DEMO_WORLD_WIDTH, CAMP_DEMO_WORLD_HEIGHT);
    this.followPlayer();
    this.drawHud();
    this.showAreaToast('CAMP RANDALL');
    this.time.addEvent({delay: 200, loop: true, callback: () => this.updateActorPatrols()});
    if (!this.testMode) this.time.delayedCall(260, () => this.playOpeningReveal());
  }

  ensureAnimations() {
    ['player', 'coach', 'captain', 'student', 'athlete'].forEach(id => {
      const texture = `camp-demo-${id}`;
      Object.entries(DIRS).forEach(([direction, config]) => {
        const key = `${texture}:walk-${direction}`;
        if (this.anims.exists(key)) return;
        this.anims.create({
          key,
          frames: config.frames.map(frame => ({key: texture, frame})),
          frameRate: 10,
          repeat: -1
        });
      });
    });
  }

  createPlayer() {
    const position = campDemoWorldPosition(this.tilePos.x, this.tilePos.y);
    this.shadow = this.add.ellipse(position.x, position.y - 2, 19, 6, 0x10130f, 0.42).setDepth(position.y - 2);
    this.player = this.add.sprite(position.x, position.y, 'camp-demo-player', DIRS[this.facing].idle)
      .setOrigin(0.5, 1)
      .setDepth(position.y);
  }

  createActors() {
    CAMP_DEMO_ACTORS.forEach((definition, index) => {
      const data = {...definition, patrol: definition.patrol ? {...definition.patrol} : null};
      const position = campDemoWorldPosition(data.x, data.y);
      const texture = `camp-demo-${data.texture}`;
      const shadow = this.add.ellipse(position.x, position.y - 2, 18, 6, 0x10130f, 0.36).setDepth(position.y - 2);
      const sprite = this.add.sprite(position.x, position.y, texture, DIRS[data.facing]?.idle ?? DIRS.down.idle)
        .setOrigin(0.5, 1)
        .setDepth(position.y);
      this.actorEntries.push({
        data,
        texture,
        shadow,
        sprite,
        origin: {x: data.x, y: data.y},
        patrolDirection: index % 2 ? -1 : 1,
        nextPatrolAt: this.time.now + 900 + index * 270,
        moving: false
      });
    });
  }

  createOccluders() {
    CAMP_DEMO_OCCLUDERS.forEach(definition => {
      const image = this.add.image(definition.x, definition.y, definition.texture)
        .setOrigin(0)
        .setDepth(definition.depth)
        .setData('definition', definition)
        .setData('ownerDepth', definition.depth);
      this.upperObjects.push(image);
    });
  }

  drawDebugContract() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('debug-grid')) return;
    const graphics = this.add.graphics().setDepth(80);
    CAMP_DEMO_WALKABLE.forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const position = campDemoWorldPosition(x, y);
      graphics.fillStyle(0x32e071, 0.18);
      graphics.fillRect(position.x - 15, position.y - 15, 30, 30);
    });
    graphics.lineStyle(1, 0xffd24a, 0.42);
    for (let x = CAMP_DEMO_ORIGIN; x < CAMP_DEMO_WORLD_WIDTH; x += CAMP_DEMO_GRID) {
      graphics.lineBetween(x, 0, x, CAMP_DEMO_WORLD_HEIGHT);
    }
    for (let y = CAMP_DEMO_ORIGIN; y < CAMP_DEMO_WORLD_HEIGHT; y += CAMP_DEMO_GRID) {
      graphics.lineBetween(0, y, CAMP_DEMO_WORLD_WIDTH, y);
    }
  }

  bindInput() {
    const keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      action: Phaser.Input.Keyboard.KeyCodes.SPACE,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    this.keys = keys;
    const directionalKeys = {up: ['up', 'w'], down: ['down', 's'], left: ['left', 'a'], right: ['right', 'd']};
    Object.entries(directionalKeys).forEach(([direction, names]) => {
      names.forEach(name => {
        keys[name].on('down', () => this.handleVirtualButton(direction, 'down'));
        keys[name].on('up', () => this.handleVirtualButton(direction, 'up'));
      });
    });
    keys.action.on('down', () => this.handleVirtualButton('a'));
    keys.enter.on('down', () => this.handleVirtualButton('a'));
    keys.escape.on('down', () => this.handleVirtualButton('b'));
    this.time.addEvent({
      delay: 135,
      loop: true,
      callback: () => {
        if (this.heldDirection) this.tryMove(this.heldDirection);
      }
    });
  }

  handleVirtualButton(key, phase = 'press') {
    unlockAudio();
    if (DIRS[key]) {
      if (phase === 'up') {
        if (this.heldDirection === key) this.heldDirection = null;
        return;
      }
      if (phase === 'down') this.heldDirection = key;
      this.tryMove(key);
      return;
    }
    if (phase === 'up') return;
    if (key === 'a') this.messageOpen ? this.closeMessage() : this.interact();
    else if (key === 'b' && this.messageOpen) this.closeMessage();
    else if (key === 'menu') this.showMessage('CAMP RANDALL\nOpening Day');
    else if (key === 'save') this.showMessage('Demo position noted.');
  }

  pass(x, y, ignoreActors = false) {
    if (x < 0 || y < 0 || x >= CAMP_DEMO_WIDTH || y >= CAMP_DEMO_HEIGHT) return false;
    if (!CAMP_DEMO_WALKABLE.has(campDemoCellKey(x, y))) return false;
    if (this.tilePos?.x === x && this.tilePos?.y === y) return false;
    return ignoreActors || !this.actorEntries.some(entry => entry.data.x === x && entry.data.y === y);
  }

  tryMove(direction) {
    if (this.inputLocked || this.messageOpen || this.moving) return;
    const config = DIRS[direction];
    if (!config) return;
    this.face(direction);
    const target = {x: this.tilePos.x + config.dx, y: this.tilePos.y + config.dy};
    if (!this.pass(target.x, target.y)) {
      sfx.bump?.();
      this.drawHud();
      return;
    }
    this.movePlayer(target, direction);
  }

  face(direction) {
    this.facing = direction;
    if (!this.moving) this.player?.setFrame(DIRS[direction].idle);
  }

  movePlayer(target, direction) {
    const position = campDemoWorldPosition(target.x, target.y);
    this.moving = true;
    this.tilePos = target;
    this.player.play(`camp-demo-player:walk-${direction}`, true);
    this.tweens.add({targets: this.shadow, x: position.x, y: position.y - 2, duration: STEP_MS, ease: 'Linear'});
    this.tweens.add({
      targets: this.player,
      x: position.x,
      y: position.y,
      duration: STEP_MS,
      ease: 'Linear',
      onUpdate: () => {
        this.player.setDepth(this.player.y);
        this.shadow.setDepth(this.player.y - 2);
      },
      onComplete: () => {
        this.player.stop().setFrame(DIRS[direction].idle).setDepth(position.y);
        this.moving = false;
        this.drawHud();
        this.checkCameraZone();
        if (this.heldDirection) this.time.delayedCall(12, () => this.tryMove(this.heldDirection));
      }
    });
  }

  updateActorPatrols() {
    if (this.inputLocked || this.messageOpen || this.moving) return;
    const now = this.time.now;
    this.actorEntries.forEach(entry => {
      const patrol = entry.data.patrol;
      if (!patrol || entry.moving || now < entry.nextPatrolAt) return;
      const horizontal = patrol.axis !== 'vertical';
      const current = horizontal ? entry.data.x : entry.data.y;
      const origin = horizontal ? entry.origin.x : entry.origin.y;
      if (Math.abs(current - origin) >= patrol.radius) entry.patrolDirection *= -1;
      const direction = horizontal
        ? (entry.patrolDirection > 0 ? 'right' : 'left')
        : (entry.patrolDirection > 0 ? 'down' : 'up');
      const config = DIRS[direction];
      const target = {x: entry.data.x + config.dx, y: entry.data.y + config.dy};
      const occupied = this.tilePos.x === target.x && this.tilePos.y === target.y
        || this.actorEntries.some(other => other !== entry && other.data.x === target.x && other.data.y === target.y);
      if (occupied || !CAMP_DEMO_WALKABLE.has(campDemoCellKey(target.x, target.y))) {
        entry.patrolDirection *= -1;
        entry.nextPatrolAt = now + 450;
        return;
      }
      this.moveActor(entry, target, direction);
      entry.nextPatrolAt = now + patrol.interval;
    });
  }

  moveActor(entry, target, direction) {
    const position = campDemoWorldPosition(target.x, target.y);
    entry.moving = true;
    entry.data.x = target.x;
    entry.data.y = target.y;
    entry.data.facing = direction;
    entry.sprite.play(`${entry.texture}:walk-${direction}`, true);
    this.tweens.add({targets: entry.shadow, x: position.x, y: position.y - 2, duration: STEP_MS, ease: 'Linear'});
    this.tweens.add({
      targets: entry.sprite,
      x: position.x,
      y: position.y,
      duration: STEP_MS,
      ease: 'Linear',
      onUpdate: () => {
        entry.sprite.setDepth(entry.sprite.y);
        entry.shadow.setDepth(entry.sprite.y - 2);
      },
      onComplete: () => {
        entry.sprite.stop().setFrame(DIRS[direction].idle).setDepth(position.y);
        entry.moving = false;
      }
    });
  }

  interactionCell() {
    const direction = DIRS[this.facing];
    return {x: this.tilePos.x + direction.dx, y: this.tilePos.y + direction.dy};
  }

  doorTarget() {
    return CAMP_DEMO_DOORS.find(door => door.approaches.some(approach => approach.x === this.tilePos.x
      && approach.y === this.tilePos.y && approach.facing === this.facing)) || null;
  }

  actorTarget() {
    const target = this.interactionCell();
    return this.actorEntries.find(entry => entry.data.x === target.x && entry.data.y === target.y) || null;
  }

  interact() {
    if (this.inputLocked || this.moving) return;
    const door = this.doorTarget();
    if (door) {
      sfx.open?.();
      this.cameras.main.flash(90, 255, 244, 214);
      this.showMessage(door.message);
      return;
    }
    const actor = this.actorTarget();
    if (actor) {
      actor.data.facing = this.oppositeDirection(this.facing);
      actor.sprite.setFrame(DIRS[actor.data.facing].idle);
      this.showMessage(actor.data.dialogue);
      return;
    }
    this.showMessage('The campus opens around the main walk.');
  }

  oppositeDirection(direction) {
    return {up: 'down', down: 'up', left: 'right', right: 'left'}[direction] || 'down';
  }

  promptText() {
    if (this.doorTarget()) return 'A  ENTER';
    if (this.actorTarget()) return 'A  TALK';
    return '';
  }

  showMessage(message) {
    this.heldDirection = null;
    this.message = message;
    this.messageOpen = true;
    this.drawHud();
  }

  closeMessage() {
    this.message = '';
    this.messageOpen = false;
    this.drawHud();
  }

  drawHud() {
    this.hud?.destroy(true);
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(9000);
    if (this.messageOpen) {
      const graphics = this.add.graphics().setScrollFactor(0);
      graphics.fillStyle(0x111217, 0.42);
      graphics.fillRoundedRect(10, 231, 462, 80, 4);
      graphics.fillStyle(0xfaf4df, 1);
      graphics.fillRoundedRect(6, 227, 462, 80, 4);
      graphics.lineStyle(3, 0x1b2530, 1);
      graphics.strokeRoundedRect(6, 227, 462, 80, 4);
      graphics.lineStyle(2, 0xb31c31, 1);
      graphics.strokeRoundedRect(11, 232, 452, 70, 2);
      const text = this.add.text(23, 239, this.message, {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#15171d',
        lineSpacing: 4,
        wordWrap: {width: 420}
      }).setScrollFactor(0);
      const advance = this.add.text(443, 282, 'A', {
        fontFamily: FONT,
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#8e1628'
      }).setScrollFactor(0);
      this.hud.add([graphics, text, advance]);
      return;
    }
    const prompt = this.promptText();
    if (!prompt) return;
    const graphics = this.add.graphics().setScrollFactor(0);
    graphics.fillStyle(0x111217, 0.92);
    graphics.fillRoundedRect(358, 12, 110, 31, 4);
    graphics.lineStyle(2, 0xd5b14b, 1);
    graphics.strokeRoundedRect(358, 12, 110, 31, 4);
    const text = this.add.text(413, 18, prompt, {
      fontFamily: FONT,
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#fff4cf'
    }).setOrigin(0.5, 0).setScrollFactor(0);
    this.hud.add([graphics, text]);
  }

  showAreaToast(label) {
    this.areaToast?.destroy(true);
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(8900);
    const graphics = this.add.graphics().setScrollFactor(0);
    graphics.fillStyle(0x111217, 0.94);
    graphics.fillRoundedRect(12, 11, 232, 38, 4);
    graphics.fillStyle(0xb51d30, 1);
    graphics.fillRect(12, 11, 7, 38);
    graphics.lineStyle(2, 0xd5b14b, 1);
    graphics.strokeRoundedRect(12, 11, 232, 38, 4);
    const text = this.add.text(29, 19, label, {
      fontFamily: FONT,
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#fff4cf'
    }).setScrollFactor(0);
    container.add([graphics, text]);
    this.areaToast = container;
    this.tweens.add({targets: container, alpha: 0, delay: 1250, duration: 380, onComplete: () => container.destroy(true)});
  }

  followPlayer() {
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18, 0, -12);
    this.cameras.main.setDeadzone(72, 48);
  }

  playOpeningReveal() {
    const camera = this.cameras.main;
    this.heldDirection = null;
    camera.stopFollow();
    const bars = this.createLetterbox();
    camera.pan(768, 300, 900, 'Sine.easeInOut');
    camera.zoomTo(1.05, 900, 'Sine.easeInOut');
    this.time.delayedCall(1120, () => {
      const playerPosition = campDemoWorldPosition(this.tilePos.x, this.tilePos.y);
      camera.pan(playerPosition.x, playerPosition.y - 12, 720, 'Sine.easeInOut');
      camera.zoomTo(1, 720, 'Sine.easeInOut');
    });
    this.time.delayedCall(1910, () => {
      bars.forEach(bar => this.tweens.add({targets: bar, alpha: 0, duration: 180, onComplete: () => bar.destroy()}));
      this.followPlayer();
      this.inputLocked = false;
      this.showMessage('Opening Day.\nThe main walk leads north to Camp Randall Stadium.');
    });
  }

  createLetterbox() {
    const top = this.add.rectangle(240, 11, 480, 22, 0x070809, 1).setScrollFactor(0).setDepth(8800);
    const bottom = this.add.rectangle(240, 309, 480, 22, 0x070809, 1).setScrollFactor(0).setDepth(8800);
    return [top, bottom];
  }

  checkCameraZone() {
    const zone = campDemoZoneAt(this.tilePos.x, this.tilePos.y);
    if (!zone || this.visitedCameraZones.has(zone.id)) return;
    this.visitedCameraZones.add(zone.id);
    this.playCameraZone(zone);
  }

  playCameraZone(zone) {
    this.inputLocked = true;
    this.heldDirection = null;
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.pan(zone.target.x, zone.target.y, 520, 'Sine.easeInOut');
    camera.zoomTo(zone.zoom, 520, 'Sine.easeInOut');
    this.showAreaToast(zone.label);
    this.time.delayedCall(760, () => {
      const playerPosition = campDemoWorldPosition(this.tilePos.x, this.tilePos.y);
      camera.pan(playerPosition.x, playerPosition.y - 12, 420, 'Sine.easeInOut');
      camera.zoomTo(1, 420, 'Sine.easeInOut');
    });
    this.time.delayedCall(1210, () => {
      this.followPlayer();
      this.inputLocked = false;
      this.drawHud();
    });
  }
}
