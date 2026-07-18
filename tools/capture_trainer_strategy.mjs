import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

const baseUrl=process.argv[2]||'http://127.0.0.1:4179';
const outputDir=path.resolve(process.argv[3]||'test-results/trainer-strategy/current');
const save={
  playerName:'Walk-On',party:[{id:'buckshot',lvl:20,xp:0,hp:120,score:0,moves:['stall'],moveStamina:{stall:30}}],active:0,box:[],items:{},badges:[],
  dex:{seen:{},caught:{buckshot:true},defeated:{}},flags:{introDone:true,assignment:true},stats:{}
};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:800,height:700}}),issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  page.on('console',message=>{if(message.type()==='error')issues.push(message.text());});
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});await page.locator('#bootError').waitFor({state:'hidden'});await page.locator('#game canvas').waitFor({state:'visible'});

  const start=async data=>{
    await page.evaluate(config=>window.__badgerTest.startBattle(config),data);
    await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.mode==='command',null,{timeout:15_000});
  };
  const capture=async name=>{
    await page.evaluate(()=>window.badgerGame.scene.getScene('BattleScene').finishTypeText());await page.waitForTimeout(100);
    const contract=await page.evaluate(()=>{
      const scene=window.badgerGame.scene.getScene('BattleScene'),images=scene.children.list.filter(child=>child.visible&&child.type==='Image');
      return {viewport:[scene.cameras.main.width,scene.cameras.main.height,scene.cameras.main.zoom],scaled:images.filter(image=>image.scaleX!==1||image.scaleY!==1).map(image=>image.texture?.key)};
    });
    assert(JSON.stringify(contract.viewport)===JSON.stringify([480,320,1]),`${name} viewport contract failed`);assert(contract.scaled.length===0,`${name} scaled images: ${contract.scaled}`);
    const dataUrl=await page.locator('#game canvas').evaluate(()=>new Promise((resolve,reject)=>{
      const renderer=window.badgerGame?.renderer;if(!renderer?.snapshot)return reject(new Error('Snapshot API unavailable'));renderer.snapshot(image=>resolve(image.src));
    }));
    const output=path.join(outputDir,`${name}.png`);await writeFile(output,Buffer.from(dataUrl.split(',')[1],'base64'));console.log(`${name}: ${output}`);
  };

  await start({team:[['drillpartner',12]],battleType:'trainer',trainerName:'Coach Lane',trainerAi:{tier:'advanced',canSwitch:false,items:{athleticTape:1}}});
  await page.evaluate(()=>{const scene=window.badgerGame.scene.getScene('BattleScene');scene.rng=()=>.99;scene.enemy().hp=1;scene.resolveTurn('stall');});
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.battlePhase==='opponent-item');await capture('trainer-item');
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.battleTurn===2,null,{timeout:10_000});

  await start({team:[['drillpartner',12],['topboss',12]],battleType:'tournament',trainerName:'The Anchor',trainerAi:{tier:'elite',items:{}}});
  await page.evaluate(()=>{const scene=window.badgerGame.scene.getScene('BattleScene'),active=scene.enemy();scene.rng=()=>0;active.moves=['stall'];active.moveStamina={stall:30};active.condition={key:'tiedUp',turns:3};scene.resolveTurn('stall');});
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.battlePhase==='opponent-withdraw');await capture('opponent-withdraw');
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.battlePhase==='opponent-send-out',null,{timeout:8_000});await capture('opponent-send-out');
  if(issues.length)throw new Error(`Runtime issues: ${JSON.stringify(issues)}`);
}finally{await browser.close();}
