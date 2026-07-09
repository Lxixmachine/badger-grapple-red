import {loadState,saveState,lead,resetState,caughtRecruitCount,advancePeriod} from '../systems/save.js';import {ROSTER,scaledStats,addXp} from '../data/roster.js';import {uiBox,hpBar,setVirtualHandler} from '../systems/ui.js';import {setMuted,isMuted,sfx} from '../systems/audio.js';
const Phaser = window.Phaser;
const BADGE_ORDER=['W Badge','Neutral Badge','Scramble Badge','Top Badge'];
const MAIN_OPTS=[['WRESTLERS','team'],['BAG','bag'],['ROSTERDEX','dex'],['BADGES','badges'],['PRACTICE','practice'],['OBJECTIVES','objective'],['SAVE','save'],['OPTIONS','options']];
const BAG_ROWS=[['energy','SPORTS DRINK','+24 EP'],['tape','ATHLETIC TAPE','+20 HP'],['film','FILM STUDY','Recruit odds'],['invite','RECRUIT FLYER','Sign a recruit']];
const ICON_COLOR={team:0x3a6ea8,bag:0x3a8a52,dex:0x7a4ac9,badges:0xc9962e,practice:0xc9622e,objective:0x2e9a95,save:0x555f6e,options:0x7d1017};
function icon(scene,x,y,kind,active){
  const bg=ICON_COLOR[kind]||0x555;const g=scene.add.graphics();
  g.fillStyle(0x000000,.25);g.fillRoundedRect(x-6,y-5,17,17,4);
  g.fillStyle(bg,active?1:.62);g.fillRoundedRect(x-7,y-6,17,17,4);
  g.lineStyle(1,0xffffff,.3);g.strokeRoundedRect(x-7,y-6,17,17,4);
  const cx=x+1.5,cy=y+2.5;g.fillStyle(0xffffff,1);g.lineStyle(1.6,0xffffff,1);
  if(kind==='team'){g.fillCircle(cx,cy-3,2.6);g.fillTriangle(cx-4,cy+5,cx+4,cy+5,cx,cy-1);}
  else if(kind==='bag'){g.fillRoundedRect(cx-4.5,cy-2,9,7,1.6);g.strokeRoundedRect(cx-2,cy-5.5,4,3.5,1);}
  else if(kind==='dex'){g.fillRoundedRect(cx-4.5,cy-5,9,10,1);g.lineStyle(1.2,bg,1);g.lineBetween(cx,cy-5,cx,cy+5);}
  else if(kind==='badges'){g.fillCircle(cx,cy-1,3.6);g.fillTriangle(cx-2.4,cy+2,cx+2.4,cy+2,cx,cy+6);}
  else if(kind==='practice'){g.fillRect(cx-4.5,cy-1.5,3,3);g.fillRect(cx+1.5,cy-1.5,3,3);g.fillRect(cx-2,cy-.6,4,1.2);}
  else if(kind==='objective'){g.lineStyle(1.8,0xffffff,1);g.lineBetween(cx-3.5,cy-5,cx-3.5,cy+5);g.fillTriangle(cx-3.5,cy-5,cx+4,cy-2.5,cx-3.5,cy);}
  else if(kind==='save'){g.fillRoundedRect(cx-4.5,cy-5,9,10,1);g.fillStyle(bg,1);g.fillRect(cx-2.5,cy-5,5,3.6);}
  else if(kind==='options'){g.fillCircle(cx,cy,3.4);for(let a=0;a<6;a++){const ang=a*Math.PI/3;g.fillRect(cx+Math.cos(ang)*5-.9,cy+Math.sin(ang)*5-.9,1.8,1.8);}}
  return g;
}
export class MenuScene extends Phaser.Scene{
  constructor(){super('MenuScene');}
  create(data={}){this.parent=data.parent;this.state=loadState();this.tab=data.tab||'main';this.sel=0;this.note='';this.confirmReset=false;this.cameras.main.setBackgroundColor('rgba(0,0,0,.74)');this.cameras.main.fadeIn(115,0,0,0);this.input.keyboard.on('keydown-UP',()=>this.move(-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(1));this.input.keyboard.on('keydown-ENTER',()=>this.choose());this.input.keyboard.on('keydown-SPACE',()=>this.choose());this.input.keyboard.on('keydown-ESC',()=>this.back());setVirtualHandler(this);this.draw();}
  handleVirtualButton(k){if(k==='up'){sfx.menu_move();this.move(-1);}if(k==='down'){sfx.menu_move();this.move(1);}if(k==='a')this.choose();if(k==='b')this.back();}
  optionCount(){if(this.tab==='main')return MAIN_OPTS.length;if(this.tab==='objective')return 1;if(this.tab==='practice')return 5;if(this.tab==='shop')return 5;if(this.tab==='dex')return 1;if(this.tab==='badges')return 1;if(this.tab==='options')return 2;if(this.tab==='bag')return BAG_ROWS.length;if(this.tab==='team')return Math.max(1,this.state.party.length);return 8;}
  draw(){
    this.children.removeAll();
    if(this.tab==='main')return this.drawMainScreen();
    uiBox(this,8,8,224,144);
    const titles={shop:'SHOP',dex:'ROSTERDEX',team:'WRESTLERS',practice:'PRACTICE',objective:'OBJECTIVES',bag:'BAG',badges:'BADGES',options:'OPTIONS'};
    this.add.text(120,16,titles[this.tab]||'MENU',{fontFamily:'monospace',fontSize:10,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(16,28,`GR ${this.state.grit}  REP ${this.state.rep}  INV ${this.state.items.invite}  ${this.state.day?.period||'Morning'}`,{fontFamily:'monospace',fontSize:6,color:'#333'});
    if(this.tab==='shop')this.drawShop();else if(this.tab==='dex')this.drawDex();else if(this.tab==='team')this.drawTeam();else if(this.tab==='practice')this.drawPractice();else if(this.tab==='objective')this.drawObjective();else if(this.tab==='bag')this.drawBag();else if(this.tab==='badges')this.drawBadges();else if(this.tab==='options')this.drawOptions();
    this.add.text(120,141,this.note||'A SELECT  B BACK',{fontFamily:'monospace',fontSize:6,color:'#555'}).setOrigin(.5);
  }
  drawMainScreen(){
    // left: icon list panel. right: wrestler card. Mirrors the concept-art layout with real game data.
    uiBox(this,4,4,148,162);
    this.add.text(12,10,'MENU',{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});
    this.add.line(0,0,12,22,140,22,0xa58d65,.7).setOrigin(0);
    MAIN_OPTS.forEach(([label],i)=>{
      const y=32+i*17,active=i===this.sel;
      if(i%2===0){const band=this.add.graphics();band.fillStyle(0x000000,.035);band.fillRect(9,y-6,136,17);}
      if(active){const hi=this.add.graphics();hi.fillStyle(0xb41820,.14);hi.fillRoundedRect(9,y-6,136,17,3);hi.lineStyle(1,0xb41820,.5);hi.strokeRoundedRect(9,y-6,136,17,3);}
      icon(this,25,y+2,MAIN_OPTS[i][1],active);
      this.add.text(40,y-2,label,{fontFamily:'monospace',fontSize:7,color:active?'#b41820':'#111',fontStyle:'bold'});
      this.add.text(146,y-2,'>',{fontFamily:'monospace',fontSize:7,color:active?'#b41820':'#999'}).setOrigin(1,0);
    });
    // right card
    uiBox(this,158,4,74,162);
    const l=lead(this.state),r=l?ROSTER[l.id]:null;
    if(r&&this.textures.exists('portrait_'+r.asset)){this.add.image(195,32,'portrait_'+r.asset).setScale(.19);}
    this.add.text(195,52,l?r.name.split(' ')[0]:'No lead',{fontFamily:'monospace',fontSize:7,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    if(l)this.add.text(195,61,`Lv ${l.lvl}  ${r.style}`,{fontFamily:'monospace',fontSize:5,color:'#555'}).setOrigin(.5);
    this.add.line(0,0,164,72,226,72,0xa58d65,.6).setOrigin(0);
    this.add.text(164,77,'BADGES',{fontFamily:'monospace',fontSize:6,color:'#333',fontStyle:'bold'});
    BADGE_ORDER.forEach((b,i)=>{const cx=169+i*15,cy=90,got=this.state.badges.includes(b);const g=this.add.graphics();g.lineStyle(1,0x8a6a42,1);g.fillStyle(got?0xd6a336:0xe8dcc0,1);g.fillCircle(cx,cy,5);g.strokeCircle(cx,cy,5);if(got)this.add.text(cx,cy,'★',{fontFamily:'monospace',fontSize:6,color:'#7d1017'}).setOrigin(.5);});
    this.add.line(0,0,164,104,226,104,0xa58d65,.6).setOrigin(0);
    const d=this.state.day||{name:'Saturday',period:'Morning'};
    this.add.text(164,109,'DAY',{fontFamily:'monospace',fontSize:6,color:'#333',fontStyle:'bold'});
    this.add.text(226,109,`${d.name} ${d.period}`,{fontFamily:'monospace',fontSize:6,color:'#111'}).setOrigin(1,0);
    this.add.text(164,121,'GRIT',{fontFamily:'monospace',fontSize:6,color:'#333',fontStyle:'bold'});
    this.add.text(226,121,`${this.state.grit}`,{fontFamily:'monospace',fontSize:7,color:'#111',fontStyle:'bold'}).setOrigin(1,0);
    this.add.text(164,133,'REP',{fontFamily:'monospace',fontSize:6,color:'#333',fontStyle:'bold'});
    this.add.text(226,133,`${this.state.rep}`,{fontFamily:'monospace',fontSize:7,color:'#111',fontStyle:'bold'}).setOrigin(1,0);
    this.add.text(164,148,`Roster ${caughtRecruitCount(this.state)}  Wins ${this.state.stats?.wins||0}`,{fontFamily:'monospace',fontSize:5,color:'#555'});
    this.add.text(120,155,this.note||'A OPEN   B CLOSE',{fontFamily:'monospace',fontSize:6,color:'#666'}).setOrigin(.5);
  }
  drawBag(){
    this.add.text(18,39,'ITEMS',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});
    BAG_ROWS.forEach((it,i)=>{const n=this.state.items?.[it[0]]||0,y=52+i*17,active=i===this.sel;
      this.add.text(20,y,`${active?'▶':' '} ${it[1]}`,{fontFamily:'monospace',fontSize:7,color:active?'#b41820':'#111',fontStyle:'bold'});
      this.add.text(224,y,`x${n}`,{fontFamily:'monospace',fontSize:7,color:'#111'}).setOrigin(1,0);
      this.add.text(24,y+9,it[2],{fontFamily:'monospace',fontSize:5,color:'#555'});
    });
    this.add.text(18,132,'Flyers and consumables are used mid-match. Buy more at the Shop.',{fontFamily:'monospace',fontSize:5,color:'#555',wordWrap:{width:196}});
  }
  drawBadges(){
    this.add.text(18,39,'CONFERENCE BADGES',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});
    const names={'W Badge':'Wrestling Badge — Field House opening loop','Neutral Badge':'Neutral Badge — Conference Arena','Scramble Badge':'Scramble Badge — River Trail','Top Badge':'Top Badge — Championship Hall'};
    BADGE_ORDER.forEach((b,i)=>{const y=58+i*22,got=this.state.badges.includes(b);
      const g=this.add.graphics();g.lineStyle(1,0x8a6a42,1);g.fillStyle(got?0xd6a336:0xe8dcc0,1);g.fillCircle(30,y,8);g.strokeCircle(30,y,8);
      if(got)this.add.text(30,y,'★',{fontFamily:'monospace',fontSize:9,color:'#7d1017'}).setOrigin(.5);
      this.add.text(46,y-8,b,{fontFamily:'monospace',fontSize:7,color:got?'#111':'#999',fontStyle:'bold'});
      this.add.text(46,y+1,got?names[b]:'Not yet earned.',{fontFamily:'monospace',fontSize:5,color:'#555',wordWrap:{width:170}});
    });
  }
  drawOptions(){
    this.add.text(18,39,'OPTIONS',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});
    const muted=isMuted();
    this.add.text(20,56,`${this.sel===0?'▶ ':'  '}SOUND: ${muted?'OFF':'ON'}`,{fontFamily:'monospace',fontSize:7,color:this.sel===0?'#b41820':'#111',fontStyle:'bold'});
    this.add.text(20,68,'A to toggle. Music and sound effects.',{fontFamily:'monospace',fontSize:5,color:'#555',wordWrap:{width:200}});
    this.add.text(20,108,`${this.sel===1?(this.confirmReset?'▶ ':'▶ '):'  '}ERASE SAVE DATA`,{fontFamily:'monospace',fontSize:7,color:this.sel===1?'#b41820':'#111',fontStyle:'bold'});
    this.add.text(20,120,this.sel===1&&this.confirmReset?'Press A again to confirm. This cannot be undone.':'Press A to erase this save and start over.',{fontFamily:'monospace',fontSize:5,color:'#555',wordWrap:{width:200}});
  }
  drawObjective(){const log=this.state.objective?.log||['Meet the Head Coach'];this.add.text(18,39,'CURRENT GOAL',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});this.add.text(22,53,log[0]||'Opening complete.',{fontFamily:'monospace',fontSize:8,color:'#111',fontStyle:'bold',wordWrap:{width:184}});this.add.text(18,75,'PROGRESSION',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});log.slice(0,6).forEach((x,i)=>this.add.text(23,88+i*9,`${i===0?'▶':'✓'} ${x}`,{fontFamily:'monospace',fontSize:6,color:i===0?'#111':'#555'}));}
  drawTeam(){this.add.text(18,39,'SIX-SLOT ROSTER',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});if(!this.state.party.length){this.add.text(24,58,'No wrestlers yet.',{fontFamily:'monospace',fontSize:7,color:'#111'});return;}this.state.party.slice(0,6).forEach((m,i)=>{const r=ROSTER[m.id],st=scaledStats(m.id,m.lvl),y=52+i*16;this.add.text(18,y,`${i===this.sel?((this.time.now||0)%600<300?'▶':'▸'):' '} ${i+1}. ${r.name.split(' ')[0]} L${m.lvl}`,{fontFamily:'monospace',fontSize:6,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'});this.add.text(112,y,`${r.weight} ${r.style}`,{fontFamily:'monospace',fontSize:5,color:'#333'});hpBar(this,112,y+7,45,3,m.hp/st.hp,0x55b867);hpBar(this,162,y+7,45,3,m.gas/st.gas,0x5aa4e6);});const m=this.state.party[this.sel],r=m&&ROSTER[m.id];if(r)this.add.text(18,144,`A SET LEAD • ${r.rarity} ${r.bio}`,{fontFamily:'monospace',fontSize:5,color:'#555',wordWrap:{width:198}});}
  drawPractice(){const opts=[['CONDITIONING','conditioning','EP and grind'],['TECHNIQUE','technique','accuracy and technique'],['STRENGTH','strength','attack power'],['SPEED','speed','first move'],['MAT AWARENESS','awareness','defense and IQ']];this.add.text(18,39,'PRACTICE PLAN',{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});const l=lead(this.state);opts.forEach((o,i)=>this.add.text(22,52+i*14,`${i===this.sel?((this.time.now||0)%600<300?'▶':'▸'):' '} ${o[0]} +1`,{fontFamily:'monospace',fontSize:7,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'}));if(l){const tr=l.training||{};this.add.text(132,52,`Lead: ${ROSTER[l.id].name.split(' ')[0]} L${l.lvl}`,{fontFamily:'monospace',fontSize:6,color:'#111'});this.add.text(132,65,`COND ${tr.conditioning||0}\nTECH ${tr.technique||0}\nSTR  ${tr.strength||0}\nSPD  ${tr.speed||0}\nAWR  ${tr.awareness||0}`,{fontFamily:'monospace',fontSize:6,color:'#333',lineSpacing:2});this.add.text(132,112,`Cost 3 GR\nAdvances time`,{fontFamily:'monospace',fontSize:6,color:'#555'});}else this.add.text(132,62,'No wrestler selected.',{fontFamily:'monospace',fontSize:6,color:'#111'});}
  doPractice(){const opts=['conditioning','technique','strength','speed','awareness'];const l=lead(this.state);if(!l){this.note='NO WRESTLER.';return this.draw();}if(this.state.grit<3){this.note='NEED 3 GRIT.';return this.draw();}const k=opts[this.sel];l.training=l.training||{conditioning:0,technique:0,strength:0,speed:0,awareness:0};l.training[k]=(l.training[k]||0)+1;this.state.training=this.state.training||{};this.state.training[k]=(this.state.training[k]||0)+1;this.state.grit-=3;this.state.stats.practices=(this.state.stats.practices||0)+1;this.state.flags.practiceCount=(this.state.flags.practiceCount||0)+1;const period=advancePeriod(this.state);saveState(this.state);this.note=`${k.toUpperCase()} +1. NOW ${period.toUpperCase()}.`;this.draw();}
  drawShop(){const stock=[['ENERGY','energy',6],['TAPE','tape',9],['FILM','film',12],['INVITE','invite',18],['CLOSE','close',0]];stock.forEach((it,i)=>this.add.text(25,45+i*16,`${i===this.sel?((this.time.now||0)%600<300?'▶':'▸'):' '} ${it[0]} ${it[2]?it[2]+'RP':''}`,{fontFamily:'monospace',fontSize:8,color:i===this.sel?'#b41820':'#111',fontStyle:'bold'}));}
  drawDex(){Object.keys(ROSTER).forEach((id,i)=>{const r=ROSTER[id],known=this.state.dex.seen[id];this.add.text(22,44+i*11,known?`${this.state.dex.caught[id]?'✓':'•'} ${r.name} ${r.style}`:'????',{fontFamily:'monospace',fontSize:6,color:known?'#111':'#777'});});}
  move(d){this.note='';this.confirmReset=false;this.sel=Phaser.Math.Wrap(this.sel+d,0,this.optionCount());this.draw();}
  choose(){
    if(this.tab==='main'){const key=MAIN_OPTS[this.sel][1];if(key==='save'){saveState(this.state);this.note='SAVED.';return this.draw();}this.tab=key;this.sel=0;return this.draw();}
    if(this.tab==='objective')return this.back();
    if(this.tab==='practice')return this.doPractice();
    if(this.tab==='shop')return this.chooseShop();
    if(this.tab==='team')return this.chooseTeam();
    if(this.tab==='dex')return this.back();
    if(this.tab==='badges')return;
    if(this.tab==='bag')return;
    if(this.tab==='options')return this.chooseOptions();
  }
  chooseTeam(){if(!this.state.party.length)return this.back();this.state.active=this.sel;saveState(this.state);this.note='LEAD WRESTLER SET.';this.draw();}
  chooseShop(){const stock=[['Energy Chew','energy',6],['Mat Tape','tape',9],['Film Notes','film',12],['Roster Invite','invite',18],['Close','close',0]],it=stock[this.sel];if(it[1]==='close')return this.close();if(this.state.rep>=it[2]){this.state.rep-=it[2];this.state.items[it[1]]++;saveState(this.state);this.note=`BOUGHT ${it[0].toUpperCase()}.`;}else this.note=`NEED ${it[2]} REP.`;this.draw();}
  energy(){const l=lead(this.state);if(!l){this.note='NO STARTER.';return this.draw();}if(this.state.items.energy<=0){this.note='NO ENERGY.';return this.draw();}this.state.items.energy--;const s=scaledStats(l.id,l.lvl);l.hp=Math.min(s.hp,l.hp+35);saveState(this.state);this.note='ENERGY USED.';this.draw();}
  chooseOptions(){
    if(this.sel===0){const next=!isMuted();setMuted(next);this.state.audioMuted=next;saveState(this.state);this.note=next?'SOUND OFF.':'SOUND ON.';return this.draw();}
    return this.resetDemo();
  }
  resetDemo(){if(!this.confirmReset){this.confirmReset=true;this.note='A AGAIN TO ERASE.';return this.draw();}resetState();this.scene.stop('OverworldScene');this.scene.start('TitleScene');}
  back(){if(this.tab!=='main'){this.tab='main';this.sel=0;this.confirmReset=false;this.draw();return;}this.close();}
  close(){this.scene.stop();if(this.parent?.drawHud)this.parent.drawHud();if(this.parent?.handleVirtualButton)setVirtualHandler(this.parent);}
}
