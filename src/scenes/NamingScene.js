import {battleTextureFor,MAX_WRESTLER_NICKNAME_LENGTH,personaFor,ROSTER,setWrestlerNickname,wrestlerName} from '../data/roster.js';
import {loadState,saveState} from '../systems/save.js';
import {FONT,setVirtualHandler} from '../systems/ui.js';

const Phaser=window.Phaser;
const GAME_W=480,GAME_H=320;
const NAME_KEYS=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','SPACE','DEL','OK'];
const NAME_COLS=8;
const NAME_ROWS=Math.ceil(NAME_KEYS.length/NAME_COLS);

export class NamingScene extends Phaser.Scene{
  constructor(){super('NamingScene');}
  create(data={}){
    this.cameras.main.setViewport(0,0,GAME_W,GAME_H);this.cameras.main.setZoom(1);this.cameras.main.centerOn(GAME_W/2,GAME_H/2);this.cameras.main.setRoundPixels(true);
    this.state=loadState();this.targetSpec=data.target||{};this.next=data.next||{scene:'OverworldScene'};this.rename=!!data.rename;
    this.target=this.resolveTarget();this.phase='confirm';this.confirmSel=0;this.nameCursor=0;this.nameDraft=this.target?.nickname||'';this.originalNickname=this.target?.nickname||'';this.finishing=false;
    this.cameras.main.setBackgroundColor('#111c2d');
    this.input.keyboard.on('keydown',event=>this.handleKey(event));
    setVirtualHandler(this);
    if(!this.target){this.finish(false);return;}
    this.draw();
  }
  resolveTarget(){
    const container=this.targetSpec.container==='box'?'box':'party',list=this.state[container]||[];
    const indexed=list[this.targetSpec.index];
    if(indexed&&(!this.targetSpec.targetId||indexed.id===this.targetSpec.targetId))return indexed;
    return list.find(mon=>mon.id===this.targetSpec.targetId)||null;
  }
  handleKey(event){
    if(this.finishing)return;
    const key=event.key;
    if(key==='ArrowLeft')return this.move(-1,0);
    if(key==='ArrowRight')return this.move(1,0);
    if(key==='ArrowUp')return this.move(0,-1);
    if(key==='ArrowDown')return this.move(0,1);
    if(key==='Enter')return this.phase==='naming'?this.finish(true):this.accept();
    if(key==='Escape')return this.back();
    if(key==='Backspace'){if(this.phase==='naming')this.erase();else this.back();return;}
    if(this.phase==='naming'&&key.length===1&&/[A-Za-z0-9 .'-]/.test(key))this.append(key.toUpperCase());
  }
  handleVirtualButton(key,phase='press'){
    if(phase==='up'||this.finishing)return;
    if(key==='left')this.move(-1,0);
    if(key==='right')this.move(1,0);
    if(key==='up')this.move(0,-1);
    if(key==='down')this.move(0,1);
    if(key==='a'||key==='start')this.accept();
    if(key==='b')this.back();
  }
  move(dx,dy){
    if(this.phase==='confirm'){if(dx||dy)this.confirmSel=1-this.confirmSel;this.draw();return;}
    const row=Math.floor(this.nameCursor/NAME_COLS),col=this.nameCursor%NAME_COLS;
    if(dx){const start=row*NAME_COLS,count=Math.min(NAME_COLS,NAME_KEYS.length-start);this.nameCursor=start+Phaser.Math.Wrap(col+dx,0,count);}
    if(dy){const nextRow=Phaser.Math.Wrap(row+dy,0,NAME_ROWS),start=nextRow*NAME_COLS,count=Math.min(NAME_COLS,NAME_KEYS.length-start);this.nameCursor=start+Math.min(col,count-1);}
    this.draw();
  }
  accept(){
    if(this.phase==='confirm'){
      if(this.confirmSel===1){this.finish(false);return;}
      this.phase='naming';this.draw();return;
    }
    const key=NAME_KEYS[this.nameCursor];
    if(key==='DEL'){this.erase();return;}
    if(key==='SPACE'){this.append(' ');return;}
    if(key==='OK'){this.finish(true);return;}
    this.append(key);
  }
  append(value){if(this.nameDraft.length>=MAX_WRESTLER_NICKNAME_LENGTH)return;this.nameDraft=(this.nameDraft+value).slice(0,MAX_WRESTLER_NICKNAME_LENGTH);this.draw();}
  erase(){if(this.nameDraft)this.nameDraft=this.nameDraft.slice(0,-1);this.draw();}
  back(){
    if(this.phase==='naming'){
      if(this.nameDraft){this.erase();return;}
      this.phase='confirm';this.confirmSel=0;this.nameDraft=this.originalNickname;this.draw();return;
    }
    this.finish(false);
  }
  finish(applyNickname){
    if(this.finishing)return;this.finishing=true;
    if(this.target&&applyNickname)setWrestlerNickname(this.target,this.nameDraft);
    saveState(this.state);
    this.cameras.main.fadeOut(180,0,0,0);
    this.time.delayedCall(190,()=>{
      const nextScene=this.next.scene||'OverworldScene';
      this.scene.start(nextScene,this.next.data||{});
      this.scene.bringToTop(nextScene);
    });
  }
  drawFrame(){
    const g=this.add.graphics();g.fillStyle(0x111c2d,1);g.fillRect(0,0,GAME_W,GAME_H);g.fillStyle(0x172b43,1);g.fillRect(0,38,GAME_W,282);g.fillStyle(0x7b1d2a,1);g.fillRect(0,0,GAME_W,7);g.fillStyle(0xd6a336,1);g.fillRect(0,7,GAME_W,2);
    for(let y=52;y<GAME_H;y+=32){g.fillStyle(0xffffff,.025);g.fillRect(0,y,GAME_W,1);}
    this.add.text(20,15,'TEAM REGISTRATION',{fontFamily:FONT,fontSize:17,color:'#fff2c7',fontStyle:'bold'});
  }
  panel(x,y,w,h){const g=this.add.graphics();g.fillStyle(0x000000,.3);g.fillRoundedRect(x+4,y+4,w,h,5);g.fillStyle(0xfff7df,1);g.fillRoundedRect(x,y,w,h,5);g.lineStyle(3,0x17151a,1);g.strokeRoundedRect(x,y,w,h,5);g.lineStyle(1,0xd6a336,1);g.strokeRoundedRect(x+5,y+5,w-10,h-10,3);return g;}
  drawConfirm(){
    this.drawFrame();this.panel(30,52,420,242);
    const subject=this.rename?wrestlerName(this.target):ROSTER[this.target.id].name;
    const question=this.rename?`Change ${subject}'s nickname?`:`Give a nickname to ${subject}?`;
    this.add.text(240,67,question,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold',align:'center',wordWrap:{width:380}}).setOrigin(.5,0);
    this.add.image(240,198,battleTextureFor(this.target.id)).setOrigin(.5,1).setDisplaySize(100,100);
    this.add.text(240,204,`${personaFor(this.target.id).toUpperCase()} WRESTLER`,{fontFamily:FONT,fontSize:13,color:'#7b1d2a',fontStyle:'bold'}).setOrigin(.5,0);
    this.add.line(0,0,52,230,428,230,0xc9bda4,.8).setOrigin(0);
    ['YES','NO'].forEach((label,index)=>{
      const x=160+index*160,selected=index===this.confirmSel,g=this.add.graphics();
      if(selected){g.fillStyle(0x7b1d2a,.14);g.fillRoundedRect(x-62,239,124,39,4);g.lineStyle(2,0x7b1d2a,1);g.strokeRoundedRect(x-62,239,124,39,4);g.fillStyle(0x7b1d2a,1);g.fillTriangle(x-43,252,x-43,266,x-32,259);}
      this.add.text(x+(selected?8:0),247,label,{fontFamily:FONT,fontSize:18,color:selected?'#7b1d2a':'#111',fontStyle:'bold'}).setOrigin(.5,0);
    });
  }
  drawNaming(){
    this.drawFrame();this.panel(28,50,424,55);
    const name=this.nameDraft||'NO NICKNAME';
    this.add.text(44,58,`NAME  ${this.nameDraft.length}/${MAX_WRESTLER_NICKNAME_LENGTH}`,{fontFamily:FONT,fontSize:12,color:'#7b1d2a',fontStyle:'bold'});
    this.add.text(240,75,name,{fontFamily:FONT,fontSize:22,color:this.nameDraft?'#111':'#817968',fontStyle:'bold'}).setOrigin(.5,0);
    NAME_KEYS.forEach((key,index)=>{
      const col=index%NAME_COLS,row=Math.floor(index/NAME_COLS),x=37+col*58,y=119+row*42,selected=index===this.nameCursor;
      const label=key==='SPACE'?'SPACE':key;
      const g=this.add.graphics();g.fillStyle(selected?0x7b1d2a:0xfff7df,selected?1:.96);g.fillRoundedRect(x-24,y-6,50,31,3);g.lineStyle(selected?2:1,selected?0xd6a336:0x17151a,1);g.strokeRoundedRect(x-24,y-6,50,31,3);
      this.add.text(x+1,y,label,{fontFamily:FONT,fontSize:label.length>1?11:16,color:selected?'#fff2c7':'#111',fontStyle:'bold'}).setOrigin(.5,0);
    });
    this.add.text(240,292,'A SELECT   B ERASE   OK CONFIRMS',{fontFamily:FONT,fontSize:12,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }
  draw(){this.children.removeAll(true);if(this.phase==='confirm')this.drawConfirm();else this.drawNaming();}
}
