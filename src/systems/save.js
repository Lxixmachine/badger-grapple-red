import {counterStarterFor,makeMon} from '../data/roster.js';
import {normalizeItems,normalizeWrestler} from './mechanics.js';
import {canonicalBadge} from '../data/campaign.js';
const KEY='badger_grapple_red_engine_v2';
const SAVE_VERSION='22.2';
const PERIODS=['Morning','Afternoon','Evening','Night'];
const AREA_ALIASES={fieldhouse:'team_locker_room',wrestlingroom:'wrestling_room',campus:'camp_randall',studyhall:'coach_office',lakeshore:'lakeshore_path',downtown:'state_street',river:'picnic_point',conference:'kohl_bracket_floor',championship:'kohl_center',shop:'buckys_locker_room',recovery:'trainer_room'};
const resolveArea=area=>AREA_ALIASES[area]||area;
export function defaultState(){return {version:SAVE_VERSION,playerName:'Walk-On',party:[],box:[],active:0,dex:{seen:{},caught:{},defeated:{}},grit:12,rep:8,items:{sportsDrink:2,athleticTape:1,filmStudy:1,practiceSinglet:3,travelSinglet:0,starterSinglet:0},effects:{filmStudyAttempts:0},keyItems:{equipmentShipment:false,rosterBook:false,kayakVoucher:false,busPass:false,flightTicket:false},travel:{unlockedTowns:['campRandall'],destinations:{campRandall:{id:'campRandall',name:'Camp Randall',area:'camp_randall',pos:{x:11,y:18}}}},badges:[],trainersDefeated:{},audioMuted:false,objective:{id:'intro_meet_coach',stage:0,complete:false,log:['Meet the Head Coach']},opening:{playerPersona:null,rivalPersona:null,battleResult:null},flags:{introDone:false,coachIntro:false,personaChosen:false,assignment:false,rivalIntro:false,openingBattleReady:false,openingBattleComplete:false,openingBattleWon:false,openingRecoveryDone:false,studentIntro:false,wonSpar:false,firstBadge:false,officeChecked:false,equipmentDelivered:false,fieldHouseArrival:false,kayakVoucherRedeemed:false,sendoffComplete:false,flightComplete:false,nationalsComplete:false,homecoming:false,seasonOneComplete:false,hiddenItems:{},practiceCount:0,lockerUnlocked:false,rosterBook:false,recruitingUnlocked:false},visitedMaps:{team_locker_room:true},mapReturnStack:[],facing:'up',day:{name:'Saturday',periodIndex:0,period:'Morning',turn:0},stats:{scouts:0,battles:0,wins:0,recruits:0,streak:0,practices:0},area:'team_locker_room',pos:null,message:'',tournament:{round:0,champion:false},expansion:{unlocked:false,flags:{}}};}
export function normalizeState(state){
  const d=defaultState();
  if(!state||typeof state!=='object')return d;
  const incomingVersion=state.version;
  state.version=SAVE_VERSION;
  state.expansion=(state.expansion&&typeof state.expansion==='object')?{unlocked:!!state.expansion.unlocked,flags:state.expansion.flags||{}}:{unlocked:false,flags:{}}; // v21.2 Season Two seam
  state.tournament=(state.tournament&&typeof state.tournament==='object')?{round:Number.isInteger(state.tournament.round)?state.tournament.round:0,champion:!!state.tournament.champion}:{round:0,champion:false}; // v21.12 Big Ten Championship
  const opening=state.opening&&typeof state.opening==='object'?state.opening:{};
  state.opening={
    playerPersona:typeof opening.playerPersona==='string'?opening.playerPersona:null,
    rivalPersona:typeof opening.rivalPersona==='string'?opening.rivalPersona:null,
    battleResult:['win','loss'].includes(opening.battleResult)?opening.battleResult:null
  };
  state.playerName=typeof state.playerName==='string'&&state.playerName.trim()?state.playerName:d.playerName;
  const incomingParty=(Array.isArray(state.party)?state.party:[]).map(normalizeWrestler);
  const incomingBox=(Array.isArray(state.box)?state.box:[]).map(normalizeWrestler);
  state.party=incomingParty.slice(0,6);
  state.box=[...incomingParty.slice(6),...incomingBox];
  if(!state.party.length&&state.box.length)state.party.push(state.box.shift());
  const active=Number.isInteger(state.active)&&state.active>=0&&state.active<state.party.length?state.active:0;
  if(active>0){const [lead]=state.party.splice(active,1);state.party.unshift(lead);}
  state.active=0;
  state.dex={seen:{...(state.dex?.seen||{})},caught:{...(state.dex?.caught||{})},defeated:{...(state.dex?.defeated||{})}};
  state.items=state.items&&typeof state.items==='object'?normalizeItems(state.items):{...d.items};
  state.effects={...d.effects,...(state.effects||{})};
  state.effects.filmStudyAttempts=Math.max(0,Math.floor(Number(state.effects.filmStudyAttempts)||0));
  state.keyItems={...d.keyItems,...(state.keyItems||{})};
  state.travel={...d.travel,...(state.travel||{})};
  state.travel.unlockedTowns=Array.isArray(state.travel.unlockedTowns)?[...new Set(state.travel.unlockedTowns)]:[...d.travel.unlockedTowns];
  state.travel.destinations=Object.fromEntries(Object.entries({...d.travel.destinations,...(state.travel.destinations||{})}).map(([id,destination])=>[id,{...destination,area:resolveArea(destination.area)}]));
  state.badges=Array.isArray(state.badges)?[...new Set(state.badges.flatMap(badge=>[badge,canonicalBadge(badge)]))]:[];
  state.trainersDefeated={...(d.trainersDefeated||{}),...(state.trainersDefeated||{})};
  state.audioMuted=typeof state.audioMuted==='boolean'?state.audioMuted:d.audioMuted;
  state.objective={...d.objective,...(state.objective||{})};
  state.objective.log=Array.isArray(state.objective.log)?state.objective.log:[...(d.objective.log||[])];
  const incomingFlags=state.flags&&typeof state.flags==='object'?state.flags:{};
  state.flags={...d.flags,...incomingFlags};
  if(!Object.prototype.hasOwnProperty.call(incomingFlags,'recruitingUnlocked')&&incomingFlags.assignment){state.flags.recruitingUnlocked=true;state.flags.lockerUnlocked=true;state.flags.rosterBook=true;}
  state.flags.hiddenItems={...(d.flags.hiddenItems||{}),...(state.flags.hiddenItems||{})};
  delete state.training;
  state.day={...d.day,...(state.day||{})};
  state.day.periodIndex=Number.isInteger(state.day.periodIndex)?state.day.periodIndex:0;
  state.day.period=PERIODS[state.day.periodIndex%PERIODS.length]||state.day.period||'Morning';
  state.stats={...d.stats,...(state.stats||{})};
  state.grit=Number.isFinite(state.grit)?state.grit:d.grit;
  state.rep=Number.isFinite(state.rep)?state.rep:d.rep;
  state.area=resolveArea(typeof state.area==='string'?state.area:d.area);
  state.pos=incomingVersion===SAVE_VERSION&&state.pos?state.pos:null;
  state.facing=['up','down','left','right'].includes(state.facing)?state.facing:d.facing;
  state.mapReturnStack=incomingVersion===SAVE_VERSION&&Array.isArray(state.mapReturnStack)?state.mapReturnStack:[];
  state.visitedMaps={...d.visitedMaps,...(state.visitedMaps||{}),[state.area]:true};
  state.message=typeof state.message==='string'?state.message:'';
  return state;
}
export function loadState(){try{return normalizeState(JSON.parse(localStorage.getItem(KEY))||defaultState());}catch{return defaultState();}}
export function saveState(state){try{localStorage.setItem(KEY,JSON.stringify(normalizeState(state)));}catch{}}
export function resetState(){try{localStorage.removeItem(KEY);}catch{}}
export function chooseStarter(id,options={}){
  const existing=loadState(),story=!!options.story,rivalId=options.rivalId||counterStarterFor(id);
  const s=normalizeState({...defaultState(),...existing});
  s.party=[makeMon(id,story?5:6)];s.box=[];s.active=0;s.dex.seen[id]=true;s.dex.caught[id]=true;
  s.flags.introDone=true;s.flags.personaChosen=true;
  if(story){
    s.opening={playerPersona:id,rivalPersona:rivalId,battleResult:null};
    s.flags.coachIntro=true;s.flags.assignment=false;s.flags.rivalIntro=true;
    s.flags.openingBattleReady=true;s.flags.openingBattleComplete=false;s.flags.openingBattleWon=false;s.flags.openingRecoveryDone=false;
    s.objective={id:'opening_wrestleoff',stage:1,complete:false,log:['Wrestle Rex','Choose a mat persona','Meet the Head Coach']};
    s.area=resolveArea(options.area||existing.area||'wrestling_room');s.pos=options.pos||existing.pos||{x:7,y:7};s.message='';
  }else{
    s.flags.coachIntro=false;s.flags.assignment=false;
    s.objective={id:'meet_coach',stage:1,complete:false,log:['Meet the Head Coach']};
    s.area='team_locker_room';s.pos={x:7,y:7};s.message='Coach is missing. The captain wants you to check his office outside.';
  }
  saveState(s);return s;
}
export function lead(state){if(!state.party.length)return null;if(!state.party[state.active])state.active=0;return state.party[state.active];}
export function caughtRecruitCount(state){return Object.keys(state.dex?.caught||{}).filter(id=>state.dex.caught[id]).length;}
export function defeatedWrestlerCount(state){return Object.keys(state.dex?.defeated||{}).filter(id=>state.dex.defeated[id]).length;}
export function rosterBookComplete(state,total){return defeatedWrestlerCount(state)>=total;}
export function advancePeriod(state){state.day=state.day||{periodIndex:0,period:'Morning',turn:0,name:'Saturday'};state.day.turn=(state.day.turn||0)+1;state.day.periodIndex=((state.day.periodIndex||0)+1)%PERIODS.length;state.day.period=PERIODS[state.day.periodIndex];return state.day.period;}
export function setObjective(state,id,stage,label){state.objective={...(state.objective||{}),id,stage,complete:false,log:[label,...(state.objective?.log||[]).filter(x=>x!==label)].slice(0,8)};return state.objective;}
