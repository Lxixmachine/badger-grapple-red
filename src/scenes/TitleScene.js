import {loadState,resetState,caughtRecruitCount} from '../systems/save.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {unlockAudio,playMusic,setMuted} from '../systems/audio.js';
import {fitLegacyViewport} from '../systems/legacyViewport.js';
const Phaser=window.Phaser;

export class TitleScene extends Phaser.Scene{
  constructor(){super('TitleScene');}
  create(){
    fitLegacyViewport(this);
    this.state=loadState();
    this.mode='splash';
    this.sel=0;
    this.confirmSel=0;
    setMuted(this.state.audioMuted);
    playMusic('title');
    this.cameras.main.setBackgroundColor('#071426');
    this.input.keyboard.on('keydown-UP',()=>this.move(-1));
    this.input.keyboard.on('keydown-DOWN',()=>this.move(1));
    this.input.keyboard.on('keydown-LEFT',()=>this.moveConfirm(-1));
    this.input.keyboard.on('keydown-RIGHT',()=>this.moveConfirm(1));
    this.input.keyboard.on('keydown-ENTER',()=>this.choose());
    this.input.keyboard.on('keydown-SPACE',()=>this.choose());
    this.input.keyboard.on('keydown-SHIFT',()=>this.choose());
    this.input.keyboard.on('keydown-ESC',()=>this.back());
    setVirtualHandler(this);
    this.render();
  }
  hasSave(){return !!(this.state.flags?.introDone||this.state.party?.length||this.state.pos);}
  options(){return this.hasSave()?['CONTINUE','NEW GAME','ERASE DATA']:['NEW GAME'];}
  handleVirtualButton(k){
    unlockAudio();
    if(k==='up')this.move(-1);
    if(k==='down')this.move(1);
    if(k==='left')this.moveConfirm(-1);
    if(k==='right')this.moveConfirm(1);
    if(k==='a'||k==='start')this.choose();
    if(k==='b')this.back();
  }
  move(d){if(this.mode!=='menu')return;this.sel=Phaser.Math.Wrap(this.sel+d,0,this.options().length);this.render();}
  moveConfirm(d){if(!['erase','new'].includes(this.mode))return;this.confirmSel=Phaser.Math.Wrap(this.confirmSel+d,0,2);this.render();}
  back(){
    if(this.mode==='splash')return;
    if(['erase','new'].includes(this.mode)){this.mode='menu';this.confirmSel=0;this.render();return;}
    this.mode='splash';this.render();
  }
  choose(){
    if(this.mode==='splash'){this.mode='menu';this.sel=0;this.render();return;}
    if(this.mode==='erase'){
      if(this.confirmSel===0)return this.back();
      resetState();this.state=loadState();this.mode='menu';this.sel=0;this.confirmSel=0;this.render();return;
    }
    if(this.mode==='new'){
      if(this.confirmSel===0)return this.back();
      resetState();this.scene.start('IntroScene');return;
    }
    const option=this.options()[this.sel];
    if(option==='CONTINUE'){this.scene.start('OverworldScene');return;}
    if(option==='NEW GAME'){
      if(this.hasSave()){this.mode='new';this.confirmSel=0;this.render();return;}
      resetState();this.scene.start('IntroScene');return;
    }
    if(option==='ERASE DATA'){this.mode='erase';this.confirmSel=0;this.render();}
  }
  drawBackdrop(dim=false){
    this.add.image(0,0,'title_hero').setOrigin(0);
    if(dim){const veil=this.add.graphics();veil.fillStyle(0x06101f,.72);veil.fillRect(0,0,320,224);}
    this.add.image(160,5,'logo').setOrigin(.5,0).setDisplaySize(dim?154:188,dim?70:86);
  }
  drawSplash(){
    this.drawBackdrop(false);
    const strip=this.add.graphics();strip.fillStyle(0x050b14,.78);strip.fillRect(76,188,168,27);strip.lineStyle(1,0xd5aa45,.9);strip.lineBetween(84,189,236,189);strip.lineBetween(84,214,236,214);
    const prompt=this.add.text(160,194,'PRESS START',{fontFamily:FONT,fontSize:13,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5);
    this.tweens.add({targets:prompt,alpha:.36,duration:650,yoyo:true,repeat:-1});
  }
  drawMenu(){
    this.drawBackdrop(true);
    const opts=this.options();
    const hasSave=this.hasSave();
    const y=hasSave?88:137,h=hasSave?124:52;
    uiBox(this,38,y,244,h);
    this.add.text(52,y+10,opts.map((option,index)=>`${index===this.sel?'>':' '} ${option}`).join('\n'),{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold',lineSpacing:5});
    if(!hasSave)return;
    const stats=this.state.stats||{};
    this.add.text(52,161,`${this.state.playerName.toUpperCase()}   ROSTER ${caughtRecruitCount(this.state)}   BADGES ${(this.state.badges||[]).length}`,{fontFamily:FONT,fontSize:10,color:'#5d2a2f',fontStyle:'bold'});
    this.add.text(52,180,`WINS ${stats.wins||0}   SCOUTED ${stats.scouts||0}${this.state.tournament?.champion?'   CHAMPION':''}`,{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold'});
  }
  drawConfirmation(){
    this.drawBackdrop(true);
    uiBox(this,38,113,244,82);
    const erase=this.mode==='erase';
    this.add.text(160,126,erase?'ERASE ALL SAVE DATA?':'BEGIN A NEW SEASON?',{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(160,148,erase?'This cannot be undone.':'Current progress will be erased.',{fontFamily:FONT,fontSize:10,color:'#555',fontStyle:'bold'}).setOrigin(.5);
    ['NO','YES'].forEach((label,index)=>this.add.text(112+index*96,173,`${index===this.confirmSel?'> ':''}${label}`,{fontFamily:FONT,fontSize:12,color:index===this.confirmSel?'#b41820':'#111',fontStyle:'bold'}).setOrigin(.5));
  }
  render(){
    this.tweens.killAll();
    this.children.removeAll(true);
    if(this.mode==='splash')this.drawSplash();
    else if(this.mode==='menu')this.drawMenu();
    else this.drawConfirmation();
  }
}
