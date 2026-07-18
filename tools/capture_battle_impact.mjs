import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {preview} from 'vite';

let previewServer=null;
let baseUrl=process.argv[2];
if(!baseUrl){
  previewServer=await preview({preview:{host:'127.0.0.1',port:4176,strictPort:false}});
  baseUrl=previewServer.resolvedUrls.local[0].replace(/\/$/,'');
}

const outputDir=path.resolve(process.argv[3]||'test-results/battle-impact/current');
const save={
  party:[{id:'closer',lvl:50,xp:0,hp:999,score:0,moves:['highc']}],
  active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{closer:true}},
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
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'topboss',enemyLevel:50,battleType:'trainer',rng:()=>0}));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='command',null,{timeout:15_000});
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='fight');
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));

  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').battlePhase==='contact',null,{timeout:8_000});
  const contactPath=path.join(outputDir,'phone-contact.png');
  await page.screenshot({path:contactPath});
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').battlePhase==='condition-drain',null,{timeout:3_000});
  const drainPath=path.join(outputDir,'phone-condition-drain.png');
  await page.screenshot({path:drainPath});

  console.log(`Contact: ${contactPath}`);
  console.log(`Condition drain: ${drainPath}`);
}finally{
  await context.close();await browser.close();
  if(previewServer)await new Promise(resolve=>previewServer.httpServer.close(resolve));
}
