export const ROSTER={
 // ---- STARTER LINE: NEUTRAL ----
 buckshot:{id:'buckshot',name:'Bucky Shotmaker',weight:'125',style:'Neutral',rarity:'Common',asset:'badger',color:0xc81f2b,stats:{hp:62,atk:18,def:14,spd:19,gas:74},moves:['single','highc','sprawl','pace'],bio:'Fast first attack. Great starter.',strengths:'Quick entries',weaknesses:'Can get ridden',personality:'Eager',evolvesTo:'buckvarsity',evolveLvl:10},
 buckvarsity:{id:'buckvarsity',name:'Varsity Bucky',weight:'133',style:'Neutral',rarity:'Common',asset:'badger',tint:0xffd27d,stats:{hp:78,atk:23,def:18,spd:22,gas:84},moves:['single','highc','reattack','double'],bio:'Earned the varsity singlet.',strengths:'All-around neutral',weaknesses:'Still learning top',personality:'Confident',evolvesTo:'buckallam',evolveLvl:18},
 buckallam:{id:'buckallam',name:'All-American Bucky',weight:'141',style:'Neutral',rarity:'Uncommon',asset:'badger',tint:0xffe9b0,stats:{hp:96,atk:30,def:23,spd:26,gas:96},moves:['blast','highc','reattack','flurry'],bio:'Podium-level shot selection.',strengths:'Finishes shots',weaknesses:'None obvious',personality:'Focused'},
 // ---- STARTER LINE: TOP ----
 matreturner:{id:'matreturner',name:'Mat Returner',weight:'165',style:'Top',rarity:'Common',asset:'top',color:0x5f4cc8,stats:{hp:72,atk:17,def:18,spd:12,gas:70},moves:['ride','claw','tilt','sprawl'],bio:'Pressure and mat control.',strengths:'Top pressure',weaknesses:'Slow feet',personality:'Quiet grinder',evolvesTo:'matgeneral',evolveLvl:10},
 matgeneral:{id:'matgeneral',name:'Mat General',weight:'174',style:'Top',rarity:'Common',asset:'top',tint:0xb9a8ff,stats:{hp:90,atk:22,def:24,spd:14,gas:80},moves:['ride','tilt','gut','sprawl'],bio:'Runs the top game like an offense.',strengths:'Mat return',weaknesses:'Scrambles',personality:'Composed',evolvesTo:'rideking',evolveLvl:18},
 rideking:{id:'rideking',name:'Ride King',weight:'184',style:'Top',rarity:'Uncommon',asset:'top',tint:0xd9ccff,stats:{hp:110,atk:29,def:30,spd:16,gas:92},moves:['ride','tilt','cradle','pin'],bio:'Nobody escapes the full ride.',strengths:'Nearfall',weaknesses:'Pace matches',personality:'Relentless'},
 // ---- STARTER LINE: SCRAMBLE ----
 fieldflyer:{id:'fieldflyer',name:'Field House Flyer',weight:'141',style:'Scramble',rarity:'Common',asset:'scramble',color:0xe47c27,stats:{hp:64,atk:18,def:13,spd:21,gas:69},moves:['scramble','roll','single','snap'],bio:'Chaotic and slippery.',strengths:'Scrambles',weaknesses:'Position discipline',personality:'Creative',evolvesTo:'funkflyer',evolveLvl:10},
 funkflyer:{id:'funkflyer',name:'Funk Flyer',weight:'149',style:'Scramble',rarity:'Common',asset:'scramble',tint:0xffc48a,stats:{hp:80,atk:24,def:17,spd:26,gas:78},moves:['scramble','funk','switchb','snap'],bio:'Turns bad positions into points.',strengths:'Transition',weaknesses:'Top control',personality:'Loose',evolvesTo:'scramblesaint',evolveLvl:18},
 scramblesaint:{id:'scramblesaint',name:'Scramble Saint',weight:'157',style:'Scramble',rarity:'Uncommon',asset:'scramble',tint:0xffe0bd,stats:{hp:98,atk:30,def:21,spd:30,gas:88},moves:['funk','scramble','cradle','reattack'],bio:'Never in danger. Only in transition.',strengths:'Never pinned',weaknesses:'Grinders',personality:'Fearless'},
 // ---- WILD / RECRUITABLE COMMONS ----
 pacesetter:{id:'pacesetter',name:'Pace Setter',weight:'149',style:'Pace',rarity:'Common',asset:'pace',color:0x2e9c57,stats:{hp:66,atk:16,def:15,spd:18,gas:86},moves:['pace','double','flurry','stall'],bio:'Wins on volume.',strengths:'Gas tank',weaknesses:'Big moves',personality:'Relentless',evolvesTo:'pacecommand',evolveLvl:12},
 pacecommand:{id:'pacecommand',name:'Pace Commander',weight:'157',style:'Pace',rarity:'Uncommon',asset:'pace',tint:0x8fe0a6,stats:{hp:88,atk:22,def:20,spd:24,gas:104},moves:['flurry','grind','pace','double'],bio:'Third period is his period.',strengths:'Never tires',weaknesses:'Big single shots',personality:'Patient'},
 drillpartner:{id:'drillpartner',name:'Drill Partner',weight:'133',style:'Neutral',rarity:'Uncommon',asset:'neutral',color:0xc81f2b,stats:{hp:68,atk:20,def:18,spd:20,gas:80},moves:['single','pace','roll','sprawl'],bio:'Clean technique.',strengths:'Fundamentals',weaknesses:'Finishing late',personality:'Coach-friendly',evolvesTo:'drillveteran',evolveLvl:12},
 drillveteran:{id:'drillveteran',name:'Drill Veteran',weight:'141',style:'Neutral',rarity:'Rare',asset:'neutral',tint:0xff9d9d,stats:{hp:92,atk:26,def:23,spd:23,gas:92},moves:['single','highc','reattack','double'],bio:'Ten years in the room.',strengths:'Everything solid',weaknesses:'Nothing flashy',personality:'Veteran'},
 lakechain:{id:'lakechain',name:'Lake Chain',weight:'133',style:'Neutral',rarity:'Uncommon',asset:'neutral',color:0xb82027,stats:{hp:70,atk:21,def:16,spd:22,gas:80},moves:['single','highc','double','reattack'],bio:'One attack becomes three.',strengths:'Chain wrestling',weaknesses:'Hand fighting',personality:'Competitive',evolvesTo:'chainmaster',evolveLvl:14},
 chainmaster:{id:'chainmaster',name:'Chain Master',weight:'141',style:'Neutral',rarity:'Rare',asset:'neutral',tint:0xff7d7d,stats:{hp:94,atk:28,def:20,spd:27,gas:90},moves:['blast','highc','double','reattack'],bio:'The chain never breaks.',strengths:'Combination attacks',weaknesses:'Single bad rep',personality:'Relentless'},
 whizzkid:{id:'whizzkid',name:'Whizzer Wizard',weight:'149',style:'Defense',rarity:'Uncommon',asset:'neutral',tint:0xbdb6ff,stats:{hp:76,atk:18,def:25,spd:18,gas:84},moves:['whizzer','sprawl','reattack','single'],bio:'You cannot score on him.',strengths:'Defense',weaknesses:'Slow to score',personality:'Patient'},
 lockthrow:{id:'lockthrow',name:'Locke Thrower',weight:'197',style:'Upperbody',rarity:'Uncommon',asset:'top',tint:0x8fd0ff,stats:{hp:82,atk:25,def:19,spd:11,gas:72},moves:['bodylock','headlock','snap','sprawl'],bio:'One lock and the lights go out.',strengths:'Upper body throws',weaknesses:'Leg attacks',personality:'Physical'},
 riverroller:{id:'riverroller',name:'River Roller',weight:'149',style:'Scramble',rarity:'Common',asset:'scramble',tint:0x9fe7ff,stats:{hp:70,atk:19,def:15,spd:23,gas:76},moves:['roll','scramble','switchb','snap'],bio:'Trains on the river trail.',strengths:'Rolls out of trouble',weaknesses:'Top pressure',personality:'Playful'},
 // ---- RARES ----
 tilttech:{id:'tilttech',name:'Tilt Technician',weight:'174',style:'Top',rarity:'Rare',asset:'top',color:0x594bc0,stats:{hp:76,atk:24,def:19,spd:15,gas:80},moves:['ride','tilt','pin','claw'],bio:'Nearfall machine.',strengths:'Nearfall turns',weaknesses:'Neutral pace',personality:'Calculating'},
 funklord:{id:'funklord',name:'Funk Lord',weight:'157',style:'Scramble',rarity:'Rare',asset:'scramble',tint:0xffd9a8,stats:{hp:82,atk:27,def:18,spd:28,gas:86},moves:['funk','scramble','cradle','switchb'],bio:'Inverted is his neutral.',strengths:'Unpredictable',weaknesses:'Basic wrestling',personality:'Wild card'},
 // ---- GYM BOSSES (not wild-recruitable) ----
 captainneutral:{id:'captainneutral',name:'Captain Neutral',weight:'174',style:'Neutral',rarity:'Elite',asset:'neutral',color:0xb71b25,stats:{hp:88,atk:26,def:21,spd:20,gas:90},moves:['single','highc','reattack','flurry'],bio:'Conference Arena gym leader. First badge test.',strengths:'All positions',weaknesses:'None obvious',personality:'Captain'},
 scrambleboss:{id:'scrambleboss',name:'The Funk Doctor',weight:'157',style:'Scramble',rarity:'Elite',asset:'scramble',tint:0xffb36b,stats:{hp:100,atk:29,def:22,spd:28,gas:96},moves:['funk','scramble','cradle','reattack'],bio:'River Trail gym leader. Nobody solves the scramble.',strengths:'Transition wrestling',weaknesses:'None obvious',personality:'Unbothered'},
 topboss:{id:'topboss',name:'The Anchor',weight:'197',style:'Top',rarity:'Elite',asset:'top',tint:0x7fb5ff,stats:{hp:112,atk:30,def:28,spd:16,gas:98},moves:['ride','tilt','cradle','pin'],bio:'Championship Hall gym leader. Nobody escapes the ride.',strengths:'Mat control',weaknesses:'None obvious',personality:'Immovable'}
};
export const STARTERS=['buckshot','matreturner','fieldflyer'];
export function scaledStats(id,lvl){const r=ROSTER[id]||ROSTER.buckshot;return {hp:r.stats.hp+lvl*5,atk:r.stats.atk+Math.floor(lvl*1.6),def:r.stats.def+Math.floor(lvl*1.3),spd:r.stats.spd+Math.floor(lvl*1.1),gas:r.stats.gas+lvl*2};}
export function makeMon(id,lvl){const s=scaledStats(id,lvl),r=ROSTER[id]||ROSTER.buckshot;const seed=Math.floor(Math.random()*7)-3;return {id,lvl,xp:0,hp:s.hp,gas:s.gas,score:0,boost:false,potential:{Common:'C+',Uncommon:'B',Rare:'A-',Elite:'A+'}[r.rarity]||'C',interest:45+Math.floor(Math.random()*38),training:{conditioning:0,technique:0,strength:0,speed:0,awareness:0},iv:seed,moves:[...(r.moves||[]).slice(0,4)]};}
export function xpNeed(m){return 18+m.lvl*9;}
export function addXp(m,amt){
  const out=[];m.xp+=amt;
  while(m.xp>=xpNeed(m)){
    m.xp-=xpNeed(m);m.lvl++;
    const r=ROSTER[m.id];
    if(r.evolvesTo&&m.lvl>=r.evolveLvl){
      const oldName=r.name;m.id=r.evolvesTo;const nr=ROSTER[m.id];
      m.moves=[...(nr.moves||[]).slice(0,4)];
      out.push(`${oldName} developed into ${nr.name}!`);
    }else{
      out.push(`${ROSTER[m.id].name} grew to Lv ${m.lvl}!`);
    }
    const s=scaledStats(m.id,m.lvl);m.hp=s.hp;m.gas=s.gas;
  }
  return out;
}
