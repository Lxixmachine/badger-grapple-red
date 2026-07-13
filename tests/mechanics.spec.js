import {expect,test} from '@playwright/test';
import {SEASON_ONE_BADGES} from '../src/data/campaign.js';
import {ADV,MOVES} from '../src/data/moves.js';
import {addXp,makeMon,scaledStats} from '../src/data/roster.js';
import {defaultState,defeatedWrestlerCount,normalizeState,rosterBookComplete} from '../src/systems/save.js';
import {
  attemptRecruit,
  chooseAiMove,
  depositWrestler,
  normalizeItems,
  practiceWrestler,
  recruitOdds,
  resolveTechnique,
  restoreWrestler,
  styleMultiplier,
  swapLockerWrestler,
  turnOrder,
  withdrawWrestler
} from '../src/systems/mechanics.js';
import {canFastTravel,canFlyToNationals,earnedBadgeCount,grantKeyItem,missingSeasonBadges,registerTravelDestination,travelTo,unlockTown} from '../src/systems/progression.js';

function mon(id,lvl=10){const result=makeMon(id,lvl);result.iv=0;result.training={conditioning:0,technique:0,strength:0,speed:0,awareness:0};return restoreWrestler(result);}

test('six-style chart preserves the starter triangle and two advantages per style',()=>{
  for(const strengths of Object.values(ADV))expect(strengths).toHaveLength(2);
  expect(styleMultiplier('Shooter','Rider')).toBeGreaterThan(1);
  expect(styleMultiplier('Rider','Scrambler')).toBeGreaterThan(1);
  expect(styleMultiplier('Scrambler','Shooter')).toBeGreaterThan(1);
  expect(styleMultiplier('Shooter','Wall')).toBeLessThan(1);
  expect(styleMultiplier('Shooter','Thrower')).toBe(1);
});

test('legacy saves migrate to Condition/Stamina and canonical inventory without duplication',()=>{
  const state=normalizeState({
    party:[{id:'buckshot',lvl:6,hp:50,gas:60,moves:['single']}],
    items:{invite:3,energy:2,tape:1,film:4},
    flags:{assignment:true}
  });
  expect(state.version).toBe('22.0');
  expect(state.party[0].gas).toBeUndefined();
  expect(state.party[0].stamina).toBe(60);
  expect(state.items).toMatchObject({practiceSinglet:3,sportsDrink:2,athleticTape:1,filmStudy:4,travelSinglet:0,starterSinglet:0});
  expect(state.flags).toMatchObject({recruitingUnlocked:true,lockerUnlocked:true,rosterBook:true});
});

test('training has bounded, concrete battle effects',()=>{
  const wrestler=mon('buckshot');
  const base=scaledStats(wrestler.id,wrestler.lvl,wrestler);
  expect(practiceWrestler(wrestler,'conditioning').ok).toBe(true);
  expect(practiceWrestler(wrestler,'strength').ok).toBe(true);
  expect(practiceWrestler(wrestler,'speed').ok).toBe(true);
  expect(practiceWrestler(wrestler,'awareness').ok).toBe(true);
  const trained=scaledStats(wrestler.id,wrestler.lvl,wrestler);
  expect(trained).toMatchObject({stamina:base.stamina+4,atk:base.atk+2,spd:base.spd+2,def:base.def+2});
  for(let i=0;i<10;i++)practiceWrestler(wrestler,'technique');
  expect(practiceWrestler(wrestler,'technique')).toMatchObject({ok:false,reason:'cap'});
});

test('techniques spend Stamina, honor style edges, and fall back when exhausted',()=>{
  const shooter=mon('buckshot'),rider=mon('matreturner');
  shooter.stamina=20;
  const hit=resolveTechnique(shooter,rider,'single',()=>0);
  expect(hit).toMatchObject({hit:true,key:'single',multiplier:1.22});
  expect(shooter.stamina).toBe(12);
  shooter.stamina=0;
  const fallback=resolveTechnique(shooter,rider,'blast',()=>0);
  expect(fallback.key).toBe('stall');
  expect(shooter.stamina).toBe(10);
  expect(MOVES[fallback.key].stamina).toBeLessThan(0);
});

test('speed controls turn order and trainer AI never selects an unaffordable move',()=>{
  const fast=mon('fieldflyer'),slow=mon('matreturner');
  expect(turnOrder(fast,slow,'scramble','ride')).toEqual(['player','enemy']);
  fast.stamina=5;
  const choice=chooseAiMove(fast,slow);
  expect(MOVES[choice].stamina).toBeLessThanOrEqual(5);
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

test('legacy and canonical badge aliases count as one season win',()=>{
  const state={badges:['Neutral Badge','Field House Badge','Scramble Badge','Picnic Point Badge']};
  expect(earnedBadgeCount(state)).toBe(2);
  expect(missingSeasonBadges(state)).toEqual(['Capitol Badge','Kohl Badge']);
});

test('normalizing an empty item payload does not invent legacy quantities',()=>{
  expect(normalizeItems({})).toEqual({sportsDrink:0,athleticTape:0,filmStudy:0,practiceSinglet:0,travelSinglet:0,starterSinglet:0});
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
