import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {TRAINER_BATTLES} from '../src/data/trainerBattles.js';

const baseUrl=process.argv[2]||'http://127.0.0.1:4179';
const outputDir=path.resolve(process.argv[3]||'test-results/trainer-identity/current');
const save={
  playerName:'Walk-On',party:[{id:'buckshot',lvl:20,xp:0,hp:120,score:0,moves:['single','sprawl','highc','ankle']}],active:0,box:[],items:{},badges:[],
  dex:{seen:{buckshot:true},caught:{buckshot:true},defeated:{}},flags:{introDone:true,assignment:true},stats:{}
};
const selections=[
  ['opener','field_house_floor:opener'],
  ['professor','bascom_hill:professor_wall'],
  ['closer','nationals_floor:closer']
];
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:800,height:700}}),issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  page.on('console',message=>{if(message.type()==='error')issues.push(message.text());});
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});
  await page.locator('#bootError').waitFor({state:'hidden'});
  await page.locator('#game canvas').waitFor({state:'visible'});
  await page.waitForFunction(()=>window.__badgerTest?.activeSceneKeys().includes('TitleScene'));

  for(const [name,key] of selections){
    const config=TRAINER_BATTLES[key];
    await page.evaluate(data=>window.__badgerTest.startBattle(data),config);
    await page.waitForFunction(expected=>{
      const state=window.__badgerTest.sceneState('BattleScene');
      return state?.trainerName===expected&&state?.battlePhase==='trainer-challenge';
    },config.trainerName,{timeout:6000});
    await page.waitForTimeout(650);
    await page.evaluate(()=>window.badgerGame.scene.getScene('BattleScene').finishTypeText());
    const contract=await page.evaluate(()=>{
      const scene=window.badgerGame.scene.getScene('BattleScene');
      const images=scene.children.list.filter(child=>child.visible&&child.type==='Image');
      return {
        viewport:[scene.cameras.main.width,scene.cameras.main.height,scene.cameras.main.zoom],
        portrait:`battle_trainer_${scene.trainerPortrait}`,
        images:images.map(image=>image.texture?.key),
        scaled:images.filter(image=>image.scaleX!==1||image.scaleY!==1).map(image=>image.texture?.key)
      };
    });
    assert(JSON.stringify(contract.viewport)===JSON.stringify([480,320,1]),`${name} viewport contract failed`);
    assert(contract.images.includes(contract.portrait),`${name} portrait missing`);
    assert(contract.scaled.length===0,`${name} scaled images: ${contract.scaled}`);
    const dataUrl=await page.locator('#game canvas').evaluate(()=>new Promise((resolve,reject)=>{
      const renderer=window.badgerGame?.renderer;
      if(!renderer?.snapshot)return reject(new Error('Snapshot API unavailable'));
      renderer.snapshot(image=>resolve(image.src));
    }));
    const output=path.join(outputDir,`${name}-challenge.png`);
    await writeFile(output,Buffer.from(dataUrl.split(',')[1],'base64'));
    console.log(`${name}: ${output}`);
  }
  if(issues.length)throw new Error(`Runtime issues: ${JSON.stringify(issues)}`);
}finally{
  await browser.close();
}
