import {expect,test} from '@playwright/test';

async function press(page,key){await page.evaluate(name=>window.__badgerTest.press(name),key);}

function legacyWrestler(id='buckshot',lvl=8){return {id,lvl,xp:0,hp:90,gas:70,score:0,moves:['single','highc','sprawl','pace']};}

async function bootWithSave(page,save,url){
  await page.addInitScript(state=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(state)),save);
  await page.goto(url);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
}

test('a legacy phone save enters battle with per-technique Stamina and six stats',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],active:0,box:[],items:{invite:2,energy:1,tape:1,film:1},
    dex:{seen:{},caught:{buckshot:true}},flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'wild'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  const save=await page.evaluate(()=>window.__badgerTest.storage());
  expect(save.party[0].gas).toBeUndefined();
  expect(save.party[0].stamina).toBeUndefined();
  expect(save.party[0].moveStamina).toMatchObject({single:35,highc:25,sprawl:20,pace:30});
  expect(Object.keys(save.party[0].ivs)).toHaveLength(6);
  expect(Object.keys(save.party[0].effort)).toHaveLength(6);
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

test('one mobile D-pad tap advances exactly one menu entry',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],box:[],active:0,items:{},badges:[],
    flags:{introDone:true,assignment:true},stats:{}
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startMenu());
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene'))).toMatchObject({active:true,tab:'main',selected:0});
  await page.locator('button[data-key="down"]').click();
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene').selected)).toBe(1);
});

test('Travel Lineup exposes both wrestler stat and technique summary pages',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],box:[],active:0,items:{},badges:[],
    flags:{introDone:true,assignment:true},stats:{}
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startMenu({tab:'team'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene'))).toMatchObject({tab:'team',selected:0});
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene'))).toMatchObject({tab:'summary',summaryPage:0,summaryIndex:0});
  await press(page,'right');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene').summaryPage)).toBe(1);
  await press(page,'b');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene').tab)).toBe('team');
});

test('Travel Lineup naming persists a nickname and battle HUD uses it',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],box:[],active:0,items:{},badges:[],
    flags:{introDone:true,assignment:true},stats:{}
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startMenu({tab:'team'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene').tab)).toBe('team');
  await press(page,'a');
  await press(page,'start');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('NamingScene'))).toMatchObject({active:true,phase:'confirm',confirmSelected:0});
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys().at(-1))).toBe('NamingScene');
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('NamingScene').phase)).toBe('naming');
  await page.keyboard.type('ACE');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('NamingScene').nameDraft)).toBe('ACE');
  await page.keyboard.press('Enter');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().party[0].nickname)).toBe('ACE');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'trainer'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15000}).toBe('command');
  const labels=await page.evaluate(()=>window.badgerGame.scene.getScene('BattleScene').children.list.filter(child=>child.type==='Text').map(child=>child.text));
  expect(labels).toContain('ACE');
  expect(labels).toContain('ACE do?');
});

test('rear-view sprite exceptions face the opponent from the player side',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler('fieldflyer',8)],active:0,box:[],items:{},badges:[],
    dex:{seen:{},caught:{fieldflyer:true}},flags:{introDone:true,assignment:true},stats:{}
  },'/?test=1');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'scrambleboss',enemyLevel:8,battleType:'trainer'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleSprites)).toMatchObject({
    playerTexture:'battle_fieldflyer_back',playerFlipX:true,
    enemyTexture:'battle_scrambleboss',enemyFlipX:false
  });
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
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('NamingScene'))).toMatchObject({active:true,phase:'confirm'});
  await press(page,'a');
  await page.keyboard.type('RUDY');
  await page.keyboard.press('Enter');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().party.find(mon=>mon.id==='drillpartner')?.nickname)).toBe('RUDY');
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

test('battle techniques expose persistent FireRed-style combat effects',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],active:0,box:[],items:{},dex:{seen:{},caught:{buckshot:true}},
    flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'spar'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await press(page,'down');
  await press(page,'right');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').selected)).toBe(3);
  await page.waitForTimeout(180);
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battle?.player?.stages?.attack),{timeout:6000}).toBe(1);
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:15000}).toBe('command');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().party[0].moveStamina.pace)).toBe(29);
});

test('battle presentation is native resolution and preserves FireRed-style action beats',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],active:0,box:[],items:{},dex:{seen:{},caught:{buckshot:true}},
    flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:12,battleType:'trainer'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  const presentation=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene');
    return {
      width:scene.cameras.main.width,height:scene.cameras.main.height,zoom:scene.cameras.main.zoom,
      playerTexture:scene.playerSprite.texture.key,enemyTexture:scene.enemySprite.texture.key,
      playerWidth:scene.playerSprite.displayWidth,enemyWidth:scene.enemySprite.displayWidth,
      playerFlipX:scene.playerSprite.flipX,enemyFlipX:scene.enemySprite.flipX
    };
  });
  expect(presentation).toMatchObject({
    width:480,height:320,zoom:1,
    playerTexture:'battle_buckshot_back',enemyTexture:'battle_drillpartner',
    playerFlipX:false,enemyFlipX:false
  });
  expect(presentation.playerWidth).toBeGreaterThanOrEqual(140);
  expect(presentation.enemyWidth).toBeGreaterThanOrEqual(140);

  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await page.waitForTimeout(180);
  const started=Date.now();
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battlePhase)).toBe('announce');
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battlePhase)).toBe('announce');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode),{timeout:10000}).toBe('command');
  const phases=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battlePhaseHistory);
  expect(phases).toEqual(expect.arrayContaining(['announce','impact','message','between','command']));
  expect(Date.now()-started).toBeGreaterThan(4200);
});

test('legacy 320px scenes render text at higher internal resolution',async({page})=>{
  await page.goto('/?test=1&reset=1');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  const resolutions=await page.evaluate(()=>window.badgerGame.scene.getScene('TitleScene').children.list
    .filter(child=>child.type==='Text').map(child=>child.style.resolution));
  expect(resolutions.length).toBeGreaterThan(0);
  expect(resolutions.every(value=>value>=2)).toBe(true);
});

test('B backs out of submenus but cannot silently leave a match',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler()],active:0,box:[],items:{},dex:{seen:{},caught:{buckshot:true}},
    flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'trainer'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await press(page,'b');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'))).toMatchObject({active:true,mode:'command'});
  await press(page,'b');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'))).toMatchObject({active:true,mode:'command'});
});

test('a fifth level-up technique requires an explicit replacement choice',async({page})=>{
  await bootWithSave(page,{
    party:[legacyWrestler('buckvarsity',13)],active:0,box:[],items:{},dex:{seen:{},caught:{buckvarsity:true}},
    flags:{introDone:true,assignment:true},stats:{},badges:[]
  },'/?test=1');
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'drillpartner',enemyLevel:5,battleType:'trainer'}));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('command');
  await page.evaluate(()=>window.__badgerTest.queueMoveLearning('reattack'));
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'))).toMatchObject({
    mode:'learnMove',selected:0,moveLearning:{wrestlerId:'buckvarsity',move:'reattack'}
  });
  await press(page,'down');
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'))).toMatchObject({
    mode:'learnInspect',selected:1
  });
  await page.waitForTimeout(180);
  await press(page,'left');
  await press(page,'a');
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().party[0].moves)).toEqual(['single','reattack','sprawl','pace']);
  await expect.poll(async()=>page.evaluate(()=>window.__badgerTest.storage().party[0].pendingMoves)).toEqual([]);
});
