import {MOVES} from './moves.js';

const learnset=entries=>Object.freeze(entries.map(([level,move])=>Object.freeze({level,move})));

const SHOOTER_LINE=learnset([[1,'single'],[4,'sprawl'],[7,'highc'],[10,'ankle'],[13,'reattack'],[16,'lowankle'],[18,'double'],[22,'chainshot'],[25,'blast'],[31,'flurry']]);
const RIDER_LINE=learnset([[1,'claw'],[4,'sprawl'],[7,'ride'],[10,'tilt'],[13,'gut'],[16,'spiralride'],[18,'cradle'],[22,'powerhalf'],[25,'pin'],[31,'grind']]);
const SCRAMBLE_LINE=learnset([[1,'single'],[4,'roll'],[7,'scramble'],[10,'snap'],[13,'switchb'],[16,'shakeout'],[18,'funk'],[22,'peterson'],[25,'reattack'],[31,'cradle']]);
const PACE_LINE=learnset([[1,'pace'],[1,'double'],[7,'stall'],[10,'flurry'],[13,'handfight'],[16,'matpressure'],[18,'reattack'],[25,'blast'],[31,'grind']]);
const DRILL_LINE=learnset([[1,'single'],[4,'sprawl'],[7,'pace'],[10,'ankle'],[13,'roll'],[16,'lowankle'],[18,'reattack'],[22,'chainshot'],[25,'highc'],[31,'double']]);
const CHAIN_LINE=learnset([[1,'single'],[4,'ankle'],[7,'highc'],[10,'reattack'],[13,'lowankle'],[16,'chainshot'],[18,'double'],[25,'blast'],[31,'flurry']]);
const WALL_LINE=learnset([[1,'sprawl'],[4,'whizzer'],[7,'single'],[10,'reattack'],[13,'hardwhizzer'],[16,'fronthead'],[18,'ankle'],[25,'throwby']]);
const THROW_LINE=learnset([[1,'snap'],[4,'sprawl'],[7,'throwby'],[10,'bodylock'],[13,'clubcollar'],[16,'insidetrip'],[18,'headlock'],[25,'blast']]);
const RIVER_LINE=learnset([[1,'roll'],[4,'snap'],[7,'scramble'],[10,'switchb'],[13,'shakeout'],[16,'peterson'],[18,'funk'],[25,'reattack']]);
const TILT_LINE=learnset([[1,'claw'],[4,'ride'],[7,'tilt'],[10,'gut'],[13,'spiralride'],[16,'powerhalf'],[18,'cradle'],[25,'pin']]);
const FUNK_LINE=learnset([[1,'roll'],[4,'scramble'],[7,'switchb'],[10,'snap'],[13,'shakeout'],[16,'peterson'],[18,'funk'],[25,'cradle'],[31,'reattack']]);
const CAPTAIN_LINE=learnset([[1,'single'],[4,'sprawl'],[7,'ankle'],[10,'highc'],[13,'lowankle'],[16,'chainshot'],[18,'reattack'],[25,'flurry'],[31,'blast']]);
const SENATOR_LINE=learnset([[1,'snap'],[4,'throwby'],[7,'sprawl'],[10,'bodylock'],[13,'clubcollar'],[16,'insidetrip'],[18,'headlock'],[25,'reattack']]);
const PROFESSOR_LINE=learnset([[1,'sprawl'],[4,'whizzer'],[7,'ankle'],[10,'reattack'],[13,'hardwhizzer'],[16,'fronthead'],[18,'single'],[25,'throwby']]);
const CLOSER_LINE=learnset([[1,'pace'],[4,'double'],[7,'stall'],[10,'flurry'],[13,'handfight'],[16,'matpressure'],[18,'grind'],[25,'reattack'],[31,'blast']]);

export const LEARNSETS=Object.freeze({
  buckshot:SHOOTER_LINE,buckvarsity:SHOOTER_LINE,buckallam:SHOOTER_LINE,
  matreturner:RIDER_LINE,matgeneral:RIDER_LINE,rideking:RIDER_LINE,
  fieldflyer:SCRAMBLE_LINE,funkflyer:SCRAMBLE_LINE,scramblesaint:SCRAMBLE_LINE,
  pacesetter:PACE_LINE,pacecommand:PACE_LINE,
  drillpartner:DRILL_LINE,drillveteran:DRILL_LINE,
  lakechain:CHAIN_LINE,chainmaster:CHAIN_LINE,
  whizzkid:WALL_LINE,lockthrow:THROW_LINE,riverroller:RIVER_LINE,
  tilttech:TILT_LINE,funklord:FUNK_LINE,
  captainneutral:CAPTAIN_LINE,scrambleboss:FUNK_LINE,topboss:RIDER_LINE,
  senator:SENATOR_LINE,professor:PROFESSOR_LINE,closer:CLOSER_LINE
});

export function learnsetFor(id){return LEARNSETS[id]||[];}

export function movesLearnedAtLevel(id,level){
  return learnsetFor(id).filter(entry=>entry.level===level).map(entry=>entry.move);
}

export function movesForLevel(id,level,limit=4){
  const learned=[];
  for(const {level:learnLevel,move} of learnsetFor(id)){
    if(learnLevel>level)break;
    const existing=learned.indexOf(move);
    if(existing>=0)learned.splice(existing,1);
    learned.push(move);
  }
  return learned.filter(move=>MOVES[move]).slice(-limit);
}
