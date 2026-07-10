import {AREAS, TRAINERS, TOURNAMENT, WORLD_META} from './world.js';
import {layeredMap,layeredBlocked,layeredGrass,layeredInteraction,layeredSign} from './layeredMaps.js';

export {AREAS, TRAINERS, TOURNAMENT, WORLD_META};
export const TILE=16;

export function canUseExit(state,exit){if(!exit.gate)return true;const badges=state.badges||[];return exit.gate.every(b=>badges.includes(b));}
export function gateMessage(exit){const need=exit.gate||[];return `That route needs: ${need.join(' + ')}.`;}
export function trainersInArea(area){return Object.values(TRAINERS).filter(t=>t.area===area);}
export function trainerAt(area,x,y){return Object.values(TRAINERS).find(t=>t.area===area&&t.pos.x===x&&t.pos.y===y)||null;}
export function trainerSeesTile(tr,x,y){
  const {x:tx,y:ty}=tr.pos;const r=tr.sightRange||4;
  if(tr.facing==='left')return y===ty&&x<tx&&x>=tx-r;
  if(tr.facing==='right')return y===ty&&x>tx&&x<=tx+r;
  if(tr.facing==='up')return x===tx&&y<ty&&y>=ty-r;
  if(tr.facing==='down')return x===tx&&y>ty&&y<=ty+r;
  return false;
}
export function startArea(){return 'fieldhouse';}
export function defaultPos(area='fieldhouse'){return {...(AREAS[area]?.start||AREAS.fieldhouse.start)};}
export function areaFor(id){return AREAS[id]||AREAS.fieldhouse;}
export function areaDimensions(id){const area=areaFor(id);return {width:area.width||WORLD_META.width,height:area.height||WORLD_META.height};}
export function isBlocked(area,x,y){
 const size=areaDimensions(area);
 if(x<0||x>=size.width||y<0||y>=size.height)return true;
 if(layeredMap(area))return layeredBlocked(area,x,y);
 const n=areaFor(area).name;
 // Collision matches visible art. Open lanes first; decoration never blocks.
 if(n==='MEMORIAL LIBRARY')return y===0||x===0||x===27||y===13||((x<4||x>7)&&y===11);
 if(n==='TEAM SHOP'||n==='RECOVERY CENTER'){
   if(x===0||x===27||y===0||y===13)return true;
   if(y===1)return true; // back wall (windows/shelves are decor)
   if(y===12&&!(x>=13&&x<=15))return true; // v21.3 south wall; doorway open at 13-15
   if(x>=10&&x<=17&&y>=4&&y<=6)return true; // counter/table block
   return false;
 }
 if(n==='LAKESHORE PATH')return y===0||y===13||(y>=1&&y<=4); // Mendota water band spans the whole north shore
 if(n==='STATE STREET'){if(x===21&&y===4)return false; // Kohl Center marquee door
   return y===0||y===13||((y<5||y>9)&&(x>3&&x<24))||(y>=1&&y<=4&&x>=24);} // east end: Capitol grounds
 if(n==='PICNIC POINT')return y===0||y===13||y<=2||y>=11||x===0||(x>=14&&x<=20&&y>=4&&y<=6); // peninsula: Mendota both shores, pine stand mid
 if(n==='ANNEX ARENA')return y===0||y===13||x===0||x===27;
 if(n==='KOHL CENTER')return y===0||x===0||x===27||(y===13&&x!==14); // south doors to State Street
 return false;
}
// v21.34 building signs - FireRed density: Pallet Town reads 5 signs in a
// town this size; every enterable building announces itself at the door.
export const SIGNS={
 downtown:{'20,4':'KOHL CENTER - BIG TEN CHAMPIONSHIP. Badge holders only.'}
};
export function signText(area,x,y){return layeredSign(area,x,y)||SIGNS[area]?.[x+','+y]||null;}
export function isGrass(area,x,y){if(layeredMap(area))return layeredGrass(area,x,y);const n=areaFor(area).name;return (n==='LAKESHORE PATH'&&x>=3&&x<=13&&y>=6&&y<=10)||(n==='PICNIC POINT'&&x>=4&&x<=11&&y>=5&&y<=9);}
export function spotKind(area,x,y){
 if(trainerAt(area,x,y))return 'TRAINER'; // v21.11: all trainers are data-driven, no per-area cases
 if(signText(area,x,y))return 'SIGN';
 const layered=layeredInteraction(area,x,y);if(layered)return layered;
 const n=areaFor(area).name;
 if((n==='TEAM SHOP'||n==='RECOVERY CENTER')&&x>=13&&x<=15&&y===11)return 'EXIT';
 if(n==='TEAM SHOP'&&x>=13&&x<=14&&y===7)return 'S';
 if(n==='RECOVERY CENTER'&&x>=13&&x<=14&&y===7)return 'R';
 if(n==='MEMORIAL LIBRARY'){if(x===9&&y===8)return 'STUDY_NPC';if(x===12&&y===6)return 'HIDDEN_FILM';}
 if(n==='STATE STREET'&&y===4&&x>=24)return 'CAPITOL'; // the dome closes the street's east view
 if(n==='KOHL CENTER'&&x===23&&y===0)return 'NATIONALS';
 if(TOURNAMENT.desk.area===area&&TOURNAMENT.desk.x===x&&TOURNAMENT.desk.y===y)return 'TOURNEY';
 const cap=areaFor(area).captain;if(cap&&cap.x===x&&cap.y===y)return 'C';
 if(isGrass(area,x,y))return 'g';
 return '.';
}
