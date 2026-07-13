import {STARTERS,ROSTER,counterStarterFor,personaFor} from '../data/roster.js';
import {chooseStarter} from '../systems/save.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';

const Phaser=window.Phaser;
const SINGLET_KEYS={Shooter:'singlet_shooter',Rider:'singlet_rider',Scrambler:'singlet_scrambler'};

export class StarterScene extends Phaser.Scene{
  constructor(){super('StarterScene');}
  create(data={}){
    this.story=!!data.story;
    this.returnArea=data.returnArea||'wrestlingroom';
    this.returnPos=data.returnPos||{x:10,y:6};
    this.phase='intro';this.sel=0;this.confirmSel=0;this.rivalPage=0;this.launching=false;
    this.cameras.main.setBackgroundColor('#111c2d');
    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1,0));
    this.input.keyboard.on('keydown-RIGHT',()=>this.move(1,0));
    this.input.keyboard.on('keydown-UP',()=>this.move(0,-1));
    this.input.keyboard.on('keydown-DOWN',()=>this.move(0,1));
    this.input.keyboard.on('keydown-ENTER',()=>this.accept());
    this.input.keyboard.on('keydown-SPACE',()=>this.accept());
    this.input.keyboard.on('keydown-ESC',()=>this.back());
    setVirtualHandler(this);this.draw();
  }
  handleVirtualButton(key){
    if(key==='left')this.move(-1,0);
    if(key==='right')this.move(1,0);
    if(key==='up')this.move(0,-1);
    if(key==='down')this.move(0,1);
    if(key==='a'||key==='start')this.accept();
    if(key==='b')this.back();
  }
  move(dx,dy){
    if(this.launching)return;
    const delta=dx||dy;
    if(this.phase==='select'&&delta){this.sel=Phaser.Math.Wrap(this.sel+delta,0,STARTERS.length);this.draw();}
    if(this.phase==='confirm'&&delta){this.confirmSel=Phaser.Math.Wrap(this.confirmSel+delta,0,2);this.draw();}
  }
  accept(){
    if(this.launching)return;
    if(this.phase==='intro'){this.phase='select';this.draw();return;}
    if(this.phase==='select'){this.phase='confirm';this.confirmSel=0;this.draw();return;}
    if(this.phase==='confirm'){
      if(this.confirmSel===0){this.phase='select';this.draw();return;}
      this.commitChoice();return;
    }
    if(this.phase==='rival'){
      if(this.rivalPage===0){this.rivalPage=1;this.draw();return;}
      this.launchOpeningBattle();
    }
  }
  back(){
    if(this.launching||this.phase==='rival')return;
    if(this.phase==='confirm'){this.phase='select';this.draw();return;}
    if(this.phase==='select'){this.phase='intro';this.draw();return;}
    this.scene.start(this.story?'OverworldScene':'TitleScene');
  }
  commitChoice(){
    this.playerId=STARTERS[this.sel];this.rivalId=counterStarterFor(this.playerId);
    if(!this.story){chooseStarter(this.playerId);this.scene.start('OverworldScene');return;}
    chooseStarter(this.playerId,{story:true,rivalId:this.rivalId,area:this.returnArea,pos:this.returnPos});
    this.phase='rival';this.rivalPage=0;this.draw();
  }
  launchOpeningBattle(){
    this.launching=true;this.cameras.main.fadeOut(240,0,0,0);
    this.time.delayedCall(250,()=>this.scene.start('BattleScene',{
      team:[[this.rivalId,5]],battleType:'opening',trainerName:'Rex',reward:{grit:0,rep:0}
    }));
  }
  drawRoom(){
    this.add.image(0,0,'area_wrestlingroom').setOrigin(0).setDisplaySize(320,183);
    const shade=this.add.graphics();shade.fillStyle(0x07101b,.18);shade.fillRect(0,0,320,150);shade.fillStyle(0x111c2d,.9);shade.fillRect(0,0,320,21);
    this.add.text(160,6,'WRESTLING ROOM',{fontFamily:FONT,fontSize:11,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5,0);
  }
  drawIntro(){
    this.drawRoom();
    const wash=this.add.graphics();wash.fillStyle(0x09111c,.34);wash.fillRect(0,21,320,125);
    this.add.image(160,22,'coach_intro').setOrigin(.5,0).setScale(.92);
    uiBox(this,13,143,294,75);
    this.add.text(25,151,'HEAD COACH',{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    this.add.text(25,168,'Three singlets. Three ways to wrestle.\nPick the one that fits who you are on the mat.',{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',lineSpacing:2,wordWrap:{width:268}});
    this.add.text(289,201,'A',{fontFamily:FONT,fontSize:10,color:'#655f53',fontStyle:'bold'});
  }
  drawSelection(){
    this.drawRoom();
    STARTERS.forEach((id,index)=>{
      const record=ROSTER[id],x=68+index*92,selected=index===this.sel;
      if(selected){const ring=this.add.graphics();ring.fillStyle(0x111c2d,.78);ring.fillCircle(x,83,38);ring.lineStyle(2,0xf0c65b,1);ring.strokeCircle(x,83,38);}
      this.add.image(x,84,SINGLET_KEYS[record.style]).setDisplaySize(selected?66:56,selected?66:56);
      const label=this.add.text(x,124,record.style.toUpperCase(),{fontFamily:FONT,fontSize:9,color:selected?'#fff2c7':'#f8f0d8',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5);
      if(selected)this.tweens.add({targets:label,alpha:.68,yoyo:true,duration:520,repeat:-1});
    });
    this.add.text(68+this.sel*92,39,'\u25bc',{fontFamily:FONT,fontSize:14,color:'#f0c65b',stroke:'#111',strokeThickness:3}).setOrigin(.5);
    const id=STARTERS[this.sel],record=ROSTER[id];
    uiBox(this,10,151,300,68);
    this.add.text(21,159,`${personaFor(id).toUpperCase()} / ${record.style.toUpperCase()}`,{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    this.add.text(21,176,record.name,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold'});
    this.add.text(21,193,record.bio,{fontFamily:FONT,fontSize:10,color:'#3c382f',fontStyle:'bold',wordWrap:{width:225}});
    this.add.image(278,185,'portrait_'+record.asset).setDisplaySize(47,47);
  }
  drawConfirm(){
    this.drawRoom();
    const id=STARTERS[this.sel],record=ROSTER[id];
    this.add.image(103,84,SINGLET_KEYS[record.style]).setDisplaySize(86,86);
    this.add.image(222,84,'portrait_'+record.asset).setDisplaySize(104,104);
    uiBox(this,12,150,296,69);
    this.add.text(25,159,`Take the ${personaFor(id)} singlet?`,{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'});
    ['NO','YES'].forEach((label,index)=>{
      const x=219+index*52,selected=index===this.confirmSel;
      if(selected)this.add.text(x-21,193,'\u25b6',{fontFamily:FONT,fontSize:10,color:'#b41820',fontStyle:'bold'}).setOrigin(.5);
      this.add.text(x,187,label,{fontFamily:FONT,fontSize:11,color:selected?'#b41820':'#111',fontStyle:'bold'}).setOrigin(.5,0);
    });
  }
  drawRival(){
    this.drawRoom();
    const player=ROSTER[this.playerId],rival=ROSTER[this.rivalId];
    this.add.image(88,47,SINGLET_KEYS[player.style]).setDisplaySize(36,36);
    this.add.image(232,47,SINGLET_KEYS[rival.style]).setDisplaySize(36,36);
    this.add.sprite(88,142,'player',1).setOrigin(.5,1).setScale(1.9);
    this.add.sprite(232,142,'npc_purple',1).setOrigin(.5,1).setScale(1.9);
    this.add.text(88,27,'YOU',{fontFamily:FONT,fontSize:9,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);
    this.add.text(232,27,'REX',{fontFamily:FONT,fontSize:9,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);
    uiBox(this,13,145,294,73);
    const speaker=this.rivalPage===0?'REX':'HEAD COACH';
    const text=this.rivalPage===0
      ?`You took the ${personaFor(this.playerId)}. I know that matchup. I will take the ${personaFor(this.rivalId)}.`
      :'First wrestle-off. One match. Show me how you respond.';
    this.add.text(25,153,speaker,{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    this.add.text(25,170,text,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',lineSpacing:1,wordWrap:{width:266}});
    this.add.text(289,201,'A',{fontFamily:FONT,fontSize:10,color:'#655f53',fontStyle:'bold'});
  }
  draw(){
    this.tweens.killAll();this.children.removeAll(true);
    if(this.phase==='intro')this.drawIntro();
    else if(this.phase==='select')this.drawSelection();
    else if(this.phase==='confirm')this.drawConfirm();
    else this.drawRival();
  }
}
