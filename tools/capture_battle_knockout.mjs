import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {preview} from 'vite';

let previewServer=null;
let baseUrl=process.argv[2];
if(!baseUrl){
  previewServer=await preview({preview:{host:'127.0.0.1',port:4177,strictPort:false}});
  baseUrl=previewServer.resolvedUrls.local[0].replace(/\/$/,'');
}

const outputDir=path.resolve(process.argv[3]||'test-results/battle-knockout/current');
const wrestler=(id,lvl=8)=>({id,lvl,xp:0,hp:90,score:0,moves:['single','highc','sprawl','pace']});
const save={
  party:[wrestler('buckshot'),wrestler('fieldflyer')],active:0,box:[],items:{},badges:[],
  dex:{seen:{},caught:{buckshot:true,fieldflyer:true}},flags:{introDone:true,assignment:true},stats:{}
};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const page=await context.newPage();
const capture=async name=>{const target=path.join(outputDir,name);await page.screenshot({path:target});return target;};
try{
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});
  await page.locator('#bootError').waitFor({state:'hidden'});
  await page.evaluate(()=>window.__badgerTest.startBattle({team:[['drillpartner',5],['pacesetter',5]],battleType:'trainer',trainerName:'Coach Lane'}));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='command',null,{timeout:15_000});
  await page.evaluate(()=>window.__badgerTest.knockOutEnemy());

  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').battleCeremonyHistory.some(event=>event.stage==='faint-animation'));
  await page.waitForTimeout(190);
  const faint=await capture('phone-faint-drop.png');
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').battlePhase==='exp-fill',null,{timeout:8_000});
  await page.waitForTimeout(120);
  const exp=await capture('phone-exp-fill.png');
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='switchPrompt',null,{timeout:8_000});
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').mode==='party');
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').battlePhase==='player-send-out',null,{timeout:5_000});
  await page.waitForTimeout(300);
  const playerSend=await capture('phone-player-send.png');
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene').battleCeremonyHistory.some(event=>event.stage==='opponent-send-motion'),null,{timeout:5_000});
  await page.waitForTimeout(250);
  const opponentSend=await capture('phone-opponent-send.png');
  console.log(`Faint: ${faint}`);
  console.log(`EXP: ${exp}`);
  console.log(`Player send: ${playerSend}`);
  console.log(`Opponent send: ${opponentSend}`);
}finally{
  await context.close();await browser.close();
  if(previewServer)await new Promise(resolve=>previewServer.httpServer.close(resolve));
}
