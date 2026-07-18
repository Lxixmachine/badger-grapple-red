import {ROSTER,allMovesSpent,battleFlipXFor,battleTextureFor,currentMoveStamina,makeMon,scaledStats,addXp,applyPendingDevelopment,personaFor,resolvePendingMove,wrestlerName} from '../data/roster.js';import {distributeDefeatExperience,experienceAtLevel,experienceProgress} from '../data/experience.js';import {battleChoreographyFor} from '../data/battleAnimations.js';import {MOVES,moveStaminaMax} from '../data/moves.js';import {conditionFor,conditionShort,consumeConditionAction,resolveConditionResidual} from '../data/conditions.js';import {canonicalBadge} from '../data/campaign.js';import {loadState,saveState,lead} from '../systems/save.js';import {attemptRecruit,awardEffortForDefeat,BAG_ORDER,chooseAiMove,clearTurnFlags,consumeActionBlock,createBattleState,ITEM_DEFS,normalizeWrestler,resolveTechnique,restoreParty,turnOrder,useFilmStudy,useRecoveryItem} from '../systems/mechanics.js';import {FONT,setVirtualHandler} from '../systems/ui.js';import {unlockAudio,sfx,playMusic,stopMusic,setMuted} from '../systems/audio.js';
import {drawLineupScreen} from '../systems/rosterUi.js';
import {menuFooter,menuFrame,menuItemIcon,menuListRow,menuPanel,menuSectionLabel} from '../systems/nativeMenuUi.js';
const Phaser = window.Phaser;
const GAME_W=480,GAME_H=320,ARENA_H=238,BOTTOM_Y=238;
const ENEMY_POS={x:370,y:158},PLAYER_POS={x:112,y:233};
const COMMANDS=['FIGHT','BAG','WRESTLER','RUN'];
const BAG_ITEMS=BAG_ORDER.map(key=>({key,name:ITEM_DEFS[key].name,desc:ITEM_DEFS[key].description,kind:ITEM_DEFS[key].kind}));
export const KNOCKOUT_CEREMONY_TIMING=Object.freeze({
  faintCryPause:340,
  faintDrop:460,
  faintMessageLead:90,
  faintMessageHold:920,
  expAnnouncement:760,
  levelUpHold:1250,
  switchWithdraw:980,
  playerSend:1180,
  opponentSendLead:280,
  opponentSend:540,
  opponentSendHold:420
});
export class BattleScene extends Phaser.Scene{
  constructor(){super('BattleScene');}
  create(data={}){
    this.cameras.main.setViewport(0,0,GAME_W,GAME_H);this.cameras.main.setZoom(1);this.cameras.main.centerOn(GAME_W/2,GAME_H/2);this.cameras.main.setRoundPixels(true);
    this.state=loadState();
    this.rng=typeof data.rng==='function'?data.rng:Math.random;
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
    this.firstBattleDraw=true;this.transitioning=false;this.attackAnim=null;this.attackSide=null;this.moveActorSide=null;this.moveKey='';this.moveHitCount=1;this.moveHitResults=[];this.moveRecoilResult=null;this.techniqueAnimation=null;this.techniqueAnimationHistory=[];this.battleBeatHistory=[];this.battleCeremonyHistory=[];this.knockoutTiming=KNOCKOUT_CEREMONY_TIMING;this.switchCeremony=null;this.presentedCondition=null;this.conditionMeters={};this.conditionValueTexts={};this.conditionHitIndex=null;this.conditionPresentationHistory=[];this.feedbackSequence=null;this.currentFeedback=null;this.feedbackHistory=[];this.feedbackTimer=null;this.feedbackReadyAt=0;this.messagePrompt=null;this.lastChooseAt=0;this.inputLocked=true;
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
  recordBattleBeat(stage,detail={}){const beat={stage,at:Math.round(this.time?.now||0),turn:this.turn,...detail};this.battleBeatHistory.push(beat);if(this.battleBeatHistory.length>96)this.battleBeatHistory.shift();return beat;}
  recordBattleCeremony(stage,detail={}){const event={stage,at:Math.round(this.time?.now||0),turn:this.turn,enemyIndex:this.enemyIdx,...detail};this.battleCeremonyHistory.push(event);if(this.battleCeremonyHistory.length>96)this.battleCeremonyHistory.shift();return event;}
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
  handleVirtualButton(k){unlockAudio();if(k==='left')this.move(-1,0);if(k==='right')this.move(1,0);if(k==='up')this.move(0,-1);if(k==='down')this.move(0,1);if(k==='a')this.choose();if(k==='b')this.back();}
  count(){if(this.mode==='fight'){const l=lead(this.state);return (l?.moves||ROSTER[l?.id]?.moves||[]).length||1;}if(this.mode==='party')return Math.max(1,this.state.party.length);if(this.mode==='bag')return BAG_ITEMS.length;if(this.mode==='learnMove')return (this.moveLearn?.mon?.moves?.length||0)+1;if(this.mode==='learnInspect'||this.mode==='learnConfirm'||this.mode==='switchPrompt')return 2;return 4;}
  move(dx,dy){if(this.over||this.inputLocked)return;const old=this.sel;let cols=this.mode==='party'||this.mode==='learnMove'||this.mode==='bag'?1:2;let rows=Math.ceil(this.count()/cols);let x=old%cols,y=Math.floor(old/cols);if(dx)x=Phaser.Math.Wrap(x+dx,0,cols);if(dy)y=Phaser.Math.Wrap(y+dy,0,rows);this.sel=Math.min(y*cols+x,this.count()-1);this.impact='';this.drawBattle();}
  choose(){const now=this.time.now||performance.now();if(now-this.lastChooseAt<160)return;this.lastChooseAt=now;if(this.inputLocked){if(this.typeTimer)return this.finishTypeText();if(this.advanceResolveSequence('input'))return;return;}if(this.over)return this.returnMap();if(this.mode==='command')return this.chooseCommand();if(this.mode==='fight')return this.chooseMove();if(this.mode==='party')return this.chooseParty();if(this.mode==='bag')return this.chooseBag();if(this.mode==='learnMove')return this.chooseLearnMove();if(this.mode==='learnInspect')return this.chooseLearnInspect();if(this.mode==='learnConfirm')return this.chooseLearnConfirm();if(this.mode==='switchPrompt')return this.chooseSwitchPrompt();}
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
    if(item.kind==='recovery'){
      const result=useRecoveryItem(this.state,l,item.key);msg=result.used?`${wrestlerName(l)}: ${result.message}`:result.message;
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
    const idx=this.state.party.indexOf(picked),outgoing=lead(this.state);
    if(idx<0)return;
    const wasForced=this.forcedSwap,wasPreOpponent=this.preOpponentSwitch;
    if(idx===0&&!wasForced){this.addLog([`${wrestlerName(picked)} is already wrestling.`]);this.mode=wasPreOpponent?'switchPrompt':'command';this.preOpponentSwitch=false;this.sel=0;this.drawBattle();return;}
    this.preOpponentSwitch=false;
    this.runPlayerSwitchCeremony({outgoing,incoming:picked,forced:wasForced,showEnemy:!wasForced&&!wasPreOpponent,onDone:()=>{
      if(wasForced){this.forcedSwap=false;this.inputLocked=false;this.mode='command';this.sel=0;this.setBattlePhase('command');saveState(this.state);this.drawBattle();return;}
      if(wasPreOpponent)return this.sendNextOpponent();
      this.enemyOnlyStrike();
    }});
  }
  activatePartyWrestler(picked){
    const idx=this.state.party.indexOf(picked);if(idx<0)return false;
    if(idx>0){this.state.party.splice(idx,1);this.state.party.unshift(picked);}
    this.state.active=0;this.combatState(picked,true);this.participants.add(picked);saveState(this.state);return true;
  }
  runPlayerSwitchCeremony({outgoing,incoming,forced=false,showEnemy=true,onDone}){
    const send=()=>{
      if(!this.activatePartyWrestler(incoming))return onDone();
      this.switchCeremony={stage:'send',outgoing,incoming,showEnemy,forced};this.mode='switchCeremony';this.inputLocked=true;this.sel=0;this.setBattlePhase('player-send-out');
      this.recordBattleCeremony('player-send-announce',{side:'player',wrestlerId:incoming.id,forced});this.drawBattle();
      const line=`${wrestlerName(incoming,{short:true})}, take the mat!`;this.setResolveText(line);this.playSafe('talk');
      if(this.playerSprite?.scene){this.playerSprite.setAlpha(.2);this.tweenSpritePixels(this.playerSprite,{x:PLAYER_POS.x,alpha:1,duration:560,ease:'Cubic.Out'});this.personaFlash(this.playerSprite,560);}
      this.time.delayedCall(KNOCKOUT_CEREMONY_TIMING.playerSend,()=>{
        if(!this.scene.isActive()||this.over)return;this.recordBattleCeremony('player-send-complete',{side:'player',wrestlerId:incoming.id,forced});this.addLog([`${wrestlerName(incoming)} steps onto the mat!`]);this.switchCeremony=null;onDone();
      });
    };
    this.inputLocked=true;
    if(forced||!outgoing)return send();
    this.switchCeremony={stage:'withdraw',outgoing,incoming,showEnemy,forced:false};this.mode='switchCeremony';this.sel=0;this.setBattlePhase('player-withdraw');
    this.recordBattleCeremony('player-withdraw',{side:'player',wrestlerId:outgoing.id,replacementId:incoming.id});this.drawBattle();
    this.setResolveText(`Come back, ${wrestlerName(outgoing,{short:true})}!`);this.playSafe('talk');
    if(this.playerSprite?.scene)this.tweenSpritePixels(this.playerSprite,{x:-90,alpha:0,duration:430,ease:'Cubic.In'});
    this.time.delayedCall(KNOCKOUT_CEREMONY_TIMING.switchWithdraw,()=>{if(this.scene.isActive()&&!this.over)send();});
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
    const next=this.enemyTeam[this.pendingOpponentIndex];this.inputLocked=false;this.mode='switchPrompt';this.sel=0;this.setBattlePhase('switch-prompt');this.recordBattleCeremony('replacement-prompt',{side:'enemy',wrestlerId:next?.id||null});this.drawBattle();
  }
  sendNextOpponent(){
    const nextIndex=this.pendingOpponentIndex??(this.enemyIdx+1);
    if(nextIndex>=this.enemyTeam.length){this.pendingOpponentIndex=null;return this.win();}
    this.enemyIdx=nextIndex;this.pendingOpponentIndex=null;const next=this.enemy();this.combatState(next,true);
    const current=lead(this.state);this.participants=new Set(current?[current]:[]);
    this.impact='';this.attackAnim=null;this.clearConditionPresentation();this.inputLocked=true;this.mode='resolving';this.setBattlePhase('opponent-send-out');this.recordBattleCeremony('opponent-send-announce',{side:'enemy',wrestlerId:next.id});this.drawBattle();
    const line=`${this.trainerName||'Opponent'} sends out ${wrestlerName(next)} - ${personaFor(next.id)} form!`;
    this.setResolveText(line);this.playSafe('talk');this.addLog([`${this.trainerName||'Opponent'} sends out ${wrestlerName(next)}!`]);
    if(this.enemySprite?.scene){this.enemySprite.x=GAME_W+80;this.enemySprite.setAlpha(.2);}
    this.time.delayedCall(KNOCKOUT_CEREMONY_TIMING.opponentSendLead,()=>{
      if(!this.enemySprite?.scene)return;this.recordBattleCeremony('opponent-send-motion',{side:'enemy',wrestlerId:next.id});this.tweenSpritePixels(this.enemySprite,{x:ENEMY_POS.x,alpha:1,duration:KNOCKOUT_CEREMONY_TIMING.opponentSend,ease:'Cubic.Out'});this.personaFlash(this.enemySprite,KNOCKOUT_CEREMONY_TIMING.opponentSend);
    });
    const completeAt=KNOCKOUT_CEREMONY_TIMING.opponentSendLead+KNOCKOUT_CEREMONY_TIMING.opponentSend;
    this.time.delayedCall(completeAt,()=>{if(this.scene.isActive()&&!this.over)this.recordBattleCeremony('opponent-send-complete',{side:'enemy',wrestlerId:next.id});});
    this.time.delayedCall(completeAt+KNOCKOUT_CEREMONY_TIMING.opponentSendHold,()=>{if(this.over)return;this.inputLocked=false;this.mode='command';this.setBattlePhase('command');this.sel=0;saveState(this.state);this.drawBattle();});
  }
  enemyOnlyStrike(){
    const l=lead(this.state),e=this.enemy();
    this.inputLocked=true;this.mode='resolving';this.impact='';this.attackAnim=null;this.attackSide=null;this.clearConditionPresentation();this.drawBattle();
    const ek=chooseAiMove(e,l,{wild:this.type==='wild',attackerState:this.combatState(e),defenderState:this.combatState(l)});
    this.attackBeat({att:e,def:l,key:ek,attName:wrestlerName(e,{short:true}),defIsEnemy:false,
      onKO:()=>{this.clearBattleTurn();this.inputLocked=false;this.playerDown();},
      onDone:()=>this.completeBattleTurn()});
  }
  completeBattleTurn(){
    this.impact='';
    this.runConditionEndTurn(()=>{this.clearBattleTurn();this.turn++;this.inputLocked=false;this.mode='command';this.setBattlePhase('command');this.sel=0;saveState(this.state);this.drawBattle();});
  }
  runConditionEndTurn(onDone){
    const queue=[
      {mon:lead(this.state),side:'player',defIsEnemy:false,onKO:()=>this.playerDown()},
      {mon:this.enemy(),side:'enemy',defIsEnemy:true,onKO:()=>this.enemyDown()}
    ].filter(entry=>entry.mon?.hp>0&&conditionFor(entry.mon.condition)?.residualFraction);
    let index=0;
    const next=()=>{
      if(this.over||!this.scene.isActive())return;
      if(index>=queue.length){this.clearConditionPresentation();return onDone();}
      const entry=queue[index++],maximum=scaledStats(entry.mon.id,entry.mon.lvl,entry.mon).hp,result=resolveConditionResidual(entry.mon,maximum);
      if(!result)return next();
      const player=lead(this.state),enemy=this.enemy(),condition=conditionFor(result.key),name=wrestlerName(entry.mon,{short:true});
      this.presentedCondition={player:player?.hp||0,enemy:enemy?.hp||0};this.presentedCondition[entry.side]=result.hpBefore;
      this.inputLocked=true;this.mode='resolving';this.setBattlePhase('condition-residual');this.drawBattle();
      const target=entry.side==='player'?this.playerSprite:this.enemySprite;if(target?.scene){target.setTint(0xd6a336);this.time.delayedCall(260,()=>{if(target.scene)target.clearTint();});}
      this.animateConditionStep(entry.side,result,battleChoreographyFor('grind'),0,'residual');
      this.playResolveSequence([{kind:'condition-residual',text:condition.residual(name),sound:'statusDown'}],()=>{
        this.clearConditionPresentation();
        if(result.knockedOut){this.clearBattleTurn();return this.faintBeat(entry.defIsEnemy,entry.onKO);}
        next();
      });
    };
    next();
  }
  // v21.14 Battle Drama: every attack is a two-beat FireRed sequence -
  // announce ("BUCKY used SINGLE LEG!" typed out, attacker lunges), then
  // impact (damage number, defender flicker + knockback, HP drain), with
  // faint and send-out beats when a wrestler goes down.
  typeText(t,str,speed=19){
    if(this.typeTimer)this.typeTimer.remove(false);this.clearMessagePrompt();this.typeTarget=t;this.typeFull=str;let i=0;t.setText('');
    this.typeTimer=this.time.addEvent({delay:speed,repeat:Math.max(0,str.length-1),callback:()=>{i++;if(t&&t.scene)t.setText(str.slice(0,i));if(i>=str.length){this.typeTimer=null;this.updateMessagePrompt();}}});
  }
  finishTypeText(){if(this.typeTimer)this.typeTimer.remove(false);this.typeTimer=null;if(this.typeTarget?.scene)this.typeTarget.setText(this.typeFull||'');this.updateMessagePrompt();}
  feedbackColor(kind){return {critical:'#8a5200',edge:'#8a1720',resisted:'#355f87','stat-up':'#276943','stat-down':'#8a1720','stamina-down':'#355f87',recoil:'#8a1720','condition-inflicted':'#8a1720','condition-cleared':'#276943','condition-blocked':'#8a5200','condition-residual':'#8a1720'}[kind]||'#111';}
  clearMessagePrompt(){if(this.messagePrompt?.scene)this.messagePrompt.destroy();this.messagePrompt=null;}
  updateMessagePrompt(){
    this.clearMessagePrompt();if(this.typeTimer||!this.currentFeedback||!this.resolveText?.scene)return;
    this.messagePrompt=this.add.text(451,BOTTOM_Y+50,'\u25bc',{fontFamily:FONT,fontSize:12,color:'#8a1720',fontStyle:'bold'}).setOrigin(.5,0).setDepth(120);
    this.tweens.add({targets:this.messagePrompt,y:'+=3',duration:320,yoyo:true,repeat:-1,ease:'Sine.InOut'});
  }
  setResolveText(str){if(!this.resolveText||!this.resolveText.scene){if(this.mode!=='intro'&&this.mode!=='postBattle')this.mode='resolving';this.drawBattle();}this.resolveText.setColor(this.feedbackColor(this.currentFeedback?.kind));this.typeText(this.resolveText,str);}
  setResolveTextImmediate(str){
    if(this.typeTimer)this.typeTimer.remove(false);this.typeTimer=null;this.clearMessagePrompt();
    if(!this.resolveText||!this.resolveText.scene){if(this.mode!=='intro'&&this.mode!=='postBattle')this.mode='resolving';this.drawBattle();}
    this.typeTarget=this.resolveText;this.typeFull=str;this.resolveText.setColor(this.feedbackColor(this.currentFeedback?.kind)).setText(str);
  }
  normalizeFeedback(event){if(typeof event==='string')return {kind:'message',text:event};return {kind:'message',...(event||{}),text:String(event?.text||'')};}
  playResolveSequence(events,onDone){
    const queue=events.map(event=>this.normalizeFeedback(event)).filter(event=>event.text);
    if(this.feedbackTimer)this.feedbackTimer.remove(false);this.feedbackTimer=null;this.feedbackSequence=null;this.currentFeedback=null;this.clearMessagePrompt();
    if(!queue.length)return onDone();
    this.feedbackSequence={queue,index:0,onDone,currentRecord:null};this.showNextFeedback();
  }
  showNextFeedback(){
    const sequence=this.feedbackSequence;if(!sequence)return;
    if(sequence.index>=sequence.queue.length)return this.finishResolveSequence();
    const event=sequence.queue[sequence.index++],record={...event,index:sequence.index,completed:false,advancedBy:null};
    sequence.currentRecord=record;this.currentFeedback=event;this.feedbackHistory.push(record);if(this.feedbackHistory.length>64)this.feedbackHistory.shift();
    this.setBattlePhase('message');this.recordBattleBeat('result-message',{moveKey:this.moveKey,side:this.moveActorSide,kind:event.kind,index:sequence.index});if(event.sound)this.playSafe(event.sound);this.setResolveText(event.text);
    this.feedbackReadyAt=(this.time.now||0)+180;
    const dwell=event.duration??Phaser.Math.Clamp(event.text.length*22+420,860,1320);
    this.feedbackTimer=this.time.delayedCall(dwell,()=>this.advanceResolveSequence('auto'));
  }
  advanceResolveSequence(source='input'){
    const sequence=this.feedbackSequence;if(!sequence)return false;
    if(source==='input'&&this.typeTimer){this.finishTypeText();return true;}
    if(source==='input'&&(this.time.now||0)<this.feedbackReadyAt)return true;
    if(this.feedbackTimer)this.feedbackTimer.remove(false);this.feedbackTimer=null;
    if(sequence.currentRecord){sequence.currentRecord.completed=true;sequence.currentRecord.advancedBy=source;sequence.currentRecord=null;}
    this.showNextFeedback();return true;
  }
  finishResolveSequence(){
    const sequence=this.feedbackSequence;if(!sequence)return;
    const onDone=sequence.onDone;this.feedbackSequence=null;this.currentFeedback=null;this.feedbackTimer=null;this.feedbackReadyAt=0;this.clearMessagePrompt();onDone();
  }
  effectFeedback(event,attName,defName){
    const name=event.target==='attacker'?attName:defName;
    const stat={attack:'Strength',defense:'Defense',technique:'Technique',awareness:'Awareness',speed:'Speed',accuracy:'Accuracy'}[event.stat]||event.stat;
    if(event.type==='multiHit')return {kind:'hit-count',text:`Hit ${event.hits} ${event.hits===1?'time':'times'}!`};
    if(event.type==='counter')return {kind:'counter',text:`${attName} caught the opening with a re-attack!`,sound:'open'};
    if(event.type==='staminaDrain')return {kind:'stamina-down',text:`${event.moveName} lost ${event.amount} Stamina!`,sound:'statusDown'};
    if(event.type==='recoil')return {kind:'recoil',text:`${attName} took ${event.amount} recoil!`};
    if(event.type==='flinch')return {kind:'position-break',text:`${defName} lost position!`,sound:'statusDown'};
    if(event.type==='recharge')return {kind:'recharge',text:`${attName} must reset position next turn.`};
    if(event.type==='conditionInflicted')return {kind:'condition-inflicted',text:conditionFor(event.key).inflicted(name),sound:'statusDown'};
    if(event.type==='conditionBlocked')return {kind:'condition-blocked',text:`${name} already has ${conditionFor(event.existing)?.name||'a major condition'}.`};
    if(event.type==='conditionCured')return {kind:'condition-cleared',text:`${name} shook off ${conditionFor(event.key).name}!`,sound:'statusUp'};
    if(event.type==='conditionCureMiss')return {kind:'condition-blocked',text:`${name} has no major condition.`};
    if(event.type==='stageLimit')return {kind:'stage-limit',text:`${name}'s ${stat} cannot shift any further.`};
    if(event.type==='stage'){
      if(event.delta>=2)return {kind:'stat-up',text:`${name}'s ${stat} rose sharply!`,sound:'statusUp'};
      if(event.delta>0)return {kind:'stat-up',text:`${name}'s ${stat} rose!`,sound:'statusUp'};
      if(event.delta<=-2)return {kind:'stat-down',text:`${name}'s ${stat} fell sharply!`,sound:'statusDown'};
      return {kind:'stat-down',text:`${name}'s ${stat} fell!`,sound:'statusDown'};
    }
    return null;
  }
  resultFeedback(result,attName,defName){
    const feedback=[];
    const criticalHits=(result.hitResults||[]).filter(hit=>hit.critical);
    criticalHits.forEach(hit=>feedback.push({kind:'critical',text:result.hits>1?`Hit ${hit.index} was critical!`:'A critical hit!',sound:'critical'}));
    if(result.hitResults?.length&&result.multiplier>1)feedback.push({kind:'edge',text:`It's a style edge!`,sound:'edge'});
    if(result.hitResults?.length&&result.multiplier<1)feedback.push({kind:'resisted',text:`The matchup resisted the technique.`,sound:'resist'});
    result.events.forEach(event=>feedback.push(this.effectFeedback(event,attName,defName)));
    return feedback.filter(Boolean);
  }
  attackBeat({att,def,key,attName,defIsEnemy,onKO,onDone,conditionChecked=false}){
    const attState=this.combatState(att),defState=this.combatState(def);
    if(!conditionChecked){
      const gate=consumeConditionAction(att,this.rng),condition=conditionFor(gate.key);
      if(gate.blocked||gate.cleared){
        const line=gate.cleared?condition.recovered(attName):condition.blocked(attName),kind=gate.cleared?'condition-cleared':'condition-blocked';
        this.addLog([line]);this.playResolveSequence([{kind,text:line,sound:gate.cleared?'statusUp':'statusDown'}],()=>{
          if(gate.blocked)return onDone();
          this.attackBeat({att,def,key,attName,defIsEnemy,onKO,onDone,conditionChecked:true});
        });return;
      }
    }
    const blocked=consumeActionBlock(attState);
    if(blocked){
      const line=blocked==='recharge'?`${attName} is resetting position!`:`${attName} could not regain position!`;
      this.addLog([line]);this.playResolveSequence([{kind:'action-blocked',text:line,sound:'talk'}],onDone);return;
    }
    const actualKey=key!=='desperation'&&currentMoveStamina(att,key)<=0&&allMovesSpent(att)?'desperation':(key||'stall');
    const mv=MOVES[actualKey]||MOVES.stall;
    const choreography=battleChoreographyFor(actualKey);
    const announcement=actualKey!==key?`${attName} has no Stamina - DESPERATION SHOT!`:`${attName} used ${mv.name.toUpperCase()}!`;
    const attackSide=defIsEnemy?'player':'enemy';
    this.setBattlePhase('announce');this.recordBattleBeat('announce',{moveKey:actualKey,side:attackSide});this.setResolveText(announcement);
    const attacker=defIsEnemy?this.playerSprite:this.enemySprite;
    this.playSafe('talk');
    const announceDuration=Phaser.Math.Clamp(announcement.length*18+choreography.tempo.announceBase,choreography.tempo.announceMin,choreography.tempo.announceMax);
    this.time.delayedCall(Math.max(280,announceDuration-choreography.tempo.windupLead),()=>{
      if(attacker&&attacker.scene)this.playTechniqueWindup(attacker,actualKey,defIsEnemy);
    });
    this.time.delayedCall(announceDuration,()=>{
      if(this.over)return;
      const beforeAttHp=att.hp,beforeDefHp=def.hp;
      const res=this.resolve(att,def,actualKey,attName);
      this.setBattlePhase('impact');this.recordBattleBeat('impact-start',{moveKey:actualKey,side:attackSide,hit:Boolean(res.hit)});
      this.moveKey=res.result.key||actualKey;
      this.moveActorSide=attackSide;
      this.moveHitCount=Math.max(1,res.result.hits||1);
      this.moveHitResults=[...(res.result.hitResults||[])];
      const recoil=res.result.events.find(event=>event.type==='recoil');
      this.moveRecoilResult=recoil?{damage:recoil.amount,hpBefore:beforeAttHp,hpAfter:att.hp}:null;
      if(res.dmg>0||this.moveRecoilResult)this.beginConditionPresentation(defIsEnemy,beforeAttHp,beforeDefHp);
      this.attackSide=attackSide;
      this.impact=res.hit?(res.dmg>0?'':'SET'):'MISS';
      this.attackAnim=res.hit?(res.dmg>0?(defIsEnemy?'enemy':'player'):(defIsEnemy?'playerSetup':'enemySetup')):'miss';
      this.addLog([res.line]);
      this.drawBattle();
      this.setResolveTextImmediate(announcement);
      const feedback=res.hit?this.resultFeedback(res.result,attName,wrestlerName(def,{short:true})):[{kind:'miss',text:'It slipped - no contact.',sound:'miss'}];
      const animationTime=res.dmg>0?this.conditionSequenceDuration(choreography,this.moveHitResults,this.moveRecoilResult):Math.min(choreography.tempo.feedback,520);
      this.time.delayedCall(animationTime,()=>this.playResolveSequence(feedback,()=>{
        if(this.over)return;
        this.clearConditionPresentation();
        if(def.hp<=0)return this.faintBeat(defIsEnemy,onKO);
        if(att.hp<=0)return this.faintBeat(!defIsEnemy,()=>defIsEnemy?this.playerDown():this.enemyDown());
        this.setBattlePhase('between');this.recordBattleBeat('recovery',{moveKey:actualKey,side:attackSide});this.time.delayedCall(choreography.tempo.recovery,onDone);
      }));
    });
  }
  faintBeat(defIsEnemy,onKO){
    const mon=defIsEnemy?this.enemy():lead(this.state);
    const name=wrestlerName(mon);
    const target=defIsEnemy?this.enemySprite:this.playerSprite;
    const side=defIsEnemy?'enemy':'player',dropAt=KNOCKOUT_CEREMONY_TIMING.faintCryPause,messageAt=dropAt+KNOCKOUT_CEREMONY_TIMING.faintDrop+KNOCKOUT_CEREMONY_TIMING.faintMessageLead;
    this.inputLocked=true;this.mode='resolving';this.setBattlePhase('faint');this.recordBattleCeremony('faint-cry',{side,wrestlerId:mon.id});this.setResolveTextImmediate('');this.playSafe('lose');
    this.time.delayedCall(dropAt,()=>{
      if(this.over||!this.scene.isActive())return;this.recordBattleCeremony('faint-animation',{side,wrestlerId:mon.id});
      if(target?.scene)this.tweenSpritePixels(target,{y:'+=38',alpha:0,duration:KNOCKOUT_CEREMONY_TIMING.faintDrop,ease:'Quad.In'});
    });
    this.time.delayedCall(messageAt,()=>{
      if(this.over||!this.scene.isActive())return;this.recordBattleCeremony('faint-message',{side,wrestlerId:mon.id});this.setResolveText(`${name} is out!`);this.addLog([`${name} is out.`]);
    });
    this.time.delayedCall(messageAt+KNOCKOUT_CEREMONY_TIMING.faintMessageHold,()=>{if(!this.over&&this.scene.isActive())onKO();});
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
  recordTechniqueAnimation(moveKey,stage,detail={}){
    const choreography=battleChoreographyFor(moveKey);
    const cue={moveKey,stage,motion:choreography.motion,effect:choreography.effect,hitCount:detail.hitCount||1,side:detail.side||this.attackSide||null};
    this.techniqueAnimation=cue;this.techniqueAnimationHistory.push(cue);
    if(this.techniqueAnimationHistory.length>32)this.techniqueAnimationHistory.shift();
  }
  playTechniqueWindup(sprite,moveKey,isPlayer){
    const choreography=battleChoreographyFor(moveKey),mv=MOVES[moveKey]||MOVES.stall,direction=isPlayer?1:-1,w=choreography.windup;
    this.recordTechniqueAnimation(moveKey,'windup',{side:isPlayer?'player':'enemy'});
    this.recordBattleBeat('windup',{moveKey,side:isPlayer?'player':'enemy'});
    this.playTechniqueSound(mv.style,'windup');
    this.drawMotionTrail(sprite.x,sprite.y-58,sprite.x+w.dx*direction,sprite.y-58+w.dy,mv.style,.55);
    this.drawWindupGlyph(sprite.x,sprite.y-66,choreography.motion,mv.style,direction);
    this.tweenSpritePixels(sprite,{x:`+=${w.dx*direction}`,y:`+=${w.dy}`,duration:w.duration,yoyo:true,ease:['power-rush','deep-charge','last-charge'].includes(choreography.motion)?'Expo.In':'Cubic.InOut'});
  }
  playTechniqueImpact(attacker,target,moveKey,hitResults=[],recoilResult=null,hitCount=1){
    const choreography=battleChoreographyFor(moveKey),mv=MOVES[moveKey]||MOVES.stall,playerAttacks=attacker===this.playerSprite,direction=playerAttacks?1:-1,force=choreography.impact;
    const frames=hitResults.length?hitResults:Array.from({length:Math.max(1,hitCount)},(_,index)=>({index:index+1,damage:0,critical:false})),hits=frames.length,starts=this.impactStartTimes(choreography,frames),targetSide=playerAttacks?'enemy':'player',attackerSide=playerAttacks?'player':'enemy';
    this.recordTechniqueAnimation(moveKey,'impact',{hitCount:hits,side:playerAttacks?'player':'enemy'});
    this.drawMotionTrail(attacker.x,attacker.y-58,target.x,target.y+force.effectY,mv.style,.8);
    frames.forEach((frame,index)=>{
      this.time.delayedCall(starts[index],()=>{
        if(!target.scene)return;
        this.setBattlePhase('contact');this.recordBattleBeat('contact',{moveKey,side:attackerSide,hitIndex:index+1,damage:frame.damage||0,message:this.resolveText?.text||''});
        this.playSafe('hit');this.playTechniqueSound(mv.style,'impact');
        this.tweenSpritePixels(attacker,{x:`+=${force.lunge*direction}`,y:`+=${force.lift}`,duration:72,yoyo:true,hold:choreography.tempo.contactHold,ease:'Cubic.Out'});
        this.drawTechniqueEffect(target.x,target.y+force.effectY,moveKey,direction,index);
        if(frame.damage>0){
          this.drawDamagePopup(target.x,target.y-112,frame.damage,frame.critical,index);
          this.time.delayedCall(choreography.tempo.conditionLead,()=>{if(target.scene)this.animateConditionStep(targetSide,frame,choreography,index);});
        }
        target.setTintFill(index%2?0xffd86b:0xfff7da);
        if(index===0&&force.flash)this.cameras.main.flash(force.flash,255,247,218,false);
        this.time.delayedCall(Math.max(72,choreography.tempo.contactHold),()=>{if(target.scene)target.clearTint();});
        const knock=Math.max(2,force.knockback-(index*2)),vertical=index%2?Math.sign(force.targetLift||-1)*-3:force.targetLift;
        this.tweenSpritePixels(target,{x:`+=${knock*direction}`,y:`+=${vertical}`,duration:64,yoyo:true,repeat:Math.max(0,force.shake-1),ease:'Quad.Out'});
      });
    });
    if(recoilResult){
      const delay=this.conditionImpactDuration(choreography,frames)+100;
      this.time.delayedCall(delay,()=>{if(attacker.scene){this.playSafe('hit');this.drawDamagePopup(attacker.x,attacker.y-112,recoilResult.damage,false,0,'RECOIL');this.animateConditionStep(attackerSide,recoilResult,choreography,0,'recoil');this.tweenSpritePixels(attacker,{x:`-=${8*direction}`,alpha:.55,duration:80,yoyo:true,repeat:1,ease:'Quad.Out'});}});
    }
  }
  drawDamagePopup(x,y,damage,critical=false,index=0,label=''){
    const px=Math.round(x+(index%2?18:-14)),py=Math.round(y-(index%3)*6),color=critical?'#ffd45c':'#fff1a6';
    const value=this.add.text(px,py,`-${damage}`,{fontFamily:FONT,fontSize:21,color,fontStyle:'bold',stroke:'#111',strokeThickness:5}).setOrigin(.5).setDepth(91);
    this.tweens.add({targets:value,y:'-=24',alpha:0,duration:620,ease:'Cubic.Out',onComplete:()=>value.destroy()});
    if(critical||label){const tag=this.add.text(px,py-19,label||'CRITICAL',{fontFamily:FONT,fontSize:10,color:critical?'#ffd45c':'#f0b8bd',fontStyle:'bold',stroke:'#111',strokeThickness:3}).setOrigin(.5).setDepth(92);this.tweens.add({targets:tag,y:'-=18',alpha:0,duration:660,ease:'Cubic.Out',onComplete:()=>tag.destroy()});}
  }
  playTechniqueSetup(sprite,moveKey){
    const choreography=battleChoreographyFor(moveKey),direction=sprite===this.playerSprite?1:-1;
    this.recordTechniqueAnimation(moveKey,'setup',{side:sprite===this.playerSprite?'player':'enemy'});
    this.setBattlePhase('setup-animation');this.recordBattleBeat('setup-contact',{moveKey,side:sprite===this.playerSprite?'player':'enemy'});this.playSafe('talk');this.playTechniqueSound((MOVES[moveKey]||MOVES.stall).style,'setup');
    this.personaFlash(sprite);
    this.drawTechniqueEffect(sprite.x,sprite.y+choreography.impact.effectY,moveKey,direction,0);
    this.tweenSpritePixels(sprite,{x:`+=${choreography.impact.lunge*direction}`,y:`+=${choreography.impact.lift||-6}`,yoyo:true,duration:190,ease:'Back.Out'});
  }
  playTechniqueMiss(attacker,moveKey){
    const choreography=battleChoreographyFor(moveKey),mv=MOVES[moveKey]||MOVES.stall,direction=attacker===this.playerSprite?1:-1,target=attacker===this.playerSprite?this.enemySprite:this.playerSprite;
    this.recordTechniqueAnimation(moveKey,'miss',{side:attacker===this.playerSprite?'player':'enemy'});
    this.setBattlePhase('miss-animation');this.recordBattleBeat('miss-contact',{moveKey,side:attacker===this.playerSprite?'player':'enemy'});this.playSafe('miss');
    this.drawMotionTrail(attacker.x,attacker.y-58,target?.x||240,(target?.y||194)-74,mv.style,.38);
    this.drawMissWhiff((target?.x||240)+22*direction,(target?.y||194)-72);
    this.tweenSpritePixels(attacker,{x:`+=${Math.max(30,choreography.windup.dx)*direction}`,y:`+=${Math.min(-4,choreography.windup.dy)}`,alpha:.52,duration:100,yoyo:true,ease:'Cubic.Out'});
  }
  drawMotionTrail(x1,y1,x2,y2,style,alpha=.7){
    const color=this.techniqueColor(style),g=this.add.graphics().setDepth(65);
    g.lineStyle(style==='Bull'?7:4,color,alpha);g.lineBetween(x1,y1,x2,y2);
    g.lineStyle(2,0xffffff,alpha*.72);g.lineBetween(x1,y1-5,x2,y2-5);
    if(style==='Scrambler'){g.lineStyle(2,color,alpha*.7);g.beginPath();g.arc((x1+x2)/2,(y1+y2)/2,24,.1,5.4,false);g.strokePath();}
    this.tweens.add({targets:g,alpha:0,duration:300,ease:'Cubic.Out',onComplete:()=>g.destroy()});
  }
  drawWindupGlyph(x,y,motion,style,direction){
    const c=this.techniqueColor(style),g=this.add.graphics().setDepth(66),rush=/rush|charge|pressure|surge/.test(motion),turn=/turn|roll|scramble|wheel|direction|circle/.test(motion),brace=/brace|close|fold/.test(motion);
    g.lineStyle(3,c,.75);
    if(rush){for(let i=0;i<3;i++){const px=x-(18+i*11)*direction;g.lineBetween(px,y-10,px+9*direction,y);g.lineBetween(px+9*direction,y,px,y+10);}}
    else if(turn){g.beginPath();g.arc(x,y,23,.35,5.45,false);g.strokePath();g.fillStyle(0xffffff,.8);g.fillTriangle(x+21*direction,y-7,x+29*direction,y,x+18*direction,y+4);}
    else if(brace){g.strokeRoundedRect(x-25,y-20,50,40,8);g.lineStyle(2,0xffffff,.7);g.lineBetween(x-17,y,x+17,y);}
    else{g.lineBetween(x,y+18,x,y-22);g.fillStyle(0xffffff,.8);g.fillTriangle(x,y-28,x-7,y-17,x+7,y-17);}
    this.tweens.add({targets:g,alpha:0,duration:330,ease:'Cubic.Out',onComplete:()=>g.destroy()});
  }
  drawTechniqueEffect(x,y,moveKey,direction=1,hitIndex=0){
    const choreography=battleChoreographyFor(moveKey),mv=MOVES[moveKey]||MOVES.stall,c=this.techniqueColor(mv.style),g=this.add.graphics().setDepth(70),effect=choreography.effect;
    const X=offset=>Math.round(x+offset*direction),Y=offset=>Math.round(y+offset);
    const line=(x1,y1,x2,y2,width=3,color=c,alpha=.95)=>{g.lineStyle(width,color,alpha);g.lineBetween(X(x1),Y(y1),X(x2),Y(y2));};
    const ellipse=(cx,cy,w,h,width=3,color=c,alpha=.9)=>{g.lineStyle(width,color,alpha);g.strokeEllipse(X(cx),Y(cy),w,h);};
    const arc=(cx,cy,r,start,end,width=3,color=c,alpha=.9)=>{g.lineStyle(width,color,alpha);g.beginPath();g.arc(X(cx),Y(cy),r,direction>0?start:Math.PI-end,direction>0?end:Math.PI-start,direction<0);g.strokePath();};
    const arrow=(x1,y1,x2,y2,width=3,color=c)=>{line(x1,y1,x2,y2,width,color);const a=Math.atan2(y2-y1,(x2-x1)*direction),hx=X(x2),hy=Y(y2),s=9;g.fillStyle(color,.95);g.fillTriangle(hx,hy,Math.round(hx-Math.cos(a-.55)*s),Math.round(hy-Math.sin(a-.55)*s),Math.round(hx-Math.cos(a+.55)*s),Math.round(hy-Math.sin(a+.55)*s));};
    g.fillStyle(c,.16);g.fillCircle(Math.round(x),Math.round(y),mv.category==='strength'?34:27);
    switch(effect){
      case 'low-sweep':
        arc(-5,13,39,3.35,6.05,5,0x8a1720,1);arc(-5,13,31,3.35,6.05,3,0xffffff,1);line(-41,20,39,20,3,c,1);arrow(-34,1,27,13,4,0xffffff);break;
      case 'rising-lift':
        arrow(-18,25,8,-31,4);ellipse(9,-17,38,18,3,0xffffff,.8);line(-28,19,-4,19,3);break;
      case 'ankle-rings':
        ellipse(0,25,68,16,4);ellipse(0,22,45,10,2,0xffffff,.85);arrow(-31,3,-12,21,3);break;
      case 'double-burst':
        for(let i=-2;i<=2;i++)arrow(-48,i*9,34,i*5,i===0?5:2,i%2?0xffffff:c);break;
      case 'blast-wave':
        ellipse(0,2,82,56,5);ellipse(0,2,52,34,3,0xffffff,.88);for(let i=-2;i<=2;i++)line(-56,i*13,56,i*13,2,i%2?0xffffff:c,.8);break;
      case 'snap-chop':
        arrow(-22,-35,0,19,5);arrow(20,-29,4,22,3,0xffffff);line(-31,24,31,24,3);break;
      case 'throwby-cross':
        arrow(-44,-18,37,14,4);arrow(31,-28,-25,25,3,0xffffff);ellipse(4,8,52,20,2);break;
      case 'body-clamp':
        line(-35,-28,-35,29,5);line(-35,-28,-16,-28,5);line(-35,29,-16,29,5);line(35,-28,35,29,5);line(35,-28,16,-28,5);line(35,29,16,29,5);arrow(-27,0,-8,0,3,0xffffff);arrow(27,0,8,0,3,0xffffff);break;
      case 'headlock-arc':
        arc(-2,2,43,3.45,6.1,5);arrow(37,-9,19,30,4,0xffffff);ellipse(0,29,72,17,3);break;
      case 'sprawl-shield':
        g.lineStyle(5,c,.95);g.strokeRoundedRect(X(-34),Y(-27),68,55,9);line(-27,-15,27,15,3,0xffffff);line(-27,15,27,-15,3,0xffffff);break;
      case 'counter-chevrons':
        arrow(27,-17,-26,-17,3,0xffffff);arrow(-31,3,38,3,5);arrow(-17,23,25,23,3,c);break;
      case 'whizzer-spiral':
        arc(0,0,35,.15,5.5,4);arc(0,0,20,3.2,8.1,2,0xffffff);arrow(24,-23,38,-2,3);break;
      case 'mat-return':
        arrow(-18,27,-18,-28,4);arrow(15,-27,15,25,5,0xffffff);line(-39,28,39,28,5);ellipse(0,26,78,14,2,c);break;
      case 'tilt-rolls':
        arc(-8,0,32,.2,5.7,4);arc(14,4,24,3.35,8.9,3,0xffffff);ellipse(0,23,64,14,2);break;
      case 'claw-rake':
        for(let i=-1;i<=1;i++)line(-30+i*10,-31,18+i*10,28,i===0?5:3,i===0?0xffffff:c);line(-33,29,35,29,3);break;
      case 'gut-rings':
        ellipse(0,3,70,46,5);ellipse(0,3,47,30,3,0xffffff);ellipse(0,3,23,15,2,c);arrow(-42,0,-25,0,3);arrow(42,0,25,0,3);break;
      case 'cradle-cage':
        line(-37,-29,37,-18,5);line(37,-18,29,31,5);line(29,31,-34,25,5);line(-34,25,-37,-29,5);line(-30,-21,26,25,3,0xffffff);line(29,-12,-27,18,3,0xffffff);break;
      case 'scramble-spiral':
        arc(0,0,36,.3,5.65,4);arc(0,0,22,3.3,8.65,3,0xffffff);for(let i=0;i<4;i++)line(-42+i*12,31,-34+i*12,22,2);break;
      case 'granby-loop':
        arc(-7,1,37,.15,6.05,5);ellipse(10,6,38,24,3,0xffffff);arrow(27,17,42,2,3);break;
      case 'funk-wheel':
        ellipse(0,0,65,65,4);for(let i=0;i<8;i++){const a=Math.PI*2*i/8;line(0,0,Math.round(Math.cos(a)*32),Math.round(Math.sin(a)*32),i%2?2:3,i%2?0xffffff:c);}break;
      case 'switch-arrows':
        arrow(-39,-15,31,-15,4);arrow(34,16,-34,16,4,0xffffff);line(-8,-28,8,28,2,c);break;
      case 'pace-pulse':
        for(let i=0;i<3;i++){const inset=i*9;g.lineStyle(i===1?2:4,i===1?0xffffff:c,.9);g.strokeRoundedRect(X(-36+inset),Y(-28+inset),72-inset*2,56-inset*2,7);}break;
      case 'flurry-streaks':
        for(let i=-2;i<=2;i++)arrow(-50+(hitIndex%2)*8,i*10,39,i*6,i===hitIndex%5-2?5:2,i%2?0xffffff:c);break;
      case 'grind-lines':
        for(let i=-2;i<=2;i++){line(-42,i*10,39,i*10+(i%2?7:-7),i===0?6:3,i%2?0xffffff:c);line(34,i*10+(i%2?7:-7),45,i*10,2,c);}break;
      case 'pin-frame':
        g.lineStyle(5,c,.95);g.strokeRect(X(-37),Y(-31),74,62);g.lineStyle(2,0xffffff,.88);g.strokeRect(X(-27),Y(-21),54,42);arrow(0,-45,0,25,5);line(-42,31,42,31,5);break;
      case 'circle-guard':
        ellipse(0,0,70,58,5);ellipse(0,0,46,36,2,0xffffff);arrow(-35,19,-49,4,3);arrow(35,-19,49,-4,3);break;
      case 'chain-arrows':
        for(let i=-1;i<=1;i++)arrow(-45+i*5,-18+i*18,34-i*4,-12+i*17,i===0?5:3,i%2?0xffffff:c);ellipse(8,4,44,31,2,0xffffff,.75);break;
      case 'ankle-stun':
        ellipse(0,25,72,16,4);for(let i=0;i<6;i++){const a=Math.PI*2*i/6;line(Math.round(Math.cos(a)*13),Math.round(Math.sin(a)*10)-9,Math.round(Math.cos(a)*31),Math.round(Math.sin(a)*24)-9,i%2?2:4,i%2?0xffffff:c);}break;
      case 'spiral-pressure':
        arc(0,2,39,.15,5.8,5);arc(0,2,26,3.3,8.5,3,0xffffff);arrow(-35,23,31,20,3);line(-37,31,38,31,4);break;
      case 'power-half-cage':
        g.lineStyle(5,c,.95);g.strokeRoundedRect(X(-37),Y(-30),74,60,11);line(-29,-22,29,22,4,0xffffff);line(29,-22,-29,22,4,0xffffff);arrow(0,-42,0,22,4);break;
      case 'shakeout-burst':
        for(let i=0;i<10;i++){const a=Math.PI*2*i/10;line(Math.round(Math.cos(a)*15),Math.round(Math.sin(a)*12),Math.round(Math.cos(a)*47),Math.round(Math.sin(a)*38),i%2?2:4,i%2?0xffffff:c);}ellipse(0,0,30,24,3);break;
      case 'peterson-wheel':
        ellipse(0,0,66,66,4);arc(-8,0,27,.1,5.5,4,0xffffff);arrow(29,-22,39,1,4);line(-33,27,32,-27,3);break;
      case 'handfight-pulse':
        for(let i=0;i<3;i++){const inset=i*10;g.lineStyle(i===1?2:4,i===1?0xffffff:c,.9);g.strokeEllipse(Math.round(x),Math.round(y),76-inset*2,56-inset*2);}arrow(-42,0,-12,0,3);arrow(42,0,12,0,3,0xffffff);break;
      case 'mat-pressure-lines':
        for(let i=-2;i<=2;i++){arrow(-48,i*11,39,i*7,i===0?6:3,i%2?0xffffff:c);line(31,i*7,44,i*11,2,c);}line(-44,30,44,30,4,0xffffff);break;
      case 'front-head-frame':
        g.lineStyle(5,c,.95);g.strokeRoundedRect(X(-35),Y(-29),70,58,8);arc(0,-4,25,3.3,6.05,4,0xffffff);arrow(0,-37,0,19,4);break;
      case 'hard-whizzer-cross':
        arrow(-39,-28,31,23,5);arrow(35,-25,-27,27,4,0xffffff);arc(0,0,34,.3,5.6,3);break;
      case 'collar-club':
        arrow(-25,-39,5,18,6);line(-38,-25,31,-25,4,0xffffff);ellipse(4,21,69,17,3);for(let i=-1;i<=1;i++)line(19+i*11,-15,26+i*11,1,2,c);break;
      case 'inside-trip':
        arrow(-38,-19,27,18,5);arc(-2,11,37,3.35,6.1,4,0xffffff);line(-35,28,39,28,5);arrow(31,-4,8,23,3);break;
      case 'desperation-star':
        for(let i=0;i<12;i++){const a=Math.PI*2*i/12,r=i%2?52:45;line(Math.round(Math.cos(a)*13),Math.round(Math.sin(a)*13),Math.round(Math.cos(a)*r),Math.round(Math.sin(a)*r),i%3===0?5:2,i%2?0xffffff:c);}ellipse(0,0,41,41,4);break;
      default:
        ellipse(0,0,58,44,4);for(let i=0;i<8;i++){const a=Math.PI*2*i/8;line(Math.round(Math.cos(a)*10),Math.round(Math.sin(a)*8),Math.round(Math.cos(a)*42),Math.round(Math.sin(a)*31),2,i%2?0xffffff:c);}
    }
    this.tweens.add({targets:g,alpha:0,duration:440,ease:'Cubic.Out',onComplete:()=>g.destroy()});
  }
  personaFlash(sprite,delay=0){if(!sprite)return;this.time.delayedCall(delay,()=>{if(!sprite.scene)return;sprite.setTint(0xffe7b0);this.time.delayedCall(150,()=>{if(sprite.scene)sprite.clearTint();});});}
  resolveTurn(key){
    const l=lead(this.state),e=this.enemy();
    this.inputLocked=true;this.mode='resolving';this.impact='';this.attackAnim=null;this.clearConditionPresentation();this.drawBattle();
    const playerState=this.combatState(l),enemyState=this.combatState(e);
    const ek=chooseAiMove(e,l,{wild:this.type==='wild',attackerState:enemyState,defenderState:playerState});
    const order=turnOrder(l,e,key,ek,{playerState,enemyState});
    const finish=()=>this.completeBattleTurn();
    const act=(role,onDone)=>{
      const playerTurn=role==='player',att=playerTurn?l:e,def=playerTurn?e:l,move=playerTurn?key:ek;
      this.attackBeat({att,def,key:move,attName:wrestlerName(att,{short:true}),defIsEnemy:playerTurn,
        onKO:()=>{this.clearBattleTurn();this.inputLocked=false;if(playerTurn)this.enemyDown();else this.playerDown();},onDone});
    };
    act(order[0],()=>act(order[1],finish));
  }
  resolve(att,def,key,label){const result=resolveTechnique(att,def,key,this.rng,{attackerState:this.combatState(att),defenderState:this.combatState(def)});const mv=result.move;if(!result.hit)return {result,line:`${label} missed ${mv.name}.`,hit:false,dmg:0};return {result,line:result.damage>0?`${label}: ${mv.name} ${result.damage}${result.multiplier>1?' EDGE':''}${result.critical?' CRITICAL':''}.`:`${label} set ${mv.name}.`,hit:true,dmg:result.damage};}
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
    this.rewardText=`${wrestlerName(event.mon,{short:true})} gained ${event.amount} EXP!`;this.inputLocked=true;this.mode='expReward';this.setBattlePhase('exp-gain');this.recordBattleCeremony('exp-announcement',{side:'player',wrestlerId:event.mon.id,amount:event.amount});this.drawBattle();this.typeText(this.resolveText,this.rewardText,17);
    const segments=[];let level=event.before.lvl,xp=event.before.xp;
    while(level<event.after.lvl){segments.push({from:experienceProgress({id:event.before.id,lvl:level,xp}),to:1,levelUpTo:level+1});level++;xp=experienceAtLevel(event.before.id,level);}
    segments.push({from:experienceProgress({id:event.after.id,lvl:level,xp}),to:experienceProgress(event.after),levelUpTo:null});
    this.time.delayedCall(KNOCKOUT_CEREMONY_TIMING.expAnnouncement,()=>{if(!this.scene.isActive())return;this.setBattlePhase('exp-fill');this.recordBattleCeremony('exp-fill-start',{side:'player',wrestlerId:event.mon.id,segments:segments.length});this.playSafe('exp');this.animateRewardSegments(event,segments,0,()=>{this.recordBattleCeremony('exp-fill-complete',{side:'player',wrestlerId:event.mon.id,level:event.after.lvl});this.playRewardMessages(event.automaticMessages,onDone);});});
  }
  animateRewardSegments(event,segments,index,onDone){
    if(index>=segments.length)return onDone();
    const segment=segments[index],value={progress:segment.from};this.rewardViewProgress=segment.from;this.paintRewardExp(segment.from);
    this.tweens.add({targets:value,progress:segment.to,duration:Math.max(280,620*Math.max(.18,segment.to-segment.from)),ease:'Sine.Out',onUpdate:()=>{this.rewardViewProgress=value.progress;this.paintRewardExp(value.progress);},onComplete:()=>{
      if(!segment.levelUpTo)return this.animateRewardSegments(event,segments,index+1,onDone);
      this.rewardViewLevel=segment.levelUpTo;this.rewardViewProgress=0;this.levelSummary=event.levelSteps.find(step=>step.level===segment.levelUpTo)||null;
      if(this.levelSummary)this.rewardViewHp=Math.min(this.levelSummary.afterStats.hp,this.rewardViewHp+Math.max(0,this.levelSummary.afterStats.hp-this.levelSummary.beforeStats.hp));
      this.rewardText=`${wrestlerName(event.mon,{short:true})} grew to Lv. ${segment.levelUpTo}!`;this.mode='levelUp';this.setBattlePhase('level-up');this.recordBattleCeremony('level-up',{side:'player',wrestlerId:event.mon.id,level:segment.levelUpTo});this.playSafe('levelup');this.cameras.main.flash(100,255,240,180);this.drawBattle();this.typeText(this.resolveText,this.rewardText,17);
      this.time.delayedCall(KNOCKOUT_CEREMONY_TIMING.levelUpHold,()=>{this.levelSummary=null;this.mode='expReward';this.drawBattle();this.animateRewardSegments(event,segments,index+1,onDone);});
    }});
  }
  playRewardMessages(messages,onDone){
    const queue=[...messages];let index=0;
    const next=()=>{
      if(index>=queue.length)return this.time.delayedCall(320,onDone);
      this.rewardText=queue[index++];this.mode='expReward';this.setBattlePhase('move-learned');this.recordBattleCeremony('move-learned',{side:'player',wrestlerId:this.rewardEvent?.mon?.id||null,text:this.rewardText});this.drawBattle();this.typeText(this.resolveText,this.rewardText,17);this.time.delayedCall(Phaser.Math.Clamp(this.rewardText.length*20+420,900,1300),next);
    };
    next();
  }
  enemyDown(){
    const defeated=this.enemy();this.state.dex.seen[defeated.id]=true;this.state.dex.defeated[defeated.id]=true;
    this.inputLocked=true;this.turn++;
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
      this.turn++;this.inputLocked=false;this.setBattlePhase('forced-switch');this.recordBattleCeremony('forced-switch-prompt',{side:'player',wrestlerId:lead(this.state)?.id||null});
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
    const l=lead(this.state);this.finalizingBattle=true;this.over=true;this.inputLocked=true;this.mode='postBattle';this.resultTitle='VICTORY';this.recordBattleCeremony('battle-won',{side:'player',opponent:this.opponentName()});
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
  drawBattle(){this.children.removeAll();this.conditionMeters={};this.conditionValueTexts={};this.drawArenaBackdrop();const l=lead(this.state),lr=l?ROSTER[l.id]:ROSTER.buckshot,er=ROSTER[this.enemy().id];
    if(this.mode==='intro'){this.drawIntroStage(l,lr,er);return;}
    if(this.mode==='development'){this.drawDevelopmentStage();return;}
    if(this.mode==='switchCeremony'){this.drawSwitchCeremonyStage(er);return;}
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
    this.resolveText=this.add.text(22,BOTTOM_Y+15,'',{fontFamily:FONT,fontSize:18,color:this.feedbackColor(this.currentFeedback?.kind),fontStyle:'bold',wordWrap:{width:420},lineSpacing:5});
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
  drawSwitchCeremonyStage(er){
    const ceremony=this.switchCeremony;if(!ceremony)return;this.drawBattleBases();this.enemySprite=null;this.playerSprite=null;
    if(ceremony.showEnemy&&this.enemy()?.hp>0){
      this.enemySprite=this.add.image(ENEMY_POS.x,ENEMY_POS.y,battleTextureFor(er.id)).setOrigin(.5,1).setFlipX(battleFlipXFor(er.id,false));
      this.drawStatusBox(14,14,218,66,wrestlerName(this.enemy(),{short:true}),this.enemy(),er,false);
    }
    const mon=ceremony.stage==='withdraw'?ceremony.outgoing:ceremony.incoming,rec=ROSTER[mon.id],startX=ceremony.stage==='send'?-90:PLAYER_POS.x;
    this.playerSprite=this.add.image(startX,PLAYER_POS.y,battleTextureFor(rec.id,true)).setOrigin(.5,1).setFlipX(battleFlipXFor(rec.id,true));
    this.drawStatusBox(250,151,218,80,wrestlerName(mon,{short:true}),mon,rec,true);this.drawBattleMessage();
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
    const s=scaledStats(mon.id,mon.lvl,mon),side=isPlayer?'player':'enemy',presented=this.presentedCondition?.[side],hp=Math.max(0,Math.round(Number.isFinite(presented)?presented:mon.hp)),condition=conditionFor(mon.condition),conditionColor=condition?`#${condition.color.toString(16).padStart(6,'0')}`:'#333';
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(x+3,y+3,w,h,3);
    g.fillStyle(isPlayer?0xf9f2dc:0xfff8e8,1);g.fillRoundedRect(x,y,w,h,3);
    g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,3);
    g.lineStyle(1,isPlayer?0xd3a13a:0xa8b1aa,1);g.strokeRoundedRect(x+3,y+3,w-6,h-6,2);
    g.fillStyle(isPlayer?0x25313a:0x7b1d2a,1);g.fillRect(x+6,y+6,w-12,2);
    this.add.text(x+11,y+9,name,{fontFamily:FONT,fontSize:17,color:'#111',fontStyle:'bold'});
    this.add.text(x+w-11,y+10,`Lv.${mon.lvl}`,{fontFamily:FONT,fontSize:14,color:'#222',fontStyle:'bold'}).setOrigin(1,0);
    this.add.text(x+11,y+36,'COND',{fontFamily:FONT,fontSize:12,color:'#333',fontStyle:'bold'});
    if(condition)this.add.text(x+w-11,y+26,condition.short,{fontFamily:FONT,fontSize:10,color:conditionColor,fontStyle:'bold'}).setOrigin(1,0);
    this.drawConditionMeter(x+58,y+39,w-71,9,hp,s.hp,side,0x55b867);
    if(isPlayer){
      this.add.text(x+11,y+55,'EXP',{fontFamily:FONT,fontSize:11,color:'#355f87',fontStyle:'bold'});
      this.drawAnimatedMeter(x+58,y+58,w-71,6,undefined,experienceProgress(mon),0x3aa5d1);
      this.conditionValueTexts[side]=this.add.text(x+w-12,y+67,`${hp}/${s.hp}`,{fontFamily:FONT,fontSize:12,color:'#222',fontStyle:'bold'}).setOrigin(1,0);
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
    if(this.attackAnim==='enemy')this.playTechniqueImpact(pimg,eimg,this.moveKey,this.moveHitResults,this.moveRecoilResult,this.moveHitCount);
    if(this.attackAnim==='player')this.playTechniqueImpact(eimg,pimg,this.moveKey,this.moveHitResults,this.moveRecoilResult,this.moveHitCount);
    if(this.attackAnim==='playerSetup')this.playTechniqueSetup(pimg,this.moveKey);
    if(this.attackAnim==='enemySetup')this.playTechniqueSetup(eimg,this.moveKey);
    if(this.attackAnim==='miss')this.playTechniqueMiss(this.attackSide==='player'?pimg:eimg,this.moveKey);
    if(this.impact){
      const target=this.attackAnim==='player'||this.attackAnim==='playerSetup'?PLAYER_POS:ENEMY_POS;
      const t=this.add.text(target.x,target.y-120,this.impact,{fontFamily:FONT,fontSize:22,color:'#fff1a6',fontStyle:'bold',stroke:'#111',strokeThickness:5}).setOrigin(.5);
      this.tweens.add({targets:t,y:'-=26',alpha:0,duration:760,ease:'Cubic.Out'});
    }
    this.attackAnim=null;this.attackSide=null;
  }
  drawBattleBases(){const g=this.add.graphics();g.fillStyle(0x0b0b0d,.32);g.fillEllipse(ENEMY_POS.x,ENEMY_POS.y-4,118,21);g.fillEllipse(PLAYER_POS.x,PLAYER_POS.y-4,148,25);g.lineStyle(1,0xffe2a0,.32);g.strokeEllipse(ENEMY_POS.x,ENEMY_POS.y-7,102,15);g.strokeEllipse(PLAYER_POS.x,PLAYER_POS.y-7,132,18);}
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
    if(this.mode==='party')return this.drawPartyNative();
    if(this.mode==='bag')return this.drawBagNative();
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
  drawBagNative(){
    const leadMon=lead(this.state),selected=BAG_ITEMS[this.sel],definition=selected&&ITEM_DEFS[selected.key],quantity=selected?(this.state.items?.[selected.key]||0):0;
    menuFrame(this,'BATTLE BAG',`TARGET ${leadMon?wrestlerName(leadMon,{short:true}).toUpperCase():'NONE'}   A USE   B BACK`);
    menuPanel(this,10,49,276,228);menuPanel(this,294,49,176,228);
    BAG_ITEMS.forEach((item,index)=>menuListRow(this,{x:18,y:57+index*30,width:260,height:29,label:item.name,right:`x${this.state.items?.[item.key]||0}`,active:index===this.sel,disabled:(this.state.items?.[item.key]||0)<=0,striped:index%2===1,fontSize:12}));
    if(selected&&definition){
      menuItemIcon(this,307,62,selected.key,selected.kind,44);
      this.add.text(359,62,selected.name,{fontFamily:FONT,fontSize:13,color:'#7b1d2a',fontStyle:'bold',wordWrap:{width:98}});
      this.add.text(359,101,selected.kind.toUpperCase(),{fontFamily:FONT,fontSize:10,color:'#655f55',fontStyle:'bold'});
      this.add.text(307,130,selected.desc,{fontFamily:FONT,fontSize:12,color:'#3c3934',fontStyle:'bold',wordWrap:{width:144},lineSpacing:2});
      menuSectionLabel(this,307,202,'MATCH USE',144);
      const available=selected.kind==='singlet'
        ?this.type==='wild'&&this.state.flags?.recruitingUnlocked
        :selected.kind==='recovery'||selected.key==='filmStudy';
      const context=selected.kind==='singlet'
        ?available?'RECRUIT THIS PROSPECT':'SCOUTING MATCHES ONLY'
        :selected.kind==='recovery'?`RESTORE ${wrestlerName(leadMon,{short:true}).toUpperCase()}`:'NEXT 3 RECRUIT ATTEMPTS';
      this.add.text(307,229,context,{fontFamily:FONT,fontSize:10,color:available?'#397047':'#8a1720',fontStyle:'bold',wordWrap:{width:144}});
      this.add.text(457,258,`OWNED ${quantity}`,{fontFamily:FONT,fontSize:10,color:quantity?'#3c3934':'#8a1720',fontStyle:'bold'}).setOrigin(1,0);
    }
    menuFooter(this,'USING AN ITEM GIVES THE OPPONENT THE NEXT ACTION');
  }
  drawBag(){this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(10,52,460,258);this.add.text(28,66,'BAG',{fontFamily:FONT,fontSize:20,color:'#111',fontStyle:'bold'});BAG_ITEMS.forEach((it,i)=>{const n=this.state.items?.[it.key]||0,x=28+(i%2)*218,y=101+Math.floor(i/2)*31;this.add.text(x,y,`${i===this.sel?'\u25b6':' '} ${ITEM_DEFS[it.key].short} x${n}`,{fontFamily:FONT,fontSize:16,color:i===this.sel?'#8a1720':'#111',fontStyle:i===this.sel?'bold':'normal'});});const it=BAG_ITEMS[this.sel];if(it)this.add.text(28,238,it.desc,{fontFamily:FONT,fontSize:14,color:'#333',wordWrap:{width:420}});}
  drawPartyNative(){const title=this.forcedSwap?'CHOOSE NEXT WRESTLER':this.preOpponentSwitch?'SWITCH WRESTLER':'TRAVEL LINEUP';const subtitle=this.forcedSwap?'A SEND OUT':this.preOpponentSwitch?'A SWITCH   B STAY':'A SWITCH   B BACK';drawLineupScreen(this,{party:this.state.party,selected:this.sel,title,subtitle});}
  drawParty(){this.add.rectangle(GAME_W/2,GAME_H/2,GAME_W,GAME_H,0x08080c,.42);this.drawTextBox(10,65,460,245);const title=this.forcedSwap?'CHOOSE NEXT WRESTLER':this.preOpponentSwitch?'SWITCH WRESTLER':'TRAVEL LINEUP';this.add.text(28,80,title,{fontFamily:FONT,fontSize:19,color:this.forcedSwap?'#b41820':'#111',fontStyle:'bold'});this.state.party.forEach((m,i)=>{const s=scaledStats(m.id,m.lvl,m),tag=m.hp<=0?'  OUT':conditionShort(m.condition)?`  ${conditionShort(m.condition)}`:'';this.add.text(28,116+i*29,`${i===this.sel?'\u25b6':' '} ${wrestlerName(m)}  Lv.${m.lvl}`,{fontFamily:FONT,fontSize:15,color:i===this.sel?'#8a1720':m.hp<=0?'#888':'#111',fontStyle:i===this.sel?'bold':'normal'});this.add.text(440,116+i*29,`C ${m.hp}/${s.hp}${tag}`,{fontFamily:FONT,fontSize:14,color:m.hp<=0?'#888':'#333',fontStyle:'bold'}).setOrigin(1,0);});}
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
  beginConditionPresentation(defIsEnemy,beforeAttHp,beforeDefHp){
    this.presentedCondition=defIsEnemy
      ?{player:beforeAttHp,enemy:beforeDefHp}
      :{player:beforeDefHp,enemy:beforeAttHp};
    this.conditionHitIndex=0;
  }
  clearConditionPresentation(){this.presentedCondition=null;this.conditionMeters={};this.conditionValueTexts={};this.conditionHitIndex=null;}
  conditionStepDuration(frame,choreography){
    const cap=choreography.tempo.hitStagger?Math.max(180,choreography.tempo.hitStagger-70):520;
    return Phaser.Math.Clamp((frame?.damage||1)*18,180,cap);
  }
  impactStartTimes(choreography,frames){
    let nextStart=0;
    return frames.map((frame,index)=>{
      const nominal=index*(choreography.tempo.hitStagger||0),start=Math.max(nominal,nextStart);
      nextStart=start+choreography.tempo.conditionLead+this.conditionStepDuration(frame,choreography)+choreography.tempo.interHitPause;
      return start;
    });
  }
  conditionImpactDuration(choreography,frames){
    if(!frames.length)return 0;
    const starts=this.impactStartTimes(choreography,frames);
    return starts.at(-1)+choreography.tempo.conditionLead+this.conditionStepDuration(frames.at(-1),choreography);
  }
  conditionSequenceDuration(choreography,frames,recoilResult){
    const impact=this.conditionImpactDuration(choreography,frames);
    const recoil=recoilResult?impact+100+this.conditionStepDuration(recoilResult,choreography):0;
    return Math.max(choreography.tempo.feedback,impact+100,recoil+100);
  }
  paintMeter(g,x,y,w,h,progress,color){
    const p=Phaser.Math.Clamp(progress,0,1),fill=p<=0?0:Math.max(1,Math.floor(w*p));
    g.clear();g.fillStyle(0x111111,1);g.fillRoundedRect(x-1,y-1,w+2,h+2,1);g.fillStyle(0x3d3d3d,1);g.fillRect(x,y,w,h);
    if(fill>0){g.fillStyle(p<.22?0xd84c35:p<.5?0xd6b545:color,1);g.fillRect(x,y,fill,h);g.fillStyle(0xffffff,.3);g.fillRect(x,y,fill,1);}
    g.lineStyle(1,0x080808,1);g.strokeRect(x-1,y-1,w+2,h+2);
  }
  drawConditionMeter(x,y,w,h,hp,maxHp,side,color){
    const g=this.add.graphics(),display={g,x,y,w,h,maxHp,color};
    this.conditionMeters[side]=display;this.paintMeter(g,x,y,w,h,hp/Math.max(1,maxHp),color);return g;
  }
  animateConditionStep(side,frame,choreography,index=0,kind='hit'){
    if(!this.presentedCondition)return;
    const from=Math.max(0,frame.hpBefore??this.presentedCondition[side]??0),to=Math.max(0,frame.hpAfter??from-frame.damage),duration=this.conditionStepDuration(frame,choreography),value={hp:from};
    const residual=kind==='residual',phase=kind==='recoil'?'recoil-drain':residual?'condition-residual':'condition-drain',startBeat=kind==='recoil'?'recoil-condition':residual?'condition-residual-start':'condition-start',completeBeat=kind==='recoil'?'recoil-complete':residual?'condition-residual-complete':'condition-complete';
    this.conditionHitIndex=index+1;this.setBattlePhase(phase);this.recordBattleBeat(startBeat,{moveKey:this.moveKey,side:this.moveActorSide,targetSide:side,hitIndex:index+1,damage:frame.damage});
    const presentation={moveKey:this.moveKey,kind,side,hitIndex:index+1,from,to,damage:frame.damage,critical:Boolean(frame.critical),completed:false};
    this.conditionPresentationHistory.push(presentation);
    if(this.conditionPresentationHistory.length>64)this.conditionPresentationHistory.shift();
    const draw=()=>{
      const hp=Math.max(0,Math.round(value.hp));this.presentedCondition[side]=hp;
      const display=this.conditionMeters[side];if(display?.g?.scene)this.paintMeter(display.g,display.x,display.y,display.w,display.h,hp/Math.max(1,display.maxHp),display.color);
      const valueText=this.conditionValueTexts[side];if(valueText?.scene)valueText.setText(`${hp}/${display?.maxHp||hp}`);
    };
    draw();this.tweens.add({targets:value,hp:to,duration,ease:'Linear',onUpdate:draw,onComplete:()=>{value.hp=to;draw();presentation.completed=true;this.recordBattleBeat(completeBeat,{moveKey:this.moveKey,side:this.moveActorSide,targetSide:side,hitIndex:index+1,damage:frame.damage});}});
  }
  drawAnimatedMeter(x,y,w,h,start,end,color){
    const g=this.add.graphics(),value={p:Phaser.Math.Clamp(start??end,0,1)},draw=()=>this.paintMeter(g,x,y,w,h,value.p,color);draw();
    if(start!==undefined&&Math.abs(start-end)>.01)this.tweens.add({targets:value,p:Phaser.Math.Clamp(end,0,1),duration:520,ease:'Sine.Out',onUpdate:draw});
    return g;
  }
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
