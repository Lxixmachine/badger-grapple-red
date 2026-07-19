import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';
import {TRAINER_BATTLES} from '../src/data/trainerBattles.js';

const baseUrl=process.argv[2]||'http://127.0.0.1:4179';
const outputDir=path.resolve(process.argv[3]||'test-results/battle-arena-v2254/current');
const save={
  playerName:'Walk-On',party:[{id:'buckshot',lvl:20,xp:0,hp:120,score:0,moves:['single','sprawl','highc','ankle']}],active:0,box:[],items:{},badges:[],
  dex:{seen:{},caught:{buckshot:true},defeated:{}},flags:{introDone:true,assignment:true},stats:{}
};
const selections=[
  ['campus','r1:rex_rematch'],
  ['lakeshore','picnic_point:funk_doctor'],
  ['capitol','capitol_interior:senator'],
  ['kohl','kohl_bracket_floor:anchor'],
  ['nationals','nationals_floor:closer']
];
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

async function snapshot(page,name){
  const dataUrl=await page.locator('#game canvas').evaluate(()=>new Promise((resolve,reject)=>{
    const renderer=window.badgerGame?.renderer;
    if(!renderer?.snapshot)return reject(new Error('Snapshot API unavailable'));
    renderer.snapshot(image=>resolve(image.src));
  }));
  const output=path.join(outputDir,`${name}.png`);
  await writeFile(output,Buffer.from(dataUrl.split(',')[1],'base64'));
  return output;
}

await mkdir(outputDir,{recursive:true});
const browser=await chromium.launch({headless:true});
const manifest=[];
try{
  const page=await browser.newPage({viewport:{width:800,height:700}}),issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  page.on('console',message=>{if(message.type()==='error')issues.push(message.text());});
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(`${baseUrl}/?test=1`,{waitUntil:'domcontentloaded'});
  await page.locator('#bootError').waitFor({state:'hidden'});
  await page.waitForFunction(()=>window.__badgerTest?.activeSceneKeys().includes('TitleScene'));
  await page.waitForFunction(()=>window.badgerGame.textures.exists('battle_arena_nationals'));

  for(const [arenaKey,battleKey] of selections){
    const config=TRAINER_BATTLES[battleKey];
    await page.evaluate(data=>window.__badgerTest.startBattle(data),config);
    await page.waitForFunction(expected=>{
      const state=window.__badgerTest.sceneState('BattleScene');
      return state?.mode==='command'&&state?.battleArena?.key===expected;
    },arenaKey,{timeout:15000});
    const contract=await page.evaluate(()=>{
      const scene=window.badgerGame.scene.getScene('BattleScene');
      return {arena:scene.arenaKey,texture:scene.arenaImage.texture.key,source:[scene.arenaImage.texture.getSourceImage().width,scene.arenaImage.texture.getSourceImage().height],scale:[scene.arenaImage.scaleX,scene.arenaImage.scaleY],scaledImages:scene.children.list.filter(child=>child.type==='Image'&&(child.scaleX!==1||child.scaleY!==1)).map(child=>child.texture?.key)};
    });
    assert(contract.arena===arenaKey,`${arenaKey} resolved as ${contract.arena}`);
    assert(contract.texture===`battle_arena_${arenaKey}`,`${arenaKey} used ${contract.texture}`);
    assert(JSON.stringify(contract.source)==='[480,238]',`${arenaKey} source ${contract.source}`);
    assert(JSON.stringify(contract.scale)==='[1,1]',`${arenaKey} scale ${contract.scale}`);
    assert(contract.scaledImages.length===0,`${arenaKey} scaled images ${contract.scaledImages}`);
    const output=await snapshot(page,`${arenaKey}-command`);
    manifest.push({arenaKey,battleKey,frame:'command',output,contract});
    console.log(`${arenaKey}: ${output}`);
  }

  const signatureConfig=TRAINER_BATTLES['bascom_hill:professor_wall'];
  await page.evaluate(data=>window.__badgerTest.startBattle(data),signatureConfig);
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.mode==='command',{timeout:15000});
  await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene'),ace=scene.enemyTeam.at(-1),def=scene.state.party[0];
    scene.enemyTeam=[ace];scene.enemyIdx=0;scene.inputLocked=true;scene.mode='resolving';scene.drawBattle();
    scene.rng=()=>.1;
    scene.attackBeat({att:ace,def,key:scene.signatureMove,attName:scene.trainerName,defIsEnemy:false,onKO:()=>{},onDone:()=>{},conditionChecked:true});
    scene.finishTypeText();
  });
  await page.waitForFunction(()=>window.__badgerTest.sceneState('BattleScene')?.battleArena?.signatureActive);
  const signatureOutput=await snapshot(page,'bascom-signature-technique');
  manifest.push({arenaKey:'bascom',battleKey:'bascom_hill:professor_wall',frame:'signature',output:signatureOutput});
  console.log(`signature: ${signatureOutput}`);
  await page.waitForFunction(()=>{
    const animation=window.__badgerTest.sceneState('BattleScene')?.techniqueAnimation;
    return animation?.moveKey==='fronthead'&&animation?.stage==='setup';
  },undefined,{timeout:5000});
  const impactOutput=await snapshot(page,'bascom-signature-impact');
  manifest.push({arenaKey:'bascom',battleKey:'bascom_hill:professor_wall',frame:'signature-impact',output:impactOutput});
  console.log(`signature impact: ${impactOutput}`);

  if(issues.length)throw new Error(`Runtime issues: ${JSON.stringify(issues)}`);
  await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2));
}finally{
  await browser.close();
}
