import {ROSTER,battleTextureFor,makeMon,scaledStats,personaFor} from '../data/roster.js';
import {MOVES} from '../data/moves.js';
import {natureFor,potentialFor} from '../data/stats.js';
import {loadState,saveState} from '../systems/save.js';
import {attemptRecruit,ITEM_DEFS,recruitOdds,SINGLET_KEYS,STYLE_COLORS} from '../systems/mechanics.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {useNativeViewport} from '../systems/nativeViewport.js';

const Phaser = window.Phaser;
const MAIN_OPTS=['RECRUIT','WRESTLE','LEAVE'];
const SINGLET_OPTS=[...SINGLET_KEYS,'back'];

export class ScoutScene extends Phaser.Scene{
  constructor(){super('ScoutScene');}

  create(data={}){
    useNativeViewport(this);
    this.id=data.id||'buckshot';
    this.rare=!!data.rare;
    this.lvl=data.lvl||4;
    this.area=data.area||'r1';
    this.state=loadState();
    this.prospect=makeMon(this.id,this.lvl);
    this.sel=0;
    this.mode='main';
    this.note='';
    this.result='';
    this.pendingNickname=null;
    this.tempInterest=Phaser.Math.Between(45,88);
    this.cameras.main.setBackgroundColor('#1b1d21');
    this.input.keyboard.on('keydown-UP',()=>this.move(-1));
    this.input.keyboard.on('keydown-DOWN',()=>this.move(1));
    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1));
    this.input.keyboard.on('keydown-RIGHT',()=>this.move(1));
    this.input.keyboard.on('keydown-ENTER',()=>this.choose());
    this.input.keyboard.on('keydown-SPACE',()=>this.choose());
    this.input.keyboard.on('keydown-ESC',()=>this.leave());
    setVirtualHandler(this);
    this.render();
  }

  potential(){return potentialFor(this.prospect.ivs);}
  odds(){return recruitOdds(this.prospect,'practiceSinglet',{filmActive:(this.state.effects?.filmStudyAttempts||0)>0,seen:!!this.state.dex?.seen?.[this.id]});}
  overall(s){return Math.round((s.hp+s.attack+s.defense+s.technique+s.awareness+s.speed)/6);}
  styleColor(style){return STYLE_COLORS[style]||0xb41820;}

  render(){
    this.children.removeAll();
    const r=ROSTER[this.id]||ROSTER.buckshot;
    const s=scaledStats(this.id,this.lvl,this.prospect);
    const odds=Math.round(this.odds()*100);
    this.drawBackdrop(r);
    this.drawHeader(r);
    this.drawProspect(r,s,odds);
    this.drawMoves(r);
    this.drawOptions();
    if(this.rare){const b=this.add.text(252,17,'BLUE-CHIP PROSPECT',{fontFamily:FONT,fontSize:14,color:'#ffd75e',fontStyle:'bold',stroke:'#4a2d00',strokeThickness:4}).setOrigin(.5,0).setDepth(50);this.tweens.add({targets:b,alpha:.55,duration:430,yoyo:true,repeat:-1});}
    if(this.note)this.drawNote(this.note);
  }

  drawBackdrop(r){
    const g=this.add.graphics();
    g.fillStyle(0x20242a,1);g.fillRect(0,0,480,320);
    g.fillStyle(0x111015,.55);g.fillRect(0,224,480,96);
    g.lineStyle(3,this.styleColor(r.style),.85);g.strokeEllipse(124,181,190,54);
    g.lineStyle(2,0xd6a336,.45);g.strokeEllipse(124,181,146,38);
    g.fillStyle(0xffffff,.06);g.fillRect(0,0,480,104);
    for(let y=12;y<103;y+=12){g.lineStyle(1,0xffffff,.04);g.lineBetween(0,y,480,y);}
  }

  drawHeader(r){
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(18,12,444,34,4);
    g.fillStyle(0x151318,.95);g.fillRoundedRect(16,10,444,34,4);
    g.lineStyle(2,0xd6a336,.9);g.strokeRoundedRect(16,10,444,34,4);
    g.fillStyle(this.styleColor(r.style),1);g.fillRect(22,16,432,4);
    this.add.text(30,20,'SCOUT REPORT',{fontFamily:FONT,fontSize:18,color:'#fff2c7',fontStyle:'bold'});
    this.add.text(448,22,this.area.toUpperCase(),{fontFamily:FONT,fontSize:14,color:'#d6a336',fontStyle:'bold'}).setOrigin(1,0);
  }

  drawProspect(r,s,odds){
    this.drawBox(16,52,448,154);
    const shadow=this.add.ellipse(124,194,112,24,0x000000,.28);
    shadow.setDepth(0);
    this.add.image(124,202,battleTextureFor(r.id)).setOrigin(.5,1);
    this.drawTag(34,62,r.rarity.toUpperCase(),this.styleColor(r.style));
    this.add.text(210,64,r.name,{fontFamily:FONT,fontSize:19,color:'#111',fontStyle:'bold'});
    this.add.text(210,91,`LV ${this.lvl}  ${r.style.toUpperCase()}`,{fontFamily:FONT,fontSize:15,color:'#333'});
    this.add.text(210,113,`${personaFor(this.id).toUpperCase()} PERSONA`,{fontFamily:FONT,fontSize:14,color:'#6b39b4',fontStyle:'bold'});
    this.add.text(210,136,`POT ${this.potential()}  OVR ${this.overall(s)}`,{fontFamily:FONT,fontSize:14,color:'#333',fontStyle:'bold'});
    this.add.text(210,158,`STR ${s.attack}  DEF ${s.defense}  TEC ${s.technique}`,{fontFamily:FONT,fontSize:12,color:'#333',fontStyle:'bold'});
    this.add.text(210,176,`AWR ${s.awareness}  SPD ${s.speed}`,{fontFamily:FONT,fontSize:12,color:'#333',fontStyle:'bold'});
    this.drawMeter(250,197,52,6,1,0x55b867,'COND',`${s.hp}`);
    this.add.text(446,92,natureFor(this.prospect.nature).name.toUpperCase(),{fontFamily:FONT,fontSize:11,color:'#555',fontStyle:'bold'}).setOrigin(1,0);
    this.drawOddsCard(354,144,odds);
  }

  drawMoves(r){
    this.drawBox(16,214,448,58);
    this.add.text(30,219,'TECHNIQUES',{fontFamily:FONT,fontSize:14,color:'#8a1720',fontStyle:'bold'});
    r.moves.slice(0,4).forEach((key,i)=>{
      const m=MOVES[key];
      const x=32+(i%2)*216,y=241+(i>1?16:0);
      this.add.text(x,y,`${m.name}  ${m.pp} STA`,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold'});
    });
  }

  drawOptions(){
    const options=this.mode==='singlet'?SINGLET_OPTS:MAIN_OPTS;
    const labels=this.mode==='singlet'?['PRACTICE','TRAVEL','STARTER','BACK']:MAIN_OPTS;
    const widths=this.mode==='singlet'?[108,100,112,78]:[120,168,104];
    const y=this.mode==='singlet'?278:283,h=this.mode==='singlet'?34:28;
    let x=this.mode==='singlet'?18:26;
    options.forEach((option,i)=>{
      const label=labels[i];
      const w=widths[i],active=i===this.sel;
      const g=this.add.graphics();
      g.fillStyle(0x000000,.2);g.fillRoundedRect(x+3,y+3,w,h,3);
      g.fillStyle(active?0x7b1d2a:0xf8f0d8,1);g.fillRoundedRect(x,y,w,h,3);
      g.lineStyle(2,active?0xd6a336:0x847868,1);g.strokeRoundedRect(x,y,w,h,3);
      this.add.text(x+w/2,y+4,`${active?'> ':''}${label}`,{fontFamily:FONT,fontSize:this.mode==='singlet'?12:14,color:active?'#fff2c7':'#111',fontStyle:'bold'}).setOrigin(.5,0);
      if(this.mode==='singlet'&&option!=='back')this.add.text(x+w/2,y+19,`x${this.state.items?.[option]||0}`,{fontFamily:FONT,fontSize:10,color:active?'#fff2c7':'#555',fontStyle:'bold'}).setOrigin(.5,0);
      x+=w+8;
    });
  }

  drawOddsCard(x,y,odds){
    const g=this.add.graphics();
    g.fillStyle(0x151318,.9);g.fillRoundedRect(x,y,88,50,4);
    g.lineStyle(2,0xd6a336,.9);g.strokeRoundedRect(x,y,88,50,4);
    this.add.text(x+44,y+5,'ODDS',{fontFamily:FONT,fontSize:13,color:'#d6a336',fontStyle:'bold'}).setOrigin(.5,0);
    this.add.text(x+44,y+23,`${odds}%`,{fontFamily:FONT,fontSize:19,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  drawMeter(x,y,w,h,p,color,label,value){
    this.add.text(x,y-10,label,{fontFamily:FONT,fontSize:12,color:'#444',fontStyle:'bold'}).setOrigin(1,0);
    const g=this.add.graphics();
    g.fillStyle(0x111111,1);g.fillRoundedRect(x+7,y-2,w+4,h+4,2);
    g.fillStyle(0x3d3d3d,1);g.fillRect(x+9,y,w,h);
    g.fillStyle(color,1);g.fillRect(x+9,y,Math.max(1,w*Phaser.Math.Clamp(p,0,1)),h);
    g.fillStyle(0xffffff,.3);g.fillRect(x+9,y,Math.max(1,w*Phaser.Math.Clamp(p,0,1)),2);
    this.add.text(x+w+22,y-10,value,{fontFamily:FONT,fontSize:12,color:'#333',fontStyle:'bold'});
  }

  drawBox(x,y,w,h){
    const g=this.add.graphics();
    g.fillStyle(0x000000,.25);g.fillRoundedRect(x+3,y+3,w,h,4);
    g.fillStyle(0xfff6dc,1);g.fillRoundedRect(x,y,w,h,4);
    g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,4);
    g.lineStyle(1,0xffffff,.55);g.strokeRoundedRect(x+2,y+2,w-4,h-4,3);
    g.lineStyle(1,0xa58d65,.8);g.strokeRoundedRect(x+4,y+4,w-8,h-8,2);
    return g;
  }

  drawTag(x,y,text,color){
    const g=this.add.graphics();
    g.fillStyle(color,.95);g.fillRoundedRect(x,y,94,20,3);
    g.lineStyle(2,0x111111,.7);g.strokeRoundedRect(x,y,94,20,3);
    this.add.text(x+47,y+2,text,{fontFamily:FONT,fontSize:12,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  drawNote(msg){
    const g=this.add.graphics();
    g.fillStyle(0x111015,.94);g.fillRoundedRect(68,252,344,28,3);
    g.lineStyle(2,0xd6a336,.7);g.strokeRoundedRect(68,252,344,28,3);
    this.add.text(240,257,msg,{fontFamily:FONT,fontSize:13,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  move(d){if(this.mode==='obtained')return;const count=this.mode==='singlet'?SINGLET_OPTS.length:MAIN_OPTS.length;this.sel=Phaser.Math.Wrap(this.sel+d,0,count);this.note='';this.render();}
  choose(){if(this.mode==='obtained')return this.leave();if(this.mode==='singlet'){const key=SINGLET_OPTS[this.sel];if(key==='back'){this.mode='main';this.sel=0;return this.render();}return this.tryRecruit(key);}if(this.sel===0){if(!this.state.flags?.recruitingUnlocked){this.note='Coach has not issued the Roster Book yet.';return this.render();}this.mode='singlet';this.sel=0;return this.render();}if(this.sel===1)return this.battle();this.leave();}
  battle(){this.state.dex.seen[this.id]=true;this.state.stats.scouts=(this.state.stats.scouts||0)+1;saveState(this.state);this.scene.start('BattleScene',{enemyId:this.id,enemyLevel:this.lvl,enemyMon:this.prospect,battleType:'wild',area:this.area});}

  tryRecruit(singletKey){
    const r=ROSTER[this.id];
    this.state.dex.seen[this.id]=true;
    if(this.state.dex.caught[this.id]){this.note='Already on roster.';return this.render();}
    const result=attemptRecruit(this.state,this.prospect,singletKey);
    if(result.reason==='empty'){this.note=`No ${ITEM_DEFS[singletKey].short.toLowerCase()} singlets.`;return this.render();}
    if(result.reason==='elite'){this.note='Committed wrestlers cannot be recruited.';return this.render();}
    if(result.success){
      this.pendingNickname={container:result.destination,index:this.state[result.destination].indexOf(result.recruit),targetId:result.recruit.id};
      this.state.message=`${r.name} joined the room!`;
      if((Object.keys(this.state.dex.caught||{}).filter(k=>this.state.dex.caught[k]).length)>=2){
        this.state.objective={id:'first_recruit_done',stage:2,complete:true};
      }
      saveState(this.state);
      this.obtainAnim(`${r.name} joined the ${result.destination==='party'?'travel lineup':'locker'}! The ${personaFor(this.id)} spirit wrestles for Wisconsin now.`);
    }else{
      this.state.message=`${r.name} wants to see more.`;
      saveState(this.state);
      this.mode='main';this.sel=0;this.note='Singlet declined. Try wrestling first.';
      this.render();
    }
  }

  obtainAnim(msg){
    this.children.removeAll();
    this.mode='obtained';
    this.cameras.main.flash(160,255,255,255);
    uiBox(this,44,92,392,136);
    this.add.text(240,116,'RECRUIT OBTAINED',{fontFamily:FONT,fontSize:20,color:'#b41820',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(240,158,msg,{fontFamily:FONT,fontSize:15,color:'#111',fontStyle:'bold',align:'center',wordWrap:{width:344}}).setOrigin(.5);
    this.add.text(240,204,'A CONTINUE',{fontFamily:FONT,fontSize:13,color:'#555',fontStyle:'bold'}).setOrigin(.5);
    this.input.keyboard.once('keydown-ENTER',()=>this.leave());
    this.input.keyboard.once('keydown-SPACE',()=>this.leave());
    this.sel=2;
  }

  leave(){if(this.pendingNickname){this.scene.start('NamingScene',{target:this.pendingNickname,next:{scene:'OverworldScene'}});return;}this.scene.start('OverworldScene');}
  handleVirtualButton(k){if(k==='left'||k==='up')this.move(-1);if(k==='right'||k==='down')this.move(1);if(k==='a')this.choose();if(k==='b')this.leave();}
}
