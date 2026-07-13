export const SEASON_ONE_BADGES=['Field House Badge','Capitol Badge','Kohl Badge','Picnic Point Badge'];
export const LEGACY_BADGE_ALIASES={'Neutral Badge':'Field House Badge','Scramble Badge':'Picnic Point Badge','Top Badge':'Kohl Badge'};
export function canonicalBadge(badge){return LEGACY_BADGE_ALIASES[badge]||badge;}

export const CAPTAINS={
 opener:{id:'captainneutral',name:'The Opener',venue:'Field House',style:'Shooter',badge:'Field House Badge'},
 funkDoctor:{id:'scrambleboss',name:'The Funk Doctor',venue:'Picnic Point',style:'Scrambler',badge:'Picnic Point Badge'},
 anchor:{id:'topboss',name:'The Anchor',venue:'Kohl Center',style:'Rider',badge:'Kohl Badge'},
 senator:{id:'senator',name:'The Senator',venue:'Capitol',style:'Thrower',badge:'Capitol Badge'},
 professor:{id:'professor',name:'The Professor',venue:'Bascom Hill',style:'Wall',badge:null},
 closer:{id:'closer',name:'The Closer',venue:'St. Louis',style:'Bull',badge:null}
};

// Map Studio can place these semantic events anywhere. Mechanics scenes own
// behavior; maps own only position, approach direction, and progression gate.
export const SERVICE_EVENTS={
 shop:{kind:'S',scene:'MenuScene',tab:'shop',name:"Bucky's Locker Room"},
 recovery:{kind:'R',action:'recover',name:"Trainer's Room"},
  locker:{kind:'TRAINER_LOCKER',scene:'MenuScene',tab:'locker',name:'Team Locker'},
  travel:{kind:'BUS_STOP',scene:'MenuScene',tab:'travel',name:'Bus Stop'},
 practice:{kind:'WEIGHT_ROOM',scene:'MenuScene',tab:'practice',name:'Practice Station'},
 scout:{kind:'g',scene:'ScoutScene',name:'Open Mat'},
 trainer:{kind:'TRAINER',scene:'BattleScene',battleType:'trainer'},
 captain:{kind:'C',scene:'BattleScene',battleType:'gym'},
 tournament:{kind:'TOURNEY',scene:'BattleScene',battleType:'tournament'}
};

export const KEY_ITEMS={
 equipmentShipment:{name:'Equipment Shipment'},
 rosterBook:{name:'Roster Book'},
 kayakVoucher:{name:'Kayak Voucher'},
 busPass:{name:'Bus Pass'},
 flightTicket:{name:'Flight Ticket'}
};

export const STORY_CAPABILITIES={
 recruiting:'recruitingUnlocked',
 locker:'lockerUnlocked',
 rosterBook:'rosterBook'
};
