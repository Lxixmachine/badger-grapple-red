export const NPC_LOOKS=Object.freeze([
  'coach',
  'trainer',
  'rex',
  'captain',
  'wrestler',
  'manager',
  'scout',
  'student',
  'official',
  'athlete',
  'camper'
]);

const LOOK_SET=new Set(NPC_LOOKS);

export function npcTextureKey(look){
  return LOOK_SET.has(look)?`npc_${look}`:'npc';
}
