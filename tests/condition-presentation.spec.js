import {expect,test} from '@playwright/test';

// Keep this presentation fixture decisively faster than the defender so
// temperament modifiers cannot reverse the turn being asserted.
const player={id:'closer',lvl:50,xp:0,hp:999,score:0,moves:['flurry']};

function saveWithPlayer(wrestler=player,items={}){
  return {
    party:[{...wrestler}],active:0,box:[],items,badges:[],
    dex:{seen:{},caught:{[wrestler.id]:true}},flags:{introDone:true,assignment:true},stats:{}
  };
}

async function bootBattle(page,data,wrestler=player,items={}){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),saveWithPlayer(wrestler,items));
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await page.evaluate(options=>window.__badgerTest.startBattle({...options,rng:()=>.5}),data);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15_000}).toBe('command');
}

async function useOnlyMove(page){
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));
}

test('multi-hit techniques drain Condition once per authoritative hit',async({page})=>{
  await bootBattle(page,{enemyId:'topboss',enemyLevel:50,battleType:'trainer'});
  await useOnlyMove(page);

  await expect.poll(async()=>{
    const steps=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').conditionPresentationHistory);
    return steps.filter(step=>step.side==='enemy'&&step.kind==='hit'&&step.completed).length;
  },{timeout:8_000}).toBe(3);

  const result=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene'),state=window.__badgerTest.sceneState('BattleScene');
    return {
      steps:state.conditionPresentationHistory.filter(step=>step.side==='enemy'&&step.kind==='hit'),
      actualCondition:scene.enemy().hp,
      phases:state.battlePhaseHistory,
      cameraZoom:scene.cameras.main.zoom,
      spriteScales:state.battleSprites
    };
  });
  expect(result.steps).toHaveLength(3);
  expect(result.steps.every(step=>step.completed)).toBe(true);
  expect(result.steps.reduce((sum,step)=>sum+step.damage,0)).toBe(result.steps[0].from-result.actualCondition);
  result.steps.forEach((step,index)=>{
    expect(step.from-step.to).toBe(step.damage);
    if(index)expect(step.from).toBe(result.steps[index-1].to);
  });
  expect(result.steps.at(-1).to).toBe(result.actualCondition);
  expect(result.phases.indexOf('impact')).toBeLessThan(result.phases.indexOf('condition-drain'));
  expect(result.cameraZoom).toBe(1);
  expect(result.spriteScales).toMatchObject({enemyScale:[1,1],playerScale:[1,1]});
});

test('a knockout stops remaining hits and fainting waits for the final drain',async({page})=>{
  await bootBattle(page,{
    enemyMon:{id:'drillpartner',lvl:50,xp:0,hp:1,score:0,moves:['single']},
    battleType:'trainer',trainerName:'Coach Lane'
  });
  await useOnlyMove(page);

  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battlePhase),{timeout:8_000}).toBe('faint');
  const result=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene'),state=window.__badgerTest.sceneState('BattleScene');
    return {
      steps:state.conditionPresentationHistory.filter(step=>step.side==='enemy'&&step.kind==='hit'),
      actualCondition:scene.enemy().hp,
      phases:state.battlePhaseHistory
    };
  });
  expect(result.steps).toEqual([expect.objectContaining({hitIndex:1,from:1,to:0,damage:1,completed:true})]);
  expect(result.actualCondition).toBe(0);
  expect(result.phases).toEqual(expect.arrayContaining(['impact','condition-drain','message','faint']));
  expect(result.phases.indexOf('condition-drain')).toBeLessThan(result.phases.indexOf('faint'));
});

test('major conditions persist in the HUD and resolve through a visible end-turn ceremony',async({page})=>{
  await bootBattle(page,{
    enemyMon:{id:'drillpartner',lvl:5,xp:0,hp:80,score:0,moves:['stall']},
    battleType:'trainer',trainerName:'Coach Lane'
  },{...player,moves:['handfight']});
  await useOnlyMove(page);

  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battlePhaseHistory),{timeout:12_000})
    .toContain('condition-residual');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:12_000}).toBe('command');
  const result=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  expect(result.battleConditions.enemy).toEqual({key:'gassed'});
  expect(result.conditionPresentationHistory).toContainEqual(expect.objectContaining({
    side:'enemy',kind:'residual',completed:true
  }));
  expect(result.battleFeedbackHistory).toEqual(expect.arrayContaining([
    expect.objectContaining({kind:'condition-inflicted'}),
    expect.objectContaining({kind:'condition-residual'})
  ]));
});

test('the Trainer Kit clears a persistent condition and consumes the battle turn',async({page})=>{
  await bootBattle(page,{
    enemyMon:{id:'drillpartner',lvl:5,xp:0,hp:80,score:0,moves:['stall']},
    battleType:'trainer',trainerName:'Coach Lane'
  },{...player,moves:['handfight'],condition:{key:'stunned'}},{trainerKit:1});

  await page.evaluate(()=>window.__badgerTest.press('right'));
  await page.evaluate(()=>window.__badgerTest.press('a'));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('bag');
  await page.evaluate(()=>window.__badgerTest.press('down'));
  await page.evaluate(()=>window.__badgerTest.press('down'));
  await page.waitForTimeout(180);
  await page.evaluate(()=>window.__badgerTest.press('a'));

  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.storage().items.trainerKit),{timeout:10_000}).toBe(0);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:12_000}).toBe('command');
  expect(await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleConditions.player)).toBeNull();
});
