import {MOVES} from '../data/moves.js';
import {conditionFor} from '../data/conditions.js';
import {ROSTER,currentMoveStamina,scaledStats} from '../data/roster.js';
import {accuracyFor,chooseAiMove,createBattleState,previewDamage,totalMoveStamina,totalMoveStaminaMax} from './mechanics.js';

const TIERS=Object.freeze({
  wild:Object.freeze({tier:'wild',skill:0,mistakeChance:1,canSwitch:false,switchChance:0,switchMargin:99,maxSwitches:0,switchCooldown:99}),
  basic:Object.freeze({tier:'basic',skill:1,mistakeChance:.35,canSwitch:false,switchChance:0,switchMargin:99,maxSwitches:0,switchCooldown:99}),
  standard:Object.freeze({tier:'standard',skill:2,mistakeChance:.18,canSwitch:true,switchChance:.7,switchMargin:1.45,maxSwitches:1,switchCooldown:2}),
  advanced:Object.freeze({tier:'advanced',skill:3,mistakeChance:.06,canSwitch:true,switchChance:.9,switchMargin:1.2,maxSwitches:2,switchCooldown:2}),
  elite:Object.freeze({tier:'elite',skill:4,mistakeChance:0,canSwitch:true,switchChance:1,switchMargin:1.05,maxSwitches:3,switchCooldown:1})
});

export const TRAINER_AI_TIERS=TIERS;
const DEFAULT_TIER={wild:'wild',opening:'basic',spar:'basic',trainer:'standard',gym:'advanced',tournament:'elite'};

export function normalizeTrainerItems(items={}){
  const source=Array.isArray(items)?items.reduce((out,key)=>(out[key]=(out[key]||0)+1,out),{}):items||{};
  return Object.fromEntries(['athleticTape','trainerKit','sportsDrink'].map(key=>[key,Math.max(0,Math.trunc(Number(source[key])||0))]));
}

export function trainerAiProfile({battleType='wild',config=null}={}){
  const provided=typeof config==='string'?{tier:config}:{...(config||{})};
  const tier=TIERS[provided.tier]?provided.tier:(DEFAULT_TIER[battleType]||'standard');
  const base=TIERS[tier];
  return Object.freeze({...base,...provided,tier,items:normalizeTrainerItems(provided.items)});
}

function expectedDamage(attacker,defender,key,attackerState,defenderState){
  const move=MOVES[key];if(!move||move.power<=0||currentMoveStamina(attacker,key)<=0)return 0;
  return previewDamage(attacker,defender,key,{attackerState,defenderState})*accuracyFor(attacker,move,attackerState);
}

export function bestExpectedDamage(attacker,defender,{attackerState=null,defenderState=null}={}){
  const moves=(attacker?.moves||ROSTER[attacker?.id]?.moves||[]).filter(key=>MOVES[key]);
  if(!moves.length)return 0;
  return Math.max(0,...moves.map(key=>expectedDamage(attacker,defender,key,attackerState,defenderState)));
}

export function trainerMatchupScore(attacker,defender,{attackerState=null,defenderState=null}={}){
  const ownState=attackerState||createBattleState(),foeState=defenderState||createBattleState();
  const offense=bestExpectedDamage(attacker,defender,{attackerState:ownState,defenderState:foeState});
  const incoming=bestExpectedDamage(defender,attacker,{attackerState:foeState,defenderState:ownState});
  const maximum=scaledStats(attacker.id,attacker.lvl,attacker).hp,hpRatio=Math.max(0,attacker.hp)/Math.max(1,maximum);
  const condition=conditionFor(attacker.condition),conditionPenalty=condition?.sleepLike?16:condition?7:0;
  return offense-incoming*.42+hpRatio*10-conditionPenalty;
}

function positiveStageTotal(state){return Object.values(state?.stages||{}).reduce((sum,value)=>sum+Math.max(0,Number(value)||0),0);}

export function chooseTrainerSwitch({active,activeIndex=0,team=[],defender,profile,turn=1,switchCount=0,lastSwitchTurn=-99,attackerState=null,defenderState=null,rng=Math.random}={}){
  if(!profile?.canSwitch||switchCount>=profile.maxSwitches||turn-lastSwitchTurn<=profile.switchCooldown)return null;
  const candidates=team.map((mon,index)=>({mon,index})).filter(({mon,index})=>index!==activeIndex&&mon?.hp>0);
  if(!active||!defender||!candidates.length)return null;
  const maximum=scaledStats(active.id,active.lvl,active).hp,hpRatio=active.hp/Math.max(1,maximum);
  if(positiveStageTotal(attackerState)>=2&&hpRatio>.25)return null;
  const currentDamage=bestExpectedDamage(active,defender,{attackerState,defenderState});
  if(currentDamage>=defender.hp)return null;
  const currentScore=trainerMatchupScore(active,defender,{attackerState,defenderState});
  const ranked=candidates.map(({mon,index})=>({index,mon,score:trainerMatchupScore(mon,defender,{attackerState:createBattleState(),defenderState})})).sort((a,b)=>b.score-a.score);
  const best=ranked[0],improvement=best.score-currentScore,required=Math.max(6,Math.abs(currentScore)*(profile.switchMargin-1));
  const condition=conditionFor(active.condition),urgent=Boolean(condition?.sleepLike)||currentDamage<=1;
  if(!urgent&&improvement<required)return null;
  if(rng()>profile.switchChance)return null;
  return {targetIndex:best.index,reason:urgent?'condition':'matchup',currentScore,bestScore:best.score};
}

export function chooseTrainerItem({active,inventory={},profile}={}){
  if(!active||profile?.tier==='wild'||profile?.tier==='basic')return null;
  const items=normalizeTrainerItems(inventory),condition=conditionFor(active.condition),maximum=scaledStats(active.id,active.lvl,active).hp;
  if(condition&&items.trainerKit>0)return {itemKey:'trainerKit',reason:'condition'};
  const missing=Math.max(0,maximum-active.hp),ratio=active.hp/Math.max(1,maximum);
  if(items.athleticTape>0&&(ratio<.25||missing>=20))return {itemKey:'athleticTape',reason:ratio<.25?'critical-condition':'meaningful-heal'};
  const staminaMax=totalMoveStaminaMax(active),stamina=totalMoveStamina(active);
  if(items.sportsDrink>0&&staminaMax>0&&stamina/staminaMax<=.35)return {itemKey:'sportsDrink',reason:'low-stamina'};
  return null;
}

export function chooseTrainerAction({active,activeIndex=0,team=[],defender,profile,inventory={},turn=1,switchCount=0,lastSwitchTurn=-99,attackerState=null,defenderState=null,rng=Math.random,wild=false}={}){
  const normalized=profile||trainerAiProfile({battleType:wild?'wild':'trainer'});
  const switchChoice=chooseTrainerSwitch({active,activeIndex,team,defender,profile:normalized,turn,switchCount,lastSwitchTurn,attackerState,defenderState,rng});
  if(switchChoice)return {type:'switch',...switchChoice};
  const itemChoice=chooseTrainerItem({active,inventory,profile:normalized});
  if(itemChoice)return {type:'item',...itemChoice};
  return {type:'move',moveKey:chooseAiMove(active,defender,{wild:normalized.tier==='wild',rng,skill:normalized.skill,mistakeChance:normalized.mistakeChance,attackerState,defenderState})};
}
