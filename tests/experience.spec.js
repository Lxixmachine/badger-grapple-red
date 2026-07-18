import {expect,test} from '@playwright/test';
import {ROSTER,addXp,applyPendingDevelopment,makeMon,resolvePendingMove,xpNeed} from '../src/data/roster.js';
import {
  EXPERIENCE_PROFILES,
  GROWTH_RATES,
  MAX_LEVEL,
  distributeDefeatExperience,
  experienceAtLevel,
  experienceProgress,
  growthExperience
} from '../src/data/experience.js';
import {LEARNSETS,movesForLevel} from '../src/data/learnsets.js';
import {MOVES} from '../src/data/moves.js';
import {normalizeWrestler} from '../src/systems/mechanics.js';

test('all wrestlers have explicit FireRed-style experience profiles',()=>{
  expect(Object.keys(EXPERIENCE_PROFILES).sort()).toEqual(Object.keys(ROSTER).sort());
  for(const wrestler of Object.values(ROSTER)){
    if(!wrestler.evolvesTo)continue;
    expect(EXPERIENCE_PROFILES[wrestler.evolvesTo].growthRate).toBe(EXPERIENCE_PROFILES[wrestler.id].growthRate);
  }
});

test('all wrestlers have ordered, valid level-up learnsets',()=>{
  expect(Object.keys(LEARNSETS).sort()).toEqual(Object.keys(ROSTER).sort());
  for(const entries of Object.values(LEARNSETS)){
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.map(entry=>entry.level)).toEqual([...entries].map(entry=>entry.level).sort((a,b)=>a-b));
    entries.forEach(entry=>expect(MOVES[entry.move]).toBeTruthy());
  }
});

test('creation grants only legal level-up moves and caps the set at the latest four',()=>{
  expect(makeMon('buckshot',6).moves).toEqual(['single','sprawl']);
  expect(makeMon('buckallam',31).moves).toEqual(['double','chainshot','blast','flurry']);
  expect(movesForLevel('matreturner',3)).toEqual(['claw']);
});

test('Gen III growth formulas reach their canonical level 100 totals',()=>{
  expect(growthExperience(100,GROWTH_RATES.MEDIUM_FAST)).toBe(1000000);
  expect(growthExperience(100,GROWTH_RATES.ERRATIC)).toBe(600000);
  expect(growthExperience(100,GROWTH_RATES.FLUCTUATING)).toBe(1640000);
  expect(growthExperience(100,GROWTH_RATES.MEDIUM_SLOW)).toBe(1059860);
  expect(growthExperience(100,GROWTH_RATES.FAST)).toBe(800000);
  expect(growthExperience(100,GROWTH_RATES.SLOW)).toBe(1250000);
});

test('wrestlers store cumulative experience and develop at exact thresholds',()=>{
  const wrestler=makeMon('buckshot',9);
  expect(wrestler.xp).toBe(experienceAtLevel('buckshot',9));
  expect(experienceProgress(wrestler)).toBe(0);
  const threshold=xpNeed(wrestler);
  addXp(wrestler,threshold-1);
  expect(wrestler).toMatchObject({id:'buckshot',lvl:9});
  expect(experienceProgress(wrestler)).toBeGreaterThan(.99);
  addXp(wrestler,1);
  expect(wrestler).toMatchObject({id:'buckvarsity',lvl:10,xp:experienceAtLevel('buckvarsity',10)});
  expect(experienceProgress(wrestler)).toBe(0);
});

test('level-up moves are learned in open slots and require a replacement at four moves',()=>{
  const wrestler=makeMon('buckvarsity',12);
  expect(wrestler.moves).toEqual(['single','sprawl','highc','ankle']);
  const messages=addXp(wrestler,xpNeed(wrestler));
  expect(wrestler).toMatchObject({lvl:13,pendingMoves:['reattack']});
  expect(messages.some(message=>message.includes('wants to learn Re-Attack'))).toBe(true);
  const result=resolvePendingMove(wrestler,'reattack',1);
  expect(result).toMatchObject({ok:true,learned:true,forgotten:'sprawl'});
  expect(wrestler.moves).toEqual(['single','reattack','highc','ankle']);
  expect(wrestler.pendingMoves).toEqual([]);
});

test('battle development waits until victory instead of changing mid-match stats',()=>{
  const wrestler=makeMon('buckshot',9),beforeId=wrestler.id;
  addXp(wrestler,xpNeed(wrestler),{deferDevelopment:true});
  expect(wrestler).toMatchObject({id:beforeId,lvl:10,pendingDevelopment:'buckvarsity'});
  const result=applyPendingDevelopment(wrestler);
  expect(result).toMatchObject({from:'buckshot',to:'buckvarsity'});
  expect(wrestler.id).toBe('buckvarsity');
  expect(wrestler.pendingDevelopment).toBeUndefined();
});

test('normalization establishes the cumulative floor for a wrestler level',()=>{
  const wrestler=normalizeWrestler({id:'drillpartner',lvl:12,xp:0,hp:1,stamina:1});
  expect(wrestler.xp).toBe(experienceAtLevel('drillpartner',12));
});

test('wild EXP uses base yield times level over seven and splits participants',()=>{
  const first=makeMon('buckshot',6),second=makeMon('matreturner',6),defeated=makeMon('pacesetter',7);
  const result=distributeDefeatExperience({defeated,party:[first,second],participants:[first,second]});
  expect(result.base).toBe(60);
  expect(result.awards.map(({mon,amount})=>[mon.id,amount])).toEqual([['buckshot',30],['matreturner',30]]);
});

test('organized matches apply FireRed trainer EXP after participant splitting',()=>{
  const first=makeMon('buckshot',6),second=makeMon('matreturner',6),defeated=makeMon('pacesetter',7);
  const result=distributeDefeatExperience({defeated,party:[first,second],participants:[first,second],trainerBattle:true});
  expect(result.awards.map(({amount})=>amount)).toEqual([45,45]);
});

test('EXP Share, Lucky Egg, traded boosts, fainting, and level cap follow Gen III order',()=>{
  const active=makeMon('buckshot',6),shared=makeMon('matreturner',6),fainted=makeMon('fieldflyer',6),capped=makeMon('drillpartner',MAX_LEVEL);
  shared.heldItem='expShare';fainted.hp=0;
  let result=distributeDefeatExperience({
    defeated:makeMon('pacesetter',7),
    party:[active,shared,fainted,capped],
    participants:[active,fainted,capped]
  });
  expect(result).toMatchObject({base:60,participantShare:15,expShareShare:30});
  expect(result.awards.map(({mon,amount})=>[mon.id,amount])).toEqual([['buckshot',15],['matreturner',30]]);

  active.heldItem='luckyEgg';active.traded=true;
  result=distributeDefeatExperience({defeated:makeMon('pacesetter',7),party:[active],participants:[active],trainerBattle:true});
  expect(result.awards[0].amount).toBe(202);
});

test('level 100 wrestlers cannot gain experience',()=>{
  const wrestler=makeMon('drillpartner',MAX_LEVEL),cap=wrestler.xp;
  expect(addXp(wrestler,999999)).toEqual([]);
  expect(wrestler).toMatchObject({lvl:MAX_LEVEL,xp:cap});
});
