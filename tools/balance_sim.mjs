import {makeMon,scaledStats} from '../src/data/roster.js';
import {chooseAiMove,resolveTechnique,restoreWrestler} from '../src/systems/mechanics.js';
import {AREAS} from '../src/data/maps.js';
function resolve(att,def,key){return resolveTechnique(att,def,key).hit;}
function bestMove(att,def){return chooseAiMove(att,def);}
function heal(m){restoreWrestler(m);}
// simulate a full party-vs-team gym fight, with forced swap to next healthy party member on faint (free swap, no extra hit)
function gymFight(party,team,chews){
  let pi=0;const p=party.map(m=>({...m}));p.forEach(heal);
  for(const foeSpec of team){
    const e={...foeSpec};heal(e);
    while(true){
      if(pi>=p.length)return false; // whole party fainted
      const me=p[pi];
      resolve(me,e,bestMove(me,e));
      if(e.hp<=0)break; // this foe down, move to next foe (no extra swap needed, same wrestler continues)
      const ms=scaledStats(me.id,me.lvl,me);
      if(chews.n>0&&me.hp<ms.hp*.3){me.hp=Math.min(ms.hp,me.hp+20);chews.n--;}
      else resolve(e,me,chooseAiMove(e,me));
      if(me.hp<=0)pi++; // faint -> forced swap to next party member, free (no extra enemy hit this turn)
    }
  }
  return true;
}
function trial(gymKey,partyDef,lvl,chewCount){
  const cap=AREAS[gymKey].captain;
  const party=partyDef.map(id=>makeMon(id,lvl));
  const team=cap.team.map(([id,l])=>makeMon(id,l));
  return gymFight(party,team,{n:chewCount});
}
function winRate(gymKey,partyDef,lvl,chewCount,N=300){
  let w=0;for(let i=0;i<N;i++)if(trial(gymKey,partyDef,lvl,chewCount))w++;return w/N;
}
console.log('--- Field House Badge vs solo starter at captain-recommended level ---');
console.log('  buckvarsity L9 solo, 2 chews:', (winRate('conference',['buckvarsity'],9,2)*100).toFixed(0)+'%');
console.log('  buckshot L7 solo, 2 chews (underleveled check):', (winRate('conference',['buckshot'],7,2)*100).toFixed(0)+'%');
console.log('--- Picnic Point Badge ---');
console.log('  party of 2 L15, 3 chews:', (winRate('river',['funkflyer','matgeneral'],15,3)*100).toFixed(0)+'%');
console.log('  solo L15, 3 chews (should be harder):', (winRate('river',['funkflyer'],15,3)*100).toFixed(0)+'%');
console.log('--- Kohl Badge ---');
console.log('  party of 3 L18, 4 chews:', (winRate('championship',['buckallam','scramblesaint','rideking'],18,4)*100).toFixed(0)+'%');
console.log('  party of 2 L16 (underleveled check):', (winRate('championship',['buckallam','scramblesaint'],16,3)*100).toFixed(0)+'%');
console.log('--- Conference calibration across levels (solo buckshot line, 2 chews) ---');
for(const lvl of [7,8,9,10,11,12]){
  const partyId = lvl>=10?'buckvarsity':'buckshot';
  console.log(`  ${partyId} L${lvl}:`, (winRate('conference',[partyId],lvl,2)*100).toFixed(0)+'%');
}
