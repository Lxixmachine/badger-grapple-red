import {loadState,saveState,lead,resetState,caughtRecruitCount,defeatedWrestlerCount,advancePeriod} from '../systems/save.js';import {ROSTER,currentMoveStamina,scaledStats,personaFor,wrestlerName} from '../data/roster.js';import {MOVES,moveStaminaMax} from '../data/moves.js';import {experienceProgress} from '../data/experience.js';import {effortTotal,MAX_TOTAL_EFFORT,natureFor,STAT_LABELS} from '../data/stats.js';import {BAG_ORDER,depositWrestler,ITEM_DEFS,practiceWrestler,restoreTechniqueStamina,SHOP_STOCK,swapLockerWrestler,totalMoveStamina,totalMoveStaminaMax,useFilmStudy,withdrawWrestler} from '../systems/mechanics.js';import {travelTo} from '../systems/progression.js';import {FONT,uiBox,hpBar,setVirtualHandler} from '../systems/ui.js';import {setMuted,isMuted,sfx} from '../systems/audio.js';import {worldPlane,areaDimensions} from '../data/maps.js';
import {fitLegacyViewport} from '../systems/legacyViewport.js';
import seasonLayouts from '../data/seasonOneLayouts.json';
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
  create(data={}){fitLegacyViewport(this);this.parent=data.parent;this.state=loadState();this.tab=data.tab||'main';this.sel=0;this.note='';this.summaryIndex=0;this.summaryPage=0;this.confirmReset=false;this.lockerSwapBoxIndex=null;this.cameras.main.setBackgroundColor('rgba(0,0,0,.74)');this.cameras.main.fadeIn(115,0,0,0);this.input.keyboard.on('keydown-UP',()=>this.move(-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(1));this.input.keyboard.on('keydown-LEFT',()=>this.side(-1));this.input.keyboard.on('keydown-RIGHT',()=>this.side(1));this.input.keyboard.on('keydown-ENTER',()=>this.choose());this.input.keyboard.on('keydown-SPACE',()=>this.choose());this.input.keyboard.on('keydown-N',()=>this.renameSelected());this.input.keyboard.on('keydown-ESC',()=>this.back());setVirtualHandler(this);this.draw();}
  handleVirtualButton(k){if(k==='up'){sfx.menu_move();this.move(-1);}if(k==='down'){sfx.menu_move();this.move(1);}if(k==='left')this.side(-1);if(k==='right')this.side(1);if(k==='a')this.choose();if(k==='start')this.renameSelected();if(k==='b')this.back();}
  optionCount(){if(this.tab==='main')return MAIN_OPTS.length;if(this.tab==='map'||this.tab==='summary')return 1;if(this.tab==='objective')return 1;if(this.tab==='practice')return 6;if(this.tab==='shop')return SHOP_STOCK.length+1;if(this.tab==='locker')return Math.max(1,this.state.party.length+this.state.box.length);if(this.tab==='travel')return Math.max(1,this.travelDestinations().length);if(this.tab==='dex')return Object.keys(ROSTER).length;if(this.tab==='badges')return 1;if(this.tab==='options')return 2;if(this.tab==='bag')return BAG_ROWS.length;if(this.tab==='team')return Math.max(1,this.state.party.length);return 8;}
  draw(){
    this.children.removeAll();
    if(this.tab==='main')return this.drawMainScreen();
    if(this.tab==='summary')return this.drawSummary();
    uiBox(this,10,10,300,204);
    const titles={shop:"BUCKY'S LOCKER ROOM",locker:'TEAM LOCKER',travel:'BUS PASS',dex:'ROSTER BOOK',team:'TRAVEL LINEUP',practice:'PRACTICE',objective:'OBJECTIVES',bag:'BAG',badges:'BADGES',options:'OPTIONS',map:'TOWN MAP'};
    this.add.text(160,21,titles[this.tab]||'MENU',{fontFamily:FONT,fontSize:14,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    const singlets=(this.state.items.practiceSinglet||0)+(this.state.items.travelSinglet||0)+(this.state.items.starterSinglet||0);
    this.add.text(22,37,`GRIT ${this.state.grit}  REP ${this.state.rep}  SING ${singlets}`,{fontFamily:FONT,fontSize:10,color:'#333'});
    if(this.tab==='shop')this.drawShop();else if(this.tab==='locker')this.drawLocker();else if(this.tab==='travel')this.drawTravel();else if(this.tab==='dex')this.drawDex();else if(this.tab==='team')this.drawTeam();else if(this.tab==='practice')this.drawPractice();else if(this.tab==='objective')this.drawObjective();else if(this.tab==='bag')this.drawBag();else if(this.tab==='badges')this.drawBadges();else if(this.tab==='options')this.drawOptions();else if(this.tab==='map')this.drawSeasonMap();
    if(this.note)this.add.text(160,200,this.note,{fontFamily:FONT,fontSize:10,color:'#8a1720',fontStyle:'bold'}).setOrigin(.5);
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
      this.add.text(rx+rw/2,above?ry-9:ry+rh+3,LABELS[id],{fontFamily:FONT,fontSize:8,color:'#333',fontStyle:'bold'}).setOrigin(.5,0);
    }
    const mark=(aid,tx,ty,ch,color)=>{const p=pos[aid];if(!p)return;this.add.text(ox+(p.x+tx)*s,oy+(p.y+ty)*s,ch,{fontFamily:FONT,fontSize:8,color,fontStyle:'bold'}).setOrigin(.5);};
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
    this.add.text(24,178,'WEST: GROW THE TEAM',{fontFamily:FONT,fontSize:8,color:'#444',fontStyle:'bold'});
    this.add.text(296,178,'EAST: WIN THE TITLE',{fontFamily:FONT,fontSize:8,color:'#444',fontStyle:'bold'}).setOrigin(1,0);
  }
  drawMainScreen(){
    // left: icon list panel. right: lead-wrestler card. Native 320x224 layout.
    uiBox(this,6,6,192,212);
    this.add.text(16,12,'MENU',{fontFamily:FONT,fontSize:13,color:'#b41820',fontStyle:'bold'});
    this.add.line(0,0,16,30,182,30,0xa58d65,.7).setOrigin(0);
    MAIN_OPTS.forEach(([label],i)=>{
      const y=40+i*20,active=i===this.sel;
      if(i%2===0){const band=this.add.graphics();band.fillStyle(0x000000,.035);band.fillRect(12,y-8,180,20);}
      if(active){const hi=this.add.graphics();hi.fillStyle(0xb41820,.14);hi.fillRoundedRect(12,y-8,180,20,3);hi.lineStyle(1,0xb41820,.5);hi.strokeRoundedRect(12,y-8,180,20,3);}
      icon(this,32,y+2,MAIN_OPTS[i][1],active);
      this.add.text(52,y-4,label,{fontFamily:FONT,fontSize:11,color:active?'#b41820':'#111',fontStyle:active?'bold':'normal'});
      this.add.text(188,y-4,'>',{fontFamily:FONT,fontSize:11,color:active?'#b41820':'#999'}).setOrigin(1,0);
    });
    uiBox(this,206,6,108,212);
    const l=lead(this.state),r=l?ROSTER[l.id]:null;
    if(r&&this.textures.exists('portrait_'+r.asset)){this.add.image(260,40,'portrait_'+r.asset).setScale(.3);}
    this.add.text(260,69,l?wrestlerName(l,{short:true}):'No lead',{fontFamily:FONT,fontSize:13,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    if(l)this.add.text(260,84,`Lv ${l.lvl}  ${personaFor(l.id)}`,{fontFamily:FONT,fontSize:10,color:'#444'}).setOrigin(.5);
    this.add.line(0,0,214,96,306,96,0xa58d65,.6).setOrigin(0);
    this.add.text(214,100,'BADGES',{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
    BADGE_ORDER.forEach((b,i)=>{const cx=224+i*22,cy=121,got=this.state.badges.includes(b);const g=this.add.graphics();g.lineStyle(1,0x8a6a42,1);g.fillStyle(got?0xd6a336:0xe8dcc0,1);g.fillCircle(cx,cy,7);g.strokeCircle(cx,cy,7);if(got)this.add.text(cx,cy,'★',{fontFamily:FONT,fontSize:9,color:'#7d1017'}).setOrigin(.5);});
    this.add.line(0,0,214,136,306,136,0xa58d65,.6).setOrigin(0);
    const d=this.state.day||{name:'Saturday',period:'Morning'};
    this.add.text(214,142,'DAY',{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
    this.add.text(306,142,`${d.name.slice(0,3)} ${d.period}`,{fontFamily:FONT,fontSize:10,color:'#111'}).setOrigin(1,0);
    this.add.text(214,158,'GRIT',{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
    this.add.text(306,158,`${this.state.grit}`,{fontFamily:FONT,fontSize:10,color:'#111'}).setOrigin(1,0);
    this.add.text(214,174,'REP',{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
    this.add.text(306,174,`${this.state.rep}`,{fontFamily:FONT,fontSize:10,color:'#111'}).setOrigin(1,0);
    if(this.state.tournament?.champion)this.add.text(260,190,'BIG TEN CHAMPION',{fontFamily:FONT,fontSize:9,color:'#b41820',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(214,199,`TEAM ${caughtRecruitCount(this.state)}  WINS ${this.state.stats?.wins||0}`,{fontFamily:FONT,fontSize:10,color:'#444'});
    if(this.note)this.add.text(160,210,this.note,{fontFamily:FONT,fontSize:10,color:'#8a1720',fontStyle:'bold'}).setOrigin(.5);
  }
  drawBag(){
    this.add.text(24,52,'ITEMS',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    BAG_ROWS.forEach((it,i)=>{const n=this.state.items?.[it[0]]||0,y=68+i*20,active=i===this.sel;
      this.add.text(26,y,`${active?'▶':' '} ${it[1]}`,{fontFamily:FONT,fontSize:11,color:active?'#b41820':'#111',fontStyle:active?'bold':'normal'});
      this.add.text(296,y,`x${n}`,{fontFamily:FONT,fontSize:11,color:'#111'}).setOrigin(1,0);
    });
    const selected=BAG_ROWS[this.sel];
    if(selected&&!this.note)this.add.text(26,190,selected[2],{fontFamily:FONT,fontSize:10,color:'#333',wordWrap:{width:266}});
  }
  drawBadges(){
    this.add.text(24,52,'CONFERENCE BADGES',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    const names={'Field House Badge':'Defeat The Opener','Capitol Badge':'Defeat The Senator','Kohl Badge':'Defeat The Anchor','Picnic Point Badge':'Defeat The Funk Doctor'};
    BADGE_ORDER.forEach((b,i)=>{const y=78+i*30,got=this.state.badges.includes(b);
      const g=this.add.graphics();g.lineStyle(1,0x8a6a42,1);g.fillStyle(got?0xd6a336:0xe8dcc0,1);g.fillCircle(40,y,10);g.strokeCircle(40,y,10);
      if(got)this.add.text(40,y,'★',{fontFamily:FONT,fontSize:11,color:'#7d1017'}).setOrigin(.5);
      this.add.text(60,y-11,b,{fontFamily:FONT,fontSize:11,color:got?'#111':'#999',fontStyle:'bold'});
      this.add.text(60,y+3,got?names[b]:'Not yet earned.',{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold',wordWrap:{width:230}});
    });
  }
  drawOptions(){
    this.add.text(24,52,'OPTIONS',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    const muted=isMuted();
    this.add.text(26,76,`${this.sel===0?'▶ ':'  '}SOUND: ${muted?'OFF':'ON'}`,{fontFamily:FONT,fontSize:11,color:this.sel===0?'#b41820':'#111',fontStyle:'bold'});
    this.add.text(26,93,'Music and sound effects.',{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold',wordWrap:{width:270}});
    this.add.text(26,140,`${this.sel===1?'▶ ':'  '}ERASE SAVE DATA`,{fontFamily:FONT,fontSize:11,color:this.sel===1?'#b41820':'#111',fontStyle:'bold'});
    this.add.text(26,157,this.sel===1&&this.confirmReset?'Confirm erase? This cannot be undone.':'Erase this save and start over.',{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold',wordWrap:{width:270}});
  }
  drawObjective(){const log=this.state.objective?.log||['Meet the Head Coach'];this.add.text(24,52,'CURRENT GOAL',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});this.add.text(28,70,log[0]||'Opening complete.',{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold',wordWrap:{width:260}});this.add.text(24,101,'PROGRESSION',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});log.slice(0,5).forEach((x,i)=>this.add.text(30,119+i*17,`${i===0?'▶':'✓'} ${x}`,{fontFamily:FONT,fontSize:10,color:i===0?'#111':'#444',fontStyle:'bold'}));}
  drawTeam(){
    this.add.text(24,50,'SIX-WRESTLER TRAVEL LINEUP',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    if(!this.state.party.length){this.add.text(30,74,'No wrestlers yet.',{fontFamily:FONT,fontSize:11,color:'#111'});return;}
    this.state.party.slice(0,6).forEach((m,i)=>{
      const r=ROSTER[m.id],st=scaledStats(m.id,m.lvl,m),y=76+i*18,active=i===this.sel;
      if(active){const hi=this.add.graphics();hi.fillStyle(0xb41820,.1);hi.fillRoundedRect(18,y-8,284,18,3);}
      if(this.textures.exists('portrait_'+r.asset))this.add.image(32,y+1,'portrait_'+r.asset).setScale(.13);
      this.add.text(46,y-7,`${active?'▶':' '}${wrestlerName(m,{short:true})} L${m.lvl}${i===0?' ★':''}`,{fontFamily:FONT,fontSize:10,color:active?'#b41820':'#111',fontStyle:active?'bold':'normal'});
      this.add.text(137,y-7,'C',{fontFamily:FONT,fontSize:9,color:'#3a8a52',fontStyle:'bold'});
      hpBar(this,148,y-3,65,4,m.hp/st.hp,0x55b867);
      this.add.text(137,y+3,'XP',{fontFamily:FONT,fontSize:9,color:'#355f87',fontStyle:'bold'});
      hpBar(this,148,y+7,65,4,experienceProgress(m),0x3aa5d1);
      this.add.text(224,y-7,`STA ${totalMoveStamina(m)}/${totalMoveStaminaMax(m)}`,{fontFamily:FONT,fontSize:9,color:'#355f87',fontStyle:'bold'});
      this.add.text(224,y+3,`C ${Math.round(m.hp)}/${st.hp}`,{fontFamily:FONT,fontSize:9,color:'#444'});
    });
    const m=this.state.party[this.sel],r=m&&ROSTER[m.id];
    if(r)this.add.text(24,188,`${personaFor(m.id)} / ${r.style} / ${r.rarity}   A: SUMMARY`,{fontFamily:FONT,fontSize:10,color:'#444',wordWrap:{width:275}});
  }
  drawSeasonMap(){
    const maps=seasonLayouts.maps;
    const madisonIds=seasonLayouts.region.reviewOrder.filter(id=>maps[id]?.plane==='madison');
    const bounds=seasonLayouts.region.madisonBounds;
    const chart={x:22,y:52,width:224,height:112};
    const sx=chart.width/bounds.width,sy=chart.height/bounds.height;
    const center=id=>{const map=maps[id],origin=map.origin,size=map.size;return{x:chart.x+(origin.x+size.width/2-bounds.x)*sx,y:chart.y+(origin.y+size.height/2-bounds.y)*sy};};
    const currentArea=maps[this.state.area]?.plane?this.state.area:this.state.mapReturnStack?.at(-1)?.mapId;
    const g=this.add.graphics();
    g.fillStyle(0xd8ead1,1);g.fillRoundedRect(chart.x-5,chart.y-5,chart.width+10,chart.height+10,4);
    g.fillStyle(0x6ea7c9,1);g.fillRoundedRect(chart.x-2,chart.y+chart.height-21,chart.width+4,23,2);
    g.lineStyle(2,0xbca66f,1);g.strokeRoundedRect(chart.x-5,chart.y-5,chart.width+10,chart.height+10,4);
    const edges=new Set();
    for(const id of madisonIds){for(const connection of maps[id].connections||[]){if(!madisonIds.includes(connection.to))continue;const key=[id,connection.to].sort().join(':');if(edges.has(key))continue;edges.add(key);const a=center(id),b=center(connection.to);g.lineStyle(4,0xf7e8b2,1);g.lineBetween(a.x,a.y,b.x,b.y);g.lineStyle(1,0x8c774b,1);g.lineBetween(a.x,a.y,b.x,b.y);}}
    const colors={home_town:0xb51d30,town:0xd6a336,badge_venue:0xd6a336,optional_venue:0x7d5aa6,route:0x4e8a56};
    for(const id of madisonIds){const map=maps[id],p=center(id),major=map.kind!=='route';g.fillStyle(colors[map.kind]||0x59626c,1);if(major){g.fillRect(p.x-4,p.y-4,8,8);g.lineStyle(1,0x222222,1);g.strokeRect(p.x-4,p.y-4,8,8);}else{g.fillCircle(p.x,p.y,3);g.lineStyle(1,0x222222,1);g.strokeCircle(p.x,p.y,3);}}
    const labels={camp_randall:['CAMP',7,-7],field_house:['FIELD',0,7],picnic_point:['PICNIC',0,-8],state_street:['STATE',0,-9],bascom_hill:['BASCOM',0,-9],capitol_square:['CAPITOL',5,-9],kohl_center:['KOHL',0,7]};
    for(const [id,[label,dx,dy]] of Object.entries(labels)){const p=center(id);this.add.text(p.x+dx,p.y+dy,label,{fontFamily:FONT,fontSize:7,color:'#242424',fontStyle:'bold'}).setOrigin(.5,dy>0?0:1);}
    const remote=[['airport','AIR',267,73],['st_louis','STL',286,129]];
    for(const [id,label,x,y] of remote){g.lineStyle(2,0xbca66f,1);g.fillStyle(id===currentArea?0xb51d30:0xd6a336,1);g.fillRoundedRect(x-14,y-10,28,20,3);g.strokeRoundedRect(x-14,y-10,28,20,3);this.add.text(x,y,label,{fontFamily:FONT,fontSize:8,color:'#222',fontStyle:'bold'}).setOrigin(.5);}
    if(currentArea&&maps[currentArea]){let p=maps[currentArea].plane==='madison'?center(currentArea):remote.find(row=>row[0]===currentArea);if(Array.isArray(p))p={x:p[2],y:p[3]};if(p){const ring=this.add.circle(p.x,p.y,6).setStrokeStyle(2,0xffffff,1);const core=this.add.circle(p.x,p.y,2.5,0xb51d30,1);this.tweens.add({targets:[ring,core],alpha:.25,duration:420,yoyo:true,repeat:-1});}}
    this.add.text(24,177,'MADISON SEASON ROUTE',{fontFamily:FONT,fontSize:8,color:'#444',fontStyle:'bold'});
    this.add.text(296,177,this.state.keyItems?.busPass?'A: BUS TRAVEL':'A: BACK',{fontFamily:FONT,fontSize:8,color:this.state.keyItems?.busPass?'#b41820':'#444',fontStyle:'bold'}).setOrigin(1,0);
  }
  drawSummary(){
    uiBox(this,8,8,304,208);
    const mon=this.state.party[this.summaryIndex];if(!mon){this.tab='team';this.sel=0;return this.draw();}
    const record=ROSTER[mon.id],stats=scaledStats(mon.id,mon.lvl,mon),nature=natureFor(mon.nature);
    this.add.text(160,16,`WRESTLER SUMMARY  ${this.summaryPage+1}/2`,{fontFamily:FONT,fontSize:13,color:'#111',fontStyle:'bold'}).setOrigin(.5,0);
    this.add.line(0,0,18,35,302,35,0xa58d65,.7).setOrigin(0);
    if(this.summaryPage===0){
      if(this.textures.exists('portrait_'+record.asset))this.add.image(47,68,'portrait_'+record.asset).setScale(.24);
      this.add.text(79,42,wrestlerName(mon),{fontFamily:FONT,fontSize:13,color:'#8a1720',fontStyle:'bold',wordWrap:{width:135}});
      if(mon.nickname)this.add.text(79,56,record.name,{fontFamily:FONT,fontSize:9,color:'#555',fontStyle:'bold',wordWrap:{width:135}});
      this.add.text(79,mon.nickname?69:61,`Lv ${mon.lvl}  ${record.style}`,{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
      this.add.text(79,mon.nickname?82:76,`${personaFor(mon.id)} persona`,{fontFamily:FONT,fontSize:10,color:'#555'});
      this.add.text(79,93,'EXP',{fontFamily:FONT,fontSize:9,color:'#355f87',fontStyle:'bold'});hpBar(this,105,98,91,5,experienceProgress(mon),0x3aa5d1);
      this.add.text(218,45,`POT ${mon.potential||'C'}`,{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
      this.add.text(218,63,`EFF ${effortTotal(mon.effort)}/${MAX_TOTAL_EFFORT}`,{fontFamily:FONT,fontSize:9,color:'#333',fontStyle:'bold'});
      this.add.text(22,105,`TEMPERAMENT  ${nature.name.toUpperCase()}`,{fontFamily:FONT,fontSize:10,color:'#111',fontStyle:'bold'});
      const natureLine=nature.raised?`+${STAT_LABELS[nature.raised]}  -${STAT_LABELS[nature.lowered]}`:'No stat preference';
      this.add.text(22,119,natureLine,{fontFamily:FONT,fontSize:9,color:'#555'});
      this.add.line(0,0,18,134,302,134,0xc9bda4,.55).setOrigin(0);
      const rows=[[['hp','COND'],['technique','TEC']],[['attack','STR'],['awareness','AWR']],[['defense','DEF'],['speed','SPD']]];
      rows.forEach((pair,row)=>pair.forEach(([key,label],column)=>{const x=column?170:22,valueX=column?291:141,y=141+row*19,changed=nature.raised===key||nature.lowered===key;this.add.text(x,y,label,{fontFamily:FONT,fontSize:10,color:changed?(nature.raised===key?'#b41820':'#355f87'):'#444',fontStyle:'bold'});this.add.text(valueX,y,key==='hp'?`${Math.round(mon.hp)}/${stats.hp}`:`${stats[key]}`,{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'}).setOrigin(1,0);}));
    }else{
      this.add.text(20,41,`${wrestlerName(mon)}  Lv ${mon.lvl}`,{fontFamily:FONT,fontSize:11,color:'#8a1720',fontStyle:'bold'});
      (mon.moves||[]).forEach((key,i)=>{const move=MOVES[key],y=57+i*34,current=currentMoveStamina(mon,key),category=move.category==='strength'?'STR':move.category==='technique'?'TEC':'SET';if(i>0)this.add.line(0,0,18,y-4,302,y-4,0xc9bda4,.55).setOrigin(0);this.add.text(22,y,move.name.toUpperCase(),{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold'});this.add.text(296,y,`STA ${current}/${moveStaminaMax(key)}`,{fontFamily:FONT,fontSize:10,color:current?'#355f87':'#999',fontStyle:'bold'}).setOrigin(1,0);this.add.text(22,y+13,`${move.style.toUpperCase()}  ${category}  PWR ${move.power||'--'}  ACC ${Math.round(move.acc*100)}%`,{fontFamily:FONT,fontSize:9,color:'#444',fontStyle:'bold'});this.add.text(22,y+24,move.summary,{fontFamily:FONT,fontSize:8,color:'#555'});});
    }
    this.add.text(160,201,this.note||'LEFT/RIGHT: PAGE  A: LEAD  START: NAME',{fontFamily:FONT,fontSize:9,color:this.note?'#8a1720':'#555',fontStyle:'bold'}).setOrigin(.5,0);
  }
  renameSelected(){
    let container=null,index=-1,returnTab='team';
    if(this.tab==='summary'){container='party';index=this.summaryIndex;}
    else if(this.tab==='locker'){
      const partyCount=this.state.party.length;
      container=this.sel<partyCount?'party':'box';index=this.sel<partyCount?this.sel:this.sel-partyCount;returnTab='locker';
    }
    const mon=this.state[container]?.[index];if(!mon)return;
    this.scene.start('NamingScene',{target:{container,index,targetId:mon.id},rename:true,next:{scene:'MenuScene',data:{parent:this.parent,tab:returnTab}}});
    this.scene.bringToTop('NamingScene');
  }
  travelDestinations(){return (this.state.travel?.unlockedTowns||[]).map(id=>this.state.travel?.destinations?.[id]).filter(Boolean);}
  drawTravel(){const destinations=this.travelDestinations();if(!this.state.keyItems?.busPass){this.add.text(24,64,'BUS PASS REQUIRED',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});this.add.text(24,84,"The Senator's staff issues the Bus Pass after the Capitol Badge.",{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold',wordWrap:{width:270}});return;}this.add.text(24,52,'UNLOCKED TOWNS',{fontFamily:FONT,fontSize:10,color:'#b41820',fontStyle:'bold'});destinations.forEach((destination,i)=>this.add.text(28,72+i*22,`${i===this.sel?'>':' '} ${destination.name}`,{fontFamily:FONT,fontSize:10,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'}));}
  drawLocker(){const rows=[...this.state.party.map((m,i)=>({m,i,where:'LINEUP'})),...this.state.box.map((m,i)=>({m,i,where:'LOCKER'}))];this.add.text(24,50,`TRAVEL ${this.state.party.length}/6   LOCKER ${this.state.box.length}`,{fontFamily:FONT,fontSize:10,color:'#b41820',fontStyle:'bold'});if(!rows.length){this.add.text(24,78,'No wrestlers stored.',{fontFamily:FONT,fontSize:10,color:'#111'});return;}const start=Math.max(0,Math.min(this.sel-3,Math.max(0,rows.length-7)));rows.slice(start,start+7).forEach((row,j)=>{const i=start+j,r=ROSTER[row.m.id],y=68+j*17,active=i===this.sel;if(active){const g=this.add.graphics();g.fillStyle(0xb41820,.1);g.fillRoundedRect(18,y-5,284,16,2);}this.add.text(24,y,`${active?'>':' '} ${row.where==='LINEUP'?'L':'K'} ${wrestlerName(row.m)} Lv${row.m.lvl}`,{fontFamily:FONT,fontSize:9,color:active?'#b41820':'#111',fontStyle:'bold'});this.add.text(294,y,`${r.style}`,{fontFamily:FONT,fontSize:9,color:'#444',fontStyle:'bold'}).setOrigin(1,0);});this.add.text(24,189,this.lockerSwapBoxIndex!==null?'Choose a lineup slot to exchange.':'A: MOVE   START: NAME',{fontFamily:FONT,fontSize:9,color:'#444',fontStyle:'bold',wordWrap:{width:275}});}
  drawPractice(){
    const opts=[['CONDITION','Condition effort'],['STRENGTH','Strength effort'],['DEFENSE','Defense effort'],['TECHNIQUE','Technique effort'],['AWARENESS','Awareness effort'],['SPEED','Speed effort']];
    this.add.text(24,52,'PRACTICE PLAN',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    const l=lead(this.state);
    opts.forEach((o,i)=>this.add.text(28,68+i*19,`${i===this.sel?'>':' '} ${o[0]}`,{fontFamily:FONT,fontSize:10,color:i===this.sel?'#b41820':'#111',fontStyle:i===this.sel?'bold':'normal'}));
    this.add.line(0,0,198,66,198,181,0xa58d65,.6).setOrigin(0);
    if(l){
      const effort=l.effort||{};
      this.add.text(208,70,`${wrestlerName(l,{short:true})} L${l.lvl}`,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold'});
      this.add.text(208,89,`COND ${effort.hp||0}\nSTR  ${effort.attack||0}\nDEF  ${effort.defense||0}\nTECH ${effort.technique||0}\nAWR  ${effort.awareness||0}\nSPD  ${effort.speed||0}`,{fontFamily:FONT,fontSize:9,color:'#333',lineSpacing:2});
      this.add.text(208,171,`TOTAL ${effortTotal(effort)}/${MAX_TOTAL_EFFORT}`,{fontFamily:FONT,fontSize:9,color:'#555',fontStyle:'bold'});
    }else this.add.text(208,82,'No lead.',{fontFamily:FONT,fontSize:10,color:'#111'});
    this.add.text(28,191,`3 GRIT - ${opts[this.sel][1]} +16 - TIME +1`,{fontFamily:FONT,fontSize:9,color:'#444'});
  }
  doPractice(){const opts=['hp','attack','defense','technique','awareness','speed'];const l=lead(this.state);if(!l){this.note='NO WRESTLER.';return this.draw();}if(this.state.grit<3){this.note='NEED 3 GRIT.';return this.draw();}const k=opts[this.sel],result=practiceWrestler(l,k);if(!result.ok){this.note=result.reason==='totalCap'?'TOTAL EFFORT CAP REACHED.':'STAT EFFORT CAP REACHED.';return this.draw();}this.state.grit-=3;this.state.stats.practices=(this.state.stats.practices||0)+1;this.state.flags.practiceCount=(this.state.flags.practiceCount||0)+1;const period=advancePeriod(this.state);saveState(this.state);this.note=`${STAT_LABELS[k].toUpperCase()} EFFORT +${result.gain}. NOW ${period.toUpperCase()}.`;this.draw();}
  drawShop(){[...SHOP_STOCK,{key:'close',name:'CLOSE',price:0}].forEach((it,i)=>this.add.text(26,58+i*23,`${i===this.sel?'>':' '} ${it.name} ${it.price?it.price+' RP':''}`,{fontFamily:FONT,fontSize:10,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'}));const it=SHOP_STOCK[this.sel];if(it)this.add.text(190,58,it.description,{fontFamily:FONT,fontSize:9,color:'#444',fontStyle:'bold',wordWrap:{width:105}});}
  drawDex(){
    const ids=Object.keys(ROSTER),start=Math.max(0,Math.min(this.sel-3,ids.length-7));
    this.add.text(22,50,`SEEN ${Object.values(this.state.dex.seen).filter(Boolean).length}/${ids.length}  BEAT ${defeatedWrestlerCount(this.state)}/${ids.length}  SIGN ${caughtRecruitCount(this.state)}`,{fontFamily:FONT,fontSize:10,color:'#b41820',fontStyle:'bold'});
    ids.slice(start,start+7).forEach((id,j)=>{const i=start+j,r=ROSTER[id],known=this.state.dex.seen[id],caught=this.state.dex.caught[id],defeated=this.state.dex.defeated[id],y=68+j*18,active=i===this.sel;this.add.text(24,y,`${active?'>':' '} ${caught?'+':defeated?'x':known?'.':'?'} ${known?r.name:'UNKNOWN'}`,{fontFamily:FONT,fontSize:10,color:active?'#b41820':known?'#111':'#777',fontStyle:active?'bold':'normal'});});
    const id=ids[this.sel],r=ROSTER[id],known=this.state.dex.seen[id];
    if(!known){this.add.text(206,82,'NO SCOUT REPORT',{fontFamily:FONT,fontSize:10,color:'#777',fontStyle:'bold'});this.add.text(206,101,'Meet this wrestler to add an entry.',{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold',wordWrap:{width:96}});return;}
    if(this.textures.exists('portrait_'+r.asset))this.add.image(252,78,'portrait_'+r.asset).setScale(.22);
    this.add.text(204,104,r.name,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',wordWrap:{width:98}});
    this.add.text(204,130,`${r.style}\n${personaFor(id)} / ${r.rarity}`,{fontFamily:FONT,fontSize:10,color:'#444',lineSpacing:4});
    this.add.text(204,166,r.bio,{fontFamily:FONT,fontSize:9,color:'#333',wordWrap:{width:98}});
  }
  move(d){this.note='';this.confirmReset=false;this.sel=Phaser.Math.Wrap(this.sel+d,0,this.optionCount());this.draw();}
  side(d){if(this.tab!=='summary')return;this.note='';this.summaryPage=Phaser.Math.Wrap(this.summaryPage+d,0,2);sfx.menu_move();this.draw();}
  choose(){
    if(this.tab==='main'){const key=MAIN_OPTS[this.sel][1];if(key==='save'){saveState(this.state);this.note='SAVED.';return this.draw();}this.tab=key;this.sel=0;return this.draw();}
    if(this.tab==='objective')return this.back();
    if(this.tab==='map'){if(this.state.keyItems?.busPass){this.tab='travel';this.sel=0;return this.draw();}return this.back();}
    if(this.tab==='practice')return this.doPractice();
    if(this.tab==='shop')return this.chooseShop();
    if(this.tab==='locker')return this.chooseLocker();
    if(this.tab==='travel')return this.chooseTravel();
    if(this.tab==='team')return this.chooseTeam();
    if(this.tab==='summary')return this.chooseSummary();
    if(this.tab==='dex')return;
    if(this.tab==='badges')return;
    if(this.tab==='bag')return this.chooseBag();
    if(this.tab==='options')return this.chooseOptions();
  }
  chooseTeam(){if(!this.state.party.length)return this.back();this.summaryIndex=this.sel;this.summaryPage=0;this.tab='summary';this.note='';this.draw();}
  chooseSummary(){const picked=this.state.party[this.summaryIndex];if(!picked)return this.back();if(this.summaryIndex>0){this.state.party.splice(this.summaryIndex,1);this.state.party.unshift(picked);this.summaryIndex=0;}this.state.active=0;saveState(this.state);this.note='LEAD WRESTLER SET.';this.draw();}
  chooseLocker(){const partyCount=this.state.party.length;if(this.lockerSwapBoxIndex!==null){if(this.sel>=partyCount){this.note='CHOOSE A LINEUP SLOT.';return this.draw();}const result=swapLockerWrestler(this.state,this.sel,this.lockerSwapBoxIndex);this.lockerSwapBoxIndex=null;if(result.ok){saveState(this.state);this.note='LINEUP AND LOCKER EXCHANGED.';}this.sel=0;return this.draw();}if(this.sel<partyCount){const result=depositWrestler(this.state,this.sel);if(!result.ok){this.note='YOUR LINEUP NEEDS ONE WRESTLER.';return this.draw();}saveState(this.state);this.sel=Math.min(this.sel,this.optionCount()-1);this.note='MOVED TO TEAM LOCKER.';return this.draw();}const boxIndex=this.sel-partyCount,result=withdrawWrestler(this.state,boxIndex);if(result.ok){saveState(this.state);this.sel=0;this.note='ADDED TO TRAVEL LINEUP.';return this.draw();}if(result.reason==='full'){this.lockerSwapBoxIndex=boxIndex;this.sel=0;this.note='LINEUP FULL. CHOOSE A SLOT TO EXCHANGE.';return this.draw();}}
  chooseTravel(){if(!this.state.keyItems?.busPass){this.note='BUS PASS REQUIRED.';return this.draw();}const destination=this.travelDestinations()[this.sel];if(!destination||!travelTo(this.state,destination.id)){this.note='DESTINATION UNAVAILABLE.';return this.draw();}saveState(this.state);this.scene.stop();if(this.parent?.scene?.restart)this.parent.scene.restart();}
  chooseShop(){const it=SHOP_STOCK[this.sel];if(!it)return this.close();if(this.state.rep>=it.price){this.state.rep-=it.price;this.state.items[it.key]=(this.state.items[it.key]||0)+1;saveState(this.state);this.note=`BOUGHT ${it.name}.`;}else this.note=`NEED ${it.price} REP.`;this.draw();}
  chooseBag(){const key=BAG_ROWS[this.sel]?.[0],l=lead(this.state);if(!key)return;if((this.state.items[key]||0)<=0){this.note='NONE LEFT.';return this.draw();}if(key==='filmStudy'){if(useFilmStudy(this.state)){saveState(this.state);this.note='NEXT THREE RECRUIT ATTEMPTS IMPROVED.';}return this.draw();}if(ITEM_DEFS[key].kind==='singlet'){this.note='USE SINGLETS WHILE SCOUTING.';return this.draw();}if(!l){this.note='NO WRESTLER.';return this.draw();}const stats=scaledStats(l.id,l.lvl,l);if(key==='sportsDrink'){const restored=restoreTechniqueStamina(l,10);if(!restored){this.note='ALL TECHNIQUES HAVE FULL STAMINA.';return this.draw();}}else if(key==='athleticTape'){if(l.hp>=stats.hp){this.note='CONDITION IS FULL.';return this.draw();}l.hp=Math.min(stats.hp,l.hp+20);}this.state.items[key]--;saveState(this.state);this.note=`USED ${ITEM_DEFS[key].name}.`;this.draw();}
  chooseOptions(){
    if(this.sel===0){const next=!isMuted();setMuted(next);this.state.audioMuted=next;saveState(this.state);this.note=next?'SOUND OFF.':'SOUND ON.';return this.draw();}
    return this.resetDemo();
  }
  resetDemo(){if(!this.confirmReset){this.confirmReset=true;this.note='A AGAIN TO ERASE.';return this.draw();}resetState();this.scene.stop('OverworldScene');this.scene.start('TitleScene');}
  back(){if(this.tab==='locker'&&this.lockerSwapBoxIndex!==null){this.lockerSwapBoxIndex=null;this.sel=0;this.note='EXCHANGE CANCELED.';this.draw();return;}if(this.tab==='summary'){this.tab='team';this.sel=this.summaryIndex;this.note='';this.draw();return;}if(this.tab!=='main'){this.tab='main';this.sel=0;this.confirmReset=false;this.draw();return;}this.close();}
  close(){this.scene.stop();if(this.parent?.drawHud)this.parent.drawHud();if(this.parent?.handleVirtualButton)setVirtualHandler(this.parent);}
}
