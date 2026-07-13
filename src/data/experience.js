export const MAX_LEVEL=100;

export const GROWTH_RATES=Object.freeze({
  MEDIUM_FAST:'mediumFast',
  ERRATIC:'erratic',
  FLUCTUATING:'fluctuating',
  MEDIUM_SLOW:'mediumSlow',
  FAST:'fast',
  SLOW:'slow'
});

const profile=(baseYield,growthRate)=>Object.freeze({baseYield,growthRate});

// FireRed gives every species its own base yield and one of six growth groups.
// These values fill the same role for each wrestler and stay constant through a
// development line so cumulative EXP remains stable when development occurs.
export const EXPERIENCE_PROFILES=Object.freeze({
  buckshot:profile(64,GROWTH_RATES.MEDIUM_SLOW),
  buckvarsity:profile(142,GROWTH_RATES.MEDIUM_SLOW),
  buckallam:profile(236,GROWTH_RATES.MEDIUM_SLOW),
  matreturner:profile(64,GROWTH_RATES.MEDIUM_SLOW),
  matgeneral:profile(142,GROWTH_RATES.MEDIUM_SLOW),
  rideking:profile(236,GROWTH_RATES.MEDIUM_SLOW),
  fieldflyer:profile(64,GROWTH_RATES.MEDIUM_SLOW),
  funkflyer:profile(142,GROWTH_RATES.MEDIUM_SLOW),
  scramblesaint:profile(236,GROWTH_RATES.MEDIUM_SLOW),
  pacesetter:profile(60,GROWTH_RATES.FAST),
  pacecommand:profile(154,GROWTH_RATES.FAST),
  drillpartner:profile(67,GROWTH_RATES.MEDIUM_FAST),
  drillveteran:profile(168,GROWTH_RATES.MEDIUM_FAST),
  lakechain:profile(68,GROWTH_RATES.MEDIUM_SLOW),
  chainmaster:profile(170,GROWTH_RATES.MEDIUM_SLOW),
  whizzkid:profile(153,GROWTH_RATES.SLOW),
  lockthrow:profile(158,GROWTH_RATES.SLOW),
  riverroller:profile(66,GROWTH_RATES.FAST),
  tilttech:profile(172,GROWTH_RATES.MEDIUM_FAST),
  funklord:profile(172,GROWTH_RATES.ERRATIC),
  captainneutral:profile(180,GROWTH_RATES.MEDIUM_SLOW),
  scrambleboss:profile(195,GROWTH_RATES.ERRATIC),
  topboss:profile(210,GROWTH_RATES.SLOW),
  senator:profile(210,GROWTH_RATES.SLOW),
  professor:profile(210,GROWTH_RATES.MEDIUM_FAST),
  closer:profile(225,GROWTH_RATES.FLUCTUATING)
});

const DEFAULT_PROFILE=profile(64,GROWTH_RATES.MEDIUM_FAST);
const clampLevel=level=>Math.max(0,Math.min(MAX_LEVEL,Math.floor(Number(level)||0)));
const cube=n=>n*n*n;

export function experienceProfile(id){return EXPERIENCE_PROFILES[id]||DEFAULT_PROFILE;}

// Gen III cumulative experience tables. Integer division is deliberately
// floored at the same points as the original formulas.
export function growthExperience(level,growthRate=GROWTH_RATES.MEDIUM_FAST){
  const n=clampLevel(level);
  if(n===0)return 0;
  if(n===1)return 1;
  const n3=cube(n);
  switch(growthRate){
    case GROWTH_RATES.SLOW:return Math.floor(5*n3/4);
    case GROWTH_RATES.FAST:return Math.floor(4*n3/5);
    case GROWTH_RATES.MEDIUM_SLOW:return Math.floor(6*n3/5)-15*n*n+100*n-140;
    case GROWTH_RATES.ERRATIC:
      if(n<=50)return Math.floor((100-n)*n3/50);
      if(n<=68)return Math.floor((150-n)*n3/100);
      if(n<=98)return Math.floor(Math.floor((1911-10*n)/3)*n3/500);
      return Math.floor((160-n)*n3/100);
    case GROWTH_RATES.FLUCTUATING:
      if(n<=15)return Math.floor((Math.floor((n+1)/3)+24)*n3/50);
      if(n<=36)return Math.floor((n+14)*n3/50);
      return Math.floor((Math.floor(n/2)+32)*n3/50);
    case GROWTH_RATES.MEDIUM_FAST:
    default:return n3;
  }
}

export function experienceAtLevel(id,level){return growthExperience(level,experienceProfile(id).growthRate);}

export function experienceSpan(id,level){
  const current=clampLevel(level);
  if(current>=MAX_LEVEL)return 0;
  return experienceAtLevel(id,current+1)-experienceAtLevel(id,current);
}

export function experienceProgress(mon){
  const level=clampLevel(mon?.lvl);
  if(level>=MAX_LEVEL)return 1;
  const floor=experienceAtLevel(mon?.id,level),span=experienceSpan(mon?.id,level);
  return Math.max(0,Math.min(1,(Math.max(floor,Number(mon?.xp)||0)-floor)/Math.max(1,span)));
}

const uniqueLiving=list=>[...new Set(list||[])].filter(mon=>mon&&Number(mon.hp)>0);
const boosted=(value,enabled)=>enabled?Math.floor(value*150/100):value;

// Mirrors FireRed's per-faint distribution: participants split the base pool;
// an EXP Share pool, when present, receives half; then held-item, trainer-match,
// and traded-wrestler bonuses are applied independently to each recipient.
export function distributeDefeatExperience({
  defeated,
  party=[],
  participants=[],
  trainerBattle=false,
  hasExpShare=mon=>mon?.heldItem==='expShare',
  hasLuckyEgg=mon=>mon?.heldItem==='luckyEgg',
  isTraded=mon=>!!mon?.traded
}={}){
  if(!defeated)return {base:0,participantShare:0,expShareShare:0,awards:[]};
  const livingParty=uniqueLiving(party);
  const sentIn=uniqueLiving(participants).filter(mon=>livingParty.includes(mon));
  const shareHolders=livingParty.filter(hasExpShare);
  const calculated=Math.floor(experienceProfile(defeated.id).baseYield*Math.max(1,clampLevel(defeated.lvl))/7);
  const splitForShare=shareHolders.length>0;
  const participantPool=splitForShare?Math.floor(calculated/2):calculated;
  const participantShare=sentIn.length?Math.max(1,Math.floor(participantPool/sentIn.length)):0;
  const expShareShare=shareHolders.length?Math.max(1,Math.floor(Math.floor(calculated/2)/shareHolders.length)):0;
  const awards=[];
  for(const mon of livingParty){
    const participated=sentIn.includes(mon),viaExpShare=shareHolders.includes(mon);
    if((!participated&&!viaExpShare)||mon.lvl>=MAX_LEVEL)continue;
    let amount=(participated?participantShare:0)+(viaExpShare?expShareShare:0);
    amount=boosted(amount,hasLuckyEgg(mon));
    amount=boosted(amount,trainerBattle);
    amount=boosted(amount,isTraded(mon));
    if(amount>0)awards.push({mon,amount,participated,viaExpShare});
  }
  return {base:calculated,participantShare,expShareShare,awards};
}
