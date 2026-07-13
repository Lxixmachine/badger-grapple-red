import {expect,test} from '@playwright/test';

async function press(page,key){await page.evaluate(name=>window.__badgerTest.press(name),key);}

function legacyWrestler(id='buckshot',lvl=8){return {id,lvl,xp:0,hp:90,gas:70,score:0,moves:['single','highc','sprawl','pace']};}

async function bootWithSave(page,save,url){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(url);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
}

test('a legacy phone save enters battle with canonical Stamina and items',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],active:0,box:[],items:{invite:2,energy:1,tape:1,film:1},
    dex:{seen:{},caught:{buckshot:true}},flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'wild'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  const save=await page.evaluate(()=>window.__badgerTest.storage());
  expect(save.party[0].gas).toBeUndefined();
  expect(save.party[0].stamina).toBe(70);
  expect(save.items).toMatchObject({practiceSinglet:2,sportsDrink:1,athleticTape:1,filmStudy:1});
});

test('Team Locker moves a stored wrestler into the travel lineup',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],box:[legacyWrestler('drillpartner',7)],active:0,
    flags:{introDone:true,assignment:true,lockerUnlocked:true,recruitingUnlocked:true},items:{},badges:[]
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startMenu({tab:'locker'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene'))).toMatchObject({active:true,tab:'locker',selected:0});
  await press(page,'down');
  await press(page,'a');
  const save=await page.evaluate(()=>window.__badgerTest.storage());
  expect(save.party).toHaveLength(2);
  expect(save.box).toHaveLength(0);
  expect(save.party[1].id).toBe('drillpartner');
});

test('mobile action buttons select menu entries on pointerdown',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],box:[],active:0,items:{},badges:[],
    flags:{introDone:true,assignment:true},stats:{}
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startMenu());
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene'))).toMatchObject({active:true,tab:'main',selected:0});
  await page.locator('button[data-key="a"]').dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true});
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene').tab)).toBe('team');
  await page.locator('button[data-key="a"]').dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',isPrimary:true});
});

test('Starter Singlet guarantees a recruit through the scouting UI',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],box:[],active:0,
    dex:{seen:{},caught:{buckshot:true}},flags:{introDone:true,assignment:true,recruitingUnlocked:true},
    items:{starterSinglet:1},stats:{},badges:[]
  },'/?test=1&scene=scout&id=drillpartner&lvl=7&area=lakeshore');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('ScoutScene').mode)).toBe('main');
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('ScoutScene').mode)).toBe('singlet');
  await press(page,'down');await press(page,'down');await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().dex.caught.drillpartner)).toBe(true);
  const save=await page.evaluate(()=>window.__badgerTest.storage());
  expect(save.items.starterSinglet).toBe(0);
  expect(save.party.some(mon=>mon.id==='drillpartner')).toBe(true);
});

test('battle victory awards experience after runtime save normalization',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],active:0,box:[],items:{},dex:{seen:{},caught:{buckshot:true}},
    flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'spar'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').active)).toBe(true);
  await page.evaluate(()=>window.__badgerTest.winBattle());
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().party[0].xp)).toBeGreaterThan(0);
});
