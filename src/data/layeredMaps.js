import source from './layeredMaps.json' with {type: 'json'};
import campRandall from './campRandallMaps.json' with {type: 'json'};

export const LAYERED_MAP_VERSION=source.version;
export const LAYERED_MAPS={...source.areas,...campRandall.areas};

export function layeredMap(area){return LAYERED_MAPS[area]||null;}

export function layeredTile(area,x,y){
  const map=layeredMap(area);
  if(!map||x<0||y<0||x>=map.width||y>=map.height)return null;
  return map.tiles[y][x];
}

export function layeredBlocked(area,x,y){
  const tile=layeredTile(area,x,y);
  return tile===null||tile==='#'||tile==='X';
}

export function layeredGrass(area,x,y){return layeredTile(area,x,y)==='g';}

export function layeredInteraction(area,x,y){
  const map=layeredMap(area);
  if(!map)return null;
  for(const entry of map.interactions||[]){
    if(entry.tiles?.some(([tx,ty])=>tx===x&&ty===y))return entry.kind;
    if(entry.rect){const [x1,y1,x2,y2]=entry.rect;if(x>=x1&&x<=x2&&y>=y1&&y<=y2)return entry.kind;}
  }
  return null;
}

export function layeredSign(area,x,y){return layeredMap(area)?.signs?.[`${x},${y}`]||null;}

export function layeredNpcs(area){return layeredMap(area)?.npcs||[];}

export function layeredUpperDecor(area){return layeredMap(area)?.upperDecor||[];}

export function layeredWaterRects(area){return layeredMap(area)?.waterRects||[];}

export const LAYERED_UPPER_TEXTURES=[...new Set(Object.values(LAYERED_MAPS).flatMap(map=>(map.upperDecor||[]).map(entry=>entry.texture)))];
