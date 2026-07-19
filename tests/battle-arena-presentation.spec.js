import {expect,test} from '@playwright/test';
import {BATTLE_ARENAS,BATTLE_ARENA_KEYS,battleArenaForArea,resolveBattleArena} from '../src/data/battlePresentation.js';
import {TRAINER_BATTLES} from '../src/data/trainerBattles.js';

const save={
  playerName:'Walk-On',
  party:[{id:'buckshot',lvl:20,xp:0,hp:120,score:0,moves:['single','sprawl','highc','ankle']}],
  active:0,box:[],items:{},badges:[],
  dex:{seen:{},caught:{buckshot:true},defeated:{}},
  flags:{introDone:true,assignment:true},stats:{}
};

async function boot(page){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>Boolean(window.__badgerTest)),{timeout:5000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys().includes('TitleScene')),{timeout:10000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.badgerGame.textures.exists('battle_arena_nationals')),{timeout:10000}).toBe(true);
}

test('venue catalog and Season One battle mappings are complete',()=>{
  expect(BATTLE_ARENA_KEYS).toEqual(['fieldhouse','campus','lakeshore','downtown','bascom','capitol','kohl','nationals']);
  expect(new Set(BATTLE_ARENA_KEYS.map(key=>BATTLE_ARENAS[key].texture)).size).toBe(BATTLE_ARENA_KEYS.length);
  for(const [key,config] of Object.entries(TRAINER_BATTLES)){
    expect(BATTLE_ARENA_KEYS,`${key} arena`).toContain(config.arenaKey);
    expect(resolveBattleArena(config),`${key} resolution`).toBe(config.arenaKey);
  }
  expect(battleArenaForArea('picnic_point')).toBe('lakeshore');
  expect(battleArenaForArea('state_street')).toBe('downtown');
  expect(battleArenaForArea('capitol_interior')).toBe('capitol');
  expect(resolveBattleArena({battleType:'wild'})).toBe('campus');
  expect(resolveBattleArena({battleType:'tournament'})).toBe('kohl');
  expect(resolveBattleArena({battleType:'trainer'})).toBe('fieldhouse');
});

test('representative battles render distinct native venue textures at scale one',async({page})=>{
  await boot(page);
  const selections=[
    ['campus','r1:rex_rematch'],
    ['lakeshore','picnic_point:funk_doctor'],
    ['capitol','capitol_interior:senator'],
    ['kohl','kohl_bracket_floor:anchor'],
    ['nationals','nationals_floor:closer']
  ];
  const textures=[];
  for(const [arenaKey,battleKey] of selections){
    await page.evaluate(config=>window.__badgerTest.startBattle(config),TRAINER_BATTLES[battleKey]);
    await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleArena?.key),{timeout:5000}).toBe(arenaKey);
    const contract=await page.evaluate(()=>{
      const scene=window.badgerGame.scene.getScene('BattleScene'),state=window.__badgerTest.sceneState('BattleScene');
      return {
        state:state.battleArena,
        image:{texture:scene.arenaImage.texture.key,source:[scene.arenaImage.texture.getSourceImage().width,scene.arenaImage.texture.getSourceImage().height],display:[scene.arenaImage.displayWidth,scene.arenaImage.displayHeight],scale:[scene.arenaImage.scaleX,scene.arenaImage.scaleY],origin:[scene.arenaImage.originX,scene.arenaImage.originY]},
        viewport:[scene.cameras.main.width,scene.cameras.main.height,scene.cameras.main.zoom]
      };
    });
    expect(contract.state).toMatchObject({key:arenaKey,texture:`battle_arena_${arenaKey}`,source:[480,238],scale:[1,1]});
    expect(contract.image).toEqual({texture:`battle_arena_${arenaKey}`,source:[480,238],display:[480,238],scale:[1,1],origin:[0,0]});
    expect(contract.viewport).toEqual([480,320,1]);
    textures.push(contract.image.texture);
  }
  expect(new Set(textures).size).toBe(selections.length);
});

test('battle entry clears a native 15 by 10 grid before unlocking commands',async({page})=>{
  await boot(page);
  await page.evaluate(config=>window.__badgerTest.startBattle(config),TRAINER_BATTLES['bascom_hill:professor_wall']);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleArena?.transition),{timeout:5000}).toEqual({columns:15,rows:10,cellSize:32,cellCount:150,reveal:'diagonal',arenaKey:'bascom'});
  const entry=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene');
    const cells=scene.children.list.filter(child=>child.type==='Rectangle'&&child.depth===999);
    return {locked:scene.inputLocked,stage:scene.introStage,cells:cells.length,sizes:[...new Set(cells.map(cell=>`${cell.displayWidth}x${cell.displayHeight}`))]};
  });
  expect(entry).toMatchObject({locked:true,stage:'transition'});
  expect(entry.cells).toBeGreaterThan(100);
  expect(entry.sizes).toEqual(['32x32']);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.mode),{timeout:15000}).toBe('command');
  expect(await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').inputLocked)).toBe(false);
});

test('an opponent signature technique receives a single authored callout',async({page})=>{
  await boot(page);
  const config={
    team:[{id:'drillpartner',level:12,moves:['fronthead'],signatureMove:'fronthead',ace:true}],
    battleType:'trainer',arenaKey:'bascom',trainerName:'The Professor',trainerClass:'BASCOM TECHNICIAN',signatureMove:'fronthead'
  };
  await page.evaluate(data=>window.__badgerTest.startBattle(data),config);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.mode),{timeout:15000}).toBe('command');
  const cue=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene'),att=scene.enemy(),def=scene.state.party[0];
    scene.inputLocked=true;scene.mode='resolving';scene.drawBattle();
    scene.attackBeat({att,def,key:'fronthead',attName:'Professor',defIsEnemy:false,onKO:()=>{},onDone:()=>{},conditionChecked:true});
    scene.finishTypeText();
    const state=window.__badgerTest.sceneState('BattleScene');
    return {active:state.battleArena.signatureActive,labels:scene.children.list.filter(child=>child.type==='Text').map(child=>child.text),history:state.battleArena.signatureHistory,phase:state.battlePhase};
  });
  expect(cue.active).toBe(true);
  expect(cue.phase).toBe('announce');
  expect(cue.labels).toEqual(expect.arrayContaining(['SIGNATURE TECHNIQUE','FRONT HEADLOCK']));
  expect(cue.labels.some(label=>label.includes('used FRONT HEADLOCK!'))).toBe(true);
  expect(cue.history).toEqual([expect.objectContaining({moveKey:'fronthead',trainerName:'The Professor'})]);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleArena?.signatureActive),{timeout:5000}).toBe(false);
});
