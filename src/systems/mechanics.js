import {MOVES,ADV} from '../data/moves.js';
import {ROSTER,makeMon,scaledStats} from '../data/roster.js';

export const PARTY_LIMIT=6;
export const TRAINING_CAP=10;
export const TRAINING_KEYS=['conditioning','technique','strength','speed','awareness'];
export const STYLE_COLORS={Shooter:0xb41820,Rider:0x5f4cc8,Scrambler:0xe47c27,Bull:0x2e9c57,Wall:0x6d66c8,Thrower:0x3f8bb8};

export const ITEM_DEFS={
 sportsDrink:{name:'SPORTS DRINK',short:'DRINK',description:'Restores 24 Stamina.',price:6,kind:'recovery'},
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
  const lvl=clamp(Math.floor(Number(mon.lvl)||1),1,100);
  const training=Object.fromEntries(TRAINING_KEYS.map(key=>[key,clamp(Math.floor(Number(mon.training?.[key])||0),0,TRAINING_CAP)]));
  const normalized={...mon,id,lvl,xp:Math.max(0,Math.floor(Number(mon.xp)||0)),training,iv:clamp(Math.floor(Number(mon.iv)||0),-3,3)};
  const stats=scaledStats(id,lvl,normalized);
  normalized.hp=clamp(Number.isFinite(mon.hp)?mon.hp:stats.hp,0,stats.hp);
  normalized.stamina=clamp(Number.isFinite(mon.stamina)?mon.stamina:(Number.isFinite(mon.gas)?mon.gas:stats.stamina),0,stats.stamina);
  normalized.score=Math.max(0,Math.floor(Number(mon.score)||0));
  normalized.moves=(Array.isArray(mon.moves)?mon.moves:ROSTER[id].moves).filter(key=>MOVES[key]).slice(0,4);
  if(!normalized.moves.length)normalized.moves=[...(ROSTER[id].moves||['stall']).slice(0,4)];
  delete normalized.gas;
  if(mon&&typeof mon==='object'){Object.assign(mon,normalized);delete mon.gas;return mon;}
  return normalized;
}

export function restoreWrestler(mon){
  const stats=scaledStats(mon.id,mon.lvl,mon);
  mon.hp=stats.hp;mon.stamina=stats.stamina;mon.score=0;
  return mon;
}

export function restoreParty(state){(state.party||[]).forEach(restoreWrestler);return state.party;}

export function styleMultiplier(attackStyle,defenderStyle){
  const atk=canonicalStyle(attackStyle),def=canonicalStyle(defenderStyle);
  if((ADV[atk]||[]).includes(def))return 1.22;
  if((ADV[def]||[]).includes(atk))return .88;
  return 1;
}

export function accuracyFor(attacker,move){
  const stats=scaledStats(attacker.id,attacker.lvl,attacker);
  const technique=Math.min(.12,(attacker.training?.technique||0)*.015);
  const fatigue=attacker.stamina<Math.max(12,stats.stamina*.15)?.12:0;
  return clamp(move.acc+technique-fatigue,.35,.99);
}

export function previewDamage(attacker,defender,moveKey){
  const move=MOVES[moveKey]||MOVES.stall;
  const as=scaledStats(attacker.id,attacker.lvl,attacker),ds=scaledStats(defender.id,defender.lvl,defender);
  const mult=styleMultiplier(move.style,ROSTER[defender.id]?.style);
  return Math.max(3,Math.round((move.power+as.atk*.8-ds.def*.38)*mult*.95));
}

export function resolveTechnique(attacker,defender,moveKey,rng=Math.random){
  let key=moveKey,MOV=MOVES[key]||MOVES.stall;
  const as=scaledStats(attacker.id,attacker.lvl,attacker),ds=scaledStats(defender.id,defender.lvl,defender);
  if(MOV.stamina>0&&attacker.stamina<MOV.stamina){key='stall';MOV=MOVES.stall;}
  if(MOV.stamina>=0)attacker.stamina=clamp(attacker.stamina-MOV.stamina,0,as.stamina);
  else attacker.stamina=clamp(attacker.stamina+Math.abs(MOV.stamina),0,as.stamina);
  const accuracy=accuracyFor(attacker,MOV);
  if(rng()>accuracy)return {key,move:MOV,hit:false,damage:0,accuracy,multiplier:1,critical:false};
  const multiplier=styleMultiplier(MOV.style,ROSTER[defender.id]?.style);
  const critical=rng()<.0625;
  const variance=.9+rng()*.1;
  const damage=Math.max(3,Math.round((MOV.power+as.atk*.8-ds.def*.38)*multiplier*(critical?1.5:1)*variance));
  defender.hp=clamp(defender.hp-damage,0,ds.hp);
  attacker.score=(attacker.score||0)+MOV.points;
  return {key,move:MOV,hit:true,damage,accuracy,multiplier,critical};
}

export function chooseAiMove(attacker,defender,{wild=false,rng=Math.random}={}){
  const moves=(attacker.moves||ROSTER[attacker.id]?.moves||['stall']).filter(key=>MOVES[key]);
  const viable=moves.filter(key=>MOVES[key].stamina<=attacker.stamina);
  if(!viable.length)return 'stall';
  if(wild)return viable[Math.floor(rng()*viable.length)]||viable[0];
  const ranked=viable.map(key=>({key,value:previewDamage(attacker,defender,key)*accuracyFor(attacker,MOVES[key])+(MOVES[key].points||0)*1.5})).sort((a,b)=>b.value-a.value);
  if(ranked.length>1&&rng()<.22)return ranked[1].key;
  return ranked[0].key;
}

export function turnOrder(player,enemy,playerMove,enemyMove,rng=Math.random){
  const ps=scaledStats(player.id,player.lvl,player).spd,es=scaledStats(enemy.id,enemy.lvl,enemy).spd;
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
  const recruit=makeMon(target.id,target.lvl);
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
  mon.training=mon.training||Object.fromEntries(TRAINING_KEYS.map(k=>[k,0]));
  if((mon.training[key]||0)>=TRAINING_CAP)return {ok:false,reason:'cap'};
  const before=scaledStats(mon.id,mon.lvl,mon);
  mon.training[key]=(mon.training[key]||0)+1;
  const after=scaledStats(mon.id,mon.lvl,mon);
  mon.hp=Math.min(after.hp,mon.hp+Math.max(0,after.hp-before.hp));
  mon.stamina=Math.min(after.stamina,mon.stamina+Math.max(0,after.stamina-before.stamina));
  return {ok:true,before,after};
}
