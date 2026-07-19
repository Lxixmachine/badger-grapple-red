import {test,expect} from '@playwright/test';
import {MOVES} from '../src/data/moves.js';
import {ROSTER,makeTrainerMon} from '../src/data/roster.js';
import {TRAINER_BATTLES,TRAINER_PORTRAITS} from '../src/data/trainerBattles.js';
import {BATTLE_ARENA_KEYS} from '../src/data/battlePresentation.js';

const majorKeys=[
  'field_house_floor:opener',
  'picnic_point:funk_doctor',
  'bascom_hill:professor_wall',
  'capitol_interior:senator',
  'kohl_bracket_floor:anchor',
  'nationals_floor:closer'
];

test('Season One trainers have complete authored identities and legal ace plans',()=>{
  expect(Object.keys(TRAINER_BATTLES)).toHaveLength(17);
  for(const [key,config] of Object.entries(TRAINER_BATTLES)){
    expect(config.trainerName,`${key} name`).toBeTruthy();
    expect(config.trainerClass,`${key} class`).toBeTruthy();
    expect(TRAINER_PORTRAITS,`${key} portrait`).toContain(config.trainerPortrait);
    expect(config.lineupLabel.length,`${key} lineup label`).toBeLessThanOrEqual(10);
    expect(config.strategy,`${key} strategy`).toBeTruthy();
    expect(BATTLE_ARENA_KEYS,`${key} arena`).toContain(config.arenaKey);
    expect(config.team.length,`${key} team`).toBeGreaterThan(0);
    expect(config.team.length,`${key} FireRed party limit`).toBeLessThanOrEqual(6);
    const aces=config.team.filter(member=>member.ace);
    expect(aces,`${key} ace`).toHaveLength(1);
    expect(config.team.at(-1).ace,`${key} ace must close`).toBe(true);
    for(const member of config.team){
      expect(ROSTER[member.id],`${key} roster ${member.id}`).toBeTruthy();
      expect(member.level,`${key} level`).toBeGreaterThan(0);
      expect(member.moves.length,`${key} moves`).toBeGreaterThan(0);
      expect(member.moves.length,`${key} move limit`).toBeLessThanOrEqual(4);
      expect(new Set(member.moves).size,`${key} unique moves`).toBe(member.moves.length);
      member.moves.forEach(move=>expect(MOVES[move],`${key} move ${move}`).toBeTruthy());
      if(member.signatureMove)expect(member.moves,`${key} member signature`).toContain(member.signatureMove);
    }
    if(config.signatureMove)expect(config.team.at(-1).moves,`${key} trainer signature`).toContain(config.signatureMove);
  }
});

test('major captains use unique portraits and non-duplicate lineups',()=>{
  const majors=majorKeys.map(key=>TRAINER_BATTLES[key]);
  expect(new Set(majors.map(config=>config.trainerPortrait)).size).toBe(majors.length);
  const lineupKeys=majors.map(config=>config.team.map(member=>`${member.id}:${member.moves.join(',')}`).join('|'));
  expect(new Set(lineupKeys).size).toBe(majors.length);
});

test('authored trainer members build deterministic stats and exact techniques',()=>{
  const config=TRAINER_BATTLES['bascom_hill:professor_wall'],spec=config.team.at(-1);
  const first=makeTrainerMon(spec,config.trainerAi.tier),second=makeTrainerMon(spec,config.trainerAi.tier);
  expect(first.moves).toEqual(spec.moves);
  expect(first.moves).toEqual(second.moves);
  expect(first.ivs).toEqual(second.ivs);
  expect(first.hp).toBe(second.hp);
  expect(first.nature).toBe(second.nature);
  expect(first.ace).toBe(true);
  expect(first.signatureMove).toBe('fronthead');
});

test('trainer challenge renders class identity, unique portrait, and authored team',async({page})=>{
  await page.goto('/?test=1&scene=battle&starter=buckshot');
  await expect.poll(()=>page.evaluate(()=>window.BADGER_VERSION)).toBeTruthy();
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest?.sceneState('BattleScene')?.battleType),{timeout:5000}).toBe('spar');
  const config=TRAINER_BATTLES['bascom_hill:professor_wall'];
  await page.evaluate(data=>window.__badgerTest.startBattle(data),config);
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').trainerName),{timeout:5000}).toBe('The Professor');
  await expect.poll(()=>page.evaluate(()=>window.__badgerTest.sceneState('BattleScene').battlePhase),{timeout:5000}).toBe('trainer-challenge');
  await page.waitForTimeout(650);
  const result=await page.evaluate(()=>{
    const scene=window.badgerGame.scene.getScene('BattleScene');
    return {
      state:window.__badgerTest.sceneState('BattleScene'),
      challengeText:scene.introSequence()[0].text,
      images:scene.children.list.filter(child=>child.type==='Image').map(child=>({key:child.texture.key,scale:[child.scaleX,child.scaleY],display:[child.displayWidth,child.displayHeight],position:[Math.round(child.x),Math.round(child.y)]})),
      portraits:['player','rex','wrestler','athlete','captain','camper','opener','funk_doctor','professor','senator','anchor','closer'].map(key=>({key,exists:scene.textures.exists(`battle_trainer_${key}`),size:[scene.textures.get(`battle_trainer_${key}`).source[0].width,scene.textures.get(`battle_trainer_${key}`).source[0].height]}))
    };
  });
  expect(result.state.trainerIdentity).toMatchObject({name:'The Professor',className:'BASCOM TECHNICIAN',portrait:'professor',lineupLabel:'PROFESSOR',signatureMove:'fronthead'});
  expect(result.challengeText).toContain('BASCOM TECHNICIAN The Professor');
  expect(result.state.trainerStrategy.team.map(member=>({id:member.id,moves:member.moves,ace:member.ace}))).toEqual(config.team.map(member=>({id:member.id,moves:[...member.moves],ace:member.ace})));
  expect(result.state.trainerStrategy.team.at(-1).ivs).toEqual({hp:23,attack:23,defense:23,technique:23,awareness:23,speed:23});
  expect(result.images).toEqual(expect.arrayContaining([
    {key:'battle_trainer_player',scale:[1,1],display:[128,128],position:[112,233]},
    {key:'battle_trainer_professor',scale:[1,1],display:[128,128],position:[370,178]}
  ]));
  result.portraits.forEach(portrait=>{
    expect(portrait.exists,portrait.key).toBe(true);
    expect(portrait.size,portrait.key).toEqual([128,128]);
  });
});
