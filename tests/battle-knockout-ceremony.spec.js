import {expect,test} from '@playwright/test';

function wrestler(id='buckshot',lvl=8){return {id,lvl,xp:0,hp:90,score:0,moves:['single','highc','sprawl','pace']};}

async function bootBattle(page,{party=[wrestler()],team=[['drillpartner',5]],trainerName='Coach Lane'}={}){
  const save={party,active:0,box:[],items:{},badges:[],dex:{seen:{},caught:Object.fromEntries(party.map(mon=>[mon.id,true]))},flags:{introDone:true,assignment:true},stats:{}};
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await page.evaluate(data=>window.__badgerTest.startBattle(data),{team,battleType:'trainer',trainerName});
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15_000}).toBe('command');
}

async function press(page,key){await page.evaluate(value=>window.__badgerTest.press(value),key);}

function orderedIndices(stages,expected){return expected.map(stage=>stages.indexOf(stage));}

test('enemy knockout stages faint, EXP, shift choice, both player switch beats, and opponent send-out',async({page})=>{
  const first=wrestler('buckshot',8),second=wrestler('fieldflyer',8);
  await bootBattle(page,{party:[first,second],team:[['drillpartner',5],['pacesetter',5]]});
  const secondCondition=await page.evaluate(()=>window.__badgerTest.storage().party.find(mon=>mon.id==='fieldflyer').hp);
  await page.evaluate(()=>window.__badgerTest.knockOutEnemy());
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')),{timeout:12_000}).toMatchObject({
    mode:'switchPrompt',battlePhase:'switch-prompt',pendingOpponent:1,selected:0
  });

  let state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  const preSwitch=['faint-cry','faint-animation','faint-message','exp-announcement','exp-fill-start','exp-fill-complete','replacement-prompt'];
  const preStages=state.battleCeremonyHistory.map(event=>event.stage),preIndices=orderedIndices(preStages,preSwitch);
  expect(preIndices.every(index=>index>=0)).toBe(true);
  expect(preIndices).toEqual([...preIndices].sort((a,b)=>a-b));
  expect(state.knockoutTiming).toMatchObject({faintCryPause:340,faintDrop:460,expAnnouncement:760,playerSend:1180,opponentSend:540});
  const faintEvents=state.battleCeremonyHistory.filter(event=>event.stage.startsWith('faint-'));
  expect(faintEvents[1].at-faintEvents[0].at).toBeGreaterThanOrEqual(state.knockoutTiming.faintCryPause-10);
  expect(faintEvents[2].at-faintEvents[1].at).toBeGreaterThanOrEqual(state.knockoutTiming.faintDrop+state.knockoutTiming.faintMessageLead-15);

  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'))).toMatchObject({mode:'party',preOpponentSwitch:true,selected:1});
  await page.waitForTimeout(180);await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:8_000}).toBe('command');

  state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  const fullOrder=[...preSwitch,'player-withdraw','player-send-announce','player-send-complete','opponent-send-announce','opponent-send-motion','opponent-send-complete'];
  const stages=state.battleCeremonyHistory.map(event=>event.stage),indices=orderedIndices(stages,fullOrder);
  expect(indices.every(index=>index>=0)).toBe(true);
  expect(indices).toEqual([...indices].sort((a,b)=>a-b));
  expect(state.battlePhase).toBe('command');
  expect(state.enemyIndex).toBe(1);
  const save=await page.evaluate(()=>window.__badgerTest.storage());
  expect(save.party[0]).toMatchObject({id:'fieldflyer',hp:secondCondition});
});

test('a forced replacement gets a real player send-out without withdrawing the defeated wrestler',async({page})=>{
  const first=wrestler('buckshot',8),second=wrestler('fieldflyer',8);
  await bootBattle(page,{party:[first,second]});
  const secondCondition=await page.evaluate(()=>window.__badgerTest.storage().party.find(mon=>mon.id==='fieldflyer').hp);
  await page.evaluate(()=>window.__badgerTest.knockOutPlayer());
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')),{timeout:6_000}).toMatchObject({
    mode:'party',battlePhase:'forced-switch',selected:1
  });
  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:5_000}).toBe('command');

  const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  const stages=state.battleCeremonyHistory.map(event=>event.stage);
  const expected=['faint-cry','faint-animation','faint-message','forced-switch-prompt','player-send-announce','player-send-complete'];
  const indices=orderedIndices(stages,expected);
  expect(indices.every(index=>index>=0)).toBe(true);
  expect(indices).toEqual([...indices].sort((a,b)=>a-b));
  expect(stages.slice(stages.indexOf('forced-switch-prompt'))).not.toContain('player-withdraw');
  expect(state.battlePhase).toBe('command');
  const save=await page.evaluate(()=>window.__badgerTest.storage());
  expect(save.party[0]).toMatchObject({id:'fieldflyer',hp:secondCondition});
  expect(save.party[1]).toMatchObject({id:'buckshot',hp:0});
});
