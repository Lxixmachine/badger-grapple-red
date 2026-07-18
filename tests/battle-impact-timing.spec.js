import {expect,test} from '@playwright/test';
import {battleChoreographyFor} from '../src/data/battleAnimations.js';

function battleSave(move){
  return {
    party:[{id:'closer',lvl:50,xp:0,hp:999,score:0,moves:[move]}],
    active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{closer:true}},
    flags:{introDone:true,assignment:true},stats:{}
  };
}

async function bootAndUseMove(page,move,rngValue){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),battleSave(move));
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await page.evaluate(value=>window.__badgerTest.startBattle({enemyId:'topboss',enemyLevel:50,battleType:'trainer',rng:()=>value}),rngValue);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15_000}).toBe('command');
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));
}

test('contact visibly precedes Condition drain and result feedback',async({page})=>{
  await bootAndUseMove(page,'highc',0);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleFeedback?.kind),{timeout:10_000}).toBe('critical');

  const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  const beats=state.battleBeatHistory.filter(beat=>beat.turn===1&&beat.side==='player'&&beat.moveKey==='highc');
  const first=stage=>beats.find(beat=>beat.stage===stage);
  const stages=['announce','windup','impact-start','contact','condition-start','condition-complete','result-message'];
  const positions=stages.map(stage=>beats.findIndex(beat=>beat.stage===stage));
  expect(positions.every(index=>index>=0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a,b)=>a-b));

  const contact=first('contact'),condition=first('condition-start'),complete=first('condition-complete'),message=first('result-message');
  expect(contact.message).toBe('Closer used HIGH C!');
  expect(condition.at-contact.at).toBeGreaterThanOrEqual(battleChoreographyFor('highc').tempo.conditionLead-5);
  expect(complete.at).toBeLessThanOrEqual(message.at);
  expect(state.battlePhase).toBe('message');
  expect(state.battleSprites).toMatchObject({enemyScale:[1,1],playerScale:[1,1]});
  expect([...state.battleSprites.enemyPosition,...state.battleSprites.playerPosition].every(Number.isInteger)).toBe(true);
});

test('multi-hit contacts wait for each prior Condition drain',async({page})=>{
  await bootAndUseMove(page,'flurry',.5);
  await expect.poll(async()=>{
    const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
    return state.conditionPresentationHistory.filter(step=>step.side==='enemy'&&step.completed).length;
  },{timeout:12_000}).toBe(3);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleBeatHistory.some(beat=>beat.stage==='result-message')),{timeout:5_000}).toBe(true);

  const beats=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleBeatHistory);
  const moveBeats=beats.filter(beat=>beat.turn===1&&beat.side==='player'&&beat.moveKey==='flurry');
  const contacts=moveBeats.filter(beat=>beat.stage==='contact');
  const starts=moveBeats.filter(beat=>beat.stage==='condition-start');
  const completes=moveBeats.filter(beat=>beat.stage==='condition-complete');
  const message=moveBeats.find(beat=>beat.stage==='result-message');
  expect(contacts).toHaveLength(3);
  expect(starts).toHaveLength(3);
  expect(completes).toHaveLength(3);
  for(let index=0;index<3;index++){
    expect(contacts[index].hitIndex).toBe(index+1);
    expect(contacts[index].at).toBeLessThan(starts[index].at);
    expect(starts[index].at).toBeLessThan(completes[index].at);
    if(index)expect(contacts[index].at).toBeGreaterThanOrEqual(completes[index-1].at+40);
  }
  expect(completes.at(-1).at).toBeLessThanOrEqual(message.at);
});
