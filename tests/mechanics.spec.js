import {expect,test} from '@playwright/test';
import {SEASON_ONE_BADGES} from '../src/data/campaign.js';
import {ADV,MOVES} from '../src/data/moves.js';
import {CONDITIONS,clearCondition,consumeConditionAction,inflictCondition,resolveConditionResidual} from '../src/data/conditions.js';
import {BATTLE_CHOREOGRAPHY,battleChoreographyFor,choreographySignature} from '../src/data/battleAnimations.js';
import {BATTLE_BACK_FLIP_IDS,ROSTER,addXp,allMovesSpent,battleAssetFor,battleFlipXFor,battleTextureFor,counterStarterFor,currentMoveStamina,makeMon,normalizeWrestlerNickname,personaFor,restoreMoveStamina,scaledStats,setWrestlerNickname,wrestlerName,xpNeed} from '../src/data/roster.js';
import {calculateStat,effortTotal,MAX_TOTAL_EFFORT,potentialFor,STAT_KEYS} from '../src/data/stats.js';
import {defaultState,defeatedWrestlerCount,normalizeState,rosterBookComplete} from '../src/systems/save.js';
import {
  attemptRecruit,
  chooseAiMove,
  consumeActionBlock,
  createBattleState,
  depositWrestler,
  effortYieldFor,
  effectiveBattleStat,
  modifyBattleStage,
  normalizeItems,
  practiceWrestler,
  previewDamage,
  proficiencyMultiplier,
  recruitOdds,
  resolveTechnique,
  restoreWrestler,
  restoreTechniqueStamina,
  styleMultiplier,
  swapLockerWrestler,
  turnOrder,
  useRecoveryItem,
  withdrawWrestler
} from '../src/systems/mechanics.js';
import {canFastTravel,canFlyToNationals,earnedBadgeCount,grantKeyItem,missingSeasonBadges,registerTravelDestination,travelTo,unlockTown} from '../src/systems/progression.js';
import {NPC_LOOKS,npcTextureKey} from '../src/data/npcLooks.js';
import {TRAINERS} from '../src/data/world.js';
import {LAYERED_MAPS} from '../src/data/layeredMaps.js';

function mon(id,lvl=10){const result=makeMon(id,lvl);result.ivs=Object.fromEntries(STAT_KEYS.map(key=>[key,15]));result.effort=Object.fromEntries(STAT_KEYS.map(key=>[key,0]));result.nature=0;return restoreWrestler(result);}
function setMoves(wrestler,moves){wrestler.moves=[...moves];restoreMoveStamina(wrestler);return wrestler;}

test('every technique owns distinct, pixel-safe battle choreography',()=>{
  expect(Object.keys(BATTLE_CHOREOGRAPHY).sort()).toEqual(Object.keys(MOVES).sort());
  const validStages=entry=>{
    expect(entry.motion).toMatch(/^[a-z][a-z-]+$/);
    expect(entry.effect).toMatch(/^[a-z][a-z-]+$/);
    expect(Number.isInteger(entry.windup.dx)).toBe(true);
    expect(Number.isInteger(entry.windup.dy)).toBe(true);
    expect(Number.isInteger(entry.windup.duration)).toBe(true);
    Object.values(entry.impact).forEach(value=>expect(Number.isInteger(value)).toBe(true));
    expect(entry.tempo.feedback).toBeGreaterThanOrEqual(500);
    expect(Number.isInteger(entry.tempo.contactHold)).toBe(true);
    expect(Number.isInteger(entry.tempo.conditionLead)).toBe(true);
    expect(Number.isInteger(entry.tempo.interHitPause)).toBe(true);
    expect(Number.isInteger(entry.tempo.recovery)).toBe(true);
    expect(entry.tempo.contactHold).toBeGreaterThanOrEqual(50);
    expect(entry.tempo.conditionLead).toBeGreaterThan(entry.tempo.contactHold);
    expect(entry.tempo.interHitPause).toBeGreaterThanOrEqual(60);
    expect(entry.tempo.recovery).toBeGreaterThanOrEqual(200);
  };
  Object.values(BATTLE_CHOREOGRAPHY).forEach(validStages);
  expect(new Set(Object.values(BATTLE_CHOREOGRAPHY).map(choreographySignature)).size).toBe(Object.keys(MOVES).length);
  expect(battleChoreographyFor('single').effect).toBe('low-sweep');
  expect(battleChoreographyFor('sprawl').effect).toBe('sprawl-shield');
  expect(battleChoreographyFor('headlock').effect).toBe('headlock-arc');
  expect(battleChoreographyFor('flurry').effect).toBe('flurry-streaks');
  for(const [key,definition] of Object.entries(MOVES)){
    if(definition.hits)expect(BATTLE_CHOREOGRAPHY[key].tempo.hitStagger).toBeGreaterThan(0);
  }
});

test('six-style chart preserves the starter triangle and two advantages per style',()=>{
  for(const strengths of Object.values(ADV))expect(strengths).toHaveLength(2);
  expect(styleMultiplier('Shooter','Rider')).toBe(2);
  expect(styleMultiplier('Rider','Scrambler')).toBe(2);
  expect(styleMultiplier('Scrambler','Shooter')).toBe(2);
  expect(styleMultiplier('Shooter','Wall')).toBe(.5);
  expect(styleMultiplier('Shooter','Thrower')).toBe(1);
});

test('Rex selects the style counter to every opening persona',()=>{
  expect(counterStarterFor('buckshot')).toBe('fieldflyer');
  expect(counterStarterFor('matreturner')).toBe('buckshot');
  expect(counterStarterFor('fieldflyer')).toBe('matreturner');
});

test('every roster entry owns a unique front and back battle identity',()=>{
  const assets=Object.values(ROSTER).map(record=>record.battleAsset);
  expect(new Set(assets).size).toBe(Object.keys(ROSTER).length);
  for(const record of Object.values(ROSTER)){
    expect(battleAssetFor(record.id)).toBe(record.id);
    expect(battleTextureFor(record.id)).toBe(`battle_${record.id}`);
    expect(battleTextureFor(record.id,true)).toBe(`battle_${record.id}_back`);
    expect(battleFlipXFor(record.id)).toBe(false);
    expect(battleFlipXFor(record.id,true)).toBe(BATTLE_BACK_FLIP_IDS.includes(record.id));
    expect(personaFor(record.id)).toBe(record.spirit);
  }
  expect(personaFor('professor')).toBe('Snapping Turtle');
  expect(personaFor('closer')).toBe('Wolverine');
});

test('wrestler nicknames are FireRed-length, save-safe, and override species labels',()=>{
  const wrestler=makeMon('buckshot',6);
  expect(wrestlerName(wrestler)).toBe('Bucky Shotmaker');
  expect(wrestlerName(wrestler,{short:true})).toBe('Bucky');
  expect(normalizeWrestlerNickname("  CAPTAIN!!!  ")).toBe('CAPTAIN');
  expect(setWrestlerNickname(wrestler,'MAT LEGEND 12')).toBe('MAT LEGEND');
  expect(wrestler.nickname).toBe('MAT LEGEND');
  expect(wrestlerName(wrestler,{short:true})).toBe('MAT LEGEND');
  const state=normalizeState({party:[wrestler],box:[]});
  expect(state.party[0].nickname).toBe('MAT LEGEND');
  setWrestlerNickname(state.party[0],'');
  expect(state.party[0].nickname).toBeUndefined();
  expect(wrestlerName(state.party[0])).toBe('Bucky Shotmaker');
  expect(wrestlerName(makeMon('topboss',10),{short:true})).toBe('Anchor');
});

test('authored overworld characters use semantic generated identities',()=>{
  expect(NPC_LOOKS).toEqual(expect.arrayContaining(['coach','trainer','rex','captain','wrestler','manager','scout','student','official','athlete','camper']));
  for(const look of NPC_LOOKS)expect(npcTextureKey(look)).toBe(`npc_${look}`);
  for(const trainer of Object.values(TRAINERS))expect(NPC_LOOKS).toContain(trainer.look);
  const npcs=Object.values(LAYERED_MAPS).flatMap(area=>area.npcs||[]);
  expect(npcs.find(npc=>npc.dialogue?.startsWith('Coach:'))?.look).toBe('coach');
  expect(npcs.find(npc=>npc.dialogue?.startsWith('Athletic Trainer:'))?.look).toBe('trainer');
  expect(npcs.find(npc=>npc.dialogue?.startsWith('Rex:'))?.look).toBe('rex');
  expect(npcs.every(npc=>!npc.look||NPC_LOOKS.includes(npc.look))).toBe(true);
});

test('legacy saves migrate to six stats, per-technique Stamina, and canonical inventory',()=>{
  const state=normalizeState({
    party:[{id:'buckshot',lvl:6,hp:50,gas:60,moves:['single']}],
    items:{invite:3,energy:2,tape:1,film:4},
    flags:{assignment:true}
  });
  expect(state.version).toBe('22.2');
  expect(state.party[0].gas).toBeUndefined();
  expect(state.party[0].stamina).toBeUndefined();
  expect(state.party[0].moveStamina).toEqual({single:MOVES.single.pp});
  expect(Object.keys(state.party[0].ivs)).toEqual(STAT_KEYS);
  expect(Object.keys(state.party[0].effort)).toEqual(STAT_KEYS);
  expect(state.items).toMatchObject({practiceSinglet:3,sportsDrink:2,athleticTape:1,filmStudy:4,travelSinglet:0,starterSinglet:0});
  expect(state.flags).toMatchObject({recruitingUnlocked:true,lockerUnlocked:true,rosterBook:true});
  expect(state.training).toBeUndefined();
});

test('Gen III stat math uses independent IVs, EV over four, and temperament modifiers',()=>{
  expect(calculateStat(62,50,31,252,0,'hp')).toBe(169);
  expect(calculateStat(54,50,31,252,0,'attack')).toBe(106);
  expect(calculateStat(54,50,31,252,1,'attack')).toBe(116);
  expect(calculateStat(42,50,31,252,1,'defense')).toBe(84);
});

test('individual potential and species effort yields come from authored stat data',()=>{
  expect(potentialFor(Object.fromEntries(STAT_KEYS.map(key=>[key,31])))).toBe('S');
  expect(potentialFor(Object.fromEntries(STAT_KEYS.map(key=>[key,0])))).toBe('D');
  for(const record of Object.values(ROSTER)){
    expect(record.effortYield).toMatchObject({stat:expect.stringMatching(/^(hp|attack|defense|technique|awareness|speed)$/),amount:expect.any(Number)});
    expect(effortYieldFor({id:record.id})).toEqual(record.effortYield);
  }
});

test('practice trains six effort tracks within FireRed per-stat and total caps',()=>{
  const wrestler=mon('buckshot',50);
  const base=scaledStats(wrestler.id,wrestler.lvl,wrestler);
  for(const key of STAT_KEYS)expect(practiceWrestler(wrestler,key)).toMatchObject({ok:true,gain:16});
  const trained=scaledStats(wrestler.id,wrestler.lvl,wrestler);
  for(const key of STAT_KEYS)expect(trained[key]).toBeGreaterThanOrEqual(base[key]);
  expect(effortTotal(wrestler.effort)).toBe(96);
  while(effortTotal(wrestler.effort)<MAX_TOTAL_EFFORT){const key=STAT_KEYS.find(stat=>wrestler.effort[stat]<255);if(!key)break;practiceWrestler(wrestler,key);}
  expect(effortTotal(wrestler.effort)).toBe(MAX_TOTAL_EFFORT);
  expect(practiceWrestler(wrestler,'speed')).toMatchObject({ok:false,reason:'totalCap'});
});

test('techniques spend their own Stamina and use Desperation Shot only when all are empty',()=>{
  const shooter=mon('buckshot'),rider=mon('matreturner');
  const before=currentMoveStamina(shooter,'single');
  const hit=resolveTechnique(shooter,rider,'single',()=>0);
  expect(hit).toMatchObject({hit:true,key:'single',multiplier:2});
  expect(currentMoveStamina(shooter,'single')).toBe(before-1);
  shooter.moveStamina.single=0;
  expect(resolveTechnique(shooter,rider,'single',()=>0)).toMatchObject({key:'single',usable:false});
  shooter.moves.forEach(key=>shooter.moveStamina[key]=0);
  expect(allMovesSpent(shooter)).toBe(true);
  const fallback=resolveTechnique(shooter,rider,'single',()=>0);
  expect(fallback).toMatchObject({key:'desperation',usable:true,hit:true});
  expect(fallback.events).toContainEqual(expect.objectContaining({type:'recoil'}));
});

test('speed controls turn order and trainer AI never selects a spent technique',()=>{
  const fast=mon('fieldflyer'),slow=mon('matreturner');
  expect(turnOrder(fast,slow,'scramble','ride')).toEqual(['player','enemy']);
  fast.moveStamina[fast.moves[0]]=0;
  const choice=chooseAiMove(fast,slow);
  expect(choice).not.toBe(fast.moves[0]);
  fast.moves.forEach(key=>fast.moveStamina[key]=0);
  expect(chooseAiMove(fast,slow)).toBe('desperation');
});

test('battle stages, form proficiency, and priority create distinct turn decisions',()=>{
  const shooter=mon('buckshot'),rider=mon('matreturner');
  const shooterState=createBattleState(),riderState=createBattleState();
  const base=previewDamage(shooter,rider,'single',{attackerState:shooterState,defenderState:riderState});
  expect(proficiencyMultiplier('Shooter','Shooter')).toBe(1.5);
  expect(proficiencyMultiplier('Thrower','Shooter')).toBe(1);
  modifyBattleStage(shooterState,'technique',1);
  expect(previewDamage(shooter,rider,'single',{attackerState:shooterState,defenderState:riderState})).toBeGreaterThan(base);
  expect(turnOrder(rider,shooter,'throwby','single',{playerState:riderState,enemyState:shooterState})).toEqual(['player','enemy']);
});

test('technique effects support setup, multi-hit pressure, counters, and forced reset turns',()=>{
  const bull=setMoves(mon('pacesetter'),['pace','flurry','reattack','pin']),foe=mon('drillpartner');
  const bullState=createBattleState(),foeState=createBattleState();
  const setup=resolveTechnique(bull,foe,'pace',()=>.5,{attackerState:bullState,defenderState:foeState});
  expect(setup.events).toContainEqual(expect.objectContaining({type:'stage',target:'attacker',stat:'attack',delta:1}));
  expect(bullState.stages.attack).toBe(1);

  const flurry=resolveTechnique(bull,foe,'flurry',()=>.5,{attackerState:bullState,defenderState:foeState});
  expect(flurry.hits).toBe(3);
  expect(flurry.plannedHits).toBe(3);
  expect(flurry.hitResults).toHaveLength(3);
  expect(flurry.hitResults.reduce((sum,hit)=>sum+hit.damage,0)).toBe(flurry.damage);
  expect(flurry.hitResults[0].hpBefore).toBeGreaterThan(flurry.hitResults[0].hpAfter);
  for(let index=1;index<flurry.hitResults.length;index++)expect(flurry.hitResults[index].hpBefore).toBe(flurry.hitResults[index-1].hpAfter);
  expect(flurry.hitResults.at(-1).hpAfter).toBe(foe.hp);
  expect(flurry.events[0]).toMatchObject({type:'multiHit',hits:3});

  const wornFoe=mon('drillpartner');wornFoe.hp=1;
  const finishingFlurry=resolveTechnique(bull,wornFoe,'flurry',()=>.5,{attackerState:bullState,defenderState:createBattleState()});
  expect(finishingFlurry).toMatchObject({plannedHits:3,hits:1,damage:1});
  expect(finishingFlurry.hitResults).toEqual([expect.objectContaining({index:1,damage:1,hpBefore:1,hpAfter:0})]);
  expect(finishingFlurry.events[0]).toMatchObject({type:'multiHit',hits:1});

  bullState.damageTakenThisTurn=8;
  const counter=resolveTechnique(bull,foe,'reattack',()=>.5,{attackerState:bullState,defenderState:foeState});
  expect(counter.countered).toBe(true);
  expect(counter.events).toContainEqual(expect.objectContaining({type:'counter'}));

  const reset=resolveTechnique(bull,foe,'pin',()=>.5,{attackerState:bullState,defenderState:foeState});
  expect(reset.events).toContainEqual(expect.objectContaining({type:'recharge'}));
  expect(consumeActionBlock(bullState)).toBe('recharge');
  expect(consumeActionBlock(bullState)).toBeNull();
});

test('major wrestling conditions follow the FireRed turn, damage, and persistence formulas',()=>{
  expect(Object.keys(CONDITIONS)).toEqual(['gassed','strained','stunned','tiedUp']);
  const attacker=setMoves(mon('pacesetter',30),['double','single']),defender=mon('drillpartner',30);
  const attackerState=createBattleState(),defenderState=createBattleState();
  const baseSpeed=effectiveBattleStat(attacker,'speed',attackerState);
  expect(inflictCondition(attacker,'stunned',()=>0)).toMatchObject({applied:true,condition:{key:'stunned'}});
  expect(effectiveBattleStat(attacker,'speed',attackerState)).toBe(baseSpeed*.25);
  expect(consumeConditionAction(attacker,()=>0)).toMatchObject({blocked:true,key:'stunned'});
  expect(consumeConditionAction(attacker,()=>.99)).toMatchObject({blocked:false,key:'stunned'});
  clearCondition(attacker);

  const strengthDamage=previewDamage(attacker,defender,'double',{attackerState,defenderState});
  const techniqueDamage=previewDamage(attacker,defender,'single',{attackerState,defenderState});
  inflictCondition(attacker,'strained',()=>0);
  expect(previewDamage(attacker,defender,'double',{attackerState,defenderState})).toBeLessThan(strengthDamage);
  expect(previewDamage(attacker,defender,'single',{attackerState,defenderState})).toBe(techniqueDamage);
  const existing=inflictCondition(attacker,'gassed',()=>0);
  expect(existing).toMatchObject({applied:false,reason:'occupied',condition:{key:'strained'}});

  clearCondition(attacker);inflictCondition(attacker,'gassed',()=>0);attacker.hp=40;
  expect(resolveConditionResidual(attacker,80)).toMatchObject({key:'gassed',damage:10,hpBefore:40,hpAfter:30});
  clearCondition(attacker);inflictCondition(attacker,'tiedUp',()=>0);
  expect(attacker.condition).toEqual({key:'tiedUp',turns:2});
  expect(consumeConditionAction(attacker,()=>.5)).toMatchObject({blocked:true,turns:1});
  expect(consumeConditionAction(attacker,()=>.5)).toMatchObject({blocked:false,cleared:true});
  expect(attacker.condition).toBeUndefined();
});

test('condition techniques, trainer AI, items, and full recovery share one ruleset',()=>{
  const styles=new Map();
  for(const [key,move] of Object.entries(MOVES))if(move.inflictCondition||move.cureCondition)styles.set(move.style,(styles.get(move.style)||[]).concat(key));
  for(const style of ['Shooter','Rider','Scrambler','Bull','Wall','Thrower'])expect(styles.get(style)?.length).toBeGreaterThanOrEqual(1);

  const bull=setMoves(mon('pacesetter',20),['handfight','stall']),foe=mon('drillpartner',20);
  const bullState=createBattleState(),foeState=createBattleState();
  expect(chooseAiMove(bull,foe,{rng:()=>.99,attackerState:bullState,defenderState:foeState})).toBe('handfight');
  const pressure=resolveTechnique(bull,foe,'handfight',()=>0,{attackerState:bullState,defenderState:foeState});
  expect(pressure.events).toContainEqual(expect.objectContaining({type:'conditionInflicted',key:'gassed'}));
  expect(foe.condition).toEqual({key:'gassed'});
  expect(chooseAiMove(bull,foe,{rng:()=>.99,attackerState:bullState,defenderState:foeState})).toBe('stall');
  const repeat=resolveTechnique(bull,foe,'handfight',()=>0,{attackerState:bullState,defenderState:foeState});
  expect(repeat.events).toContainEqual(expect.objectContaining({type:'conditionBlocked',existing:'gassed'}));

  const scrambler=setMoves(mon('fieldflyer',20),['shakeout']);inflictCondition(scrambler,'strained',()=>0);
  const reset=resolveTechnique(scrambler,foe,'shakeout',()=>0,{attackerState:createBattleState(),defenderState:foeState});
  expect(reset.events).toContainEqual(expect.objectContaining({type:'conditionCured',key:'strained'}));
  expect(scrambler.condition).toBeUndefined();

  clearCondition(foe);inflictCondition(foe,'stunned',()=>0);const state={items:{trainerKit:1}};
  expect(useRecoveryItem(state,foe,'trainerKit')).toMatchObject({used:true,cleared:'stunned'});
  expect(state.items.trainerKit).toBe(0);expect(foe.condition).toBeUndefined();
  inflictCondition(foe,'gassed',()=>0);restoreWrestler(foe);expect(foe.condition).toBeUndefined();
});

test('misses expose no phantom hits and criticals belong to their individual hit records',()=>{
  const rider=setMoves(mon('matreturner',10),['tilt']),anchor=mon('topboss',50);
  const miss=resolveTechnique(rider,anchor,'tilt',()=>1);
  expect(miss).toMatchObject({hit:false,hits:0,plannedHits:0,criticalHits:0,hitResults:[]});

  const criticalSeries=resolveTechnique(rider,anchor,'tilt',()=>0);
  expect(criticalSeries).toMatchObject({hit:true,plannedHits:2,hits:2,critical:true,criticalHits:2});
  expect(criticalSeries.hitResults).toHaveLength(2);
  expect(criticalSeries.hitResults.every(hit=>hit.critical&&hit.rawDamage>=hit.damage)).toBe(true);
});

test('position-breaking and ride techniques deny actions and drain the last-used technique',()=>{
  const attacker=setMoves(mon('pacesetter'),['double','grind']),defender=mon('drillpartner');
  const attackerState=createBattleState(),defenderState=createBattleState();
  resolveTechnique(attacker,defender,'double',()=>.1,{attackerState,defenderState});
  expect(consumeActionBlock(defenderState)).toBe('flinch');
  defenderState.lastMove='single';const before=currentMoveStamina(defender,'single');
  const ride=resolveTechnique(attacker,defender,'grind',()=>.5,{attackerState,defenderState});
  expect(currentMoveStamina(defender,'single')).toBe(before-3);
  expect(ride.events).toContainEqual(expect.objectContaining({type:'staminaDrain',amount:3,moveKey:'single'}));
});

test('strength and technical techniques use separate offensive stats',()=>{
  const strength=mon('buckshot',40),technical=mon('buckshot',40),defender=mon('matreturner',40);
  strength.effort.attack=252;technical.effort.technique=252;
  expect(previewDamage(strength,defender,'double')).toBeGreaterThan(previewDamage(technical,defender,'double'));
  expect(previewDamage(technical,defender,'single')).toBeGreaterThan(previewDamage(strength,defender,'single'));
});

test('Singlet tiers, worn Condition, and Film Study change recruiting odds',()=>{
  const fresh=mon('drillpartner',8),worn={...fresh,hp:1};
  const practiceFresh=recruitOdds(fresh,'practiceSinglet');
  const practiceWorn=recruitOdds(worn,'practiceSinglet');
  expect(practiceWorn).toBeGreaterThan(practiceFresh);
  expect(recruitOdds(worn,'travelSinglet')).toBeGreaterThan(practiceWorn);
  expect(recruitOdds(fresh,'practiceSinglet',{filmActive:true})).toBeGreaterThan(practiceFresh);
  expect(recruitOdds(fresh,'starterSinglet')).toBe(1);
  expect(recruitOdds(mon('senator',20),'starterSinglet')).toBe(0);
});

test('successful recruits fill the travel lineup and then the team locker',()=>{
  const state=defaultState();state.flags.recruitingUnlocked=true;state.items.starterSinglet=2;
  state.party=[mon('buckshot')];state.dex.seen.drillpartner=true;
  const first=attemptRecruit(state,mon('drillpartner',7),'starterSinglet',()=>.99);
  expect(first).toMatchObject({success:true,destination:'party'});
  while(state.party.length<6)state.party.push(mon('pacesetter'));
  const second=attemptRecruit(state,mon('lakechain',9),'starterSinglet',()=>.99);
  expect(second).toMatchObject({success:true,destination:'box'});
  expect(state.box).toHaveLength(1);
});

test('team locker enforces a six-wrestler lineup and never permits an empty party',()=>{
  const state=defaultState();state.party=[mon('buckshot')];state.box=[mon('drillpartner')];
  expect(depositWrestler(state,0)).toMatchObject({ok:false,reason:'last'});
  expect(withdrawWrestler(state,0).ok).toBe(true);
  expect(depositWrestler(state,1).ok).toBe(true);
  while(state.party.length<6)state.party.push(mon('pacesetter'));
  state.box.push(mon('lakechain'));
  expect(withdrawWrestler(state,state.box.length-1)).toMatchObject({ok:false,reason:'full'});
  expect(swapLockerWrestler(state,0,state.box.length-1).ok).toBe(true);
  expect(state.party).toHaveLength(6);
});

test('development, key items, town unlocks, and season gates persist as data mechanics',()=>{
  const wrestler=mon('buckshot',9);wrestler.xp=0;
  const messages=addXp(wrestler,200);
  expect(wrestler.id).toBe('buckvarsity');
  expect(messages.some(message=>message.includes('developed'))).toBe(true);
  const state=defaultState();
  expect(canFastTravel(state)).toBe(false);
  grantKeyItem(state,'busPass');unlockTown(state,'fieldHouse');
  expect(canFastTravel(state)).toBe(true);
  expect(state.travel.unlockedTowns).toContain('fieldHouse');
  registerTravelDestination(state,{id:'capitol',name:'Capitol Square',area:'downtown',pos:{x:8,y:7}});
  expect(travelTo(state,'capitol')).toBe(true);
  expect(state).toMatchObject({area:'downtown',pos:{x:8,y:7}});
  expect(missingSeasonBadges(state)).toEqual(SEASON_ONE_BADGES);
  state.badges=[...SEASON_ONE_BADGES];
  expect(canFlyToNationals(state)).toBe(true);
});

test('level gains increase Condition maximums without healing damage or technique Stamina',()=>{
  const wrestler=mon('buckshot',8),before=scaledStats(wrestler.id,wrestler.lvl,wrestler);
  wrestler.hp=10;wrestler.moveStamina.single=12;
  addXp(wrestler,xpNeed(wrestler));
  const after=scaledStats(wrestler.id,wrestler.lvl,wrestler);
  expect(wrestler.hp).toBe(10+(after.hp-before.hp));
  expect(currentMoveStamina(wrestler,'single')).toBe(12);
  expect(wrestler.hp).toBeLessThan(after.hp);
  expect(currentMoveStamina(wrestler,'single')).toBeLessThan(MOVES.single.pp);
  expect(restoreTechniqueStamina(wrestler,10)).toBeGreaterThan(0);
});

test('legacy and canonical badge aliases count as one season win',()=>{
  const state={badges:['Neutral Badge','Field House Badge','Scramble Badge','Picnic Point Badge']};
  expect(earnedBadgeCount(state)).toBe(2);
  expect(missingSeasonBadges(state)).toEqual(['Capitol Badge','Kohl Badge']);
});

test('normalizing an empty item payload does not invent legacy quantities',()=>{
  expect(normalizeItems({})).toEqual({sportsDrink:0,athleticTape:0,trainerKit:0,filmStudy:0,practiceSinglet:0,travelSinglet:0,starterSinglet:0});
});

test('save migration moves lineup overflow into the locker without losing wrestlers',()=>{
  const party=Array.from({length:8},(_,index)=>({id:index%2?'drillpartner':'buckshot',lvl:6,hp:40,gas:40}));
  const state=normalizeState({party,box:[{id:'lakechain',lvl:8,hp:50,gas:50}]});
  expect(state.party).toHaveLength(6);
  expect(state.box).toHaveLength(3);
  expect([...state.party,...state.box]).toHaveLength(9);
});

test('save normalization preserves the selected lead as travel-lineup slot one',()=>{
  const selected={id:'drillpartner',lvl:7};
  const state=normalizeState({party:[{id:'buckshot',lvl:6},selected],active:1});
  expect(state.party[0].id).toBe('drillpartner');
  expect(state.party[0]).toBe(selected);
  expect(state.active).toBe(0);
});

test('Roster Book completion counts defeated wrestlers independently of recruits',()=>{
  const state=defaultState();state.dex.seen={buckshot:true,senator:true};state.dex.caught={buckshot:true};state.dex.defeated={buckshot:true,senator:true};
  expect(defeatedWrestlerCount(state)).toBe(2);
  expect(rosterBookComplete(state,2)).toBe(true);
});
