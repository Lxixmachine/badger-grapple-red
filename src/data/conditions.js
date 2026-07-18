const clampTurns=value=>Math.max(1,Math.min(5,Math.trunc(Number(value)||1)));

export const CONDITIONS=Object.freeze({
  gassed:Object.freeze({
    key:'gassed',name:'Gassed',short:'GAS',color:0x8a6a42,
    residualFraction:1/8,
    inflicted:name=>`${name} is gassed!`,
    residual:name=>`${name} is worn down by fatigue!`
  }),
  strained:Object.freeze({
    key:'strained',name:'Strained',short:'STRN',color:0xb41820,
    residualFraction:1/8,strengthMultiplier:.5,
    inflicted:name=>`${name} is strained!`,
    residual:name=>`${name} is hurt by the strain!`
  }),
  stunned:Object.freeze({
    key:'stunned',name:'Stunned',short:'STUN',color:0xd09a2f,
    speedMultiplier:.25,actionBlockChance:.25,
    inflicted:name=>`${name} is stunned!`,
    blocked:name=>`${name} is stunned and cannot move!`
  }),
  tiedUp:Object.freeze({
    key:'tiedUp',name:'Tied Up',short:'TIED',color:0x4a72a8,
    sleepLike:true,
    inflicted:name=>`${name} is tied up!`,
    blocked:name=>`${name} cannot break the tie-up!`,
    recovered:name=>`${name} broke free!`
  })
});

export function conditionFor(value){
  const key=typeof value==='string'?value:value?.key;
  return CONDITIONS[key]||null;
}

export function normalizeCondition(value){
  const definition=conditionFor(value);
  if(!definition)return null;
  const normalized={key:definition.key};
  if(definition.sleepLike)normalized.turns=clampTurns(value?.turns);
  return normalized;
}

export function conditionLabel(value){return conditionFor(value)?.name||'';}
export function conditionShort(value){return conditionFor(value)?.short||'';}

export function inflictCondition(mon,key,rng=Math.random){
  const definition=CONDITIONS[key];
  if(!mon||!definition)return {applied:false,reason:'invalid',condition:null};
  if(conditionFor(mon.condition))return {applied:false,reason:'occupied',condition:normalizeCondition(mon.condition)};
  const condition={key};
  if(definition.sleepLike)condition.turns=2+Math.floor(rng()*4);
  mon.condition=condition;
  return {applied:true,condition:{...condition}};
}

export function clearCondition(mon){
  const previous=normalizeCondition(mon?.condition);
  if(mon)delete mon.condition;
  return previous;
}

export function consumeConditionAction(mon,rng=Math.random){
  const condition=normalizeCondition(mon?.condition),definition=conditionFor(condition);
  if(!condition||!definition)return {checked:false,blocked:false,cleared:false,key:null};
  if(definition.sleepLike){
    condition.turns=clampTurns(condition.turns)-1;
    if(condition.turns<=0){clearCondition(mon);return {checked:true,blocked:false,cleared:true,key:definition.key};}
    mon.condition=condition;
    return {checked:true,blocked:true,cleared:false,key:definition.key,turns:condition.turns};
  }
  if(definition.actionBlockChance&&rng()<definition.actionBlockChance)return {checked:true,blocked:true,cleared:false,key:definition.key};
  return {checked:true,blocked:false,cleared:false,key:definition.key};
}

export function resolveConditionResidual(mon,maxCondition){
  const condition=normalizeCondition(mon?.condition),definition=conditionFor(condition);
  if(!mon||!definition?.residualFraction||mon.hp<=0)return null;
  const hpBefore=Math.max(0,Math.round(mon.hp));
  const damage=Math.min(hpBefore,Math.max(1,Math.floor(Math.max(1,maxCondition)*definition.residualFraction)));
  mon.hp=Math.max(0,hpBefore-damage);
  return {key:definition.key,damage,hpBefore,hpAfter:mon.hp,knockedOut:mon.hp<=0};
}
