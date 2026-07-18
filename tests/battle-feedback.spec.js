import {expect,test} from '@playwright/test';

const save={
  party:[{id:'closer',lvl:50,xp:0,hp:999,score:0,moves:['highc']}],
  active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{closer:true}},
  flags:{introDone:true,assignment:true},stats:{}
};

async function bootBattle(page){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'topboss',enemyLevel:50,battleType:'trainer',rng:()=>0}));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15_000}).toBe('command');
}

async function useOnlyMove(page){
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));
}

test('battle consequences compile into FireRed-style semantic order',async({page})=>{
  await bootBattle(page);
  const feedback=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene');
    return scene.resultFeedback({
      hits:3,multiplier:2,
      hitResults:[{index:1,critical:true},{index:2,critical:false},{index:3,critical:true}],
      events:[
        {type:'counter',target:'attacker'},
        {type:'multiHit',target:'defender',hits:3},
        {type:'stage',target:'attacker',stat:'attack',delta:1},
        {type:'staminaDrain',target:'defender',moveName:'Single Leg',amount:2},
        {type:'recoil',target:'attacker',amount:4}
      ]
    },'Bucky','Anchor');
  });
  expect(feedback.map(event=>event.kind)).toEqual([
    'critical','critical','edge','counter','hit-count','stat-up','stamina-down','recoil'
  ]);
  expect(feedback.map(event=>event.text)).toEqual([
    'Hit 1 was critical!','Hit 3 was critical!',"It's a style edge!",
    'Bucky caught the opening with a re-attack!','Hit 3 times!',"Bucky's Strength rose!",
    'Single Leg lost 2 Stamina!','Bucky took 4 recoil!'
  ]);
  const setupFeedback=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene');
    return scene.resultFeedback({hits:1,multiplier:2,hitResults:[],events:[{type:'stage',target:'attacker',stat:'defense',delta:1}]},'Bucky','Anchor');
  });
  expect(setupFeedback.map(event=>event.kind)).toEqual(['stat-up']);
});

test('A completes typed feedback, exposes the prompt, and advances the next result',async({page})=>{
  await bootBattle(page);
  await useOnlyMove(page);
  await page.waitForFunction(()=>{
    const feedback=window.__badgerTest.sceneState('BattleScene').battleFeedback;
    return feedback?.kind==='critical'&&!feedback.typeComplete;
  },null,{timeout:8_000});

  await page.evaluate(()=>window.__badgerTest.press('a'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleFeedback)).toMatchObject({
    kind:'critical',typeComplete:true,promptVisible:true,renderedText:'A critical hit!'
  });

  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleFeedback?.kind)).toBe('edge');
  const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  expect(state.battleFeedbackHistory[0]).toMatchObject({kind:'critical',completed:true,advancedBy:'input'});
  expect(state.battleFeedback).toMatchObject({kind:'edge',remaining:0});
  expect(state.battlePhase).toBe('message');
  expect(state.battleSprites).toMatchObject({enemyScale:[1,1],playerScale:[1,1]});
});
