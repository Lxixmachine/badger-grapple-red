import {chromium} from '@playwright/test';
const save={playerName:'Coach',party:[{id:'buckallam',lvl:20,xp:0,hp:200,gas:140,score:0,moves:['blast','highc','reattack','flurry']}],active:0,badges:['W Badge','Neutral Badge','Scramble Badge'],items:{invite:9,energy:2,tape:1,film:1},flags:{introDone:true,coachIntro:true,assignment:true},area:'campus',pos:{x:3,y:7},
 trainersDefeated:{campus_recruit:true,campus_rival:true,lakeshore_marina:true,lakeshore_sandy:true,downtown_deion:true,river_gus:true,river_tavi:true}};
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:660,height:760}});
await pg.addInitScript(s=>localStorage.setItem('badger_grapple_red_engine_v2',JSON.stringify(s)),save);
await pg.goto('http://127.0.0.1:4173/?test=1');
await pg.waitForFunction(()=>window.__badgerTest?.activeSceneKeys().includes('TitleScene'));
await pg.evaluate(()=>window.__badgerTest.press('a'));
await pg.waitForFunction(()=>window.__badgerTest.activeSceneKeys().includes('OverworldScene'));
const st=async()=>{const o=await pg.evaluate(()=>window.__badgerTest.sceneState('OverworldScene'));if(!o?.active)return null;
  // wild encounter may hijack: if scout scene active, leave it (B)
  return {area:o.area,pos:o.tilePos,msg:o.message};};
const leave=async()=>{const keys=await pg.evaluate(()=>window.__badgerTest.activeSceneKeys());
  if(keys.includes('ScoutScene')){await pg.evaluate(()=>window.__badgerTest.press('b'));await pg.waitForTimeout(500);}};
const step=async dir=>{await leave();let before=await st();if(!before){await leave();before=await st();}
  for(let i=0;i<5;i++){await pg.evaluate(d=>window.__badgerTest.press(d),dir);await pg.waitForTimeout(240);await leave();const now=await st();
    if(now&&(now.pos.x!==before.pos.x||now.pos.y!==before.pos.y||now.area!==before.area))return now;}
  return st();};
const clear=async()=>{const s2=await st();if(s2?.msg){await pg.evaluate(()=>window.__badgerTest.press('b'));await pg.waitForTimeout(200);}};
const shot=n=>pg.screenshot({path:`/tmp/claude-0/-home-user-badger-grapple-red/916296ba-f176-5d61-b36d-21fef6b0bec5/scratchpad/golden_${n}.png`,clip:{x:0,y:0,width:660,height:500}});
const legs=[];
await step('left');await step('left');let s1=await st();legs.push(['west of the Hill',s1.area,s1.pos]);await clear();await pg.waitForTimeout(300);await shot('lakeshore');
await step('down');await step('down');
for(let i=0;i<34;i++){const now=await step('left');if(now?.area==='river')break;if(now?.msg)await clear();}
let s2=await st();legs.push(['far west',s2.area,s2.pos]);await clear();await pg.waitForTimeout(300);await shot('picnic');
for(let i=0;i<34;i++){const now=await step('right');if(now?.area==='lakeshore')break;if(now?.msg)await clear();}
await step('up');await step('up');
for(let i=0;i<34;i++){const now=await step('right');if(now?.area==='campus')break;if(now?.msg)await clear();}
let s3=await st();legs.push(['back on the Hill',s3.area,s3.pos]);await clear();
for(let i=0;i<34;i++){const now=await step('right');if(now?.area==='downtown')break;if(now?.msg)await clear();}
let s4=await st();legs.push(['east edge',s4.area,s4.pos]);await clear();await pg.waitForTimeout(300);await shot('statestreet');
for(let i=0;i<26;i++){const now=await step('right');if(now&&now.pos.x>=21)break;if(now?.msg)await clear();}
let cur=await st();while(cur.pos.x!==21){await step(cur.pos.x<21?'right':'left');cur=await st();}
while(cur.pos.y>5){await step('up');cur=await st();}
let s5=await step('up');legs.push(['through the marquee',s5.area,s5.pos]);await clear();await pg.waitForTimeout(300);await shot('kohl');
for(const [label,area,pos] of legs)console.log(label,'->',area,JSON.stringify(pos));
console.log('GOLDEN PATH:', s1.area==='lakeshore'&&s2.area==='river'&&s3.area==='campus'&&s4.area==='downtown'&&s5.area==='championship'?'PASS':'CHECK');
await b.close();
