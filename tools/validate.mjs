import {ROSTER,STARTERS,PERSONAS} from '../src/data/roster.js';
import {MOVES} from '../src/data/moves.js';
import {AREAS,TRAINERS,TOURNAMENT,WORLD_META,TILE,isBlocked} from '../src/data/maps.js';

let errs=[];
const inBounds=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<WORLD_META.width&&y>=0&&y<WORLD_META.height;

if(WORLD_META.tileSize!==TILE)errs.push(`WORLD_META.tileSize ${WORLD_META.tileSize} does not match TILE ${TILE}`);
if(WORLD_META.width!==28||WORLD_META.height!==14)errs.push('WORLD_META dimensions must stay 28x14 until camera, art, and collision are migrated together');

for(const [id,r] of Object.entries(ROSTER)){
  (r.moves||[]).forEach(mk=>{if(!MOVES[mk])errs.push(`roster ${id}: move '${mk}' missing from MOVES`);});
  if(r.evolvesTo&&!ROSTER[r.evolvesTo])errs.push(`roster ${id}: evolvesTo '${r.evolvesTo}' missing from ROSTER`);
  if(r.evolvesTo&&!r.evolveLvl)errs.push(`roster ${id}: has evolvesTo but no evolveLvl`);
}
STARTERS.forEach(id=>{if(!ROSTER[id])errs.push(`STARTERS references missing roster id '${id}'`);});

for(const [aid,a] of Object.entries(AREAS)){
  if(!/^[a-z][a-z0-9_]*$/.test(aid))errs.push(`area id '${aid}' must be a stable lowercase data id`);
  if(!a.name||!a.bg)errs.push(`area ${aid}: missing name or bg`);
  if(!inBounds(a.start?.x,a.start?.y))errs.push(`area ${aid}: start (${a.start?.x},${a.start?.y}) out of bounds`);
  if(inBounds(a.start?.x,a.start?.y)&&isBlocked(aid,a.start.x,a.start.y))errs.push(`area ${aid}: start (${a.start.x},${a.start.y}) is BLOCKED`);

  if(a.encounters){
    const wl=a.wildLevels;
    if(!Array.isArray(wl)||wl.length!==2||!Number.isInteger(wl[0])||!Number.isInteger(wl[1])||wl[0]<1||wl[0]>wl[1])errs.push(`area ${aid}: encounters need wildLevels [min,max] with 1<=min<=max`);
  }
  if(a.captain){
    if(!ROSTER[a.captain.id])errs.push(`area ${aid} captain id '${a.captain.id}' missing from ROSTER`);
    if(!inBounds(a.captain.x,a.captain.y))errs.push(`area ${aid}: captain at (${a.captain.x},${a.captain.y}) out of bounds`);
    (a.captain.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`area ${aid} captain team member '${id}' missing from ROSTER`);});
    if(!a.captain.badge)errs.push(`area ${aid} captain has no badge name`);
  }

  (a.exits||[]).forEach(e=>{
    if(!AREAS[e.to])errs.push(`area ${aid} exit -> missing area '${e.to}'`);
    if(!inBounds(e.x,e.y))errs.push(`area ${aid}: exit to '${e.to}' at (${e.x},${e.y}) out of bounds`);
    if(!inBounds(e.tx,e.ty))errs.push(`area ${aid}: exit to '${e.to}' lands at (${e.tx},${e.ty}) out of bounds`);
    if(e.gate){e.gate.forEach(b=>{
      const grantedSomewhere=Object.values(AREAS).some(a2=>a2.captain?.badge===b);
      if(!grantedSomewhere)errs.push(`area ${aid} exit gate references badge '${b}' that no captain grants`);
    });}
  });
}

function bfsReach(area,sx,sy,tx,ty){
  const seen=new Set([sx+','+sy]);const q=[[sx,sy]];
  while(q.length){const [x,y]=q.shift();if(x===tx&&y===ty)return true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;
      if(!inBounds(nx,ny))continue;
      const k=nx+','+ny;if(seen.has(k))continue;seen.add(k);
      if(!isBlocked(area,nx,ny)||(nx===tx&&ny===ty))q.push([nx,ny]);
    }}
  return false;
}

for(const [aid,a] of Object.entries(AREAS)){
  (a.exits||[]).forEach(e=>{
    if(!bfsReach(aid,a.start.x,a.start.y,e.x,e.y))errs.push(`area ${aid}: exit to '${e.to}' at (${e.x},${e.y}) is UNREACHABLE from spawn`);
    if(AREAS[e.to]&&isBlocked(e.to,e.tx,e.ty))errs.push(`area ${aid}: warp to '${e.to}' lands on BLOCKED tile (${e.tx},${e.ty})`);
  });
  if(a.captain&&!bfsReach(aid,a.start.x,a.start.y,a.captain.x,a.captain.y+1)&&!bfsReach(aid,a.start.x,a.start.y,a.captain.x,a.captain.y-1))errs.push(`area ${aid}: captain at (${a.captain.x},${a.captain.y}) may be unreachable`);
}

for(const [tid,t] of Object.entries(TRAINERS)){
  if(!AREAS[t.area])errs.push(`trainer ${tid}: area '${t.area}' missing from AREAS`);
  if(!inBounds(t.pos?.x,t.pos?.y))errs.push(`trainer ${tid}: position (${t.pos?.x},${t.pos?.y}) out of bounds`);
  if(AREAS[t.area]&&inBounds(t.pos?.x,t.pos?.y)&&isBlocked(t.area,t.pos.x,t.pos.y))errs.push(`trainer ${tid}: position (${t.pos.x},${t.pos.y}) is BLOCKED`);
  if(!['up','down','left','right'].includes(t.facing))errs.push(`trainer ${tid}: invalid facing '${t.facing}'`);
  if(t.look&&!['red','green','purple','gold','gray'].includes(t.look))errs.push(`trainer ${tid}: look '${t.look}' has no generated npc_walk variant`);
  if(!Number.isInteger(t.sightRange)||t.sightRange<1)errs.push(`trainer ${tid}: sightRange must be a positive integer`);
  (t.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`trainer ${tid} team member '${id}' missing from ROSTER`);});
  if(!t.team||!t.team.length)errs.push(`trainer ${tid} has empty team`);
  // v21.11: trainers must be BFS-reachable from the area spawn and their
  // sight cone must start on a walkable tile (a dead cone can never fire).
  if(AREAS[t.area]&&inBounds(t.pos?.x,t.pos?.y)){
    const a=AREAS[t.area];
    if(!bfsReach(t.area,a.start.x,a.start.y,t.pos.x,t.pos.y))errs.push(`trainer ${tid}: UNREACHABLE from '${t.area}' spawn`);
    const d={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[t.facing];
    if(d&&isBlocked(t.area,t.pos.x+d[0],t.pos.y+d[1]))errs.push(`trainer ${tid}: first sight tile (${t.pos.x+d[0]},${t.pos.y+d[1]}) is blocked - cone is dead`);
  }
}

// v21.12: Big Ten Championship integrity - the desk must be reachable, its badge
// gate must be grantable, and every bracket team must exist in the roster.
if(!AREAS[TOURNAMENT.desk.area])errs.push(`tournament desk area '${TOURNAMENT.desk.area}' missing`);
else{
  const a=AREAS[TOURNAMENT.desk.area];
  if(isBlocked(TOURNAMENT.desk.area,TOURNAMENT.desk.x,TOURNAMENT.desk.y))errs.push('tournament desk stands on a BLOCKED tile');
  if(!bfsReach(TOURNAMENT.desk.area,a.start.x,a.start.y,TOURNAMENT.desk.x,TOURNAMENT.desk.y))errs.push('tournament desk is UNREACHABLE from the hall spawn');
}
TOURNAMENT.requires.forEach(b=>{if(!Object.values(AREAS).some(a2=>a2.captain?.badge===b))errs.push(`tournament requires badge '${b}' that no captain grants`);});
if(TOURNAMENT.rounds.length!==3)errs.push('tournament must have exactly 3 rounds (round counter and champion flag assume it)');
TOURNAMENT.rounds.forEach((r,i)=>{
  if(!r.team||!r.team.length)errs.push(`tournament round ${i} has an empty team`);
  (r.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`tournament round ${i} team member '${id}' missing from ROSTER`);});
  if(!r.trainerName||!r.intro||!r.win)errs.push(`tournament round ${i} is missing trainerName/intro/win text`);
});
for(const [id,r] of Object.entries(ROSTER)){if(!PERSONAS[r.asset])errs.push(`roster ${id}: asset '${r.asset}' has no persona name (battle-form fiction breaks)`);}
console.log(errs.length?errs.join('\n'):`ALL VALID - ${Object.keys(ROSTER).length} roster entries, ${Object.keys(MOVES).length} moves, ${Object.keys(AREAS).length} areas, ${Object.keys(TRAINERS).length} trainers. World ${WORLD_META.width}x${WORLD_META.height}@${WORLD_META.tileSize}.`);
if(errs.length)process.exit(1);
