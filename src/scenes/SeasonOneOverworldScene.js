import {ROSTER, counterStarterFor} from '../data/roster.js';
import {canonicalBadge, SEASON_ONE_BADGES} from '../data/campaign.js';
import {
  actorsForMap,
  CELL_SIZE,
  connectionForStep,
  defaultSeasonSpawn,
  isSeasonPassable,
  mapDoorAt,
  mapEventAt,
  objectAsset,
  objectsAt,
  resolveSeasonMapId,
  seasonMap,
  SEASON_ONE_PROJECT,
  terrainVisual,
  validSeasonPosition,
  metatile
} from '../data/seasonOneRuntime.js';
import {loadState, saveState} from '../systems/save.js';
import {restoreParty} from '../systems/mechanics.js';
import {
  canFlyToNationals,
  grantKeyItem,
  registerTravelDestination,
  unlockRecruiting
} from '../systems/progression.js';
import {FONT, setVirtualHandler} from '../systems/ui.js';
import {playMusic, setMuted, sfx, unlockAudio} from '../systems/audio.js';

const Phaser = window.Phaser;
const VIEW_W = 480;
const VIEW_H = 320;
const STEP_MS = 165;
const DIRS = {
  down: {dx: 0, dy: 1, idle: 1, frames: [0, 1, 2]},
  left: {dx: -1, dy: 0, idle: 4, frames: [3, 4, 5]},
  right: {dx: 1, dy: 0, idle: 7, frames: [6, 7, 8]},
  up: {dx: 0, dy: -1, idle: 10, frames: [9, 10, 11]}
};
const OPPOSITE = {down: 'up', up: 'down', left: 'right', right: 'left'};

const ACTOR_STORY_KEYS = {
  captain: 'team_locker_room:captain_block',
  coach: 'wrestling_room:coach_found',
  rex_mat: 'wrestling_room:rex_wrestleoff',
  assistant_coach: 'camp_randall:assistant_coach',
  team_bus_manager: 'camp_randall:team_bus',
  homecoming_captain: 'camp_randall:homecoming',
  rex_route_one: 'r1:rex_rematch',
  recruiting_guide: 'r1:recruit_lesson',
  route_wrestler_one: 'r1:gauntlet_one',
  route_wrestler_two: 'r1:gauntlet_two',
  equipment_manager: 'field_house:equipment_delivery',
  lakeshore_scout: 'lakeshore_path:first_recruit_zone',
  blue_chip_scout: 'lakeshore_path:blue_chip_cove',
  funk_doctor_actor: 'picnic_point:funk_doctor',
  deion_actor: 'state_street:deion_throw',
  state_thrower: 'state_street:throw_trainer_two',
  professor_actor: 'bascom_hill:professor_wall',
  capitol_booster: 'capitol_square:booster_speech',
  senator_actor: 'capitol_square:senator_badge',
  boat_attendant: 'monona_shore:voucher_redeem',
  monona_wrestler: 'monona_shore:water_trainer',
  conference_official: 'kohl_center:conference_checkin',
  anchor_actor: 'kohl_center:anchor_badge',
  bus_manager: 'kohl_center:bus_return',
  airport_official: 'airport:flight_cutscene',
  nationals_official: 'st_louis:nationals_round_one',
  closer_actor: 'st_louis:closer_semifinal',
  rex_final_actor: 'st_louis:rex_final',
  coach_office_review: 'coach_office:progress_review',
  trainer_attendant: 'trainer_room:recover',
  trainer_locker_attendant: 'trainer_room:locker_access',
  buckys_clerk: 'buckys_locker_room:shop',
  field_opener_inside: 'field_house_floor:opener',
  capitol_booster_inside: 'capitol_interior:booster',
  senator_inside: 'capitol_interior:senator',
  boat_attendant_inside: 'brittingham_boats:redeem_voucher',
  kohl_round_one_inside: 'kohl_bracket_floor:round_one',
  kohl_round_two_inside: 'kohl_bracket_floor:round_two',
  kohl_anchor_inside: 'kohl_bracket_floor:anchor',
  nationals_round_one_inside: 'nationals_floor:round_one',
  nationals_closer_inside: 'nationals_floor:closer',
  nationals_rex_inside: 'nationals_floor:rex'
};

const BATTLES = {
  'r1:rex_rematch': {team: [['fieldflyer', 7]], trainerName: 'Rex', battleType: 'trainer', defeatKey: 'rex_route_one', reward: {grit: 5, rep: 3}},
  'r1:gauntlet_one': {team: [['pacesetter', 7], ['drillpartner', 7]], trainerName: 'Route Wrestler', battleType: 'trainer', defeatKey: 'r1_gauntlet_one', reward: {grit: 5, rep: 4}},
  'r1:gauntlet_two': {team: [['matreturner', 8], ['riverroller', 8]], trainerName: 'Open Mat Regular', battleType: 'trainer', defeatKey: 'r1_gauntlet_two', reward: {grit: 6, rep: 4}},
  'field_house_floor:opener': {team: [['captainneutral', 10]], trainerName: 'The Opener', battleType: 'gym', defeatKey: 'field_house_opener', badge: 'Field House Badge', requiresFlag: 'rosterBook', requirementMessage: 'Coach must issue the Roster Book before the Field House challenge.', reward: {grit: 12, rep: 10}},
  'picnic_point:funk_doctor': {team: [['funklord', 16], ['scrambleboss', 17]], trainerName: 'The Funk Doctor', battleType: 'gym', defeatKey: 'picnic_funk_doctor', badge: 'Picnic Point Badge', requiresBadges: ['Field House Badge'], requirementMessage: 'Earn the Field House Badge before challenging the Funk Doctor.', reward: {grit: 15, rep: 13}},
  'state_street:deion_throw': {team: [['lockthrow', 12]], trainerName: 'Deion', battleType: 'trainer', defeatKey: 'state_deion', reward: {grit: 7, rep: 6}},
  'state_street:throw_trainer_two': {team: [['whizzkid', 13], ['lockthrow', 13]], trainerName: 'State Street Thrower', battleType: 'trainer', defeatKey: 'state_thrower', reward: {grit: 8, rep: 7}},
  'bascom_hill:professor_wall': {team: [['whizzkid', 15], ['professor', 16]], trainerName: 'The Professor', battleType: 'trainer', defeatKey: 'bascom_professor', reward: {grit: 14, rep: 12}},
  'capitol_interior:senator': {team: [['lockthrow', 15], ['senator', 16]], trainerName: 'The Senator', battleType: 'gym', defeatKey: 'capitol_senator', badge: 'Capitol Badge', requiresKeyItem: 'kayakVoucher', requirementMessage: 'Hear the Capitol booster before challenging the Senator.', reward: {grit: 16, rep: 14}},
  'capitol_square:senator_badge': {team: [['lockthrow', 15], ['senator', 16]], trainerName: 'The Senator', battleType: 'gym', defeatKey: 'capitol_senator', badge: 'Capitol Badge', requiresKeyItem: 'kayakVoucher', requirementMessage: 'The Senator is waiting inside the Capitol.', reward: {grit: 16, rep: 14}},
  'monona_shore:water_trainer': {team: [['riverroller', 17], ['lakechain', 17]], trainerName: 'Shoreline Wrestler', battleType: 'trainer', defeatKey: 'monona_trainer', reward: {grit: 10, rep: 8}},
  'kohl_bracket_floor:round_one': {team: [['tilttech', 18], ['pacecommand', 18]], trainerName: 'Conference Quarterfinalist', battleType: 'tournament', defeatKey: 'kohl_round_one', requiresBadges: ['Field House Badge', 'Picnic Point Badge', 'Capitol Badge'], requirementMessage: 'Bring the Field House, Picnic Point, and Capitol credentials to the bracket.', reward: {grit: 12, rep: 10}},
  'kohl_bracket_floor:round_two': {team: [['chainmaster', 19], ['drillveteran', 19]], trainerName: 'Conference Semifinalist', battleType: 'tournament', defeatKey: 'kohl_round_two', requiresDefeat: 'kohl_round_one', requirementMessage: 'Win the conference quarterfinal first.', reward: {grit: 13, rep: 11}},
  'kohl_bracket_floor:anchor': {team: [['tilttech', 19], ['topboss', 20]], trainerName: 'The Anchor', battleType: 'gym', defeatKey: 'kohl_anchor', badge: 'Kohl Badge', requiresDefeat: 'kohl_round_two', requirementMessage: 'Win the conference semifinal before facing The Anchor.', reward: {grit: 18, rep: 16}},
  'kohl_center:anchor_badge': {team: [['tilttech', 19], ['topboss', 20]], trainerName: 'The Anchor', battleType: 'gym', defeatKey: 'kohl_anchor', badge: 'Kohl Badge', requiresDefeat: 'kohl_round_two', requirementMessage: 'The Anchor is waiting at the end of the bracket inside Kohl Center.', reward: {grit: 18, rep: 16}},
  'nationals_floor:round_one': {team: [['chainmaster', 22], ['tilttech', 22], ['pacecommand', 22]], trainerName: 'National Qualifier', battleType: 'tournament', defeatKey: 'nationals_round_one', requiresBadges: [...SEASON_ONE_BADGES], requiresKeyItem: 'flightTicket', requirementMessage: 'Four credentials and the team flight are required for Nationals.', reward: {grit: 16, rep: 15}},
  'nationals_floor:closer': {team: [['pacecommand', 23], ['closer', 24]], trainerName: 'The Closer', battleType: 'tournament', defeatKey: 'nationals_closer', requiresDefeat: 'nationals_round_one', requirementMessage: 'Win the opening round before the semifinal.', reward: {grit: 20, rep: 18}},
  'nationals_floor:rex': {team: [['scramblesaint', 24], ['rideking', 24], ['buckallam', 25]], trainerName: 'Rex', battleType: 'tournament', defeatKey: 'nationals_rex', requiresDefeat: 'nationals_closer', requirementMessage: 'Defeat The Closer before the national final.', reward: {grit: 30, rep: 25}}
};

const SCOUT_POOLS = {
  r1: [['pacesetter', 6], ['drillpartner', 7], ['matreturner', 7]],
  lakeshore_path: [['lakechain', 9], ['riverroller', 9], ['whizzkid', 10]],
  picnic_point: [['riverroller', 13], ['funklord', 15], ['lakechain', 13]],
  state_street: [['lockthrow', 12], ['whizzkid', 12], ['drillpartner', 11]],
  bascom_hill: [['whizzkid', 14], ['tilttech', 15], ['drillveteran', 14]],
  capitol_square: [['lockthrow', 15], ['tilttech', 15], ['pacecommand', 15]],
  monona_shore: [['riverroller', 16], ['lakechain', 16], ['chainmaster', 17]],
  kohl_center: [['tilttech', 18], ['pacecommand', 18], ['drillveteran', 18]],
  st_louis: [['chainmaster', 21], ['funklord', 21], ['tilttech', 21]]
};

export class SeasonOneOverworldScene extends Phaser.Scene {
  constructor() {
    super('OverworldScene');
  }

  create() {
    this.state = loadState();
    this.reconcileStoryState();
    this.currentMapId = resolveSeasonMapId(this.state.area);
    this.returnStack = Array.isArray(this.state.mapReturnStack) ? [...this.state.mapReturnStack] : [];
    this.facing = DIRS[this.state.facing] ? this.state.facing : 'down';
    const initialSpawn = validSeasonPosition(this.currentMapId, this.state.pos)
      ? this.state.pos
      : defaultSeasonSpawn(this.currentMapId);
    this.tilePos = {x: initialSpawn.x, y: initialSpawn.y};
    this.message = this.state.message || '';
    this.messageOpen = Boolean(this.message);
    this.messageAction = null;
    this.moving = false;
    this.inputLocked = false;
    this.heldDirection = null;
    this.worldObjects = [];
    this.actorEntries = [];
    this.cameras.main.setBackgroundColor('#101115');
    this.cameras.main.setRoundPixels(true);
    setMuted(this.state.audioMuted);
    playMusic('overworld');
    this.bindInput();
    setVirtualHandler(this);
    this.ensureWalkAnimations();
    this.renderCurrentMap();
    this.drawHud();

    const recoveryPending = this.state.flags.openingBattleComplete && !this.state.flags.openingRecoveryDone;
    const battlePending = this.state.flags.openingBattleReady && !this.state.flags.openingBattleComplete;
    if (recoveryPending || battlePending) {
      this.inputLocked = true;
      this.time.delayedCall(250, () => recoveryPending ? this.scene.start('OpeningRecoveryScene') : this.startOpeningBattle());
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
      menu: Phaser.Input.Keyboard.KeyCodes.M,
      escape: Phaser.Input.Keyboard.KeyCodes.ESC
    });
    this.keys = keys;
    const directions = {up: ['up', 'w'], down: ['down', 's'], left: ['left', 'a'], right: ['right', 'd']};
    for (const [direction, names] of Object.entries(directions)) {
      names.forEach(name => {
        keys[name].on('down', () => this.handleVirtualButton(direction, 'down'));
        keys[name].on('up', () => this.handleVirtualButton(direction, 'up'));
      });
    }
    keys.action.on('down', () => this.handleVirtualButton('a'));
    keys.enter.on('down', () => this.handleVirtualButton('a'));
    keys.menu.on('down', () => this.handleVirtualButton('menu'));
    keys.escape.on('down', () => this.handleVirtualButton('b'));
    this.holdClock = this.time.addEvent({
      delay: 145,
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
    if (key === 'a') this.interact();
    else if (key === 'b') this.messageOpen ? this.closeMessage() : null;
    else if (key === 'menu') this.openMenu();
    else if (key === 'save') this.savePosition('Game saved.');
  }

  trackWorld(object) {
    this.worldObjects.push(object);
    return object;
  }

  ensureWalkAnimations() {
    for (const asset of SEASON_ONE_PROJECT.assets.actors) {
      const texture = `season-actor:${asset.sourceId}`;
      for (const [direction, config] of Object.entries(DIRS)) {
        const key = `${texture}:walk-${direction}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: config.frames.map(frame => ({key: texture, frame})),
          frameRate: 18,
          repeat: -1
        });
      }
    }
  }

  clearWorld() {
    this.worldObjects.forEach(object => object?.destroy?.());
    this.worldObjects = [];
    this.actorEntries = [];
    this.player = null;
    this.shadow = null;
  }

  renderCurrentMap() {
    this.clearWorld();
    this.map = seasonMap(this.currentMapId);
    this.visibleActors = actorsForMap(this.map, this.state);
    this.tilePos = this.findSafeSpawn(this.tilePos);
    this.renderGround();
    this.renderStructures();
    this.renderActors();
    this.createPlayer();
    this.cameras.main.setBounds(0, 0, this.map.width * CELL_SIZE, this.map.height * CELL_SIZE);
    this.cameras.main.startFollow(this.player, true, 1, 1, 0, -18);
    this.cameras.main.setDeadzone(16, 16);
    this.showAreaToast(this.map.name);
  }

  renderGround() {
    if (this.map.renderModel === 'object' && this.map.background?.path) {
      this.trackWorld(this.add.image(0, 0, `season-bg:${this.currentMapId}`).setOrigin(0).setDepth(0));
      return;
    }
    const data = Array.from({length: this.map.height}, (_, y) => Array.from({length: this.map.width}, (_, x) => {
      const visual = terrainVisual(this.map, x, y);
      return Number.isInteger(visual) ? visual : 0;
    }));
    const tilemap = this.make.tilemap({data, tileWidth: CELL_SIZE, tileHeight: CELL_SIZE});
    const tileset = tilemap.addTilesetImage('season-one-metatiles', 'season-one-metatiles', CELL_SIZE, CELL_SIZE, 0, 0);
    const layer = tilemap.createLayer(0, tileset, 0, 0).setDepth(0);
    this.trackWorld(layer);
    this.tilemap = tilemap;
  }

  renderStructures() {
    for (const object of this.map.objects || []) {
      if (object.metatiles) {
        for (let y = 0; y < object.height; y += 1) {
          for (let x = 0; x < object.width; x += 1) {
            const tile = metatile(object.metatiles[y]?.[x]);
            if (!tile) continue;
            const worldY = object.y + y;
            this.trackWorld(this.add.image(
              (object.x + x + 0.5) * CELL_SIZE,
              (worldY + 0.5) * CELL_SIZE,
              'season-one-metatiles',
              tile.visual
            ).setDepth((worldY + 1) * CELL_SIZE - 1));
          }
        }
        continue;
      }
      const asset = objectAsset(object);
      if (!asset?.path) continue;
      this.trackWorld(this.add.image(
        object.x * CELL_SIZE,
        object.y * CELL_SIZE,
        `season-object:${asset.id}`
      ).setOrigin(0).setDisplaySize(object.width * CELL_SIZE, object.height * CELL_SIZE)
        .setDepth((object.y + object.height) * CELL_SIZE - 1));
    }
  }

  renderActors() {
    for (const actor of this.visibleActors) {
      const texture = `season-actor:${actor.assetId.split(':').at(-1)}`;
      const position = this.worldPosition(actor.x, actor.y);
      const shadow = this.trackWorld(this.add.ellipse(position.x, position.y - 3, 24, 8, 0x10120f, 0.38).setDepth(position.y - 2));
      const sprite = this.trackWorld(this.add.sprite(position.x, position.y, texture, DIRS[actor.facing]?.idle ?? DIRS.down.idle)
        .setOrigin(0.5, 1).setDepth(position.y));
      this.actorEntries.push({data: actor, sprite, shadow});
    }
  }

  createPlayer() {
    const position = this.worldPosition(this.tilePos.x, this.tilePos.y);
    this.shadow = this.trackWorld(this.add.ellipse(position.x, position.y - 3, 25, 8, 0x10120f, 0.42).setDepth(position.y - 2));
    this.player = this.trackWorld(this.add.sprite(position.x, position.y, 'season-actor:player', DIRS[this.facing].idle)
      .setOrigin(0.5, 1).setDepth(position.y));
  }

  worldPosition(x, y) {
    return {x: (x + 0.5) * CELL_SIZE, y: (y + 1) * CELL_SIZE};
  }

  setFacing(direction) {
    this.facing = direction;
    if (this.player && !this.moving) this.player.setFrame(DIRS[direction].idle);
  }

  findSafeSpawn(requested) {
    const start = validSeasonPosition(this.currentMapId, requested) ? requested : defaultSeasonSpawn(this.currentMapId);
    const actorData = this.visibleActors || [];
    if (isSeasonPassable(this.map, start.x, start.y, this.state, actorData)) return {x: start.x, y: start.y};
    const queue = [{x: start.x, y: start.y}];
    const seen = new Set([`${start.x},${start.y}`]);
    while (queue.length) {
      const current = queue.shift();
      for (const direction of Object.values(DIRS)) {
        const next = {x: current.x + direction.dx, y: current.y + direction.dy};
        const key = `${next.x},${next.y}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (isSeasonPassable(this.map, next.x, next.y, this.state, actorData)) return next;
        if (next.x >= 0 && next.y >= 0 && next.x < this.map.width && next.y < this.map.height) queue.push(next);
      }
    }
    const fallback = defaultSeasonSpawn(this.currentMapId);
    return {x: fallback.x, y: fallback.y};
  }

  tryMove(direction) {
    if (this.inputLocked || this.moving) return;
    if (this.messageOpen) {
      this.closeMessage();
      return;
    }
    if (this.facing !== direction) {
      this.setFacing(direction);
      return;
    }
    const delta = DIRS[direction];
    const next = {x: this.tilePos.x + delta.dx, y: this.tilePos.y + delta.dy};
    const connection = connectionForStep(this.map, next.x, next.y, direction);
    if (connection) {
      const gate = this.connectionGate(this.currentMapId, connection.connection.to);
      if (gate) return this.showMessage(gate);
      return this.changeMap(connection.connection.to, {...connection.spawn, facing: direction});
    }
    if (!isSeasonPassable(this.map, next.x, next.y, this.state, this.visibleActors)) {
      sfx.bump?.();
      return;
    }
    this.tilePos = next;
    this.moving = true;
    const position = this.worldPosition(next.x, next.y);
    sfx.step?.();
    this.player.play(`season-actor:player:walk-${direction}`, true);
    this.tweens.add({targets: this.shadow, x: position.x, y: position.y - 3, duration: STEP_MS, ease: 'Linear'});
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
        this.player.stop();
        this.moving = false;
        this.setFacing(direction);
        this.afterStep();
      }
    });
  }

  afterStep() {
    const door = mapDoorAt(this.map, this.tilePos.x, this.tilePos.y);
    if (door) return this.enterDoor(door);
    if (this.map.type === 'interior' && this.map.exit
      && this.tilePos.x === this.map.exit.x && this.tilePos.y === this.map.exit.y) return this.leaveInterior();
    this.savePosition();
    const event = mapEventAt(this.map, this.tilePos.x, this.tilePos.y);
    if (event && ['capitol_reveal', 'field_threshold'].includes(event.id)) this.handleStoryKey(`${this.currentMapId}:${event.id}`, event);
    if (this.isOpenMatCell() && this.state.flags.recruitingUnlocked && Math.random() < 0.08) this.startScout();
    this.drawHud();
  }

  connectionGate(from, to) {
    if (from === 'camp_randall' && to === 'r1' && !this.state.flags.openingRecoveryDone) return 'Coach has not cleared you to leave Camp Randall yet.';
    if (from === 'camp_randall' && to === 'r1' && !this.state.flags.assignment) return 'Report back to Coach in the wrestling room for your first assignment.';
    if (from === 'field_house' && to === 'state_street' && !this.hasBadge('Field House Badge')) return 'The route east opens after you earn the Field House Badge.';
    if (from === 'capitol_square' && to === 'monona_shore' && !this.state.keyItems.kayakVoucher) return 'Brittingham requires the Kayak Voucher from the Capitol booster.';
    return '';
  }

  enterDoor(door) {
    if (door.object.gate === 'season_complete' && !this.state.flags.nationalsComplete) {
      return this.showMessage('The stadium tunnel opens for the national champions at the end of the season.');
    }
    const returnY = Phaser.Math.Clamp(door.object.y + door.object.height, 0, this.map.height - 1);
    this.returnStack.push({mapId: this.currentMapId, x: door.object.x + (door.object.door?.x || 0), y: returnY, facing: 'down'});
    this.state.mapReturnStack = [...this.returnStack];
    this.changeMap(door.to, defaultSeasonSpawn(door.to), {save: true});
  }

  leaveInterior() {
    const fallback = {
      team_locker_room: {mapId: 'camp_randall', x: 5, y: 11, facing: 'down'},
      coach_office: {mapId: 'camp_randall', x: 17, y: 13, facing: 'down'},
      wrestling_room: {mapId: 'team_locker_room', x: 7, y: 1, facing: 'down'}
    }[this.currentMapId] || {mapId: 'camp_randall', ...defaultSeasonSpawn('camp_randall')};
    const destination = this.returnStack.pop() || fallback;
    this.state.mapReturnStack = [...this.returnStack];
    this.changeMap(destination.mapId, destination, {save: true});
  }

  changeMap(mapId, spawn, options = {}) {
    this.inputLocked = true;
    this.cameras.main.fadeOut(120, 0, 0, 0);
    this.time.delayedCall(125, () => {
      this.currentMapId = resolveSeasonMapId(mapId);
      this.tilePos = {x: spawn.x, y: spawn.y};
      this.facing = DIRS[spawn.facing] ? spawn.facing : this.facing;
      this.state.area = this.currentMapId;
      this.state.visitedMaps = {...(this.state.visitedMaps || {}), [this.currentMapId]: true};
      this.state.pos = {...this.tilePos};
      this.state.facing = this.facing;
      if (options.save !== false) saveState(this.state);
      this.renderCurrentMap();
      this.cameras.main.fadeIn(160, 0, 0, 0);
      this.inputLocked = false;
      this.drawHud();
    });
  }

  frontTile() {
    const direction = DIRS[this.facing];
    return {x: this.tilePos.x + direction.dx, y: this.tilePos.y + direction.dy};
  }

  actorAt(tile) {
    return this.actorEntries.find(entry => entry.data.x === tile.x && entry.data.y === tile.y) || null;
  }

  pass(x, y) {
    return isSeasonPassable(this.map, x, y, this.state, this.visibleActors || []);
  }

  interactionTarget() {
    const front = this.frontTile();
    const actor = this.actorAt(front);
    if (actor) return {type: 'actor', actor};
    const door = mapDoorAt(this.map, front.x, front.y);
    if (door) return {type: 'door', door};
    const frontEvent = mapEventAt(this.map, front.x, front.y);
    if (frontEvent) return {type: 'event', event: frontEvent};
    const hereEvent = mapEventAt(this.map, this.tilePos.x, this.tilePos.y);
    if (hereEvent) return {type: 'event', event: hereEvent};
    const object = objectsAt(this.map, front.x, front.y).at(-1)?.object;
    if (object) return {type: 'object', object};
    return null;
  }

  interact() {
    if (this.inputLocked || this.moving) return;
    if (this.messageOpen) return this.closeMessage();
    const target = this.interactionTarget();
    if (!target) return;
    sfx.talk?.();
    if (target.type === 'door') return this.enterDoor(target.door);
    if (target.type === 'actor') {
      target.actor.sprite.setFrame(DIRS[OPPOSITE[this.facing]].idle);
      const storyKey = ACTOR_STORY_KEYS[target.actor.data.id];
      if (storyKey) return this.handleStoryKey(storyKey, target.actor.data);
      return this.showMessage(target.actor.data.dialogue || 'Keep working.');
    }
    if (target.type === 'event') return this.handleStoryKey(`${this.currentMapId}:${target.event.id}`, target.event);
    if (target.object.interior) return this.enterDoor({object: target.object, to: target.object.interior});
    this.showMessage(target.object.name || 'A familiar campus landmark.');
  }

  handleStoryKey(key, source = null) {
    if (BATTLES[key]) return this.startConfiguredBattle(key);
    switch (key) {
      case 'team_locker_room:captain_block':
        return this.showMessage(this.state.flags.officeChecked
          ? 'Captain: Coach is in the wrestling room. Go through the north door.'
          : 'Captain: Coach is missing. Check his office outside before you enter the wrestling room.');
      case 'coach_office:office_empty':
      case 'camp_randall:coach_office_empty':
        if (!this.state.flags.officeChecked) {
          this.state.flags.officeChecked = true;
          this.setObjective('Find Coach in the wrestling room.');
          saveState(this.state);
          this.renderCurrentMap();
        }
        return this.showMessage('The office is empty. The depth chart points you back to the wrestling room.');
      case 'wrestling_room:coach_found':
        if (!this.state.flags.personaChosen) {
          return this.showMessage('Coach: Every wrestler needs an identity. Choose how you impose yourself on a match.', () => {
            this.savePosition();
            this.scene.start('StarterScene', {story: true, returnArea: 'wrestling_room', returnPos: {x: 7, y: 7}});
          });
        }
        if (this.state.flags.openingRecoveryDone && !this.state.flags.assignment) {
          this.state.flags.assignment = true;
          this.setObjective('Take R1 to the Field House equipment manager.');
          saveState(this.state);
          return this.showMessage('Coach: Carry the equipment shipment through R1. Meet the manager outside the Field House.');
        }
        return this.showMessage('Coach: Win positions, build the room, and return when the season changes.');
      case 'wrestling_room:rex_wrestleoff':
        return this.state.flags.openingBattleComplete
          ? this.showMessage('Rex: The first result is not the last word.')
          : this.startOpeningBattle();
      case 'camp_randall:assistant_coach':
        return this.showMessage('Camp Randall is home. R1 begins at the south landing.');
      case 'field_house:equipment_delivery':
      case 'field_house_floor:delivery':
        if (!this.state.keyItems.equipmentShipment) {
          grantKeyItem(this.state, 'equipmentShipment');
          this.state.flags.equipmentDelivered = true;
          this.setObjective("Check Bucky's Locker Room beside the Field House.");
          saveState(this.state);
          return this.showMessage("Equipment Manager: Shipment received. Your locker authorization is waiting at Bucky's Locker Room.");
        }
        return this.showMessage('Equipment Manager: The room is stocked. Finish your assignment.');
      case 'field_house:locker_access':
        if (!this.state.keyItems.equipmentShipment) return this.showMessage('The locker authorization is not ready. Find the equipment manager first.');
        if (!this.state.flags.lockerUnlocked) {
          this.state.flags.lockerUnlocked = true;
          this.setObjective('Return to Coach for the Roster Book.');
          saveState(this.state);
        }
        return this.showMessage('Your team locker is active. Coach has the Roster Book back at Camp Randall.');
      case 'coach_office:progress_review':
        if (this.state.flags.lockerUnlocked && !this.state.flags.rosterBook) {
          unlockRecruiting(this.state);
          this.setObjective('Challenge The Opener inside the Field House.');
          saveState(this.state);
          return this.showMessage('Coach: This Roster Book records every wrestler you defeat. Open mats can now become recruits.');
        }
        if (canFlyToNationals(this.state) && !this.state.keyItems.flightTicket) {
          grantKeyItem(this.state, 'flightTicket');
          this.setObjective('Meet the team bus at the Camp Randall south landing.');
          saveState(this.state);
          this.renderCurrentMap();
          return this.showMessage('Coach: Four credentials. One ticket. The team bus is waiting at the south landing.');
        }
        return this.showMessage(this.objectiveText());
      case 'r1:recruit_lesson':
        return this.state.flags.recruitingUnlocked ? this.startScout() : this.showMessage('You need the Roster Book before you can recruit from open mats.');
      case 'lakeshore_path:first_recruit_zone':
      case 'lakeshore_path:blue_chip_cove':
        return this.startScout();
      case 'capitol_square:booster_speech':
      case 'capitol_interior:booster':
        if (!this.state.keyItems.kayakVoucher) {
          grantKeyItem(this.state, 'kayakVoucher');
          this.setObjective('Challenge The Senator inside the Capitol.');
          saveState(this.state);
        }
        return this.showMessage('Booster: This Kayak Voucher opens Brittingham and the Monona crossing.');
      case 'capitol_square:bus_pass':
        if (!this.hasBadge('Capitol Badge')) return this.showMessage("The Senator's staff issues the Bus Pass after the Capitol Badge.");
        if (!this.state.keyItems.busPass) {
          grantKeyItem(this.state, 'busPass');
          this.registerSeasonTravel();
          this.setObjective('Redeem the Kayak Voucher at Brittingham Boats.');
          saveState(this.state);
        }
        return this.showMessage('Bus Pass received. START now lists unlocked town stops.');
      case 'brittingham_boats:redeem_voucher':
      case 'monona_shore:voucher_redeem':
        if (!this.state.keyItems.kayakVoucher) return this.showMessage('Brittingham requires the Kayak Voucher from Capitol Square.');
        this.state.flags.kayakVoucherRedeemed = true;
        this.setObjective('Cross Monona Shore to the Kohl Center district.');
        saveState(this.state);
        return this.showMessage('Brittingham Attendant: Voucher redeemed. Stay inside the marked channel.');
      case 'monona_shore:kayak_gate':
        return this.state.flags.kayakVoucherRedeemed
          ? this.showMessage('The marked channel runs south to Kohl Center.')
          : this.showMessage('Redeem the Kayak Voucher at Brittingham before entering the channel.');
      case 'kohl_center:conference_checkin':
        return this.showMessage('Conference Official: The bracket is posted inside Kohl Center.');
      case 'kohl_center:bus_return':
        if (!canFlyToNationals(this.state)) return this.showMessage(`The team bus leaves after all four credentials. Missing: ${this.missingBadges().join(', ')}.`);
        this.setObjective('Report to Coach in the Camp Randall office.');
        saveState(this.state);
        return this.showMessage('Bus Manager: All credentials verified. Returning to Camp Randall.', () => {
          this.changeMap('camp_randall', {x: 11, y: 18, facing: 'up'});
        });
      case 'camp_randall:team_bus':
        if (!this.state.keyItems.flightTicket) return this.showMessage('Coach still has the flight packet.');
        this.state.flags.sendoffComplete = true;
        this.setObjective('Board the team flight.');
        saveState(this.state);
        return this.showMessage('Manager: Bags loaded. Next stop, St. Louis.', () => this.changeMap('airport', defaultSeasonSpawn('airport')));
      case 'airport:team_sendoff':
        return this.showMessage('Coach: Stay together. Nationals is a tournament before it is a final.');
      case 'airport:flight_cutscene':
        if (!canFlyToNationals(this.state) || !this.state.keyItems.flightTicket) return this.showMessage('Four credentials and the team flight ticket are required.');
        this.state.flags.flightComplete = true;
        this.setObjective('Enter the Nationals arena in St. Louis.');
        saveState(this.state);
        return this.showMessage('Boarding complete. Wisconsin is headed to St. Louis.', () => this.changeMap('st_louis', defaultSeasonSpawn('st_louis')));
      case 'st_louis:nationals_round_one':
      case 'st_louis:closer_semifinal':
      case 'st_louis:rex_final':
        return this.showMessage('The Nationals bracket is contested inside the arena. Enter through the main doors.');
      case 'st_louis:arch_victory':
        if (!this.state.flags.nationalsComplete) return this.showMessage('The championship procession waits for the final result.');
        this.state.flags.homecoming = true;
        this.setObjective('Carry the title through the Camp Randall stadium tunnel.');
        saveState(this.state);
        return this.showMessage('The team walks beneath the Arch with the national trophy.', () => this.changeMap('camp_randall', {x: 12, y: 8, facing: 'up'}));
      case 'camp_randall:homecoming':
        return this.showMessage('Captain: The tunnel is open. Bring the trophy home.');
      case 'team_locker_room:homecoming_case':
        return this.showMessage('The new national championship sits beside every team that built the room.');
      case 'stadium_tunnel:field_threshold':
        if (!this.state.flags.nationalsComplete) return this.showMessage('The field is reserved for the championship homecoming.');
        this.state.flags.seasonOneComplete = true;
        this.setObjective('Season One complete. The roster remains ready for expansion.');
        saveState(this.state);
        return this.showMessage('Camp Randall erupts as Wisconsin carries the national title onto the field. Season One complete.');
      case 'trainer_room:recover':
        restoreParty(this.state);
        saveState(this.state);
        sfx.open?.();
        return this.showMessage('The Trainer restored every wrestler to full Condition and Stamina.');
      case 'trainer_room:locker_access':
        if (!this.state.flags.lockerUnlocked) return this.showMessage('Coach has not activated the team locker yet.');
        return this.scene.launch('MenuScene', {parent: this, tab: 'locker'});
      case 'buckys_locker_room:shop':
        return this.scene.launch('MenuScene', {parent: this, tab: 'shop'});
      default:
        return this.showMessage(source?.dialogue || source?.label || 'Keep working.');
    }
  }

  startConfiguredBattle(key) {
    const config = BATTLES[key];
    if (!config) return;
    if (config.requiresFlag && !this.state.flags?.[config.requiresFlag]) return this.showMessage(config.requirementMessage || 'Complete the current assignment first.');
    if (config.requiresKeyItem && !this.state.keyItems?.[config.requiresKeyItem]) return this.showMessage(config.requirementMessage || 'A required key item is missing.');
    if (config.requiresDefeat && !this.state.trainersDefeated?.[config.requiresDefeat]) return this.showMessage(config.requirementMessage || 'Win the previous match first.');
    if (config.requiresBadges?.some(badge => !this.hasBadge(badge))) return this.showMessage(config.requirementMessage || 'More venue credentials are required.');
    if (config.badge && this.hasBadge(config.badge)) return this.showMessage(`${config.trainerName} has already awarded the ${canonicalBadge(config.badge)}.`);
    if (config.defeatKey && this.state.trainersDefeated?.[config.defeatKey]) return this.showMessage(`${config.trainerName}: We already settled this match.`);
    if (!this.state.party.length) return this.showMessage('Choose a mat persona before entering a match.');
    this.savePosition();
    this.inputLocked = true;
    this.cameras.main.flash(100, 255, 255, 255);
    this.time.delayedCall(170, () => this.cameras.main.flash(100, 255, 255, 255));
    this.time.delayedCall(360, () => this.cameras.main.fadeOut(220, 0, 0, 0));
    this.time.delayedCall(590, () => this.scene.start('BattleScene', config));
  }

  startOpeningBattle() {
    if (!this.state.party.length) return this.showMessage('Choose a mat persona first.');
    const rivalId = this.state.opening?.rivalPersona || counterStarterFor(this.state.party[0].id);
    this.state.opening = {...(this.state.opening || {}), playerPersona: this.state.party[0].id, rivalPersona: rivalId, battleResult: null};
    this.savePosition();
    this.scene.start('BattleScene', {team: [[rivalId, 5]], battleType: 'opening', trainerName: 'Rex', reward: {grit: 0, rep: 0}});
  }

  startScout() {
    if (!this.state.flags.recruitingUnlocked) return this.showMessage('Coach must issue the Roster Book before you can recruit.');
    const pool = SCOUT_POOLS[this.currentMapId] || SCOUT_POOLS.r1;
    const [id, lvl] = pool[Math.floor(Math.random() * pool.length)];
    this.state.dex.seen[id] = true;
    this.state.stats.scouts = (this.state.stats.scouts || 0) + 1;
    this.savePosition();
    this.scene.start('ScoutScene', {id, lvl, area: this.currentMapId, rare: ROSTER[id]?.rarity === 'Rare'});
  }

  isOpenMatCell() {
    return objectsAt(this.map, this.tilePos.x, this.tilePos.y).some(({object}) => /wrestling mat|practice mat/i.test(object.name || ''));
  }

  hasBadge(name) {
    return (this.state.badges || []).some(badge => canonicalBadge(badge) === canonicalBadge(name));
  }

  missingBadges() {
    return SEASON_ONE_BADGES.filter(badge => !this.hasBadge(badge));
  }

  reconcileStoryState() {
    this.state.flags = this.state.flags || {};
    if (this.hasBadge('Field House Badge') && !this.state.flags.fieldHouseComplete) {
      this.state.flags.fieldHouseComplete = true;
      this.setObjective('Follow Lakeshore Path west to Picnic Point.');
    }
    if (this.hasBadge('Picnic Point Badge') && !this.state.flags.picnicComplete) {
      this.state.flags.picnicComplete = true;
      this.setObjective('Take State Street east toward Capitol Square.');
    }
    if (this.hasBadge('Capitol Badge') && !this.state.flags.capitolComplete) {
      this.state.flags.capitolComplete = true;
      this.setObjective('Collect the Bus Pass and redeem the Kayak Voucher.');
    }
    if (this.state.trainersDefeated?.kohl_round_one && !this.state.flags.kohlRoundOneComplete) {
      this.state.flags.kohlRoundOneComplete = true;
      this.setObjective('Win the conference semifinal.');
    }
    if (this.state.trainersDefeated?.kohl_round_two && !this.state.flags.kohlRoundTwoComplete) {
      this.state.flags.kohlRoundTwoComplete = true;
      this.setObjective('Challenge The Anchor for the Kohl credential.');
    }
    if (this.hasBadge('Kohl Badge') && !this.state.flags.kohlComplete) {
      this.state.flags.kohlComplete = true;
      this.setObjective('Verify all four credentials at the team bus.');
    }
    if (this.state.trainersDefeated?.nationals_round_one && !this.state.flags.nationalsRoundOneComplete) {
      this.state.flags.nationalsRoundOneComplete = true;
      this.setObjective('Face The Closer in the national semifinal.');
    }
    if (this.state.trainersDefeated?.nationals_closer && !this.state.flags.nationalsSemifinalComplete) {
      this.state.flags.nationalsSemifinalComplete = true;
      this.setObjective('Face Rex for the national championship.');
    }
    if (this.state.trainersDefeated?.nationals_rex && !this.state.flags.nationalsComplete) {
      this.state.flags.nationalsComplete = true;
      this.setObjective('Walk beneath the Arch with the national trophy.');
    }
    this.registerSeasonTravel();
    saveState(this.state);
  }

  registerSeasonTravel() {
    const destinations = [
      {id: 'campRandall', name: 'Camp Randall', area: 'camp_randall', pos: {x: 11, y: 18}},
      {id: 'fieldHouse', name: 'Field House', area: 'field_house', pos: {x: 20, y: 8}},
      {id: 'capitolSquare', name: 'Capitol Square', area: 'capitol_square', pos: {x: 9, y: 14}},
      {id: 'kohlCenter', name: 'Kohl Center', area: 'kohl_center', pos: {x: 20, y: 18}}
    ];
    const visited = this.state.visitedMaps || {};
    destinations.forEach(destination => {
      const unlocked = destination.id === 'campRandall'
        || visited[destination.area]
        || (destination.id === 'fieldHouse' && this.hasBadge('Field House Badge'))
        || (destination.id === 'capitolSquare' && this.hasBadge('Capitol Badge'))
        || (destination.id === 'kohlCenter' && this.hasBadge('Kohl Badge'));
      if (unlocked) registerTravelDestination(this.state, destination);
    });
  }

  setObjective(label) {
    const previous = this.state.objective?.log || [];
    this.state.objective = {
      ...(this.state.objective || {}),
      id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      stage: (this.state.objective?.stage || 0) + 1,
      complete: false,
      log: [label, ...previous.filter(item => item !== label)].slice(0, 8)
    };
  }

  objectiveText() {
    return this.state.objective?.log?.[0] || 'Build the roster and earn all four venue credentials.';
  }

  openMenu() {
    if (this.inputLocked || this.moving) return;
    if (this.messageOpen) return this.closeMessage();
    sfx.open?.();
    this.scene.launch('MenuScene', {parent: this});
  }

  savePosition(message = null) {
    this.state.area = this.currentMapId;
    this.state.visitedMaps = {...(this.state.visitedMaps || {}), [this.currentMapId]: true};
    this.state.pos = {...this.tilePos};
    this.state.facing = this.facing;
    this.state.mapReturnStack = [...this.returnStack];
    if (message) this.state.message = message;
    saveState(this.state);
    if (message) this.showMessage(message);
  }

  showMessage(message, action = null) {
    this.message = message;
    this.messageOpen = Boolean(message);
    this.messageAction = action;
    this.state.message = message || '';
    saveState(this.state);
    this.drawHud();
  }

  closeMessage() {
    const action = this.messageAction;
    this.message = '';
    this.messageOpen = false;
    this.messageAction = null;
    this.state.message = '';
    saveState(this.state);
    this.drawHud();
    if (action) this.time.delayedCall(40, action);
  }

  promptForTarget() {
    const target = this.interactionTarget();
    if (!target) return '';
    if (target.type === 'door') return 'A ENTER';
    if (target.type === 'actor') {
      const key = ACTOR_STORY_KEYS[target.actor.data.id];
      return BATTLES[key] ? 'A WRESTLE' : 'A TALK';
    }
    if (target.type === 'event') {
      const key = `${this.currentMapId}:${target.event.id}`;
      if (BATTLES[key]) return 'A WRESTLE';
      if (key === 'trainer_room:recover') return 'A RECOVER';
      if (key === 'buckys_locker_room:shop') return 'A SHOP';
      return 'A CHECK';
    }
    return target.object.interior ? 'A ENTER' : 'A CHECK';
  }

  drawHud() {
    this.hud?.destroy?.(true);
    this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(5000);
    if (this.messageOpen && this.message) {
      const graphics = this.add.graphics().setScrollFactor(0);
      graphics.fillStyle(0x17151a, 0.38);
      graphics.fillRoundedRect(11, 235, 462, 78, 5);
      graphics.fillStyle(0xf8f1dc, 1);
      graphics.fillRoundedRect(7, 231, 462, 78, 5);
      graphics.lineStyle(3, 0x26232a, 1);
      graphics.strokeRoundedRect(7, 231, 462, 78, 5);
      graphics.lineStyle(2, 0xb51d30, 1);
      graphics.strokeRoundedRect(12, 236, 452, 68, 3);
      const text = this.add.text(24, 244, this.message, {
        fontFamily: FONT,
        fontSize: '17px',
        fontStyle: 'bold',
        color: '#17151a',
        lineSpacing: 3,
        wordWrap: {width: 418}
      }).setScrollFactor(0);
      const advance = this.add.text(446, 286, 'A', {fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#7a1825'}).setScrollFactor(0);
      this.hud.add([graphics, text, advance]);
      return;
    }
    const prompt = this.promptForTarget();
    if (!prompt) return;
    const graphics = this.add.graphics().setScrollFactor(0);
    const width = Math.max(104, prompt.length * 10 + 24);
    const x = VIEW_W - width - 10;
    graphics.fillStyle(0x17151a, 0.9);
    graphics.fillRoundedRect(x, 10, width, 31, 4);
    graphics.lineStyle(2, 0xd1a735, 1);
    graphics.strokeRoundedRect(x, 10, width, 31, 4);
    const text = this.add.text(x + width / 2, 16, prompt, {fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#fff1c7'}).setOrigin(0.5, 0).setScrollFactor(0);
    this.hud.add([graphics, text]);
  }

  showAreaToast(name) {
    this.areaToast?.destroy?.(true);
    const container = this.add.container(0, 0).setScrollFactor(0).setDepth(4900);
    const graphics = this.add.graphics().setScrollFactor(0);
    graphics.fillStyle(0x17151a, 0.94);
    graphics.fillRoundedRect(12, 10, 220, 37, 4);
    graphics.fillStyle(0xb51d30, 1);
    graphics.fillRect(12, 10, 7, 37);
    graphics.lineStyle(2, 0xe3c76d, 1);
    graphics.strokeRoundedRect(12, 10, 220, 37, 4);
    const text = this.add.text(29, 18, name.toUpperCase(), {fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: '#fff1c7'}).setScrollFactor(0);
    container.add([graphics, text]);
    this.areaToast = container;
    this.tweens.add({targets: container, alpha: 0, delay: 1050, duration: 400, onComplete: () => container.destroy(true)});
  }
}
