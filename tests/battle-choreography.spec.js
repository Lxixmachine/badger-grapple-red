import {expect,test} from '@playwright/test';

const save={
  party:[{id:'buckshot',lvl:12,xp:0,hp:110,score:0,moves:['single','sprawl','headlock','flurry']}],
  active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{buckshot:true}},
  flags:{introDone:true,assignment:true},stats:{}
};

test('representative techniques render distinct choreography without breaking native pixels',async({page})=>{
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto('/?test=1');
  await expect(page.locator('#bootError')).toBeHidden();
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'trainer'}));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15000}).toBe('command');

  const samples=[
    {key:'single',method:'playTechniqueImpact',stage:'impact',hits:1},
    {key:'sprawl',method:'playTechniqueSetup',stage:'setup',hits:1},
    {key:'headlock',method:'playTechniqueImpact',stage:'impact',hits:1},
    {key:'flurry',method:'playTechniqueImpact',stage:'impact',hits:3}
  ];
  const effects=[];
  for(const sample of samples){
    await page.evaluate(({key,method,hits})=>{
      const scene=window.badgerGame.scene.getScene('BattleScene');
      scene.attackSide='player';
      if(method==='playTechniqueSetup')scene.playTechniqueSetup(scene.playerSprite,key);
      else scene.playTechniqueImpact(scene.playerSprite,scene.enemySprite,key,[],null,hits);
    },sample);
    await page.waitForTimeout(80);
    const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
    expect(state.techniqueAnimation).toMatchObject({moveKey:sample.key,stage:sample.stage,hitCount:sample.hits,side:'player'});
    effects.push(state.techniqueAnimation.effect);
    const contract=await page.evaluate(()=>{
      const scene=window.badgerGame.scene.getScene('BattleScene');
      return {
        size:[scene.scale.gameSize.width,scene.scale.gameSize.height],zoom:scene.cameras.main.zoom,
        scales:[scene.playerSprite.scaleX,scene.playerSprite.scaleY,scene.enemySprite.scaleX,scene.enemySprite.scaleY],
        integers:[scene.playerSprite.x,scene.playerSprite.y,scene.enemySprite.x,scene.enemySprite.y].every(Number.isInteger)
      };
    });
    expect(contract).toEqual({size:[480,320],zoom:1,scales:[1,1,1,1],integers:true});
    await page.waitForTimeout(sample.key==='flurry'?1100:620);
  }
  expect(new Set(effects).size).toBe(samples.length);
  const history=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').techniqueAnimationHistory);
  expect(history).toEqual(expect.arrayContaining([
    expect.objectContaining({moveKey:'single',effect:'low-sweep'}),
    expect.objectContaining({moveKey:'sprawl',effect:'sprawl-shield'}),
    expect.objectContaining({moveKey:'headlock',effect:'headlock-arc'}),
    expect.objectContaining({moveKey:'flurry',effect:'flurry-streaks',hitCount:3})
  ]));
});
