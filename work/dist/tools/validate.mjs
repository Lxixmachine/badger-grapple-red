import {ROSTER,STARTERS} from '../src/data/roster.js';
import {MOVES} from '../src/data/moves.js';
import {AREAS,TRAINERS,isBlocked} from '../src/data/maps.js';
let errs=[];
for(const [id,r] of Object.entries(ROSTER)){
  (r.moves||[]).forEach(mk=>{if(!MOVES[mk])errs.push(`roster ${id}: move '${mk}' missing from MOVES`);});
  if(r.evolvesTo&&!ROSTER[r.evolvesTo])errs.push(`roster ${id}: evolvesTo '${r.evolvesTo}' missing from ROSTER`);
  if(r.evolvesTo&&!r.evolveLvl)errs.push(`roster ${id}: has evolvesTo but no evolveLvl`);
}
STARTERS.forEach(id=>{if(!ROSTER[id])errs.push(`STARTERS references missing roster id '${id}'`);});
for(const [aid,a] of Object.entries(AREAS)){
  if(a.captain){
    if(!ROSTER[a.captain.id])errs.push(`area ${aid} captain id '${a.captain.id}' missing from ROSTER`);
    (a.captain.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`area ${aid} captain team member '${id}' missing from ROSTER`);});
    if(!a.captain.badge)errs.push(`area ${aid} captain has no badge name`);
  }
  (a.exits||[]).forEach(e=>{
    if(!AREAS[e.to])errs.push(`area ${aid} exit -> missing area '${e.to}'`);
    if(e.gate){e.gate.forEach(b=>{
      const grantedSomewhere=Object.values(AREAS).some(a2=>a2.captain?.badge===b);
      if(!grantedSomewhere)errs.push(`area ${aid} exit gate references badge '${b}' that no captain grants`);
    });}
  });
}
// v21.2: every exit must be reachable from the area's spawn, and every
// warp landing tile must be walkable. Catches sealed doors (the Study Hall
// class of bug) before they ship.
function bfsReach(area,sx,sy,tx,ty){
  const seen=new Set([sx+','+sy]);const q=[[sx,sy]];
  while(q.length){const [x,y]=q.shift();if(x===tx&&y===ty)return true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;
      if(nx<0||nx>27||ny<0||ny>13)continue;
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
  (t.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`trainer ${tid} team member '${id}' missing from ROSTER`);});
  if(!t.team||!t.team.length)errs.push(`trainer ${tid} has empty team`);
}
console.log(errs.length?errs.join('\n'):`ALL VALID — ${Object.keys(ROSTER).length} roster entries, ${Object.keys(MOVES).length} moves, ${Object.keys(AREAS).length} areas, ${Object.keys(TRAINERS).length} trainers.`);
if(errs.length)process.exit(1);
