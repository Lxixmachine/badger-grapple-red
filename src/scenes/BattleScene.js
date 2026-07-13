import {ROSTER,makeMon,scaledStats,addXp,applyPendingDevelopment,personaFor,resolvePendingMove} from '../data/roster.js';import {distributeDefeatExperience,experienceAtLevel,experienceProgress} from '../data/experience.js';import {MOVES} from '../data/moves.js';import {canonicalBadge} from '../data/campaign.js';import {loadState,saveState,lead} from '../systems/save.js';import {attemptRecruit,BAG_ORDER,chooseAiMove,clearTurnFlags,consumeActionBlock,createBattleState,ITEM_DEFS,resolveTechnique,restoreParty,turnOrder,useFilmStudy} from '../systems/mechanics.js';import {FONT,uiBox,hpBar,setVirtualHandler} from '../systems/ui.js';import {unlockAudio,sfx,playMusic,stopMusic,setMuted} from '../systems/audio.js';import {GAME_W,GAME_H} from '../systems/resolution.js';
const Phaser = window.Phaser;
const COMMANDS=['FIGHT','BAG','WRESTLER','RUN'];
const BAG_ITEMS=BAG_ORDER.map(key=>({key,name:ITEM_DEFS[key].name,desc:ITEM_DEFS[key].description,kind:ITEM_DEFS[key].kind}));
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
    this.turn=1;this.sel=0;this.mode='command';this.over=false;this.recruit=false;this.forcedSwap=false;this.impact='';this.resultTitle='';this.messageTimer=0;this.moveLearn=null;
    this.firstBattleDraw=true;this.transitioning=false;this.prevMeters=null;this.attackAnim=null;this.moveStyle='';this.expGain=0;this.lastChooseAt=0;this.inputLocked=true;
    this.battleStates=new WeakMap();this.awardedEnemies=new WeakSet();
    const openLine=this.type==='opening'
      ?`${this.trainerName||'Rex'} takes the mat as the ${personaFor(this.enemy().id)}!`
      :this.type==='wild'?`${ROSTER[this.enemy().id].name} takes the mat as the ${personaFor(this.enemy().id)}!`:`${this.trainerName||'Opponent'} sends out ${ROSTER[this.enemy().id].name} - ${personaFor(this.enemy().id)} form!`;
    this.log=[openLine];
    const l=lead(this.state);if(l){const s=scaledStats(l.id,l.lvl,l);if(!Number.isFinite(l.hp)||l.hp<=0)l.hp=s.hp;if(!Number.isFinite(l.stamina)||l.stamina<=0)l.stamina=s.stamina;l.score=0;}this.participants=new Set(l?[l]:[]);this.enemyTeam.forEach(e=>e.score=0);
    this.progressMon=l;this.leadProgressStart=l?{lvl:l.lvl,xp:l.xp,id:l.id}:null;
    this.state.stats={scouts:0,battles:0,wins:0,recruits:0,streak:0,...(this.state.stats||{})};this.state.stats.battles++;saveState(this.state);
    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1,0));this.input.keyboard.on('keydown-RIGHT',()=>this.move(1,0));this.input.keyboard.on('keydown-UP',()=>this.move(0,-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(0,1));
    this.input.keyboard.on('keydown-ENTER',()=>this.choose());this.input.keyboard.on('keydown-SPACE',()=>this.choose());this.input.keyboard.on('keydown-ESC',()=>this.back());
    setVirtualHandler(this);this.drawBattle();this.playBattleIntro();
  }
  enemy(){return this.enemyTeam[this.enemyIdx];}
  combatState(mon,reset=false){if(!mon)return createBattleState();if(reset||!this.battleStates.has(mon))this.battleStates.set(mon,createBattleState());return this.battleStates.get(mon);}
  clearBattleTurn(){clearTurnFlags(this.combatState(lead(this.state)),this.combatState(this.enemy()));}
  battleDebugState(){const l=lead(this.state);return {player:l?this.combatState(l):null,enemy:this.enemy()?this.combatState(this.enemy()):null};}
  handleVirtualButton(k){unlockAudio();if(k==='left')this.move(-1,0);if(k==='right')this.move(1,0);if(k==='up')this.move(0,-1);if(k==='down')this.move(0,1);if(k==='a')this.choose();if(k==='b')this.back();}
  count(){if(this.mode==='fight'){const l=lead(this.state);return (l?.moves||ROSTER[l?.id]?.moves||[]).length||1;}if(this.mode==='party')return Math.max(1,this.state.party.length);if(this.mode==='bag')return BAG_ITEMS.length;if(this.mode==='learnMove')return (this.moveLearn?.mon?.moves?.length||0)+1;if(this.mode==='learnInspect'||this.mode==='learnConfirm')return 2;return 4;}
  move(dx,dy){if(this.over||this.inputLocked)return;const old=this.sel;let cols=this.mode==='party'||this.mode==='learnMove'?1:2;let rows=Math.ceil(this.count()/cols);let x=old%cols,y=Math.floor(old/cols);if(dx)x=Phaser.Math.Wrap(x+dx,0,cols);if(dy)y=Phaser.Math.Wrap(y+dy,0,rows);this.sel=Math.min(y*cols+x,this.count()-1);this.impact='';this.drawBattle();}
  choose(){const now=this.time.now||performance.now();if(this.inputLocked)return;if(now-this.lastChooseAt<160)return;this.lastChooseAt=now;if(this.over)return this.returnMap();if(this.mode==='command')return this.chooseCommand();if(this.mode==='fight')return this.chooseMove();if(this.mode==='party')return this.chooseParty();if(this.mode==='bag')return this.chooseBag();if(this.mode==='learnMove')return this.chooseLearnMove();if(this.mode==='learnInspect')return this.chooseLearnInspect();if(this.mode==='learnConfirm')return this.chooseLearnConfirm();}
  back(){if(this.inputLocked)return;if(this.over)return this.returnMap();if(this.mode==='learnInspect'){this.mode='learnMove';this.sel=this.moveLearn?.replaceIndex??0;return this.drawBattle();}if(this.mode==='learnConfirm'){this.mode='learnMove';this.sel=0;return this.drawBattle();}if(this.mode==='learnMove')return this.confirmStopLearning();if(this.forcedSwap)return;if(this.mode!=='command'){this.mode='command';this.sel=0;this.drawBattle();}}
  addLog(lines){this.log=[...lines,...this.log].slice(0,5);}
  resolvePendingMoves(onDone){
    const mon=this.state.party.find(wrestler=>wrestler.pendingMoves?.length);
    if(!mon){this.moveLearn=null;return onDone();}
    this.moveLearn={mon,move:mon.pendingMoves[0],onDone};
    this.inputLocked=false;this.mode='learnMove';this.sel=0;this.drawBattle();
  }
  chooseLearnMove(){
    const mon=this.moveLearn?.mon;if(!mon)return;
    if(this.sel>=mon.moves.length)return this.confirmStopLearning();
    this.moveLearn.replaceIndex=this.sel;this.mode='learnInspect';this.sel=1;this.drawBattle();
  }
  chooseLearnInspect(){if(this.sel===0)this.finishMoveLearning(this.moveLearn?.replaceIndex);else{this.mode='learnMove';this.sel=this.moveLearn?.replaceIndex??0;this.drawBattle();}}
  confirmStopLearning(){this.mode='learnConfirm';this.sel=1;this.drawBattle();}
  chooseLearnConfirm(){if(this.sel===0)this.finishMoveLearning(null);else{this.mode='learnMove';this.sel=0;this.drawBattle();}}
  finishMoveLearning(replaceIndex){
    const choice=this.moveLearn;if(!choice)return;
    const result=resolvePendingMove(choice.mon,choice.move,replaceIndex);
    if(!result.ok)return;
    const wrestler=ROSTER[choice.mon.id].name,move=MOVES[choice.move].name;
    const line=result.learned?`${wrestler} forgot ${MOVES[result.forgotten].name} and learned ${move}!`:`${wrestler} did not learn ${move}.`;
    const onDone=choice.onDone;this.moveLearn=null;this.inputLocked=true;this.mode='resolving';this.sel=0;saveState(this.state);this.drawBattle();
    this.playResolveSequence([line],()=>this.resolvePendingMoves(onDone));
  }
  chooseCommand(){const l=lead(this.state);if(l&&this.combatState(l).recharging)return this.resolveTurn(null);const cmd=COMMANDS[this.sel];if(cmd==='FIGHT'){this.mode='fight';this.sel=0;this.drawBattle();return;}if(cmd==='BAG'){this.mode='bag';this.sel=0;this.drawBattle();return;}if(cmd==='WRESTLER'){this.mode='party';this.sel=this.state.active||0;this.drawBattle();return;}if(cmd==='RUN'){if(this.type==='wild'){this.addLog(['Got away safely.']);this.over=true;this.resultTitle='LEFT';this.recruit=false;stopMusic();this.drawBattle();}else{this.addLog(['You cannot run from this match.']);this.drawBattle();}}}
  chooseMove(){const l=lead(this.state);if(!l)return this.returnMap();const key=(l.moves||ROSTER[l.id]?.moves||[])[this.sel];if(key)this.resolveTurn(key);}
  chooseBag(){
    const l=lead(this.state);if(!l)return this.returnMap();
    const item=BAG_ITEMS[this.sel];if(!item)return;
    const count=this.state.items?.[item.key]||0;
    if(count<=0){this.addLog([`No ${item.name}.`]);this.drawBattle();return;}
    if(item.kind==='singlet'){
      if(this.type!=='wild'){this.addLog(['Recruiting only works in wild scouting matches.']);this.drawBattle();return;}
      if(!this.state.flags?.recruitingUnlocked){this.addLog(['Coach has not issued the Roster Book yet.']);this.drawBattle();return;}
      const msg=this.trySinglet(item.key),consumed=(this.state.items?.[item.key]||0)<count;this.addLog([msg]);this.mode='command';this.sel=0;saveState(this.state);if(this.over||!consumed)this.drawBattle();else this.enemyOnlyStrike();return;
    }
    let msg='';
    if(item.key==='sportsDrink'){
      const max=scaledStats(l.id,l.lvl,l).stamina;if(l.stamina>=max)msg='Stamina is already full.';else{l.stamina=Phaser.Math.Clamp(l.stamina+24,0,max);this.state.items.sportsDrink--;msg=`${ROSTER[l.id].name} recovered Stamina.`;}
    }else if(item.key==='athleticTape'){
      const max=scaledStats(l.id,l.lvl,l).hp;if(l.hp>=max)msg='Condition is already full.';else{l.hp=Phaser.Math.Clamp(l.hp+20,0,max);this.state.items.athleticTape--;msg=`${ROSTER[l.id].name} recovered Condition.`;}
    }else if(item.key==='filmStudy'){
      msg=useFilmStudy(this.state)?'Film Study prepared: next three recruit attempts improved.':'No Film Study left.';
    }
    this.addLog([msg]);
    this.mode='command';this.sel=0;
    const consumed=(this.state.items?.[item.key]||0)<count;saveState(this.state);if(consumed)this.enemyOnlyStrike();else this.drawBattle();
  }
  trySinglet(singletKey){
    const e=this.enemy(),r=ROSTER[e.id];
    const result=attemptRecruit(this.state,e,singletKey);
    if(result.reason==='elite')return `${r.name} is committed and cannot be recruited.`;
    if(result.reason==='empty')return `No ${ITEM_DEFS[singletKey].name} left.`;
    if(result.success){
      this.over=true;this.recruit=false;this.mode='result';this.resultTitle='JOINED';
      this.state.message=`${r.name} joined the room!`;saveState(this.state);
      return `${r.name} accepted the ${ITEM_DEFS[singletKey].name.toLowerCase()} and joined!`;
    }
    return `${r.name} declined the singlet.`;
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
    this.combatState(picked,true);
    this.participants.add(picked);
    saveState(this.state);
    this.addLog([`${ROSTER[picked.id].name} steps onto the mat!`]);
    this.mode='command';this.sel=0;
    if(wasForced){this.forcedSwap=false;this.drawBattle();return;}
    this.enemyOnlyStrike();
  }
  enemyOnlyStrike(){
    const l=lead(this.state),e=this.enemy();
    this.inputLocked=true;this.mode='resolving';this.impact='';this.attackAnim=null;this.prevMeters=null;this.drawBattle();
    const ek=chooseAiMove(e,l,{wild:this.type==='wild',attackerState:this.combatState(e),defenderState:this.combatState(l)});
    this.attackBeat({att:e,def:l,key:ek,attName:ROSTER[e.id].name.split(' ')[0],defIsEnemy:false,
      onKO:()=>{this.clearBattleTurn();this.inputLocked=false;this.playerDown();},
      onDone:()=>{this.clearBattleTurn();this.turn++;this.inputLocked=false;this.mode='command';this.sel=0;saveState(this.state);this.drawBattle();}});
  }
  // v21.14 Battle Drama: every attack is a two-beat FireRed sequence -
  // announce ("BUCKY used SINGLE LEG!" typed out, attacker lunges), then
  // impact (damage number, defender flicker + knockback, HP drain), with
  // faint and send-out beats when a wrestler goes down.
  typeText(t,str,speed=13){if(this.typeTimer)this.typeTimer.remove(false);let i=0;t.setText('');this.typeTimer=this.time.addEvent({delay:speed,repeat:Math.max(0,str.length-1),callback:()=>{i++;if(t&&t.scene)t.setText(str.slice(0,i));}});}
  setResolveText(str){if(!this.resolveText||!this.resolveText.scene){this.mode='resolving';this.drawBattle();}this.typeText(this.resolveText,str);}
  playResolveSequence(lines,onDone){
    const queue=lines.filter(Boolean);let index=0;
    const next=()=>{if(this.over)return;if(index>=queue.length)return onDone();this.setResolveText(queue[index++]);this.time.delayedCall(540,next);};
    next();
  }
  effectLine(event,attName,defName){
    const name=event.target==='attacker'?attName:defName;
    const stat={attack:'Attack',defense:'Defense',speed:'Speed',accuracy:'Accuracy'}[event.stat]||event.stat;
    if(event.type==='multiHit')return `Hit ${event.hits} times!`;
    if(event.type==='counter')return `${attName} caught the opening with a re-attack!`;
    if(event.type==='staminaDrain')return `${defName} lost ${event.amount} Stamina!`;
    if(event.type==='flinch')return `${defName} lost position!`;
    if(event.type==='recharge')return `${attName} must reset position next turn.`;
    if(event.type==='stageLimit')return `${name}'s ${stat} cannot shift any further.`;
    if(event.type==='stage'){
      if(event.delta>=2)return `${name}'s ${stat} rose sharply!`;
      if(event.delta>0)return `${name}'s ${stat} rose!`;
      if(event.delta<=-2)return `${name}'s ${stat} fell sharply!`;
      return `${name}'s ${stat} fell!`;
    }
    return '';
  }
  resultMessages(result,attName,defName){
    const lines=[];
    if(result.critical)lines.push(result.criticalHits>1?`${result.criticalHits} critical hits!`:'A critical hit!');
    if(result.multiplier>1)lines.push(`It's a style edge!`);
    if(result.multiplier<1)lines.push(`The matchup blunted the technique.`);
    result.events.forEach(event=>lines.push(this.effectLine(event,attName,defName)));
    return lines.filter(Boolean);
  }
  attackBeat({att,def,key,attName,defIsEnemy,onKO,onDone}){
    const attState=this.combatState(att),defState=this.combatState(def);
    const blocked=consumeActionBlock(attState);
    if(blocked){
      const line=blocked==='recharge'?`${attName} is resetting position!`:`${attName} could not regain position!`;
      this.addLog([line]);this.setResolveText(line);this.playSafe('talk');this.time.delayedCall(660,onDone);return;
    }
    const requested=MOVES[key]||MOVES.stall;
    const actualKey=requested.stamina>0&&att.stamina<requested.stamina?'stall':(key||'stall');
    const mv=MOVES[actualKey]||MOVES.stall;
    this.setResolveText(actualKey!==key?`${attName} is exhausted - CIRCLE OUT!`:`${attName} used ${mv.name.toUpperCase()}!`);
    const attacker=defIsEnemy?this.playerSprite:this.enemySprite;
    if(attacker&&attacker.scene)this.tweens.add({targets:attacker,x:defIsEnemy?'+=16':'-=16',duration:130,yoyo:true,ease:'Cubic.Out'});
    this.playSafe('talk');
    this.time.delayedCall(640,()=>{
      if(this.over)return;
      const l=lead(this.state);
      const beforeDefHp=def.hp,beforeGas=l?.stamina??0;
      const res=this.resolve(att,def,actualKey,attName);
      this.prevMeters=defIsEnemy?this.captureMeters(l.hp,beforeGas,beforeDefHp):this.captureMeters(beforeDefHp,l.stamina,this.enemy().hp);
      this.moveStyle=res.result.move.style;
      this.impact=res.hit?(res.dmg>0?`-${res.dmg}`:'SET'):'MISS';
      this.attackAnim=res.hit?(res.dmg>0?(defIsEnemy?'enemy':'player'):(defIsEnemy?'playerSetup':'enemySetup')):'miss';
      this.addLog([res.line]);
      this.drawBattle();
      const feedback=res.hit?[res.dmg>0?`Landed for ${res.dmg} Condition!`:`${attName} changed the position.`,...this.resultMessages(res.result,attName,ROSTER[def.id].name.split(' ')[0])]:[`It slipped - no contact.`];
      if(res.hit&&res.dmg>0){const target=defIsEnemy?this.enemySprite:this.playerSprite;if(target&&target.scene)this.tweens.add({targets:target,alpha:.15,yoyo:true,repeat:2,duration:65});}
      this.playResolveSequence(feedback,()=>{
        if(this.over)return;
        if(def.hp<=0)return this.faintBeat(defIsEnemy,onKO);
        onDone();
      });
    });
  }
  faintBeat(defIsEnemy,onKO){
    const mon=defIsEnemy?this.enemy():lead(this.state);
    const name=ROSTER[mon.id].name;
    const target=defIsEnemy?this.enemySprite:this.playerSprite;
    this.setResolveText(`${name} is out!`);
    this.addLog([`${name} is out.`]);
    if(target&&target.scene)this.tweens.add({targets:target,y:'+=28',alpha:0,duration:430,ease:'Quad.In'});
    this.playSafe('lose');
    this.time.delayedCall(840,()=>{if(!this.over)onKO();});
  }
  playSafe(kind){try{if(sfx[kind])sfx[kind]();}catch{}}
  personaFlash(sprite,delay=0){if(!sprite)return;this.time.delayedCall(delay,()=>{if(!sprite.scene)return;sprite.setTintFill(0xfff3d0);this.time.delayedCall(150,()=>{if(sprite.scene)sprite.clearTint();});});}
  resolveTurn(key){
    const l=lead(this.state),e=this.enemy();
    this.inputLocked=true;this.mode='resolving';this.impact='';this.attackAnim=null;this.prevMeters=null;this.drawBattle();
    const playerState=this.combatState(l),enemyState=this.combatState(e);
    const ek=chooseAiMove(e,l,{wild:this.type==='wild',attackerState:enemyState,defenderState:playerState});
    const order=turnOrder(l,e,key,ek,{playerState,enemyState});
    const finish=()=>{this.clearBattleTurn();this.turn++;this.inputLocked=false;this.mode='command';this.sel=0;saveState(this.state);this.drawBattle();};
    const act=(role,onDone)=>{
      const playerTurn=role==='player',att=playerTurn?l:e,def=playerTurn?e:l,move=playerTurn?key:ek;
      this.attackBeat({att,def,key:move,attName:ROSTER[att.id].name.split(' ')[0],defIsEnemy:playerTurn,
        onKO:()=>{this.clearBattleTurn();this.inputLocked=false;if(playerTurn)this.enemyDown();else this.playerDown();},onDone});
    };
    act(order[0],()=>act(order[1],finish));
  }
  resolve(att,def,key,label){const result=resolveTechnique(att,def,key,Math.random,{attackerState:this.combatState(att),defenderState:this.combatState(def)});const mv=result.move;if(!result.hit){sfx.miss();return {result,line:`${label} missed ${mv.name}.`,hit:false,dmg:0};}if(result.damage>0)sfx.hit();else this.playSafe('talk');return {result,line:result.damage>0?`${label}: ${mv.name} ${result.damage}${result.multiplier>1?' EDGE':''}${result.critical?' CRITICAL':''}.`:`${label} set ${mv.name}.`,hit:true,dmg:result.damage};}
  awardEnemyXp(defeated){
    if(!defeated||this.awardedEnemies.has(defeated))return [];
    this.awardedEnemies.add(defeated);
    const {awards}=distributeDefeatExperience({defeated,party:this.state.party,participants:[...this.participants],trainerBattle:this.type!=='wild'});
    const messages=[];
    awards.forEach(({mon,amount})=>{this.expGain+=amount;messages.push(`${ROSTER[mon.id].name.split(' ')[0]} gained ${amount} EXP!`);messages.push(...addXp(mon,amount,{deferDevelopment:true}));});
    this.addLog(messages);
    return messages;
  }
  enemyDown(){
    const defeated=this.enemy();this.state.dex.seen[defeated.id]=true;this.state.dex.defeated[defeated.id]=true;
    this.inputLocked=true;
    const proceed=()=>{
      if(this.enemyIdx<this.enemyTeam.length-1){
        this.enemyIdx++;const next=this.enemy();this.combatState(next,true);
        const current=lead(this.state);this.participants=new Set(current?[current]:[]);
        this.impact='';this.attackAnim=null;this.prevMeters=null;
        this.mode='resolving';this.drawBattle();
        this.setResolveText(`${this.trainerName||'Opponent'} sends out ${ROSTER[next.id].name} - ${personaFor(next.id)} form!`);
        this.addLog([`${this.trainerName||'Opponent'} sends out ${ROSTER[next.id].name}!`]);
        if(this.enemySprite&&this.enemySprite.scene){this.enemySprite.x=GAME_W+42;this.enemySprite.setAlpha(1);this.tweens.add({targets:this.enemySprite,x:235,duration:420,ease:'Cubic.Out'});this.personaFlash(this.enemySprite,430);}
        this.time.delayedCall(980,()=>{if(this.over)return;this.inputLocked=false;this.mode='command';this.sel=0;saveState(this.state);this.drawBattle();});
        return;
      }
      this.inputLocked=false;this.win();
    };
    const messages=this.awardEnemyXp(defeated);
    const handleMoves=()=>this.resolvePendingMoves(proceed);
    if(messages.length)this.playResolveSequence(messages,handleMoves);else handleMoves();
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
    const l=lead(this.state);this.over=true;this.inputLocked=false;this.mode='result';this.resultTitle='VICTORY';
    this.enemyTeam.forEach(mon=>{this.state.dex.seen[mon.id]=true;this.state.dex.defeated[mon.id]=true;});
    this.enemyTeam.forEach(mon=>this.awardEnemyXp(mon));
    const developments=this.state.party.map(applyPendingDevelopment).filter(Boolean);
    if(developments.length)this.addLog(developments.map(result=>`${result.fromName} developed into ${result.toName}!`));
    this.state.stats.wins++;this.state.stats.streak++;
    const grit=this.reward?.grit??(this.type==='gym'?22:Phaser.Math.Between(6,10));
    const rep=this.reward?.rep??(this.type==='gym'?14:Phaser.Math.Between(2,5));
    this.state.grit+=grit;this.state.rep+=rep;
    if(this.progressMon&&this.leadProgressStart)this.progress={before:this.leadProgressStart,after:{lvl:this.progressMon.lvl,xp:this.progressMon.xp,id:this.progressMon.id},played:false};
    const badgeName=this.badge?canonicalBadge(this.badge):null;
    const badgeEarned=badgeName&&!this.state.badges.includes(badgeName);
    if(badgeEarned){this.state.badges.push(badgeName);if(this.badge!==badgeName)this.state.badges.push(this.badge);this.log.unshift(`Badge: ${badgeName}.`);}
    stopMusic();sfx[badgeEarned?'badge':'win']();
    if(this.defeatKey){this.state.trainersDefeated=this.state.trainersDefeated||{};this.state.trainersDefeated[this.defeatKey]=true;}
    if(this.type==='tournament'){
      this.state.tournament=this.state.tournament||{round:0,champion:false};
      this.state.tournament.round=Math.max(this.state.tournament.round,(this.tournamentRound??0)+1);
      if(this.state.tournament.round>=3&&!this.state.tournament.champion){this.state.tournament.champion=true;this.resultTitle='CHAMPION';if(sfx.badge)sfx.badge();}
      if(this.winMsg)this.log.unshift(this.winMsg);
    }
    if(this.type==='wild'){this.recruit=false;this.log.unshift('The scouting match is over.');this.state.flags.scoutedBattle=true;}
    if(this.type==='gym'){this.state.flags.scoutedBattle=true;}
    if(this.type==='opening'){
      this.state.flags.openingBattleReady=false;this.state.flags.openingBattleComplete=true;this.state.flags.openingBattleWon=true;
      this.state.opening={...(this.state.opening||{}),battleResult:'win'};
      this.state.objective={id:'opening_recovery',stage:2,complete:false,log:["Recover in the Trainer's Room",'Wrestle Rex','Choose a mat persona']};
      this.log.unshift('Rex nods. The lineup spot is yours for now.');
    }
    if(this.enemyTeam.some(e=>e.id==='drillpartner')||this.type==='wild'){this.state.flags.wonSpar=true;}
    if(this.type==='wild'&&this.state.objective?.id==='scout_quad'){this.state.objective={id:'recruit_first',stage:3,complete:false,log:['Recruit your first wrestler',...(this.state.objective?.log||[])]};}
    if(this.state.objective?.id==='win_spar'){this.state.objective={id:'return_coach',stage:5,complete:false,log:['Return to Coach',...(this.state.objective?.log||[])]};}
    this.state.message=this.type==='opening'?'':this.type==='tournament'?(this.winMsg||`Won the ${this.roundLabel||'round'}.`):`Won vs ${this.trainerName||ROSTER[this.enemy().id].name}.`;
    saveState(this.state);this.drawBattle();
  }
  lose(){
    this.over=true;this.inputLocked=false;this.recruit=false;this.mode='result';this.resultTitle='LOSS';this.state.stats.streak=0;
    this.state.party.forEach(mon=>delete mon.pendingDevelopment);
    if(this.type==='opening'){
      this.state.flags.openingBattleReady=false;this.state.flags.openingBattleComplete=true;this.state.flags.openingBattleWon=false;
      this.state.opening={...(this.state.opening||{}),battleResult:'loss'};
      this.state.objective={id:'opening_recovery',stage:2,complete:false,log:["Recover in the Trainer's Room",'Wrestle Rex','Choose a mat persona']};
      this.addLog(["Wrestle-off complete. Report to the Trainer's Room."]);this.state.message='';
    }else{
      this.state.grit+=4;this.state.rep+=2;restoreParty(this.state);
      this.addLog(['Team recovered. +4 Grit +2 Rep.']);this.state.message='Loss. Team recovered.';
    }
    stopMusic();sfx.lose();saveState(this.state);this.drawBattle();
  }
  drawBattle(){this.children.removeAll();this.drawArenaBackdrop();const l=lead(this.state),lr=l?ROSTER[l.id]:ROSTER.buckshot,er=ROSTER[this.enemy().id];
    this.drawStatusPanels(l,lr,er);this.drawWrestlers(lr,er);this.drawBottom(lr);this.firstBattleDraw=false;}
  drawStatusPanels(l,lr,er){
    const tag=this.enemyTeam.length>1?` ${this.enemyIdx+1}/${this.enemyTeam.length}`:'';
    this.drawStatusBox(8,14,136,40,`${er.name.split(' ')[0]}${tag} Lv.${this.enemy().lvl}`,this.enemy(),er,false);
    this.drawStageSummary(8,56,this.combatState(this.enemy()));
    if(l){this.drawStatusBox(170,109,142,57,`${lr.name.split(' ')[0]} Lv.${l.lvl}`,l,lr,true);this.drawStageSummary(170,96,this.combatState(l));}
  }
  drawStageSummary(x,y,state){
    const labels={attack:'ATK',defense:'DEF',speed:'SPD',accuracy:'ACC'};
    const parts=Object.entries(state?.stages||{}).filter(([,value])=>value).map(([key,value])=>`${labels[key]}${value>0?'+':''}${value}`);
    if(state?.recharging)parts.unshift('RESET');
    if(!parts.length)return;
    const value=parts.join(' '),w=Math.min(142,value.length*5+10),g=this.add.graphics();
    g.fillStyle(0x111015,.82);g.fillRoundedRect(x,y,w,12,2);g.lineStyle(1,0xd6a336,.75);g.strokeRoundedRect(x,y,w,12,2);
    this.add.text(x+5,y+1,value,{fontFamily:FONT,fontSize:8,color:'#f8f0d8',fontStyle:'bold'});
  }
  drawStatusBox(x,y,w,h,name,mon,rec,isPlayer){
    const s=scaledStats(mon.id,mon.lvl,mon),hp=Math.max(0,Math.round(mon.hp)),gas=Math.max(0,Math.round(mon.stamina));
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(x+3,y+3,w,h,3);
    g.fillStyle(isPlayer?0xf9f2dc:0xfff8e8,1);g.fillRoundedRect(x,y,w,h,3);
    g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,3);
    g.lineStyle(1,isPlayer?0xd3a13a:0xa8b1aa,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,2);
    g.fillStyle(isPlayer?0x25313a:0x7b1d2a,1);g.fillRect(x+5,y+5,w-10,1);
    this.add.text(x+8,y+4,name,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold'});
    this.add.text(x+8,y+20,'COND',{fontFamily:FONT,fontSize:9,color:'#333',fontStyle:'bold'});
    this.drawAnimatedMeter(x+39,y+23,w-49,6,this.prevMeters?.[isPlayer?'playerHp':'enemyHp'],mon.hp/s.hp,0x55b867);
    if(isPlayer){
      this.add.text(x+8,y+32,'STA',{fontFamily:FONT,fontSize:9,color:'#355f87',fontStyle:'bold'});
      this.drawAnimatedMeter(x+39,y+35,w-49,5,this.prevMeters?.playerGas,mon.stamina/s.stamina,0x5aa4e6);
      this.add.text(x+8,y+44,`C ${hp}/${s.hp}  S ${gas}/${s.stamina}`,{fontFamily:FONT,fontSize:10,color:'#222'});
    }
  }
  drawWrestlers(lr,er){this.drawBattleBases();const eX=235,eY=88,pX=82,pY=146,eStart=this.firstBattleDraw?GAME_W+42:eX,pStart=this.firstBattleDraw?-54:pX;const eimg=this.add.image(eStart,eY,'battle_'+er.asset).setScale(.58).setFlipX(true);const pimg=this.add.image(pStart,pY,'battle_'+lr.asset+'_back').setScale(.67);this.enemySprite=eimg;this.playerSprite=pimg;if(this.firstBattleDraw){this.tweens.add({targets:eimg,x:eX,duration:420,ease:'Cubic.Out'});this.tweens.add({targets:pimg,x:pX,duration:420,ease:'Cubic.Out',delay:110});this.personaFlash(eimg,430);this.personaFlash(pimg,540);}if(this.attackAnim==='enemy'){this.tweens.add({targets:eimg,x:'+=5',yoyo:true,repeat:3,duration:35});this.tweens.add({targets:pimg,x:'+=13',yoyo:true,duration:80,ease:'Cubic.Out'});this.cameras.main.flash(82,255,255,255);this.drawImpactBurst(eX,eY,this.moveStyle);}if(this.attackAnim==='player'){this.tweens.add({targets:pimg,x:'-=5',yoyo:true,repeat:3,duration:35});this.tweens.add({targets:eimg,x:'-=11',yoyo:true,duration:80,ease:'Cubic.Out'});this.cameras.main.shake(100,.006);this.drawImpactBurst(pX,pY,this.moveStyle);}if(this.attackAnim==='playerSetup'){this.personaFlash(pimg);this.drawImpactBurst(pX,pY,this.moveStyle);}if(this.attackAnim==='enemySetup'){this.personaFlash(eimg);this.drawImpactBurst(eX,eY,this.moveStyle);}if(this.attackAnim==='miss'){this.tweens.add({targets:[pimg,eimg],alpha:.65,yoyo:true,duration:55});this.drawMissWhiff(160,98);}if(this.impact){const t=this.add.text(160,78,this.impact,{fontFamily:FONT,fontSize:14,color:'#ffe28a',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5);this.tweens.add({targets:t,y:62,alpha:0,duration:550,ease:'Cubic.Out'});}this.attackAnim=null;}
  drawBattleBases(){const g=this.add.graphics();g.fillStyle(0x1b1d1f,.22);g.fillEllipse(236,111,116,28);g.fillEllipse(82,169,138,31);g.fillStyle(0xe9e2cd,1);g.fillEllipse(235,106,112,25);g.fillStyle(0xc9d0ca,1);g.fillEllipse(235,106,86,17);g.lineStyle(1,0x8a978f,.85);g.strokeEllipse(235,106,112,25);g.lineStyle(1,0xffffff,.35);g.strokeEllipse(235,102,84,12);g.fillStyle(0xe4d7ba,1);g.fillEllipse(83,163,136,30);g.fillStyle(0xc7b486,1);g.fillEllipse(83,163,103,20);g.lineStyle(1,0x8e7641,.9);g.strokeEllipse(83,163,136,30);g.lineStyle(1,0xffffff,.3);g.strokeEllipse(83,158,101,13);}
  drawImpactBurst(x,y,style='Shooter'){
    const colors={Shooter:0xfff2a4,Rider:0xb9a8ff,Scrambler:0xffb36b,Bull:0x8fe0a6,Wall:0xbdb6ff,Thrower:0x8fd0ff};
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
    if(this.mode==='resolving')return this.drawResolving();
    if(this.mode==='learnMove')return this.drawLearnMove();
    if(this.mode==='learnInspect')return this.drawLearnInspect();
    if(this.mode==='learnConfirm')return this.drawLearnConfirm();
    if(this.mode==='command')return this.drawCommand(lr);
    if(this.mode==='fight')return this.drawFight(lr);
    if(this.mode==='party')return this.drawParty();
    if(this.mode==='bag')return this.drawBag();
    return this.drawResult();
  }
  drawResolving(){this.drawTextBox(7,174,305,44);this.resolveText=this.add.text(18,183,'',{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold',wordWrap:{width:284},lineSpacing:3});}
  drawLearnMove(){
    const choice=this.moveLearn,mon=choice?.mon,move=MOVES[choice?.move];if(!mon||!move)return;
    this.drawTextBox(7,90,305,128);
    this.add.text(17,98,`${ROSTER[mon.id].name} wants to learn`,{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'});
    this.add.text(17,115,`NEW: ${move.name.toUpperCase()}`,{fontFamily:FONT,fontSize:11,color:'#8a1720',fontStyle:'bold'});
    this.add.text(17,129,'Choose a technique to forget.',{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold'});
    const options=[...mon.moves,null];
    options.forEach((key,i)=>this.add.text(18,143+i*15,`${i===this.sel?'\u25b6':' '} ${key?MOVES[key].name:'KEEP CURRENT MOVES'}`,{fontFamily:FONT,fontSize:11,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'}));
  }
  drawLearnInspect(){
    const choice=this.moveLearn,mon=choice?.mon,newMove=MOVES[choice?.move],oldMove=MOVES[mon?.moves?.[choice?.replaceIndex]];if(!mon||!newMove||!oldMove)return;
    const stats=move=>`${move.style.toUpperCase()}  PWR ${move.power||'--'}  ACC ${Math.round(move.acc*100)}%  STA ${move.stamina}`;
    this.drawTextBox(7,96,305,122);
    this.add.text(18,104,'CONFIRM TECHNIQUE CHANGE',{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'});
    this.add.text(18,126,`FORGET: ${oldMove.name.toUpperCase()}`,{fontFamily:FONT,fontSize:11,color:'#444',fontStyle:'bold'});
    this.add.text(18,141,stats(oldMove),{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
    this.add.text(18,160,`LEARN:  ${newMove.name.toUpperCase()}`,{fontFamily:FONT,fontSize:11,color:'#8a1720',fontStyle:'bold'});
    this.add.text(18,175,stats(newMove),{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold'});
    ['REPLACE','BACK'].forEach((label,i)=>this.add.text(62+i*143,199,`${i===this.sel?'\u25b6':' '} ${label}`,{fontFamily:FONT,fontSize:11,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'}));
  }
  drawLearnConfirm(){
    const move=MOVES[this.moveLearn?.move];if(!move)return;
    this.drawTextBox(35,137,250,76);
    this.add.text(48,148,`Skip ${move.name}?`,{fontFamily:FONT,fontSize:11,color:'#111',fontStyle:'bold'});
    this.add.text(48,166,'The new technique will be lost.',{fontFamily:FONT,fontSize:10,color:'#444',fontStyle:'bold'});
    ['YES','NO'].forEach((label,i)=>this.add.text(76+i*112,190,`${i===this.sel?'\u25b6':' '} ${label}`,{fontFamily:FONT,fontSize:11,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'}));
  }
  drawCommand(lr){
    if(this.combatState(lead(this.state)).recharging){this.drawTextBox(7,174,190,44);this.add.text(17,182,`${lr.name.split(' ')[0]} must reset`,{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'});this.add.text(17,200,'before wrestling again.',{fontFamily:FONT,fontSize:11,color:'#444',fontStyle:'bold'});this.drawCommandBox(202,174,110,44);this.add.text(216,189,'\u25b6 RESET',{fontFamily:FONT,fontSize:12,color:'#8a1720',fontStyle:'bold'});return;}
    this.drawTextBox(7,174,146,44);this.add.text(17,182,'What will',{fontFamily:FONT,fontSize:12,color:'#111'});this.add.text(17,200,`${lr.name.split(' ')[0]} do?`,{fontFamily:FONT,fontSize:12,color:'#111',fontStyle:'bold'});this.drawCommandBox(159,174,153,44);COMMANDS.forEach((t,i)=>this.add.text(168+(i%2)*72,182+(i>1?18:0),`${i===this.sel?'\u25b6':' '}${t}`,{fontFamily:FONT,fontSize:12,color:i===this.sel?'#8a1720':'#111',fontStyle:i===this.sel?'bold':'normal'}));
  }
  drawFight(r){
    this.drawCommandBox(7,174,205,44);this.drawCommandBox(216,174,96,44);
    const leadMon=lead(this.state),moves=leadMon?.moves||r.moves||[];
    moves.forEach((key,i)=>{const m=MOVES[key],x=16+(i%2)*98,y=182+(i>1?18:0),affordable=m.stamina<=0||m.stamina<=leadMon.stamina;this.add.text(x,y,`${i===this.sel?'\u25b6':' '}${m.name}`,{fontFamily:FONT,fontSize:12,color:i===this.sel?'#8a1720':affordable?'#111':'#999',fontStyle:i===this.sel?'bold':'normal'});});
    const mv=MOVES[moves[this.sel]];if(!mv)return;
    const sameForm=ROSTER[leadMon.id]?.style===mv.style,cost=mv.stamina<0?`+${Math.abs(mv.stamina)}`:`-${mv.stamina}`,power=mv.power>0?mv.power:'--';
    this.add.text(224,178,`${mv.style.toUpperCase()}${sameForm?'*':''}`,{fontFamily:FONT,fontSize:11,color:sameForm?'#8a1720':'#111',fontStyle:'bold'});
    this.add.text(224,193,`PWR ${power}  ACC ${Math.round(mv.acc*100)}%`,{fontFamily:FONT,fontSize:10,color:'#333'});
    this.add.text(224,205,`STA ${cost}`,{fontFamily:FONT,fontSize:10,color:'#355f87'});
  }
  drawBag(){this.drawTextBox(7,86,305,132);this.add.text(18,94,'BAG',{fontFamily:FONT,fontSize:13,color:'#111',fontStyle:'bold'});BAG_ITEMS.forEach((it,i)=>{const n=this.state.items?.[it.key]||0,x=18+(i>2?146:0),y=117+(i%3)*21;this.add.text(x,y,`${i===this.sel?'\u25b6':' '} ${ITEM_DEFS[it.key].short} x${n}`,{fontFamily:FONT,fontSize:11,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'});});const it=BAG_ITEMS[this.sel];if(it)this.add.text(18,188,it.desc,{fontFamily:FONT,fontSize:10,color:'#333',fontStyle:'bold',wordWrap:{width:284}});}
  drawParty(){this.drawTextBox(7,86,305,132);this.add.text(18,94,this.forcedSwap?'Choose next wrestler':'Choose wrestler',{fontFamily:FONT,fontSize:13,color:this.forcedSwap?'#b41820':'#111',fontStyle:'bold'});this.state.party.forEach((m,i)=>{const r=ROSTER[m.id],s=scaledStats(m.id,m.lvl,m),tag=m.hp<=0?' OUT':'';this.add.text(18,116+i*17,`${i===this.sel?'\u25b6':' '} ${r.name} L${m.lvl}  C ${m.hp}/${s.hp}${tag}`,{fontFamily:FONT,fontSize:11,color:i===this.sel?'#8a1720':m.hp<=0?'#888':'#111',fontStyle:'bold'});});}
  drawResult(){this.drawTextBox(7,174,305,44);const isWin=this.resultTitle==='VICTORY'||this.resultTitle==='JOINED';const g=this.add.graphics();g.fillStyle(isWin?0x7b1d2a:0x25313a,.92);g.fillRoundedRect(77,179,166,20,3);g.lineStyle(1,0xd6a336,.95);g.strokeRoundedRect(77,179,166,20,3);this.add.text(160,184,this.resultTitle,{fontFamily:FONT,fontSize:11,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5);const sub=this.type==='opening'?(this.resultTitle==='VICTORY'?`EXP +${this.expGain} / A CONTINUE`:'A CONTINUE'):this.resultTitle==='VICTORY'?`EXP +${this.expGain}`:'A/B RETURN';this.add.text(160,204,sub,{fontFamily:FONT,fontSize:9,color:'#111',fontStyle:'bold'}).setOrigin(.5);if(this.resultTitle==='VICTORY'){const star=this.add.text(282,187,'\u2605',{fontFamily:FONT,fontSize:16,color:'#d6a336',fontStyle:'bold',stroke:'#111',strokeThickness:2}).setOrigin(.5);this.tweens.add({targets:star,angle:360,scale:1.35,yoyo:true,duration:520,repeat:-1});}
    if(this.resultTitle==='VICTORY'&&this.progress){this.add.text(40,205,'EXP',{fontFamily:FONT,fontSize:9,color:'#355f87',fontStyle:'bold'});if(this.progress.played){this.drawExpBar(experienceProgress(this.progress.after),this.progress.after.lvl);}else{this.playProgress();}}
    }
  drawExpBar(p,lvl){const g=this.add.graphics();g.fillStyle(0x111111,1);g.fillRoundedRect(69,206,178,9,2);g.fillStyle(0x3aa5d1,1);g.fillRect(71,208,Math.max(1,174*Math.min(1,p)),5);g.lineStyle(1,0x080808,1);g.strokeRoundedRect(69,206,178,9,2);this.add.text(254,205,`Lv ${lvl}`,{fontFamily:FONT,fontSize:9,color:'#7b1d2a',fontStyle:'bold'});return g;}
  // FireRed victory payoff: the EXP bar fills segment by segment, each level
  // boundary dings + flashes, and a development (evolution) plays as its own
  // full ceremony afterward.
  playProgress(){
    const pr=this.progress;pr.played=true;
    const segs=[];let lvl=pr.before.lvl,xp=pr.before.xp;
    while(lvl<pr.after.lvl){segs.push({from:experienceProgress({id:pr.before.id,lvl,xp}),to:1,lvlUpTo:lvl+1});lvl++;xp=experienceAtLevel(pr.before.id,lvl);}
    segs.push({from:experienceProgress({id:pr.after.id,lvl,xp}),to:experienceProgress(pr.after),lvlUpTo:null});
    const g=this.add.graphics();
    const lvText=this.add.text(254,205,`Lv ${pr.before.lvl}`,{fontFamily:FONT,fontSize:9,color:'#7b1d2a',fontStyle:'bold'});
    const draw=p=>{if(!g.scene)return;g.clear();g.fillStyle(0x111111,1);g.fillRoundedRect(69,206,178,9,2);g.fillStyle(0x3aa5d1,1);g.fillRect(71,208,Math.max(1,174*Math.min(1,p)),5);g.lineStyle(1,0x080808,1);g.strokeRoundedRect(69,206,178,9,2);};
    const run=i=>{
      if(this.transitioning||!g.scene)return;
      if(i>=segs.length){if(pr.before.id!==pr.after.id)this.time.delayedCall(430,()=>this.developmentCeremony(pr));return;}
      const sgm=segs[i];const value={p:sgm.from};draw(value.p);
      this.tweens.add({targets:value,p:sgm.to,duration:Math.max(240,520*Math.max(.15,sgm.to-sgm.from)),ease:'Sine.Out',onUpdate:()=>draw(value.p),onComplete:()=>{
        if(sgm.lvlUpTo){this.playSafe('levelup');if(lvText.scene)lvText.setText(`Lv ${sgm.lvlUpTo}`);this.cameras.main.flash(90,255,240,180);this.time.delayedCall(300,()=>run(i+1));}
        else run(i+1);
      }});
    };
    run(0);
  }
  developmentCeremony(pr){
    if(this.transitioning)return;
    const oldR=ROSTER[pr.before.id],newR=ROSTER[pr.after.id];
    this.playSafe('open');
    const dim=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.85).setDepth(500);
    const img=this.add.image(GAME_W/2,92,'battle_'+newR.asset+'_back').setScale(.82).setDepth(501);
    const box=this.drawTextBox(7,174,305,44);box.setDepth(502);
    const txt=this.add.text(18,184,'',{fontFamily:FONT,fontSize:10,color:'#111',fontStyle:'bold',wordWrap:{width:284},lineSpacing:4}).setDepth(503);
    this.typeText(txt,`What? ${oldR.name} is developing...`);
    let pulses=0;
    const pulse=()=>{if(this.transitioning||!img.scene)return;img.setTintFill(0xfff3d0);this.time.delayedCall(150,()=>{if(img.scene)img.clearTint();});pulses++;if(pulses<4)this.time.delayedCall(380,pulse);};
    pulse();
    this.tweens.add({targets:img,scale:.94,yoyo:true,repeat:3,duration:360,ease:'Sine.InOut'});
    this.time.delayedCall(1750,()=>{
      if(this.transitioning||!txt.scene)return;
      this.playSafe('badge');this.cameras.main.flash(170,255,243,208);
      this.tweens.add({targets:img,scale:1.02,duration:260,ease:'Back.Out'});
      this.typeText(txt,`${oldR.name} developed into ${newR.name}! The ${personaFor(pr.after.id)} spirit grows stronger!`);
    });
  }
  captureMeters(playerHp,playerGas,enemyHp){const l=lead(this.state);return {playerHp:l?playerHp/scaledStats(l.id,l.lvl,l).hp:1,playerGas:l?playerGas/scaledStats(l.id,l.lvl,l).stamina:1,enemyHp:enemyHp/scaledStats(this.enemy().id,this.enemy().lvl,this.enemy()).hp};}
  drawAnimatedMeter(x,y,w,h,start,end,color){const g=this.add.graphics();const value={p:Phaser.Math.Clamp(start??end,0,1)};const draw=()=>{const p=Phaser.Math.Clamp(value.p,0,1);g.clear();g.fillStyle(0x111111,1);g.fillRoundedRect(x-1,y-1,w+2,h+2,1);g.fillStyle(0x3d3d3d,1);g.fillRect(x,y,w,h);g.fillStyle(p<.22?0xd84c35:p<.5?0xd6b545:color,1);g.fillRect(x,y,Math.max(1,w*p),h);g.fillStyle(0xffffff,.3);g.fillRect(x,y,Math.max(1,w*p),1);g.lineStyle(1,0x080808,1);g.strokeRect(x-1,y-1,w+2,h+2);};draw();if(start!==undefined&&Math.abs(start-end)>.01){this.tweens.add({targets:value,p:Phaser.Math.Clamp(end,0,1),duration:520,ease:'Sine.Out',onUpdate:draw,onComplete:()=>{this.prevMeters=null;}});}return g;}
  drawTextBox(x,y,w,h){const g=this.add.graphics();g.fillStyle(0x000000,.35);g.fillRoundedRect(x+3,y+3,w,h,4);g.fillStyle(0xf8f0d8,1);g.fillRoundedRect(x,y,w,h,4);g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,4);g.lineStyle(1,0xffffff,.45);g.strokeRoundedRect(x+2,y+2,w-4,h-4,3);g.lineStyle(1,0x847868,1);g.strokeRoundedRect(x+4,y+4,w-8,h-8,2);return g;}
  drawCommandBox(x,y,w,h){const g=this.drawTextBox(x,y,w,h);g.fillStyle(0x7b1d2a,.9);g.fillRect(x+6,y+4,w-12,1);g.lineStyle(1,0xd6a336,.75);g.strokeRoundedRect(x+6,y+6,w-12,h-12,2);return g;}
  drawArenaBackdrop(){this.add.image(0,0,'battle_arena').setOrigin(0).setDisplaySize(GAME_W,GAME_H);const g=this.add.graphics();g.fillStyle(0xffffff,.05);g.fillRect(0,0,GAME_W,86);g.fillStyle(0x000000,.10);g.fillRect(0,166,GAME_W,58);g.lineStyle(3,0x7b1d2a,.9);g.strokeEllipse(160,128,232,70);g.lineStyle(1,0xd6a336,.55);g.strokeEllipse(160,128,191,55);g.lineStyle(1,0xffffff,.32);g.strokeEllipse(160,128,136,39);}
  playBattleIntro(){this.inputLocked=true;this.mode='resolving';this.sel=0;const cover=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x000000,1).setDepth(999);this.tweens.add({targets:cover,alpha:0,duration:420,ease:'Cubic.Out',onComplete:()=>{cover.destroy();if(this.over)return;this.drawBattle();this.setResolveText(this.log[0]||'');this.time.delayedCall(900,()=>{if(this.over)return;this.inputLocked=false;this.mode='command';this.sel=0;this.drawBattle();});}});}
  returnMap(){if(this.transitioning)return;this.transitioning=true;const cover=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x000000,0).setDepth(999);this.tweens.add({targets:cover,alpha:1,duration:260,ease:'Sine.In',onComplete:()=>this.scene.start(this.type==='opening'?'OpeningRecoveryScene':'OverworldScene')});}
}
