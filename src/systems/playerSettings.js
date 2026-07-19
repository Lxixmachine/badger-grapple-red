export const TEXT_SPEEDS=Object.freeze(['slow','mid','fast']);
export const BATTLE_STYLES=Object.freeze(['shift','set']);
export const DEFAULT_PLAYER_SETTINGS=Object.freeze({
  textSpeed:'mid',
  battleScene:true,
  battleStyle:'shift'
});

const TEXT_DELAYS=Object.freeze({slow:32,mid:19,fast:10});

export function normalizePlayerSettings(settings={}){
  const source=settings&&typeof settings==='object'?settings:{};
  return {
    textSpeed:TEXT_SPEEDS.includes(source.textSpeed)?source.textSpeed:DEFAULT_PLAYER_SETTINGS.textSpeed,
    battleScene:typeof source.battleScene==='boolean'?source.battleScene:DEFAULT_PLAYER_SETTINGS.battleScene,
    battleStyle:BATTLE_STYLES.includes(source.battleStyle)?source.battleStyle:DEFAULT_PLAYER_SETTINGS.battleStyle
  };
}

export function textDelayFor(state,referenceDelay=19){
  const settings=normalizePlayerSettings(state?.settings),base=TEXT_DELAYS[settings.textSpeed];
  return Math.max(1,Math.round(base*(referenceDelay/19)));
}

export function battleSceneEnabled(state){
  return normalizePlayerSettings(state?.settings).battleScene;
}

export function battleStyleFor(state){
  return normalizePlayerSettings(state?.settings).battleStyle;
}

export function cyclePlayerSetting(settings,key,direction=1){
  const next=normalizePlayerSettings(settings),step=direction<0?-1:1;
  if(key==='textSpeed'){
    const index=TEXT_SPEEDS.indexOf(next.textSpeed);
    next.textSpeed=TEXT_SPEEDS[(index+step+TEXT_SPEEDS.length)%TEXT_SPEEDS.length];
  }else if(key==='battleScene')next.battleScene=!next.battleScene;
  else if(key==='battleStyle'){
    const index=BATTLE_STYLES.indexOf(next.battleStyle);
    next.battleStyle=BATTLE_STYLES[(index+step+BATTLE_STYLES.length)%BATTLE_STYLES.length];
  }
  return next;
}
