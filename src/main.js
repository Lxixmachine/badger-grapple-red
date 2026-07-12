import {BootScene} from './scenes/BootScene.js';
import {TitleScene} from './scenes/TitleScene.js';
import {IntroScene} from './scenes/IntroScene.js';
import {StarterScene} from './scenes/StarterScene.js';
import {OverworldScene} from './scenes/OverworldScene.js';
import {ScoutScene} from './scenes/ScoutScene.js';
import {BattleScene} from './scenes/BattleScene.js';
import {MenuScene} from './scenes/MenuScene.js';
import {VisualSliceScene} from './scenes/VisualSliceScene.js';
import {installTestHooks} from './systems/testHooks.js';

const fail = msg => {
  console.error(msg);
  const element = document.getElementById('bootError');
  if (!element) return;
  element.style.display = 'block';
  element.textContent = `Badger Grapple Red boot error:\n${msg}\n\nThis is still the Phaser build; send this screenshot.`;
};

if (!window.Phaser) {
  fail('Phaser did not load from ./vendor/phaser.min.js');
  throw new Error('Phaser missing');
}

const Phaser = window.Phaser;
const params = new URLSearchParams(window.location.search);
const sliceMode = params.has('slice');
const width = sliceMode ? 480 : 320;
const height = sliceMode ? 320 : 224;
const scenes = sliceMode
  ? [VisualSliceScene]
  : [BootScene, TitleScene, IntroScene, StarterScene, OverworldScene, ScoutScene, BattleScene, MenuScene];

if (sliceMode) {
  document.body.classList.add('slice-mode');
  document.title = 'Badger Grapple Red - Scale Slice';
  const note = document.getElementById('note');
  if (note) note.textContent = 'v21.63 Scale Slice';
}

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#000',
  pixelArt: true,
  roundPixels: true,
  width,
  height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  audio: {noAudio: true},
  scene: scenes
};

let game;
try {
  game = new Phaser.Game(config);
  window.badgerGame = game;
  window.BADGER_VERSION = sliceMode ? '21.63-scale-slice' : '21.62-world-compositions';
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  throw error;
}

function routeVirtualButton(key, phase = 'press') {
  const priority = [
    'VisualSliceScene',
    'MenuScene',
    'BattleScene',
    'ScoutScene',
    'StarterScene',
    'TitleScene',
    'OverworldScene'
  ];
  for (const sceneKey of priority) {
    const scene = game.scene.getScene(sceneKey);
    if (scene?.scene?.isActive?.() && scene.handleVirtualButton) {
      scene.handleVirtualButton(key, phase);
      return;
    }
  }
  const fallback = window.__fallbackControlScene;
  if (fallback?.handleVirtualButton) fallback.handleVirtualButton(key, phase);
}

window.engineControl = routeVirtualButton;
installTestHooks(game, routeVirtualButton);

document.querySelectorAll('[data-key]').forEach(button => {
  const key = button.dataset.key;
  if (!['up', 'down', 'left', 'right'].includes(key)) {
    button.addEventListener('click', event => {
      event.preventDefault();
      routeVirtualButton(key);
    }, {passive: false});
    button.addEventListener('contextmenu', event => event.preventDefault());
    return;
  }

  let repeat = null;
  let activePointer = null;
  const start = event => {
    event.preventDefault();
    if (activePointer !== null) return;
    activePointer = event.pointerId;
    button.setPointerCapture?.(event.pointerId);
    routeVirtualButton(key, 'down');
    if (!sliceMode) {
      repeat = window.setInterval(() => routeVirtualButton(key, 'repeat'), 140);
    }
  };
  const stop = event => {
    if (activePointer === null) return;
    if (event?.pointerId !== undefined && event.pointerId !== activePointer) return;
    event?.preventDefault?.();
    if (repeat !== null) {
      window.clearInterval(repeat);
      repeat = null;
    }
    routeVirtualButton(key, 'up');
    if (button.hasPointerCapture?.(activePointer)) button.releasePointerCapture(activePointer);
    activePointer = null;
  };

  button.addEventListener('pointerdown', start, {passive: false});
  button.addEventListener('pointerup', stop, {passive: false});
  button.addEventListener('pointercancel', stop, {passive: false});
  button.addEventListener('lostpointercapture', stop, {passive: false});
  button.addEventListener('contextmenu', event => event.preventDefault());
});

window.addEventListener('error', event => {
  fail(event.message || String(event.error || event));
});
window.addEventListener('unhandledrejection', event => {
  fail(event.reason?.stack || event.reason?.message || String(event.reason));
});
