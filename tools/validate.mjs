import {ROSTER,STARTERS,PERSONAS} from '../src/data/roster.js';
import {MOVES} from '../src/data/moves.js';
import {AREAS,TRAINERS,TOURNAMENT,WORLD_META,TILE,areaDimensions,isBlocked,worldPlane,WILD_SLOTS,WILD_SLOT_CHANCES} from '../src/data/maps.js';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {LAYERED_MAPS,LAYERED_MAP_VERSION} from '../src/data/layeredMaps.js';
import {CAMP_TILE_RUNTIME_VERSION,campTilemap,campRuntimeStats,campRuntimeTile} from '../src/data/campRandallTilemaps.js';

let errs=[];
const inBounds=(area,x,y)=>{const {width,height}=areaDimensions(area);return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<width&&y>=0&&y<height;};

if(WORLD_META.tileSize!==TILE)errs.push(`WORLD_META.tileSize ${WORLD_META.tileSize} does not match TILE ${TILE}`);
if(WORLD_META.width!==28||WORLD_META.height!==14||WORLD_META.maxWidth<56||WORLD_META.maxHeight<20)errs.push('WORLD_META must retain 28x14 defaults and support 56-wide routes plus the 20-row Bascom Hill map');

if(LAYERED_MAP_VERSION!==1)errs.push(`layered map version ${LAYERED_MAP_VERSION} is unsupported`);
if(CAMP_TILE_RUNTIME_VERSION!==1)errs.push(`Camp Randall tile runtime version ${CAMP_TILE_RUNTIME_VERSION} is unsupported`);
const campAtlas=fileURLToPath(new URL('../public/assets/tiles/camp_randall_runtime_tiles.png',import.meta.url));
if(!existsSync(campAtlas))errs.push('Camp Randall runtime atlas is missing');
else{
  const atlasHash=createHash('sha256').update(readFileSync(campAtlas)).digest('hex');
  if(atlasHash!==campRuntimeStats().atlasSha256)errs.push('Camp Randall runtime atlas is stale; run npm run build:camp-tiles');
}
for(const [aid,map] of Object.entries(LAYERED_MAPS)){
  if(!AREAS[aid]){errs.push(`layered area ${aid}: missing from AREAS`);continue;}
  if(map.tiles.length!==map.height)errs.push(`layered area ${aid}: ${map.tiles.length} rows != height ${map.height}`);
  map.tiles.forEach((row,y)=>{
    if(row.length!==map.width)errs.push(`layered area ${aid}: row ${y} width ${row.length} != ${map.width}`);
    for(let x=0;x<row.length;x++){
      if(!'.#XgE'.includes(row[x]))errs.push(`layered area ${aid}: unsupported tile '${row[x]}' at (${x},${y})`);
      if(isBlocked(aid,x,y)!=='#X'.includes(row[x]))errs.push(`layered area ${aid}: collision diverges at (${x},${y})`);
    }
  });
  const missingDecor=!map.bakedComposition&&!map.tileRuntime&&(!map.lowerDecor?.length||!map.upperDecor?.length);
  if(missingDecor||!map.interactions?.length||(!map.npcs?.length&&!map.allowEmptyNpcs))errs.push(`layered area ${aid}: authored composition/decor, interactions, and NPC layers must be populated`);
  if(map.tileRuntime){
    const runtime=campTilemap(aid);
    if(!runtime)errs.push(`layered area ${aid}: tileRuntime has no compiled map`);
    else if(runtime.width!==map.width||runtime.height!==map.height)errs.push(`layered area ${aid}: compiled tile dimensions diverge`);
    else{
      const sourcePath=fileURLToPath(new URL(`../public/assets/ui/${runtime.source}`,import.meta.url));
      const sourceHash=createHash('sha256').update(readFileSync(sourcePath)).update(map.tiles.join('\n')).digest('hex');
      if(sourceHash!==runtime.sourceSha256)errs.push(`layered area ${aid}: compiled tile runtime is stale; run npm run build:camp-tiles`);
      for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
        const tile=campRuntimeTile(aid,x,y);
        if(!tile)errs.push(`layered area ${aid}: missing compiled tile at (${x},${y})`);
        else if(tile.blocked!=='#X'.includes(map.tiles[y][x]))errs.push(`layered area ${aid}: compiled tile behavior diverges at (${x},${y})`);
      }
    }
  }
  for(const exit of map.exits||[]){if(map.tiles[exit.y]?.[exit.x]!=='E')errs.push(`layered area ${aid}: exit (${exit.x},${exit.y}) is not marked E`);}
  for(const upper of map.upperDecor||[]){
    if(!Number.isFinite(upper.depthY))errs.push(`layered area ${aid}: upper ${upper.texture} has no depthY`);
    const asset=fileURLToPath(new URL(`../public/assets/layers/${upper.texture}.png`,import.meta.url));
    if(!existsSync(asset))errs.push(`layered area ${aid}: upper texture ${upper.texture}.png is missing`);
  }
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)if(map.tiles[y][x]==='X'){
    const covered=(map.upperDecor||[]).some(entry=>entry.source==='tileQuad'&&x>=entry.x&&x<=entry.x+1&&y===entry.y+1);
    if(!covered)errs.push(`layered area ${aid}: occlusion collision X at (${x},${y}) has no tree canopy owner`);
  }
}

for(const [id,r] of Object.entries(ROSTER)){
  (r.moves||[]).forEach(mk=>{if(!MOVES[mk])errs.push(`roster ${id}: move '${mk}' missing from MOVES`);});
  if(r.evolvesTo&&!ROSTER[r.evolvesTo])errs.push(`roster ${id}: evolvesTo '${r.evolvesTo}' missing from ROSTER`);
  if(r.evolvesTo&&!r.evolveLvl)errs.push(`roster ${id}: has evolvesTo but no evolveLvl`);
}
STARTERS.forEach(id=>{if(!ROSTER[id])errs.push(`STARTERS references missing roster id '${id}'`);});

for(const [aid,a] of Object.entries(AREAS)){
  if(!/^[a-z][a-z0-9_]*$/.test(aid))errs.push(`area id '${aid}' must be a stable lowercase data id`);
  if(!a.name||!a.bg)errs.push(`area ${aid}: missing name or bg`);
  if(!inBounds(aid,a.start?.x,a.start?.y))errs.push(`area ${aid}: start (${a.start?.x},${a.start?.y}) out of bounds`);
  if(inBounds(aid,a.start?.x,a.start?.y)&&isBlocked(aid,a.start.x,a.start.y))errs.push(`area ${aid}: start (${a.start.x},${a.start.y}) is BLOCKED`);

  if(a.encounters){
    const wl=a.wildLevels;
    if(!Array.isArray(wl)||wl.length!==2||!Number.isInteger(wl[0])||!Number.isInteger(wl[1])||wl[0]<1||wl[0]>wl[1])errs.push(`area ${aid}: encounters need wildLevels [min,max] with 1<=min<=max`);
  }
  if(a.captain){
    if(!ROSTER[a.captain.id])errs.push(`area ${aid} captain id '${a.captain.id}' missing from ROSTER`);
    if(!inBounds(aid,a.captain.x,a.captain.y))errs.push(`area ${aid}: captain at (${a.captain.x},${a.captain.y}) out of bounds`);
    (a.captain.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`area ${aid} captain team member '${id}' missing from ROSTER`);});
    if(!a.captain.badge)errs.push(`area ${aid} captain has no badge name`);
  }

  (a.exits||[]).forEach(e=>{
    if(!AREAS[e.to])errs.push(`area ${aid} exit -> missing area '${e.to}'`);
    if(!inBounds(aid,e.x,e.y))errs.push(`area ${aid}: exit to '${e.to}' at (${e.x},${e.y}) out of bounds`);
    if(AREAS[e.to]&&!inBounds(e.to,e.tx,e.ty))errs.push(`area ${aid}: exit to '${e.to}' lands at (${e.tx},${e.ty}) out of bounds`);
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
      if(!inBounds(area,nx,ny))continue;
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
  if(AREAS[t.area]&&!inBounds(t.area,t.pos?.x,t.pos?.y))errs.push(`trainer ${tid}: position (${t.pos?.x},${t.pos?.y}) out of bounds`);
  if(AREAS[t.area]&&inBounds(t.area,t.pos?.x,t.pos?.y)&&isBlocked(t.area,t.pos.x,t.pos.y))errs.push(`trainer ${tid}: position (${t.pos.x},${t.pos.y}) is BLOCKED`);
  if(!['up','down','left','right'].includes(t.facing))errs.push(`trainer ${tid}: invalid facing '${t.facing}'`);
  if(t.look&&!['red','green','purple','gold','gray'].includes(t.look))errs.push(`trainer ${tid}: look '${t.look}' has no generated npc_walk variant`);
  if(!Number.isInteger(t.sightRange)||t.sightRange<1)errs.push(`trainer ${tid}: sightRange must be a positive integer`);
  (t.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`trainer ${tid} team member '${id}' missing from ROSTER`);});
  if(!t.team||!t.team.length)errs.push(`trainer ${tid} has empty team`);
  // v21.11: trainers must be BFS-reachable from the area spawn and their
  // sight cone must start on a walkable tile (a dead cone can never fire).
  if(AREAS[t.area]&&inBounds(t.area,t.pos?.x,t.pos?.y)){
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

// v21.43 Gen-1 encounter slots: every encounter area needs a 10-slot table,
// canonical 256-sum chances, roster-valid ids, and levels inside the band.
if(WILD_SLOT_CHANCES.reduce((a,b)=>a+b,0)!==256)errs.push('WILD_SLOT_CHANCES must sum to 256 (pokered contract)');
for(const [aid,a] of Object.entries(AREAS)){
  if(!a.encounters)continue;
  const slots=WILD_SLOTS[aid];
  if(!slots){errs.push(`area ${aid}: encounters enabled but no WILD_SLOTS table`);continue;}
  if(slots.length!==WILD_SLOT_CHANCES.length)errs.push(`area ${aid}: WILD_SLOTS needs ${WILD_SLOT_CHANCES.length} slots, has ${slots.length}`);
  slots.forEach(([lvl,id],i)=>{
    if(!ROSTER[id])errs.push(`area ${aid} slot ${i}: id '${id}' missing from ROSTER`);
    const [lo,hi]=a.wildLevels||[1,99];
    if(lvl<lo||lvl>hi)errs.push(`area ${aid} slot ${i}: level ${lvl} outside wild band ${lo}-${hi}`);
  });
}

// One-plane law (v21.40): the outdoor world must stitch into a single
// consistent geography via exit offsets - the Town Map renders from it.
const plane=worldPlane();
plane.conflicts.forEach(c=>errs.push(`world plane contradiction: ${c}`));
for(const id of WORLD_META.activeOutdoorAreas)if(!plane.pos[id])errs.push(`world plane: outdoor area '${id}' is unreachable from campus via outdoor exits`);
const campStats=campRuntimeStats();
const manifestPath=fileURLToPath(new URL('../art/imagegen/camp_randall_object_manifest.json',import.meta.url));
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const manifestBuildPath=fileURLToPath(new URL('../src/data/campRandallManifestBuild.json',import.meta.url));
if(!existsSync(manifestBuildPath))errs.push('Camp Randall manifest build record is missing; run npm run build:camp-manifest');
else{
  const build=JSON.parse(readFileSync(manifestBuildPath,'utf8'));
  if(build.version!==1||build.tileSize!==TILE)errs.push('Camp Randall manifest build version/tile size is unsupported');
  for(const [path,expected] of Object.entries(build.inputSha256||{})){
    const source=fileURLToPath(new URL(`../${path}`,import.meta.url));
    const actual=createHash('sha256').update(readFileSync(source)).digest('hex');
    if(actual!==expected)errs.push(`Camp Randall manifest input ${path} is stale; run npm run build:camp-manifest`);
  }
  for(const [path,expected] of Object.entries(build.outputSha256||{})){
    const output=fileURLToPath(new URL(`../${path}`,import.meta.url));
    if(!existsSync(output))errs.push(`Camp Randall generated output ${path} is missing; run npm run build:camp-manifest`);
    else{
      const actual=createHash('sha256').update(readFileSync(output)).digest('hex');
      if(actual!==expected)errs.push(`Camp Randall generated output ${path} is stale; run npm run build:camp-manifest`);
    }
  }
}
const fillRect=(grid,rect,value)=>{const [x1,y1,x2,y2]=rect;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=value;};
for(const [aid,spec] of Object.entries(manifest.areas)){
  const map=LAYERED_MAPS[aid];
  if(!map){errs.push(`manifest area ${aid} has no runtime map`);continue;}
  if(map.manifestRuntime!=='camp-randall-objects-v1')errs.push(`manifest area ${aid} is not marked as object-owned runtime`);
  if(map.width!==spec.width||map.height!==spec.height)errs.push(`manifest area ${aid} dimensions diverge`);
  const expected=Array.from({length:spec.height},()=>Array(spec.width).fill('.'));
  for(const rect of spec.walls.solidRects)fillRect(expected,rect,'#');
  for(const [x,y] of spec.walls.openCells||[])expected[y][x]='.';
  for(const object of spec.objects){
    if(!object.walkable)fillRect(expected,object.footprint,'#');
    for(const [x,y] of object.walkableCells||[])expected[y][x]='.';
    for(const [x,y] of object.doorCells||[])expected[y][x]='E';
    const upper=(map.upperDecor||[]).filter(entry=>entry.owner===object.id);
    if(object.riseRows>0){
      if(upper.length!==1)errs.push(`manifest ${aid}/${object.id}: expected one owned foreground, found ${upper.length}`);
      else{
        const [x1,,x2]=object.footprint;
        const asset=fileURLToPath(new URL(`../public/assets/layers/${upper[0].texture}.png`,import.meta.url));
        if(!existsSync(asset))errs.push(`manifest ${aid}/${object.id}: foreground asset missing`);
        else{
          const png=readFileSync(asset);const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
          if(width!==(x2-x1+1)*TILE||height!==object.riseRows*TILE)errs.push(`manifest ${aid}/${object.id}: foreground is ${width}x${height}, expected ${(x2-x1+1)*TILE}x${object.riseRows*TILE}`);
        }
      }
    }else if(upper.length)errs.push(`manifest ${aid}/${object.id}: zero-rise object owns a foreground`);
  }
  for(const [x,y] of spec.walls.exitCells||[])expected[y][x]='E';
  expected.forEach((row,y)=>{if(row.join('')!==map.tiles[y])errs.push(`manifest area ${aid}: collision row ${y} was not generated from object footprints`);});
}
if(campStats.tileCount>700)errs.push(`Camp Randall runtime has ${campStats.tileCount} tiles; reusable-kit budget is 700`);
console.log(errs.length?errs.join('\n'):`ALL VALID - ${Object.keys(ROSTER).length} roster entries, ${Object.keys(MOVES).length} moves, ${Object.keys(AREAS).length} areas, ${Object.keys(TRAINERS).length} trainers. Default ${WORLD_META.width}x${WORLD_META.height}, Camp Randall ${areaDimensions('campus').width}x${areaDimensions('campus').height}@${WORLD_META.tileSize}, tile runtime v${campStats.version}/${campStats.tileCount} tiles.`);
if(errs.length)process.exit(1);
