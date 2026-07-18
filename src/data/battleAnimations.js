const tempo=(feedback=620,hitStagger=0,announceBase=390)=>({
  announceBase,announceMin:820,announceMax:1120,windupLead:500,feedback,hitStagger
});

const move=(motion,effect,{dx=34,dy=0,duration=210,lunge=24,lift=0,knockback=12,targetLift=0,effectY=-70,shake=2,flash=70,feedback=620,hitStagger=0,announceBase=390}={})=>({
  motion,effect,
  windup:{dx,dy,duration},
  impact:{lunge,lift,knockback,targetLift,effectY,shake,flash},
  tempo:tempo(feedback,hitStagger,announceBase)
});

export const BATTLE_CHOREOGRAPHY=Object.freeze({
  single:move('level-change','low-sweep',{dx:43,dy:10,duration:220,lunge:30,knockback:10,targetLift:2,effectY:-24}),
  highc:move('rising-entry','rising-lift',{dx:38,dy:-10,duration:235,lunge:27,lift:-9,knockback:13,targetLift:-7,flash:82,feedback:660}),
  ankle:move('low-pick','ankle-rings',{dx:34,dy:13,duration:205,lunge:23,knockback:8,targetLift:3,effectY:-19,feedback:580}),
  double:move('power-rush','double-burst',{dx:53,dy:2,duration:190,lunge:38,knockback:21,effectY:-53,shake:3,flash:88,feedback:700}),
  blast:move('deep-charge','blast-wave',{dx:58,dy:8,duration:285,lunge:45,lift:-3,knockback:27,targetLift:-4,effectY:-55,shake:4,flash:105,feedback:820,announceBase:430}),
  snap:move('rise-and-drop','snap-chop',{dx:29,dy:-15,duration:220,lunge:18,lift:-8,knockback:8,targetLift:8,feedback:620}),
  throwby:move('outside-step','throwby-cross',{dx:38,dy:-6,duration:175,lunge:25,lift:-4,knockback:17,targetLift:2,flash:76,feedback:590}),
  bodylock:move('close-distance','body-clamp',{dx:42,dy:0,duration:245,lunge:30,knockback:6,effectY:-57,shake:3,feedback:720}),
  headlock:move('turning-load','headlock-arc',{dx:31,dy:-17,duration:295,lunge:24,lift:-12,knockback:23,targetLift:-12,shake:4,flash:100,feedback:860,announceBase:430}),
  sprawl:move('brace','sprawl-shield',{dx:-9,dy:6,duration:250,lunge:-5,lift:4,knockback:0,effectY:-60,shake:0,flash:45,feedback:600}),
  reattack:move('recoil-surge','counter-chevrons',{dx:-15,dy:1,duration:255,lunge:34,lift:-2,knockback:17,shake:3,flash:86,feedback:720}),
  whizzer:move('hip-turn','whizzer-spiral',{dx:26,dy:-8,duration:235,lunge:17,lift:-6,knockback:11,targetLift:-3,feedback:650}),
  ride:move('rear-lift','mat-return',{dx:27,dy:-12,duration:250,lunge:20,lift:-9,knockback:10,targetLift:11,effectY:-45,shake:3,flash:82,feedback:710}),
  tilt:move('rolling-load','tilt-rolls',{dx:22,dy:-7,duration:240,lunge:16,lift:-5,knockback:8,targetLift:-5,shake:2,flash:58,feedback:760,hitStagger:145}),
  claw:move('heavy-reach','claw-rake',{dx:29,dy:-3,duration:230,lunge:18,knockback:7,shake:2,feedback:650}),
  gut:move('waist-load','gut-rings',{dx:31,dy:-11,duration:270,lunge:23,lift:-8,knockback:13,targetLift:-8,shake:3,flash:84,feedback:740}),
  cradle:move('folding-entry','cradle-cage',{dx:33,dy:-9,duration:285,lunge:25,lift:-7,knockback:12,targetLift:7,shake:3,flash:94,feedback:820,announceBase:420}),
  scramble:move('rapid-feet','scramble-spiral',{dx:10,dy:-7,duration:230,lunge:3,lift:-6,knockback:0,shake:0,flash:42,feedback:580}),
  roll:move('shoulder-roll','granby-loop',{dx:-5,dy:-10,duration:270,lunge:8,lift:-8,knockback:0,shake:0,flash:44,feedback:620}),
  funk:move('cartwheel-entry','funk-wheel',{dx:37,dy:-18,duration:275,lunge:27,lift:-13,knockback:14,targetLift:-7,shake:2,flash:78,feedback:730}),
  switchb:move('direction-change','switch-arrows',{dx:35,dy:-5,duration:185,lunge:22,lift:-3,knockback:10,shake:2,flash:68,feedback:580}),
  pace:move('forward-pressure','pace-pulse',{dx:13,dy:0,duration:245,lunge:7,knockback:0,shake:0,flash:46,feedback:590}),
  flurry:move('repeated-rush','flurry-streaks',{dx:45,dy:1,duration:180,lunge:29,knockback:9,shake:2,flash:55,feedback:800,hitStagger:105}),
  grind:move('driving-pressure','grind-lines',{dx:38,dy:5,duration:260,lunge:27,lift:2,knockback:8,targetLift:4,effectY:-52,shake:3,flash:72,feedback:710}),
  pin:move('elevated-finish','pin-frame',{dx:40,dy:-21,duration:330,lunge:34,lift:-16,knockback:18,targetLift:10,shake:4,flash:115,feedback:940,announceBase:460}),
  stall:move('circle-away','circle-guard',{dx:-18,dy:-3,duration:245,lunge:-10,lift:-2,knockback:0,shake:0,flash:38,feedback:570}),
  desperation:move('last-charge','desperation-star',{dx:60,dy:7,duration:320,lunge:46,lift:-5,knockback:28,targetLift:-7,shake:4,flash:120,feedback:900,announceBase:470})
});

const FALLBACK=move('direct-entry','contact-burst');

export function battleChoreographyFor(moveKey){return BATTLE_CHOREOGRAPHY[moveKey]||FALLBACK;}

export function choreographySignature(entry){
  return [entry.motion,entry.effect,entry.windup.dx,entry.windup.dy,entry.impact.lunge,entry.impact.knockback,entry.tempo.hitStagger].join(':');
}
