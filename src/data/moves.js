export const MOVES={
 single:{name:'Single Leg',style:'Shooter',category:'technique',power:40,acc:.90,pp:35,points:2,summary:'Reliable takedown.'},
 highc:{name:'High C',style:'Shooter',category:'technique',power:55,acc:.85,pp:25,points:2,criticalRate:.125,summary:'High critical chance.'},
 ankle:{name:'Ankle Pick',style:'Shooter',category:'technique',power:35,acc:.95,pp:30,points:2,targetStage:{stat:'speed',delta:-1,chance:.6},summary:'May lower Speed.'},
 double:{name:'Double Leg',style:'Bull',category:'strength',power:65,acc:.80,pp:20,points:2,flinchChance:.25,summary:'May break position.'},
 blast:{name:'Blast Double',style:'Shooter',category:'strength',power:90,acc:.70,pp:10,points:2,selfStage:{stat:'defense',delta:-1},summary:'Powerful; lowers Defense.'},
 snap:{name:'Snap Down',style:'Thrower',category:'technique',power:35,acc:.95,pp:30,points:1,targetStage:{stat:'defense',delta:-1,chance:.75},summary:'Usually lowers Defense.'},
 throwby:{name:'Throw-By',style:'Thrower',category:'technique',power:50,acc:.90,pp:25,points:2,priority:1,summary:'Usually moves first.'},
 bodylock:{name:'Body Lock',style:'Thrower',category:'strength',power:75,acc:.75,pp:15,points:2,staminaDrain:2,summary:"Drains the foe's last technique."},
 headlock:{name:'Headlock Toss',style:'Thrower',category:'strength',power:100,acc:.65,pp:5,points:4,criticalRate:.125,selfStage:{stat:'speed',delta:-1},summary:'High critical; lowers Speed.'},
 sprawl:{name:'Sprawl',style:'Wall',category:'status',power:0,acc:1,pp:20,points:0,selfStage:{stat:'defense',delta:1},summary:'Raises Defense.'},
 reattack:{name:'Re-Attack',style:'Wall',category:'technique',power:60,acc:.85,pp:15,points:2,priority:-1,counterMultiplier:1.5,summary:'Stronger after being hit.'},
 whizzer:{name:'Whizzer',style:'Wall',category:'technique',power:40,acc:.90,pp:25,points:1,targetStage:{stat:'attack',delta:-1,chance:.75},summary:'Usually lowers Strength.'},
 ride:{name:'Mat Return',style:'Rider',category:'strength',power:45,acc:.90,pp:25,points:1,staminaDrain:2,summary:"Drains the foe's last technique."},
 tilt:{name:'Tilt Series',style:'Rider',category:'technique',power:30,acc:.80,pp:15,points:3,hits:{min:2,max:3},summary:'Hits two or three times.'},
 claw:{name:'Claw Ride',style:'Rider',category:'technique',power:35,acc:.95,pp:25,points:1,staminaDrain:2,targetStage:{stat:'speed',delta:-1,chance:.75},summary:'Drains Stamina; slows.'},
 gut:{name:'Gut Wrench',style:'Rider',category:'strength',power:60,acc:.85,pp:15,points:2,targetStage:{stat:'defense',delta:-1,chance:.6},summary:'May lower Defense.'},
 cradle:{name:'Cradle',style:'Rider',category:'technique',power:85,acc:.70,pp:10,points:4,criticalRate:.125,summary:'High critical chance.'},
 scramble:{name:'Scramble',style:'Scrambler',category:'status',power:0,acc:1,pp:20,points:0,selfStage:{stat:'speed',delta:1},summary:'Raises Speed.'},
 roll:{name:'Granby',style:'Scrambler',category:'status',power:0,acc:1,pp:25,points:0,selfStage:{stat:'defense',delta:1},summary:'Raises Defense.'},
 funk:{name:'Funk Roll',style:'Scrambler',category:'technique',power:70,acc:.75,pp:15,points:2,targetStage:{stat:'accuracy',delta:-1,chance:.65},summary:'May lower Accuracy.'},
 switchb:{name:'Switch',style:'Scrambler',category:'technique',power:40,acc:.95,pp:25,points:1,priority:1,selfStage:{stat:'speed',delta:1},summary:'Moves first; raises Speed.'},
 pace:{name:'Pace Push',style:'Bull',category:'status',power:0,acc:1,pp:30,points:0,selfStage:{stat:'attack',delta:1},summary:'Raises Strength.'},
 flurry:{name:'Flurry',style:'Bull',category:'strength',power:25,acc:.80,pp:20,points:2,hits:{min:2,max:4},summary:'Hits two to four times.'},
 grind:{name:'Grind Ride',style:'Bull',category:'strength',power:50,acc:.90,pp:20,points:1,staminaDrain:3,summary:'Heavily drains Stamina.'},
 pin:{name:'Pin Combo',style:'Rider',category:'strength',power:120,acc:.60,pp:5,points:6,recharge:true,summary:'Must reset next turn.'},
 stall:{name:'Circle Out',style:'Wall',category:'status',power:0,acc:1,pp:15,points:0,selfStage:{stat:'defense',delta:1},summary:'Creates space; raises Defense.'},
 chainshot:{name:'Chain Shot',style:'Shooter',category:'technique',power:28,acc:.88,pp:15,points:2,hits:{min:2,max:3},summary:'Chains two or three attacks.'},
 lowankle:{name:'Low Ankle',style:'Shooter',category:'technique',power:45,acc:.92,pp:20,points:1,inflictCondition:{key:'stunned',chance:.25},summary:'May leave the foe Stunned.'},
 spiralride:{name:'Spiral Ride',style:'Rider',category:'technique',power:55,acc:.88,pp:15,points:2,staminaDrain:1,inflictCondition:{key:'gassed',chance:.3},summary:'May leave the foe Gassed.'},
 powerhalf:{name:'Power Half',style:'Rider',category:'status',power:0,acc:.8,pp:15,points:0,inflictCondition:{key:'tiedUp',chance:1},summary:'Ties up the foe for several turns.'},
 shakeout:{name:'Shake Out',style:'Scrambler',category:'status',power:0,acc:1,pp:15,points:0,cureCondition:true,selfStage:{stat:'speed',delta:1},summary:'Clears a condition; raises Speed.'},
 peterson:{name:'Peterson Roll',style:'Scrambler',category:'technique',power:65,acc:.82,pp:15,points:2,inflictCondition:{key:'strained',chance:.25},summary:'May leave the foe Strained.'},
 handfight:{name:'Heavy Hand Fight',style:'Bull',category:'status',power:0,acc:.9,pp:20,points:0,inflictCondition:{key:'gassed',chance:1},summary:'Wears the foe down until Gassed.'},
 matpressure:{name:'Mat Pressure',style:'Bull',category:'strength',power:55,acc:.9,pp:20,points:1,inflictCondition:{key:'gassed',chance:.25},summary:'May leave the foe Gassed.'},
 fronthead:{name:'Front Headlock',style:'Wall',category:'status',power:0,acc:.8,pp:15,points:0,inflictCondition:{key:'tiedUp',chance:1},summary:'Ties up the foe for several turns.'},
 hardwhizzer:{name:'Hard Whizzer',style:'Wall',category:'strength',power:50,acc:.88,pp:20,points:1,inflictCondition:{key:'strained',chance:.3},summary:'May leave the foe Strained.'},
 clubcollar:{name:'Club and Collar',style:'Thrower',category:'strength',power:45,acc:.9,pp:20,points:1,inflictCondition:{key:'stunned',chance:.3},summary:'May leave the foe Stunned.'},
 insidetrip:{name:'Inside Trip',style:'Thrower',category:'strength',power:70,acc:.8,pp:15,points:2,inflictCondition:{key:'strained',chance:.2},summary:'May leave the foe Strained.'},
 desperation:{name:'Desperation Shot',style:'Open',category:'strength',power:50,acc:1,pp:null,points:1,recoil:.25,summary:'Used only when every technique is spent.'}
};

export function moveStaminaMax(key){return Math.max(0,Math.trunc(Number(MOVES[key]?.pp)||0));}

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
