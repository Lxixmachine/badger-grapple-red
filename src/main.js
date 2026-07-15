import '@fontsource/atkinson-hyperlegible/latin-400.css';
import '@fontsource/atkinson-hyperlegible/latin-700.css';
import {BootScene} from './scenes/BootScene.js';
import {TitleScene} from './scenes/TitleScene.js';
import {IntroScene} from './scenes/IntroScene.js';
import {StarterScene} from './scenes/StarterScene.js';
import {OpeningRecoveryScene} from './scenes/OpeningRecoveryScene.js';
import {SeasonOneOverworldScene} from './scenes/SeasonOneOverworldScene.js';
import {ScoutScene} from './scenes/ScoutScene.js';
import {BattleScene} from './scenes/BattleScene.js';
import {MenuScene} from './scenes/MenuScene.js';
import {VisualSliceScene} from './scenes/VisualSliceScene.js';
import {WorldAtlasScene} from './scenes/WorldAtlasScene.js';
import {installTestHooks} from './systems/testHooks.js';

if(document.fonts?.load){
  await Promise.all([
    document.fonts.load('400 16px "Atkinson Hyperlegible"'),
    document.fonts.load('700 16px "Atkinson Hyperlegible"')
  ]);
}

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
const campDemoMode = window.BADGER_ENTRY_MODE === 'camp-randall'
  || params.get('demo') === 'camp-randall';
const modernMode = sliceMode || atlasMode || campDemoMode;
const heldInputMode = true;
const width = 480;
const height = 320;
const productScenes = [BootScene, TitleScene, IntroScene, StarterScene, OpeningRecoveryScene, SeasonOneOverworldScene, ScoutScene, BattleScene, MenuScene];
const scenes = atlasMode
  ? [WorldAtlasScene]
  : sliceMode
    ? [VisualSliceScene]
    : productScenes;

if (modernMode) {
  document.body.classList.add('slice-mode');
  document.title = campDemoMode
    ? 'Badger Grapple Red - Camp Randall Demo'
    : atlasMode ? 'Badger Grapple Red - World Atlas' : 'Badger Grapple Red - Scale Slice';
  const note = document.getElementById('note');
  if (note) note.textContent = campDemoMode
    ? 'v22.8 Connected Ground'
    : atlasMode ? 'v21.75 Building Art Pack' : 'v21.63 Scale Slice';
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
    : sliceMode ? '21.63-scale-slice'
      : '22.8-connected-ground';
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
    'OpeningRecoveryScene',
    'StarterScene',
    'IntroScene',
    'TitleScene',
    'OverworldScene'
  ];
  for (const sceneKey of priority) {
    const scene = game.scene.getScene(sceneKey);
    if (scene?.scene?.isActive?.() && scene.handleVirtualButton) {
      const supportsHeldDirections = ['OverworldScene', 'WorldAtlasScene', 'VisualSliceScene'].includes(sceneKey);
      if (phase === 'up' && !supportsHeldDirections) return;
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
    let activePointer = null;
    const start = event => {
      event.preventDefault();
      if (activePointer !== null) return;
      activePointer = event.pointerId;
      button.setPointerCapture?.(event.pointerId);
      routeVirtualButton(key, 'down');
    };
    const stop = event => {
      if (activePointer === null) return;
      if (event?.pointerId !== undefined && event.pointerId !== activePointer) return;
      event?.preventDefault?.();
      if (button.hasPointerCapture?.(activePointer)) button.releasePointerCapture(activePointer);
      activePointer = null;
    };
    button.addEventListener('pointerdown', start, {passive: false});
    button.addEventListener('pointerup', stop, {passive: false});
    button.addEventListener('pointercancel', stop, {passive: false});
    button.addEventListener('lostpointercapture', stop, {passive: false});
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
    if (!heldInputMode) {
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
    if (heldInputMode) routeVirtualButton(key, 'up');
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
