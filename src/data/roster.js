import {MAX_LEVEL,experienceAtLevel} from './experience.js';
import {MOVES,moveStaminaMax} from './moves.js';
import {movesForLevel,movesLearnedAtLevel} from './learnsets.js';
import {calculateStats,makeIndividualValues,normalizeEffortValues,potentialFor} from './stats.js';

export const ROSTER={
 // ---- STARTER LINE: SHOOTER ----
 buckshot:{id:'buckshot',name:'Bucky Shotmaker',weight:'125',style:'Shooter',rarity:'Common',asset:'badger',color:0xc81f2b,stats:{hp:62,attack:54,defense:42,technique:55,awareness:45,speed:57},moves:['single','highc','sprawl','pace'],bio:'Fast first attack. Great starter.',strengths:'Quick entries',weaknesses:'Can get ridden',personality:'Eager',evolvesTo:'buckvarsity',evolveLvl:10},
 buckvarsity:{id:'buckvarsity',name:'Varsity Bucky',weight:'133',style:'Shooter',rarity:'Common',asset:'badger',tint:0xffd27d,stats:{hp:78,attack:69,defense:54,technique:68,awareness:56,speed:66},moves:['single','highc','reattack','double'],bio:'Earned the varsity singlet.',strengths:'All-around neutral',weaknesses:'Still learning top',personality:'Confident',evolvesTo:'buckallam',evolveLvl:18},
 buckallam:{id:'buckallam',name:'All-American Bucky',weight:'141',style:'Shooter',rarity:'Uncommon',asset:'badger',tint:0xffe9b0,stats:{hp:96,attack:90,defense:69,technique:87,awareness:71,speed:78},moves:['blast','highc','reattack','flurry'],bio:'Podium-level shot selection.',strengths:'Finishes shots',weaknesses:'None obvious',personality:'Focused'},
 // ---- STARTER LINE: TOP ----
 matreturner:{id:'matreturner',name:'Mat Returner',weight:'165',style:'Rider',rarity:'Common',asset:'top',color:0x5f4cc8,stats:{hp:72,attack:51,defense:54,technique:43,awareness:54,speed:36},moves:['ride','claw','tilt','sprawl'],bio:'Pressure and mat control.',strengths:'Top pressure',weaknesses:'Slow feet',personality:'Quiet grinder',evolvesTo:'matgeneral',evolveLvl:10},
 matgeneral:{id:'matgeneral',name:'Mat General',weight:'174',style:'Rider',rarity:'Common',asset:'top',tint:0xb9a8ff,stats:{hp:90,attack:66,defense:72,technique:55,awareness:71,speed:42},moves:['ride','tilt','gut','sprawl'],bio:'Runs the top game like an offense.',strengths:'Mat return',weaknesses:'Scrambles',personality:'Composed',evolvesTo:'rideking',evolveLvl:18},
 rideking:{id:'rideking',name:'Ride King',weight:'184',style:'Rider',rarity:'Uncommon',asset:'top',tint:0xd9ccff,stats:{hp:110,attack:87,defense:90,technique:71,awareness:88,speed:48},moves:['ride','tilt','cradle','pin'],bio:'Nobody escapes the full ride.',strengths:'Mat control',weaknesses:'Pace matches',personality:'Relentless'},
 // ---- STARTER LINE: SCRAMBLE ----
 fieldflyer:{id:'fieldflyer',name:'Field House Flyer',weight:'141',style:'Scrambler',rarity:'Common',asset:'scramble',color:0xe47c27,stats:{hp:64,attack:54,defense:39,technique:58,awareness:41,speed:63},moves:['scramble','roll','single','snap'],bio:'Chaotic and slippery.',strengths:'Scrambles',weaknesses:'Position discipline',personality:'Creative',evolvesTo:'funkflyer',evolveLvl:10},
 funkflyer:{id:'funkflyer',name:'Funk Flyer',weight:'149',style:'Scrambler',rarity:'Common',asset:'scramble',tint:0xffc48a,stats:{hp:80,attack:72,defense:51,technique:76,awareness:53,speed:78},moves:['scramble','funk','switchb','snap'],bio:'Turns bad positions into points.',strengths:'Transition',weaknesses:'Top control',personality:'Loose',evolvesTo:'scramblesaint',evolveLvl:18},
 scramblesaint:{id:'scramblesaint',name:'Scramble Saint',weight:'157',style:'Scrambler',rarity:'Uncommon',asset:'scramble',tint:0xffe0bd,stats:{hp:98,attack:90,defense:63,technique:94,awareness:64,speed:90},moves:['funk','scramble','cradle','reattack'],bio:'Never in danger. Only in transition.',strengths:'Never pinned',weaknesses:'Grinders',personality:'Fearless'},
 // ---- WILD / RECRUITABLE COMMONS ----
 pacesetter:{id:'pacesetter',name:'Pace Setter',weight:'149',style:'Bull',rarity:'Common',asset:'pace',color:0x2e9c57,stats:{hp:66,attack:48,defense:45,technique:40,awareness:47,speed:54},moves:['pace','double','flurry','stall'],bio:'Wins on volume.',strengths:'Gas tank',weaknesses:'Big moves',personality:'Relentless',evolvesTo:'pacecommand',evolveLvl:12},
 pacecommand:{id:'pacecommand',name:'Pace Commander',weight:'157',style:'Bull',rarity:'Uncommon',asset:'pace',tint:0x8fe0a6,stats:{hp:88,attack:66,defense:60,technique:55,awareness:62,speed:72},moves:['flurry','grind','pace','double'],bio:'Third period is his period.',strengths:'Never tires',weaknesses:'Big single shots',personality:'Patient'},
 drillpartner:{id:'drillpartner',name:'Drill Partner',weight:'133',style:'Shooter',rarity:'Uncommon',asset:'neutral',color:0xc81f2b,stats:{hp:68,attack:60,defense:54,technique:60,awareness:55,speed:60},moves:['single','pace','roll','sprawl'],bio:'Clean technique.',strengths:'Fundamentals',weaknesses:'Finishing late',personality:'Coach-friendly',evolvesTo:'drillveteran',evolveLvl:12},
 drillveteran:{id:'drillveteran',name:'Drill Veteran',weight:'141',style:'Shooter',rarity:'Rare',asset:'neutral',tint:0xff9d9d,stats:{hp:92,attack:78,defense:69,technique:76,awareness:69,speed:69},moves:['single','highc','reattack','double'],bio:'Ten years in the room.',strengths:'Everything solid',weaknesses:'Nothing flashy',personality:'Veteran'},
 lakechain:{id:'lakechain',name:'Lake Chain',weight:'133',style:'Shooter',rarity:'Uncommon',asset:'neutral',color:0xb82027,stats:{hp:70,attack:63,defense:48,technique:64,awareness:52,speed:66},moves:['single','highc','double','reattack'],bio:'One attack becomes three.',strengths:'Chain wrestling',weaknesses:'Hand fighting',personality:'Competitive',evolvesTo:'chainmaster',evolveLvl:14},
 chainmaster:{id:'chainmaster',name:'Chain Master',weight:'141',style:'Shooter',rarity:'Rare',asset:'neutral',tint:0xff7d7d,stats:{hp:94,attack:84,defense:60,technique:83,awareness:64,speed:81},moves:['blast','highc','double','reattack'],bio:'The chain never breaks.',strengths:'Combination attacks',weaknesses:'Single bad rep',personality:'Relentless'},
 whizzkid:{id:'whizzkid',name:'Whizzer Wizard',weight:'149',style:'Wall',rarity:'Uncommon',asset:'neutral',tint:0xbdb6ff,stats:{hp:76,attack:54,defense:75,technique:46,awareness:79,speed:54},moves:['whizzer','sprawl','reattack','single'],bio:'You cannot score on him.',strengths:'Defense',weaknesses:'Slow to score',personality:'Patient'},
 lockthrow:{id:'lockthrow',name:'Locke Thrower',weight:'197',style:'Thrower',rarity:'Uncommon',asset:'top',tint:0x8fd0ff,stats:{hp:82,attack:75,defense:57,technique:58,awareness:51,speed:33},moves:['bodylock','headlock','snap','sprawl'],bio:'One lock and the lights go out.',strengths:'Upper body throws',weaknesses:'Leg attacks',personality:'Physical'},
 riverroller:{id:'riverroller',name:'River Roller',weight:'149',style:'Scrambler',rarity:'Common',asset:'scramble',tint:0x9fe7ff,stats:{hp:70,attack:57,defense:45,technique:62,awareness:47,speed:69},moves:['roll','scramble','switchb','snap'],bio:'Trains on the river trail.',strengths:'Rolls out of trouble',weaknesses:'Top pressure',personality:'Playful'},
 // ---- RARES ----
 tilttech:{id:'tilttech',name:'Tilt Technician',weight:'174',style:'Rider',rarity:'Rare',asset:'top',color:0x594bc0,stats:{hp:76,attack:72,defense:57,technique:60,awareness:59,speed:45},moves:['ride','tilt','pin','claw'],bio:'Nearfall machine.',strengths:'Nearfall turns',weaknesses:'Neutral pace',personality:'Calculating'},
 funklord:{id:'funklord',name:'Funk Lord',weight:'157',style:'Scrambler',rarity:'Rare',asset:'scramble',tint:0xffd9a8,stats:{hp:82,attack:81,defense:54,technique:85,awareness:56,speed:84},moves:['funk','scramble','cradle','switchb'],bio:'Inverted is his neutral.',strengths:'Unpredictable',weaknesses:'Basic wrestling',personality:'Wild card'},
 // ---- GYM BOSSES (not wild-recruitable) ----
 captainneutral:{id:'captainneutral',name:'The Opener',weight:'174',style:'Shooter',rarity:'Elite',asset:'neutral',color:0xb71b25,stats:{hp:88,attack:78,defense:63,technique:74,awareness:62,speed:60},moves:['single','highc','reattack','flurry'],bio:'Field House captain. The season starts here.',strengths:'All positions',weaknesses:'None obvious',personality:'Captain'},
 scrambleboss:{id:'scrambleboss',name:'The Funk Doctor',weight:'157',style:'Scrambler',rarity:'Elite',asset:'scramble',tint:0xffb36b,stats:{hp:100,attack:87,defense:66,technique:90,awareness:65,speed:84},moves:['funk','scramble','cradle','reattack'],bio:'Picnic Point captain. Nobody solves the scramble.',strengths:'Transition wrestling',weaknesses:'None obvious',personality:'Unbothered'},
 topboss:{id:'topboss',name:'The Anchor',weight:'197',style:'Rider',rarity:'Elite',asset:'top',tint:0x7fb5ff,stats:{hp:112,attack:90,defense:84,technique:73,awareness:83,speed:48},moves:['ride','tilt','cradle','pin'],bio:'Kohl Center captain. Nobody escapes the ride.',strengths:'Mat control',weaknesses:'None obvious',personality:'Immovable'},
 senator:{id:'senator',name:'The Senator',weight:'197',style:'Thrower',rarity:'Elite',asset:'top',tint:0x9ed5ff,stats:{hp:104,attack:93,defense:69,technique:73,awareness:64,speed:48},moves:['bodylock','headlock','throwby','sprawl'],bio:'Capitol captain. Every big throw lands like a closing argument.',strengths:'Upper-body offense',weaknesses:'None obvious',personality:'Commanding'},
 professor:{id:'professor',name:'The Professor',weight:'174',style:'Wall',rarity:'Elite',asset:'neutral',tint:0xc8c4ff,stats:{hp:106,attack:72,defense:96,technique:59,awareness:98,speed:54},moves:['whizzer','sprawl','reattack','single'],bio:'Bascom captain. Every attack has already been studied.',strengths:'Counter wrestling',weaknesses:'None obvious',personality:'Analytical'},
 closer:{id:'closer',name:'The Closer',weight:'184',style:'Bull',rarity:'Elite',asset:'pace',tint:0x9ff0b6,stats:{hp:118,attack:96,defense:78,technique:77,awareness:80,speed:87},moves:['flurry','grind','double','pace'],bio:'St. Louis captain. His pace ends seasons.',strengths:'Relentless pressure',weaknesses:'None obvious',personality:'Unyielding'}
};
export const BATTLE_SPIRITS={
  buckshot:'Badger',buckvarsity:'Badger',buckallam:'Badger',
  matreturner:'Gorilla',matgeneral:'Gorilla',rideking:'Gorilla',
  fieldflyer:'Red Panda',funkflyer:'Red Panda',scramblesaint:'Red Panda',
  pacesetter:'Gator',pacecommand:'Gator',drillpartner:'River Otter',drillveteran:'River Otter',
  lakechain:'Timber Wolf',chainmaster:'Timber Wolf',whizzkid:'Porcupine',lockthrow:'Bighorn Ram',
  riverroller:'Beaver',tilttech:'Lynx',funklord:'Ring-tailed Lemur',
  captainneutral:'Cougar',scrambleboss:'Capuchin',topboss:'Bison',
  senator:'Red Deer',professor:'Snapping Turtle',closer:'Wolverine'
};
Object.entries(ROSTER).forEach(([id,record])=>{
  record.battleAsset=id;
  record.spirit=BATTLE_SPIRITS[id];
});
const EFFORT_YIELDS={
  buckshot:{stat:'technique',amount:1},buckvarsity:{stat:'technique',amount:2},buckallam:{stat:'technique',amount:3},
  matreturner:{stat:'defense',amount:1},matgeneral:{stat:'defense',amount:2},rideking:{stat:'defense',amount:3},
  fieldflyer:{stat:'speed',amount:1},funkflyer:{stat:'speed',amount:2},scramblesaint:{stat:'speed',amount:3},
  pacesetter:{stat:'hp',amount:1},pacecommand:{stat:'hp',amount:2},
  drillpartner:{stat:'technique',amount:1},drillveteran:{stat:'technique',amount:2},
  lakechain:{stat:'speed',amount:1},chainmaster:{stat:'speed',amount:2},whizzkid:{stat:'awareness',amount:2},
  lockthrow:{stat:'attack',amount:2},riverroller:{stat:'speed',amount:1},tilttech:{stat:'technique',amount:2},funklord:{stat:'technique',amount:2},
  captainneutral:{stat:'technique',amount:3},scrambleboss:{stat:'speed',amount:3},topboss:{stat:'defense',amount:3},
  senator:{stat:'attack',amount:3},professor:{stat:'awareness',amount:3},closer:{stat:'hp',amount:3}
};
Object.entries(EFFORT_YIELDS).forEach(([id,effortYield])=>{ROSTER[id].effortYield=effortYield;});
// The battle-persona canon: on the mat, wrestlers take their spirit form.
export const PERSONAS={badger:'Badger',neutral:'Grizzly',top:'Gorilla',scramble:'Red Panda',pace:'Gator'};
export function personaFor(id){return (ROSTER[id]||ROSTER.buckshot).spirit||'Badger';}
export function battleAssetFor(id){return (ROSTER[id]||ROSTER.buckshot).battleAsset;}
export function battleTextureFor(id,back=false){return `battle_${battleAssetFor(id)}${back?'_back':''}`;}
// Rear poses are normalized during asset compilation. Every committed back
// sprite already looks from the lower-left toward the opponent, so runtime
// identity-specific mirroring is forbidden.
export const BATTLE_BACK_FLIP_IDS=Object.freeze([]);
const BATTLE_BACK_FLIPS=new Set(BATTLE_BACK_FLIP_IDS);
export function battleFlipXFor(id,back=false){return !!back&&BATTLE_BACK_FLIPS.has(battleAssetFor(id));}
export const MAX_WRESTLER_NICKNAME_LENGTH=10;
export function normalizeWrestlerNickname(value){
  if(typeof value!=='string')return '';
  return value.replace(/[^A-Za-z0-9 .'-]/g,'').replace(/\s+/g,' ').trim().slice(0,MAX_WRESTLER_NICKNAME_LENGTH);
}
export function wrestlerName(mon,{short=false}={}){
  const nickname=normalizeWrestlerNickname(mon?.nickname);
  if(nickname)return nickname;
  const species=(ROSTER[mon?.id]||ROSTER.buckshot).name;
  return short?species.split(' ')[0]:species;
}
export function setWrestlerNickname(mon,value){
  if(!mon)return '';
  const nickname=normalizeWrestlerNickname(value);
  if(nickname)mon.nickname=nickname;else delete mon.nickname;
  return nickname;
}
export const STARTERS=['buckshot','matreturner','fieldflyer'];
export const STARTER_COUNTERS={buckshot:'fieldflyer',matreturner:'buckshot',fieldflyer:'matreturner'};
export function counterStarterFor(id){return STARTER_COUNTERS[id]||STARTERS[1];}
export function scaledStats(id,lvl,mon={}){return calculateStats((ROSTER[id]||ROSTER.buckshot).stats,lvl,mon);}
export function fullMoveStamina(moves=[]){return Object.fromEntries(moves.filter(key=>MOVES[key]&&key!=='desperation').map(key=>[key,moveStaminaMax(key)]));}
export function syncMoveStamina(mon){
  const stored=mon?.moveStamina&&typeof mon.moveStamina==='object'?mon.moveStamina:{};
  mon.moveStamina=Object.fromEntries((mon.moves||[]).filter(key=>MOVES[key]).map(key=>{
    const current=Object.prototype.hasOwnProperty.call(stored,key)?stored[key]:moveStaminaMax(key);
    return [key,Math.max(0,Math.min(moveStaminaMax(key),Math.trunc(Number(current)||0)))];
  }));
  return mon.moveStamina;
}
export function currentMoveStamina(mon,key){syncMoveStamina(mon);return Math.max(0,Math.trunc(mon.moveStamina[key]||0));}
export function hasMoveStamina(mon,key){return key==='desperation'||currentMoveStamina(mon,key)>0;}
export function allMovesSpent(mon){return !(mon?.moves||[]).some(key=>MOVES[key]&&currentMoveStamina(mon,key)>0);}
export function restoreMoveStamina(mon){mon.moveStamina=fullMoveStamina(mon.moves);return mon.moveStamina;}
export function makeMon(id,lvl){
  const r=ROSTER[id]||ROSTER.buckshot,legalMoves=movesForLevel(id,lvl);
  const ivs=makeIndividualValues();
  const m={id,lvl,xp:experienceAtLevel(id,lvl),hp:1,score:0,boost:false,potential:potentialFor(ivs),interest:45+Math.floor(Math.random()*38),ivs,effort:normalizeEffortValues(),nature:Math.floor(Math.random()*25),moves:legalMoves.length?legalMoves:[...(r.moves||[]).slice(0,1)],pendingMoves:[]};
  m.hp=scaledStats(id,lvl,m).hp;restoreMoveStamina(m);return m;
}
export function xpNeed(m){
  if(!m||m.lvl>=MAX_LEVEL)return 0;
  return Math.max(0,experienceAtLevel(m.id,m.lvl+1)-Math.max(experienceAtLevel(m.id,m.lvl),Number(m.xp)||0));
}
function tryLearnLevelMove(m,move,out){
  if(!MOVES[move]||m.moves.includes(move)||m.pendingMoves.includes(move))return;
  if(m.moves.length<4){m.moves.push(move);syncMoveStamina(m);m.moveStamina[move]=moveStaminaMax(move);out.push(`${wrestlerName(m)} learned ${MOVES[move].name}!`);return;}
  m.pendingMoves.push(move);out.push(`${wrestlerName(m)} wants to learn ${MOVES[move].name}!`);
}
export function resolvePendingMove(m,move,replaceIndex=null){
  const pendingIndex=m?.pendingMoves?.indexOf(move)??-1;
  if(pendingIndex<0)return {ok:false};
  if(Number.isInteger(replaceIndex)&&(replaceIndex<0||replaceIndex>=m.moves.length))return {ok:false};
  m.pendingMoves.splice(pendingIndex,1);
  if(!Number.isInteger(replaceIndex))return {ok:true,learned:false,move};
  const forgotten=m.moves[replaceIndex];m.moves[replaceIndex]=move;
  syncMoveStamina(m);delete m.moveStamina[forgotten];m.moveStamina[move]=moveStaminaMax(move);
  return {ok:true,learned:true,move,forgotten};
}
export function applyPendingDevelopment(m){
  const from=ROSTER[m?.id],target=m?.pendingDevelopment;
  if(!from||from.evolvesTo!==target||!ROSTER[target]){if(m)delete m.pendingDevelopment;return null;}
  const before=scaledStats(m.id,m.lvl,m),condition=m.hp;
  m.id=target;delete m.pendingDevelopment;
  const after=scaledStats(m.id,m.lvl,m);
  m.hp=Math.min(after.hp,Math.max(0,condition+Math.max(0,after.hp-before.hp)));
  return {from:from.id,to:target,fromName:from.name,toName:ROSTER[target].name};
}
export function addXp(m,amt,{deferDevelopment=false}={}){
  const out=[];
  if(!m||m.lvl>=MAX_LEVEL)return out;
  m.moves=Array.isArray(m.moves)?m.moves.filter(move=>MOVES[move]).slice(0,4):[];
  m.pendingMoves=Array.isArray(m.pendingMoves)?m.pendingMoves.filter(move=>MOVES[move]&&!m.moves.includes(move)):[];
  m.xp=Math.max(experienceAtLevel(m.id,m.lvl),Math.floor(Number(m.xp)||0))+Math.max(0,Math.floor(Number(amt)||0));
  while(m.lvl<MAX_LEVEL&&m.xp>=experienceAtLevel(m.id,m.lvl+1)){
    const before=scaledStats(m.id,m.lvl,m),condition=m.hp;
    const levelUpId=m.id,levelUpName=wrestlerName(m);
    m.lvl++;
    out.push(`${levelUpName} grew to Lv ${m.lvl}!`);
    movesLearnedAtLevel(levelUpId,m.lvl).forEach(move=>tryLearnLevelMove(m,move,out));
    const r=ROSTER[levelUpId];
    if(r.evolvesTo&&m.lvl>=r.evolveLvl){
      if(deferDevelopment)m.pendingDevelopment=m.pendingDevelopment||r.evolvesTo;
      else{
        m.id=r.evolvesTo;const nr=ROSTER[m.id];
        out.push(`${levelUpName} developed into ${nr.name}!`);
      }
    }
    const after=scaledStats(m.id,m.lvl,m);
    m.hp=Math.min(after.hp,Math.max(0,condition+Math.max(0,after.hp-before.hp)));
  }
  if(m.lvl>=MAX_LEVEL)m.xp=experienceAtLevel(m.id,MAX_LEVEL);
  return out;
}
