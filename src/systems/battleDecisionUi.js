import {FONT} from './ui.js';
import {MENU_UI,menuCss,menuPanel,menuSectionLabel} from './nativeMenuUi.js';

const CATEGORY_LABELS=Object.freeze({
  technique:'TECHNIQUE',
  strength:'STRENGTH',
  status:'SETUP'
});

const CATEGORY_COLORS=Object.freeze({
  technique:0x356d96,
  strength:MENU_UI.cardinal,
  status:0x397047
});

const STYLE_COLORS=Object.freeze({
  Shooter:0x8a3040,
  Scrambler:0x2f7768,
  Rider:0x5e4b91,
  Bull:0x9a5b28,
  Thrower:0x356d96,
  Wall:0x59626b,
  Open:0x655f55
});

export function techniqueCategoryLabel(move){return CATEGORY_LABELS[move?.category]||'TECHNIQUE';}
export function techniqueCategoryColor(move){return CATEGORY_COLORS[move?.category]||MENU_UI.muted;}
export function techniqueStyleColor(move){return STYLE_COLORS[move?.style]||MENU_UI.muted;}

function moveNameSize(name,max=16){
  const length=String(name||'').length;
  return length>18?Math.max(11,max-3):length>14?Math.max(12,max-2):length>11?Math.max(13,max-1):max;
}

function labelChip(scene,x,y,label,color){
  const width=Math.max(50,Math.min(88,Math.ceil(String(label).length*6.5)+14));
  const g=scene.add.graphics();
  g.fillStyle(color,.14);g.fillRect(x,y,width,19);
  g.lineStyle(1,color,.9);g.strokeRect(x,y,width,19);
  scene.add.text(x+width/2,y+3,label,{fontFamily:FONT,fontSize:10,color:menuCss(color),fontStyle:'bold'}).setOrigin(.5,0);
  return width;
}

export function battleTechniqueRow(scene,options={}){
  const x=options.x??18,y=options.y??80,width=options.width??234,height=options.height??32;
  const active=Boolean(options.active),disabled=Boolean(options.disabled),move=options.move;
  const g=scene.add.graphics();
  if(active){
    g.fillStyle(MENU_UI.cardinal,.13);g.fillRect(x,y,width,height);
    g.lineStyle(1,MENU_UI.cardinal,.95);g.strokeRect(x,y,width,height);
  }else if(options.striped){g.fillStyle(MENU_UI.line,.09);g.fillRect(x,y,width,height);}
  if(options.skip){
    scene.add.text(x+7,y+7,active?'>':' ',{fontFamily:FONT,fontSize:13,color:active?'#b41820':'#655f55',fontStyle:'bold'});
    scene.add.text(x+24,y+7,options.label||'DO NOT LEARN',{fontFamily:FONT,fontSize:13,color:active?'#8a1720':'#3c3934',fontStyle:'bold'});
    scene.add.text(x+width-8,y+8,'SKIP',{fontFamily:FONT,fontSize:10,color:'#8a1720',fontStyle:'bold'}).setOrigin(1,0);
    return g;
  }
  if(!move)return g;
  const color=disabled?'#8d887e':active?'#8a1720':'#17151a';
  scene.add.text(x+7,y+4,active?'>':' ',{fontFamily:FONT,fontSize:13,color:active?'#b41820':'#655f55',fontStyle:'bold'});
  scene.add.text(x+24,y+3,move.name,{fontFamily:FONT,fontSize:moveNameSize(move.name,13),color,fontStyle:active?'bold':'normal'});
  scene.add.text(x+24,y+18,`${move.style.toUpperCase()} / ${techniqueCategoryLabel(move)}`,{fontFamily:FONT,fontSize:9,color:disabled?'#9a958b':menuCss(techniqueStyleColor(move)),fontStyle:'bold'});
  if(options.stamina){
    scene.add.text(x+width-8,y+5,`STA ${options.stamina}`,{fontFamily:FONT,fontSize:10,color:disabled?'#8d887e':'#355f87',fontStyle:'bold'}).setOrigin(1,0);
  }
  return g;
}

export function battleTechniqueDetail(scene,options={}){
  const x=options.x??268,y=options.y??49,width=options.width??202,height=options.height??228;
  const move=options.move;if(!move)return;
  if(options.panel!==false)menuPanel(scene,x,y,width,height);
  menuSectionLabel(scene,x+12,y+10,options.title||'TECHNIQUE',width-24);
  scene.add.text(x+12,y+37,move.name,{fontFamily:FONT,fontSize:moveNameSize(move.name,17),color:'#7b1d2a',fontStyle:'bold'});
  const styleWidth=labelChip(scene,x+12,y+64,move.style.toUpperCase(),techniqueStyleColor(move));
  labelChip(scene,x+18+styleWidth,y+64,techniqueCategoryLabel(move),techniqueCategoryColor(move));
  const rows=[
    ['POWER',move.power>0?String(move.power):'--'],
    ['ACCURACY',`${Math.round((move.acc??1)*100)}%`],
    ['STAMINA',options.stamina||String(move.pp??'--')]
  ];
  rows.forEach(([label,value],index)=>{
    const rowY=y+94+index*24;
    const g=scene.add.graphics();g.fillStyle(MENU_UI.line,index%2?.12:.06);g.fillRect(x+12,rowY,width-24,21);
    scene.add.text(x+18,rowY+3,label,{fontFamily:FONT,fontSize:10,color:'#655f55',fontStyle:'bold'});
    scene.add.text(x+width-18,rowY+2,value,{fontFamily:FONT,fontSize:12,color:'#17151a',fontStyle:'bold'}).setOrigin(1,0);
  });
  scene.add.text(x+14,y+170,move.summary||'',{fontFamily:FONT,fontSize:11,color:'#3c3934',fontStyle:'bold',wordWrap:{width:width-28},lineSpacing:2});
  const formMatch=Boolean(options.formMatch);
  scene.add.text(x+14,y+207,formMatch?'FORM MATCH  x1.5':'NO FORM BONUS',{fontFamily:FONT,fontSize:10,color:formMatch?'#397047':'#655f55',fontStyle:'bold'});
}

export function battleDecisionButtons(scene,options={}){
  const x=options.x??10,y=options.y??284,width=options.width??460,height=options.height??26;
  const labels=options.labels||[];const selected=options.selected??0;
  menuPanel(scene,x,y,width,height,options.fill??MENU_UI.paper);
  const cellWidth=width/Math.max(1,labels.length),g=scene.add.graphics();
  labels.forEach((label,index)=>{
    const left=x+index*cellWidth;
    if(index===selected){g.fillStyle(MENU_UI.cardinal,.13);g.fillRect(left+5,y+4,cellWidth-10,height-8);g.lineStyle(1,MENU_UI.cardinal,.9);g.strokeRect(left+5,y+4,cellWidth-10,height-8);}
    if(index>0){g.fillStyle(MENU_UI.line,.8);g.fillRect(left,y+5,1,height-10);}
    scene.add.text(left+cellWidth/2,y+5,`${index===selected?'> ':''}${label}`,{fontFamily:FONT,fontSize:11,color:index===selected?'#8a1720':'#3c3934',fontStyle:'bold'}).setOrigin(.5,0);
  });
}

export function battleDecisionConfirm(scene,options={}){
  const veil=scene.add.graphics();veil.fillStyle(0x08080c,.62);veil.fillRect(0,0,480,320);
  const x=72,y=84,width=336,height=156;menuPanel(scene,x,y,width,height);
  scene.add.text(x+18,y+17,options.title||'CONFIRM',{fontFamily:FONT,fontSize:17,color:'#7b1d2a',fontStyle:'bold'});
  scene.add.text(x+18,y+48,options.body||'',{fontFamily:FONT,fontSize:13,color:'#3c3934',fontStyle:'bold',wordWrap:{width:width-36},lineSpacing:3});
  const labels=options.labels||['YES','NO'],selected=options.selected??0,cellWidth=(width-36)/labels.length,g=scene.add.graphics();
  labels.forEach((label,index)=>{
    const left=x+18+index*cellWidth,top=y+112;
    if(index===selected){g.fillStyle(MENU_UI.cardinal,.13);g.fillRect(left,top,cellWidth-8,28);g.lineStyle(1,MENU_UI.cardinal,1);g.strokeRect(left,top,cellWidth-8,28);}
    scene.add.text(left+(cellWidth-8)/2,top+5,`${index===selected?'> ':''}${label}`,{fontFamily:FONT,fontSize:13,color:index===selected?'#8a1720':'#17151a',fontStyle:'bold'}).setOrigin(.5,0);
  });
}
