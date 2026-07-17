import {STARTERS,ROSTER,counterStarterFor,personaFor} from '../data/roster.js';
import {chooseStarter} from '../systems/save.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {useNativeViewport} from '../systems/nativeViewport.js';

const Phaser=window.Phaser;
const SINGLET_KEYS={Shooter:'singlet_shooter',Rider:'singlet_rider',Scrambler:'singlet_scrambler'};

export class StarterScene extends Phaser.Scene{
  constructor(){super('StarterScene');}
  create(data={}){
    useNativeViewport(this);
    this.story=!!data.story;
    this.returnArea=data.returnArea||'wrestling_room';
    this.returnPos=data.returnPos||{x:7,y:7};
    this.phase=data.resume==='rival'?'rival':'intro';this.sel=0;this.confirmSel=0;this.rivalPage=0;this.launching=false;
    if(this.phase==='rival'){this.playerId=data.playerId;this.rivalId=data.rivalId;}
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
    const target={container:'party',index:0,targetId:this.playerId};
    if(!this.story){chooseStarter(this.playerId);this.scene.start('NamingScene',{target,next:{scene:'OverworldScene'}});return;}
    chooseStarter(this.playerId,{story:true,rivalId:this.rivalId,area:this.returnArea,pos:this.returnPos});
    this.scene.start('NamingScene',{target,next:{scene:'StarterScene',data:{story:true,returnArea:this.returnArea,returnPos:this.returnPos,resume:'rival',playerId:this.playerId,rivalId:this.rivalId}}});
  }
  launchOpeningBattle(){
    this.launching=true;this.cameras.main.fadeOut(240,0,0,0);
    this.time.delayedCall(250,()=>this.scene.start('BattleScene',{
      team:[[this.rivalId,5]],battleType:'opening',trainerName:'Rex',reward:{grit:0,rep:0}
    }));
  }
  drawRoom(){
    this.add.image(0,0,'story_wrestling_room').setOrigin(0);
    const shade=this.add.graphics();shade.fillStyle(0x07101b,.16);shade.fillRect(0,0,480,204);shade.fillStyle(0x111c2d,.92);shade.fillRect(0,0,480,32);
    this.add.text(18,8,'WRESTLING ROOM',{fontFamily:FONT,fontSize:17,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3});
  }
  drawIntro(){
    this.drawRoom();
    const wash=this.add.graphics();wash.fillStyle(0x09111c,.34);wash.fillRect(0,32,480,172);
    this.add.image(240,224,'coach_intro_native').setOrigin(.5,1);
    uiBox(this,16,204,448,112);
    this.add.text(32,216,'HEAD COACH',{fontFamily:FONT,fontSize:15,color:'#b41820',fontStyle:'bold'});
    this.add.text(32,241,'Three singlets. Three ways to wrestle.\nPick the one that fits who you are on the mat.',{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold',lineSpacing:4,wordWrap:{width:404}});
    this.add.text(442,292,'A',{fontFamily:FONT,fontSize:14,color:'#655f53',fontStyle:'bold'});
  }
  drawSelection(){
    this.drawRoom();
    STARTERS.forEach((id,index)=>{
      const record=ROSTER[id],x=96+index*144,selected=index===this.sel;
      if(selected){const ring=this.add.graphics();ring.fillStyle(0x111c2d,.78);ring.fillCircle(x,104,55);ring.lineStyle(3,0xf0c65b,1);ring.strokeCircle(x,104,55);}
      this.add.image(x,106,SINGLET_KEYS[record.style]).setAlpha(selected?1:.72);
      const label=this.add.text(x,160,record.style.toUpperCase(),{fontFamily:FONT,fontSize:14,color:selected?'#fff2c7':'#f8f0d8',fontStyle:'bold',stroke:'#111',strokeThickness:4}).setOrigin(.5,0);
      if(selected)this.tweens.add({targets:label,alpha:.68,yoyo:true,duration:520,repeat:-1});
    });
    this.add.text(96+this.sel*144,39,'v',{fontFamily:FONT,fontSize:20,color:'#f0c65b',fontStyle:'bold',stroke:'#111',strokeThickness:4}).setOrigin(.5,0);
    const id=STARTERS[this.sel],record=ROSTER[id];
    uiBox(this,16,208,448,108);
    this.add.text(32,219,`${personaFor(id).toUpperCase()} / ${record.style.toUpperCase()}`,{fontFamily:FONT,fontSize:15,color:'#b41820',fontStyle:'bold'});
    this.add.text(32,244,record.name,{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold'});
    this.add.text(32,270,record.bio,{fontFamily:FONT,fontSize:14,color:'#3c382f',fontStyle:'bold',wordWrap:{width:320}});
    this.add.image(408,264,'portrait_'+record.asset);
  }
  drawConfirm(){
    this.drawRoom();
    const id=STARTERS[this.sel],record=ROSTER[id];
    this.add.image(130,116,SINGLET_KEYS[record.style]);
    this.add.image(350,116,'portrait_'+record.asset);
    uiBox(this,16,208,448,108);
    this.add.text(32,224,`Take the ${personaFor(id)} singlet?`,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});
    ['NO','YES'].forEach((label,index)=>{
      const x=288+index*104,selected=index===this.confirmSel;
      this.add.text(x,272,`${selected?'> ':''}${label}`,{fontFamily:FONT,fontSize:18,color:selected?'#b41820':'#111',fontStyle:'bold'}).setOrigin(.5,0);
    });
  }
  drawRival(){
    this.drawRoom();
    const player=ROSTER[this.playerId],rival=ROSTER[this.rivalId];
    this.add.image(112,100,SINGLET_KEYS[player.style]).setAlpha(.42);
    this.add.image(368,100,SINGLET_KEYS[rival.style]).setAlpha(.42);
    this.add.image(112,207,'intro_player').setOrigin(.5,1);
    this.add.image(368,207,'intro_rex').setOrigin(.5,1);
    this.add.text(112,42,'YOU',{fontFamily:FONT,fontSize:15,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5,0);
    this.add.text(368,42,'REX',{fontFamily:FONT,fontSize:15,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5,0);
    uiBox(this,16,204,448,112);
    const speaker=this.rivalPage===0?'REX':'HEAD COACH';
    const text=this.rivalPage===0
      ?`You took the ${personaFor(this.playerId)}. I know that matchup. I will take the ${personaFor(this.rivalId)}.`
      :'First wrestle-off. One match. Show me how you respond.';
    this.add.text(32,216,speaker,{fontFamily:FONT,fontSize:15,color:'#b41820',fontStyle:'bold'});
    this.add.text(32,241,text,{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold',lineSpacing:3,wordWrap:{width:404}});
    this.add.text(442,292,'A',{fontFamily:FONT,fontSize:14,color:'#655f53',fontStyle:'bold'});
  }
  draw(){
    this.tweens.killAll();this.children.removeAll(true);
    if(this.phase==='intro')this.drawIntro();
    else if(this.phase==='select')this.drawSelection();
    else if(this.phase==='confirm')this.drawConfirm();
    else this.drawRival();
  }
}
