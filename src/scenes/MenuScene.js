import {loadState,saveState,lead,resetState,caughtRecruitCount,defeatedWrestlerCount,advancePeriod} from '../systems/save.js';import {ROSTER,scaledStats,xpNeed,personaFor} from '../data/roster.js';import {BAG_ORDER,depositWrestler,ITEM_DEFS,practiceWrestler,SHOP_STOCK,swapLockerWrestler,useFilmStudy,withdrawWrestler} from '../systems/mechanics.js';import {travelTo} from '../systems/progression.js';import {uiBox,hpBar,setVirtualHandler} from '../systems/ui.js';import {setMuted,isMuted,sfx} from '../systems/audio.js';import {worldPlane,areaDimensions} from '../data/maps.js';
const Phaser = window.Phaser;
const BADGE_ORDER=['Field House Badge','Capitol Badge','Kohl Badge','Picnic Point Badge'];
const MAIN_OPTS=[['TRAVEL LINEUP','team'],['BAG','bag'],['ROSTER BOOK','dex'],['TOWN MAP','map'],['BADGES','badges'],['PRACTICE','practice'],['OBJECTIVES','objective'],['SAVE','save'],['OPTIONS','options']];
const BAG_ROWS=BAG_ORDER.map(key=>[key,ITEM_DEFS[key].name,ITEM_DEFS[key].description]);
const ICON_COLOR={team:0x3a6ea8,bag:0x3a8a52,dex:0x7a4ac9,map:0x4a8a9a,badges:0xc9962e,practice:0xc9622e,objective:0x2e9a95,save:0x555f6e,options:0x7d1017};
function icon(scene,x,y,kind,active){
  const bg=ICON_COLOR[kind]||0x555;const g=scene.add.graphics();
  g.fillStyle(0x000000,.25);g.fillRoundedRect(x-7,y-6,19,19,4);
  g.fillStyle(bg,active?1:.62);g.fillRoundedRect(x-8,y-7,19,19,4);
  g.lineStyle(1,0xffffff,.3);g.strokeRoundedRect(x-8,y-7,19,19,4);
  const cx=x+1.5,cy=y+2.5;g.fillStyle(0xffffff,1);g.lineStyle(1.6,0xffffff,1);
  if(kind==='team'){g.fillCircle(cx,cy-3,2.8);g.fillTriangle(cx-4.4,cy+5,cx+4.4,cy+5,cx,cy-1);}
  else if(kind==='bag'){g.fillRoundedRect(cx-5,cy-2,10,7.5,1.6);g.strokeRoundedRect(cx-2,cy-6,4,3.5,1);}
  else if(kind==='dex'){g.fillRoundedRect(cx-5,cy-5.5,10,11,1);g.lineStyle(1.2,bg,1);g.lineBetween(cx,cy-5.5,cx,cy+5.5);}
  else if(kind==='badges'){g.fillCircle(cx,cy-1,3.9);g.fillTriangle(cx-2.6,cy+2,cx+2.6,cy+2,cx,cy+6.4);}
  else if(kind==='practice'){g.fillRect(cx-5,cy-1.6,3.2,3.2);g.fillRect(cx+1.8,cy-1.6,3.2,3.2);g.fillRect(cx-2,cy-.6,4,1.3);}
  else if(kind==='objective'){g.lineStyle(1.8,0xffffff,1);g.lineBetween(cx-3.8,cy-5.4,cx-3.8,cy+5.4);g.fillTriangle(cx-3.8,cy-5.4,cx+4.4,cy-2.6,cx-3.8,cy+.2);}
  else if(kind==='save'){g.fillRoundedRect(cx-5,cy-5.5,10,11,1);g.fillStyle(bg,1);g.fillRect(cx-2.8,cy-5.5,5.6,4);}
  else if(kind==='options'){g.fillCircle(cx,cy,3.7);for(let a=0;a<6;a++){const ang=a*Math.PI/3;g.fillRect(cx+Math.cos(ang)*5.4-.9,cy+Math.sin(ang)*5.4-.9,1.8,1.8);}}
  else if(kind==='map'){g.fillRoundedRect(cx-5.5,cy-4.5,11,9,1);g.lineStyle(1.2,bg,1);g.lineBetween(cx-1.8,cy-4.5,cx-1.8,cy+4.5);g.lineBetween(cx+1.8,cy-4.5,cx+1.8,cy+4.5);g.fillStyle(0xb41820,1);g.fillCircle(cx+3.4,cy-2,1.4);}
  return g;
}
export class MenuScene extends Phaser.Scene{
  constructor(){super('MenuScene');}
  create(data={}){this.parent=data.parent;this.state=loadState();this.tab=data.tab||'main';this.sel=0;this.note='';this.confirmReset=false;this.lockerSwapBoxIndex=null;this.cameras.main.setBackgroundColor('rgba(0,0,0,.74)');this.cameras.main.fadeIn(115,0,0,0);this.input.keyboard.on('keydown-UP',()=>this.move(-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(1));this.input.keyboard.on('keydown-ENTER',()=>this.choose());this.input.keyboard.on('keydown-SPACE',()=>this.choose());this.input.keyboard.on('keydown-ESC',()=>this.back());setVirtualHandler(this);this.draw();}
  handleVirtualButton(k){if(k==='up'){sfx.menu_move();this.move(-1);}if(k==='down'){sfx.menu_move();this.move(1);}if(k==='a')this.choose();if(k==='b')this.back();}
  optionCount(){if(this.tab==='main')return MAIN_OPTS.length;if(this.tab==='map')return 1;if(this.tab==='objective')return 1;if(this.tab==='practice')return 5;if(this.tab==='shop')return SHOP_STOCK.length+1;if(this.tab==='locker')return Math.max(1,this.state.party.length+this.state.box.length);if(this.tab==='travel')return Math.max(1,this.travelDestinations().length);if(this.tab==='dex')return Object.keys(ROSTER).length;if(this.tab==='badges')return 1;if(this.tab==='options')return 2;if(this.tab==='bag')return BAG_ROWS.length;if(this.tab==='team')return Math.max(1,this.state.party.length);return 8;}
  draw(){
    this.children.removeAll();
    if(this.tab==='main')return this.drawMainScreen();
    uiBox(this,10,10,300,204);
    const titles={shop:"BUCKY'S LOCKER ROOM",locker:'TEAM LOCKER',travel:'BUS PASS',dex:'ROSTER BOOK',team:'TRAVEL LINEUP',practice:'PRACTICE',objective:'OBJECTIVES',bag:'BAG',badges:'BADGES',options:'OPTIONS',map:'TOWN MAP'};
    this.add.text(160,22,titles[this.tab]||'MENU',{fontFamily:'monospace',fontSize:12,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    const singlets=(this.state.items.practiceSinglet||0)+(this.state.items.travelSinglet||0)+(this.state.items.starterSinglet||0);
    this.add.text(22,36,`GR ${this.state.grit}  REP ${this.state.rep}  SNG ${singlets}  ${this.state.day?.period||'Morning'}`,{fontFamily:'monospace',fontSize:8,color:'#333'});
    if(this.tab==='shop')this.drawShop();else if(this.tab==='locker')this.drawLocker();else if(this.tab==='travel')this.drawTravel();else if(this.tab==='dex')this.drawDex();else if(this.tab==='team')this.drawTeam();else if(this.tab==='practice')this.drawPractice();else if(this.tab==='objective')this.drawObjective();else if(this.tab==='bag')this.drawBag();else if(this.tab==='badges')this.drawBadges();else if(this.tab==='options')this.drawOptions();else if(this.tab==='map')this.drawMap();
    this.add.text(160,202,this.note||'A SELECT  B BACK',{fontFamily:'monospace',fontSize:8,color:'#555'}).setOrigin(.5);
  }
  drawMap(){
    // The Town Map renders the validator-checked world plane: every outdoor
    // area stitched by its exit offsets onto ONE geography (FireRed's map-
    // connection insight). West grows the team; east wins the title.
    const {pos}=worldPlane();
    const COLORS={campus:0xb44a3f,lakeshore:0x74a85c,river:0x5d9450,downtown:0x9a6a52};
    const LABELS={campus:'BASCOM HILL',lakeshore:'LAKESHORE PATH',river:'PICNIC POINT',downtown:'STATE STREET'};
    let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    for(const [id,p] of Object.entries(pos)){const d=areaDimensions(id);minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x+d.width);maxY=Math.max(maxY,p.y+d.height);}
    const s=Math.min(284/(maxX-minX),90/(maxY-minY));
    const ox=160-((minX+maxX)/2)*s,oy=104-((minY+maxY)/2)*s;
    const g=this.add.graphics();
    for(const [id,p] of Object.entries(pos)){
      const d=areaDimensions(id);const rx=ox+p.x*s,ry=oy+p.y*s,rw=d.width*s,rh=d.height*s;
      g.fillStyle(COLORS[id]||0x777,1);g.fillRect(rx,ry,rw,rh);
      if(id==='lakeshore'||id==='river'){g.fillStyle(0x3a6ea8,1);g.fillRect(rx,ry,rw,Math.max(3,4*s));}
      g.lineStyle(1,0x111111,.8);g.strokeRect(rx,ry,rw,rh);
      const above=id==='downtown';
      this.add.text(rx+rw/2,above?ry-8:ry+rh+3,LABELS[id],{fontFamily:'monospace',fontSize:7,color:'#333',fontStyle:'bold'}).setOrigin(.5,0);
    }
    const mark=(aid,tx,ty,ch,color)=>{const p=pos[aid];if(!p)return;this.add.text(ox+(p.x+tx)*s,oy+(p.y+ty)*s,ch,{fontFamily:'monospace',fontSize:8,color,fontStyle:'bold'}).setOrigin(.5);};
    mark('downtown',21,4,'★','#d6a336');   // the Kohl Center marquee
    mark('campus',14,19,'▪','#7d1017');    // Field House
    // you-are-here: interiors anchor to the door they entered through
    const ANCHOR={fieldhouse:['campus',14,19],shop:['campus',5,5],recovery:['campus',22,5],studyhall:['campus',22,12],conference:['campus',14,1],championship:['downtown',21,4]};
    let here=null;const area=this.state.area||'fieldhouse';
    if(pos[area]&&this.state.pos)here=[area,this.state.pos.x,this.state.pos.y];else if(ANCHOR[area])here=ANCHOR[area];
    if(here&&pos[here[0]]){
      const hp=pos[here[0]];const hx=ox+(hp.x+here[1])*s,hy=oy+(hp.y+here[2])*s;
      const dotO=this.add.circle(hx,hy,3.4,0xb41820,1);const dot=this.add.circle(hx,hy,2,0xffffff,1);
      this.tweens.add({targets:[dot,dotO],alpha:.25,duration:420,yoyo:true,repeat:-1});
    }
    this.add.text(24,178,'WEST: GROW THE TEAM',{fontFamily:'monospace',fontSize:7,color:'#555',fontStyle:'bold'});
    this.add.text(296,178,'EAST: WIN THE TITLE',{fontFamily:'monospace',fontSize:7,color:'#555',fontStyle:'bold'}).setOrigin(1,0);
  }
  drawMainScreen(){
    // left: icon list panel. right: lead-wrestler card. Native 320x224 layout.
    uiBox(this,6,6,192,212);
    this.add.text(16,14,'MENU',{fontFamily:'monospace',fontSize:11,color:'#b41820',fontStyle:'bold'});
    this.add.line(0,0,16,30,182,30,0xa58d65,.7).setOrigin(0);
    MAIN_OPTS.forEach(([label],i)=>{
      const y=42+i*19,active=i===this.sel;
      if(i%2===0){const band=this.add.graphics();band.fillStyle(0x000000,.035);band.fillRect(12,y-8,180,19);}
      if(active){const hi=this.add.graphics();hi.fillStyle(0xb41820,.14);hi.fillRoundedRect(12,y-8,180,19,3);hi.lineStyle(1,0xb41820,.5);hi.strokeRoundedRect(12,y-8,180,19,3);}
      icon(this,32,y+2,MAIN_OPTS[i][1],active);
      this.add.text(52,y-3,label,{fontFamily:'monospace',fontSize:9,color:active?'#b41820':'#111',fontStyle:'bold'});
      this.add.text(188,y-3,'>',{fontFamily:'monospace',fontSize:9,color:active?'#b41820':'#999'}).setOrigin(1,0);
    });
    uiBox(this,206,6,108,212);
    const l=lead(this.state),r=l?ROSTER[l.id]:null;
    if(r&&this.textures.exists('portrait_'+r.asset)){this.add.image(260,44,'portrait_'+r.asset).setScale(.3);}
    this.add.text(260,76,l?r.name.split(' ')[0]:'No lead',{fontFamily:'monospace',fontSize:9,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    if(l)this.add.text(260,88,`Lv ${l.lvl}  ${personaFor(l.id)}`,{fontFamily:'monospace',fontSize:7,color:'#555'}).setOrigin(.5);
    this.add.line(0,0,214,98,306,98,0xa58d65,.6).setOrigin(0);
    this.add.text(214,104,'BADGES',{fontFamily:'monospace',fontSize:8,color:'#333',fontStyle:'bold'});
    BADGE_ORDER.forEach((b,i)=>{const cx=224+i*22,cy=124,got=this.state.badges.includes(b);const g=this.add.graphics();g.lineStyle(1,0x8a6a42,1);g.fillStyle(got?0xd6a336:0xe8dcc0,1);g.fillCircle(cx,cy,7);g.strokeCircle(cx,cy,7);if(got)this.add.text(cx,cy,'★',{fontFamily:'monospace',fontSize:8,color:'#7d1017'}).setOrigin(.5);});
    this.add.line(0,0,214,138,306,138,0xa58d65,.6).setOrigin(0);
    const d=this.state.day||{name:'Saturday',period:'Morning'};
    this.add.text(214,144,'DAY',{fontFamily:'monospace',fontSize:8,color:'#333',fontStyle:'bold'});
    this.add.text(306,144,`${d.name} ${d.period}`,{fontFamily:'monospace',fontSize:7,color:'#111'}).setOrigin(1,0);
    this.add.text(214,158,'GRIT',{fontFamily:'monospace',fontSize:8,color:'#333',fontStyle:'bold'});
    this.add.text(306,158,`${this.state.grit}`,{fontFamily:'monospace',fontSize:9,color:'#111',fontStyle:'bold'}).setOrigin(1,0);
    this.add.text(214,172,'REP',{fontFamily:'monospace',fontSize:8,color:'#333',fontStyle:'bold'});
    this.add.text(306,172,`${this.state.rep}`,{fontFamily:'monospace',fontSize:9,color:'#111',fontStyle:'bold'}).setOrigin(1,0);
    if(this.state.tournament?.champion)this.add.text(260,188,'BIG TEN CHAMPION',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(214,198,`Roster ${caughtRecruitCount(this.state)}  Wins ${this.state.stats?.wins||0}`,{fontFamily:'monospace',fontSize:7,color:'#555'});
    this.add.text(160,216,this.note||'A OPEN   B CLOSE',{fontFamily:'monospace',fontSize:8,color:'#c9c0aa'}).setOrigin(.5);
  }
  drawBag(){
    this.add.text(24,52,'ITEMS',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});
    BAG_ROWS.forEach((it,i)=>{const n=this.state.items?.[it[0]]||0,y=64+i*22,active=i===this.sel;
      this.add.text(26,y,`${active?'▶':' '} ${it[1]}`,{fontFamily:'monospace',fontSize:9,color:active?'#b41820':'#111',fontStyle:'bold'});
      this.add.text(296,y,`x${n}`,{fontFamily:'monospace',fontSize:9,color:'#111'}).setOrigin(1,0);
      this.add.text(32,y+10,it[2],{fontFamily:'monospace',fontSize:6,color:'#555'});
    });
  }
  drawBadges(){
    this.add.text(24,52,'CONFERENCE BADGES',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});
    const names={'Field House Badge':'Defeat The Opener','Capitol Badge':'Defeat The Senator','Kohl Badge':'Defeat The Anchor','Picnic Point Badge':'Defeat The Funk Doctor'};
    BADGE_ORDER.forEach((b,i)=>{const y=78+i*30,got=this.state.badges.includes(b);
      const g=this.add.graphics();g.lineStyle(1,0x8a6a42,1);g.fillStyle(got?0xd6a336:0xe8dcc0,1);g.fillCircle(40,y,10);g.strokeCircle(40,y,10);
      if(got)this.add.text(40,y,'★',{fontFamily:'monospace',fontSize:11,color:'#7d1017'}).setOrigin(.5);
      this.add.text(60,y-10,b,{fontFamily:'monospace',fontSize:9,color:got?'#111':'#999',fontStyle:'bold'});
      this.add.text(60,y+2,got?names[b]:'Not yet earned.',{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:230}});
    });
  }
  drawOptions(){
    this.add.text(24,52,'OPTIONS',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});
    const muted=isMuted();
    this.add.text(26,74,`${this.sel===0?'▶ ':'  '}SOUND: ${muted?'OFF':'ON'}`,{fontFamily:'monospace',fontSize:9,color:this.sel===0?'#b41820':'#111',fontStyle:'bold'});
    this.add.text(26,88,'A to toggle. Music and sound effects.',{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:270}});
    this.add.text(26,140,`${this.sel===1?'▶ ':'  '}ERASE SAVE DATA`,{fontFamily:'monospace',fontSize:9,color:this.sel===1?'#b41820':'#111',fontStyle:'bold'});
    this.add.text(26,154,this.sel===1&&this.confirmReset?'Press A again to confirm. This cannot be undone.':'Press A to erase this save and start over.',{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:270}});
  }
  drawObjective(){const log=this.state.objective?.log||['Meet the Head Coach'];this.add.text(24,52,'CURRENT GOAL',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});this.add.text(28,68,log[0]||'Opening complete.',{fontFamily:'monospace',fontSize:10,color:'#111',fontStyle:'bold',wordWrap:{width:260}});this.add.text(24,96,'PROGRESSION',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});log.slice(0,6).forEach((x,i)=>this.add.text(30,112+i*13,`${i===0?'▶':'✓'} ${x}`,{fontFamily:'monospace',fontSize:8,color:i===0?'#111':'#555'}));}
  drawTeam(){
    this.add.text(24,50,'SIX-WRESTLER TRAVEL LINEUP',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});
    if(!this.state.party.length){this.add.text(30,74,'No wrestlers yet.',{fontFamily:'monospace',fontSize:9,color:'#111'});return;}
    this.state.party.slice(0,6).forEach((m,i)=>{
      const r=ROSTER[m.id],st=scaledStats(m.id,m.lvl,m),y=66+i*20,active=i===this.sel;
      if(active){const hi=this.add.graphics();hi.fillStyle(0xb41820,.1);hi.fillRoundedRect(18,y-8,284,20,3);}
      if(this.textures.exists('portrait_'+r.asset))this.add.image(32,y+2,'portrait_'+r.asset).setScale(.14);
      this.add.text(46,y-6,`${active?'▶':' '}${r.name.split(' ')[0]} L${m.lvl}${i===0?' ★':''}`,{fontFamily:'monospace',fontSize:8,color:active?'#b41820':'#111',fontStyle:'bold'});
      this.add.text(46,y+4,personaFor(m.id),{fontFamily:'monospace',fontSize:6,color:'#7a4ac9',fontStyle:'bold'});
      this.add.text(134,y-6,`${r.style}`,{fontFamily:'monospace',fontSize:7,color:'#333'});
      this.add.text(134,y+3,'COND',{fontFamily:'monospace',fontSize:5,color:'#3a8a52',fontStyle:'bold'});
      hpBar(this,146,y+3,58,4,m.hp/st.hp,0x55b867);
      this.add.text(210,y+3,'STA',{fontFamily:'monospace',fontSize:5,color:'#355f87',fontStyle:'bold'});
      hpBar(this,222,y+3,58,4,m.stamina/st.stamina,0x5aa4e6);
      this.add.text(288,y-6,'XP',{fontFamily:'monospace',fontSize:5,color:'#777',fontStyle:'bold'});
      hpBar(this,288,y+3,14,4,Math.min(1,m.xp/xpNeed(m)),0x3aa5d1);
    });
    const m=this.state.party[this.sel],r=m&&ROSTER[m.id];
    if(r)this.add.text(24,190,`A SET LEAD • ${r.rarity} • ${r.bio}`,{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:275}});
  }
  travelDestinations(){return (this.state.travel?.unlockedTowns||[]).map(id=>this.state.travel?.destinations?.[id]).filter(Boolean);}
  drawTravel(){const destinations=this.travelDestinations();if(!this.state.keyItems?.busPass){this.add.text(24,64,'BUS PASS REQUIRED',{fontFamily:'monospace',fontSize:10,color:'#b41820',fontStyle:'bold'});this.add.text(24,84,"The Senator's staff issues the Bus Pass after the Capitol Badge.",{fontFamily:'monospace',fontSize:8,color:'#555',wordWrap:{width:270}});return;}this.add.text(24,52,'UNLOCKED TOWNS',{fontFamily:'monospace',fontSize:8,color:'#b41820',fontStyle:'bold'});destinations.forEach((destination,i)=>this.add.text(28,72+i*20,`${i===this.sel?'>':' '} ${destination.name}`,{fontFamily:'monospace',fontSize:9,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'}));}
  drawLocker(){const rows=[...this.state.party.map((m,i)=>({m,i,where:'LINEUP'})),...this.state.box.map((m,i)=>({m,i,where:'LOCKER'}))];this.add.text(24,50,`TRAVEL ${this.state.party.length}/6   LOCKER ${this.state.box.length}`,{fontFamily:'monospace',fontSize:8,color:'#b41820',fontStyle:'bold'});if(!rows.length){this.add.text(24,78,'No wrestlers stored.',{fontFamily:'monospace',fontSize:9,color:'#111'});return;}const start=Math.max(0,Math.min(this.sel-3,Math.max(0,rows.length-7)));rows.slice(start,start+7).forEach((row,j)=>{const i=start+j,r=ROSTER[row.m.id],y=68+j*17,active=i===this.sel;if(active){const g=this.add.graphics();g.fillStyle(0xb41820,.1);g.fillRoundedRect(18,y-5,284,16,2);}this.add.text(24,y,`${active?'>':' '} ${row.where==='LINEUP'?'L':'K'} ${r.name} Lv${row.m.lvl}`,{fontFamily:'monospace',fontSize:8,color:active?'#b41820':'#111',fontStyle:'bold'});this.add.text(294,y,`${r.style}`,{fontFamily:'monospace',fontSize:7,color:'#555'}).setOrigin(1,0);});this.add.text(24,190,this.lockerSwapBoxIndex!==null?'Choose a lineup slot to exchange.':'A moves a wrestler between lineup and locker.',{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:275}});}
  drawPractice(){const opts=[['CONDITIONING','Stamina +4'],['TECHNIQUE','Accuracy +1.5%'],['STRENGTH','Attack +2'],['SPEED','Speed +2'],['MAT AWARENESS','Defense +2']];this.add.text(24,52,'PRACTICE PLAN',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});const l=lead(this.state);opts.forEach((o,i)=>{this.add.text(28,72+i*20,`${i===this.sel?'>':' '} ${o[0]} +1`,{fontFamily:'monospace',fontSize:8,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'});this.add.text(148,74+i*20,o[1],{fontFamily:'monospace',fontSize:6,color:'#555'});});if(l){const tr=l.training||{};this.add.text(228,72,`Lead: ${ROSTER[l.id].name.split(' ')[0]} L${l.lvl}`,{fontFamily:'monospace',fontSize:7,color:'#111'});this.add.text(228,88,`COND ${tr.conditioning||0}\nTECH ${tr.technique||0}\nSTR  ${tr.strength||0}\nSPD  ${tr.speed||0}\nAWR  ${tr.awareness||0}`,{fontFamily:'monospace',fontSize:7,color:'#333',lineSpacing:3});this.add.text(228,158,'3 GR\nTime +1',{fontFamily:'monospace',fontSize:7,color:'#555'});}else this.add.text(220,80,'No lead.',{fontFamily:'monospace',fontSize:8,color:'#111'});}
  doPractice(){const opts=['conditioning','technique','strength','speed','awareness'];const l=lead(this.state);if(!l){this.note='NO WRESTLER.';return this.draw();}if(this.state.grit<3){this.note='NEED 3 GRIT.';return this.draw();}const k=opts[this.sel],result=practiceWrestler(l,k);if(!result.ok){this.note=result.reason==='cap'?'TRAINING CAP REACHED.':'CANNOT PRACTICE.';return this.draw();}this.state.training=this.state.training||{};this.state.training[k]=(this.state.training[k]||0)+1;this.state.grit-=3;this.state.stats.practices=(this.state.stats.practices||0)+1;this.state.flags.practiceCount=(this.state.flags.practiceCount||0)+1;const period=advancePeriod(this.state);saveState(this.state);this.note=`${k.toUpperCase()} +1. NOW ${period.toUpperCase()}.`;this.draw();}
  drawShop(){[...SHOP_STOCK,{key:'close',name:'CLOSE',price:0}].forEach((it,i)=>this.add.text(26,58+i*22,`${i===this.sel?'>':' '} ${it.name} ${it.price?it.price+' RP':''}`,{fontFamily:'monospace',fontSize:8,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'}));const it=SHOP_STOCK[this.sel];if(it)this.add.text(190,58,it.description,{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:105}});}
  drawDex(){
    const ids=Object.keys(ROSTER),start=Math.max(0,Math.min(this.sel-3,ids.length-8));
    this.add.text(22,50,`SEEN ${Object.values(this.state.dex.seen).filter(Boolean).length}/${ids.length}  BEAT ${defeatedWrestlerCount(this.state)}/${ids.length}  SIGN ${caughtRecruitCount(this.state)}`,{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});
    ids.slice(start,start+8).forEach((id,j)=>{const i=start+j,r=ROSTER[id],known=this.state.dex.seen[id],caught=this.state.dex.caught[id],defeated=this.state.dex.defeated[id],y=66+j*16,active=i===this.sel;this.add.text(24,y,`${active?'>':' '} ${caught?'+':defeated?'x':known?'.':'?'} ${known?r.name:'UNKNOWN'}`,{fontFamily:'monospace',fontSize:7,color:active?'#b41820':known?'#111':'#777',fontStyle:active?'bold':'normal'});});
    const id=ids[this.sel],r=ROSTER[id],known=this.state.dex.seen[id];
    if(!known){this.add.text(210,82,'NO SCOUT REPORT',{fontFamily:'monospace',fontSize:8,color:'#777',fontStyle:'bold'});this.add.text(210,98,'Meet this wrestler in the world to add an entry.',{fontFamily:'monospace',fontSize:7,color:'#555',wordWrap:{width:88}});return;}
    if(this.textures.exists('portrait_'+r.asset))this.add.image(252,78,'portrait_'+r.asset).setScale(.22);
    this.add.text(208,105,r.name,{fontFamily:'monospace',fontSize:8,color:'#111',fontStyle:'bold',wordWrap:{width:90}});
    this.add.text(208,126,`${r.style} / ${personaFor(id)}\n${r.weight} lb / ${r.rarity}`,{fontFamily:'monospace',fontSize:7,color:'#555',lineSpacing:3});
    this.add.text(208,158,r.bio,{fontFamily:'monospace',fontSize:6,color:'#333',wordWrap:{width:90}});
  }
  move(d){this.note='';this.confirmReset=false;this.sel=Phaser.Math.Wrap(this.sel+d,0,this.optionCount());this.draw();}
  choose(){
    if(this.tab==='main'){const key=MAIN_OPTS[this.sel][1];if(key==='save'){saveState(this.state);this.note='SAVED.';return this.draw();}this.tab=key;this.sel=0;return this.draw();}
    if(this.tab==='objective')return this.back();
    if(this.tab==='map')return this.back();
    if(this.tab==='practice')return this.doPractice();
    if(this.tab==='shop')return this.chooseShop();
    if(this.tab==='locker')return this.chooseLocker();
    if(this.tab==='travel')return this.chooseTravel();
    if(this.tab==='team')return this.chooseTeam();
    if(this.tab==='dex')return;
    if(this.tab==='badges')return;
    if(this.tab==='bag')return this.chooseBag();
    if(this.tab==='options')return this.chooseOptions();
  }
  chooseTeam(){if(!this.state.party.length)return this.back();if(this.sel>0){const [picked]=this.state.party.splice(this.sel,1);this.state.party.unshift(picked);}this.state.active=0;this.sel=0;saveState(this.state);this.note='LEAD WRESTLER SET.';this.draw();}
  chooseLocker(){const partyCount=this.state.party.length;if(this.lockerSwapBoxIndex!==null){if(this.sel>=partyCount){this.note='CHOOSE A LINEUP SLOT.';return this.draw();}const result=swapLockerWrestler(this.state,this.sel,this.lockerSwapBoxIndex);this.lockerSwapBoxIndex=null;if(result.ok){saveState(this.state);this.note='LINEUP AND LOCKER EXCHANGED.';}this.sel=0;return this.draw();}if(this.sel<partyCount){const result=depositWrestler(this.state,this.sel);if(!result.ok){this.note='YOUR LINEUP NEEDS ONE WRESTLER.';return this.draw();}saveState(this.state);this.sel=Math.min(this.sel,this.optionCount()-1);this.note='MOVED TO TEAM LOCKER.';return this.draw();}const boxIndex=this.sel-partyCount,result=withdrawWrestler(this.state,boxIndex);if(result.ok){saveState(this.state);this.sel=0;this.note='ADDED TO TRAVEL LINEUP.';return this.draw();}if(result.reason==='full'){this.lockerSwapBoxIndex=boxIndex;this.sel=0;this.note='LINEUP FULL. CHOOSE A SLOT TO EXCHANGE.';return this.draw();}}
  chooseTravel(){if(!this.state.keyItems?.busPass){this.note='BUS PASS REQUIRED.';return this.draw();}const destination=this.travelDestinations()[this.sel];if(!destination||!travelTo(this.state,destination.id)){this.note='DESTINATION UNAVAILABLE.';return this.draw();}saveState(this.state);this.scene.stop();if(this.parent?.scene?.restart)this.parent.scene.restart();}
  chooseShop(){const it=SHOP_STOCK[this.sel];if(!it)return this.close();if(this.state.rep>=it.price){this.state.rep-=it.price;this.state.items[it.key]=(this.state.items[it.key]||0)+1;saveState(this.state);this.note=`BOUGHT ${it.name}.`;}else this.note=`NEED ${it.price} REP.`;this.draw();}
  chooseBag(){const key=BAG_ROWS[this.sel]?.[0],l=lead(this.state);if(!key)return;if((this.state.items[key]||0)<=0){this.note='NONE LEFT.';return this.draw();}if(key==='filmStudy'){if(useFilmStudy(this.state)){saveState(this.state);this.note='NEXT THREE RECRUIT ATTEMPTS IMPROVED.';}return this.draw();}if(ITEM_DEFS[key].kind==='singlet'){this.note='USE SINGLETS WHILE SCOUTING.';return this.draw();}if(!l){this.note='NO WRESTLER.';return this.draw();}const stats=scaledStats(l.id,l.lvl,l);if(key==='sportsDrink'){if(l.stamina>=stats.stamina){this.note='STAMINA IS FULL.';return this.draw();}l.stamina=Math.min(stats.stamina,l.stamina+24);}else if(key==='athleticTape'){if(l.hp>=stats.hp){this.note='CONDITION IS FULL.';return this.draw();}l.hp=Math.min(stats.hp,l.hp+20);}this.state.items[key]--;saveState(this.state);this.note=`USED ${ITEM_DEFS[key].name}.`;this.draw();}
  chooseOptions(){
    if(this.sel===0){const next=!isMuted();setMuted(next);this.state.audioMuted=next;saveState(this.state);this.note=next?'SOUND OFF.':'SOUND ON.';return this.draw();}
    return this.resetDemo();
  }
  resetDemo(){if(!this.confirmReset){this.confirmReset=true;this.note='A AGAIN TO ERASE.';return this.draw();}resetState();this.scene.stop('OverworldScene');this.scene.start('TitleScene');}
  back(){if(this.tab==='locker'&&this.lockerSwapBoxIndex!==null){this.lockerSwapBoxIndex=null;this.sel=0;this.note='EXCHANGE CANCELED.';this.draw();return;}if(this.tab!=='main'){this.tab='main';this.sel=0;this.confirmReset=false;this.draw();return;}this.close();}
  close(){this.scene.stop();if(this.parent?.drawHud)this.parent.drawHud();if(this.parent?.handleVirtualButton)setVirtualHandler(this.parent);}
}
