import {SEASON_ONE_BADGES} from './campaign.js';

const member=(id,level,moves,{ace=false,signatureMove=null,quality=null,nature='Balanced'}={})=>({
  id,level,moves:Object.freeze([...moves]),ace,signatureMove,quality,nature
});

const battle=(config)=>Object.freeze({
  ...config,
  team:Object.freeze(config.team.map(entry=>Object.freeze(entry)))
});

export const TRAINER_PORTRAITS=Object.freeze([
  'player','rex','wrestler','athlete','captain','camper',
  'opener','funk_doctor','professor','senator','anchor','closer'
]);

const ANCHOR_BATTLE={
  trainerName:'The Anchor',trainerClass:'KOHL CAPTAIN',trainerPortrait:'anchor',lineupLabel:'ANCHOR',
  battleType:'gym',arenaKey:'kohl',strategy:'Absorb the opening attack, establish a ride, then threaten nearfall.',
  signatureMove:'powerhalf',trainerAi:{tier:'elite',items:{athleticTape:1,trainerKit:1}},
  team:[
    member('tilttech',19,['tilt','spiralride','powerhalf','cradle']),
    member('topboss',20,['tilt','spiralride','powerhalf','cradle'],{ace:true,signatureMove:'powerhalf',quality:27,nature:'Anchored'})
  ],
  defeatKey:'kohl_anchor',badge:'Kohl Badge',requiresDefeat:'kohl_round_two',
  requirementMessage:'Win the conference semifinal before facing The Anchor.',
  beatenMsg:'The Anchor: You broke the ride and finished the bracket.',reward:{grit:18,rep:16}
};

export const TRAINER_BATTLES=Object.freeze({
  'r1:rex_rematch':battle({
    trainerName:'Rex',trainerClass:'TEAM RIVAL',trainerPortrait:'rex',lineupLabel:'REX',battleType:'trainer',arenaKey:'campus',
    strategy:'Create speed in open space and force an early scramble.',signatureMove:'scramble',trainerAi:{tier:'standard'},
    team:[member('fieldflyer',7,['single','roll','scramble'],{ace:true,signatureMove:'scramble',nature:'Elusive'})],
    defeatKey:'rex_route_one',beatenMsg:'Rex: You kept your base this time. I will remember that.',reward:{grit:5,rep:3}
  }),
  'r1:gauntlet_one':battle({
    trainerName:'Mason',trainerClass:'FIRST-YEAR WRESTLER',trainerPortrait:'wrestler',lineupLabel:'MASON',battleType:'trainer',arenaKey:'campus',
    strategy:'Push pace with the lead, then finish with clean fundamentals.',trainerAi:{tier:'basic'},
    team:[
      member('pacesetter',7,['pace','double','stall']),
      member('drillpartner',7,['single','sprawl','pace'],{ace:true,signatureMove:'single'})
    ],
    defeatKey:'r1_gauntlet_one',beatenMsg:'Mason: Your stance held up through both looks.',reward:{grit:5,rep:4}
  }),
  'r1:gauntlet_two':battle({
    trainerName:'Nolan',trainerClass:'OPEN MAT REGULAR',trainerPortrait:'athlete',lineupLabel:'NOLAN',battleType:'trainer',arenaKey:'campus',
    strategy:'Control from top before turning the match into a scramble.',signatureMove:'scramble',trainerAi:{tier:'standard'},
    team:[
      member('matreturner',8,['claw','sprawl','ride']),
      member('riverroller',8,['roll','snap','scramble'],{ace:true,signatureMove:'scramble',nature:'Fluid'})
    ],
    defeatKey:'r1_gauntlet_two',beatenMsg:'Nolan: You found the edge before I could turn it loose.',reward:{grit:6,rep:4}
  }),
  'field_house_floor:opener':battle({
    trainerName:'The Opener',trainerClass:'FIELD HOUSE CAPTAIN',trainerPortrait:'opener',lineupLabel:'OPENER',battleType:'gym',arenaKey:'fieldhouse',
    strategy:'Win first contact with balanced neutral offense and disciplined defense.',signatureMove:'highc',
    trainerAi:{tier:'advanced',items:{athleticTape:1}},
    team:[member('captainneutral',10,['single','sprawl','ankle','highc'],{ace:true,signatureMove:'highc',quality:21,nature:'Precise'})],
    defeatKey:'field_house_opener',badge:'Field House Badge',requiresFlag:'rosterBook',
    requirementMessage:'Coach must issue the Roster Book before the Field House challenge.',
    beatenMsg:'The Opener: You won first contact. The season is officially underway.',reward:{grit:12,rep:10}
  }),
  'picnic_point:funk_doctor':battle({
    trainerName:'The Funk Doctor',trainerClass:'POINT CAPTAIN',trainerPortrait:'funk_doctor',lineupLabel:'FUNK DOC',battleType:'gym',arenaKey:'lakeshore',
    strategy:'Escape bad positions, clear conditions, and turn every exchange into a scramble.',signatureMove:'funk',
    trainerAi:{tier:'advanced',items:{athleticTape:1,trainerKit:1}},
    team:[
      member('funklord',16,['switchb','snap','shakeout','peterson'],{nature:'Elusive'}),
      member('scrambleboss',17,['switchb','shakeout','peterson','funk'],{ace:true,signatureMove:'funk',quality:23,nature:'Instinctive'})
    ],
    defeatKey:'picnic_funk_doctor',badge:'Picnic Point Badge',requiresBadges:['Field House Badge'],
    requirementMessage:'Earn the Field House Badge before challenging the Funk Doctor.',
    beatenMsg:'The Funk Doctor: You stayed calm where the position stopped making sense.',reward:{grit:15,rep:13}
  }),
  'state_street:deion_throw':battle({
    trainerName:'Deion',trainerClass:'THROW SPECIALIST',trainerPortrait:'wrestler',lineupLabel:'DEION',battleType:'trainer',arenaKey:'downtown',
    strategy:'Close distance, break posture, and punish a loose upper-body tie.',signatureMove:'bodylock',trainerAi:{tier:'standard'},
    team:[member('lockthrow',12,['snap','sprawl','throwby','bodylock'],{ace:true,signatureMove:'bodylock',nature:'Forceful'})],
    defeatKey:'state_deion',beatenMsg:'Deion: You denied the lock. Clean work.',reward:{grit:7,rep:6}
  }),
  'state_street:throw_trainer_two':battle({
    trainerName:'Grant',trainerClass:'STATE STREET THROWER',trainerPortrait:'wrestler',lineupLabel:'GRANT',battleType:'trainer',arenaKey:'downtown',
    strategy:'Use a defensive lead to invite the tie, then bring in the thrower.',signatureMove:'clubcollar',
    trainerAi:{tier:'standard',items:{athleticTape:1}},
    team:[
      member('whizzkid',13,['whizzer','single','reattack','hardwhizzer']),
      member('lockthrow',13,['sprawl','throwby','bodylock','clubcollar'],{ace:true,signatureMove:'clubcollar',nature:'Aggressive'})
    ],
    defeatKey:'state_thrower',beatenMsg:'Grant: You read the tie before I could load the throw.',reward:{grit:8,rep:7}
  }),
  'bascom_hill:professor_wall':battle({
    trainerName:'The Professor',trainerClass:'BASCOM TECHNICIAN',trainerPortrait:'professor',lineupLabel:'PROFESSOR',battleType:'trainer',arenaKey:'bascom',
    strategy:'Scout the attack, lower its quality, and answer from front headlock.',signatureMove:'fronthead',
    trainerAi:{tier:'advanced',items:{trainerKit:1}},
    team:[
      member('whizzkid',15,['sprawl','reattack','hardwhizzer','single'],{nature:'Observant'}),
      member('professor',16,['whizzer','reattack','hardwhizzer','fronthead'],{ace:true,signatureMove:'fronthead',quality:23,nature:'Studious'})
    ],
    defeatKey:'bascom_professor',beatenMsg:'The Professor: You changed the problem faster than I could solve it.',reward:{grit:14,rep:12}
  }),
  'capitol_interior:senator':battle({
    trainerName:'The Senator',trainerClass:'CAPITOL CAPTAIN',trainerPortrait:'senator',lineupLabel:'SENATOR',battleType:'gym',arenaKey:'capitol',
    strategy:'Win the center, force a collar tie, and turn one opening into a decisive throw.',signatureMove:'insidetrip',
    trainerAi:{tier:'advanced',items:{athleticTape:1,trainerKit:1}},
    team:[
      member('lockthrow',15,['throwby','bodylock','clubcollar','sprawl'],{nature:'Forceful'}),
      member('senator',16,['bodylock','clubcollar','insidetrip','sprawl'],{ace:true,signatureMove:'insidetrip',quality:24,nature:'Aggressive'})
    ],
    defeatKey:'capitol_senator',badge:'Capitol Badge',requiresKeyItem:'kayakVoucher',
    requirementMessage:'Hear the Capitol booster before challenging the Senator.',
    beatenMsg:'The Senator: The mat has ruled. Your argument carries the day.',reward:{grit:16,rep:14}
  }),
  'monona_shore:water_trainer':battle({
    trainerName:'Marina',trainerClass:'SHORELINE WRESTLER',trainerPortrait:'camper',lineupLabel:'MARINA',battleType:'trainer',arenaKey:'lakeshore',
    strategy:'Stay loose through the scramble, then chain attacks as footing disappears.',signatureMove:'chainshot',
    trainerAi:{tier:'standard',items:{sportsDrink:1}},
    team:[
      member('riverroller',17,['scramble','switchb','shakeout','peterson'],{nature:'Fluid'}),
      member('lakechain',17,['highc','reattack','lowankle','chainshot'],{ace:true,signatureMove:'chainshot',nature:'Reactive'})
    ],
    defeatKey:'monona_trainer',beatenMsg:'Marina: You kept chaining when the exchange drifted.',reward:{grit:10,rep:8}
  }),
  'kohl_bracket_floor:round_one':battle({
    trainerName:'Eli Mercer',trainerClass:'CONFERENCE QUALIFIER',trainerPortrait:'athlete',lineupLabel:'MERCER',battleType:'tournament',arenaKey:'kohl',
    strategy:'Build nearfall pressure, then accelerate the match when the defense opens.',signatureMove:'matpressure',
    trainerAi:{tier:'advanced',items:{sportsDrink:1}},
    team:[
      member('tilttech',18,['gut','spiralride','powerhalf','cradle'],{nature:'Methodical'}),
      member('pacecommand',18,['flurry','handfight','matpressure','reattack'],{ace:true,signatureMove:'matpressure',nature:'Relentless'})
    ],
    defeatKey:'kohl_round_one',requiresBadges:['Field House Badge','Picnic Point Badge','Capitol Badge'],
    requirementMessage:'Bring the Field House, Picnic Point, and Capitol credentials to the bracket.',
    beatenMsg:'Eli Mercer: You handled the pace change. Advance.',reward:{grit:12,rep:10}
  }),
  'kohl_bracket_floor:round_two':battle({
    trainerName:'Cal Redding',trainerClass:'CONFERENCE SEMIFINALIST',trainerPortrait:'captain',lineupLabel:'REDDING',battleType:'tournament',arenaKey:'kohl',
    strategy:'Chain attacks until the defense commits, then re-attack through the opening.',signatureMove:'chainshot',
    trainerAi:{tier:'elite',items:{athleticTape:1}},
    team:[
      member('chainmaster',19,['reattack','lowankle','chainshot','double'],{nature:'Reactive'}),
      member('drillveteran',19,['roll','lowankle','reattack','chainshot'],{ace:true,signatureMove:'chainshot',quality:25,nature:'Fundamental'})
    ],
    defeatKey:'kohl_round_two',requiresDefeat:'kohl_round_one',requirementMessage:'Win the conference quarterfinal first.',
    beatenMsg:'Cal Redding: No wasted motion. Go earn the final.',reward:{grit:13,rep:11}
  }),
  'kohl_bracket_floor:anchor':battle(ANCHOR_BATTLE),
  'kohl_center:anchor_badge':battle({...ANCHOR_BATTLE,requirementMessage:'The Anchor is waiting at the end of the bracket inside Kohl Center.'}),
  'nationals_floor:round_one':battle({
    trainerName:'Darius Cole',trainerClass:'NATIONAL QUALIFIER',trainerPortrait:'captain',lineupLabel:'COLE',battleType:'tournament',arenaKey:'nationals',
    strategy:'Rotate three contrasting styles and switch aggressively into favorable positions.',signatureMove:'matpressure',
    trainerAi:{tier:'elite',items:{sportsDrink:1}},
    team:[
      member('chainmaster',22,['lowankle','chainshot','double','reattack'],{nature:'Reactive'}),
      member('tilttech',22,['spiralride','powerhalf','cradle','tilt'],{nature:'Methodical'}),
      member('pacecommand',22,['handfight','matpressure','reattack','flurry'],{ace:true,signatureMove:'matpressure',quality:26,nature:'Relentless'})
    ],
    defeatKey:'nationals_round_one',requiresBadges:[...SEASON_ONE_BADGES],requiresKeyItem:'flightTicket',
    requirementMessage:'Four credentials and the team flight are required for Nationals.',
    beatenMsg:'Darius Cole: You solved three matches in one. Keep moving.',reward:{grit:16,rep:15}
  }),
  'nationals_floor:closer':battle({
    trainerName:'The Closer',trainerClass:'NATIONAL SEMIFINALIST',trainerPortrait:'closer',lineupLabel:'CLOSER',battleType:'tournament',arenaKey:'nationals',
    strategy:'Drain the lineup with hand fighting, then finish under unbroken pressure.',signatureMove:'grind',
    trainerAi:{tier:'elite',items:{athleticTape:1,trainerKit:1}},
    team:[
      member('pacecommand',23,['flurry','handfight','matpressure','reattack'],{nature:'Patient'}),
      member('closer',24,['handfight','matpressure','grind','flurry'],{ace:true,signatureMove:'grind',quality:28,nature:'Relentless'})
    ],
    defeatKey:'nationals_closer',requiresDefeat:'nationals_round_one',requirementMessage:'Win the opening round before the semifinal.',
    beatenMsg:'The Closer: You survived the pace. Finish the season.',reward:{grit:20,rep:18}
  }),
  'nationals_floor:rex':battle({
    trainerName:'Rex',trainerClass:'NATIONAL FINALIST',trainerPortrait:'rex',lineupLabel:'REX',battleType:'tournament',arenaKey:'nationals',
    strategy:'Use every position learned through the season, then finish with the starter line.',signatureMove:'blast',
    trainerAi:{tier:'elite',items:{athleticTape:1,trainerKit:1}},
    team:[
      member('scramblesaint',24,['shakeout','funk','peterson','reattack'],{nature:'Fearless'}),
      member('rideking',24,['spiralride','cradle','powerhalf','tilt'],{nature:'Anchored'}),
      member('buckallam',25,['lowankle','chainshot','double','blast'],{ace:true,signatureMove:'blast',quality:29,nature:'Explosive'})
    ],
    defeatKey:'nationals_rex',requiresDefeat:'nationals_closer',requirementMessage:'Defeat The Closer before the national final.',
    beatenMsg:'Rex: You won the last match. This team is yours now.',reward:{grit:30,rep:25}
  })
});

export function openingRexBattle(rivalId){
  return battle({
    trainerName:'Rex',trainerClass:'TEAM RIVAL',trainerPortrait:'rex',lineupLabel:'REX',battleType:'opening',arenaKey:'fieldhouse',
    strategy:'Counter the chosen starter with a simple, readable early-game matchup.',trainerAi:{tier:'basic'},
    team:[member(rivalId,5,[],{ace:true,quality:9,nature:'Balanced'})],reward:{grit:0,rep:0}
  });
}
