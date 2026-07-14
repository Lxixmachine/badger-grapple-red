import {loadState,saveState} from '../systems/save.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {fitLegacyViewport} from '../systems/legacyViewport.js';
const Phaser=window.Phaser;

const PAGES=[
  {subject:'coach',speaker:'HEAD COACH',text:'Welcome to Wisconsin. I am Coach. Around here, a season is earned one practice and one match at a time.'},
  {subject:'spirit',speaker:'HEAD COACH',text:'On the mat, every wrestler reveals a spirit. It shapes how they attack, ride, and scramble.'},
  {subject:'player',speaker:'HEAD COACH',text:'You are a freshman walk-on. You are not here to run the room. You are here to earn your place in it.'},
  {subject:'rex',speaker:'HEAD COACH',text:'Rex is a returning wrestler at your weight. He wants the same lineup spot, and he will not hand it over.'},
  {subject:'player',speaker:'HEAD COACH',text:'Before Opening Day begins... what should the room call you?'}
];
const NAME_KEYS=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','DEL','OK'];
const NAME_COLS=7;

export class IntroScene extends Phaser.Scene{
  constructor(){super('IntroScene');}
  create(){
    fitLegacyViewport(this);
    this.state=loadState();
    this.page=0;
    this.phase='story';
    this.naming=false;
    this.nameCursor=0;
    this.nameDraft='';
    this.finishing=false;
    this.cameras.main.setBackgroundColor('#111c2d');
    this.input.keyboard.on('keydown-UP',()=>this.moveName(0,-1));
    this.input.keyboard.on('keydown-DOWN',()=>this.moveName(0,1));
    this.input.keyboard.on('keydown-LEFT',()=>this.moveName(-1,0));
    this.input.keyboard.on('keydown-RIGHT',()=>this.moveName(1,0));
    this.input.keyboard.on('keydown-ENTER',()=>this.accept());
    this.input.keyboard.on('keydown-SPACE',()=>this.accept());
    this.input.keyboard.on('keydown-ESC',()=>this.back());
    setVirtualHandler(this);
    this.draw();
  }
  setPhase(phase){this.phase=phase;this.naming=phase==='naming';}
  handleVirtualButton(k,phase='press'){
    if(phase==='up')return;
    if(k==='up')this.moveName(0,-1);
    if(k==='down')this.moveName(0,1);
    if(k==='left')this.moveName(-1,0);
    if(k==='right')this.moveName(1,0);
    if(k==='a'||k==='start')this.accept();
    if(k==='b')this.back();
  }
  moveName(dx,dy){
    if(this.phase!=='naming')return;
    const row=Math.floor(this.nameCursor/NAME_COLS),col=this.nameCursor%NAME_COLS;
    const nextRow=Phaser.Math.Wrap(row+dy,0,4),nextCol=Phaser.Math.Wrap(col+dx,0,NAME_COLS);
    this.nameCursor=nextRow*NAME_COLS+nextCol;
    this.draw();
  }
  accept(){
    if(this.finishing)return;
    if(this.phase==='story'){
      if(this.page<PAGES.length-1)this.page++;
      else this.setPhase('naming');
      this.draw();return;
    }
    if(this.phase==='naming'){this.chooseNameKey();return;}
    if(this.phase==='ready')this.finish();
  }
  chooseNameKey(){
    const key=NAME_KEYS[this.nameCursor];
    if(key==='DEL'){this.nameDraft=this.nameDraft.slice(0,-1);this.draw();return;}
    if(key==='OK'){
      if(!this.nameDraft)return;
      this.state.playerName=this.nameDraft[0]+this.nameDraft.slice(1).toLowerCase();
      this.setPhase('ready');this.draw();return;
    }
    if(this.nameDraft.length<8)this.nameDraft+=key;
    this.draw();
  }
  back(){
    if(this.finishing)return;
    if(this.phase==='ready'){this.setPhase('naming');this.draw();return;}
    if(this.phase==='naming'){
      if(this.nameDraft){this.nameDraft=this.nameDraft.slice(0,-1);this.draw();return;}
      this.setPhase('story');this.page=PAGES.length-1;this.draw();return;
    }
    if(this.page>0){this.page--;this.draw();return;}
    this.scene.start('TitleScene');
  }
  finish(){
    this.finishing=true;
    this.state.flags={...this.state.flags,introDone:true,coachIntro:false,assignment:false,officeChecked:false,personaChosen:false};
    this.state.party=[];
    this.state.box=[];
    this.state.active=0;
    this.state.area='team_locker_room';
    this.state.pos={x:7,y:7};
    this.state.objective={id:'intro_meet_coach',stage:0,complete:false,log:['Meet the Head Coach']};
    this.state.message='Opening Day. The captain is waiting at the wrestling-room doorway.';
    saveState(this.state);
    this.cameras.main.fadeOut(420,3,8,18);
    if(this.readyPlayer)this.tweens.add({targets:this.readyPlayer,scaleX:.12,scaleY:.12,y:122,duration:330,ease:'Quad.In'});
    this.time.delayedCall(430,()=>this.scene.start('OverworldScene'));
  }
  drawBackdrop(){
    const g=this.add.graphics();
    g.fillStyle(0x111c2d,1);g.fillRect(0,0,320,224);
    g.fillStyle(0x182b43,1);g.fillRect(0,24,320,116);
    g.fillStyle(0x711824,1);g.fillRect(0,24,7,116);g.fillRect(313,24,7,116);
    g.fillStyle(0xe0b64d,.65);g.fillRect(7,24,306,2);
    g.fillStyle(0xf4e8c8,.08);g.fillEllipse(160,91,142,118);
    this.add.text(160,7,'OPENING DAY',{fontFamily:FONT,fontSize:11,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);
  }
  drawSubject(subject){
    if(subject==='coach')this.add.image(160,9,'coach_intro').setOrigin(.5,0);
    if(subject==='spirit')this.add.image(160,88,'battle_buckshot').setDisplaySize(104,104);
    if(subject==='player')this.add.sprite(160,140,'player',1).setOrigin(.5,1).setScale(2.65);
    if(subject==='rex')this.add.sprite(160,140,'npc_rex',1).setOrigin(.5,1).setScale(2.65);
  }
  drawStory(){
    this.drawBackdrop();
    const page=PAGES[this.page];
    this.drawSubject(page.subject);
    uiBox(this,13,143,294,75);
    this.add.text(25,150,page.speaker,{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    this.add.text(25,166,page.text,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',lineSpacing:1,wordWrap:{width:270}});
    this.add.text(289,201,'A',{fontFamily:FONT,fontSize:10,color:'#655f53',fontStyle:'bold'});
    for(let index=0;index<PAGES.length;index++)this.add.circle(142+index*9,134,index===this.page?2.5:1.5,index===this.page?0xf0c65b:0x7d8897,1);
  }
  drawNaming(){
    const g=this.add.graphics();g.fillStyle(0x111c2d,1);g.fillRect(0,0,320,224);g.fillStyle(0x7d1826,1);g.fillRect(0,0,320,6);
    this.add.text(160,12,'YOUR NAME',{fontFamily:FONT,fontSize:13,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);
    uiBox(this,28,30,264,39);
    const shown=this.nameDraft||'________';
    this.add.text(160,39,shown,{fontFamily:FONT,fontSize:16,color:this.nameDraft?'#111':'#817968',fontStyle:'bold'}).setOrigin(.5,0);
    uiBox(this,19,76,282,132);
    NAME_KEYS.forEach((key,index)=>{
      const col=index%NAME_COLS,row=Math.floor(index/NAME_COLS),x=42+col*39,y=91+row*27,selected=index===this.nameCursor;
      if(selected){const mark=this.add.graphics();mark.fillStyle(0xb41820,.14);mark.fillRoundedRect(x-17,y-5,34,22,2);mark.lineStyle(1,0xb41820,1);mark.strokeRoundedRect(x-17,y-5,34,22,2);}
      this.add.text(x,y,key,{fontFamily:FONT,fontSize:key.length>1?10:12,color:selected?'#b41820':'#111',fontStyle:'bold'}).setOrigin(.5,0);
    });
  }
  drawReady(){
    this.add.image(0,0,'area_fieldhouse').setOrigin(0).setDisplaySize(320,183);
    const shade=this.add.graphics();shade.fillStyle(0x09111c,.48);shade.fillRect(0,0,320,145);
    this.add.text(160,10,'CAMP RANDALL',{fontFamily:FONT,fontSize:11,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5);
    this.readyPlayer=this.add.sprite(160,132,'player',1).setOrigin(.5,1).setScale(2.55);
    uiBox(this,13,145,294,73);
    this.add.text(25,154,`${this.state.playerName.toUpperCase()}.`,{fontFamily:FONT,fontSize:12,color:'#b41820',fontStyle:'bold'});
    this.add.text(25,173,'Your first season starts now.\nEarn your place in the room.',{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',lineSpacing:2});
    this.add.text(289,201,'A',{fontFamily:FONT,fontSize:10,color:'#655f53',fontStyle:'bold'});
  }
  draw(){
    this.children.removeAll(true);
    this.readyPlayer=null;
    if(this.phase==='story')this.drawStory();
    else if(this.phase==='naming')this.drawNaming();
    else this.drawReady();
  }
}
