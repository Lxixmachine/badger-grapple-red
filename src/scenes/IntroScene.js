import {loadState,saveState} from '../systems/save.js';import {uiBox,setVirtualHandler} from '../systems/ui.js';import {useLegacyLayout} from '../systems/resolution.js';
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
  create(){useLegacyLayout(this);this.state=loadState();this.page=0;this.nameSel=0;this.naming=false;this.cameras.main.setBackgroundColor('#1d2634');this.input.keyboard.on('keydown-UP',()=>this.move(-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(1));this.input.keyboard.on('keydown-ENTER',()=>this.next());this.input.keyboard.on('keydown-SPACE',()=>this.next());this.input.keyboard.on('keydown-ESC',()=>this.scene.start('TitleScene'));setVirtualHandler(this);this.draw();}
  handleVirtualButton(k){if(k==='up')this.move(-1);if(k==='down')this.move(1);if(k==='a')this.next();if(k==='b')this.scene.start('TitleScene');}
  move(d){if(!this.naming)return;this.nameSel=Phaser.Math.Wrap(this.nameSel+d,0,NAMES.length);this.draw();}
  next(){if(this.naming){this.state.playerName=NAMES[this.nameSel];this.state.flags.introDone=true;saveState(this.state);this.scene.start('StarterScene');return;}this.page++;if(this.page>=PAGES.length){this.naming=true;}this.draw();}
  draw(){this.children.removeAll();this.add.text(120,14,'BADGER GRAPPLE RED',{fontFamily:'monospace',fontSize:13,color:'#f8f0d8',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5);this.add.text(120,33,'OPENING DAY',{fontFamily:'monospace',fontSize:8,color:'#ffe28a',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);this.add.ellipse(120,78,72,42,0x111015,.45);this.add.image(120,78,'portrait_badger').setScale(.42);uiBox(this,13,112,214,50);if(this.naming){this.add.text(23,119,'Choose your name:',{fontFamily:'monospace',fontSize:8,color:'#111',fontStyle:'bold'});NAMES.forEach((n,i)=>this.add.text(30+(i%2)*88,132+(i>1?10:0),`${i===this.nameSel?'▶':' '} ${n}`,{fontFamily:'monospace',fontSize:7,color:i===this.nameSel?'#b41820':'#111',fontStyle:'bold'}));this.add.text(120,153,'A CONFIRM',{fontFamily:'monospace',fontSize:6,color:'#555',fontStyle:'bold'}).setOrigin(.5);return;}const [who,txt]=PAGES[this.page];this.add.text(23,118,who,{fontFamily:'monospace',fontSize:7,color:'#b41820',fontStyle:'bold'});this.add.text(23,130,txt,{fontFamily:'monospace',fontSize:7,color:'#111',wordWrap:{width:194}});this.add.text(206,151,'A',{fontFamily:'monospace',fontSize:8,color:'#555',fontStyle:'bold'});}
}
