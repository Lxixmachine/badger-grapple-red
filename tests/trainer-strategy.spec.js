import {expect,test} from '@playwright/test';
import {clearCondition,inflictCondition} from '../src/data/conditions.js';
import {makeMon,restoreMoveStamina,scaledStats} from '../src/data/roster.js';
import {createBattleState} from '../src/systems/mechanics.js';
import {chooseTrainerAction,chooseTrainerItem,chooseTrainerSwitch,normalizeTrainerItems,trainerAiProfile} from '../src/systems/trainerAi.js';

function wrestler(id='buckshot',lvl=12,moves=null){
  const mon=makeMon(id,lvl);
  if(moves){mon.moves=[...moves];restoreMoveStamina(mon);}
  return mon;
}

test('battle types map to authored intelligence tiers and finite item bags',()=>{
  expect(trainerAiProfile({battleType:'wild'}).tier).toBe('wild');
  expect(trainerAiProfile({battleType:'opening'}).tier).toBe('basic');
  expect(trainerAiProfile({battleType:'trainer'}).tier).toBe('standard');
  expect(trainerAiProfile({battleType:'gym'}).tier).toBe('advanced');
  expect(trainerAiProfile({battleType:'tournament'}).tier).toBe('elite');
  expect(normalizeTrainerItems(['athleticTape','athleticTape','trainerKit','unknown'])).toEqual({athleticTape:2,trainerKit:1,sportsDrink:0});
});

test('organized opponents use condition care, Condition recovery, and Stamina recovery in that order',()=>{
  const active=wrestler('drillpartner',14),profile=trainerAiProfile({battleType:'gym'}),inventory={trainerKit:1,athleticTape:1,sportsDrink:1};
  inflictCondition(active,'gassed',()=>0);
  expect(chooseTrainerItem({active,inventory,profile})).toMatchObject({itemKey:'trainerKit',reason:'condition'});
  clearCondition(active);active.hp=1;
  expect(chooseTrainerItem({active,inventory,profile})).toMatchObject({itemKey:'athleticTape',reason:'critical-condition'});
  active.hp=scaledStats(active.id,active.lvl,active).hp;
  Object.keys(active.moveStamina).forEach(key=>active.moveStamina[key]=0);
  expect(chooseTrainerItem({active,inventory,profile})).toMatchObject({itemKey:'sportsDrink',reason:'low-stamina'});
  expect(chooseTrainerItem({active,inventory,profile:trainerAiProfile({battleType:'opening'})})).toBeNull();
});

test('switch decisions protect setup, stay for a knockout, and improve a tied-up matchup',()=>{
  const active=wrestler('drillpartner',14,['stall']),reserve=wrestler('topboss',14,['double']),defender=wrestler('matreturner',14);
  const profile=trainerAiProfile({battleType:'tournament'}),state=createBattleState();
  inflictCondition(active,'tiedUp',()=>0);
  expect(chooseTrainerSwitch({active,team:[active,reserve],defender,profile,attackerState:state,defenderState:createBattleState(),rng:()=>0})).toMatchObject({targetIndex:1,reason:'condition'});
  clearCondition(active);state.stages.attack=2;
  expect(chooseTrainerSwitch({active,team:[active,reserve],defender,profile,attackerState:state,defenderState:createBattleState(),rng:()=>0})).toBeNull();
  state.stages.attack=0;active.moves=['double'];restoreMoveStamina(active);defender.hp=1;
  expect(chooseTrainerSwitch({active,team:[active,reserve],defender,profile,attackerState:state,defenderState:createBattleState(),rng:()=>0})).toBeNull();
});

test('trainer action priority is switch, then finite item, then technique',()=>{
  const active=wrestler('drillpartner',14,['stall']),reserve=wrestler('topboss',14,['double']),defender=wrestler('matreturner',14),profile=trainerAiProfile({battleType:'tournament',config:{items:{trainerKit:1}}});
  inflictCondition(active,'tiedUp',()=>0);
  expect(chooseTrainerAction({active,team:[active,reserve],defender,profile,inventory:profile.items,attackerState:createBattleState(),defenderState:createBattleState(),rng:()=>0})).toMatchObject({type:'switch',targetIndex:1});
  expect(chooseTrainerAction({active,team:[active],defender,profile,inventory:profile.items,attackerState:createBattleState(),defenderState:createBattleState(),rng:()=>0})).toMatchObject({type:'item',itemKey:'trainerKit'});
  clearCondition(active);
  expect(chooseTrainerAction({active,team:[active],defender,profile,inventory:{},attackerState:createBattleState(),defenderState:createBattleState(),rng:()=>0})).toMatchObject({type:'move'});
  expect(chooseTrainerAction({active,team:[active,reserve],defender,profile:trainerAiProfile({battleType:'wild'}),inventory:{trainerKit:1},rng:()=>0})).toMatchObject({type:'move'});
});

const saveForBrowser={
  playerName:'Walk-On',party:[{id:'buckshot',lvl:20,xp:0,hp:120,score:0,moves:['stall'],moveStamina:{stall:30}}],active:0,box:[],items:{},badges:[],
  dex:{seen:{},caught:{buckshot:true},defeated:{}},flags:{introDone:true,assignment:true},stats:{}
};

async function bootTrainerBattle(page,data){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),saveForBrowser);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await page.evaluate(config=>window.__badgerTest.startBattle(config),data);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.mode),{timeout:15_000}).toBe('command');
}

test('a trainer item is announced, consumed once, and does not grant a second action',async({page})=>{
  await bootTrainerBattle(page,{team:[['drillpartner',12]],battleType:'trainer',trainerName:'Coach Lane',trainerAi:{tier:'advanced',canSwitch:false,items:{athleticTape:1}}});
  await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene');scene.rng=()=>.99;scene.enemy().hp=1;scene.resolveTurn('stall');
  });
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battlePhase)).toBe('opponent-item');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleTurn),{timeout:10_000}).toBe(2);
  let strategy=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').trainerStrategy);
  expect(strategy.items.athleticTape).toBe(0);
  expect(strategy.actionHistory.map(event=>[event.stage,event.type])).toEqual([['selected','item'],['completed','item']]);

  await page.evaluate(()=>window.badgerGame.scene.getScene('BattleScene').resolveTurn('stall'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleTurn),{timeout:10_000}).toBe(3);
  strategy=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').trainerStrategy);
  expect(strategy.actionHistory.filter(event=>event.stage==='selected').map(event=>event.type)).toEqual(['item','move']);
  expect(strategy.actionHistory.filter(event=>event.stage==='completed')).toHaveLength(2);
});

test('an elite trainer can withdraw and later resend a healthy wrestler without ending the match early',async({page})=>{
  await bootTrainerBattle(page,{team:[['drillpartner',12],['topboss',12]],battleType:'tournament',trainerName:'The Anchor',trainerAi:{tier:'elite',items:{}}});
  await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene'),active=scene.enemy();scene.rng=()=>0;active.moves=['stall'];active.moveStamina={stall:30};active.condition={key:'tiedUp',turns:3};scene.resolveTurn('stall');
  });
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.enemyIndex),{timeout:10_000}).toBe(1);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleTurn),{timeout:10_000}).toBe(2);
  let strategy=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').trainerStrategy);
  expect(strategy.team[0].condition).toMatchObject({key:'tiedUp'});

  await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene'),active=scene.enemy(),reserve=scene.enemyTeam[0];active.moves=['stall'];active.moveStamina={stall:30};active.condition={key:'tiedUp',turns:3};reserve.moves=['double'];reserve.moveStamina={double:20};delete reserve.condition;scene.lastTrainerSwitchTurn=-99;scene.resolveTurn('stall');
  });
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.enemyIndex),{timeout:10_000}).toBe(0);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.battleTurn),{timeout:10_000}).toBe(3);
  strategy=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').trainerStrategy);
  const completedSwitches=strategy.actionHistory.filter(event=>event.stage==='completed'&&event.type==='switch');
  expect(completedSwitches.map(event=>event.targetIndex)).toEqual([1,0]);

  await page.evaluate(()=>{const scene=window.badgerGame.scene.getScene('BattleScene');scene.enemy().hp=0;scene.enemyDown();});
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.enemyIndex),{timeout:12_000}).toBe(1);
  const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  expect(state.over).toBe(false);
  expect(state.resultTitle).not.toBe('VICTORY');
});
