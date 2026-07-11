import source from './campRandallTilemaps.json' with {type: 'json'};

export const CAMP_TILE_RUNTIME_VERSION = source.version;
export const CAMP_TILE_ATLAS = source.atlas;

export function campTilemap(area) {
  return source.areas[area] || null;
}

export function campRuntimeTile(area, x, y) {
  const map = campTilemap(area);
  if (!map || x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  const tileId = map.base[y][x];
  return {id: tileId, ...source.tiles[tileId]};
}

export function campRuntimeBlocked(area, x, y) {
  const tile = campRuntimeTile(area, x, y);
  return tile === null || tile.blocked;
}

export function campRuntimeStats() {
  return {
    version: source.version,
    tileCount: source.tileCount,
    areaCount: Object.keys(source.areas).length,
    atlasSha256: source.atlasSha256
  };
}
