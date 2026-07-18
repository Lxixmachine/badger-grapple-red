import {ROSTER,allMovesSpent,battleFlipXFor,battleTextureFor,currentMoveStamina,makeMon,scaledStats,addXp,applyPendingDevelopment,personaFor,resolvePendingMove,wrestlerName} from '../data/roster.js';import {distributeDefeatExperience,experienceAtLevel,experienceProgress} from '../data/experience.js';import {MOVES,moveStaminaMax} from '../data/moves.js';import {canonicalBadge} from '../data/campaign.js';import {loadState,saveState,lead} from '../systems/save.js';import {attemptRecruit,awardEffortForDefeat,BAG_ORDER,chooseAiMove,clearTurnFlags,consumeActionBlock,createBattleState,ITEM_DEFS,normalizeWrestler,resolveTechnique,restoreParty,restoreTechniqueStamina,turnOrder,useFilmStudy} from '../systems/mechanics.js';import {FONT,setVirtualHandler} from '../systems/ui.js';import {unlockAudio,sfx,playMusic,stopMusic,setMuted} from '../systems/audio.js';
const Phaser = window.Phaser;
const GAME_W=480,GAME_H=320,ARENA_H=238,BOTTOM_Y=238;
const ENEMY_POS={x:370,y:158},PLAYER_POS={x:112,y:233};
const COMMANDS=['FIGHT','BAG','WRESTLER','RUN'];
const BAG_ITEMS=BAG_ORDER.map(key=>({key,name:ITEM_DEFS[key].name,desc:ITEM_DEFS[key].description,kind:ITEM_DEFS[key].kind}));
export class BattleScene extends Phaser.Scene{
  constructor(){super('BattleScene');}
  create(data={}){
    this.cameras.main.setViewport(0,0,GAME_W,GAME_H);this.cameras.main.setZoom(1);this.cameras.main.centerOn(GAME_W/2,GAME_H/2);this.cameras.main.setRoundPixels(true);
    this.state=loadState();
    setMuted(this.state.audioMuted);playMusic('battle');unlockAudio();
    this.type=data.battleType||'wild';
    const team=data.team&&data.team.length?data.team:[[data.enemyId||'pacesetter',data.enemyLevel||4]];
    this.enemyTeam=data.enemyMon?[normalizeWrestler({...data.enemyMon})]:team.map(([id,lvl])=>makeMon(id,lvl));
    this.enemyIdx=0;
    this.trainerName=data.trainerName||null;
    this.reward=data.reward||null;
    this.badge=data.badge||null;
    this.defeatKey=data.defeatKey||null;
    this.tournamentRound=Number.isInteger(data.tournamentRound)?data.tournamentRound:null;
    this.roundLabel=data.roundLabel||null;
    this.winMsg=data.winMsg||null;
    this.beatenMsg=data.beatenMsg||null;
    this.turn=1;this.sel=0;this.mode='command';this.battlePhase='intro';this.battlePhaseHistory=['intro'];this.introStage='transition';this.postBattleStage='';this.over=false;this.recruit=false;this.forcedSwap=false;this.preOpponentSwitch=false;this.pendingOpponentIndex=null;this.impact='';this.resultTitle='';this.messageTimer=0;this.moveLearn=null;this.pendingNickname=null;
    this.firstBattleDraw=true;this.transitioning=false;this.prevMeters=null;this.attackAnim=null;this.attackSide=null;this.moveStyle='';this.moveCategory='';this.lastChooseAt=0;this.inputLocked=true;
    this.battleStates=new WeakMap();this.awardedEnemies=new WeakSet();this.rewardEvent=null;this.rewardHistory=[];this.rewardViewLevel=null;this.rewardViewProgress=0;this.rewardViewHp=0;this.rewardText='';this.levelSummary=null;this.developmentEvent=null;this.finalizingBattle=false;
    const openLine=this.type==='opening'
      ?`${this.trainerName||'Rex'} takes the mat as the ${personaFor(this.enemy().id)}!`
      :this.type==='wild'?`${wrestlerName(this.enemy())} takes the mat as the ${personaFor(this.enemy().id)}!`:`${this.trainerName||'Opponent'} sends out ${wrestlerName(this.enemy())} - ${personaFor(this.enemy().id)} form!`;
    this.log=[openLine];
    const l=lead(this.state);if(l){const s=scaledStats(l.id,l.lvl,l);if(!Number.isFinite(l.hp)||l.hp<=0)l.hp=s.hp;l.score=0;}this.participants=new Set(l?[l]:[]);this.enemyTeam.forEach(e=>e.score=0);
    this.state.stats={scouts:0,battles:0,wins:0,recruits:0,streak:0,...(this.state.stats||{})};this.state.stats.battles++;saveState(this.state);
    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1,0));this.input.keyboard.on('keydown-RIGHT',()=>this.move(1,0));this.input.keyboard.on('keydown-UP',()=>this.move(0,-1));this.input.keyboard.on('keydown-DOWN',()=>this.move(0,1));
    this.input.keyboard.on('keydown-ENTER',()=>this.choose());this.input.keyboard.on('keydown-SPACE',()=>this.choose());this.input.keyboard.on('keydown-ESC',()=>this.back());
    setVirtualHandler(this);this.playBattleIntro();
  }
  enemy(){return this.enemyTeam[this.enemyIdx];}
  combatState(mon,reset=false){if(!mon)return createBattleState();if(reset||!this.battleStates.has(mon))this.battleStates.set(mon,createBattleState());return this.battleStates.get(mon);}
  clearBattleTurn(){clearTurnFlags(this.combatState(lead(this.state)),this.combatState(this.enemy()));}
  battleDebugState(){const l=lead(this.state);return {player:l?this.combatState(l):null,enemy:this.enemy()?this.combatState(this.enemy()):null};}
  setBattlePhase(phase){this.battlePhase=phase;if(this.battlePhaseHistory?.at(-1)!==phase)this.battlePhaseHistory.push(phase);}
  opponentName(){return this.trainerName||'Opponent';}
  introSequence(){
    const player=wrestlerName(lead(this.state),{short:true}),enemy=wrestlerName(this.enemy(),{short:true});
    if(this.type==='wild')return [
      {stage:'enemySend',phase:'wild-appears',text:`A scouting prospect, ${enemy}, takes the mat!`,duration:1500},
      {stage:'playerSend',phase:'player-send-out',text:`${player}, take the mat!`,duration:1450}
    ];
    const challenge=this.type==='opening'
      ?`${this.opponentName()} challenges you for the lineup spot!`
      :`${this.opponentName()} challenges you to a match!`;
    return [
      {stage:'challenge',phase:'trainer-challenge',text:challenge,duration:1650},
      {stage:'enemySend',phase:'opponent-send-out',text:`${this.opponentName()} sends out ${enemy}!`,duration:1500},
      {stage:'playerSend',phase:'player-send-out',text:`${player}, take the mat!`,duration:1450}
    ];
  }
  runIntroSequence(index=0){
    const steps=this.introSequence();
    if(index>=steps.length){
      this.firstBattleDraw=false;this.introStage='complete';this.inputLocked=false;this.mode='command';this.sel=0;this.setBattlePhase('command');this.drawBattle();return;
    }
    const step=steps[index];
    this.mode='intro';this.introStage=step.stage;this.setBattlePhase(step.phase);this.drawBattle();this.typeText(this.resolveText,step.text,17);
    this.time.delayedCall(step.duration,()=>{if(this.scene.isActive()&&!this.over)this.runIntroSequence(index+1);});
  }
  runPostBattleSequence(lines,onDone=()=>this.showBattleResult()){
    const queue=lines.filter(Boolean);let index=0;
    const next=()=>{
      if(!this.scene.isActive())return;
      if(index>=queue.length){this.postBattleStage='complete';return onDone();}
      this.postBattleStage=index===0?'decision':'response';this.mode='postBattle';this.inputLocked=true;this.setBattlePhase('post-battle-message');this.drawBattle();
      const line=queue[index++];this.typeText(this.resolveText,line,17);
      this.time.delayedCall(Phaser.Math.Clamp(line.length*24+520,1200,1850),next);
    };
    next();
  }
  winPresentationLines(grit,rep,badgeName,badgeEarned){
    const player=this.state.playerName||'Walk-On';
    if(this.type==='wild')return [`${wrestlerName(this.enemy(),{short:true})} is out. The scouting match is over.`];
    const lines=[`${player} defeated ${this.opponentName()}!`];
    if(this.type==='opening')lines.push('Rex: You earned the lineup spot. For now.');
    else if(this.beatenMsg)lines.push(this.beatenMsg);
    else if(this.winMsg)lines.push(this.winMsg);
    else lines.push(`${this.opponentName()}: You earned that match.`);
    if(grit||rep)lines.push(`The win earned ${grit} Grit and ${rep} Rep.`);
    if(badgeEarned)lines.push(`${badgeName} received!`);
    return lines;
  }
  lossPresentationLines(){
    const player=this.state.playerName||'Walk-On';
    if(this.type==='opening')return [`${player} lost the wrestle-off to Rex.`,'Rex: The first result is not the last word.','Report to the Trainer\'s Room.'];
    return [`${player} lost to ${this.opponentName()}.`,'The Trainer restored the travel lineup.'];
  }
  handleVirtualButton(k){unlockAudio();if(k==='a'&&this.inputLocked&&this.typeTimer)return this.finishTypeText();if(k==='left')this.move(-1,0);if(k==='right')this.move(1,0);if(k==='up')this.move(0,-1);if(k==='down')this.move(0,1);if(k==='a')this.choose();if(k==='b')this.back();}
  count(){if(this.mode==='fight'){const l=lead(this.state);return (l?.moves||ROSTER[l?.id]?.moves||[]).length||1;}if(this.mode==='party')return Math.max(1,this.state.party.length);if(this.mode==='bag')return BAG_ITEMS.length;if(this.mode==='learnMove')return (this.moveLearn?.mon?.moves?.length||0)+1;if(this.mode==='learnInspect'||this.mode==='learnConfirm'||this.mode==='switchPrompt')return 2;return 4;}
  move(dx,dy){if(this.over||this.inputLocked)return;const old=this.sel;let cols=this.mode==='party'||this.mode==='learnMove'?1:2;let rows=Math.ceil(this.count()/cols);let x=old%cols,y=Math.floor(old/cols);if(dx)x=Phaser.Math.Wrap(x+dx,0,cols);if(dy)y=Phaser.Math.Wrap(y+dy,0,rows);this.sel=Math.min(y*cols+x,this.count()-1);this.impact='';this.drawBattle();}
  choose(){const now=this.time.now||performance.now();if(this.inputLocked)return;if(now-this.lastChooseAt<160)return;this.lastChooseAt=now;if(this.over)return this.returnMap();if(this.mode==='command')return this.chooseCommand();if(this.mode==='fight')return this.chooseMove();if(this.mode==='party')return this.chooseParty();if(this.mode==='bag')return this.chooseBag();if(this.mode==='learnMove')return this.chooseLearnMove();if(this.mode==='learnInspect')return this.chooseLearnInspect();if(this.mode==='learnConfirm')return this.chooseLearnConfirm();if(this.mode==='switchPrompt')return this.chooseSwitchPrompt();}
  back(){if(this.inputLocked)return;if(this.over)return this.returnMap();if(this.mode==='learnInspect'){this.mode='learnMove';this.sel=this.moveLearn?.replaceIndex??0;return this.drawBattle();}if(this.mode==='learnConfirm'){this.mode='learnMove';this.sel=0;return this.drawBattle();}if(this.mode==='learnMove')return this.confirmStopLearning();if(this.preOpponentSwitch&&this.mode==='party'){this.preOpponentSwitch=false;this.mode='switchPrompt';this.sel=0;return this.drawBattle();}if(this.forcedSwap)return;if(this.mode!=='command'){this.mode='command';this.sel=0;this.drawBattle();}}
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
    const wrestler=wrestlerName(choice.mon),move=MOVES[choice.move].name;
    const line=result.learned?`${wrestler} forgot ${MOVES[result.forgotten].name} and learned ${move}!`:`${wrestler} did not learn ${move}.`;
    const onDone=choice.onDone;this.moveLearn=null;this.inputLocked=true;this.mode='resolving';this.sel=0;saveState(this.state);this.drawBattle();
    this.playResolveSequence([line],()=>this.resolvePendingMoves(onDone));
  }
  chooseCommand(){const l=lead(this.state);if(l&&this.combatState(l).recharging)return this.resolveTurn(null);const cmd=COMMANDS[this.sel];if(cmd==='FIGHT'){this.mode='fight';this.sel=0;this.drawBattle();return;}if(cmd==='BAG'){this.mode='bag';this.sel=0;this.drawBattle();return;}if(cmd==='WRESTLER'){this.mode='party';this.sel=this.state.active||0;this.drawBattle();return;}if(cmd==='RUN'){if(this.type==='wild'){this.addLog(['Got away safely.']);this.over=true;this.resultTitle='LEFT';this.recruit=false;stopMusic();this.drawBattle();}else{this.addLog(['You cannot run from this match.']);this.drawBattle();}}}
  chooseMove(){const l=lead(this.state);if(!l)return this.returnMap();const key=(l.moves||ROSTER[l.id]?.moves||[])[this.sel];if(!key)return;if(currentMoveStamina(l,key)<=0){if(allMovesSpent(l))return this.resolveTurn('desperation');this.addLog([`No Stamina left for ${MOVES[key].name}.`]);this.drawBattle();return;}this.resolveTurn(key);}
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
      const restored=restoreTechniqueStamina(l,10);if(!restored)msg='Every technique already has full Stamina.';else{this.state.items.sportsDrink--;msg=`${wrestlerName(l)}'s techniques recovered ${restored} Stamina.`;}
    }else if(item.key==='athleticTape'){
      const max=scaledStats(l.id,l.lvl,l).hp;if(l.hp>=max)msg='Condition is already full.';else{l.hp=Phaser.Math.Clamp(l.hp+20,0,max);this.state.items.athleticTape--;msg=`${wrestlerName(l)} recovered Condition.`;}
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
      this.pendingNickname={container:result.destination,index:this.state[result.destination].indexOf(result.recruit),targetId:result.recruit.id};
      this.state.message=`${r.name} joined the room!`;saveState(this.state);
      return `${r.name} accepted the ${ITEM_DEFS[singletKey].name.toLowerCase()} and joined!`;
    }
    return `${r.name} declined the singlet.`;
  }
  chooseParty(){
    if(!this.state.party.length)return;
    const picked=this.state.party[this.sel];if(!picked)return;
    if(picked.hp<=0){this.addLog([`${wrestlerName(picked)} cannot wrestle right now.`]);this.drawBattle();return;}
    const idx=this.state.party.indexOf(picked);
    if(idx<0)return;
    const wasForced=this.forcedSwap,wasPreOpponent=this.preOpponentSwitch;
    if(idx===0&&!wasForced){this.addLog([`${wrestlerName(picked)} is already wrestling.`]);this.mode=wasPreOpponent?'switchPrompt':'command';this.preOpponentSwitch=false;this.sel=0;this.drawBattle();return;}
    if(idx>0){this.state.party.splice(idx,1);this.state.party.unshift(picked);}
    this.state.active=0;
    this.combatState(picked,true);
    this.participants.add(picked);
    saveState(this.state);
    this.addLog([`${wrestlerName(picked)} steps onto the mat!`]);
    this.mode='command';this.sel=0;
    if(wasForced){this.forcedSwap=false;this.drawBattle();return;}
    if(wasPreOpponent){this.preOpponentSwitch=false;this.sendNextOpponent();return;}
    this.enemyOnlyStrike();
  }
  chooseSwitchPrompt(){
    if(this.sel===0){
      this.preOpponentSwitch=true;this.mode='party';this.sel=Math.max(0,this.state.party.findIndex((mon,index)=>index>0&&mon.hp>0));this.drawBattle();return;
    }
    this.sendNextOpponent();
  }
  offerNextOpponent(){
    this.pendingOpponentIndex=this.enemyIdx+1;
    const canSwitch=this.type!=='wild'&&this.state.party.some((mon,index)=>index>0&&mon.hp>0);
    if(!canSwitch)return this.sendNextOpponent();
    this.inputLocked=false;this.mode='switchPrompt';this.sel=0;this.setBattlePhase('switch-prompt');this.drawBattle();
  }
  sendNextOpponent(){
    const nextIndex=this.pendingOpponentIndex??(this.enemyIdx+1);
    if(nextIndex>=this.enemyTeam.length){this.pendingOpponentIndex=null;return this.win();}
    this.enemyIdx=nextIndex;this.pendingOpponentIndex=null;const next=this.enemy();this.combatState(next,true);
    const current=lead(this.state);this.participants=new Set(current?[current]:[]);
    this.impact='';this.attackAnim=null;this.prevMeters=null;this.inputLocked=true;this.mode='resolving';this.setBattlePhase('opponent-send-out');this.drawBattle();
    const line=`${this.trainerName||'Opponent'} sends out ${wrestlerName(next)} - ${personaFor(next.id)} form!`;
    this.setResolveText(line);this.addLog([`${this.trainerName||'Opponent'} sends out ${wrestlerName(next)}!`]);
    if(this.enemySprite&&this.enemySprite.scene){this.enemySprite.x=GAME_W+80;this.enemySprite.setAlpha(1);this.tweenSpritePixels(this.enemySprite,{x:ENEMY_POS.x,duration:520,ease:'Cubic.Out'});this.personaFlash(this.enemySprite,520);}
    this.time.delayedCall(1180,()=>{if(this.over)return;this.inputLocked=false;this.mode='command';this.setBattlePhase('command');this.sel=0;saveState(this.state);this.drawBattle();});
  }
  enemyOnlyStrike(){
    const l=lead(this.state),e=this.enemy();
    this.inputLocked=true;this.mode='resolving';this.impact='';this.attackAnim=null;this.attackSide=null;this.moveStyle='';this.moveCategory='';this.prevMeters=null;this.drawBattle();
    const ek=chooseAiMove(e,l,{wild:this.type==='wild',attackerState:this.combatState(e),defenderState:this.combatState(l)});
    this.attackBeat({att:e,def:l,key:ek,attName:wrestlerName(e,{short:true}),defIsEnemy:false,
      onKO:()=>{this.clearBattleTurn();this.inputLocked=false;this.playerDown();},
      onDone:()=>{this.clearBattleTurn();this.turn++;this.inputLocked=false;this.mode='command';this.sel=0;saveState(this.state);this.drawBattle();}});
  }
  // v21.14 Battle Drama: every attack is a two-beat FireRed sequence -
  // announce ("BUCKY used SINGLE LEG!" typed out, attacker lunges), then
  // impact (damage number, defender flicker + knockback, HP drain), with
  // faint and send-out beats when a wrestler goes down.
  typeText(t,str,speed=19){if(this.typeTimer)this.typeTimer.remove(false);this.typeTarget=t;this.typeFull=str;let i=0;t.setText('');this.typeTimer=this.time.addEvent({delay:speed,repeat:Math.max(0,str.length-1),callback:()=>{i++;if(t&&t.scene)t.setText(str.slice(0,i));if(i>=str.length)this.typeTimer=null;}});}
  finishTypeText(){if(this.typeTimer)this.typeTimer.remove(false);this.typeTimer=null;if(this.typeTarget?.scene)this.typeTarget.setText(this.typeFull||'');}
  setResolveText(str){if(!this.resolveText||!this.resolveText.scene){if(this.mode!=='intro'&&this.mode!=='postBattle')this.mode='resolving';this.drawBattle();}this.typeText(this.resolveText,str);}
  playResolveSequence(lines,onDone){
    const queue=lines.filter(Boolean);let index=0;
    const next=()=>{if(this.over)return;if(index>=queue.length)return onDone();const line=queue[index++];this.setBattlePhase('message');this.setResolveText(line);const dwell=Phaser.Math.Clamp(line.length*22+420,860,1320);this.time.delayedCall(dwell,next);};
    next();
  }
  effectLine(event,attName,defName){
    const name=event.target==='attacker'?attName:defName;
    const stat={attack:'Strength',defense:'Defense',technique:'Technique',awareness:'Awareness',speed:'Speed',accuracy:'Accuracy'}[event.stat]||event.stat;
    if(event.type==='multiHit')return `Hit ${event.hits} times!`;
    if(event.type==='counter')return `${attName} caught the opening with a re-attack!`;
    if(event.type==='staminaDrain')return `${event.moveName} lost ${event.amount} Stamina!`;
    if(event.type==='recoil')return `${attName} took ${event.amount} recoil!`;
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
      this.setBattlePhase('message');this.addLog([line]);this.setResolveText(line);this.playSafe('talk');this.time.delayedCall(980,onDone);return;
    }
    const actualKey=key!=='desperation'&&currentMoveStamina(att,key)<=0&&allMovesSpent(att)?'desperation':(key||'stall');
    const mv=MOVES[actualKey]||MOVES.stall;
    const announcement=actualKey!==key?`${attName} has no Stamina - DESPERATION SHOT!`:`${attName} used ${mv.name.toUpperCase()}!`;
    this.setBattlePhase('announce');this.setResolveText(announcement);
    const attacker=defIsEnemy?this.playerSprite:this.enemySprite;
    this.playSafe('talk');
    const announceDuration=Phaser.Math.Clamp(announcement.length*18+390,820,1080);
    this.time.delayedCall(Math.max(280,announceDuration-500),()=>{
      if(attacker&&attacker.scene)this.playTechniqueWindup(attacker,mv.style,defIsEnemy);
    });
    this.time.delayedCall(announceDuration,()=>{
      if(this.over)return;
      const l=lead(this.state);
      const beforeDefHp=def.hp;
      const res=this.resolve(att,def,actualKey,attName);
      this.setBattlePhase('impact');
      this.prevMeters=defIsEnemy?this.captureMeters(l.hp,beforeDefHp):this.captureMeters(beforeDefHp,this.enemy().hp);
      this.moveStyle=res.result.move.style;
      this.moveCategory=res.result.move.category;
      this.attackSide=defIsEnemy?'player':'enemy';
      this.impact=res.hit?(res.dmg>0?`-${res.dmg}`:'SET'):'MISS';
      this.attackAnim=res.hit?(res.dmg>0?(defIsEnemy?'enemy':'player'):(defIsEnemy?'playerSetup':'enemySetup')):'miss';
      this.addLog([res.line]);
      this.drawBattle();
      this.setResolveText(announcement);
      const feedback=res.hit?[res.dmg>0?`Landed for ${res.dmg} Condition!`:`${attName} changed the position.`,...this.resultMessages(res.result,attName,wrestlerName(def,{short:true}))]:[`It slipped - no contact.`];
      this.time.delayedCall(res.dmg>0?560:430,()=>this.playResolveSequence(feedback,()=>{
        if(this.over)return;
        if(def.hp<=0)return this.faintBeat(defIsEnemy,onKO);
        if(att.hp<=0)return this.faintBeat(!defIsEnemy,()=>defIsEnemy?this.playerDown():this.enemyDown());
        this.setBattlePhase('between');this.time.delayedCall(300,onDone);
      }));
    });
  }
  faintBeat(defIsEnemy,onKO){
    const mon=defIsEnemy?this.enemy():lead(this.state);
    const name=wrestlerName(mon);
    const target=defIsEnemy?this.enemySprite:this.playerSprite;
    this.setBattlePhase('faint');this.setResolveText(`${name} is out!`);
    this.addLog([`${name} is out.`]);
    if(target&&target.scene)this.tweenSpritePixels(target,{y:'+=28',alpha:0,duration:430,ease:'Quad.In'});
    this.playSafe('lose');
    this.time.delayedCall(840,()=>{if(!this.over)onKO();});
  }
  playSafe(kind){try{if(sfx[kind])sfx[kind]();}catch{}}
  playTechniqueSound(style,phase){try{sfx.technique?.(style,phase);}catch{}}
  tweenSpritePixels(sprite,config){
    const onUpdate=config.onUpdate;
    return this.tweens.add({...config,targets:sprite,onUpdate:(tween,target)=>{
      target.x=Math.round(target.x);target.y=Math.round(target.y);target.setScale(1);target.setAngle(0);
      if(onUpdate)onUpdate(tween,target);
    }});
  }
  techniqueColor(style){return {Shooter:0xfff2a4,Rider:0xb9a8ff,Scrambler:0xffb36b,Bull:0x8fe0a6,Wall:0xbdb6ff,Thrower:0x8fd0ff}[style]||0xfff2a4;}
  playTechniqueWindup(sprite,style,isPlayer){
    const direction=isPlayer?1:-1;
    const motion={Shooter:[48,8],Rider:[24,-5],Scrambler:[34,-15],Bull:[56,1],Wall:[-12,0],Thrower:[31,-19]}[style]||[34,0];
    this.playTechniqueSound(style,'windup');
    this.drawMotionTrail(sprite.x,sprite.y-58,sprite.x+motion[0]*direction,sprite.y-58+motion[1],style,.55);
    this.tweenSpritePixels(sprite,{x:`+=${motion[0]*direction}`,y:`+=${motion[1]}`,duration:210,yoyo:true,ease:style==='Bull'?'Expo.In':'Cubic.InOut'});
  }
  playTechniqueImpact(attacker,target,style){
    const playerAttacks=attacker===this.playerSprite,direction=playerAttacks?1:-1;
    const force={Shooter:[28,16,.008],Rider:[18,10,.007],Scrambler:[31,14,.006],Bull:[40,25,.013],Wall:[12,9,.005],Thrower:[27,22,.011]}[style]||[24,14,.008];
    this.drawMotionTrail(attacker.x,attacker.y-58,target.x,target.y-70,style,.82);
    this.drawImpactBurst(target.x,target.y-70,style);
    this.tweenSpritePixels(attacker,{x:`+=${force[0]*direction}`,y:style==='Thrower'?'-=13':style==='Scrambler'?'-=8':'+=0',duration:75,yoyo:true,hold:70,ease:'Cubic.Out'});
    target.setTintFill(0xfff7da);
    this.cameras.main.flash(70,255,247,218,false);
    this.time.delayedCall(72,()=>{
      if(target.scene){target.clearTint();this.tweenSpritePixels(target,{x:`+=${force[1]*direction}`,alpha:.48,duration:72,yoyo:true,repeat:1,ease:'Quad.Out'});}
    });
  }
  playTechniqueSetup(sprite,style){
    this.personaFlash(sprite);
    this.drawImpactBurst(sprite.x,sprite.y-70,style);
    this.tweenSpritePixels(sprite,{y:'-=6',yoyo:true,duration:180,ease:'Back.Out'});
  }
  playTechniqueMiss(attacker,style){
    const direction=attacker===this.playerSprite?1:-1;
    this.drawMotionTrail(attacker.x,attacker.y-58,attacker.x+66*direction,attacker.y-68,style,.38);
    this.drawMissWhiff(240,126);
    this.tweenSpritePixels(attacker,{x:`+=${44*direction}`,y:'-=8',alpha:.52,duration:100,yoyo:true,ease:'Cubic.Out'});
  }
  drawMotionTrail(x1,y1,x2,y2,style,alpha=.7){
    const color=this.techniqueColor(style),g=this.add.graphics().setDepth(65);
    g.lineStyle(style==='Bull'?7:4,color,alpha);g.lineBetween(x1,y1,x2,y2);
    g.lineStyle(2,0xffffff,alpha*.72);g.lineBetween(x1,y1-5,x2,y2-5);
    if(style==='Scrambler'){g.lineStyle(2,color,alpha*.7);g.beginPath();g.arc((x1+x2)/2,(y1+y2)/2,24,.1,5.4,false);g.strokePath();}
    this.tweens.add({targets:g,alpha:0,duration:300,ease:'Cubic.Out',onComplete:()=>g.destroy()});
  }
  personaFlash(sprite,delay=0){if(!sprite)return;this.time.delayedCall(delay,()=>{if(!sprite.scene)return;sprite.setTintFill(0xfff3d0);this.time.delayedCall(150,()=>{if(sprite.scene)sprite.clearTint();});});}
  resolveTurn(key){
    const l=lead(this.state),e=this.enemy();
    this.inputLocked=true;this.mode='resolving';this.impact='';this.attackAnim=null;this.prevMeters=null;this.drawBattle();
    const playerState=this.combatState(l),enemyState=this.combatState(e);
    const ek=chooseAiMove(e,l,{wild:this.type==='wild',attackerState:enemyState,defenderState:playerState});
    const order=turnOrder(l,e,key,ek,{playerState,enemyState});
    const finish=()=>{this.clearBattleTurn();this.turn++;this.inputLocked=false;this.mode='command';this.setBattlePhase('command');this.sel=0;saveState(this.state);this.drawBattle();};
    const act=(role,onDone)=>{
      const playerTurn=role==='player',att=playerTurn?l:e,def=playerTurn?e:l,move=playerTurn?key:ek;
      this.attackBeat({att,def,key:move,attName:wrestlerName(att,{short:true}),defIsEnemy:playerTurn,
        onKO:()=>{this.clearBattleTurn();this.inputLocked=false;if(playerTurn)this.enemyDown();else this.playerDown();},onDone});
    };
    act(order[0],()=>act(order[1],finish));
  }
  resolve(att,def,key,label){const result=resolveTechnique(att,def,key,Math.random,{attackerState:this.combatState(att),defenderState:this.combatState(def)});const mv=result.move;if(!result.hit){sfx.miss();return {result,line:`${label} missed ${mv.name}.`,hit:false,dmg:0};}if(result.damage>0){sfx.hit();this.playTechniqueSound(mv.style,'impact');}else{this.playSafe('talk');this.playTechniqueSound(mv.style,'setup');}return {result,line:result.damage>0?`${label}: ${mv.name} ${result.damage}${result.multiplier>1?' EDGE':''}${result.critical?' CRITICAL':''}.`:`${label} set ${mv.name}.`,hit:true,dmg:result.damage};}
  wrestlerSnapshot(mon){return {id:mon.id,lvl:mon.lvl,xp:mon.xp,hp:mon.hp,nickname:mon.nickname,moves:[...(mon.moves||[])]};}
  awardEnemyXp(defeated){
    if(!defeated||this.awardedEnemies.has(defeated))return [];
    this.awardedEnemies.add(defeated);
    const {awards}=distributeDefeatExperience({defeated,party:this.state.party,participants:[...this.participants],trainerBattle:this.type!=='wild'});
    const events=awards.map(({mon,amount,participated,viaExpShare})=>{
      awardEffortForDefeat(mon,defeated);const before=this.wrestlerSnapshot(mon),messages=addXp(mon,amount,{deferDevelopment:true}),after=this.wrestlerSnapshot(mon);
      const levelSteps=[];
      for(let level=before.lvl+1;level<=after.lvl;level++)levelSteps.push({level,beforeStats:scaledStats(before.id,level-1,mon),afterStats:scaledStats(before.id,level,mon)});
      const automaticMessages=messages.filter(line=>line.includes(' learned ')&&!line.includes(' wants to learn '));
      return {mon,amount,participated,viaExpShare,before,after,levelSteps,automaticMessages};
    });
    const messages=events.flatMap(event=>[`${wrestlerName(event.mon,{short:true})} gained ${event.amount} EXP!`,...event.automaticMessages]);
    this.addLog(messages);this.rewardHistory.push(...events.map(event=>({wrestlerId:event.mon.id,amount:event.amount,beforeLevel:event.before.lvl,afterLevel:event.after.lvl,viaExpShare:event.viaExpShare})));
    return events;
  }
  runKnockoutRewards(events,onDone){
    const queue=[...events];let index=0;
    const next=()=>{
      if(index>=queue.length){this.rewardEvent=null;this.levelSummary=null;this.rewardText='';saveState(this.state);return onDone();}
      this.startRewardEvent(queue[index++],next);
    };
    next();
  }
  startRewardEvent(event,onDone){
    this.rewardEvent=event;this.rewardViewLevel=event.before.lvl;this.rewardViewProgress=experienceProgress(event.before);this.rewardViewHp=event.before.hp;this.levelSummary=null;
    this.rewardText=`${wrestlerName(event.mon,{short:true})} gained ${event.amount} EXP!`;this.inputLocked=true;this.mode='expReward';this.setBattlePhase('exp-gain');this.drawBattle();this.typeText(this.resolveText,this.rewardText,17);
    const segments=[];let level=event.before.lvl,xp=event.before.xp;
    while(level<event.after.lvl){segments.push({from:experienceProgress({id:event.before.id,lvl:level,xp}),to:1,levelUpTo:level+1});level++;xp=experienceAtLevel(event.before.id,level);}
    segments.push({from:experienceProgress({id:event.after.id,lvl:level,xp}),to:experienceProgress(event.after),levelUpTo:null});
    this.time.delayedCall(760,()=>this.animateRewardSegments(event,segments,0,()=>this.playRewardMessages(event.automaticMessages,onDone)));
  }
  animateRewardSegments(event,segments,index,onDone){
    if(index>=segments.length)return onDone();
    const segment=segments[index],value={progress:segment.from};this.rewardViewProgress=segment.from;this.paintRewardExp(segment.from);
    this.tweens.add({targets:value,progress:segment.to,duration:Math.max(280,620*Math.max(.18,segment.to-segment.from)),ease:'Sine.Out',onUpdate:()=>{this.rewardViewProgress=value.progress;this.paintRewardExp(value.progress);},onComplete:()=>{
      if(!segment.levelUpTo)return this.animateRewardSegments(event,segments,index+1,onDone);
      this.rewardViewLevel=segment.levelUpTo;this.rewardViewProgress=0;this.levelSummary=event.levelSteps.find(step=>step.level===segment.levelUpTo)||null;
      if(this.levelSummary)this.rewardViewHp=Math.min(this.levelSummary.afterStats.hp,this.rewardViewHp+Math.max(0,this.levelSummary.afterStats.hp-this.levelSummary.beforeStats.hp));
      this.rewardText=`${wrestlerName(event.mon,{short:true})} grew to Lv. ${segment.levelUpTo}!`;this.mode='levelUp';this.setBattlePhase('level-up');this.playSafe('levelup');this.cameras.main.flash(100,255,240,180);this.drawBattle();this.typeText(this.resolveText,this.rewardText,17);
      this.time.delayedCall(1250,()=>{this.levelSummary=null;this.mode='expReward';this.drawBattle();this.animateRewardSegments(event,segments,index+1,onDone);});
    }});
  }
  playRewardMessages(messages,onDone){
    const queue=[...messages];let index=0;
    const next=()=>{
      if(index>=queue.length)return this.time.delayedCall(320,onDone);
      this.rewardText=queue[index++];this.mode='expReward';this.setBattlePhase('move-learned');this.drawBattle();this.typeText(this.resolveText,this.rewardText,17);this.time.delayedCall(Phaser.Math.Clamp(this.rewardText.length*20+420,900,1300),next);
    };
    next();
  }
  enemyDown(){
    const defeated=this.enemy();this.state.dex.seen[defeated.id]=true;this.state.dex.defeated[defeated.id]=true;
    this.inputLocked=true;
    const proceed=()=>{
      if(this.enemyIdx<this.enemyTeam.length-1)return this.offerNextOpponent();
      this.inputLocked=false;this.win();
    };
    const events=this.awardEnemyXp(defeated);
    const handleMoves=()=>this.resolvePendingMoves(proceed);
    if(events.length)this.runKnockoutRewards(events,handleMoves);else handleMoves();
  }
  playerDown(){
    const anyHealthy=this.state.party.some(m=>m.hp>0);
    this.impact='DOWN';
    if(anyHealthy){
      this.addLog([`${wrestlerName(lead(this.state))} is out. Send in your next wrestler.`]);
      this.mode='party';this.forcedSwap=true;this.sel=Math.max(0,this.state.party.findIndex(m=>m.hp>0));
      saveState(this.state);this.drawBattle();return;
    }
    this.lose();
  }
  win(){
    if(this.finalizingBattle)return;
    const pendingEvents=this.enemyTeam.flatMap(mon=>this.awardEnemyXp(mon));
    if(pendingEvents.length){this.inputLocked=true;return this.runKnockoutRewards(pendingEvents,()=>this.resolvePendingMoves(()=>this.win()));}
    const l=lead(this.state);this.finalizingBattle=true;this.over=true;this.inputLocked=true;this.mode='postBattle';this.resultTitle='VICTORY';
    this.enemyTeam.forEach(mon=>{this.state.dex.seen[mon.id]=true;this.state.dex.defeated[mon.id]=true;});
    this.state.stats.wins++;this.state.stats.streak++;
    const grit=this.reward?.grit??(this.type==='gym'?22:Phaser.Math.Between(6,10));
    const rep=this.reward?.rep??(this.type==='gym'?14:Phaser.Math.Between(2,5));
    this.state.grit+=grit;this.state.rep+=rep;
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
    const developing=this.state.party.filter(mon=>mon.pendingDevelopment);
    saveState(this.state);this.runPostBattleSequence(this.winPresentationLines(grit,rep,badgeName,badgeEarned),()=>this.runDevelopmentCeremonies(developing,()=>this.showBattleResult()));
  }
  lose(){
    this.over=true;this.inputLocked=true;this.recruit=false;this.mode='postBattle';this.resultTitle='LOSS';this.state.stats.streak=0;
    if(this.type==='opening'){
      this.state.flags.openingBattleReady=false;this.state.flags.openingBattleComplete=true;this.state.flags.openingBattleWon=false;
      this.state.opening={...(this.state.opening||{}),battleResult:'loss'};
      this.state.objective={id:'opening_recovery',stage:2,complete:false,log:["Recover in the Trainer's Room",'Wrestle Rex','Choose a mat persona']};
      this.addLog(["Wrestle-off complete. Report to the Trainer's Room."]);this.state.message='';
    }else{
      this.state.grit+=4;this.state.rep+=2;restoreParty(this.state);
      this.addLog(['Team recovered. +4 Grit +2 Rep.']);this.state.message='Loss. Team recovered.';
    }
    const developing=this.state.party.filter(mon=>mon.pendingDevelopment);
    stopMusic();sfx.lose();saveState(this.state);this.runPostBattleSequence(this.lossPresentationLines(),()=>this.runDevelopmentCeremonies(developing,()=>this.showBattleResult()));
  }
  showBattleResult(){this.mode='result';this.inputLocked=false;this.setBattlePhase('result');saveState(this.state);this.drawBattle();}
  runDevelopmentCeremonies(mons,onDone){
    const queue=[...mons];let index=0;
    const next=()=>{if(index>=queue.length){this.developmentEvent=null;return onDone();}this.developmentCeremony(queue[index++],next);};
    next();
  }
  drawBattle(){this.children.removeAll();this.drawArenaBackdrop();const l=lead(this.state),lr=l?ROSTER[l.id]:ROSTER.buckshot,er=ROSTER[this.enemy().id];
    if(this.mode==='intro'){this.drawIntroStage(l,lr,er);return;}
    if(this.mode==='development'){this.drawDevelopmentStage();return;}
    if(this.mode==='expReward'||this.mode==='levelUp'||this.mode==='switchPrompt'||(this.preOpponentSwitch&&this.mode==='party')){this.drawIntermissionStage(l,lr);return;}
    if(this.mode==='postBattle'||(this.over&&this.mode==='result'&&['VICTORY','CHAMPION','LOSS'].includes(this.resultTitle))){this.drawPostBattleStage(l,lr);return;}
    this.drawWrestlers(lr,er);this.drawStatusPanels(l,lr,er);this.drawBottom(lr,l);this.firstBattleDraw=false;}
  drawLineupMarkers(x,y,count,label,alignRight=false){
    const g=this.add.graphics(),w=126,left=alignRight?x-w:x;
    g.fillStyle(0x111015,.9);g.fillRoundedRect(left,y,w,29,3);g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(left,y,w,29,3);
    this.add.text(alignRight?x-8:left+8,y+3,label,{fontFamily:FONT,fontSize:10,color:'#fff3d0',fontStyle:'bold'}).setOrigin(alignRight?1:0,0);
    for(let i=0;i<6;i++){
      const px=alignRight?x-12-i*16:left+12+i*16;
      g.fillStyle(i<count?0xb71f2c:0x4d4c50,1);g.fillCircle(px,y+20,5);g.lineStyle(1,i<count?0xffd56a:0x87858c,1);g.strokeCircle(px,y+20,5);
    }
  }
  drawOpponentTrainer(x=370,y=178){
    if(this.opponentName()==='Rex')return this.add.image(x,y,'battle_trainer_rex').setOrigin(.5,1);
    const g=this.add.graphics();g.fillStyle(0x17151a,.94);g.fillRoundedRect(x-88,y-105,176,92,5);g.lineStyle(2,0xd6a336,1);g.strokeRoundedRect(x-88,y-105,176,92,5);g.fillStyle(0x7b1d2a,1);g.fillRect(x-79,y-96,158,6);
    this.add.text(x,y-75,'OPPONENT',{fontFamily:FONT,fontSize:11,color:'#d6a336',fontStyle:'bold'}).setOrigin(.5,0);
    this.add.text(x,y-48,this.opponentName(),{fontFamily:FONT,fontSize:18,color:'#fff7df',fontStyle:'bold',wordWrap:{width:150},align:'center'}).setOrigin(.5,.5);
    return g;
  }
  drawBattleMessage(){
    this.drawTextBox(7,BOTTOM_Y,466,75);
    this.resolveText=this.add.text(22,BOTTOM_Y+15,'',{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold',wordWrap:{width:430},lineSpacing:5});
  }
  drawIntroStage(l,lr,er){
    this.playerSprite=null;this.enemySprite=null;
    if(this.introStage==='challenge'){
      this.drawLineupMarkers(14,14,this.state.party.length,'YOUR LINEUP');
      const opponentLabel=this.opponentName()==='Rex'?'REX LINEUP':'OPPONENT LINEUP';
      this.drawLineupMarkers(466,14,this.enemyTeam.length,opponentLabel,true);
      const player=this.add.image(-70,PLAYER_POS.y,'battle_trainer_player').setOrigin(.5,1);this.tweenSpritePixels(player,{x:PLAYER_POS.x,duration:520,ease:'Cubic.Out'});
      if(this.opponentName()==='Rex'){
        const opponent=this.add.image(GAME_W+70,ENEMY_POS.y+20,'battle_trainer_rex').setOrigin(.5,1);this.tweenSpritePixels(opponent,{x:ENEMY_POS.x,duration:520,ease:'Cubic.Out'});
      }else this.drawOpponentTrainer(ENEMY_POS.x,ENEMY_POS.y+20);
    }else if(this.introStage==='enemySend'){
      this.drawBattleBases();
      const enemy=this.add.image(GAME_W+80,ENEMY_POS.y,battleTextureFor(er.id)).setOrigin(.5,1).setFlipX(battleFlipXFor(er.id,false));
      this.enemySprite=enemy;this.tweenSpritePixels(enemy,{x:ENEMY_POS.x,duration:520,ease:'Cubic.Out'});this.personaFlash(enemy,520);
      this.drawStatusBox(14,14,218,66,wrestlerName(this.enemy(),{short:true}),this.enemy(),er,false);
    }else if(this.introStage==='playerSend'){
      this.drawBattleBases();
      const enemy=this.add.image(ENEMY_POS.x,ENEMY_POS.y,battleTextureFor(er.id)).setOrigin(.5,1).setFlipX(battleFlipXFor(er.id,false));
      const player=this.add.image(-90,PLAYER_POS.y,battleTextureFor(lr.id,true)).setOrigin(.5,1).setFlipX(battleFlipXFor(lr.id,true));
      this.enemySprite=enemy;this.playerSprite=player;this.tweenSpritePixels(player,{x:PLAYER_POS.x,duration:540,ease:'Cubic.Out'});this.personaFlash(player,540);
      this.drawStatusPanels(l,lr,er);
    }
    this.drawBattleMessage();
  }
  drawPostBattleStage(l,lr){
    this.drawBattleBases();
    this.enemySprite=null;
    this.playerSprite=this.add.image(PLAYER_POS.x,PLAYER_POS.y,battleTextureFor(lr.id,true)).setOrigin(.5,1).setFlipX(battleFlipXFor(lr.id,true));
    if(this.type!=='wild')this.drawOpponentTrainer(ENEMY_POS.x,ENEMY_POS.y+20);
    if(l)this.drawStatusBox(250,151,218,80,wrestlerName(l,{short:true}),l,lr,true);
    if(this.mode==='postBattle')this.drawBattleMessage();else this.drawResult();
  }
  drawIntermissionStage(l,lr){
    this.drawBattleBases();this.enemySprite=null;
    this.playerSprite=this.add.image(PLAYER_POS.x,PLAYER_POS.y,battleTextureFor(lr.id,true)).setOrigin(.5,1).setFlipX(battleFlipXFor(lr.id,true));
    if(this.mode==='expReward'||this.mode==='levelUp')this.drawRewardStatus();else if(l)this.drawStatusBox(250,151,218,80,wrestlerName(l,{short:true}),l,lr,true);
    if(this.levelSummary)this.drawLevelSummary();
    this.drawBottom(lr,l);
  }
  drawRewardStatus(){
    const event=this.rewardEvent,mon=event?.mon;if(!mon)return;
    const x=250,y=151,w=218,h=80,viewLevel=this.rewardViewLevel??mon.lvl,stats=scaledStats(mon.id,viewLevel,mon),hp=Math.max(0,Math.min(stats.hp,Math.round(this.rewardViewHp))),g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(x+3,y+3,w,h,3);g.fillStyle(0xf9f2dc,1);g.fillRoundedRect(x,y,w,h,3);g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,3);g.lineStyle(1,0xd3a13a,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,2);g.fillStyle(0x25313a,1);g.fillRect(x+6,y+6,w-12,2);
    this.add.text(x+11,y+9,wrestlerName(mon,{short:true}),{fontFamily:FONT,fontSize:17,color:'#111',fontStyle:'bold'});
    this.rewardLevelText=this.add.text(x+w-11,y+10,`Lv.${viewLevel}`,{fontFamily:FONT,fontSize:14,color:'#222',fontStyle:'bold'}).setOrigin(1,0);
    this.add.text(x+11,y+36,'COND',{fontFamily:FONT,fontSize:12,color:'#333',fontStyle:'bold'});this.drawAnimatedMeter(x+58,y+39,w-71,9,undefined,hp/Math.max(1,stats.hp),0x55b867);
    this.add.text(x+11,y+55,'EXP',{fontFamily:FONT,fontSize:11,color:'#355f87',fontStyle:'bold'});this.rewardExpGraphics=this.add.graphics();this.paintRewardExp(this.rewardViewProgress);
    this.add.text(x+w-12,y+67,`${hp}/${stats.hp}`,{fontFamily:FONT,fontSize:12,color:'#222',fontStyle:'bold'}).setOrigin(1,0);
  }
  paintRewardExp(progress){
    const g=this.rewardExpGraphics;if(!g?.scene)return;const p=Phaser.Math.Clamp(progress??0,0,1),x=308,y=209,w=147,h=6;
    g.clear();g.fillStyle(0x111111,1);g.fillRect(x-1,y-1,w+2,h+2);g.fillStyle(0x3d3d3d,1);g.fillRect(x,y,w,h);g.fillStyle(0x3aa5d1,1);g.fillRect(x,y,Math.max(1,w*p),h);g.fillStyle(0xffffff,.3);g.fillRect(x,y,Math.max(1,w*p),1);g.lineStyle(1,0x080808,1);g.strokeRect(x-1,y-1,w+2,h+2);
  }
  drawLevelSummary(){
    const step=this.levelSummary;if(!step)return;const g=this.drawTextBox(178,18,292,192);g.setDepth(80);
    this.add.text(194,31,'LEVEL UP!',{fontFamily:FONT,fontSize:20,color:'#8a1720',fontStyle:'bold'}).setDepth(81);
    this.add.text(451,34,`Lv.${step.level}`,{fontFamily:FONT,fontSize:16,color:'#222',fontStyle:'bold'}).setOrigin(1,0).setDepth(81);
    const rows=[['CONDITION','hp'],['STRENGTH','attack'],['DEFENSE','defense'],['TECHNIQUE','technique'],['AWARENESS','awareness'],['SPEED','speed']];
    rows.forEach(([label,key],index)=>{const column=Math.floor(index/3),row=index%3,x=194+column*134,y=72+row*39,gain=step.afterStats[key]-step.beforeStats[key];this.add.text(x,y,label,{fontFamily:FONT,fontSize:12,color:'#555',fontStyle:'bold'}).setDepth(81);this.add.text(x,y+16,`${step.afterStats[key]}  +${gain}`,{fontFamily:FONT,fontSize:16,color:'#111',fontStyle:'bold'}).setDepth(81);});
  }
  drawDevelopmentStage(){
    const event=this.developmentEvent;if(!event)return;this.add.rectangle(GAME_W/2,ARENA_H/2,GAME_W,ARENA_H,0x08080c,.72);
    this.add.text(GAME_W/2,18,'DEVELOPMENT',{fontFamily:FONT,fontSize:18,color:'#ffd56a',fontStyle:'bold'}).setOrigin(.5,0);
    const id=event.revealed?event.after.id:event.before.id;this.developmentSprite=this.add.image(GAME_W/2,225,battleTextureFor(id)).setOrigin(.5,1);
    if(!event.revealed)this.developmentSprite.setTint(0x322b3a);
    this.drawBattleMessage();
  }
  drawStatusPanels(l,lr,er){
    const tag=this.enemyTeam.length>1?` ${this.enemyIdx+1}/${this.enemyTeam.length}`:'';
    this.drawStatusBox(14,14,218,66,`${wrestlerName(this.enemy(),{short:true})}${tag}`,this.enemy(),er,false);
    this.drawStageSummary(14,83,this.combatState(this.enemy()));
    if(l){this.drawStatusBox(250,151,218,80,wrestlerName(l,{short:true}),l,lr,true);this.drawStageSummary(250,136,this.combatState(l));}
  }
  drawStageSummary(x,y,state){
    const labels={attack:'STR',defense:'DEF',technique:'TEC',awareness:'AWR',speed:'SPD',accuracy:'ACC'};
    const parts=Object.entries(state?.stages||{}).filter(([,value])=>value).map(([key,value])=>`${labels[key]}${value>0?'+':''}${value}`);
    if(state?.recharging)parts.unshift('RESET');
    if(!parts.length)return;
    const value=parts.join(' '),w=Math.min(218,value.length*7+16),g=this.add.graphics();
    g.fillStyle(0x111015,.88);g.fillRoundedRect(x,y,w,16,3);g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(x,y,w,16,3);
    this.add.text(x+7,y+1,value,{fontFamily:FONT,fontSize:11,color:'#fff3d0',fontStyle:'bold'});
  }
  drawStatusBox(x,y,w,h,name,mon,rec,isPlayer){
    const s=scaledStats(mon.id,mon.lvl,mon),hp=Math.max(0,Math.round(mon.hp));
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(x+3,y+3,w,h,3);
    g.fillStyle(isPlayer?0xf9f2dc:0xfff8e8,1);g.fillRoundedRect(x,y,w,h,3);
    g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,3);
    g.lineStyle(1,isPlayer?0xd3a13a:0xa8b1aa,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,2);
    g.fillStyle(isPlayer?0x25313a:0x7b1d2a,1);g.fillRect(x+6,y+6,w-12,2);
    this.add.text(x+11,y+9,name,{fontFamily:FONT,fontSize:17,color:'#111',fontStyle:'bold'});
    this.add.text(x+w-11,y+10,`Lv.${mon.lvl}`,{fontFamily:FONT,fontSize:14,color:'#222',fontStyle:'bold'}).setOrigin(1,0);
    this.add.text(x+11,y+36,'COND',{fontFamily:FONT,fontSize:12,color:'#333',fontStyle:'bold'});
    this.drawAnimatedMeter(x+58,y+39,w-71,9,this.prevMeters?.[isPlayer?'playerHp':'enemyHp'],mon.hp/s.hp,0x55b867);
    if(isPlayer){
      this.add.text(x+11,y+55,'EXP',{fontFamily:FONT,fontSize:11,color:'#355f87',fontStyle:'bold'});
      this.drawAnimatedMeter(x+58,y+58,w-71,6,undefined,experienceProgress(mon),0x3aa5d1);
      this.add.text(x+w-12,y+67,`${hp}/${s.hp}`,{fontFamily:FONT,fontSize:12,color:'#222',fontStyle:'bold'}).setOrigin(1,0);
    }else{
      this.add.text(x+11,y+51,rec.style.toUpperCase(),{fontFamily:FONT,fontSize:11,color:'#6c1b25',fontStyle:'bold'});
    }
  }
  drawWrestlers(lr,er){
    this.drawBattleBases();
    const eX=ENEMY_POS.x,eY=ENEMY_POS.y,pX=PLAYER_POS.x,pY=PLAYER_POS.y;
    const eStart=this.firstBattleDraw?GAME_W+90:eX,pStart=this.firstBattleDraw?-90:pX;
    const eimg=this.add.image(eStart,eY,battleTextureFor(er.id)).setOrigin(.5,1).setScale(1).setFlipX(battleFlipXFor(er.id,false));
    const pimg=this.add.image(pStart,pY,battleTextureFor(lr.id,true)).setOrigin(.5,1).setScale(1).setFlipX(battleFlipXFor(lr.id,true));
    this.enemySprite=eimg;this.playerSprite=pimg;
    if(this.firstBattleDraw){
      this.tweenSpritePixels(eimg,{x:eX,duration:540,ease:'Cubic.Out',delay:90});
      this.tweenSpritePixels(pimg,{x:pX,duration:540,ease:'Cubic.Out',delay:240});
      this.personaFlash(eimg,650);this.personaFlash(pimg,780);
    }
    if(this.attackAnim==='enemy')this.playTechniqueImpact(pimg,eimg,this.moveStyle);
    if(this.attackAnim==='player')this.playTechniqueImpact(eimg,pimg,this.moveStyle);
    if(this.attackAnim==='playerSetup')this.playTechniqueSetup(pimg,this.moveStyle);
    if(this.attackAnim==='enemySetup')this.playTechniqueSetup(eimg,this.moveStyle);
    if(this.attackAnim==='miss')this.playTechniqueMiss(this.attackSide==='player'?pimg:eimg,this.moveStyle);
    if(this.impact){
      const target=this.attackAnim==='player'||this.attackAnim==='playerSetup'?PLAYER_POS:ENEMY_POS;
      const t=this.add.text(target.x,target.y-120,this.impact,{fontFamily:FONT,fontSize:22,color:'#fff1a6',fontStyle:'bold',stroke:'#111',strokeThickness:5}).setOrigin(.5);
      this.tweens.add({targets:t,y:'-=26',alpha:0,duration:760,ease:'Cubic.Out'});
    }
    this.attackAnim=null;this.attackSide=null;
  }
  drawBattleBases(){const g=this.add.graphics();g.fillStyle(0x0b0b0d,.32);g.fillEllipse(ENEMY_POS.x,ENEMY_POS.y-4,118,21);g.fillEllipse(PLAYER_POS.x,PLAYER_POS.y-4,148,25);g.lineStyle(1,0xffe2a0,.32);g.strokeEllipse(ENEMY_POS.x,ENEMY_POS.y-7,102,15);g.strokeEllipse(PLAYER_POS.x,PLAYER_POS.y-7,132,18);}
  drawImpactBurst(x,y,style='Shooter'){
    const c=this.techniqueColor(style);
    const g=this.add.graphics().setDepth(70),wide=this.moveCategory==='strength'||style==='Bull'||style==='Thrower';
    g.fillStyle(c,.24);g.fillCircle(x,y,wide?34:27);
    if(style==='Rider'){
      g.lineStyle(4,c,.95);g.lineBetween(x-24,y-27,x,y+25);g.lineBetween(x+24,y-27,x,y+25);g.lineStyle(2,0xffffff,.8);g.strokeEllipse(x,y+25,70,18);
    }else if(style==='Scrambler'){
      g.lineStyle(4,c,.95);g.beginPath();g.arc(x,y,31,.2,5.8,false);g.strokePath();g.lineStyle(2,0xffffff,.85);g.beginPath();g.arc(x,y,20,3.3,8.8,false);g.strokePath();
    }else if(style==='Bull'){
      for(let i=-2;i<=2;i++){g.lineStyle(i===0?5:2,i%2?0xffffff:c,.9);g.lineBetween(x-54,y+i*9,x+47,y+i*4);}
    }else if(style==='Wall'){
      g.lineStyle(5,c,.95);g.strokeRoundedRect(x-29,y-34,58,68,18);g.lineStyle(2,0xffffff,.85);g.strokeRoundedRect(x-20,y-25,40,50,12);
    }else if(style==='Thrower'){
      g.lineStyle(5,c,.95);g.beginPath();g.arc(x-3,y+8,44,3.6,6.1,false);g.strokePath();g.lineStyle(2,0xffffff,.9);g.lineBetween(x+34,y-14,x+48,y+1);g.lineBetween(x+34,y-14,x+29,y+5);
    }else{
      g.lineStyle(3,c,.95);g.strokeCircle(x,y,18);g.lineStyle(2,0xffffff,.85);g.strokeCircle(x,y,29);for(let i=0;i<8;i++){const a=(Math.PI*2/8)*i;g.lineBetween(x+Math.cos(a)*10,y+Math.sin(a)*8,x+Math.cos(a)*43,y+Math.sin(a)*31);}
    }
    this.tweens.add({targets:g,alpha:0,scale:1.42,duration:600,ease:'Cubic.Out',onComplete:()=>g.destroy()});
  }
  drawMissWhiff(x,y){
    const g=this.add.graphics().setDepth(70);
    g.lineStyle(4,0xffffff,.62);g.beginPath();g.arc(x,y,34,5.1,1.4,false);g.strokePath();
    g.lineStyle(2,0x8a978f,.75);g.beginPath();g.arc(x+7,y+4,22,5.0,1.2,false);g.strokePath();
    this.tweens.add({targets:g,alpha:0,x:'+=22',duration:520,ease:'Sine.Out',onComplete:()=>g.destroy()});
  }
  drawBottom(lr,leadMon){
    if(this.mode==='resolving')return this.drawResolving();
    if(this.mode==='expReward'||this.mode==='levelUp')return this.drawRewardMessage();
    if(this.mode==='switchPrompt')return this.drawSwitchPrompt();
    if(this.mode==='learnMove')return this.drawLearnMove();
    if(this.mode==='learnInspect')return this.drawLearnInspect();
    if(this.mode==='learnConfirm')return this.drawLearnConfirm();
    if(this.mode==='command')return this.drawCommand(lr,leadMon);
    if(this.mode==='fight')return this.drawFight(lr);
    if(this.mode==='party')return this.drawParty();
    if(this.mode==='bag')return this.drawBag();
    return this.drawResult();
  }
  drawResolving(){this.drawTextBox(7,BOTTOM_Y,466,75);this.resolveText=this.add.text(22,BOTTOM_Y+15,'',{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold',wordWrap:{width:430},lineSpacing:5});}
  drawRewardMessage(){this.drawTextBox(7,BOTTOM_Y,466,75);this.resolveText=this.add.text(22,BOTTOM_Y+15,this.rewardText||'',{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold',wordWrap:{width:430},lineSpacing:5});}
  drawSwitchPrompt(){
    const next=this.enemyTeam[this.pendingOpponentIndex];this.drawTextBox(7,BOTTOM_Y,300,75);this.drawCommandBox(313,BOTTOM_Y,160,75);
    this.add.text(21,BOTTOM_Y+10,`${this.opponentName()} will send`,{fontFamily:FONT,fontSize:15,color:'#222'});this.add.text(21,BOTTOM_Y+34,`${wrestlerName(next,{short:true})}. Switch?`,{fontFamily:FONT,fontSize:17,color:'#111',fontStyle:'bold'});
    ['SWITCH','STAY'].forEach((label,index)=>this.add.text(326,BOTTOM_Y+12+index*31,`${index===this.sel?'\u25b6':' '} ${label}`,{fontFamily:FONT,fontSize:16,color:index===this.sel?'#8a1720':'#111',fontStyle:index===this.sel?'bold':'normal'}));
  }
  drawLearnMove(){
    const choice=this.moveLearn,mon=choice?.mon,move=MOVES[choice?.move];if(!mon||!move)return;
    this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(10,70,460,240);
    this.add.text(28,84,`${wrestlerName(mon)} wants to learn`,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});
    this.add.text(28,110,`NEW: ${move.name.toUpperCase()}`,{fontFamily:FONT,fontSize:17,color:'#8a1720',fontStyle:'bold'});
    this.add.text(28,134,'Choose a technique to forget.',{fontFamily:FONT,fontSize:14,color:'#444'});
    const options=[...mon.moves,null];
    options.forEach((key,i)=>this.add.text(30,158+i*27,`${i===this.sel?'\u25b6':' '} ${key?MOVES[key].name:'KEEP CURRENT MOVES'}`,{fontFamily:FONT,fontSize:16,color:i===this.sel?'#8a1720':'#111',fontStyle:i===this.sel?'bold':'normal'}));
  }
  drawLearnInspect(){
    const choice=this.moveLearn,mon=choice?.mon,newMove=MOVES[choice?.move],oldMove=MOVES[mon?.moves?.[choice?.replaceIndex]];if(!mon||!newMove||!oldMove)return;
    const stats=move=>`${move.style.toUpperCase()}  ${move.category.toUpperCase()}  PWR ${move.power||'--'}  ACC ${Math.round(move.acc*100)}%  STA ${move.pp}`;
    this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(10,76,460,234);
    this.add.text(28,90,'CONFIRM TECHNIQUE CHANGE',{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});
    this.add.text(28,123,`FORGET: ${oldMove.name.toUpperCase()}`,{fontFamily:FONT,fontSize:16,color:'#444',fontStyle:'bold'});
    this.add.text(28,147,stats(oldMove),{fontFamily:FONT,fontSize:13,color:'#333'});
    this.add.text(28,181,`LEARN:  ${newMove.name.toUpperCase()}`,{fontFamily:FONT,fontSize:16,color:'#8a1720',fontStyle:'bold'});
    this.add.text(28,205,stats(newMove),{fontFamily:FONT,fontSize:13,color:'#333'});
    ['REPLACE','BACK'].forEach((label,i)=>this.add.text(95+i*220,269,`${i===this.sel?'\u25b6':' '} ${label}`,{fontFamily:FONT,fontSize:17,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'}).setOrigin(.5,0));
  }
  drawLearnConfirm(){
    const move=MOVES[this.moveLearn?.move];if(!move)return;
    this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(66,151,348,151);
    this.add.text(88,172,`Skip ${move.name}?`,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});
    this.add.text(88,202,'The new technique will be lost.',{fontFamily:FONT,fontSize:15,color:'#444'});
    ['YES','NO'].forEach((label,i)=>this.add.text(150+i*180,254,`${i===this.sel?'\u25b6':' '} ${label}`,{fontFamily:FONT,fontSize:17,color:i===this.sel?'#8a1720':'#111',fontStyle:'bold'}).setOrigin(.5,0));
  }
  drawCommand(lr,leadMon){
    const name=wrestlerName(leadMon,{short:true});
    if(this.combatState(leadMon).recharging){this.drawTextBox(7,BOTTOM_Y,310,75);this.add.text(23,BOTTOM_Y+15,`${name} must reset`,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});this.add.text(23,BOTTOM_Y+43,'before wrestling again.',{fontFamily:FONT,fontSize:15,color:'#444'});this.drawCommandBox(323,BOTTOM_Y,150,75);this.add.text(398,BOTTOM_Y+27,'\u25b6 RESET',{fontFamily:FONT,fontSize:18,color:'#8a1720',fontStyle:'bold'}).setOrigin(.5,0);return;}
    this.drawTextBox(7,BOTTOM_Y,226,75);this.add.text(23,BOTTOM_Y+14,'What will',{fontFamily:FONT,fontSize:17,color:'#222'});this.add.text(23,BOTTOM_Y+40,`${name} do?`,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});this.drawCommandBox(239,BOTTOM_Y,234,75);COMMANDS.forEach((t,i)=>this.add.text(252+(i%2)*110,BOTTOM_Y+13+(i>1?31:0),`${i===this.sel?'\u25b6':' '}${t}`,{fontFamily:FONT,fontSize:16,color:i===this.sel?'#8a1720':'#111',fontStyle:i===this.sel?'bold':'normal'}));
  }
  drawFight(r){
    this.drawCommandBox(7,BOTTOM_Y,300,75);this.drawCommandBox(313,BOTTOM_Y,160,75);
    const leadMon=lead(this.state),moves=leadMon?.moves||r.moves||[];
    moves.forEach((key,i)=>{const m=MOVES[key],x=20+(i%2)*142,y=BOTTOM_Y+13+(i>1?31:0),available=currentMoveStamina(leadMon,key)>0;this.add.text(x,y,`${i===this.sel?'\u25b6':' '}${m.name}`,{fontFamily:FONT,fontSize:15,color:i===this.sel?'#8a1720':available?'#111':'#888',fontStyle:i===this.sel?'bold':'normal'});});
    const mv=MOVES[moves[this.sel]];if(!mv)return;
    const moveKey=moves[this.sel],sameForm=ROSTER[leadMon.id]?.style===mv.style,power=mv.power>0?mv.power:'--';
    this.add.text(325,BOTTOM_Y+9,`${mv.style.toUpperCase()}${sameForm?' *':''}`,{fontFamily:FONT,fontSize:13,color:sameForm?'#8a1720':'#111',fontStyle:'bold'});
    this.add.text(325,BOTTOM_Y+28,`${mv.category==='technique'?'TECHNIQUE':mv.category==='strength'?'STRENGTH':'SETUP'}`,{fontFamily:FONT,fontSize:12,color:'#444',fontStyle:'bold'});
    this.add.text(325,BOTTOM_Y+46,`PWR ${power}  ACC ${Math.round(mv.acc*100)}%`,{fontFamily:FONT,fontSize:12,color:'#333'});
    this.add.text(325,BOTTOM_Y+59,`STA ${currentMoveStamina(leadMon,moveKey)}/${moveStaminaMax(moveKey)}`,{fontFamily:FONT,fontSize:12,color:'#355f87',fontStyle:'bold'});
  }
  drawBag(){this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(10,72,460,238);this.add.text(28,86,'BAG',{fontFamily:FONT,fontSize:20,color:'#111',fontStyle:'bold'});BAG_ITEMS.forEach((it,i)=>{const n=this.state.items?.[it.key]||0,x=28+(i>2?218:0),y=124+(i%3)*35;this.add.text(x,y,`${i===this.sel?'\u25b6':' '} ${ITEM_DEFS[it.key].short} x${n}`,{fontFamily:FONT,fontSize:16,color:i===this.sel?'#8a1720':'#111',fontStyle:i===this.sel?'bold':'normal'});});const it=BAG_ITEMS[this.sel];if(it)this.add.text(28,248,it.desc,{fontFamily:FONT,fontSize:14,color:'#333',wordWrap:{width:420}});}
  drawParty(){this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(10,65,460,245);const title=this.forcedSwap?'CHOOSE NEXT WRESTLER':this.preOpponentSwitch?'SWITCH WRESTLER':'TRAVEL LINEUP';this.add.text(28,80,title,{fontFamily:FONT,fontSize:19,color:this.forcedSwap?'#b41820':'#111',fontStyle:'bold'});this.state.party.forEach((m,i)=>{const s=scaledStats(m.id,m.lvl,m),tag=m.hp<=0?'  OUT':'';this.add.text(28,116+i*29,`${i===this.sel?'\u25b6':' '} ${wrestlerName(m)}  Lv.${m.lvl}`,{fontFamily:FONT,fontSize:15,color:i===this.sel?'#8a1720':m.hp<=0?'#888':'#111',fontStyle:i===this.sel?'bold':'normal'});this.add.text(440,116+i*29,`C ${m.hp}/${s.hp}${tag}`,{fontFamily:FONT,fontSize:14,color:m.hp<=0?'#888':'#333',fontStyle:'bold'}).setOrigin(1,0);});}
  drawResult(){
    this.drawTextBox(7,BOTTOM_Y,466,75);
    const headings={VICTORY:'Match won.',CHAMPION:'Championship won.',LOSS:'Match complete.',JOINED:'Wrestler joined.',LEFT:'Scouting ended.'};
    const heading=headings[this.resultTitle]||this.resultTitle;
    this.add.text(22,BOTTOM_Y+12,heading,{fontFamily:FONT,fontSize:18,color:'#111',fontStyle:'bold'});
    this.add.text(22,BOTTOM_Y+43,'A  CONTINUE',{fontFamily:FONT,fontSize:13,color:'#7b1d2a',fontStyle:'bold'});
  }
  developmentCeremony(mon,onDone){
    if(this.transitioning)return onDone();const before=this.wrestlerSnapshot(mon),result=applyPendingDevelopment(mon);if(!result)return onDone();
    const after=this.wrestlerSnapshot(mon);this.developmentEvent={mon,before,after,result,revealed:false};this.inputLocked=true;this.mode='development';this.setBattlePhase('development');this.playSafe('open');this.drawBattle();
    this.typeText(this.resolveText,`What? ${wrestlerName(before)} is developing...`,17);
    this.tweenSpritePixels(this.developmentSprite,{y:'-=6',yoyo:true,repeat:3,duration:330,ease:'Sine.InOut'});
    this.time.delayedCall(1600,()=>{
      if(this.transitioning||!this.scene.isActive())return;this.developmentEvent.revealed=true;this.playSafe('badge');this.cameras.main.flash(170,255,243,208);this.drawBattle();
      const line=`${wrestlerName(after)} developed into ${result.toName}!`;this.typeText(this.resolveText,line,17);this.addLog([line]);saveState(this.state);
      this.time.delayedCall(1500,onDone);
    });
  }
  captureMeters(playerHp,enemyHp){const l=lead(this.state);return {playerHp:l?playerHp/scaledStats(l.id,l.lvl,l).hp:1,enemyHp:enemyHp/scaledStats(this.enemy().id,this.enemy().lvl,this.enemy()).hp};}
  drawAnimatedMeter(x,y,w,h,start,end,color){const g=this.add.graphics();const value={p:Phaser.Math.Clamp(start??end,0,1)};const draw=()=>{const p=Phaser.Math.Clamp(value.p,0,1);g.clear();g.fillStyle(0x111111,1);g.fillRoundedRect(x-1,y-1,w+2,h+2,1);g.fillStyle(0x3d3d3d,1);g.fillRect(x,y,w,h);g.fillStyle(p<.22?0xd84c35:p<.5?0xd6b545:color,1);g.fillRect(x,y,Math.max(1,w*p),h);g.fillStyle(0xffffff,.3);g.fillRect(x,y,Math.max(1,w*p),1);g.lineStyle(1,0x080808,1);g.strokeRect(x-1,y-1,w+2,h+2);};draw();if(start!==undefined&&Math.abs(start-end)>.01){this.tweens.add({targets:value,p:Phaser.Math.Clamp(end,0,1),duration:520,ease:'Sine.Out',onUpdate:draw,onComplete:()=>{this.prevMeters=null;}});}return g;}
  drawTextBox(x,y,w,h){const g=this.add.graphics();g.fillStyle(0x000000,.42);g.fillRoundedRect(x+4,y+4,w,h,5);g.fillStyle(0xfff7df,1);g.fillRoundedRect(x,y,w,h,5);g.lineStyle(3,0x17151a,1);g.strokeRoundedRect(x,y,w,h,5);g.lineStyle(2,0xffffff,.75);g.strokeRoundedRect(x+3,y+3,w-6,h-6,4);g.lineStyle(1,0x9d8258,1);g.strokeRoundedRect(x+6,y+6,w-12,h-12,3);return g;}
  drawCommandBox(x,y,w,h){const g=this.drawTextBox(x,y,w,h);g.fillStyle(0x7b1d2a,1);g.fillRect(x+8,y+6,w-16,2);g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(x+8,y+9,w-16,h-17,3);return g;}
  drawArenaBackdrop(){this.add.image(0,0,'battle_arena').setOrigin(0);const g=this.add.graphics();g.fillStyle(0x08080a,.16);g.fillRect(0,0,GAME_W,ARENA_H);g.fillStyle(0x0a090b,1);g.fillRect(0,ARENA_H,GAME_W,GAME_H-ARENA_H);g.lineStyle(3,0x7b1d2a,1);g.lineBetween(0,ARENA_H-2,GAME_W,ARENA_H-2);g.lineStyle(1,0xd6a336,.9);g.lineBetween(0,ARENA_H+1,GAME_W,ARENA_H+1);}
  playBattleIntro(){
    this.inputLocked=true;this.mode='intro';this.introStage='transition';this.sel=0;this.firstBattleDraw=true;this.drawBattle();
    const bars=[];
    for(let i=0;i<8;i++){const bar=this.add.rectangle(GAME_W/2,i*40+20,GAME_W+12,42,i%2?0x17151a:0x7b1d2a,1).setDepth(999);bars.push(bar);this.tweens.add({targets:bar,x:i%2?-GAME_W:GAME_W*1.5,duration:560,delay:i*45,ease:'Cubic.InOut'});}
    const flash=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0xffefd0,.7).setDepth(998);
    this.tweens.add({targets:flash,alpha:0,duration:680,ease:'Cubic.Out',onComplete:()=>flash.destroy()});
    this.time.delayedCall(760,()=>{bars.forEach(bar=>bar.destroy());if(!this.over)this.runIntroSequence(0);});
  }
  returnMap(){if(this.transitioning)return;this.transitioning=true;const cover=this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x000000,0).setDepth(999);this.tweens.add({targets:cover,alpha:1,duration:320,ease:'Sine.In',onComplete:()=>{if(this.pendingNickname){this.scene.start('NamingScene',{target:this.pendingNickname,next:{scene:'OverworldScene'}});return;}this.scene.start(this.type==='opening'?'OpeningRecoveryScene':'OverworldScene');}});}
}
