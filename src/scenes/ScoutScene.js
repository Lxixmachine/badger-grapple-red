import {ROSTER,scaledStats,personaFor} from '../data/roster.js';
import {MOVES,ADV} from '../data/moves.js';
import {loadState,saveState} from '../systems/save.js';
import {attemptRecruit,ITEM_DEFS,recruitOdds,SINGLET_KEYS,STYLE_COLORS} from '../systems/mechanics.js';
import {uiBox,setVirtualHandler} from '../systems/ui.js';

const Phaser = window.Phaser;
const MAIN_OPTS=['RECRUIT','WRESTLE','LEAVE'];
const SINGLET_OPTS=[...SINGLET_KEYS,'back'];

export class ScoutScene extends Phaser.Scene{
  constructor(){super('ScoutScene');}

  create(data={}){
    this.id=data.id||'buckshot';
    this.rare=!!data.rare;
    this.lvl=data.lvl||4;
    this.area=data.area||'campus';
    this.state=loadState();
    this.sel=0;
    this.mode='main';
    this.note='';
    this.result='';
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

  potential(r){return {Common:'C+',Uncommon:'B',Rare:'A-',Elite:'A+'}[r.rarity]||'C';}
  odds(){const target={id:this.id,lvl:this.lvl,hp:scaledStats(this.id,this.lvl).hp,stamina:scaledStats(this.id,this.lvl).stamina};return recruitOdds(target,'practiceSinglet',{filmActive:(this.state.effects?.filmStudyAttempts||0)>0,seen:!!this.state.dex?.seen?.[this.id]});}
  overall(s){return Math.round((s.hp+s.atk+s.def+s.spd+s.stamina)/12);}
  styleColor(style){return STYLE_COLORS[style]||0xb41820;}
  tip(style){const a=Object.keys(ADV).find(k=>(ADV[k]||[]).includes(style));return `${a||'Shooter'} attacks`;}

  render(){
    this.children.removeAll();
    const r=ROSTER[this.id]||ROSTER.buckshot;
    const s=scaledStats(this.id,this.lvl);
    const odds=Math.round(this.odds()*100);
    this.drawBackdrop(r);
    this.drawHeader(r);
    this.drawProspect(r,s,odds);
    this.drawMoves(r);
    this.drawOptions();
    if(this.rare){const b=this.add.text(168,19,'★ BLUE-CHIP PROSPECT ★',{fontFamily:'monospace',fontSize:8,color:'#ffd75e',fontStyle:'bold',stroke:'#4a2d00',strokeThickness:3}).setOrigin(.5,0).setDepth(50);this.tweens.add({targets:b,alpha:.55,duration:430,yoyo:true,repeat:-1});}
    if(this.note)this.drawNote(this.note);
  }

  drawBackdrop(r){
    const g=this.add.graphics();
    g.fillStyle(0x20242a,1);g.fillRect(0,0,320,224);
    g.fillStyle(0x111015,.55);g.fillRect(0,158,320,66);
    g.lineStyle(2,this.styleColor(r.style),.85);g.strokeEllipse(86,114,140,40);
    g.lineStyle(1,0xd6a336,.45);g.strokeEllipse(86,114,106,28);
    g.fillStyle(0xffffff,.06);g.fillRect(0,0,320,70);
    for(let y=9;y<69;y+=9){g.lineStyle(1,0xffffff,.04);g.lineBetween(0,y,320,y);}
  }

  drawHeader(r){
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(12,10,296,24,3);
    g.fillStyle(0x151318,.95);g.fillRoundedRect(10,8,296,24,3);
    g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(10,8,296,24,3);
    g.fillStyle(this.styleColor(r.style),1);g.fillRect(14,12,288,3);
    this.add.text(20,17,'SCOUT REPORT',{fontFamily:'monospace',fontSize:10,color:'#fff2c7',fontStyle:'bold'});
    this.add.text(300,18,this.area.toUpperCase(),{fontFamily:'monospace',fontSize:8,color:'#d6a336',fontStyle:'bold'}).setOrigin(1,0);
  }

  drawProspect(r,s,odds){
    this.drawBox(12,40,296,96);
    const shadow=this.add.ellipse(82,118,82,18,0x000000,.28);
    shadow.setDepth(0);
    this.add.image(82,98,'battle_'+r.asset).setScale(.82);
    this.drawTag(28,46,r.rarity.toUpperCase(),this.styleColor(r.style));
    this.add.text(132,48,r.name,{fontFamily:'monospace',fontSize:11,color:'#111',fontStyle:'bold'});
    this.add.text(132,64,`${r.weight} lb  ${r.style}  Lv ${this.lvl}`,{fontFamily:'monospace',fontSize:8,color:'#333',fontStyle:'bold'});
    this.add.text(132,77,`${personaFor(this.id).toUpperCase()} PERSONA`,{fontFamily:'monospace',fontSize:8,color:'#7a4ac9',fontStyle:'bold'});
    this.add.text(132,90,`POT ${this.potential(r)}  OVR ${this.overall(s)}  INT ${this.tempInterest}%`,{fontFamily:'monospace',fontSize:8,color:'#333'});
    this.drawMeter(133,106,76,6,s.hp/(s.hp+10),0x55b867,'COND',`${s.hp}`);
    this.drawMeter(133,120,76,5,s.stamina/(s.stamina+10),0x5aa4e6,'STA',`${s.stamina}`);
    this.drawOddsCard(238,96,odds);
  }

  drawMoves(r){
    this.drawBox(12,142,296,44);
    this.add.text(22,148,'TECHNIQUES',{fontFamily:'monospace',fontSize:9,color:'#8a1720',fontStyle:'bold'});
    r.moves.slice(0,4).forEach((key,i)=>{
      const m=MOVES[key];
      const x=24+(i%2)*142,y=163+(i>1?12:0);
      this.add.text(x,y,`${m.name}`,{fontFamily:'monospace',fontSize:8,color:'#111',fontStyle:'bold'});
      this.add.text(x+80,y,`${m.style[0]}${m.power}`,{fontFamily:'monospace',fontSize:7,color:'#555'});
    });
    this.add.text(172,148,this.tip(r.style),{fontFamily:'monospace',fontSize:8,color:'#555',fontStyle:'bold'}).setOrigin(0,0);
  }

  drawOptions(){
    const options=this.mode==='singlet'?SINGLET_OPTS:MAIN_OPTS;
    const labels=this.mode==='singlet'?['PRACTICE','TRAVEL','STARTER','BACK']:MAIN_OPTS;
    const widths=this.mode==='singlet'?[68,62,68,48]:[78,108,62];
    let x=this.mode==='singlet'?12:18;
    options.forEach((option,i)=>{
      const label=labels[i];
      const w=widths[i],active=i===this.sel;
      const g=this.add.graphics();
      g.fillStyle(0x000000,.2);g.fillRoundedRect(x+2,196,w,20,2);
      g.fillStyle(active?0x7b1d2a:0xf8f0d8,1);g.fillRoundedRect(x,194,w,20,2);
      g.lineStyle(1,active?0xd6a336:0x847868,1);g.strokeRoundedRect(x,194,w,20,2);
      this.add.text(x+w/2,200,`${active?'> ':''}${label}`,{fontFamily:'monospace',fontSize:7,color:active?'#fff2c7':'#111',fontStyle:'bold'}).setOrigin(.5,0);
      if(this.mode==='singlet'&&option!=='back')this.add.text(x+w/2,187,`x${this.state.items?.[option]||0}`,{fontFamily:'monospace',fontSize:6,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
      x+=w+11;
    });
  }

  drawOddsCard(x,y,odds){
    const g=this.add.graphics();
    g.fillStyle(0x151318,.9);g.fillRoundedRect(x,y,60,32,3);
    g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(x,y,60,32,3);
    this.add.text(x+30,y+5,'ODDS',{fontFamily:'monospace',fontSize:7,color:'#d6a336',fontStyle:'bold'}).setOrigin(.5,0);
    this.add.text(x+30,y+16,`${odds}%`,{fontFamily:'monospace',fontSize:12,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  drawMeter(x,y,w,h,p,color,label,value){
    this.add.text(x,y-4,label,{fontFamily:'monospace',fontSize:7,color:'#555',fontStyle:'bold'}).setOrigin(1,0);
    const g=this.add.graphics();
    g.fillStyle(0x111111,1);g.fillRoundedRect(x+5,y-1,w+2,h+2,1);
    g.fillStyle(0x3d3d3d,1);g.fillRect(x+6,y,w,h);
    g.fillStyle(color,1);g.fillRect(x+6,y,Math.max(1,w*Phaser.Math.Clamp(p,0,1)),h);
    g.fillStyle(0xffffff,.3);g.fillRect(x+6,y,Math.max(1,w*Phaser.Math.Clamp(p,0,1)),1);
    this.add.text(x+w+14,y-4,value,{fontFamily:'monospace',fontSize:7,color:'#333',fontStyle:'bold'});
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
    g.fillStyle(color,.95);g.fillRoundedRect(x,y,62,13,2);
    g.lineStyle(1,0x111111,.7);g.strokeRoundedRect(x,y,62,13,2);
    this.add.text(x+31,y+3,text,{fontFamily:'monospace',fontSize:7,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  drawNote(msg){
    const g=this.add.graphics();
    g.fillStyle(0x111015,.92);g.fillRoundedRect(56,175,208,14,2);
    g.lineStyle(1,0xd6a336,.7);g.strokeRoundedRect(56,175,208,14,2);
    this.add.text(160,178,msg,{fontFamily:'monospace',fontSize:7,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  move(d){const count=this.mode==='singlet'?SINGLET_OPTS.length:MAIN_OPTS.length;this.sel=Phaser.Math.Wrap(this.sel+d,0,count);this.note='';this.render();}
  choose(){if(this.mode==='singlet'){const key=SINGLET_OPTS[this.sel];if(key==='back'){this.mode='main';this.sel=0;return this.render();}return this.tryRecruit(key);}if(this.sel===0){if(!this.state.flags?.recruitingUnlocked){this.note='Coach has not issued the Roster Book yet.';return this.render();}this.mode='singlet';this.sel=0;return this.render();}if(this.sel===1)return this.battle();this.leave();}
  battle(){this.state.dex.seen[this.id]=true;this.state.stats.scouts=(this.state.stats.scouts||0)+1;saveState(this.state);this.scene.start('BattleScene',{enemyId:this.id,enemyLevel:this.lvl,battleType:'wild'});}

  tryRecruit(singletKey){
    const r=ROSTER[this.id];
    this.state.dex.seen[this.id]=true;
    if(this.state.dex.caught[this.id]){this.note='Already on roster.';return this.render();}
    const target={id:this.id,lvl:this.lvl,hp:scaledStats(this.id,this.lvl).hp,stamina:scaledStats(this.id,this.lvl).stamina};
    const result=attemptRecruit(this.state,target,singletKey);
    if(result.reason==='empty'){this.note=`No ${ITEM_DEFS[singletKey].short.toLowerCase()} singlets.`;return this.render();}
    if(result.reason==='elite'){this.note='Committed wrestlers cannot be recruited.';return this.render();}
    if(result.success){
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
    this.cameras.main.flash(160,255,255,255);
    uiBox(this,24,68,272,88);
    this.add.text(160,88,'RECRUIT OBTAINED',{fontFamily:'monospace',fontSize:13,color:'#b41820',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(160,114,msg,{fontFamily:'monospace',fontSize:9,color:'#111',align:'center',wordWrap:{width:232}}).setOrigin(.5);
    this.add.text(160,142,'A CONTINUE',{fontFamily:'monospace',fontSize:9,color:'#555',fontStyle:'bold'}).setOrigin(.5);
    this.input.keyboard.once('keydown-ENTER',()=>this.leave());
    this.input.keyboard.once('keydown-SPACE',()=>this.leave());
    this.sel=2;
  }

  leave(){this.scene.start('OverworldScene');}
  handleVirtualButton(k){if(k==='left'||k==='up')this.move(-1);if(k==='right'||k==='down')this.move(1);if(k==='a')this.choose();if(k==='b')this.leave();}
}
