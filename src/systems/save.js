import {makeMon} from '../data/roster.js';
const KEY='badger_grapple_red_engine_v2';
const SAVE_VERSION='19.0';
const PERIODS=['Morning','Afternoon','Evening','Night'];
export function defaultState(){return {version:SAVE_VERSION,playerName:'Coach',party:[],box:[],active:0,dex:{seen:{},caught:{}},grit:12,rep:8,items:{invite:3,energy:2,tape:1,film:1},badges:[],trainersDefeated:{},audioMuted:false,objective:{id:'intro_meet_coach',stage:0,complete:false,log:['Meet the Head Coach']},flags:{introDone:false,coachIntro:false,assignment:false,rivalIntro:false,studentIntro:false,wonSpar:false,firstBadge:false,hiddenItems:{},practiceCount:0},training:{conditioning:0,technique:0,strength:0,speed:0,awareness:0},day:{name:'Saturday',periodIndex:0,period:'Morning',turn:0},stats:{scouts:0,battles:0,wins:0,recruits:0,streak:0,practices:0},area:'fieldhouse',pos:null,message:'',tournament:{round:0,champion:false},expansion:{unlocked:false,flags:{}}};}
export function normalizeState(state){
  const d=defaultState();
  if(!state||typeof state!=='object')return d;
  state.version=SAVE_VERSION;
  state.expansion=(state.expansion&&typeof state.expansion==='object')?{unlocked:!!state.expansion.unlocked,flags:state.expansion.flags||{}}:{unlocked:false,flags:{}}; // v21.2 Season Two seam
  state.tournament=(state.tournament&&typeof state.tournament==='object')?{round:Number.isInteger(state.tournament.round)?state.tournament.round:0,champion:!!state.tournament.champion}:{round:0,champion:false}; // v21.12 Big Ten Championship
  state.playerName=typeof state.playerName==='string'&&state.playerName.trim()?state.playerName:d.playerName;
  state.party=Array.isArray(state.party)?state.party:[];
  state.box=Array.isArray(state.box)?state.box:[];
  state.active=Number.isInteger(state.active)?state.active:0;
  state.dex={seen:{...(state.dex?.seen||{})},caught:{...(state.dex?.caught||{})}};
  state.items={...d.items,...(state.items||{})};
  state.badges=Array.isArray(state.badges)?state.badges:[];
  state.trainersDefeated={...(d.trainersDefeated||{}),...(state.trainersDefeated||{})};
  state.audioMuted=typeof state.audioMuted==='boolean'?state.audioMuted:d.audioMuted;
  state.objective={...d.objective,...(state.objective||{})};
  state.objective.log=Array.isArray(state.objective.log)?state.objective.log:[...(d.objective.log||[])];
  state.flags={...d.flags,...(state.flags||{})};
  state.flags.hiddenItems={...(d.flags.hiddenItems||{}),...(state.flags.hiddenItems||{})};
  state.training={...d.training,...(state.training||{})};
  state.day={...d.day,...(state.day||{})};
  state.day.periodIndex=Number.isInteger(state.day.periodIndex)?state.day.periodIndex:0;
  state.day.period=PERIODS[state.day.periodIndex%PERIODS.length]||state.day.period||'Morning';
  state.stats={...d.stats,...(state.stats||{})};
  state.grit=Number.isFinite(state.grit)?state.grit:d.grit;
  state.rep=Number.isFinite(state.rep)?state.rep:d.rep;
  state.area=typeof state.area==='string'?state.area:d.area;
  state.pos=state.pos||null;
  state.message=typeof state.message==='string'?state.message:'';
  return state;
}
export function loadState(){try{return normalizeState(JSON.parse(localStorage.getItem(KEY))||defaultState());}catch{return defaultState();}}
export function saveState(state){try{localStorage.setItem(KEY,JSON.stringify(normalizeState(state)));}catch{}}
export function resetState(){try{localStorage.removeItem(KEY);}catch{}}
export function chooseStarter(id){const existing=loadState();const s=normalizeState({...defaultState(),...existing});s.party=[makeMon(id,6)];s.box=[];s.active=0;s.dex.seen[id]=true;s.dex.caught[id]=true;s.flags.introDone=true;s.flags.coachIntro=false;s.flags.assignment=false;s.objective={id:'meet_coach',stage:1,complete:false,log:['Meet the Head Coach']};s.area='fieldhouse';s.pos={x:14,y:12};s.message='Coach is in the wrestling room. The captain is waiting at the trophy threshold.';saveState(s);return s;}
export function lead(state){if(!state.party.length)return null;if(!state.party[state.active])state.active=0;return state.party[state.active];}
export function caughtRecruitCount(state){return Object.keys(state.dex?.caught||{}).filter(id=>state.dex.caught[id]).length;}
export function advancePeriod(state){state.day=state.day||{periodIndex:0,period:'Morning',turn:0,name:'Saturday'};state.day.turn=(state.day.turn||0)+1;state.day.periodIndex=((state.day.periodIndex||0)+1)%PERIODS.length;state.day.period=PERIODS[state.day.periodIndex];return state.day.period;}
export function setObjective(state,id,stage,label){state.objective={...(state.objective||{}),id,stage,complete:false,log:[label,...(state.objective?.log||[]).filter(x=>x!==label)].slice(0,8)};return state.objective;}
