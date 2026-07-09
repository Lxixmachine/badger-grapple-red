export const TILE=16;
export const AREAS={
 fieldhouse:{name:'FIELD HOUSE',bg:'area_fieldhouse',start:{x:14,y:11},exits:[{x:14,y:1,to:'campus',tx:14,ty:12,msg:'You step out onto campus.'}],encounters:false},
 campus:{name:'CAMPUS QUAD',bg:'area_campus',start:{x:14,y:12},exits:[{x:14,y:13,to:'fieldhouse',tx:14,ty:2,msg:'Back inside the Field House.'},{x:23,y:2,to:'studyhall',tx:5,ty:10,msg:'Study Hall.'},{x:27,y:7,to:'lakeshore',tx:1,ty:7,msg:'Lakeshore path.'},{x:1,y:7,to:'downtown',tx:26,ty:7,msg:'Downtown Madison.'},{x:14,y:1,to:'conference',tx:14,ty:12,msg:'Conference Arena.'},{x:9,y:3,to:'shop',tx:14,ty:10,msg:'Team Shop.'},{x:18,y:3,to:'recovery',tx:14,ty:10,msg:'Recovery Center.'}],encounters:true},
 studyhall:{name:'STUDY HALL',bg:'area_fieldhouse',start:{x:5,y:10},exits:[{x:5,y:11,to:'campus',tx:23,ty:3,msg:'Campus Quad.'}],encounters:false},
 shop:{name:'TEAM SHOP',bg:'area_shop',start:{x:14,y:10},exits:[{x:13,y:12,to:'campus',tx:9,ty:4,msg:'Campus Quad.'},{x:14,y:12,to:'campus',tx:9,ty:4,msg:'Campus Quad.'},{x:15,y:12,to:'campus',tx:9,ty:4,msg:'Campus Quad.'}],encounters:false},
 recovery:{name:'RECOVERY CENTER',bg:'area_recovery',start:{x:14,y:10},exits:[{x:13,y:12,to:'campus',tx:18,ty:4,msg:'Campus Quad.'},{x:14,y:12,to:'campus',tx:18,ty:4,msg:'Campus Quad.'},{x:15,y:12,to:'campus',tx:18,ty:4,msg:'Campus Quad.'}],encounters:false},
 lakeshore:{name:'LAKESHORE',bg:'area_lakeshore',start:{x:1,y:7},exits:[{x:0,y:7,to:'campus',tx:26,ty:7,msg:'Campus Quad.'},{x:27,y:9,to:'river',tx:1,ty:9,msg:'River Trail.'}],encounters:true},
 downtown:{name:'DOWNTOWN',bg:'area_downtown',start:{x:26,y:7},exits:[{x:27,y:7,to:'campus',tx:1,ty:7,msg:'Campus Quad.'}],encounters:false},
 river:{name:'RIVER TRAIL',bg:'area_river',start:{x:1,y:9},exits:[{x:0,y:9,to:'lakeshore',tx:26,ty:9,msg:'Lakeshore.'},{x:27,y:6,to:'championship',tx:1,ty:6,msg:'Championship Hall.',gate:['Neutral Badge','Scramble Badge']}],encounters:true,captain:{x:24,y:9,id:'scrambleboss',lvl:14,type:'gym',badge:'Scramble Badge',team:[['funklord',13],['scrambleboss',14]],reward:{grit:26,rep:16},intro:'The Funk Doctor: Solve the scramble or get solved.',beaten:'The Funk Doctor: Scramble Badge earned. The river road to Championship is open.'}},
 conference:{name:'CONFERENCE ARENA',bg:'area_conference',start:{x:14,y:12},exits:[{x:14,y:13,to:'campus',tx:14,ty:2,msg:'Campus Quad.'}],captain:{x:14,y:5,id:'captainneutral',lvl:8,type:'gym',badge:'Neutral Badge',team:[['drillpartner',7],['captainneutral',8]],reward:{grit:22,rep:14},intro:'Captain Neutral: Show me you can win one real varsity dual.',beaten:'Captain Neutral: Neutral Badge earned. Lakeshore and the River Trail are open.'}},
 championship:{name:'CHAMPIONSHIP HALL',bg:'area_championship',start:{x:1,y:6},exits:[{x:0,y:6,to:'river',tx:26,ty:6,msg:'River Trail.'}],captain:{x:19,y:6,id:'topboss',lvl:17,type:'gym',badge:'Top Badge',team:[['lockthrow',15],['rideking',16],['topboss',17]],reward:{grit:34,rep:26},intro:'The Anchor: Everyone who walks in here gets ridden. Prove me wrong.',beaten:'The Anchor: Top Badge earned. That is the whole conference schedule. Well wrestled.'}}
};
export function canUseExit(state,exit){if(!exit.gate)return true;const badges=state.badges||[];return exit.gate.every(b=>badges.includes(b));}
export function gateMessage(exit){const need=exit.gate||[];return `That route needs: ${need.join(' + ')}.`;}
export const TRAINERS={
 campus_recruit:{id:'campus_recruit',area:'campus',name:'Buckshot',pos:{x:22,y:9},facing:'left',sightRange:5,team:[['drillpartner',6],['pacesetter',6]],reward:{grit:9,rep:8},line:'Buckshot: Want to test yourself? Two matches, back to back.',beaten:'Buckshot: Good matches. Come back stronger.',spot:'Buckshot: Hey — you! Let\'s go!'},
 campus_rival:{id:'campus_rival',area:'campus',name:'Rex',pos:{x:17,y:5},facing:'down',sightRange:5,team:[['lakechain',7],['fieldflyer',7]],reward:{grit:12,rep:10},line:'Rex: Build your lineup all you want. I still want that dual meet. Right now.',beaten:'Rex: Fine. You earned that one. Next time I bring a real team.',spot:'Rex: There you are. No walking away this time.'}
};
export function trainersInArea(area){return Object.values(TRAINERS).filter(t=>t.area===area);}
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
   if(x>=21&&x<=27&&y>=1&&y<=4 && !(x===23&&y>=2&&y<=4))return true; // studyhall door corridor open (v21.2 fix: door was sealed)
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
   if(x===22&&y===9)return 'RECRUIT_NPC';
   if(x===11&&y===8)return 'SAVE_NPC';
   if(x===17&&y===5)return 'RIVAL_NPC';
   if(x===8&&y===10)return 'HIDDEN_TAPE';
   if(x===23&&y===2)return 'DOOR';
   if(x===18&&y===10)return 'HIDDEN_DRINK';
 }
 if(n==='STUDY HALL'){if(x===9&&y===8)return 'STUDY_NPC';if(x===12&&y===6)return 'HIDDEN_FILM';}
 const cap=areaFor(area).captain;if(cap&&cap.x===x&&cap.y===y)return 'C';
 if(isGrass(area,x,y))return 'g';
 return '.';
}
