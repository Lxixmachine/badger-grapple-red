import {ROSTER,scaledStats,makeMon} from '../data/roster.js';
import {MOVES,ADV} from '../data/moves.js';
import {loadState,saveState} from '../systems/save.js';
import {uiBox,setVirtualHandler} from '../systems/ui.js';

const Phaser = window.Phaser;
const OPTS=['RECRUIT','SCOUT FURTHER','LEAVE'];
const STYLE_COLORS={Neutral:0xb41820,Top:0x5f4cc8,Scramble:0xe47c27,Pace:0x2e9c57,Defense:0x6d66c8,Upperbody:0x3f8bb8};

export class ScoutScene extends Phaser.Scene{
  constructor(){super('ScoutScene');}

  create(data={}){
    this.id=data.id||'buckshot';
    this.lvl=data.lvl||4;
    this.area=data.area||'campus';
    this.state=loadState();
    this.sel=0;
    this.note='';
    this.result='';
    this.tempInterest=Phaser.Math.Between(45,88);
    this.cameras.main.setBackgroundColor('#1b1d21');
    this.input.keyboard.on('keydown-UP',()=>this.move(-1));
    this.input.keyboard.on('keydown-DOWN',()=>this.move(1));
    this.input.keyboard.on('keydown-LEFT',()=>this.move(-1));
    this.input.keyboard.on('keydown-RIGHT',()=>this.move(1));
    this.input.keyboard.on('keydown-ENTER',()=>this.choose());
    this.input.keyboard.on('keydown-SPACE',()=>this.choose());
    this.input.keyboard.on('keydown-ESC',()=>this.leave());
    setVirtualHandler(this);
    this.render();
  }

  potential(r){return {Common:'C+',Uncommon:'B',Rare:'A-',Elite:'A+'}[r.rarity]||'C';}
  odds(r){const base={Common:.50,Uncommon:.38,Rare:.24,Elite:.12}[r.rarity]||.34;const gr=Math.min(.22,(this.state.grit||0)*.01);const interest=(this.tempInterest||62)/500;const seen=this.state.dex?.seen?.[this.id]?.05:0;const film=(this.state.items?.film||0)>0?.04:0;return Math.max(.05,Math.min(.9,base+gr+interest+seen+film));}
  overall(s){return Math.round((s.hp+s.atk+s.def+s.spd+s.gas)/12);}
  styleColor(style){return STYLE_COLORS[style]||0xb41820;}
  tip(style){const a=Object.keys(ADV).find(k=>ADV[k]===style);return `${a||'Neutral'} attacks`;}

  render(){
    this.children.removeAll();
    const r=ROSTER[this.id]||ROSTER.buckshot;
    const s=scaledStats(this.id,this.lvl);
    const odds=Math.round(this.odds(r)*100);
    this.drawBackdrop(r);
    this.drawHeader(r);
    this.drawProspect(r,s,odds);
    this.drawMoves(r);
    this.drawOptions();
    if(this.note)this.drawNote(this.note);
  }

  drawBackdrop(r){
    const g=this.add.graphics();
    g.fillStyle(0x20242a,1);g.fillRect(0,0,240,170);
    g.fillStyle(0x111015,.55);g.fillRect(0,119,240,51);
    g.lineStyle(2,this.styleColor(r.style),.85);g.strokeEllipse(65,86,106,30);
    g.lineStyle(1,0xd6a336,.45);g.strokeEllipse(65,86,80,21);
    g.fillStyle(0xffffff,.06);g.fillRect(0,0,240,54);
    for(let y=7;y<53;y+=7){g.lineStyle(1,0xffffff,.04);g.lineBetween(0,y,240,y);}
  }

  drawHeader(r){
    const g=this.add.graphics();
    g.fillStyle(0x000000,.24);g.fillRoundedRect(10,8,220,18,3);
    g.fillStyle(0x151318,.95);g.fillRoundedRect(8,6,220,18,3);
    g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(8,6,220,18,3);
    g.fillStyle(this.styleColor(r.style),1);g.fillRect(11,9,214,2);
    this.add.text(16,12,'SCOUT REPORT',{fontFamily:'monospace',fontSize:8,color:'#fff2c7',fontStyle:'bold'});
    this.add.text(224,12,this.area.toUpperCase(),{fontFamily:'monospace',fontSize:6,color:'#d6a336',fontStyle:'bold'}).setOrigin(1,0);
  }

  drawProspect(r,s,odds){
    this.drawBox(10,30,220,72);
    const shadow=this.add.ellipse(62,88,62,14,0x000000,.28);
    shadow.setDepth(0);
    const img=this.add.image(62,73,'battle_'+r.asset).setScale(.62);
    if(r.tint||r.color)img.setTint(r.tint||r.color);
    this.drawTag(21,34,r.rarity.toUpperCase(),this.styleColor(r.style));
    this.add.text(100,36,r.name,{fontFamily:'monospace',fontSize:9,color:'#111',fontStyle:'bold'});
    this.add.text(100,49,`${r.weight} lb  ${r.style}  Lv ${this.lvl}`,{fontFamily:'monospace',fontSize:6,color:'#333',fontStyle:'bold'});
    this.add.text(100,60,`POT ${this.potential(r)}  OVR ${this.overall(s)}  INT ${this.tempInterest}%`,{fontFamily:'monospace',fontSize:6,color:'#333'});
    this.drawMeter(101,73,58,5,s.hp/(s.hp+10),0x55b867,'HP',`${s.hp}`);
    this.drawMeter(101,84,58,4,s.gas/(s.gas+10),0x5aa4e6,'EP',`${s.gas}`);
    this.drawOddsCard(173,66,odds);
  }

  drawMoves(r){
    this.drawBox(10,106,220,35);
    this.add.text(18,111,'TECHNIQUES',{fontFamily:'monospace',fontSize:7,color:'#8a1720',fontStyle:'bold'});
    r.moves.slice(0,4).forEach((key,i)=>{
      const m=MOVES[key];
      const x=19+(i%2)*105,y=122+(i>1?10:0);
      this.add.text(x,y,`${m.name}`,{fontFamily:'monospace',fontSize:6,color:'#111',fontStyle:'bold'});
      this.add.text(x+58,y,`${m.style[0]}${m.power}`,{fontFamily:'monospace',fontSize:5,color:'#555'});
    });
    this.add.text(126,111,this.tip(r.style),{fontFamily:'monospace',fontSize:6,color:'#555',fontStyle:'bold'}).setOrigin(0,0);
  }

  drawOptions(){
    const widths=[58,82,46];
    let x=13;
    OPTS.forEach((label,i)=>{
      const w=widths[i],active=i===this.sel;
      const g=this.add.graphics();
      g.fillStyle(0x000000,.2);g.fillRoundedRect(x+2,146,w,15,2);
      g.fillStyle(active?0x7b1d2a:0xf8f0d8,1);g.fillRoundedRect(x,144,w,15,2);
      g.lineStyle(1,active?0xd6a336:0x847868,1);g.strokeRoundedRect(x,144,w,15,2);
      this.add.text(x+w/2,148,`${active?'> ':''}${label}`,{fontFamily:'monospace',fontSize:5,color:active?'#fff2c7':'#111',fontStyle:'bold'}).setOrigin(.5,0);
      x+=w+8;
    });
  }

  drawOddsCard(x,y,odds){
    const g=this.add.graphics();
    g.fillStyle(0x151318,.9);g.fillRoundedRect(x,y,45,24,3);
    g.lineStyle(1,0xd6a336,.9);g.strokeRoundedRect(x,y,45,24,3);
    this.add.text(x+22,y+4,'ODDS',{fontFamily:'monospace',fontSize:5,color:'#d6a336',fontStyle:'bold'}).setOrigin(.5,0);
    this.add.text(x+22,y+13,`${odds}%`,{fontFamily:'monospace',fontSize:9,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  drawMeter(x,y,w,h,p,color,label,value){
    this.add.text(x,y-3,label,{fontFamily:'monospace',fontSize:5,color:'#555',fontStyle:'bold'}).setOrigin(1,0);
    const g=this.add.graphics();
    g.fillStyle(0x111111,1);g.fillRoundedRect(x+4,y-1,w+2,h+2,1);
    g.fillStyle(0x3d3d3d,1);g.fillRect(x+5,y,w,h);
    g.fillStyle(color,1);g.fillRect(x+5,y,Math.max(1,w*Phaser.Math.Clamp(p,0,1)),h);
    g.fillStyle(0xffffff,.3);g.fillRect(x+5,y,Math.max(1,w*Phaser.Math.Clamp(p,0,1)),1);
    this.add.text(x+w+11,y-4,value,{fontFamily:'monospace',fontSize:5,color:'#333',fontStyle:'bold'});
  }

  drawBox(x,y,w,h){
    const g=this.add.graphics();
    g.fillStyle(0x000000,.25);g.fillRoundedRect(x+3,y+3,w,h,4);
    g.fillStyle(0xfff6dc,1);g.fillRoundedRect(x,y,w,h,4);
    g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,4);
    g.lineStyle(1,0xffffff,.55);g.strokeRoundedRect(x+2,y+2,w-4,h-4,3);
    g.lineStyle(1,0xa58d65,.8);g.strokeRoundedRect(x+4,y+4,w-8,h-8,2);
    return g;
  }

  drawTag(x,y,text,color){
    const g=this.add.graphics();
    g.fillStyle(color,.95);g.fillRoundedRect(x,y,48,10,2);
    g.lineStyle(1,0x111111,.7);g.strokeRoundedRect(x,y,48,10,2);
    this.add.text(x+24,y+2,text,{fontFamily:'monospace',fontSize:5,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  drawNote(msg){
    const g=this.add.graphics();
    g.fillStyle(0x111015,.92);g.fillRoundedRect(39,154,162,11,2);
    g.lineStyle(1,0xd6a336,.7);g.strokeRoundedRect(39,154,162,11,2);
    this.add.text(120,157,msg,{fontFamily:'monospace',fontSize:5,color:'#fff2c7',fontStyle:'bold'}).setOrigin(.5,0);
  }

  move(d){this.sel=Phaser.Math.Wrap(this.sel+d,0,OPTS.length);this.note='';this.render();}
  choose(){if(this.sel===0)return this.tryRecruit();if(this.sel===1)return this.battle();this.leave();}
  battle(){this.state.dex.seen[this.id]=true;this.state.stats.scouts=(this.state.stats.scouts||0)+1;saveState(this.state);this.scene.start('BattleScene',{enemyId:this.id,enemyLevel:this.lvl,battleType:'wild'});}

  tryRecruit(){
    const r=ROSTER[this.id];
    this.state.dex.seen[this.id]=true;
    if(this.state.dex.caught[this.id]){this.note='Already on roster.';return this.render();}
    if((this.state.items.invite||0)<=0){this.note='No invites left.';return this.render();}
    this.state.items.invite--;
    const success=Math.random()<this.odds(r);
    if(success){
      const m=makeMon(this.id,this.lvl);
      this.state.dex.caught[this.id]=true;
      if(this.state.party.length<6)this.state.party.push(m);else this.state.box.push(m);
      this.state.stats.recruits=(this.state.stats.recruits||0)+1;
      this.state.message=`${r.name} joined the room!`;
      if((Object.keys(this.state.dex.caught||{}).filter(k=>this.state.dex.caught[k]).length)>=2){
        this.state.objective={id:'first_recruit_done',stage:2,complete:true};
      }
      saveState(this.state);
      this.obtainAnim(`${r.name} joined!`);
    }else{
      this.state.message=`${r.name} wants to see more.`;
      saveState(this.state);
      this.note='Recruit passed. Try battle.';
      this.render();
    }
  }

  obtainAnim(msg){
    this.children.removeAll();
    this.cameras.main.flash(160,255,255,255);
    uiBox(this,18,52,204,62);
    this.add.text(120,65,'RECRUIT OBTAINED',{fontFamily:'monospace',fontSize:10,color:'#b41820',fontStyle:'bold'}).setOrigin(.5);
    this.add.text(120,84,msg,{fontFamily:'monospace',fontSize:8,color:'#111',align:'center',wordWrap:{width:174}}).setOrigin(.5);
    this.add.text(120,105,'A CONTINUE',{fontFamily:'monospace',fontSize:7,color:'#555',fontStyle:'bold'}).setOrigin(.5);
    this.input.keyboard.once('keydown-ENTER',()=>this.leave());
    this.input.keyboard.once('keydown-SPACE',()=>this.leave());
    this.sel=2;
  }

  leave(){this.scene.start('OverworldScene');}
  handleVirtualButton(k){if(k==='left'||k==='up')this.move(-1);if(k==='right'||k==='down')this.move(1);if(k==='a')this.choose();if(k==='b')this.leave();}
}
