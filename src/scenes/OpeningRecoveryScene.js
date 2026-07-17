import {loadState,saveState} from '../systems/save.js';
import {restoreParty} from '../systems/mechanics.js';
import {ROSTER} from '../data/roster.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {playMusic,setMuted,sfx,unlockAudio} from '../systems/audio.js';
import {useNativeViewport} from '../systems/nativeViewport.js';

const Phaser=window.Phaser;
const PAGES=[
  {
    speaker:'ATHLETIC TRAINER',
    text:'That first wrestle-off drains everyone. This room restores Condition and Stamina.'
  },
  {
    speaker:'ATHLETIC TRAINER',
    text:'Your travel lineup is fully restored.'
  },
  {
    speaker:'ATHLETIC TRAINER',
    text:'Coach cares how you respond, not just about the result. He is waiting on the mat.'
  }
];

export class OpeningRecoveryScene extends Phaser.Scene{
  constructor(){super('OpeningRecoveryScene');}
  create(){
    useNativeViewport(this);
    this.state=loadState();this.page=0;this.phase='arrival';this.restored=false;this.finishing=false;
    setMuted(this.state.audioMuted);playMusic('overworld');
    this.cameras.main.setBackgroundColor('#111c2d');
    this.input.keyboard.on('keydown-ENTER',()=>this.accept());
    this.input.keyboard.on('keydown-SPACE',()=>this.accept());
    this.input.keyboard.on('keydown-ESC',()=>this.accept());
    setVirtualHandler(this);this.draw();
  }
  handleVirtualButton(key){
    unlockAudio();
    if(key==='a'||key==='b'||key==='start')this.accept();
  }
  accept(){
    if(this.finishing)return;
    if(this.page===0){this.restoreLineup();this.page=1;this.phase='restore';this.draw();return;}
    if(this.page===1){this.page=2;this.phase='return';this.draw();return;}
    this.finish();
  }
  restoreLineup(){
    if(this.restored)return;
    restoreParty(this.state);this.restored=true;saveState(this.state);if(sfx.open)sfx.open();
  }
  finish(){
    this.finishing=true;this.restoreLineup();
    this.state.flags.openingBattleReady=false;this.state.flags.openingRecoveryDone=true;
    this.state.area='wrestling_room';this.state.pos={x:7,y:7};
    this.state.objective={id:'opening_return_coach',stage:3,complete:false,log:['Return to Coach','Recover in the Trainer\'s Room','Wrestle Rex']};
    this.state.message='The Trainer restored your lineup. Coach is waiting on the mat.';
    saveState(this.state);this.cameras.main.fadeOut(300,0,0,0);
    this.time.delayedCall(310,()=>this.scene.start('OverworldScene'));
  }
  draw(){
    this.tweens.killAll();this.children.removeAll(true);
    this.add.image(0,0,'story_recovery_room').setOrigin(0);
    const shade=this.add.graphics();shade.fillStyle(0x07101b,.2);shade.fillRect(0,0,480,204);shade.fillStyle(0x111c2d,.92);shade.fillRect(0,0,480,32);
    this.add.text(240,8,"TRAINER'S ROOM",{fontFamily:FONT,fontSize:17,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5,0);
    this.add.image(100,224,'trainer_intro_native').setOrigin(.5,1);
    const lead=this.state.party[0],record=lead?ROSTER[lead.id]:null;
    const spiritPlate=this.add.graphics();spiritPlate.fillStyle(0x111c2d,.76);spiritPlate.fillCircle(350,116,58);spiritPlate.lineStyle(3,0xf0c65b,.9);spiritPlate.strokeCircle(350,116,58);
    if(record)this.add.image(350,116,'portrait_'+record.asset);
    if(this.page===1){
      for(let index=0;index<3;index++){
        const ring=this.add.circle(350,116,30+index*12,0x000000,0).setStrokeStyle(3,0xf0c65b,.9-index*.2);
        this.tweens.add({targets:ring,alpha:.1,duration:700,delay:index*130,yoyo:true,repeat:-1});
      }
    }
    uiBox(this,16,204,448,112);
    const page=PAGES[this.page];
    this.add.text(32,216,page.speaker,{fontFamily:FONT,fontSize:15,color:'#b41820',fontStyle:'bold'});
    this.add.text(32,241,page.text,{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold',lineSpacing:3,wordWrap:{width:404}});
    this.add.text(442,292,'A',{fontFamily:FONT,fontSize:14,color:'#655f53',fontStyle:'bold'});
  }
}
