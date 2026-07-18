import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl=process.argv[2]||'http://127.0.0.1:4173';
const outputDir=path.resolve(process.argv[3]||'test-results/battle-choreography/current');
const save={party:[{id:'buckshot',lvl:12,xp:0,hp:110,score:0,moves:['single','sprawl','headlock','flurry']}],active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{buckshot:true}},flags:{introDone:true,assignment:true},stats:{}};
const samples=[
  {key:'single',method:'playTechniqueImpact',hits:1,delay:90},
  {key:'sprawl',method:'playTechniqueSetup',hits:1,delay:90},
  {key:'headlock',method:'playTechniqueImpact',hits:1,delay:90},
  {key:'flurry',method:'playTechniqueImpact',hits:3,delay:420}
];

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage();
try{
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});
  await page.locator('#bootError').waitFor({state:'hidden'});
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'trainer'}));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='command',null,{timeout:15000});
  for(const sample of samples){
    await page.evaluate(({key,method,hits})=>{
      const scene=window.badgerGame.scene.getScene('BattleScene');scene.attackSide='player';
      if(method==='playTechniqueSetup')scene.playTechniqueSetup(scene.playerSprite,key);
      else scene.playTechniqueImpact(scene.playerSprite,scene.enemySprite,key,[],null,hits);
    },sample);
    await page.waitForTimeout(sample.delay);
    const output=path.join(outputDir,`${sample.key}-phone.png`);
    await page.screenshot({path:output});
    console.log(`${sample.key}: ${output}`);
    await page.waitForTimeout(sample.key==='flurry'?1100:700);
  }
}finally{
  await context.close();await browser.close();
}
