import {chooseStarter} from '../systems/save.js';
import {setVirtualHandler} from '../systems/ui.js';
const Phaser = window.Phaser;
const V='221';
export class BootScene extends Phaser.Scene{
  constructor(){super('BootScene');}
  preload(){
    ['fieldhouse','campus','lakeshore','downtown','river','conference','championship','shop','recovery'].forEach(a=>this.load.image('area_'+a,`./assets/ui/area_${a}.png?v=${V}`));
    this.load.spritesheet('tiles',`./assets/tiles/fieldhouse_tiles.png?v=${V}`,{frameWidth:16,frameHeight:16});
    this.load.spritesheet('player',`./assets/sprites/player_walk.png?v=${V}`,{frameWidth:24,frameHeight:36});
    this.load.spritesheet('npc',`./assets/sprites/npc_walk.png?v=${V}`,{frameWidth:24,frameHeight:36});
    ['red','green','purple','gold','gray'].forEach(v=>this.load.spritesheet('npc_'+v,`./assets/sprites/npc_walk_${v}.png?v=${V}`,{frameWidth:24,frameHeight:36}));
    ['badger','neutral','top','scramble','pace'].forEach(k=>{this.load.image('battle_'+k,`./assets/sprites/battle_${k}.png?v=${V}`);this.load.image('battle_'+k+'_back',`./assets/sprites/battle_${k}_back.png?v=${V}`);this.load.image('portrait_'+k,`./assets/portraits/${k}.png?v=${V}`);});
    this.load.image('logo',`./assets/ui/logo.png?v=${V}`);this.load.image('title_bg',`./assets/ui/title_bg.png?v=${V}`);this.load.image('battle_arena',`./assets/ui/battle_arena.png?v=${V}`);
  }
  create(){
    this.anims.create({key:'walk-down',frames:this.anims.generateFrameNumbers('player',{start:0,end:2}),frameRate:7,repeat:-1});
    this.anims.create({key:'walk-left',frames:this.anims.generateFrameNumbers('player',{start:3,end:5}),frameRate:7,repeat:-1});
    this.anims.create({key:'walk-right',frames:this.anims.generateFrameNumbers('player',{start:6,end:8}),frameRate:7,repeat:-1});
    this.anims.create({key:'walk-up',frames:this.anims.generateFrameNumbers('player',{start:9,end:11}),frameRate:7,repeat:-1});
    this.anims.create({key:'npc-idle-down',frames:[{key:'npc',frame:1}],frameRate:1,repeat:0});
    this.anims.create({key:'npc-idle-left',frames:[{key:'npc',frame:4}],frameRate:1,repeat:0});
    this.anims.create({key:'npc-idle-right',frames:[{key:'npc',frame:7}],frameRate:1,repeat:0});
    this.anims.create({key:'npc-idle-up',frames:[{key:'npc',frame:10}],frameRate:1,repeat:0});
    setVirtualHandler(this);
    const params=new URLSearchParams(window.location.search);
    if(params.has('test')&&params.get('scene')==='scout'){
      this.scene.start('ScoutScene',{
        id:params.get('id')||'buckshot',
        lvl:Number(params.get('lvl')||5),
        area:params.get('area')||'campus'
      });
      return;
    }
    if(params.has('test')&&params.get('scene')==='battle'){
      chooseStarter(params.get('starter')||'buckshot');
      this.scene.start('BattleScene',{
        enemyId:params.get('enemyId')||'drillpartner',
        enemyLevel:Number(params.get('enemyLevel')||5),
        battleType:params.get('battleType')||'spar'
      });
      return;
    }
    this.scene.start('TitleScene');
  }
}
