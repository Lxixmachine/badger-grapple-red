import {BootScene} from './scenes/BootScene.js';import {TitleScene} from './scenes/TitleScene.js';import {IntroScene} from './scenes/IntroScene.js';import {StarterScene} from './scenes/StarterScene.js';import {OverworldScene} from './scenes/OverworldScene.js';import {ScoutScene} from './scenes/ScoutScene.js';import {BattleScene} from './scenes/BattleScene.js';import {MenuScene} from './scenes/MenuScene.js';import {installTestHooks} from './systems/testHooks.js';
const fail=(msg)=>{console.error(msg);const el=document.getElementById('bootError');if(el){el.style.display='block';el.textContent='Badger Grapple Red boot error:\n'+msg+'\n\nThis is still the Phaser build; send this screenshot.';}};
if(!window.Phaser){fail('Phaser did not load from ./vendor/phaser.min.js');throw new Error('Phaser missing');}
const Phaser = window.Phaser;
const config={type:Phaser.AUTO,parent:'game',backgroundColor:'#000',pixelArt:true,roundPixels:true,width:320,height:224,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:false,pixelArt:true,roundPixels:true},audio:{noAudio:true},scene:[BootScene,TitleScene,IntroScene,StarterScene,OverworldScene,ScoutScene,BattleScene,MenuScene]};
let game;try{game=new Phaser.Game(config);window.badgerGame=game;window.BADGER_VERSION='21.48-visual-reset';}catch(e){fail(e?.stack||e?.message||String(e));throw e;}
function routeVirtualButton(key){const priority=['MenuScene','BattleScene','ScoutScene','StarterScene','TitleScene','OverworldScene'];for(const sceneKey of priority){const scene=game.scene.getScene(sceneKey);if(scene&&scene.scene&&scene.scene.isActive()&&scene.handleVirtualButton){scene.handleVirtualButton(key);return;}}const fallback=window.__fallbackControlScene;if(fallback&&fallback.handleVirtualButton)fallback.handleVirtualButton(key);}
window.engineControl=routeVirtualButton;
installTestHooks(game,routeVirtualButton);
document.querySelectorAll('[data-key]').forEach(b=>{
  const key=b.dataset.key;
  if(!['up','down','left','right'].includes(key)){b.addEventListener('click',e=>{e.preventDefault();routeVirtualButton(key);},{passive:false});return;}
  // FireRed feel: hold the D-pad to keep walking; a quick tap turns/steps once.
  let repeat=null;
  const start=e=>{e.preventDefault();if(repeat)return;routeVirtualButton(key);repeat=setInterval(()=>routeVirtualButton(key),140);};
  const stop=()=>{if(repeat){clearInterval(repeat);repeat=null;}};
  b.addEventListener('pointerdown',start,{passive:false});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));
  b.addEventListener('contextmenu',e=>e.preventDefault());
});
window.addEventListener('error',e=>{const m=e.message||String(e.error||e);fail(m);});
window.addEventListener('unhandledrejection',e=>{const m=e.reason?.stack||e.reason?.message||String(e.reason);fail(m);});
