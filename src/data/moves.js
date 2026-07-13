export const MOVES={
 single:{name:'Single Leg',style:'Shooter',power:18,acc:.90,stamina:8,points:2},
 highc:{name:'High C',style:'Shooter',power:22,acc:.82,stamina:11,points:2},
 ankle:{name:'Ankle Pick',style:'Shooter',power:16,acc:.94,stamina:7,points:2},
 double:{name:'Double Leg',style:'Bull',power:24,acc:.78,stamina:13,points:2},
 blast:{name:'Blast Double',style:'Shooter',power:30,acc:.70,stamina:17,points:2},
 snap:{name:'Snap Down',style:'Thrower',power:15,acc:.92,stamina:7,points:1},
 throwby:{name:'Throw-By',style:'Thrower',power:19,acc:.86,stamina:9,points:2},
 bodylock:{name:'Body Lock',style:'Thrower',power:26,acc:.72,stamina:15,points:2},
 headlock:{name:'Headlock Toss',style:'Thrower',power:32,acc:.62,stamina:18,points:4},
 sprawl:{name:'Sprawl',style:'Wall',power:14,acc:.95,stamina:5,points:1},
 reattack:{name:'Re-Attack',style:'Wall',power:20,acc:.82,stamina:10,points:2},
 whizzer:{name:'Whizzer',style:'Wall',power:17,acc:.88,stamina:8,points:1},
 ride:{name:'Mat Return',style:'Rider',power:17,acc:.88,stamina:8,points:1},
 tilt:{name:'Tilt Series',style:'Rider',power:23,acc:.75,stamina:13,points:3},
 claw:{name:'Claw Ride',style:'Rider',power:14,acc:.93,stamina:6,points:1},
 gut:{name:'Gut Wrench',style:'Rider',power:21,acc:.80,stamina:11,points:2},
 cradle:{name:'Cradle',style:'Rider',power:28,acc:.66,stamina:16,points:4},
 scramble:{name:'Scramble',style:'Scrambler',power:21,acc:.80,stamina:12,points:2},
 roll:{name:'Granby',style:'Scrambler',power:16,acc:.88,stamina:8,points:1},
 funk:{name:'Funk Roll',style:'Scrambler',power:25,acc:.74,stamina:14,points:2},
 switchb:{name:'Switch',style:'Scrambler',power:15,acc:.92,stamina:7,points:1},
 pace:{name:'Pace Push',style:'Bull',power:12,acc:.96,stamina:4,points:1},
 flurry:{name:'Flurry',style:'Bull',power:25,acc:.76,stamina:14,points:2},
 grind:{name:'Grind Ride',style:'Bull',power:18,acc:.86,stamina:6,points:1},
 pin:{name:'Pin Combo',style:'Rider',power:34,acc:.58,stamina:22,points:6},
 stall:{name:'Circle Out',style:'Wall',power:8,acc:.98,stamina:-10,points:0}
};

// Locked Season One chart: every style has two favorable, two unfavorable,
// and one neutral matchup. The three starter styles retain a clean triangle.
export const ADV={
 Shooter:['Rider','Bull'],
 Scrambler:['Shooter','Wall'],
 Rider:['Scrambler','Bull'],
 Bull:['Wall','Thrower'],
 Thrower:['Rider','Scrambler'],
 Wall:['Shooter','Thrower']
};
