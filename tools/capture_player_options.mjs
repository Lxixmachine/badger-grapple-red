import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl=process.argv[2]||'http://127.0.0.1:4173';
const outputDir=path.resolve(process.argv[3]||'test-results/player-options/current');
const save={
  party:[{id:'buckshot',lvl:8,xp:0,hp:90,score:0,moves:['single','sprawl']}],active:0,box:[],items:{},badges:[],
  dex:{seen:{buckshot:true},caught:{buckshot:true}},flags:{introDone:true,assignment:true},stats:{},
  settings:{textSpeed:'mid',battleScene:true,battleStyle:'shift'}
};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:800,height:700}});
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  const capture=async name=>{
    await page.waitForTimeout(120);
    const dataUrl=await page.locator('#game canvas').evaluate(()=>new Promise((resolve,reject)=>{
      const renderer=window.badgerGame?.renderer;
      if(!renderer?.snapshot)return reject(new Error('Phaser renderer snapshot API is unavailable'));
      renderer.snapshot(image=>resolve(image.src));
    }));
    const output=path.join(outputDir,`${name}.png`);
    await writeFile(output,Buffer.from(dataUrl.split(',')[1],'base64'));
    console.log(`${name}: ${output}`);
  };
  const press=key=>page.evaluate(value=>window.__badgerTest.press(value),key);

  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});
  await page.locator('#bootError').waitFor({state:'hidden'});
  await page.waitForFunction(()=>window.__badgerTest?.activeSceneKeys?.().includes('TitleScene'));
  await page.evaluate(()=>window.__badgerTest.startMenu({tab:'options'}));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('MenuScene')?.tab==='options');
  await capture('options-default');

  await press('right');
  await press('down');
  await press('a');
  await press('down');
  await press('right');
  await capture('options-configured');
  const settings=await page.evaluate(()=>window.__badgerTest.storage().settings);
  if(JSON.stringify(settings)!==JSON.stringify({textSpeed:'fast',battleScene:false,battleStyle:'set'}))throw new Error(`Options did not persist: ${JSON.stringify(settings)}`);

  await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('MenuScene');
    if(scene?.scene?.isActive())scene.scene.stop();
    window.badgerGame.scene.stop('TitleScene');
    const state=window.__badgerTest.storage();
    state.settings.textSpeed='slow';
    window.badgerGame.scene.start('OverworldScene',{state,mapId:'camp_randall',position:{x:23,y:29},facing:'up',demoMode:true});
  });
  await page.waitForFunction(()=>window.__badgerTest.sceneState('OverworldScene')?.area==='camp_randall');
  await page.evaluate(()=>window.badgerGame.scene.getScene('OverworldScene').showMessage('Coach: Read the full assignment before you leave Camp Randall.'));
  await page.waitForFunction(()=>{
    const state=window.__badgerTest.sceneState('OverworldScene');
    return state?.messageTyping&&state.messageText.length>=12&&state.messageText.length<state.message.length;
  });
  await capture('dialogue-typing');
  await press('a');
  await capture('dialogue-complete');
}finally{
  await browser.close();
}
