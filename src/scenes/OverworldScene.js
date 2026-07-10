import {AREAS,areaFor,areaDimensions,defaultPos,isBlocked,isGrass,spotKind,signText,TRAINERS,TOURNAMENT,trainersInArea,trainerAt,trainerSeesTile,canUseExit,gateMessage} from '../data/maps.js';
import {ROSTER,scaledStats} from '../data/roster.js';
import {loadState,saveState,caughtRecruitCount} from '../systems/save.js';
import {uiBox,setVirtualHandler} from '../systems/ui.js';
import {unlockAudio,sfx,playMusic,setMuted} from '../systems/audio.js';
import {GAME_W,GAME_H,OVERWORLD_ZOOM} from '../systems/resolution.js';
import {LAYERED_MAP_VERSION,layeredNpcs,layeredUpperDecor} from '../data/layeredMaps.js';
const Phaser = window.Phaser;
const DIRS={down:{dx:0,dy:1,frame:1},left:{dx:-1,dy:0,frame:4},right:{dx:1,dy:0,frame:7},up:{dx:0,dy:-1,frame:10}};
// Collision is controlled by src/data/maps.js so it matches visible map art.
const SOLIDS={};
export class OverworldScene extends Phaser.Scene{
 constructor(){super('OverworldScene');}
 create(){this.state=loadState();this.area=this.state.area||'fieldhouse';this.tilePos=this.state.pos||defaultPos(this.area);if(isBlocked(this.area,this.tilePos.x,this.tilePos.y))this.tilePos=defaultPos(this.area);this.facing='down';this.message=this.state.message||'';this.messageOpen=!!this.message;this.moving=false;this.sightLocked=false;this.lastInputAt=0;this.stepClock=0;this.npcList=[];this.sfxReady=false;
  this.worldLayer=this.add.layer().setDepth(0);this.uiLayer=this.add.layer().setDepth(1000);
  this.worldCamera=this.cameras.main.setName('world').setBackgroundColor('#000').setZoom(OVERWORLD_ZOOM);this.worldCamera.roundPixels=true;
  this.uiCamera=this.cameras.add(0,0,GAME_W,GAME_H,false,'ui').setBackgroundColor('rgba(0,0,0,0)').setZoom(1);this.uiCamera.roundPixels=true;
  this.worldCamera.ignore(this.uiLayer);this.uiCamera.ignore(this.worldLayer);
  this.bg=this.addWorld(this.add.image(0,0,areaFor(this.area).bg).setOrigin(0).setDepth(0));/* keep raw pixel colors; no tint pipeline on mobile */
  this.decor=this.addWorld(this.add.container(0,0).setDepth(13));this.actors=[];this.upperObjects=[];this.layeredMapVersion=LAYERED_MAP_VERSION;
  this.shadow=this.addWorld(this.add.ellipse(this.worldX(this.tilePos.x),this.worldY(this.tilePos.y)-2,17,6,0x000000,.34).setDepth(20));
  this.player=this.addWorld(this.add.sprite(this.worldX(this.tilePos.x),this.worldY(this.tilePos.y),'player',DIRS.down.frame).setDepth(40).setOrigin(.5,1));this.player.setScale(1);
  this.marker=this.addWorld(this.add.text(0,0,'▼',{fontFamily:'monospace',fontSize:9,color:'#ffe28a',stroke:'#111',strokeThickness:2}).setOrigin(.5).setDepth(80));
  this.worldCamera.startFollow(this.player,true,1,1);this.applyAreaBounds();this.worldCamera.setDeadzone(0,0);
  this.cursors=this.input.keyboard.createCursorKeys();this.keys=this.input.keyboard.addKeys('W,A,S,D,ENTER,SPACE,M');this.input.keyboard.on('keydown-ENTER',()=>this.interact());this.input.keyboard.on('keydown-SPACE',()=>this.interact());this.input.keyboard.on('keydown-M',()=>this.openMenu());setVirtualHandler(this);
  this.hud=this.addUi(this.add.container(0,0).setScrollFactor(0).setDepth(1000));this.drawDepthDecor();this.drawLayeredUpperDecor();this.drawActors();this.drawHud();this.showAreaToast(areaFor(this.area).name);this.fadeSceneIn(140);setMuted(this.state.audioMuted);playMusic('overworld');}
 addWorld(obj){this.worldLayer.add(obj);return obj;}
 addUi(obj){this.uiLayer.add(obj);return obj;}
 fadeSceneOut(duration){this.worldCamera.fadeOut(duration,0,0,0);this.uiCamera.fadeOut(duration,0,0,0);}
 fadeSceneIn(duration){this.worldCamera.fadeIn(duration,0,0,0);this.uiCamera.fadeIn(duration,0,0,0);}
 okInput(){const now=this.time.now||performance.now();if(now-this.lastInputAt<95)return false;this.lastInputAt=now;return true;}
 handleVirtualButton(k){this.unlockSfx();if(!this.okInput())return;if(k==='up')this.tryMove(0,-1,'up');if(k==='down')this.tryMove(0,1,'down');if(k==='left')this.tryMove(-1,0,'left');if(k==='right')this.tryMove(1,0,'right');if(k==='a')this.interact();if(k==='b'&&this.messageOpen)this.clearMessage();if(k==='menu')this.openMenu();if(k==='save')this.savePos('Saved.');}
 update(){this.updateDepths();this.updateMarker();this.updateNpcPatrols();if(this.moving)return;const c=this.cursors,k=this.keys;
  if(this.messageOpen){if([c.left,c.right,c.up,c.down].some(x=>Phaser.Input.Keyboard.JustDown(x)))this.clearMessage();return;}
  // Held keys walk continuously (FireRed): each completed tile re-triggers the next step.
  if(c.left.isDown||k.A.isDown)this.tryMove(-1,0,'left');
  else if(c.right.isDown||k.D.isDown)this.tryMove(1,0,'right');
  else if(c.up.isDown||k.W.isDown)this.tryMove(0,-1,'up');
  else if(c.down.isDown||k.S.isDown)this.tryMove(0,1,'down');}
 worldX(x){return x*16+8;} worldY(y){return y*16+22;}
 applyAreaBounds(){const {width,height}=areaDimensions(this.area);this.worldCamera.setBounds(0,0,width*16,height*16);}
 face(dir){this.facing=dir;this.player.stop();this.player.setFlipX(false);this.player.clearTint();this.player.setFrame(DIRS[dir]?.frame||1);}
 openMenu(){if(this.messageOpen){this.clearMessage();return;}this.playSfx('open');this.scene.launch('MenuScene',{parent:this});}
 unlockSfx(){unlockAudio();}
 playSfx(kind){if(sfx[kind])sfx[kind]();}
 pass(x,y){if(isBlocked(this.area,x,y))return false;if(this.npcList.some(e=>e.npc.tile&&e.npc.tile.x===x&&e.npc.tile.y===y))return false; // NPCs are solid, FireRed-style
  const blocks=SOLIDS[this.area]||[];return !blocks.some(([x1,y1,x2,y2])=>x>=x1&&x<=x2&&y>=y1&&y<=y2);}
 tryMove(dx,dy,dir){if(this.messageOpen){this.clearMessage();return;}
  if(this.moving||this.sightLocked)return; // one step is atomic; ambush/transition beats own the player
  if(this.facing!==dir&&!this.moving){this.face(dir);this.turnPauseUntil=(this.time.now||0)+120;return;} // tap turns in place; holding walks after a short beat (FireRed: ~8 frames)
  if((this.time.now||0)<(this.turnPauseUntil||0))return;
  this.face(dir);let nx=this.tilePos.x+dx,ny=this.tilePos.y+dy;const edge=this.findExit(nx,ny);if(edge){if(!canUseExit(this.state,edge)){this.showMessage(gateMessage(edge));return;}return this.changeArea(edge);}if(!this.pass(nx,ny)){this.playSfx('bump');return;}this.tilePos={x:nx,y:ny};this.moving=true;this.player.play('walk-'+dir,true);this.playSfx('step');this.tweens.add({targets:this.shadow,x:this.worldX(nx),y:this.worldY(ny)-2,duration:240,ease:'Linear'});this.tweens.add({targets:this.player,x:this.worldX(nx),y:this.worldY(ny),duration:240,ease:'Linear',onComplete:()=>{this.moving=false;this.face(dir);this.afterStep();}});}
 findExit(x,y){return (areaFor(this.area).exits||[]).find(e=>e.x===x&&e.y===y);}
 changeArea(e){this.playSfx('door');this.area=e.to;this.tilePos={x:e.tx,y:e.ty};this.state.area=this.area;this.state.pos={...this.tilePos};saveState(this.state);this.fadeSceneOut(130);this.time.delayedCall(135,()=>{this.bg.setTexture(areaFor(this.area).bg);this.applyAreaBounds();this.player.setPosition(this.worldX(this.tilePos.x),this.worldY(this.tilePos.y));this.shadow.setPosition(this.worldX(this.tilePos.x),this.worldY(this.tilePos.y)-2);this.drawDepthDecor();this.drawLayeredUpperDecor();this.drawActors();this.drawHud();this.fadeSceneIn(180);this.showAreaToast(areaFor(this.area).name);if(e.msg)this.showMessage(e.msg);});}
 afterStep(){this.savePos();if(isGrass(this.area,this.tilePos.x,this.tilePos.y))this.grassRustle();this.checkTrainerSight();if(this.sightLocked)return;if(isGrass(this.area,this.tilePos.x,this.tilePos.y)&&Math.random()<.12){this.startScout();return;}this.drawHud();}
 grassRustle(){const wx=this.worldX(this.tilePos.x),wy=this.worldY(this.tilePos.y);for(let i=0;i<5;i++){const f=this.addWorld(this.add.rectangle(wx-6+Math.random()*12,wy-3,2,3,i%2?0xeee6d5:0xcfc4ae,1).setDepth(this.player.depth+1));this.tweens.add({targets:f,y:wy-12-Math.random()*7,x:f.x+(Math.random()*10-5),alpha:0,angle:Math.random()*180,duration:260+Math.random()*120,ease:'Quad.Out',onComplete:()=>f.destroy()});}} // chalk puff off the open mat
 checkTrainerSight(){
   if(this.sightLocked||this.messageOpen)return;
   for(const tr of trainersInArea(this.area)){
     if(this.state.trainersDefeated?.[tr.id])continue;
     if(!trainerSeesTile(tr,this.tilePos.x,this.tilePos.y))continue;
     let blocked=false;
     const {x:tx,y:ty}=tr.pos;
     if(tr.facing==='left')for(let x=tx-1;x>this.tilePos.x;x--)if(!this.pass(x,ty)){blocked=true;break;}
     if(tr.facing==='right')for(let x=tx+1;x<this.tilePos.x;x++)if(!this.pass(x,ty)){blocked=true;break;}
     if(tr.facing==='up')for(let y=ty-1;y>this.tilePos.y;y--)if(!this.pass(tx,y)){blocked=true;break;}
     if(tr.facing==='down')for(let y=ty+1;y<this.tilePos.y;y++)if(!this.pass(tx,y)){blocked=true;break;}
     if(blocked)continue;
     this.triggerSpot(tr);
     return;
   }
 }
 triggerSpot(tr){
   // FireRed spot sequence: "!" beat, then the trainer WALKS to the player
   // tile by tile, the player turns to face them, THEN the challenge lands.
   this.sightLocked=true;this.moving=true;
   const wx=this.worldX(tr.pos.x),wy=this.worldY(tr.pos.y);
   const bang=this.addWorld(this.add.text(wx,wy-30,'!',{fontFamily:'monospace',fontSize:14,color:'#ffe28a',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5).setDepth(90));
   this.tweens.add({targets:bang,y:wy-40,duration:260,yoyo:true,repeat:1});
   this.playSfx('bump');
   const v={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[tr.facing]||[0,1];
   const opp={left:'right',right:'left',up:'down',down:'up'}[tr.facing]||'down';
   const entry=this.npcList.find(e=>e.npc.tile&&e.npc.tile.x===tr.pos.x&&e.npc.tile.y===tr.pos.y);
   const target={x:this.tilePos.x-v[0],y:this.tilePos.y-v[1]};
   const n=entry?Math.abs(target.x-tr.pos.x)+Math.abs(target.y-tr.pos.y):0;
   this.time.delayedCall(560,()=>{
     bang.destroy();
     this.face(opp);
     if(entry&&n>0){
       entry.npc.setFrame(DIRS[tr.facing]?.frame||1);
       for(let i=1;i<=n;i++){
         const step={x:tr.pos.x+v[0]*i,y:tr.pos.y+v[1]*i};
         this.time.delayedCall((i-1)*240,()=>{
           entry.npc.tile={...step};
           this.tweens.add({targets:entry.npc,x:this.worldX(step.x),y:this.worldY(step.y),duration:235,ease:'Linear'});
           this.tweens.add({targets:entry.sh,x:this.worldX(step.x),y:this.worldY(step.y)-2,duration:235,ease:'Linear'});
         });
       }
     }
     this.time.delayedCall(n*240+140,()=>{
       this.sightLocked=false;this.moving=false;
       this.startTrainerBattle(tr,tr.spot||tr.line);
     });
   });
 }
 frontTile(){const d=DIRS[this.facing]||DIRS.down;return {x:this.tilePos.x+d.dx,y:this.tilePos.y+d.dy};}
 trainerNearby(){const f=this.frontTile();return trainerAt(this.area,f.x,f.y)||trainerAt(this.area,this.tilePos.x,this.tilePos.y);}
 kindHere(){const f=this.frontTile();const front=spotKind(this.area,f.x,f.y);const here=spotKind(this.area,this.tilePos.x,this.tilePos.y);return front!=='.'?front:here;}
 faceNpcAtFront(){const f=this.frontTile();const entry=this.npcList.find(e=>e.npc.tile&&e.npc.tile.x===f.x&&e.npc.tile.y===f.y);if(!entry)return;const opp={up:'down',down:'up',left:'right',right:'left'}[this.facing]||'down';entry.npc.setFrame(DIRS[opp]?.frame||1);}
 interact(){this.unlockSfx();if(this.messageOpen){this.clearMessage();return;}const kind=this.kindHere();this.faceNpcAtFront();this.time.delayedCall(60,()=>{});this.playSfx('talk');if(kind==='R')return this.recover();if(kind==='S')return this.scene.launch('MenuScene',{parent:this,tab:'shop'});if(kind==='C')return this.startGymBattle(areaFor(this.area).captain);if(kind==='TOURNEY')return this.tournamentDesk();if(kind==='g')return this.startScout();if(kind==='M')return this.startBattle('drillpartner',5,'spar');if(kind==='N')return this.coachObjective();if(kind==='STATUE')return this.showMessage(this.statueLore());if(kind==='SCOUT_NPC')return this.showMessage('Scout: An open mat gives a scout report first. Step deeper to battle or recruit if your GR is high enough.');if(kind==='TRAINER'){const tr=this.trainerNearby();if(tr)return this.startTrainerBattle(tr);}if(kind==='SAVE_NPC')return this.showMessage('Student Manager: Use START for the menu or SAVE for quick save. Continue keeps your roster and location.');if(kind==='BATTLE_NPC')return this.showMessage('Wrestler: Sparring is inside on the mat. Open-mat scouts can become recruit battles.');if(kind==='STUDY_NPC')return this.showMessage('Tutor: Film Study raises recruit odds later. Check bags and benches for supplies.');if(kind==='HIDDEN_TAPE')return this.hiddenItem('quadTape','tape','Found Athletic Tape hidden near the benches.');if(kind==='HIDDEN_FILM')return this.hiddenItem('studyFilm','film','Found Film Study notes on the desk.');if(kind==='HIDDEN_DRINK')return this.hiddenItem('quadDrink','energy','Found a Sports Drink under the bench.');if(kind==='HIDDEN_SHORE')return this.hiddenItem('pierDrink','energy','Found a Sports Drink left on the pier planks.');if(kind==='HIDDEN_EMBER')return this.hiddenItem('emberInvite','invite','Found a Team Invite tucked under a fire-circle stone.');if(kind==='TROPHY')return this.showMessage(this.trophyLore());if(kind==='DOOR')return this.showMessage('Memorial Library entrance. Step forward to enter.');if(kind==='NATIONALS')return this.showMessage('NATIONALS ACCESS - Season Two. Qualification door locked. The next campaign starts beyond it.');if(kind==='CAPITOL')return this.showMessage('The Capitol dome rises where State Street meets the Square. Every championship run in this state ends with a march up this street.');if(kind==='SIGN'){const f=this.frontTile();return this.showMessage(signText(this.area,f.x,f.y)||signText(this.area,this.tilePos.x,this.tilePos.y)||'A weathered sign.');}if(kind==='WEIGHT_ROOM')return this.scene.launch('MenuScene',{parent:this,tab:'practice'});if(kind==='LOCKER_ROOM')return this.showMessage('Locker Room: Your team resets and gets ready between sessions.');if(kind==='EQUIP_ROOM')return this.showMessage('Equipment Room: Tape, drinks, and invites support recruiting trips.');if(kind==='COACH_OFFICE')return this.showMessage('Coach Office: Review objectives, recruit with purpose, and return after your first win.');if(kind==='RECEPTION')return this.showMessage('Reception: Visitors sign in here before walking the room.');if(kind==='MEETING_ROOM')return this.showMessage('Team Room: Film study raises recruiting confidence.');this.showMessage(this.promptFor(kind)||'Nothing unusual here.');}
 trophyLore(){
   // The trophy case is why the first room matters late (city-manifesto
   // rule 18): it holds a visible empty space until you fill it.
   if(this.state.tournament?.champion)return 'The case has been rearranged. Front and center, a new banner: BIG TEN CHAMPION. Yours. The empty space was waiting the whole time.';
   const n=(this.state.badges||[]).length;
   if(n>=3)return 'Decades of Badger wrestling: banners, plaques, a cracked headgear from the 1970 team. The empty space at the center of the case seems to be waiting for something.';
   return 'Decades of Badger wrestling: conference banners, All-American plaques, team photos going back a century. One space at the center of the case sits empty.';
 }
 statueLore(){
   const n=(this.state.badges||[]).length;
   // Abe on Bascom Hill, per the World Map Manifesto - his lore deepens per badge.
   if(n>=4)return 'Abe watches the sunrise over Mendota. \'Big Ten champion,\' the plaque now reads. \'The spirit inside came all the way out.\'';
   if(n>=3)return 'Abe Lincoln\'s statue faces east, toward State Street and the Kohl Center marquee. One badge from the bracket. He seems to know.';
   if(n>=2)return 'They say Abe stands when a Badger wins a title. He has not stood yet. The lake path west made you stronger - the city east is waiting.';
   if(n>=1)return 'Abe Lincoln\'s statue, Bascom Hill. Legend: rub his foot, wrestle your spirit form true. The first badge is a start. The lake is west; the title is east.';
   return 'Abe Lincoln\'s statue crowns Bascom Hill. In this conference, wrestlers take the mat in their spirit form - the animal inside comes out under the lights.';
 }
 recover(){this.state.party.forEach(m=>{const s=scaledStats(m.id,m.lvl);m.hp=s.hp;m.gas=s.gas;m.score=0;});this.savePos('The recovery table restores your team.');}
 startScout(){const byArea={lakeshore:['lakechain','drillpartner','pacesetter','whizzkid'],river:['fieldflyer','tilttech','pacesetter','riverroller','funklord'],campus:['buckshot','matreturner','fieldflyer','drillpartner','pacecommand']};const ids=byArea[this.area]||['buckshot','matreturner','fieldflyer','pacesetter','drillpartner','lakechain','tilttech'];const range=areaFor(this.area).wildLevels||[3,6];const id=Phaser.Utils.Array.GetRandom(ids),lvl=Phaser.Math.Between(range[0],range[1]);this.state.dex.seen[id]=true;this.state.stats.scouts=(this.state.stats.scouts||0)+1;this.savePos();this.fadeSceneOut(100);this.time.delayedCall(105,()=>this.scene.start('ScoutScene',{id,lvl,area:this.area}));}
 battleTransition(cb){this.sightLocked=true;const cam=this.worldCamera;this.playSfx('bump');cam.flash(110,255,255,255);this.time.delayedCall(180,()=>cam.flash(110,255,255,255));this.time.delayedCall(380,()=>this.fadeSceneOut(240));this.time.delayedCall(640,cb);} // FireRed battle entry: double flash, then wipe to black
 startBattle(id,lvl,type){this.savePos();this.battleTransition(()=>this.scene.start('BattleScene',{enemyId:id,enemyLevel:lvl,battleType:type}));}
 tournamentDesk(){
   const t=this.state.tournament||{round:0,champion:false};
   const missing=TOURNAMENT.requires.filter(b=>!this.state.badges.includes(b));
   if(missing.length)return this.showMessage(`Official: The Big Ten Championship takes conference champions only. Still needed: ${missing.join(' + ')}.`);
   if(t.champion)return this.showMessage('Official: Big Ten Champion! Your banner hangs in this hall. The bracket will be waiting for your title defense next season.');
   const round=TOURNAMENT.rounds[t.round];
   if(!round)return this.showMessage('Official: The bracket is being reseeded. Come back soon.');
   this.state.party.forEach(m=>{const st=scaledStats(m.id,m.lvl);m.hp=st.hp;m.gas=st.gas;m.score=0;}); // trainers get treated between tournament matches
   this.showMessage(`${round.label}: ${round.intro}`);
   this.savePos();
   this.time.delayedCall(700,()=>this.battleTransition(()=>this.scene.start('BattleScene',{team:round.team,battleType:'tournament',trainerName:round.trainerName,reward:round.reward,tournamentRound:t.round,roundLabel:round.label,winMsg:round.win})));
 }
 startGymBattle(cap){if(!cap)return;if(this.state.badges.includes(cap.badge)){this.showMessage(cap.beaten||'Badge already earned.');return;}this.showMessage(cap.intro||'A gym leader challenges you.');this.savePos();this.time.delayedCall(650,()=>this.battleTransition(()=>this.scene.start('BattleScene',{team:cap.team,battleType:'gym',trainerName:ROSTER[cap.id]?.name,badge:cap.badge,reward:cap.reward})));}
 startTrainerBattle(tr,msg){if(!tr)return;if(this.state.trainersDefeated?.[tr.id]){this.showMessage(tr.beaten||`${tr.name} has already been beaten.`);return;}this.showMessage(msg||tr.line||`${tr.name} challenges you.`);this.savePos();this.time.delayedCall(550,()=>this.battleTransition(()=>this.scene.start('BattleScene',{team:tr.team,battleType:'trainer',trainerName:tr.name,reward:tr.reward,defeatKey:tr.id})));}
 savePos(msg=null){this.state.area=this.area;this.state.pos={...this.tilePos};if(msg)this.state.message=msg;saveState(this.state);if(msg)this.showMessage(msg);}
 showMessage(msg){this.message=msg;this.messageOpen=!!msg;this.drawHud();}
 clearMessage(){this.message='';this.messageOpen=false;this.state.message='';saveState(this.state);this.drawHud();}
 objective(){const caught=caughtRecruitCount(this.state);const wins=this.state.stats?.wins||0;if(!this.state.party.length)return 'Choose a starter.';if(!this.state.flags?.coachIntro)return 'Meet Coach.';if(this.state.objective?.id==='scout_quad')return 'Scout Bascom Hill.';if(caught<2)return 'Recruit one more wrestler.';if(!this.state.flags.wonSpar)return 'Win first spar.';if(!this.state.badges.includes('W Badge'))return 'Return to Coach.';return 'Opening complete.';}
coachObjective(){this.state.flags.coachIntro=true;const caught=caughtRecruitCount(this.state);if(caught>=2&&this.state.flags.wonSpar&&!this.state.badges.includes('W Badge')){this.state.badges.push('W Badge');this.state.flags.firstBadge=true;this.state.objective={id:'opening_complete',stage:6,complete:true,log:['Receive Wrestling Badge #1','Return to Coach','Win your first sparring match','Recruit your first wrestler','Scout Bascom Hill','Meet the Head Coach']};saveState(this.state);this.showObjectivePopup('BADGE OBTAINED','Wrestling Badge #1 earned. Opening loop complete.');return this.showMessage('Coach: You scouted, recruited, and won. That is how this room grows. Take Wrestling Badge #1.');}if(!this.state.flags.assignment){this.state.flags.assignment=true;this.state.objective={id:'scout_quad',stage:2,complete:false,log:['Scout Bascom Hill','Receive your first assignment','Meet the Head Coach']};saveState(this.state);this.showObjectivePopup('NEW OBJECTIVE','Scout Bascom Hill and recruit one wrestler.');return this.showMessage('Coach: Go up Bascom Hill. Step onto the open mats, study the scout report, then recruit one wrestler for the room.');}if(caught<2)return this.showMessage('Coach: Keep scouting Bascom Hill until you recruit one more wrestler.');if(!this.state.flags.wonSpar){this.state.objective={id:'win_spar',stage:4,complete:false,log:['Win your first sparring match','Recruit your first wrestler','Scout Bascom Hill','Meet the Head Coach']};saveState(this.state);return this.showMessage('Coach: Good recruit. Now win a sparring match on the Field House mat.');}return this.showMessage('Coach: Return after the sparring win and I will mark your first badge.');}
rivalIntro(){if(!this.state.flags.rivalIntro){this.state.flags.rivalIntro=true;saveState(this.state);this.showObjectivePopup('RIVAL','A future dual meet is waiting.');}return this.showMessage('Rival: Build your lineup. When you have depth, I want a dual meet.');}
 hiddenItem(flag,item,msg){this.state.flags.hiddenItems=this.state.flags.hiddenItems||{};if(this.state.flags.hiddenItems[flag])return this.showMessage('Nothing else here.');this.state.flags.hiddenItems[flag]=true;this.state.items[item]=(this.state.items[item]||0)+1;saveState(this.state);this.showObjectivePopup('ITEM FOUND',msg);return this.showMessage(msg);}
showObjectivePopup(title,body){const c=this.addUi(this.add.container(0,0).setScrollFactor(0).setDepth(1060));const g=this.add.graphics().setScrollFactor(0);g.fillStyle(0x000000,.35);g.fillRoundedRect(45,47,236,48,4);g.fillStyle(0xfff6dc,1);g.fillRoundedRect(42,44,236,48,4);g.lineStyle(2,0x111111,1);g.strokeRoundedRect(42,44,236,48,4);g.lineStyle(1,0xb41820,1);g.strokeRoundedRect(46,48,228,40,2);g.lineStyle(1,0xd6a336,.65);g.lineBetween(51,87,269,87);const t=this.add.text(160,51,title,{fontFamily:'monospace',fontSize:10,color:'#b41820',fontStyle:'bold'}).setOrigin(.5).setScrollFactor(0);const b=this.add.text(160,68,body,{fontFamily:'monospace',fontSize:8,color:'#111',align:'center',wordWrap:{width:210}}).setOrigin(.5).setScrollFactor(0);c.add([g,t,b]);this.tweens.add({targets:c,y:-8,alpha:0,delay:1250,duration:480,onComplete:()=>c.destroy(true)});}
 promptFor(ch){if(ch==='R')return 'A RECOVER';if(ch==='S')return 'A SHOP';if(ch==='C')return 'A BATTLE';if(ch==='g')return 'A SCOUT';if(ch==='M')return 'A SPAR';if(ch==='N')return 'A TALK';if(ch==='STATUE')return 'A READ';if(ch==='SCOUT_NPC')return 'A TALK';if(ch==='TRAINER'){const tr=this.trainerNearby();return this.state.trainersDefeated?.[tr?.id]?'A TALK':'A BATTLE';}if(ch==='SAVE_NPC')return 'A TALK';if(ch==='BATTLE_NPC')return 'A TALK';if(ch==='STUDY_NPC')return 'A TALK';if(ch==='HIDDEN_TAPE'||ch==='HIDDEN_FILM'||ch==='HIDDEN_DRINK'||ch==='HIDDEN_SHORE'||ch==='HIDDEN_EMBER')return 'A CHECK';if(ch==='TROPHY')return 'A READ';if(ch==='DOOR')return 'A DOOR';if(ch==='NATIONALS')return 'A CHECK';if(ch==='CAPITOL')return 'A READ';if(ch==='SIGN')return 'A READ';if(ch==='TOURNEY')return (this.state.tournament?.champion)?'A TALK':'A ENTER';if(['WEIGHT_ROOM','LOCKER_ROOM','EQUIP_ROOM','COACH_OFFICE','RECEPTION','MEETING_ROOM'].includes(ch))return 'A CHECK';return '';}
 drawDepthDecor(){this.decor.removeAll(true);const add=(obj)=>this.decor.add(obj);if(this.area==='campus'){const {width,height}=areaDimensions(this.area);const g=this.add.graphics().setDepth(8);g.fillStyle(0x000000,.14);g.fillRect(0,0,width*16,8);g.fillRect(0,height*16-8,width*16,8);add(g);return;}if(this.area!=='fieldhouse')return;const light=this.add.graphics().setDepth(8);light.fillStyle(0xffffff,.045);light.fillEllipse(224,104,360,150);light.fillStyle(0x000000,.10);light.fillRect(0,0,448,8);light.fillRect(0,208,448,16);add(light);}
 drawLayeredUpperDecor(){for(const obj of this.upperObjects)obj.destroy();this.upperObjects=[];for(const entry of layeredUpperDecor(this.area)){const obj=this.addWorld(this.add.image(entry.x*16,entry.y*16,entry.texture).setOrigin(0).setDepth(this.worldY(entry.depthY)));obj.setData('fr1Upper',true);this.upperObjects.push(obj);}}
 addActor(obj){this.addWorld(obj);this.actors.push(obj);return obj;}
 addNpc(x,y,frame=1,anim='npc-idle-down',dialogue='Keep working.',route=null,look=null){const sx=this.worldX(x),sy=this.worldY(y);const key=look&&this.textures.exists('npc_'+look)?'npc_'+look:'npc';const sh=this.addActor(this.add.ellipse(sx,sy-2,17,6,0x000000,.28).setDepth(sy-1));const npc=this.addActor(this.add.sprite(sx,sy,key,frame).setOrigin(.5,1).setDepth(sy));npc.setFlipX(false);npc.clearTint();npc.dialogue=dialogue;npc.home={x,y};npc.tile={x,y};this.npcList.push({npc,sh,t:0,route,i:0});return npc;}
 drawActors(){for(const obj of this.actors)obj.destroy();this.actors=[];this.npcList=[];const a=areaFor(this.area);const cap=a.captain;if(cap){this.addNpc(cap.x,cap.y,1,'npc-idle-down','Captain: Prove it on the mat.',null,'gold');}for(const tr of trainersInArea(this.area)){this.addNpc(tr.pos.x,tr.pos.y,DIRS[tr.facing]?.frame||1,'npc-idle-'+(tr.facing||'down'),tr.line||'Ready to wrestle.',null,tr.look||null);}for(const npc of layeredNpcs(this.area)){this.addNpc(npc.x,npc.y,npc.frame,npc.anim,npc.dialogue,npc.route||null,npc.look||null);}if(this.area==='championship'){this.addNpc(TOURNAMENT.desk.x,TOURNAMENT.desk.y,7,'npc-idle-right','Official: The Big Ten Championship desk.',null,'gray');}if(this.area==='studyhall'){this.addNpc(9,8,7,'npc-idle-right','Tutor: Film study helps recruiting.',null,'purple');this.addNpc(14,7,4,'npc-idle-left','Student: The Hill has three recruit styles right now.',null,'green');}
}
 
 updateNpcPatrols(){if(this.messageOpen||this.moving)return;const now=this.time.now||0;for(const e of this.npcList){if(!e.route||e.route.length<2)continue;if(now-e.t<1600)continue;e.t=now+Phaser.Math.Between(250,900);const ni=(e.i+1)%e.route.length;const [tx,ty]=e.route[ni];if(isBlocked(this.area,tx,ty)||(this.tilePos.x===tx&&this.tilePos.y===ty)||this.npcList.some(o=>o!==e&&o.npc.tile&&o.npc.tile.x===tx&&o.npc.tile.y===ty))continue; // patrols never enter walls, the player's tile, or another NPC
  e.i=ni;const x=this.worldX(tx),y=this.worldY(ty);const dx=tx-(e.npc.tile?.x??tx),dy=ty-(e.npc.tile?.y??ty);e.npc.tile={x:tx,y:ty};const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');e.npc.setFrame(DIRS[dir]?.frame||1);this.tweens.add({targets:e.npc,x,y,duration:260+Phaser.Math.Between(0,40),ease:'Linear'});this.tweens.add({targets:e.sh,x,y:y-2,duration:260,ease:'Linear'});}}

 updateDepths(){const py=this.player.y;this.player.setDepth(py);this.shadow.setDepth(py-1);for(const entry of this.npcList){entry.npc.setDepth(entry.npc.y);entry.sh.setDepth(entry.npc.y-1);}}
 updateMarker(){const kind=this.kindHere();this.marker.setVisible(['EXIT','R','S','C','g','M','N','STATUE','SCOUT_NPC','TRAINER','TOURNEY','SAVE_NPC','BATTLE_NPC','STUDY_NPC','HIDDEN_TAPE','HIDDEN_FILM','HIDDEN_DRINK','HIDDEN_SHORE','HIDDEN_EMBER','TROPHY','DOOR','NATIONALS','CAPITOL','SIGN','WEIGHT_ROOM','LOCKER_ROOM','EQUIP_ROOM','COACH_OFFICE','RECEPTION','MEETING_ROOM'].includes(kind)&&!this.messageOpen);if(this.marker.visible){this.marker.setPosition(this.player.x,this.player.y-35+Math.sin((this.time.now||0)/180)*1.2);this.marker.setAlpha(.86+Math.sin((this.time.now||0)/160)*.12);}}

 showAreaToast(name){
  if(this.areaToast){this.areaToast.destroy(true);}
  this.areaToast=this.addUi(this.add.container(0,0).setScrollFactor(0).setDepth(1040));
  const g=this.add.graphics().setScrollFactor(0);
  g.fillStyle(0x000000,.28);g.fillRoundedRect(97,9,132,24,3);
  g.fillStyle(0x141217,.94);g.fillRoundedRect(94,6,132,24,3);
  g.lineStyle(1,0xf0d784,1);g.strokeRoundedRect(94,6,132,24,3);
  g.lineStyle(1,0x7b1d2a,1);g.strokeRoundedRect(97,9,126,18,2);
  const t=this.add.text(160,11,name,{fontFamily:'monospace',fontSize:9,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5).setScrollFactor(0);
  this.areaToast.add([g,t]);
  this.tweens.add({targets:this.areaToast,alpha:0,delay:1050,duration:420,onComplete:()=>{this.areaToast?.destroy(true);this.areaToast=null;}});
 }
 drawHud(){
  this.hud.removeAll(true);
  this.updateMarker();
  if(this.messageOpen&&this.message){
    const box=uiBox(this,5,150,310,68).setScrollFactor(0);
    this.hud.add(box);
    this.hud.add(this.add.text(14,158,this.message,{fontFamily:'monospace',fontSize:10,color:'#111',fontStyle:'bold',lineSpacing:2,wordWrap:{width:286}}).setScrollFactor(0));
    this.hud.add(this.add.text(291,203,'A',{fontFamily:'monospace',fontSize:10,color:'#6c624d',fontStyle:'bold'}).setScrollFactor(0));
  }else{
    const kind=this.kindHere();
    const prompt=this.promptFor(kind);
    if(prompt){
      const pg=this.add.graphics().setScrollFactor(0);
      const width=Math.max(68,prompt.length*6+18);
      const x=316-width;
      pg.fillStyle(0x000000,.24);pg.fillRoundedRect(x+2,6,width,20,2);
      pg.fillStyle(0x151318,.9);pg.fillRoundedRect(x,4,width,20,2);
      pg.lineStyle(1,0xd6a336,.9);pg.strokeRoundedRect(x,4,width,20,2);
      this.hud.add(pg);
      this.hud.add(this.add.text(x+width-7,8,prompt,{fontFamily:'monospace',fontSize:8,color:'#ffe28a',fontStyle:'bold'}).setOrigin(1,0).setScrollFactor(0));
    }
  }
 }
}
