import {BootScene} from './scenes/BootScene.js';
import {TitleScene} from './scenes/TitleScene.js';
import {IntroScene} from './scenes/IntroScene.js';
import {StarterScene} from './scenes/StarterScene.js';
import {OverworldScene} from './scenes/OverworldScene.js';
import {ScoutScene} from './scenes/ScoutScene.js';
import {BattleScene} from './scenes/BattleScene.js';
import {MenuScene} from './scenes/MenuScene.js';
import {VisualSliceScene} from './scenes/VisualSliceScene.js';
import {WorldAtlasScene} from './scenes/WorldAtlasScene.js';
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
const atlasMode = params.has('atlas');
const modernMode = sliceMode || atlasMode;
const width = modernMode ? 480 : 320;
const height = modernMode ? 320 : 224;
const scenes = atlasMode
  ? [WorldAtlasScene]
  : sliceMode
    ? [VisualSliceScene]
    : [BootScene, TitleScene, IntroScene, StarterScene, OverworldScene, ScoutScene, BattleScene, MenuScene];

if (modernMode) {
  document.body.classList.add('slice-mode');
  document.title = atlasMode ? 'Badger Grapple Red - World Atlas' : 'Badger Grapple Red - Scale Slice';
  const note = document.getElementById('note');
  if (note) note.textContent = atlasMode ? 'v21.75 Building Art Pack' : 'v21.63 Scale Slice';
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
  window.BADGER_VERSION = atlasMode
    ? '21.75-building-art-pack'
    : sliceMode ? '21.63-scale-slice' : '21.76-mechanics-core';
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  throw error;
}

function routeVirtualButton(key, phase = 'press') {
  const priority = [
    'WorldAtlasScene',
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

const controls=document.querySelector('.controls');
if(controls){
  const stopNativeGesture=event=>event.preventDefault();
  controls.addEventListener('touchstart',stopNativeGesture,{passive:false});
  controls.addEventListener('touchmove',stopNativeGesture,{passive:false});
  controls.addEventListener('gesturestart',stopNativeGesture,{passive:false});
  controls.addEventListener('selectstart',stopNativeGesture);
  controls.addEventListener('dragstart',stopNativeGesture);
}

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
    if (!modernMode) {
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
