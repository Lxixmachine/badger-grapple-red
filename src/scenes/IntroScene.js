import {loadState,saveState} from '../systems/save.js';import {uiBox,setVirtualHandler} from '../systems/ui.js';
const Phaser=window.Phaser;
const NAMES=['Coach','Becky','Badger','Grappler'];
const PAGES=[
  ['HEAD COACH','Welcome to Wisconsin. Around here, wrestling is built one recruit, one practice, and one match at a time.'],
  ['HEAD COACH','Your job is to build a lineup, scout the Quad, and turn raw prospects into Badgers.'],
  ['HEAD COACH','One more thing, rookie. In this conference, wrestlers take the mat in their SPIRIT FORM. Under the lights, the animal inside comes out.'],
  ['HEAD COACH','First, tell me what the room should call you.']
];
export class IntroScene extends Phaser.Scene{
  constructor(){super('IntroScene');}
  create(){this.state=loadState();this.page=0;this.nameSel=0;this.naming=false;this.cameras.main.setBackgroundColor('#1d2634');this.input.keyboard.on('keydown-UP',()=>this.move(-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(1));this.input.keyboard.on('keydown-ENTER',()=>this.next());this.input.keyboard.on('keydown-SPACE',()=>this.next());this.input.keyboard.on('keydown-ESC',()=>this.scene.start('TitleScene'));setVirtualHandler(this);this.draw();}
  handleVirtualButton(k){if(k==='up')this.move(-1);if(k==='down')this.move(1);if(k==='a')this.next();if(k==='b')this.scene.start('TitleScene');}
  move(d){if(!this.naming)return;this.nameSel=Phaser.Math.Wrap(this.nameSel+d,0,NAMES.length);this.draw();}
  next(){if(this.naming){this.state.playerName=NAMES[this.nameSel];this.state.flags.introDone=true;saveState(this.state);this.scene.start('StarterScene');return;}this.page++;if(this.page>=PAGES.length){this.naming=true;}this.draw();}
  draw(){this.children.removeAll();this.add.text(160,20,'BADGER GRAPPLE RED',{fontFamily:'monospace',fontSize:16,color:'#f8f0d8',fontStyle:'bold',stroke:'#111',strokeThickness:4}).setOrigin(.5);this.add.text(160,44,'OPENING DAY',{fontFamily:'monospace',fontSize:10,color:'#ffe28a',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);this.add.ellipse(160,100,96,56,0x111015,.45);this.add.image(160,100,'portrait_badger').setScale(.56);uiBox(this,20,148,280,64);if(this.naming){this.add.text(32,156,'Choose your name:',{fontFamily:'monospace',fontSize:10,color:'#111',fontStyle:'bold'});NAMES.forEach((n,i)=>this.add.text(42+(i%2)*118,174+(i>1?14:0),`${i===this.nameSel?'▶':' '} ${n}`,{fontFamily:'monospace',fontSize:9,color:i===this.nameSel?'#b41820':'#111',fontStyle:'bold'}));this.add.text(160,203,'A CONFIRM',{fontFamily:'monospace',fontSize:8,color:'#555',fontStyle:'bold'}).setOrigin(.5);return;}const [who,txt]=PAGES[this.page];this.add.text(32,156,who,{fontFamily:'monospace',fontSize:9,color:'#b41820',fontStyle:'bold'});this.add.text(32,170,txt,{fontFamily:'monospace',fontSize:9,color:'#111',wordWrap:{width:256}});this.add.text(284,200,'A',{fontFamily:'monospace',fontSize:10,color:'#555',fontStyle:'bold'});}
}
