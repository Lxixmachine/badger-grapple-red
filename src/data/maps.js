import {AREAS, TRAINERS, TOURNAMENT, WORLD_META} from './world.js';

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
export function isBlocked(area,x,y){
 if(x<0||x>27||y<0||y>13)return true;
 const n=areaFor(area).name;
 // Collision matches visible art. Open lanes first; decoration never blocks.
 if(n==='FIELD HOUSE'){
   // v19.5 exact 28x14 Field House rebuild: collision follows the approved tile plan.
   // Block only visible walls and large visible fixtures. The mat, floor lines, labels,
   // shadows, trim, signs, bottles, towels, and banners are non-solid.
   if(x===0||x===27||y===0||y===13)return true;
   if(y===1 && x!==14)return true; // top wall; center door only
   if(x>=1&&x<=3&&y>=2&&y<=3)return true; // coach desk
   if(x>=21&&x<=24&&y>=2&&y<=3)return true; // lockers
   if(x>=21&&x<=23&&y>=9&&y<=10)return true; // weights
   if(x>=7&&x<=9&&y===11)return true; // meeting table
   return false;
 }
 if(n==='CAMPUS QUAD'){
   if((x===0||x===27||y===0||y===13)&&!((x===14&&y===13)||(x===27&&y===7)||(x===1&&y===7)||(x===14&&y===1)))return true;
   if(x>=21&&x<=27&&y>=1&&y<=4 && !(x===23&&y>=3&&y<=4))return true; // studyhall door at y3, approach y4 (v21.6 art alignment)
   if(x>=4&&x<=6&&y>=7&&y<=8)return true;
   if(x>=8&&x<=10&&y>=1&&y<=2 && !(x===9&&y===2))return true; // shop building, door gap at top-of-door tile
   if(x>=17&&x<=19&&y>=1&&y<=2 && !(x===18&&y===2))return true; // recovery building, door gap
   return false;
 }
 if(n==='STUDY HALL')return y===0||x===0||x===27||y===13||((x<4||x>7)&&y===11);
 if(n==='TEAM SHOP'||n==='RECOVERY CENTER'){
   if(x===0||x===27||y===0||y===13)return true;
   if(y===1)return true; // back wall (windows/shelves are decor)
   if(y===12&&!(x>=13&&x<=15))return true; // v21.3 south wall; doorway open at 13-15
   if(x>=10&&x<=17&&y>=4&&y<=6)return true; // counter/table block
   return false;
 }
 if(n==='LAKESHORE')return (y>=2&&y<=6&&x>=17)||y===0||y===13;
 if(n==='DOWNTOWN')return y===0||y===13||((y<5||y>9)&&(x>3&&x<24));
 if(n==='RIVER TRAIL')return y===0||y===13||((x>7&&x<21)&&(y<7));
 if(n==='CONFERENCE ARENA'||n==='CHAMPIONSHIP HALL')return y===0||y===13||x===0||x===27;
 return false;
}
export function isGrass(area,x,y){const n=areaFor(area).name;return (n==='LAKESHORE'&&x>=3&&x<=13&&y>=3&&y<=10)||(n==='RIVER TRAIL'&&x>=4&&x<=11&&y>=5&&y<=11)||(n==='CAMPUS QUAD'&&((x>=3&&x<=7&&y>=2&&y<=5)||(x>=20&&x<=24&&y>=8&&y<=11)));}
export function spotKind(area,x,y){
 if(trainerAt(area,x,y))return 'TRAINER'; // v21.11: all trainers are data-driven, no per-area cases
 const n=areaFor(area).name;
 if(n==='FIELD HOUSE'){
   // v19.5 exact, non-overlapping interaction zones from the approved QA plan.
   if(x===14&&y===1)return 'EXIT';
   if(x===4&&(y===3||y===4))return 'N';
   if(x>=9&&x<=17&&y>=3&&y<=8)return 'M';
   if(x>=7&&x<=9&&y===10)return 'MEETING_ROOM';
   if(x>=21&&x<=24&&y===4)return 'LOCKER_ROOM';
   if(x===20&&(y===9||y===10))return 'WEIGHT_ROOM';
   if(x>=1&&x<=4&&y>=2&&y<=4)return 'COACH_OFFICE';
 }
 if((n==='TEAM SHOP'||n==='RECOVERY CENTER')&&x>=13&&x<=15&&y===11)return 'EXIT';
 if(n==='TEAM SHOP'&&x>=13&&x<=14&&y===7)return 'S';
 if(n==='RECOVERY CENTER'&&x>=13&&x<=14&&y===7)return 'R';
 if(n==='CAMPUS QUAD'){
   if(x===14&&y===7)return 'STATUE';
   if(x===5&&y===5)return 'SCOUT_NPC';
   if(x===11&&y===8)return 'SAVE_NPC';
   if(x===8&&y===10)return 'HIDDEN_TAPE';
   if(x===23&&y===2)return 'DOOR';
   if(x===18&&y===10)return 'HIDDEN_DRINK';
 }
 if(n==='STUDY HALL'){if(x===9&&y===8)return 'STUDY_NPC';if(x===12&&y===6)return 'HIDDEN_FILM';}
 if(TOURNAMENT.desk.area===area&&TOURNAMENT.desk.x===x&&TOURNAMENT.desk.y===y)return 'TOURNEY';
 const cap=areaFor(area).captain;if(cap&&cap.x===x&&cap.y===y)return 'C';
 if(isGrass(area,x,y))return 'g';
 return '.';
}
