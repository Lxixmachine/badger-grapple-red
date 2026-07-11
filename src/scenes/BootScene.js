import {chooseStarter,saveState} from '../systems/save.js';
import {setVirtualHandler} from '../systems/ui.js';
import {LAYERED_UPPER_TEXTURES} from '../data/layeredMaps.js';
const Phaser = window.Phaser;
const V='256';
export class BootScene extends Phaser.Scene{
  constructor(){super('BootScene');}
  preload(){
    ['fieldhouse','campus','studyhall','lakeshore','downtown','river','conference','championship','shop','recovery'].forEach(a=>this.load.image('area_'+a,`./assets/ui/area_${a}.png?v=${V}`));
    this.load.image('camp_randall_runtime_tiles',`./assets/tiles/camp_randall_runtime_tiles.png?v=${V}`);
    LAYERED_UPPER_TEXTURES.forEach(key=>this.load.image(key,`./assets/layers/${key}.png?v=${V}`));
    [0,1,2,3].forEach(i=>this.load.image("anim_water_"+i,`./assets/layers/anim_water_${i}.png?v=${V}`));
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
    if(params.has('test')&&params.get('scene')==='overworld'){
      const allowed=['fieldhouse','campus','studyhall','lakeshore','downtown','river','conference','championship','shop','recovery'];
      const state=chooseStarter(params.get('starter')||'buckshot');
      const area=allowed.includes(params.get('area'))?params.get('area'):'fieldhouse';
      state.area=area;
      state.pos={x:Number(params.get('x')||14),y:Number(params.get('y')||(area==='campus'?16:11))};
      state.message='';
      saveState(state);
      this.scene.start('OverworldScene');
      return;
    }
    this.scene.start('TitleScene');
  }
}
