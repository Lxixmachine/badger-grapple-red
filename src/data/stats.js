export const STAT_KEYS=['hp','attack','defense','technique','awareness','speed'];
export const BATTLE_STAT_KEYS=STAT_KEYS.slice(1);
export const STAT_LABELS={
  hp:'Condition',
  attack:'Strength',
  defense:'Defense',
  technique:'Technique',
  awareness:'Awareness',
  speed:'Speed'
};

export const MAX_IV=31;
export const MAX_EFFORT_PER_STAT=255;
export const MAX_TOTAL_EFFORT=510;
export const PRACTICE_EFFORT_GAIN=16;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const NATURE_STATS=['attack','defense','technique','awareness','speed'];
const NATURE_NAMES=[
  'Balanced','Aggressive','Forceful','Fearless','Explosive',
  'Guarded','Steady','Fundamental','Stubborn','Anchored',
  'Crafty','Fluid','Precise','Instinctive','Methodical',
  'Studious','Disciplined','Observant','Composed','Patient',
  'Quick','Elusive','Reactive','Alert','Even-Tempered'
];

export const NATURES=NATURE_NAMES.map((name,index)=>{
  const raised=NATURE_STATS[Math.floor(index/5)];
  const lowered=NATURE_STATS[index%5];
  return {id:index,name,raised:raised===lowered?null:raised,lowered:raised===lowered?null:lowered};
});

export function stableSeed(value=''){
  let hash=2166136261;
  for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

export function wrestlerSeed(mon={}){
  return stableSeed([mon.id,mon.lvl,mon.xp,mon.interest,mon.iv,(mon.moves||[]).join(',')].join('|'));
}

export function natureFor(value=0){
  const index=clamp(Math.trunc(Number(value)||0),0,NATURES.length-1);
  return NATURES[index];
}

export function normalizeNature(value,seed=0){
  if(Number.isInteger(value)&&value>=0&&value<NATURES.length)return value;
  if(typeof value==='string'){
    const index=NATURES.findIndex(nature=>nature.name.toLowerCase()===value.toLowerCase());
    if(index>=0)return index;
  }
  return Math.abs(Math.trunc(seed))%NATURES.length;
}

export function natureMultiplier(natureValue,stat){
  const nature=natureFor(natureValue);
  if(nature.raised===stat)return 1.1;
  if(nature.lowered===stat)return .9;
  return 1;
}

export function makeIndividualValues(rng=Math.random){
  return Object.fromEntries(STAT_KEYS.map(key=>[key,Math.floor(clamp(Number(rng())||0,0,.999999)*(MAX_IV+1))]));
}

export function potentialFor(values={}){
  const ivs=normalizeIndividualValues(values);
  const total=STAT_KEYS.reduce((sum,key)=>sum+ivs[key],0);
  if(total>=174)return 'S';
  if(total>=162)return 'A+';
  if(total>=150)return 'A';
  if(total>=138)return 'A-';
  if(total>=126)return 'B+';
  if(total>=114)return 'B';
  if(total>=102)return 'B-';
  if(total>=90)return 'C+';
  if(total>=78)return 'C';
  if(total>=66)return 'C-';
  return 'D';
}

export function normalizeIndividualValues(values,legacyIv=0,seed=0){
  if(values&&typeof values==='object'){
    return Object.fromEntries(STAT_KEYS.map(key=>[key,clamp(Math.trunc(Number(values[key])||0),0,MAX_IV)]));
  }
  const legacy=clamp(Math.trunc(Number(legacyIv)||0),-3,3);
  const center=15+legacy*3;
  return Object.fromEntries(STAT_KEYS.map((key,index)=>{
    const variation=((seed>>>((index%4)*4))&7)-3;
    return [key,clamp(center+variation,0,MAX_IV)];
  }));
}

function legacyEffort(training={}){
  return {
    hp:(training.conditioning||0)*PRACTICE_EFFORT_GAIN,
    attack:(training.strength||0)*PRACTICE_EFFORT_GAIN,
    defense:(training.awareness||0)*PRACTICE_EFFORT_GAIN,
    technique:(training.technique||0)*PRACTICE_EFFORT_GAIN,
    awareness:0,
    speed:(training.speed||0)*PRACTICE_EFFORT_GAIN
  };
}

export function normalizeEffortValues(values,training={}){
  const source=values&&typeof values==='object'?values:legacyEffort(training);
  const normalized=Object.fromEntries(STAT_KEYS.map(key=>[key,clamp(Math.trunc(Number(source[key])||0),0,MAX_EFFORT_PER_STAT)]));
  let overflow=effortTotal(normalized)-MAX_TOTAL_EFFORT;
  if(overflow>0){
    for(const key of [...STAT_KEYS].reverse()){
      const removed=Math.min(overflow,normalized[key]);
      normalized[key]-=removed;overflow-=removed;
      if(!overflow)break;
    }
  }
  return normalized;
}

export function effortTotal(effort={}){
  return STAT_KEYS.reduce((sum,key)=>sum+Math.max(0,Math.trunc(Number(effort[key])||0)),0);
}

export function addEffort(mon,stat,amount){
  if(!STAT_KEYS.includes(stat)||!Number.isFinite(amount)||amount<=0)return 0;
  mon.effort=normalizeEffortValues(mon.effort,mon.training);
  const roomForStat=MAX_EFFORT_PER_STAT-mon.effort[stat];
  const roomForTotal=MAX_TOTAL_EFFORT-effortTotal(mon.effort);
  const gain=Math.max(0,Math.min(Math.trunc(amount),roomForStat,roomForTotal));
  mon.effort[stat]+=gain;
  return gain;
}

export function calculateStat(base,level,iv,effort,natureValue,stat){
  const lvl=clamp(Math.trunc(Number(level)||1),1,100);
  const core=Math.floor(((2*Math.max(1,Math.trunc(base))+clamp(Math.trunc(iv),0,MAX_IV)+Math.floor(clamp(Math.trunc(effort),0,MAX_EFFORT_PER_STAT)/4))*lvl)/100);
  if(stat==='hp')return core+lvl+10;
  const beforeNature=core+5;
  const multiplier=natureMultiplier(natureValue,stat);
  return Math.floor(beforeNature*(multiplier===1.1?110:multiplier===.9?90:100)/100);
}

export function calculateStats(baseStats,level,mon={}){
  const seed=wrestlerSeed(mon);
  const ivs=normalizeIndividualValues(mon.ivs,mon.iv,seed);
  const effort=normalizeEffortValues(mon.effort,mon.training);
  return Object.fromEntries(STAT_KEYS.map(key=>[
    key,
    calculateStat(baseStats[key],level,ivs[key],effort[key],normalizeNature(mon.nature,seed),key)
  ]));
}
