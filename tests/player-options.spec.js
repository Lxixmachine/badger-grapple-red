import {expect,test} from '@playwright/test';
import {normalizeState} from '../src/systems/save.js';
import {
  cyclePlayerSetting,
  DEFAULT_PLAYER_SETTINGS,
  normalizePlayerSettings,
  textDelayFor
} from '../src/systems/playerSettings.js';

const STORAGE_KEY='badger_grapple_red_engine_v2';

function wrestler(id='closer',lvl=50,moves=['highc']){
  return {id,lvl,xp:0,hp:999,score:0,moves};
}

function saveWithSettings(settings={},party=[wrestler()]){
  return {
    party,active:0,box:[],items:{},badges:[],dex:{seen:{},caught:{[party[0].id]:true}},
    flags:{introDone:true,assignment:true},stats:{},settings:{...DEFAULT_PLAYER_SETTINGS,...settings}
  };
}

async function press(page,key){
  await page.evaluate(value=>window.__badgerTest.press(value),key);
}

async function bootWithSave(page,save,url='/?test=1'){
  await page.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:STORAGE_KEY,state:save});
  await page.goto(url);
  await expect(page.locator('#bootError')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
}

async function waitForBattleCommand(page){
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene')?.mode),{timeout:15_000}).toBe('command');
}

test('player settings migrate safely and retain FireRed-style defaults',()=>{
  expect(normalizePlayerSettings()).toEqual(DEFAULT_PLAYER_SETTINGS);
  expect(normalizeState({settings:{textSpeed:'instant',battleScene:'yes',battleStyle:'rotate'}}).settings).toEqual(DEFAULT_PLAYER_SETTINGS);
  expect(normalizeState({settings:{textSpeed:'fast',battleScene:false,battleStyle:'set'}}).settings).toEqual({textSpeed:'fast',battleScene:false,battleStyle:'set'});
  expect(cyclePlayerSetting(DEFAULT_PLAYER_SETTINGS,'textSpeed',1).textSpeed).toBe('fast');
  expect(cyclePlayerSetting(DEFAULT_PLAYER_SETTINGS,'textSpeed',-1).textSpeed).toBe('slow');
  expect(cyclePlayerSetting(DEFAULT_PLAYER_SETTINGS,'battleScene',1).battleScene).toBe(false);
  expect(cyclePlayerSetting(DEFAULT_PLAYER_SETTINGS,'battleStyle',1).battleStyle).toBe('set');
  expect(textDelayFor({settings:{textSpeed:'slow'}})).toBe(32);
  expect(textDelayFor({settings:{textSpeed:'mid'}})).toBe(19);
  expect(textDelayFor({settings:{textSpeed:'fast'}})).toBe(10);
});

test('native Options menu changes and immediately saves all gameplay settings',async({page})=>{
  await bootWithSave(page,saveWithSettings());
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.activeSceneKeys())).toContain('TitleScene');
  await page.evaluate(()=>window.__badgerTest.startMenu({tab:'options'}));
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('MenuScene'))).toMatchObject({active:true,tab:'options',selected:0});

  const labels=await page.evaluate(()=>window.badgerGame.scene.getScene('MenuScene').children.list.filter(child=>child.type==='Text').map(child=>child.text));
  expect(labels).toEqual(expect.arrayContaining(['TEXT SPEED','BATTLE SCENE','BATTLE STYLE','SOUND','ERASE SAVE DATA']));

  await press(page,'right');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.storage().settings.textSpeed)).toBe('fast');
  await press(page,'left');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.storage().settings.textSpeed)).toBe('mid');
  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.storage().settings.textSpeed)).toBe('fast');
  await press(page,'down');
  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.storage().settings.battleScene)).toBe(false);
  await press(page,'down');
  await press(page,'right');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.storage().settings.battleStyle)).toBe('set');

  expect(await page.evaluate(()=>window.__badgerTest.sceneState('MenuScene').playerSettings)).toEqual({textSpeed:'fast',battleScene:false,battleStyle:'set'});
  expect(await page.evaluate(()=>window.__badgerTest.storage().audioMuted)).toBe(false);
});

test('world dialogue types, ignores movement, then requires a second press to advance',async({page})=>{
  const full='Coach: Read the whole instruction before you leave the room.';
  await bootWithSave(page,saveWithSettings({textSpeed:'slow'}),'/?test=1&scene=overworld&area=camp_randall');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({active:true,area:'camp_randall'});
  const initial=await page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene').tilePos);
  await page.evaluate(text=>{
    window.__dialogueActionCount=0;
    window.badgerGame.scene.getScene('OverworldScene').showMessage(text,()=>{window.__dialogueActionCount+=1;});
  },full);

  await expect.poll(()=>page.evaluate(()=>{
    const state=window.__badgerTest.sceneState('OverworldScene');
    return state.messageTyping&&state.messageText.length>0&&state.messageText.length<state.message.length;
  })).toBe(true);
  expect(await page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene').messageTypingDelay)).toBe(32);

  await press(page,'right');
  expect(await page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene').tilePos)).toEqual(initial);
  expect(await page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene').messageOpen)).toBe(true);

  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene'))).toMatchObject({messageOpen:true,messageTyping:false,messageText:full});
  expect(await page.evaluate(()=>window.__dialogueActionCount)).toBe(0);

  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('OverworldScene').messageOpen)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>window.__dialogueActionCount)).toBe(1);
});

test('Set battle style sends the replacement without offering a free switch',async({page})=>{
  const party=[wrestler('closer',50,['highc']),wrestler('buckvarsity',50,['single'])];
  await bootWithSave(page,saveWithSettings({battleStyle:'set'},party));
  await page.evaluate(()=>window.__badgerTest.startBattle({team:[['drillpartner',5],['pacesetter',5]],battleType:'trainer',trainerName:'Coach Lane'}));
  await waitForBattleCommand(page);
  await page.evaluate(()=>window.__badgerTest.knockOutEnemy());
  await waitForBattleCommand(page);

  const state=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  expect(state.enemyIndex).toBe(1);
  expect(state.battleCeremonyHistory).toEqual(expect.arrayContaining([expect.objectContaining({stage:'replacement-style',style:'set',wrestlerId:'pacesetter'})]));
  expect(state.battleCeremonyHistory.some(event=>event.stage==='replacement-prompt')).toBe(false);
  expect(state.battlePhaseHistory).not.toContain('switch-prompt');
});

test('Battle Scene Off suppresses technique motion while preserving damage and Condition drain',async({page})=>{
  await bootWithSave(page,saveWithSettings({battleScene:false}));
  await page.evaluate(()=>window.__badgerTest.startBattle({enemyId:'topboss',enemyLevel:50,battleType:'trainer',trainerName:'Test Coach',rng:()=>.1}));
  await waitForBattleCommand(page);
  const before=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').trainerStrategy.team[0].hp);
  const positions=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battleSprites);

  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').mode)).toBe('fight');
  await page.waitForTimeout(180);
  await press(page,'a');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').techniqueAnimationHistory.some(cue=>cue.stage==='impact-static')),{timeout:8_000}).toBe(true);

  const impact=await page.evaluate(()=>window.__badgerTest.sceneState('BattleScene'));
  expect(impact.trainerStrategy.team[0].hp).toBeLessThan(before);
  expect(impact.techniqueAnimationHistory).toEqual(expect.arrayContaining([
    expect.objectContaining({stage:'windup-static',side:'player'}),
    expect.objectContaining({stage:'impact-static',side:'player'})
  ]));
  expect(impact.techniqueAnimationHistory.some(cue=>cue.stage==='windup'||cue.stage==='impact')).toBe(false);
  expect(impact.battleSprites.enemyPosition).toEqual(positions.enemyPosition);
  expect(impact.battleSprites.playerPosition).toEqual(positions.playerPosition);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').conditionPresentationHistory.some(step=>step.side==='enemy'&&step.completed)),{timeout:8_000}).toBe(true);
});
