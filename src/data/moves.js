export const MOVES={
 single:{name:'Single Leg',style:'Shooter',power:18,acc:.90,stamina:8,points:2,summary:'Reliable takedown.'},
 highc:{name:'High C',style:'Shooter',power:22,acc:.82,stamina:11,points:2,criticalRate:.19,summary:'High critical chance.'},
 ankle:{name:'Ankle Pick',style:'Shooter',power:16,acc:.94,stamina:7,points:2,targetStage:{stat:'speed',delta:-1,chance:.6},summary:'May lower Speed.'},
 double:{name:'Double Leg',style:'Bull',power:24,acc:.78,stamina:13,points:2,flinchChance:.25,summary:'May break position.'},
 blast:{name:'Blast Double',style:'Shooter',power:30,acc:.70,stamina:17,points:2,selfStage:{stat:'defense',delta:-1},summary:'Powerful; lowers Defense.'},
 snap:{name:'Snap Down',style:'Thrower',power:15,acc:.92,stamina:7,points:1,targetStage:{stat:'defense',delta:-1,chance:.75},summary:'Usually lowers Defense.'},
 throwby:{name:'Throw-By',style:'Thrower',power:19,acc:.86,stamina:9,points:2,priority:1,summary:'Usually moves first.'},
 bodylock:{name:'Body Lock',style:'Thrower',power:26,acc:.72,stamina:15,points:2,staminaDrain:8,summary:'Drains foe Stamina.'},
 headlock:{name:'Headlock Toss',style:'Thrower',power:32,acc:.62,stamina:18,points:4,criticalRate:.25,selfStage:{stat:'speed',delta:-1},summary:'High critical; lowers Speed.'},
 sprawl:{name:'Sprawl',style:'Wall',power:0,acc:1,stamina:5,points:0,selfStage:{stat:'defense',delta:1},summary:'Raises Defense.'},
 reattack:{name:'Re-Attack',style:'Wall',power:20,acc:.82,stamina:10,points:2,priority:-1,counterMultiplier:1.4,summary:'Stronger after being hit.'},
 whizzer:{name:'Whizzer',style:'Wall',power:17,acc:.88,stamina:8,points:1,targetStage:{stat:'attack',delta:-1,chance:.75},summary:'Usually lowers Attack.'},
 ride:{name:'Mat Return',style:'Rider',power:17,acc:.88,stamina:8,points:1,staminaDrain:6,summary:'Drains foe Stamina.'},
 tilt:{name:'Tilt Series',style:'Rider',power:23,acc:.75,stamina:13,points:3,hits:{min:2,max:3,scale:.52},summary:'Hits two or three times.'},
 claw:{name:'Claw Ride',style:'Rider',power:14,acc:.93,stamina:6,points:1,staminaDrain:4,targetStage:{stat:'speed',delta:-1,chance:.75},summary:'Drains Stamina; slows.'},
 gut:{name:'Gut Wrench',style:'Rider',power:21,acc:.80,stamina:11,points:2,targetStage:{stat:'defense',delta:-1,chance:.6},summary:'May lower Defense.'},
 cradle:{name:'Cradle',style:'Rider',power:28,acc:.66,stamina:16,points:4,criticalRate:.2,summary:'High critical chance.'},
 scramble:{name:'Scramble',style:'Scrambler',power:0,acc:1,stamina:8,points:0,selfStage:{stat:'speed',delta:1},summary:'Raises Speed.'},
 roll:{name:'Granby',style:'Scrambler',power:0,acc:1,stamina:6,points:0,selfStage:{stat:'defense',delta:1},summary:'Raises Defense.'},
 funk:{name:'Funk Roll',style:'Scrambler',power:25,acc:.74,stamina:14,points:2,targetStage:{stat:'accuracy',delta:-1,chance:.65},summary:'May lower Accuracy.'},
 switchb:{name:'Switch',style:'Scrambler',power:15,acc:.92,stamina:7,points:1,priority:1,selfStage:{stat:'speed',delta:1},summary:'Moves first; raises Speed.'},
 pace:{name:'Pace Push',style:'Bull',power:0,acc:1,stamina:4,points:0,selfStage:{stat:'attack',delta:1},summary:'Raises Attack.'},
 flurry:{name:'Flurry',style:'Bull',power:25,acc:.76,stamina:14,points:2,hits:{min:2,max:4,scale:.42},summary:'Hits two to four times.'},
 grind:{name:'Grind Ride',style:'Bull',power:18,acc:.86,stamina:6,points:1,staminaDrain:10,summary:'Heavily drains Stamina.'},
 pin:{name:'Pin Combo',style:'Rider',power:34,acc:.58,stamina:22,points:6,recharge:true,summary:'Must reset next turn.'},
 stall:{name:'Circle Out',style:'Wall',power:0,acc:1,stamina:-10,points:0,selfStage:{stat:'defense',delta:1},summary:'Restores STA; raises DEF.'}
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
