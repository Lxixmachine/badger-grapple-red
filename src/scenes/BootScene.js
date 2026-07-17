import {chooseStarter,defaultState,loadState,resetState,saveState} from '../systems/save.js';
import {setVirtualHandler} from '../systems/ui.js';
import {LAYERED_UPPER_TEXTURES} from '../data/layeredMaps.js';
import {NPC_LOOKS} from '../data/npcLooks.js';
import {preloadSeasonOneAssets, SEASON_ONE_PROJECT} from '../data/seasonOneRuntime.js';
import {makeMon, ROSTER} from '../data/roster.js';
const Phaser = window.Phaser;
const V='271';
export class BootScene extends Phaser.Scene{
  constructor(){super('BootScene');}
  preload(){
    preloadSeasonOneAssets(this);
    ['fieldhouse','wrestlingroom','campus','studyhall','lakeshore','downtown','river','conference','championship','shop','recovery'].forEach(a=>this.load.image('area_'+a,`./assets/ui/area_${a}.png?v=${V}`));
    this.load.image('camp_randall_runtime_tiles',`./assets/tiles/camp_randall_runtime_tiles.png?v=${V}`);
    LAYERED_UPPER_TEXTURES.forEach(key=>this.load.image(key,`./assets/layers/${key}.png?v=${V}`));
    [0,1,2,3].forEach(i=>this.load.image("anim_water_"+i,`./assets/layers/anim_water_${i}.png?v=${V}`));
    this.load.spritesheet('tiles',`./assets/tiles/fieldhouse_tiles.png?v=${V}`,{frameWidth:16,frameHeight:16});
    this.load.spritesheet('player',`./assets/sprites/player_walk.png?v=${V}`,{frameWidth:24,frameHeight:36});
    this.load.spritesheet('npc',`./assets/sprites/npc_walk.png?v=${V}`,{frameWidth:24,frameHeight:36});
    NPC_LOOKS.forEach(look=>this.load.spritesheet(`npc_${look}`,`./assets/sprites/npc_${look}_walk.png?v=${V}`,{frameWidth:24,frameHeight:36}));
    Object.values(ROSTER).forEach(({battleAsset})=>{
      this.load.image(`battle_${battleAsset}`,`./assets/sprites/battle_${battleAsset}_v3.png?v=${V}`);
      this.load.image(`battle_${battleAsset}_back`,`./assets/sprites/battle_${battleAsset}_back_v3.png?v=${V}`);
    });
    ['badger','neutral','top','scramble','pace'].forEach(k=>this.load.image('portrait_'+k,`./assets/portraits/${k}.png?v=${V}`));
    this.load.image('logo',`./assets/ui/logo.png?v=${V}`);this.load.image('title_bg',`./assets/ui/title_bg.png?v=${V}`);this.load.image('title_hero',`./assets/ui/title_hero.png?v=${V}`);this.load.image('coach_intro',`./assets/portraits/coach_intro.png?v=${V}`);this.load.image('trainer_intro',`./assets/portraits/trainer_intro.png?v=${V}`);this.load.image('battle_arena',`./assets/ui/battle_arena_v2.png?v=${V}`);
    ['shooter','rider','scrambler'].forEach(style=>this.load.image('singlet_'+style,`./assets/ui/singlet_${style}.png?v=${V}`));
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
    // Test resets must happen before any scene reads or writes the save. Clearing
    // storage after Phaser starts leaves the active scene and persistence split.
    if(params.has('test')&&params.has('reset'))resetState();
    const campDemoMode=window.BADGER_ENTRY_MODE==='camp-randall'||params.get('demo')==='camp-randall';
    if(campDemoMode){
      const state=loadState();
      if(!state.party.length){state.party=[makeMon('buckshot',6)];state.active=0;}
      state.area='camp_randall';
      state.pos=null;
      state.message='';
      state.mapReturnStack=[];
      state.flags={
        ...state.flags,
        introDone:true,
        coachIntro:true,
        personaChosen:true,
        openingBattleReady:false,
        openingBattleComplete:true,
        openingBattleWon:true,
        openingRecoveryDone:true,
        assignment:true
      };
      const position=params.has('x')&&params.has('y')
        ?{x:Number(params.get('x')),y:Number(params.get('y'))}
        :{x:23,y:29};
      this.scene.start('OverworldScene',{
        state,
        mapId:'camp_randall',
        position,
        facing:params.get('facing')||'up',
        demoMode:true,
        gridDebug:params.has('debug-grid')
      });
      return;
    }
    if(params.has('test')&&params.get('scene')==='starter'){
      const state=defaultState();state.flags.introDone=true;state.area='wrestling_room';state.pos={x:7,y:7};saveState(state);
      this.scene.start('StarterScene',{story:true,returnArea:'wrestling_room',returnPos:{x:7,y:7}});
      return;
    }
    if(params.has('test')&&params.get('scene')==='recovery'){
      const state=chooseStarter(params.get('starter')||'buckshot',{story:true,rivalId:'fieldflyer',area:'wrestling_room',pos:{x:7,y:7}});
      state.flags.openingBattleReady=false;state.flags.openingBattleComplete=true;state.flags.openingBattleWon=true;state.opening.battleResult='win';saveState(state);
      this.scene.start('OpeningRecoveryScene');
      return;
    }
    if(params.has('test')&&params.get('scene')==='scout'){
      this.scene.start('ScoutScene',{
        id:params.get('id')||'buckshot',
        lvl:Number(params.get('lvl')||5),
        area:params.get('area')||'r1'
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
      const allowed=Object.keys(SEASON_ONE_PROJECT.maps);
      const state=chooseStarter(params.get('starter')||'buckshot');
      const area=allowed.includes(params.get('area'))?params.get('area'):'camp_randall';
      state.area=area;
      state.pos=params.has('x')&&params.has('y')?{x:Number(params.get('x')),y:Number(params.get('y'))}:null;
      if(['up','down','left','right'].includes(params.get('facing')))state.facing=params.get('facing');
      state.message='';
      saveState(state);
      this.scene.start('OverworldScene');
      return;
    }
    this.scene.start('TitleScene');
  }
}
