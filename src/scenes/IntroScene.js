import {loadState,saveState} from '../systems/save.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {useNativeViewport} from '../systems/nativeViewport.js';
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
const NAME_ROWS=Math.ceil(NAME_KEYS.length/NAME_COLS);

export class IntroScene extends Phaser.Scene{
  constructor(){super('IntroScene');}
  create(){
    useNativeViewport(this);
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
    const nextRow=Phaser.Math.Wrap(row+dy,0,NAME_ROWS),nextCol=Phaser.Math.Wrap(col+dx,0,NAME_COLS);
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
    if(this.readyPlayer)this.tweens.add({targets:this.readyPlayer,alpha:0,y:190,duration:330,ease:'Quad.In'});
    this.time.delayedCall(430,()=>this.scene.start('OverworldScene'));
  }
  drawBackdrop(){
    const g=this.add.graphics();
    g.fillStyle(0x111c2d,1);g.fillRect(0,0,480,320);
    g.fillStyle(0x182b43,1);g.fillRect(0,34,480,174);
    g.fillStyle(0x711824,1);g.fillRect(0,34,10,174);g.fillRect(470,34,10,174);
    g.fillStyle(0xe0b64d,.65);g.fillRect(10,34,460,3);
    g.fillStyle(0xf4e8c8,.08);g.fillEllipse(240,122,214,170);
    this.add.text(18,9,'OPENING DAY',{fontFamily:FONT,fontSize:17,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3});
  }
  drawSubject(subject){
    if(subject==='coach')this.add.image(240,224,'coach_intro_native').setOrigin(.5,1);
    if(subject==='spirit')this.add.image(240,204,'battle_buckshot').setOrigin(.5,1);
    if(subject==='player')this.add.image(240,207,'intro_player').setOrigin(.5,1);
    if(subject==='rex')this.add.image(240,207,'intro_rex').setOrigin(.5,1);
  }
  drawStory(){
    this.drawBackdrop();
    const page=PAGES[this.page];
    this.drawSubject(page.subject);
    uiBox(this,16,204,448,112);
    this.add.text(32,216,page.speaker,{fontFamily:FONT,fontSize:15,color:'#b41820',fontStyle:'bold'});
    this.add.text(32,240,page.text,{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold',lineSpacing:3,wordWrap:{width:408}});
    this.add.text(442,292,'A',{fontFamily:FONT,fontSize:14,color:'#655f53',fontStyle:'bold'});
    for(let index=0;index<PAGES.length;index++)this.add.circle(216+index*12,196,index===this.page?4:2,index===this.page?0xf0c65b:0x7d8897,1);
  }
  drawNaming(){
    const g=this.add.graphics();g.fillStyle(0x111c2d,1);g.fillRect(0,0,480,320);g.fillStyle(0x7d1826,1);g.fillRect(0,0,480,8);
    this.add.text(240,14,'YOUR NAME',{fontFamily:FONT,fontSize:19,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5,0);
    uiBox(this,72,42,336,52);
    const shown=this.nameDraft||'________';
    this.add.text(240,53,shown,{fontFamily:FONT,fontSize:24,color:this.nameDraft?'#111':'#817968',fontStyle:'bold'}).setOrigin(.5,0);
    uiBox(this,28,104,424,196);
    NAME_KEYS.forEach((key,index)=>{
      const col=index%NAME_COLS,row=Math.floor(index/NAME_COLS),x=60+col*60,y=126+row*42,selected=index===this.nameCursor;
      if(selected){const mark=this.add.graphics();mark.fillStyle(0xb41820,.14);mark.fillRoundedRect(x-24,y-7,48,32,3);mark.lineStyle(2,0xb41820,1);mark.strokeRoundedRect(x-24,y-7,48,32,3);}
      this.add.text(x,y,key,{fontFamily:FONT,fontSize:key.length>1?14:17,color:selected?'#b41820':'#111',fontStyle:'bold'}).setOrigin(.5,0);
    });
  }
  drawReady(){
    this.add.image(0,0,'story_fieldhouse').setOrigin(0);
    const shade=this.add.graphics();shade.fillStyle(0x09111c,.46);shade.fillRect(0,0,480,204);
    this.add.text(240,12,'CAMP RANDALL',{fontFamily:FONT,fontSize:17,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:4}).setOrigin(.5,0);
    this.readyPlayer=this.add.image(240,208,'intro_player').setOrigin(.5,1);
    uiBox(this,16,204,448,112);
    this.add.text(32,217,`${this.state.playerName.toUpperCase()}.`,{fontFamily:FONT,fontSize:17,color:'#b41820',fontStyle:'bold'});
    this.add.text(32,244,'Your first season starts now.\nEarn your place in the room.',{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold',lineSpacing:4});
    this.add.text(442,292,'A',{fontFamily:FONT,fontSize:14,color:'#655f53',fontStyle:'bold'});
  }
  draw(){
    this.children.removeAll(true);
    this.readyPlayer=null;
    if(this.phase==='story')this.drawStory();
    else if(this.phase==='naming')this.drawNaming();
    else this.drawReady();
  }
}
