import {MOVES,ADV,moveStaminaMax} from '../data/moves.js';
import {ROSTER,allMovesSpent,currentMoveStamina,normalizeWrestlerNickname,restoreMoveStamina,scaledStats,syncMoveStamina} from '../data/roster.js';
import {MAX_LEVEL,experienceAtLevel} from '../data/experience.js';
import {movesForLevel} from '../data/learnsets.js';
import {addEffort,effortTotal,MAX_EFFORT_PER_STAT,MAX_TOTAL_EFFORT,normalizeEffortValues,normalizeIndividualValues,normalizeNature,potentialFor,PRACTICE_EFFORT_GAIN,STAT_KEYS,wrestlerSeed} from '../data/stats.js';

export const PARTY_LIMIT=6;
export const TRAINING_CAP=MAX_EFFORT_PER_STAT;
export const TRAINING_KEYS=[...STAT_KEYS];
export const STYLE_COLORS={Shooter:0xb41820,Rider:0x5f4cc8,Scrambler:0xe47c27,Bull:0x2e9c57,Wall:0x6d66c8,Thrower:0x3f8bb8};

export const ITEM_DEFS={
 sportsDrink:{name:'SPORTS DRINK',short:'DRINK',description:'Restores 10 Stamina to every technique.',price:6,kind:'recovery'},
 athleticTape:{name:'ATHLETIC TAPE',short:'TAPE',description:'Restores 20 Condition.',price:9,kind:'recovery'},
 filmStudy:{name:'FILM STUDY',short:'FILM',description:'Improves the next three recruiting attempts.',price:12,kind:'scouting'},
 practiceSinglet:{name:'PRACTICE SINGLET',short:'PRACTICE',description:'A standard Wisconsin recruiting singlet.',price:18,kind:'singlet',modifier:1},
 travelSinglet:{name:'TRAVEL QUAD SINGLET',short:'TRAVEL',description:'A coveted travel-team singlet with better odds.',price:42,kind:'singlet',modifier:1.55},
 starterSinglet:{name:'STARTER SINGLET',short:'STARTER',description:'A rare starting-lineup singlet. Never refused.',price:null,kind:'singlet',modifier:255}
};

export const BAG_ORDER=['sportsDrink','athleticTape','filmStudy','practiceSinglet','travelSinglet','starterSinglet'];
export const SHOP_STOCK=BAG_ORDER.filter(key=>ITEM_DEFS[key].price!==null).map(key=>({key,...ITEM_DEFS[key]}));
export const SINGLET_KEYS=BAG_ORDER.filter(key=>ITEM_DEFS[key].kind==='singlet');

const LEGACY_STYLES={Neutral:'Shooter',Top:'Rider',Scramble:'Scrambler',Pace:'Bull',Upperbody:'Thrower',Defense:'Wall'};
const LEGACY_ITEMS={energy:'sportsDrink',tape:'athleticTape',film:'filmStudy',invite:'practiceSinglet'};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export const BATTLE_STAGE_KEYS=['attack','defense','technique','awareness','speed','accuracy'];
export const BATTLE_STAGE_LIMIT=6;

export function createBattleState(){
  return {
    stages:Object.fromEntries(BATTLE_STAGE_KEYS.map(key=>[key,0])),
    flinched:false,
    recharging:false,
    damageTakenThisTurn:0,
    lastMove:null
  };
}

function battleState(state){
  if(!state)return createBattleState();
  state.stages=state.stages||{};
  BATTLE_STAGE_KEYS.forEach(key=>state.stages[key]=clamp(Math.trunc(Number(state.stages[key])||0),-BATTLE_STAGE_LIMIT,BATTLE_STAGE_LIMIT));
  state.flinched=!!state.flinched;
  state.recharging=!!state.recharging;
  state.damageTakenThisTurn=Math.max(0,Number(state.damageTakenThisTurn)||0);
  return state;
}

export function stageMultiplier(stage=0){
  const value=clamp(Math.trunc(stage),-BATTLE_STAGE_LIMIT,BATTLE_STAGE_LIMIT);
  return value>=0?(2+value)/2:2/(2-value);
}

export function accuracyStageMultiplier(stage=0){
  const value=clamp(Math.trunc(stage),-BATTLE_STAGE_LIMIT,BATTLE_STAGE_LIMIT);
  return value>=0?(3+value)/3:3/(3-value);
}

export function modifyBattleStage(state,stat,delta){
  const normalized=battleState(state);
  if(!BATTLE_STAGE_KEYS.includes(stat)||!Number.isFinite(delta))return {changed:false,stat,delta:0,before:0,after:0};
  const before=normalized.stages[stat],after=clamp(before+Math.trunc(delta),-BATTLE_STAGE_LIMIT,BATTLE_STAGE_LIMIT);
  normalized.stages[stat]=after;
  return {changed:before!==after,stat,delta:after-before,before,after};
}

export function consumeActionBlock(state){
  const normalized=battleState(state);
  if(normalized.recharging){normalized.recharging=false;return 'recharge';}
  if(normalized.flinched){normalized.flinched=false;return 'flinch';}
  return null;
}

export function clearTurnFlags(...states){
  states.filter(Boolean).forEach(state=>{const normalized=battleState(state);normalized.flinched=false;normalized.damageTakenThisTurn=0;});
}

export function canonicalStyle(style){return LEGACY_STYLES[style]||style||'Shooter';}

export function normalizeItems(items={}){
  const out=Object.fromEntries(BAG_ORDER.map(key=>[key,0]));
  for(const [key,value] of Object.entries(items||{})){
    const canonical=LEGACY_ITEMS[key]||key;
    if(canonical in out)out[canonical]+=Math.max(0,Math.floor(Number(value)||0));
  }
  return out;
}

export function normalizeWrestler(mon={}){
  const id=ROSTER[mon.id]?mon.id:'buckshot';
  const lvl=clamp(Math.floor(Number(mon.lvl)||1),1,MAX_LEVEL);
  const levelFloor=experienceAtLevel(id,lvl),levelCap=experienceAtLevel(id,MAX_LEVEL);
  const seed=wrestlerSeed({...mon,id,lvl});
  const normalized={...mon,id,lvl,xp:clamp(Math.floor(Number(mon.xp)||levelFloor),levelFloor,levelCap),ivs:normalizeIndividualValues(mon.ivs,mon.iv,seed),effort:normalizeEffortValues(mon.effort,mon.training),nature:normalizeNature(mon.nature,seed)};
  normalized.nickname=normalizeWrestlerNickname(mon.nickname);
  if(!normalized.nickname)delete normalized.nickname;
  normalized.potential=potentialFor(normalized.ivs);
  normalized.moves=(Array.isArray(mon.moves)?mon.moves:movesForLevel(id,lvl)).filter(key=>MOVES[key]&&key!=='desperation').slice(0,4);
  if(!normalized.moves.length)normalized.moves=movesForLevel(id,lvl).slice(0,4);
  if(!normalized.moves.length)normalized.moves=[...(ROSTER[id].moves||['stall']).slice(0,1)];
  syncMoveStamina(normalized);
  const stats=scaledStats(id,lvl,normalized);
  normalized.hp=clamp(Number.isFinite(mon.hp)?mon.hp:stats.hp,0,stats.hp);
  normalized.score=Math.max(0,Math.floor(Number(mon.score)||0));
  normalized.pendingMoves=(Array.isArray(mon.pendingMoves)?mon.pendingMoves:[]).filter(key=>MOVES[key]&&!normalized.moves.includes(key));
  normalized.pendingDevelopment=ROSTER[id].evolvesTo===mon.pendingDevelopment?mon.pendingDevelopment:null;
  if(!normalized.pendingDevelopment)delete normalized.pendingDevelopment;
  delete normalized.gas;delete normalized.stamina;delete normalized.iv;delete normalized.training;
  if(mon&&typeof mon==='object'){Object.assign(mon,normalized);delete mon.gas;delete mon.stamina;delete mon.iv;delete mon.training;return mon;}
  return normalized;
}

export function restoreWrestler(mon){
  const stats=scaledStats(mon.id,mon.lvl,mon);
  mon.hp=stats.hp;restoreMoveStamina(mon);mon.score=0;
  return mon;
}

export function restoreParty(state){(state.party||[]).forEach(restoreWrestler);return state.party;}

export function totalMoveStamina(mon){syncMoveStamina(mon);return (mon.moves||[]).reduce((sum,key)=>sum+currentMoveStamina(mon,key),0);}
export function totalMoveStaminaMax(mon){return (mon.moves||[]).reduce((sum,key)=>sum+moveStaminaMax(key),0);}
export function restoreTechniqueStamina(mon,amount=10){
  syncMoveStamina(mon);let restored=0;
  for(const key of mon.moves||[]){const before=currentMoveStamina(mon,key),after=Math.min(moveStaminaMax(key),before+Math.max(0,Math.trunc(amount)));mon.moveStamina[key]=after;restored+=after-before;}
  return restored;
}

export function styleMultiplier(attackStyle,defenderStyle){
  const atk=canonicalStyle(attackStyle),def=canonicalStyle(defenderStyle);
  if((ADV[atk]||[]).includes(def))return 2;
  if((ADV[def]||[]).includes(atk))return .5;
  return 1;
}

export function proficiencyMultiplier(moveStyle,wrestlerStyle){
  return canonicalStyle(moveStyle)===canonicalStyle(wrestlerStyle)?1.5:1;
}

export function effectiveBattleStat(mon,stat,state){
  const stats=scaledStats(mon.id,mon.lvl,mon);
  const raw=stats[stat]||0;
  if(!BATTLE_STAGE_KEYS.includes(stat)||stat==='accuracy')return raw;
  return raw*stageMultiplier(battleState(state).stages[stat]);
}

export function accuracyFor(attacker,move,attackerState=null){
  const staged=move.acc*accuracyStageMultiplier(battleState(attackerState).stages.accuracy);
  return clamp(staged,.01,1);
}

function expectedHitCount(move){return move.hits?(move.hits.min+move.hits.max)/2:1;}
function damageStatKeys(move){return move.category==='technique'?['technique','awareness']:['attack','defense'];}
export function baseTechniqueDamage(level,power,attack,defense){
  const levelFactor=Math.floor((2*Math.max(1,Math.trunc(level)))/5)+2;
  return Math.floor(Math.floor(levelFactor*Math.max(1,power)*Math.max(1,attack)/Math.max(1,defense))/50)+2;
}

export function previewDamage(attacker,defender,moveKey,{attackerState=null,defenderState=null,assumeCounter=false}={}){
  const move=MOVES[moveKey]||MOVES.stall;
  if(move.power<=0)return 0;
  const [attackKey,defenseKey]=damageStatKeys(move);
  const atk=effectiveBattleStat(attacker,attackKey,attackerState),def=effectiveBattleStat(defender,defenseKey,defenderState);
  const matchup=styleMultiplier(move.style,ROSTER[defender.id]?.style);
  const proficiency=proficiencyMultiplier(move.style,ROSTER[attacker.id]?.style);
  const countered=move.counterMultiplier&&(assumeCounter||battleState(attackerState).damageTakenThisTurn>0);
  const powerScale=expectedHitCount(move)*(countered?move.counterMultiplier:1);
  return Math.max(1,Math.floor(baseTechniqueDamage(attacker.lvl,move.power,atk,def)*matchup*proficiency*.925*powerScale));
}

export function resolveTechnique(attacker,defender,moveKey,rng=Math.random,context={}){
  if(typeof rng!=='function'){context=rng||{};rng=Math.random;}
  let key=MOVES[moveKey]?moveKey:'stall',MOV=MOVES[key];
  const attackerState=battleState(context.attackerState),defenderState=battleState(context.defenderState);
  const as=scaledStats(attacker.id,attacker.lvl,attacker),ds=scaledStats(defender.id,defender.lvl,defender);
  if(key!=='desperation'&&currentMoveStamina(attacker,key)<=0){
    if(allMovesSpent(attacker)){key='desperation';MOV=MOVES.desperation;}
    else return {key,move:MOV,usable:false,hit:false,damage:0,accuracy:accuracyFor(attacker,MOV,attackerState),multiplier:1,proficiency:1,critical:false,criticalHits:0,hits:0,countered:false,events:[]};
  }
  if(key!=='desperation'){
    const remaining=currentMoveStamina(attacker,key);attacker.moveStamina[key]=Math.max(0,remaining-1);attackerState.lastMove=key;
  }
  const accuracy=accuracyFor(attacker,MOV,attackerState);
  if(rng()>accuracy)return {key,move:MOV,usable:true,hit:false,damage:0,accuracy,multiplier:1,proficiency:1,critical:false,criticalHits:0,hits:0,countered:false,events:[]};
  const multiplier=styleMultiplier(MOV.style,ROSTER[defender.id]?.style);
  const proficiency=proficiencyMultiplier(MOV.style,ROSTER[attacker.id]?.style);
  const hits=MOV.power>0&&MOV.hits?MOV.hits.min+Math.floor(rng()*(MOV.hits.max-MOV.hits.min+1)):1;
  const countered=!!(MOV.counterMultiplier&&attackerState.damageTakenThisTurn>0);
  const [attackKey,defenseKey]=damageStatKeys(MOV);
  let damage=0,criticalHits=0;
  for(let i=0;i<(MOV.power>0?hits:0);i++){
    const critical=rng()<(MOV.criticalRate??.0625);
    if(critical)criticalHits++;
    const atkStage=critical?Math.max(0,attackerState.stages[attackKey]):attackerState.stages[attackKey];
    const defStage=critical?Math.min(0,defenderState.stages[defenseKey]):defenderState.stages[defenseKey];
    const atk=as[attackKey]*stageMultiplier(atkStage),def=ds[defenseKey]*stageMultiplier(defStage);
    const variance=.85+rng()*.15;
    const counterScale=countered?MOV.counterMultiplier:1;
    damage+=Math.max(1,Math.floor(baseTechniqueDamage(attacker.lvl,MOV.power,atk,def)*multiplier*proficiency*(critical?2:1)*variance*counterScale));
  }
  if(damage>0){defender.hp=clamp(defender.hp-damage,0,ds.hp);defenderState.damageTakenThisTurn+=damage;}
  attacker.score=(attacker.score||0)+MOV.points;
  const events=[];
  const applyStage=(target,targetName,spec)=>{
    if(!spec||rng()>(spec.chance??1))return;
    const change=modifyBattleStage(target,spec.stat,spec.delta);
    if(change.changed)events.push({type:'stage',target:targetName,...change});
    else events.push({type:'stageLimit',target:targetName,stat:spec.stat,attempted:spec.delta});
  };
  applyStage(attackerState,'attacker',MOV.selfStage);
  if(defender.hp>0)applyStage(defenderState,'defender',MOV.targetStage);
  if(MOV.staminaDrain&&defender.hp>0){
    syncMoveStamina(defender);
    const targetKey=(defenderState.lastMove&&currentMoveStamina(defender,defenderState.lastMove)>0?defenderState.lastMove:null)||(defender.moves||[]).find(move=>currentMoveStamina(defender,move)>0);
    if(targetKey){const before=currentMoveStamina(defender,targetKey),amount=Math.min(before,MOV.staminaDrain);defender.moveStamina[targetKey]=before-amount;if(amount>0)events.push({type:'staminaDrain',target:'defender',amount,moveKey:targetKey,moveName:MOVES[targetKey].name});}
  }
  if(MOV.flinchChance&&defender.hp>0&&rng()<MOV.flinchChance){defenderState.flinched=true;events.push({type:'flinch',target:'defender'});}
  if(MOV.recharge){attackerState.recharging=true;events.push({type:'recharge',target:'attacker'});}
  if(MOV.recoil&&damage>0){const recoil=Math.max(1,Math.floor(damage*MOV.recoil));attacker.hp=clamp(attacker.hp-recoil,0,as.hp);events.push({type:'recoil',target:'attacker',amount:recoil});}
  if(hits>1)events.unshift({type:'multiHit',target:'defender',hits});
  if(countered)events.unshift({type:'counter',target:'attacker'});
  return {key,move:MOV,usable:true,hit:true,damage,accuracy,multiplier,proficiency,critical:criticalHits>0,criticalHits,hits,countered,events};
}

function stageEffectValue(spec,state,targetWeight=1){
  if(!spec)return 0;
  const current=battleState(state).stages[spec.stat]||0;
  const useful=spec.delta>0?BATTLE_STAGE_LIMIT-current:BATTLE_STAGE_LIMIT+current;
  if(useful<=0)return 0;
  const statWeight={attack:7,defense:6,speed:4,accuracy:5}[spec.stat]||4;
  return statWeight*Math.abs(spec.delta)*(spec.chance??1)*targetWeight;
}

export function chooseAiMove(attacker,defender,{wild=false,rng=Math.random,attackerState=null,defenderState=null}={}){
  const moves=(attacker.moves||ROSTER[attacker.id]?.moves||['stall']).filter(key=>MOVES[key]);
  const viable=moves.filter(key=>currentMoveStamina(attacker,key)>0);
  if(!viable.length)return 'desperation';
  if(wild)return viable[Math.floor(rng()*viable.length)]||viable[0];
  const attackerSpeed=effectiveBattleStat(attacker,'speed',attackerState),defenderSpeed=effectiveBattleStat(defender,'speed',defenderState);
  const ranked=viable.map(key=>{
    const move=MOVES[key],assumeCounter=!!move.counterMultiplier&&attackerSpeed<=defenderSpeed;
    const damage=previewDamage(attacker,defender,key,{attackerState,defenderState,assumeCounter});
    const accuracy=accuracyFor(attacker,move,attackerState);
    const setupWindow=defender.hp>damage?1:.25;
    let value=damage*accuracy+(move.points||0)*1.5;
    const effectWeight=move.power<=0?3.25:1;
    value+=stageEffectValue(move.selfStage,attackerState)*setupWindow*effectWeight;
    value+=stageEffectValue(move.targetStage,defenderState)*setupWindow*effectWeight;
    value+=(move.staminaDrain||0)*2.6+(move.flinchChance||0)*(attackerSpeed>=defenderSpeed?10:2);
    value+=(move.priority||0)>0&&damage>=defender.hp?12:0;
    if(move.recharge)value-=damage*.28;
    return {key,value};
  }).sort((a,b)=>b.value-a.value);
  if(ranked.length>1&&rng()<.22)return ranked[1].key;
  return ranked[0].key;
}

export function turnOrder(player,enemy,playerMove,enemyMove,rng=Math.random,context={}){
  if(typeof rng!=='function'){context=rng||{};rng=Math.random;}
  const playerPriority=MOVES[playerMove]?.priority||0,enemyPriority=MOVES[enemyMove]?.priority||0;
  if(playerPriority!==enemyPriority)return playerPriority>enemyPriority?['player','enemy']:['enemy','player'];
  const ps=effectiveBattleStat(player,'speed',context.playerState),es=effectiveBattleStat(enemy,'speed',context.enemyState);
  if(ps===es)return rng()<.5?['player','enemy']:['enemy','player'];
  return ps>es?['player','enemy']:['enemy','player'];
}

export function recruitOdds(target,singletKey,{filmActive=false,seen=false}={}){
  const rec=ROSTER[target.id]||ROSTER.buckshot;
  if(rec.rarity==='Elite')return 0;
  if(singletKey==='starterSinglet')return 1;
  const base={Common:.48,Uncommon:.34,Rare:.2}[rec.rarity]??.3;
  const stats=scaledStats(target.id,target.lvl,target);
  const worn=1-clamp(target.hp/stats.hp,0,1);
  const modifier=ITEM_DEFS[singletKey]?.modifier||1;
  return clamp((base+worn*.34+(filmActive?.08:0)+(seen?.03:0))*modifier,.04,.95);
}

export function attemptRecruit(state,target,singletKey,rng=Math.random){
  const item=ITEM_DEFS[singletKey];
  if(!item||item.kind!=='singlet')return {success:false,reason:'invalid'};
  if((state.items?.[singletKey]||0)<=0)return {success:false,reason:'empty'};
  if(ROSTER[target.id]?.rarity==='Elite')return {success:false,reason:'elite',odds:0};
  state.items[singletKey]--;
  const filmActive=(state.effects?.filmStudyAttempts||0)>0;
  const odds=recruitOdds(target,singletKey,{filmActive,seen:!!state.dex?.seen?.[target.id]});
  if(filmActive)state.effects.filmStudyAttempts--;
  const success=rng()<odds;
  if(!success)return {success:false,reason:'refused',odds};
  const recruit=normalizeWrestler({...target,ivs:{...(target.ivs||{})},effort:{...(target.effort||{})},moves:[...(target.moves||[])],moveStamina:{...(target.moveStamina||{})},pendingMoves:[]});
  recruit.hp=clamp(target.hp,1,scaledStats(recruit.id,recruit.lvl,recruit).hp);
  state.dex.caught[recruit.id]=true;
  const destination=(state.party||[]).length<PARTY_LIMIT?'party':'box';
  state[destination].push(recruit);
  state.stats.recruits=(state.stats.recruits||0)+1;
  return {success:true,odds,recruit,destination};
}

export function useFilmStudy(state){
  if((state.items?.filmStudy||0)<=0)return false;
  state.items.filmStudy--;state.effects=state.effects||{};state.effects.filmStudyAttempts=3;
  return true;
}

export function depositWrestler(state,partyIndex){
  if((state.party||[]).length<=1)return {ok:false,reason:'last'};
  if(!state.party[partyIndex])return {ok:false,reason:'missing'};
  const [mon]=state.party.splice(partyIndex,1);state.box=state.box||[];state.box.push(mon);state.active=0;
  return {ok:true,mon};
}

export function withdrawWrestler(state,boxIndex){
  if((state.party||[]).length>=PARTY_LIMIT)return {ok:false,reason:'full'};
  if(!state.box?.[boxIndex])return {ok:false,reason:'missing'};
  const [mon]=state.box.splice(boxIndex,1);state.party.push(mon);
  return {ok:true,mon};
}

export function swapLockerWrestler(state,partyIndex,boxIndex){
  if(!state.party?.[partyIndex]||!state.box?.[boxIndex])return {ok:false,reason:'missing'};
  [state.party[partyIndex],state.box[boxIndex]]=[state.box[boxIndex],state.party[partyIndex]];state.active=0;
  return {ok:true};
}

export function practiceWrestler(mon,key){
  if(!TRAINING_KEYS.includes(key))return {ok:false,reason:'invalid'};
  const before=scaledStats(mon.id,mon.lvl,mon);
  const gain=addEffort(mon,key,PRACTICE_EFFORT_GAIN);
  if(!gain)return {ok:false,reason:effortTotal(mon.effort)>=MAX_TOTAL_EFFORT?'totalCap':'cap'};
  const after=scaledStats(mon.id,mon.lvl,mon);
  mon.hp=Math.min(after.hp,mon.hp+Math.max(0,after.hp-before.hp));
  return {ok:true,before,after,gain};
}

export function effortYieldFor(defeated){
  const record=ROSTER[defeated?.id]||ROSTER.buckshot;
  if(record.effortYield)return {...record.effortYield};
  const stat=STAT_KEYS.reduce((best,key)=>record.stats[key]>record.stats[best]?key:best,'hp');
  const amount={Common:1,Uncommon:2,Rare:2,Elite:3}[record.rarity]||1;
  return {stat,amount};
}

export function awardEffortForDefeat(mon,defeated){
  const yieldValue=effortYieldFor(defeated);
  return {...yieldValue,gained:addEffort(mon,yieldValue.stat,yieldValue.amount)};
}
