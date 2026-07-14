import {loadState,saveState} from '../systems/save.js';
import {restoreParty} from '../systems/mechanics.js';
import {ROSTER} from '../data/roster.js';
import {FONT,uiBox,setVirtualHandler} from '../systems/ui.js';
import {playMusic,setMuted,sfx,unlockAudio} from '../systems/audio.js';
import {fitLegacyViewport} from '../systems/legacyViewport.js';

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
    fitLegacyViewport(this);
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
    this.add.image(0,0,'area_recovery').setOrigin(0).setDisplaySize(320,183);
    const shade=this.add.graphics();shade.fillStyle(0x07101b,.22);shade.fillRect(0,0,320,145);shade.fillStyle(0x111c2d,.9);shade.fillRect(0,0,320,21);
    this.add.text(160,6,"TRAINER'S ROOM",{fontFamily:FONT,fontSize:11,color:'#fff2c7',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5,0);
    this.add.image(76,143,'trainer_intro').setOrigin(.5,1);
    const lead=this.state.party[0],record=lead?ROSTER[lead.id]:null;
    const spiritPlate=this.add.graphics();spiritPlate.fillStyle(0x111c2d,.76);spiritPlate.fillCircle(232,86,45);spiritPlate.lineStyle(2,0xf0c65b,.9);spiritPlate.strokeCircle(232,86,45);
    if(record)this.add.image(232,86,'portrait_'+record.asset).setDisplaySize(86,86);
    if(this.page===1){
      for(let index=0;index<3;index++){
        const ring=this.add.circle(232,86,18+index*10,0x000000,0).setStrokeStyle(2,0xf0c65b,.9-index*.2);
        this.tweens.add({targets:ring,scale:1.28,alpha:0,duration:700,delay:index*130,repeat:-1});
      }
    }
    uiBox(this,13,145,294,73);
    const page=PAGES[this.page];
    this.add.text(25,153,page.speaker,{fontFamily:FONT,fontSize:11,color:'#b41820',fontStyle:'bold'});
    this.add.text(25,170,page.text,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',lineSpacing:1,wordWrap:{width:266}});
    this.add.text(289,201,'A',{fontFamily:FONT,fontSize:10,color:'#655f53',fontStyle:'bold'});
  }
}
