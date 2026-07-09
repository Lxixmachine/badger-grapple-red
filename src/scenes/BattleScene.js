import {ROSTER,makeMon,scaledStats,addXp} from '../data/roster.js';import {MOVES,ADV} from '../data/moves.js';import {loadState,saveState,lead} from '../systems/save.js';import {uiBox,hpBar,setVirtualHandler} from '../systems/ui.js';import {unlockAudio,sfx,playMusic,stopMusic,setMuted} from '../systems/audio.js';import {GAME_W,GAME_H} from '../systems/resolution.js';
const Phaser = window.Phaser;
const COMMANDS=['FIGHT','BAG','WRESTLER','RUN'];
const CATCH_BASE={Common:.62,Uncommon:.46,Rare:.32,Elite:0};
const BAG_ITEMS=[
  {key:'energy',name:'SPORTS DRINK',desc:'Restores 24 EP.',use(scene,l){const max=scaledStats(l.id,l.lvl).gas;if(l.gas>=max)return 'EP is already full.';l.gas=Phaser.Math.Clamp(l.gas+24,0,max);scene.state.items.energy--;return `${ROSTER[l.id].name} recovered EP.`;}},
  {key:'tape',name:'ATHLETIC TAPE',desc:'Restores 20 HP.',use(scene,l){const max=scaledStats(l.id,l.lvl).hp;if(l.hp>=max)return 'HP is already full.';l.hp=Phaser.Math.Clamp(l.hp+20,0,max);scene.state.items.tape--;return `${ROSTER[l.id].name} recovered HP.`;}},
  {key:'invite',name:'RECRUIT FLYER',desc:'Try to recruit the wild wrestler. Works better when they are worn down.',use(scene){return scene.tryFlyerCatch();}},
  {key:'film',name:'FILM STUDY',desc:'No battle effect yet.',use(){return 'No battle effect yet.';}}
];
export class BattleScene extends Phaser.Scene{
  constructor(){super('BattleScene');}
  create(data={}){
    this.state=loadState();
    setMuted(this.state.audioMuted);playMusic('battle');unlockAudio();
    this.type=data.battleType||'wild';
    const team=data.team&&data.team.length?data.team:[[data.enemyId||'pacesetter',data.enemyLevel||4]];
    this.enemyTeam=team.map(([id,lvl])=>makeMon(id,lvl));
    this.enemyIdx=0;
    this.trainerName=data.trainerName||null;
    this.reward=data.reward||null;
    this.badge=data.badge||null;
    this.defeatKey=data.defeatKey||null;
    this.tournamentRound=Number.isInteger(data.tournamentRound)?data.tournamentRound:null;
    this.roundLabel=data.roundLabel||null;
    this.winMsg=data.winMsg||null;
    this.beatenMsg=data.beatenMsg||null;
    this.turn=1;this.sel=0;this.mode='command';this.over=false;this.recruit=false;this.forcedSwap=false;this.impact='';this.resultTitle='';this.messageTimer=0;
    this.firstBattleDraw=true;this.transitioning=false;this.prevMeters=null;this.attackAnim=null;this.moveStyle='';this.expGain=0;this.lastChooseAt=0;this.inputLocked=true;
    const openLine=this.type==='wild'?`${ROSTER[this.enemy().id].name} wants to wrestle!`:`${this.trainerName||'Opponent'} sends out ${ROSTER[this.enemy().id].name}!`;
    this.log=[openLine];
    const l=lead(this.state);if(l){const s=scaledStats(l.id,l.lvl);if(!Number.isFinite(l.hp)||l.hp<=0)l.hp=s.hp;if(!Number.isFinite(l.gas)||l.gas<=0)l.gas=s.gas;l.score=0;}this.enemyTeam.forEach(e=>e.score=0);
    this.state.stats={scouts:0,battles:0,wins:0,recruits:0,streak:0,...(this.state.stats||{})};this.state.stats.battles++;saveState(this.state);
    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1,0));this.input.keyboard.on('keydown-RIGHT',()=>this.move(1,0));this.input.keyboard.on('keydown-UP',()=>this.move(0,-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(0,1));
    this.input.keyboard.on('keydown-ENTER',()=>this.choose());this.input.keyboard.on('keydown-SPACE',()=>this.choose());this.input.keyboard.on('keydown-ESC',()=>this.back());
    setVirtualHandler(this);this.drawBattle();this.playBattleIntro();
  }
  enemy(){return this.enemyTeam[this.enemyIdx];}
  handleVirtualButton(k){unlockAudio();if(k==='left')this.move(-1,0);if(k==='right')this.move(1,0);if(k==='up')this.move(0,-1);if(k==='down')this.move(0,1);if(k==='a')this.choose();if(k==='b')this.back();}
  count(){if(this.mode==='fight'){const l=lead(this.state);return (l?.moves||ROSTER[l?.id]?.moves||[]).length||1;}if(this.mode==='party')return Math.max(1,this.state.party.length);if(this.mode==='bag')return BAG_ITEMS.length;return 4;}
  move(dx,dy){if(this.over)return;const old=this.sel;let cols=this.mode==='party'?1:2;let rows=Math.ceil(this.count()/cols);let x=old%cols,y=Math.floor(old/cols);if(dx)x=Phaser.Math.Wrap(x+dx,0,cols);if(dy)y=Phaser.Math.Wrap(y+dy,0,rows);this.sel=Math.min(y*cols+x,this.count()-1);this.impact='';this.drawBattle();}
  choose(){const now=this.time.now||performance.now();if(this.inputLocked)return;if(now-this.lastChooseAt<160)return;this.lastChooseAt=now;if(this.over){if(this.recruit)this.tryRecruit();else this.returnMap();return;}if(this.mode==='command')return this.chooseCommand();if(this.mode==='fight')return this.chooseMove();if(this.mode==='party')return this.chooseParty();if(this.mode==='bag')return this.chooseBag();}
  back(){if(this.inputLocked)return;if(this.over)return this.returnMap();if(this.forcedSwap)return;if(this.mode!=='command'){this.mode='command';this.sel=0;this.drawBattle();return;}this.returnMap();}
  addLog(lines){this.log=[...lines,...this.log].slice(0,5);}
  chooseCommand(){const cmd=COMMANDS[this.sel];if(cmd==='FIGHT'){this.mode='fight';this.sel=0;this.drawBattle();return;}if(cmd==='BAG'){this.mode='bag';this.sel=0;this.drawBattle();return;}if(cmd==='WRESTLER'){this.mode='party';this.sel=this.state.active||0;this.drawBattle();return;}if(cmd==='RUN'){if(this.type==='wild'){this.addLog(['Got away safely.']);this.over=true;this.resultTitle='LEFT';this.recruit=false;stopMusic();this.drawBattle();}else{this.addLog(['You cannot run from this match.']);this.drawBattle();}}}
  chooseMove(){const l=lead(this.state);if(!l)return this.returnMap();const key=(l.moves||ROSTER[l.id]?.moves||[])[this.sel];if(key)this.resolveTurn(key);}
  chooseBag(){
    const l=lead(this.state);if(!l)return this.returnMap();
    const item=BAG_ITEMS[this.sel];if(!item)return;
    const count=this.state.items?.[item.key]||0;
    if(count<=0){this.addLog([`No ${item.name}.`]);this.drawBattle();return;}
    if(item.key==='invite'){
      if(this.type!=='wild'){this.addLog(['Recruiting only works in wild scouting matches.']);this.drawBattle();return;}
      const msg=item.use(this);this.addLog([msg]);this.mode='command';this.sel=0;saveState(this.state);this.drawBattle();return;
    }
    const msg=item.use(this,l);
    this.addLog([msg]);
    this.mode='command';this.sel=0;
    saveState(this.state);this.drawBattle();
  }
  tryFlyerCatch(){
    const e=this.enemy(),r=ROSTER[e.id];
    if((r.rarity==='Elite')){return `${r.name} will not accept a flyer mid-match.`;}
    if(this.state.items.invite<=0)return 'No Recruit Flyers left.';
    this.state.items.invite--;
    const es=scaledStats(e.id,e.lvl);
    const hpFrac=Phaser.Math.Clamp(e.hp/es.hp,0,1);
    const odds=Phaser.Math.Clamp((CATCH_BASE[r.rarity]??.4)*(1.6-hpFrac),.04,.9);
    if(Math.random()<odds){
      const m=makeMon(e.id,e.lvl);m.hp=e.hp;
      this.state.dex.caught[m.id]=true;
      if(this.state.party.length<6)this.state.party.push(m);else this.state.box.push(m);
      this.state.stats.recruits=(this.state.stats.recruits||0)+1;
      this.over=true;this.recruit=false;this.mode='result';this.resultTitle='JOINED';
      this.state.message=`${r.name} joined the room!`;saveState(this.state);
      return `${r.name} accepted the flyer and joined!`;
    }
    this.turn++;
    return `${r.name} shrugged off the flyer.`;
  }
  chooseParty(){
    if(!this.state.party.length)return;
    const picked=this.state.party[this.sel];if(!picked)return;
    if(picked.hp<=0){this.addLog([`${ROSTER[picked.id].name} cannot wrestle right now.`]);this.drawBattle();return;}
    const idx=this.state.party.indexOf(picked);
    if(idx<0)return;
    const wasForced=this.forcedSwap;
    if(idx===0&&!wasForced){this.addLog([`${ROSTER[picked.id].name} is already wrestling.`]);this.mode='command';this.sel=0;this.drawBattle();return;}
    if(idx>0){this.state.party.splice(idx,1);this.state.party.unshift(picked);}
    this.state.active=0;
    saveState(this.state);
    this.addLog([`${ROSTER[picked.id].name} steps onto the mat!`]);
    this.mode='command';this.sel=0;
    if(wasForced){this.forcedSwap=false;this.drawBattle();return;}
    this.enemyOnlyStrike();
  }
  enemyOnlyStrike(){
    const l=lead(this.state),e=this.enemy();
    const beforeL=l.hp,beforeG=l.gas,beforeE=e.hp;
    const ek=Phaser.Utils.Array.GetRandom(ROSTER[e.id]?.moves||['stall']);
    const res=this.resolve(e,l,ek,ROSTER[e.id].name);
    this.moveStyle=MOVES[ek]?.style||'Neutral';
    if(res.hit)this.attackAnim='player';
    this.prevMeters=this.captureMeters(beforeL,beforeG,beforeE);
    this.addLog([res.line,`HP ${beforeL}->${l.hp}`]);
    this.turn++;
    if(l.hp<=0)return this.playerDown();
    saveState(this.state);this.drawBattle();
  }
  resolveTurn(key){
    const l=lead(this.state),e=this.enemy(),beforeE=e.hp,beforeL=l.hp,beforeG=l.gas;
    const first=this.resolve(l,e,key,'You');
    this.prevMeters=this.captureMeters(beforeL,beforeG,beforeE);
    this.moveStyle=MOVES[key]?.style||'Neutral';
    this.impact=first.hit?`-${first.dmg}`:'MISS';this.attackAnim=first.hit?'enemy':'miss';
    const lines=[`T${this.turn}: ${first.line}`];
    if(e.hp<=0){
      lines.push(`${ROSTER[e.id].name} is out.`);this.addLog(lines);
      return this.enemyDown();
    }
    const ek=Phaser.Utils.Array.GetRandom(ROSTER[e.id]?.moves||['stall']);
    const beforeL2=l.hp,beforeG2=l.gas;
    const second=this.resolve(e,l,ek,ROSTER[e.id].name);
    this.moveStyle=MOVES[ek]?.style||this.moveStyle;
    if(second.hit)this.attackAnim='player';
    lines.push(second.line);lines.push(`HP ${beforeL}->${l.hp} / ${beforeE}->${e.hp}`);
    this.addLog(lines);this.turn++;this.mode='command';this.sel=0;
    if(l.hp<=0)return this.playerDown();
    saveState(this.state);this.drawBattle();
  }
  resolve(att,def,key,label){let mv=MOVES[key]||MOVES.stall,as=scaledStats(att.id,att.lvl),ds=scaledStats(def.id,def.lvl);if(mv.gas>0&&att.gas<mv.gas)mv=MOVES.stall;att.gas=Phaser.Math.Clamp(att.gas-Math.max(0,mv.gas),0,as.gas);if(mv.gas<0)att.gas=Phaser.Math.Clamp(att.gas+Math.abs(mv.gas),0,as.gas);let acc=mv.acc;if(att.gas<12)acc-=.12;if(Math.random()>acc){sfx.miss();return {line:`${label} missed ${mv.name}.`,hit:false,dmg:0};}const mult=ADV[mv.style]===ROSTER[def.id]?.style?1.22:ADV[ROSTER[def.id]?.style]===mv.style?.88:1;const dmg=Math.max(3,Math.round((mv.power+as.atk*.8-ds.def*.38)*mult));def.hp=Phaser.Math.Clamp(def.hp-dmg,0,ds.hp);att.score=(att.score||0)+mv.points;sfx.hit();return {line:`${label}: ${mv.name} ${dmg}${mult>1?' EDGE':''}.`,hit:true,dmg};}
  enemyDown(){
    const l=lead(this.state);
    if(this.enemyIdx<this.enemyTeam.length-1){
      this.enemyIdx++;const next=this.enemy();
      this.addLog([`${this.trainerName||'Opponent'} sends out ${ROSTER[next.id].name}!`]);
      this.mode='command';this.sel=0;this.impact='';
      saveState(this.state);this.drawBattle();return;
    }
    this.win();
  }
  playerDown(){
    const anyHealthy=this.state.party.some(m=>m.hp>0);
    this.impact='DOWN';
    if(anyHealthy){
      this.addLog([`${ROSTER[lead(this.state).id].name} is out. Send in your next wrestler.`]);
      this.mode='party';this.forcedSwap=true;this.sel=Math.max(0,this.state.party.findIndex(m=>m.hp>0));
      saveState(this.state);this.drawBattle();return;
    }
    this.lose();
  }
  win(){
    const l=lead(this.state);this.over=true;this.mode='result';this.resultTitle='VICTORY';
    this.expGain=10+this.enemyTeam.reduce((a,e)=>a+e.lvl,0)*4;
    this.state.stats.wins++;this.state.stats.streak++;
    const grit=this.reward?.grit??(this.type==='gym'?22:Phaser.Math.Between(6,10));
    const rep=this.reward?.rep??(this.type==='gym'?14:Phaser.Math.Between(2,5));
    this.state.grit+=grit;this.state.rep+=rep;
    if(l)addXp(l,this.expGain).forEach(x=>this.log.unshift(x));
    const badgeEarned=this.badge&&!this.state.badges.includes(this.badge);
    if(badgeEarned){this.state.badges.push(this.badge);this.log.unshift(`Badge: ${this.badge}.`);}
    stopMusic();sfx[badgeEarned?'badge':'win']();
    if(this.defeatKey){this.state.trainersDefeated=this.state.trainersDefeated||{};this.state.trainersDefeated[this.defeatKey]=true;}
    if(this.type==='tournament'){
      this.state.tournament=this.state.tournament||{round:0,champion:false};
      this.state.tournament.round=Math.max(this.state.tournament.round,(this.tournamentRound??0)+1);
      if(this.state.tournament.round>=3&&!this.state.tournament.champion){this.state.tournament.champion=true;this.resultTitle='CHAMPION';if(sfx.badge)sfx.badge();}
      if(this.winMsg)this.log.unshift(this.winMsg);
    }
    if(this.type==='wild'){this.recruit=true;this.log.unshift('Invite window open.');this.state.flags.scoutedBattle=true;}
    if(this.type==='gym'){this.state.flags.scoutedBattle=true;}
    if(this.enemyTeam.some(e=>e.id==='drillpartner')||this.type==='wild'){this.state.flags.wonSpar=true;}
    if(this.type==='wild'&&this.state.objective?.id==='scout_quad'){this.state.objective={id:'recruit_first',stage:3,complete:false,log:['Recruit your first wrestler',...(this.state.objective?.log||[])]};}
    if(this.state.objective?.id==='win_spar'){this.state.objective={id:'return_coach',stage:5,complete:false,log:['Return to Coach',...(this.state.objective?.log||[])]};}
    this.state.message=this.type==='tournament'?(this.winMsg||`Won the ${this.roundLabel||'round'}.`):`Won vs ${this.trainerName||ROSTER[this.enemy().id].name}.`;
    saveState(this.state);this.drawBattle();
  }
  lose(){this.over=true;this.recruit=false;this.mode='result';this.resultTitle='LOSS';this.state.stats.streak=0;this.state.grit+=4;this.state.rep+=2;this.state.party.forEach(m=>{const s=scaledStats(m.id,m.lvl);m.hp=s.hp;m.gas=s.gas;m.score=0;});this.addLog(['Team recovered. +4 Grit +2 Rep.']);this.state.message='Loss. Team recovered.';stopMusic();sfx.lose();saveState(this.state);this.drawBattle();}
  tryRecruit(){if(this.state.items.invite<=0){this.recruit=false;this.resultTitle='NO INVITES';this.addLog(['Buy more invites.']);saveState(this.state);this.drawBattle();return;}this.state.items.invite--;this.recruit=false;const r=ROSTER[this.enemy().id],odds={Common:.72,Uncommon:.55,Rare:.38,Elite:.16}[r.rarity]||.4;if(Math.random()<odds){const m=makeMon(this.enemy().id,this.enemy().lvl);this.state.dex.caught[m.id]=true;if(this.state.party.length<6)this.state.party.push(m);else this.state.box.push(m);this.state.stats.recruits++;if((Object.keys(this.state.dex.caught||{}).filter(k=>this.state.dex.caught[k]).length)>=2){this.state.objective={id:'win_spar',stage:4,complete:false,log:['Win your first sparring match',...(this.state.objective?.log||[])]};this.log.unshift('Objective complete: first recruit.');}this.resultTitle='JOINED';this.addLog([`${r.name} joined.`]);}else{this.resultTitle='PASSED';this.addLog([`${r.name} passed.`]);}saveState(this.state);this.drawBattle();}
  drawBattle(){this.children.removeAll();this.drawArenaBackdrop();const l=lead(this.state),lr=l?ROSTER[l.id]:ROSTER.buckshot,er=ROSTER[this.enemy().id];
    this.drawStatusPanels(l,lr,er);this.drawWrestlers(lr,er);this.drawBottom(lr);this.firstBattleDraw=false;}
  drawStatusPanels(l,lr,er){
    const tag=this.enemyTeam.length>1?` ${this.enemyIdx+1}/${this.enemyTeam.length}`:'';
    this.drawStatusBox(8,16,126,36,`${er.name.split(' ')[0]}${tag} Lv.${this.enemy().lvl}`,this.enemy(),er,false);
    if(l)this.drawStatusBox(174,116,138,50,`${lr.name.split(' ')[0]} Lv.${l.lvl}`,l,lr,true);
  }
  drawStatusBox(x,y,w,h,name,mon,rec,isPlayer){
    const s=scaledStats(mon.id,mon.lvl),hp=Math.max(0,Math.round(mon.hp)),gas=Math.max(0,Math.round(mon.gas));
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(x+3,y+3,w,h,3);
    g.fillStyle(isPlayer?0xf9f2dc:0xfff8e8,1);g.fillRoundedRect(x,y,w,h,3);
    g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,3);
    g.lineStyle(1,isPlayer?0xd3a13a:0xa8b1aa,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,2);
    g.fillStyle(isPlayer?0x25313a:0x7b1d2a,1);g.fillRect(x+5,y+5,w-10,1);
    this.add.text(x+8,y+6,name,{fontFamily:'monospace',fontSize:9,color:'#111',fontStyle:'bold'});
    this.add.text(x+w-36,y+7,isPlayer?'ROOM':'OPP',{fontFamily:'monospace',fontSize:6,color:isPlayer?'#355f87':'#8a1720',fontStyle:'bold'});
    this.add.text(x+9,y+21,'HP',{fontFamily:'monospace',fontSize:6,color:'#555',fontStyle:'bold'});
    this.drawAnimatedMeter(x+28,y+22,w-43,6,this.prevMeters?.[isPlayer?'playerHp':'enemyHp'],mon.hp/s.hp,0x55b867);
    if(isPlayer){
      this.add.text(x+9,y+33,'EP',{fontFamily:'monospace',fontSize:6,color:'#355f87',fontStyle:'bold'});
      this.drawAnimatedMeter(x+28,y+34,w-43,5,this.prevMeters?.playerGas,mon.gas/s.gas,0x5aa4e6);
      this.add.text(x+w-58,y+42,`${hp}/${s.hp}`,{fontFamily:'monospace',fontSize:6,color:'#333',fontStyle:'bold'});
      this.add.text(x+w-58,y+31,`${gas}/${s.gas}`,{fontFamily:'monospace',fontSize:6,color:'#355f87'});
    }
  }
  drawWrestlers(lr,er){this.drawBattleBases();const eX=235,eY=88,pX=82,pY=146,eStart=this.firstBattleDraw?GAME_W+42:eX,pStart=this.firstBattleDraw?-54:pX;const eimg=this.add.image(eStart,eY,'battle_'+er.asset).setScale(.58).setFlipX(true);const pimg=this.add.image(pStart,pY,'battle_'+lr.asset+'_back').setScale(.67);this.enemySprite=eimg;this.playerSprite=pimg;if(this.firstBattleDraw){this.tweens.add({targets:eimg,x:eX,duration:420,ease:'Cubic.Out'});this.tweens.add({targets:pimg,x:pX,duration:420,ease:'Cubic.Out',delay:110});}if(this.attackAnim==='enemy'){this.tweens.add({targets:eimg,x:'+=5',yoyo:true,repeat:3,duration:35});this.tweens.add({targets:pimg,x:'+=13',yoyo:true,duration:80,ease:'Cubic.Out'});this.cameras.main.flash(82,255,255,255);this.drawImpactBurst(eX,eY,this.moveStyle);}if(this.attackAnim==='player'){this.tweens.add({targets:pimg,x:'-=5',yoyo:true,repeat:3,duration:35});this.tweens.add({targets:eimg,x:'-=11',yoyo:true,duration:80,ease:'Cubic.Out'});this.cameras.main.shake(100,.006);this.drawImpactBurst(pX,pY,this.moveStyle);}if(this.attackAnim==='miss'){this.tweens.add({targets:[pimg,eimg],alpha:.65,yoyo:true,duration:55});this.drawMissWhiff(160,98);}if(this.impact){const t=this.add.text(160,78,this.impact,{fontFamily:'monospace',fontSize:14,color:'#ffe28a',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5);this.tweens.add({targets:t,y:62,alpha:0,duration:550,ease:'Cubic.Out'});}this.attackAnim=null;}
  drawBattleBases(){const g=this.add.graphics();g.fillStyle(0x1b1d1f,.22);g.fillEllipse(236,111,116,28);g.fillEllipse(82,169,138,31);g.fillStyle(0xe9e2cd,1);g.fillEllipse(235,106,112,25);g.fillStyle(0xc9d0ca,1);g.fillEllipse(235,106,86,17);g.lineStyle(1,0x8a978f,.85);g.strokeEllipse(235,106,112,25);g.lineStyle(1,0xffffff,.35);g.strokeEllipse(235,102,84,12);g.fillStyle(0xe4d7ba,1);g.fillEllipse(83,163,136,30);g.fillStyle(0xc7b486,1);g.fillEllipse(83,163,103,20);g.lineStyle(1,0x8e7641,.9);g.strokeEllipse(83,163,136,30);g.lineStyle(1,0xffffff,.3);g.strokeEllipse(83,158,101,13);}
  drawImpactBurst(x,y,style='Neutral'){
    const colors={Neutral:0xfff2a4,Top:0xb9a8ff,Scramble:0xffb36b,Pace:0x8fe0a6,Defense:0xbdb6ff,Upperbody:0x8fd0ff};
    const c=colors[style]||0xfff2a4;
    const g=this.add.graphics().setDepth(70);
    g.lineStyle(2,c,.95);g.strokeCircle(x,y,10);
    g.lineStyle(1,0xffffff,.85);g.strokeCircle(x,y,15);
    g.fillStyle(c,.26);g.fillCircle(x,y,18);
    for(let i=0;i<8;i++){const a=(Math.PI*2/8)*i,dx=Math.cos(a)*22,dy=Math.sin(a)*15;g.lineStyle(1,i%2?0xffffff:c,.9);g.lineBetween(x+Math.cos(a)*7,y+Math.sin(a)*5,x+dx,y+dy);}
    this.tweens.add({targets:g,alpha:0,scale:1.35,duration:420,ease:'Cubic.Out',onComplete:()=>g.destroy()});
  }
  drawMissWhiff(x,y){
    const g=this.add.graphics().setDepth(70);
    g.lineStyle(2,0xffffff,.55);g.beginPath();g.arc(x,y,20,5.1,1.4,false);g.strokePath();
    g.lineStyle(1,0x8a978f,.7);g.beginPath();g.arc(x+4,y+3,13,5.0,1.2,false);g.strokePath();
    this.tweens.add({targets:g,alpha:0,x:'+=12',duration:360,ease:'Sine.Out',onComplete:()=>g.destroy()});
  }
  drawBottom(lr){
    if(this.mode==='command')return this.drawCommand(lr);
    if(this.mode==='fight')return this.drawFight(lr);
    if(this.mode==='party')return this.drawParty();
    if(this.mode==='bag')return this.drawBag();
    return this.drawResult();
  }
  drawCommand(lr){this.drawTextBox(7,174,146,44);this.add.text(17,184,'What will',{fontFamily:'monospace',fontSize:10,color:'#111',fontStyle:'bold'});this.add.text(17,201,`${lr.name.split(' ')[0]} do?`,{fontFamily:'monospace',fontSize:10,color:'#111',fontStyle:'bold'});this.drawCommandBox(159,174,153,44);COMMANDS.forEach((t,i)=>this.add.text(168+(i%2)*72,184+(i>1?18:0),`${i===this.sel?'\u25b6':' '}${t}`,{fontFamily:'monospace',fontSize:10,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'}));this.drawBattleLog(10,148,2);}
  drawFight(r){this.drawCommandBox(7,174,305,44);const leadMon=lead(this.state);const moves=leadMon?.moves||r.moves||[];moves.forEach((key,i)=>{const m=MOVES[key],x=18+(i%2)*146,y=184+(i>1?18:0);this.add.text(x,y,`${i===this.sel?'\u25b6':' '}${m.name}`,{fontFamily:'monospace',fontSize:9,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'});});const mv=MOVES[moves[this.sel]];if(mv)this.drawMoveTag(mv);this.drawBattleLog(10,148,2);}
  drawBag(){this.drawTextBox(7,122,305,96);this.add.text(18,132,'BAG',{fontFamily:'monospace',fontSize:11,color:'#111',fontStyle:'bold'});BAG_ITEMS.forEach((it,i)=>{const n=this.state.items?.[it.key]||0;this.add.text(18,150+i*14,`${i===this.sel?'\u25b6':' '} ${it.name} x${n}`,{fontFamily:'monospace',fontSize:8,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'});});const it=BAG_ITEMS[this.sel];if(it)this.add.text(180,132,it.desc,{fontFamily:'monospace',fontSize:8,color:'#111',wordWrap:{width:118}});this.add.text(180,203,'A USE  B BACK',{fontFamily:'monospace',fontSize:8,color:'#555',fontStyle:'bold'});}
  drawParty(){this.drawTextBox(7,122,305,96);this.add.text(18,132,this.forcedSwap?'Choose next wrestler':'Choose wrestler',{fontFamily:'monospace',fontSize:11,color:this.forcedSwap?'#b41820':'#111',fontStyle:'bold'});this.state.party.forEach((m,i)=>{const r=ROSTER[m.id],s=scaledStats(m.id,m.lvl),tag=m.hp<=0?' OUT':'';this.add.text(18,151+i*13,`${i===this.sel?'\u25b6':' '} ${r.name} L${m.lvl} HP ${m.hp}/${s.hp}${tag}`,{fontFamily:'monospace',fontSize:8,color:i===this.sel?'#8a1720':m.hp<=0?'#999':'#111',fontStyle:'bold'});});}
  drawResult(){this.drawTextBox(7,174,305,44);const isWin=this.resultTitle==='VICTORY'||this.resultTitle==='JOINED';const g=this.add.graphics();g.fillStyle(isWin?0x7b1d2a:0x25313a,.92);g.fillRoundedRect(77,179,166,20,3);g.lineStyle(1,0xd6a336,.95);g.strokeRoundedRect(77,179,166,20,3);this.add.text(160,184,this.resultTitle,{fontFamily:'monospace',fontSize:11,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5);const sub=this.resultTitle==='VICTORY'?`EXP +${this.expGain}`:(this.recruit?'A INVITE  B LEAVE':'A/B RETURN');this.add.text(160,204,sub,{fontFamily:'monospace',fontSize:9,color:'#111',fontStyle:'bold'}).setOrigin(.5);if(this.resultTitle==='VICTORY'){const star=this.add.text(282,187,'\u2605',{fontFamily:'monospace',fontSize:16,color:'#d6a336',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);this.tweens.add({targets:star,angle:360,scale:1.35,yoyo:true,duration:520,repeat:-1});}this.drawBattleLog(10,148,2);}
  drawBattleLog(x,y,n){this.log.slice(0,n).forEach((line,i)=>{const bg=this.add.graphics();bg.fillStyle(0x111015,.78);bg.fillRoundedRect(x-2,y+i*11-1,Math.min(300,line.length*5+10),11,2);this.add.text(x,y+i*11,line,{fontFamily:'monospace',fontSize:7,color:'#f8f0d8'});});}
  captureMeters(playerHp,playerGas,enemyHp){const l=lead(this.state);return {playerHp:l?playerHp/scaledStats(l.id,l.lvl).hp:1,playerGas:l?playerGas/scaledStats(l.id,l.lvl).gas:1,enemyHp:enemyHp/scaledStats(this.enemy().id,this.enemy().lvl).hp};}
  drawAnimatedMeter(x,y,w,h,start,end,color){const g=this.add.graphics();const value={p:Phaser.Math.Clamp(start??end,0,1)};const draw=()=>{const p=Phaser.Math.Clamp(value.p,0,1);g.clear();g.fillStyle(0x111111,1);g.fillRoundedRect(x-1,y-1,w+2,h+2,1);g.fillStyle(0x3d3d3d,1);g.fillRect(x,y,w,h);g.fillStyle(p<.22?0xd84c35:p<.5?0xd6b545:color,1);g.fillRect(x,y,Math.max(1,w*p),h);g.fillStyle(0xffffff,.3);g.fillRect(x,y,Math.max(1,w*p),1);g.lineStyle(1,0x080808,1);g.strokeRect(x-1,y-1,w+2,h+2);};draw();if(start!==undefined&&Math.abs(start-end)>.01){this.tweens.add({targets:value,p:Phaser.Math.Clamp(end,0,1),duration:520,ease:'Sine.Out',onUpdate:draw,onComplete:()=>{this.prevMeters=null;}});}return g;}
  drawTextBox(x,y,w,h){const g=this.add.graphics();g.fillStyle(0x000000,.35);g.fillRoundedRect(x+3,y+3,w,h,4);g.fillStyle(0xf8f0d8,1);g.fillRoundedRect(x,y,w,h,4);g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,4);g.lineStyle(1,0xffffff,.45);g.strokeRoundedRect(x+2,y+2,w-4,h-4,3);g.lineStyle(1,0x847868,1);g.strokeRoundedRect(x+4,y+4,w-8,h-8,2);return g;}
  drawCommandBox(x,y,w,h){const g=this.drawTextBox(x,y,w,h);g.fillStyle(0x7b1d2a,.9);g.fillRect(x+6,y+4,w-12,1);g.lineStyle(1,0xd6a336,.75);g.strokeRoundedRect(x+6,y+6,w-12,h-12,2);return g;}
  drawMoveTag(mv){const g=this.add.graphics();g.fillStyle(0x111015,.88);g.fillRoundedRect(174,153,136,17,2);g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(174,153,136,17,2);this.add.text(181,158,`${mv.style} P${mv.power} ACC${Math.round(mv.acc*100)} EP${mv.gas}`,{fontFamily:'monospace',fontSize:7,color:'#f8f0d8',fontStyle:'bold'});}
  drawArenaBackdrop(){this.add.image(0,0,'battle_arena').setOrigin(0).setDisplaySize(GAME_W,GAME_H);const g=this.add.graphics();g.fillStyle(0xffffff,.05);g.fillRect(0,0,GAME_W,86);g.fillStyle(0x000000,.10);g.fillRect(0,166,GAME_W,58);g.lineStyle(3,0x7b1d2a,.9);g.strokeEllipse(160,128,232,70);g.lineStyle(1,0xd6a336,.55);g.strokeEllipse(160,128,191,55);g.lineStyle(1,0xffffff,.32);g.strokeEllipse(160,128,136,39);}
  playBattleIntro(){this.inputLocked=true;this.mode='command';this.sel=0;const cover=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x000000,1).setDepth(999);this.tweens.add({targets:cover,alpha:0,duration:420,ease:'Cubic.Out',onComplete:()=>{cover.destroy();this.inputLocked=false;this.mode='command';this.sel=0;this.drawBattle();}});}
  returnMap(){if(this.transitioning)return;this.transitioning=true;const cover=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x000000,0).setDepth(999);this.tweens.add({targets:cover,alpha:1,duration:260,ease:'Sine.In',onComplete:()=>this.scene.start('OverworldScene')});}
}
