import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {preview} from 'vite';

let previewServer=null;
let baseUrl=process.argv[2];
if(!baseUrl){
  previewServer=await preview({preview:{host:'127.0.0.1',port:4174,strictPort:false}});
  baseUrl=previewServer.resolvedUrls.local[0].replace(/\/$/,'');
}
const outputDir=path.resolve(process.argv[3]||'test-results/condition-presentation/current');
const save={
  party:[{id:'pacesetter',lvl:50,xp:0,hp:999,score:0,moves:['flurry']}],
  active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{pacesetter:true}},
  flags:{introDone:true,assignment:true},stats:{}
};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage();
try{
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});
  await page.locator('#bootError').waitFor({state:'hidden'});
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'topboss',enemyLevel:50,battleType:'trainer',rng:()=>.5}));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='command',null,{timeout:15_000});
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='fight');
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').conditionPresentationHistory.filter(step=>step.side==='enemy').length>=2,null,{timeout:8_000});
  await page.waitForTimeout(80);
  const impactPath=path.join(outputDir,'phone-second-hit.png');
  await page.screenshot({path:impactPath});
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').conditionPresentationHistory.filter(step=>step.side==='enemy'&&step.completed).length===3,null,{timeout:8_000});
  const finalPath=path.join(outputDir,'phone-final-drain.png');
  await page.screenshot({path:finalPath});
  console.log(`Second hit: ${impactPath}`);
  console.log(`Final drain: ${finalPath}`);
}finally{
  await context.close();await browser.close();
  if(previewServer)await new Promise(resolve=>previewServer.httpServer.close(resolve));
}
