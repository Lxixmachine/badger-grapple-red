export const BATTLE_ARENAS=Object.freeze({
  fieldhouse:Object.freeze({key:'fieldhouse',texture:'battle_arena_fieldhouse',accent:0xb71f2c,dark:0x24191b}),
  campus:Object.freeze({key:'campus',texture:'battle_arena_campus',accent:0x6f8f4f,dark:0x1d2c20}),
  lakeshore:Object.freeze({key:'lakeshore',texture:'battle_arena_lakeshore',accent:0x4d91ad,dark:0x172a34}),
  downtown:Object.freeze({key:'downtown',texture:'battle_arena_downtown',accent:0x9b573e,dark:0x2c211d}),
  bascom:Object.freeze({key:'bascom',texture:'battle_arena_bascom',accent:0xb89459,dark:0x29231c}),
  capitol:Object.freeze({key:'capitol',texture:'battle_arena_capitol',accent:0xd1a443,dark:0x2e211b}),
  kohl:Object.freeze({key:'kohl',texture:'battle_arena_kohl',accent:0xb71f2c,dark:0x1b1719}),
  nationals:Object.freeze({key:'nationals',texture:'battle_arena_nationals',accent:0xd1a443,dark:0x101b31})
});

export const BATTLE_ARENA_KEYS=Object.freeze(Object.keys(BATTLE_ARENAS));

const AREA_ARENAS=Object.freeze({
  team_locker_room:'fieldhouse',wrestling_room:'fieldhouse',field_house_floor:'fieldhouse',fieldhouse:'fieldhouse',
  camp_randall:'campus',r1:'campus',route_one:'campus',campus:'campus',
  lakeshore:'lakeshore',lakeshore_path:'lakeshore',picnic_point:'lakeshore',monona_shore:'lakeshore',
  state_street:'downtown',downtown:'downtown',
  bascom_hill:'bascom',bascom:'bascom',
  capitol_interior:'capitol',capitol:'capitol',
  kohl_center:'kohl',kohl_bracket_floor:'kohl',conference:'kohl',
  airport:'nationals',nationals_floor:'nationals',nationals:'nationals',championship:'nationals'
});

export function battleArenaForArea(area){
  return AREA_ARENAS[String(area||'').toLowerCase()]||null;
}

export function resolveBattleArena({arenaKey,area,battleType}={}){
  if(BATTLE_ARENAS[arenaKey])return arenaKey;
  const areaKey=battleArenaForArea(area);if(areaKey)return areaKey;
  if(battleType==='tournament')return 'kohl';
  if(battleType==='wild')return 'campus';
  return 'fieldhouse';
}
