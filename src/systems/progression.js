import {canonicalBadge,SEASON_ONE_BADGES} from '../data/campaign.js';

export function grantKeyItem(state,key){state.keyItems=state.keyItems||{};state.keyItems[key]=true;return key;}
export function hasKeyItem(state,key){return !!state.keyItems?.[key];}

export function unlockTown(state,townId){
  state.travel=state.travel||{unlockedTowns:['campRandall']};
  if(!state.travel.unlockedTowns.includes(townId))state.travel.unlockedTowns.push(townId);
  return state.travel.unlockedTowns;
}

export function canFastTravel(state){return hasKeyItem(state,'busPass');}
export function fastTravelDestinations(state){return canFastTravel(state)?[...(state.travel?.unlockedTowns||[])]:[];}

export function registerTravelDestination(state,destination){
  if(!destination?.id||!destination?.area||!destination?.pos)return false;
  state.travel=state.travel||{unlockedTowns:[],destinations:{}};state.travel.destinations=state.travel.destinations||{};
  state.travel.destinations[destination.id]={id:destination.id,name:destination.name||destination.id,area:destination.area,pos:{x:destination.pos.x,y:destination.pos.y}};
  unlockTown(state,destination.id);return true;
}

export function travelTo(state,destinationId){
  if(!canFastTravel(state)||!state.travel?.unlockedTowns?.includes(destinationId))return false;
  const destination=state.travel.destinations?.[destinationId];if(!destination)return false;
  state.area=destination.area;state.pos={...destination.pos};state.message=`Arrived at ${destination.name}.`;return true;
}

export function awardBadge(state,badge){
  state.badges=state.badges||[];const canonical=canonicalBadge(badge);
  if(!state.badges.includes(canonical))state.badges.push(canonical);
  if(canonical!==badge&&!state.badges.includes(badge))state.badges.push(badge);
  return state.badges;
}

export function earnedSeasonBadges(state){
  const earned=new Set((state.badges||[]).map(canonicalBadge));
  return SEASON_ONE_BADGES.filter(badge=>earned.has(badge));
}
export function earnedBadgeCount(state){return earnedSeasonBadges(state).length;}
export function missingSeasonBadges(state){
  const earned=new Set(earnedSeasonBadges(state));
  return SEASON_ONE_BADGES.filter(badge=>!earned.has(badge));
}
export function canFlyToNationals(state){return missingSeasonBadges(state).length===0;}

export function unlockRecruiting(state){
  state.flags=state.flags||{};state.flags.recruitingUnlocked=true;state.flags.lockerUnlocked=true;state.flags.rosterBook=true;
  grantKeyItem(state,'rosterBook');
  return state.flags;
}
