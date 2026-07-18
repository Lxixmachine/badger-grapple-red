import {conditionShort} from '../data/conditions.js';
import {experienceProgress} from '../data/experience.js';
import {moveStaminaMax} from '../data/moves.js';
import {
  ROSTER,
  battleTextureFor,
  currentMoveStamina,
  scaledStats,
  wrestlerName
} from '../data/roster.js';
import {FONT} from './ui.js';

export const ROSTER_UI = Object.freeze({
  ink: 0x17151a,
  paper: 0xfff7df,
  paperAlt: 0xf3e8ca,
  navy: 0x111c2d,
  navyLight: 0x172b43,
  cardinal: 0x7b1d2a,
  cardinalBright: 0xb41820,
  gold: 0xd6a336,
  line: 0xbca66f,
  green: 0x55b867,
  blue: 0x3aa5d1,
  muted: 0x655f55
});

function css(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function rosterFrame(scene, title, subtitle = '') {
  const g = scene.add.graphics();
  g.fillStyle(ROSTER_UI.navy, 1);
  g.fillRect(0, 0, 480, 320);
  g.fillStyle(ROSTER_UI.navyLight, 1);
  g.fillRect(0, 42, 480, 278);
  for (let y = 58; y < 320; y += 32) {
    g.fillStyle(0xffffff, 0.025);
    g.fillRect(0, y, 480, 1);
  }
  g.fillStyle(ROSTER_UI.cardinal, 1);
  g.fillRect(0, 0, 480, 5);
  g.fillStyle(ROSTER_UI.gold, 1);
  g.fillRect(0, 5, 480, 2);
  g.fillStyle(ROSTER_UI.cardinal, 1);
  g.fillRect(0, 39, 480, 3);
  scene.add.text(16, 9, title, {
    fontFamily: FONT,
    fontSize: 19,
    color: '#fff2c7',
    fontStyle: 'bold'
  });
  if (subtitle) {
    scene.add.text(464, 15, subtitle, {
      fontFamily: FONT,
      fontSize: 11,
      color: '#f0dca8',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
  }
}

export function rosterPanel(scene, x, y, width, height, fill = ROSTER_UI.paper) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35);
  g.fillRect(x + 4, y + 4, width, height);
  g.fillStyle(fill, 1);
  g.fillRect(x, y, width, height);
  g.lineStyle(3, ROSTER_UI.ink, 1);
  g.strokeRect(x, y, width, height);
  g.lineStyle(1, ROSTER_UI.gold, 1);
  g.strokeRect(x + 5, y + 5, width - 10, height - 10);
  return g;
}

export function rosterMeter(scene, x, y, width, value, color, height = 7) {
  const ratio = Math.max(0, Math.min(1, Number(value) || 0));
  const g = scene.add.graphics();
  g.fillStyle(ROSTER_UI.ink, 1);
  g.fillRect(x - 1, y - 1, width + 2, height + 2);
  g.fillStyle(0x3b3a37, 1);
  g.fillRect(x, y, width, height);
  if (ratio > 0) {
    g.fillStyle(color, 1);
    g.fillRect(x, y, Math.max(1, Math.floor(width * ratio)), height);
    g.fillStyle(0xffffff, 0.28);
    g.fillRect(x, y, Math.max(1, Math.floor(width * ratio)), 1);
  }
  return g;
}

function staminaTotals(mon) {
  const moves = mon?.moves || ROSTER[mon?.id]?.moves || [];
  return moves.reduce((totals, key) => ({
    current: totals.current + currentMoveStamina(mon, key),
    maximum: totals.maximum + moveStaminaMax(key)
  }), {current: 0, maximum: 0});
}

export function drawLineupRow(scene, mon, index, selected, options = {}) {
  const x = options.x ?? 190;
  const y = options.y ?? 58 + index * 40;
  const width = options.width ?? 274;
  const height = options.height ?? 39;
  const stats = scaledStats(mon.id, mon.lvl, mon);
  const status = conditionShort(mon.condition);
  const activeColor = selected ? ROSTER_UI.cardinalBright : ROSTER_UI.ink;
  const g = scene.add.graphics();
  if (selected) {
    g.fillStyle(ROSTER_UI.cardinal, 0.13);
    g.fillRect(x, y, width, height);
    g.lineStyle(1, ROSTER_UI.cardinal, 0.9);
    g.strokeRect(x, y, width, height);
  } else if (index % 2 === 1) {
    g.fillStyle(ROSTER_UI.line, 0.09);
    g.fillRect(x, y, width, height);
  }
  scene.add.text(x + 7, y + 4, selected ? '>' : (index === 0 ? '*' : ' '), {
    fontFamily: FONT,
    fontSize: 14,
    color: css(activeColor),
    fontStyle: 'bold'
  });
  scene.add.text(x + 23, y + 4, wrestlerName(mon, {short: true}), {
    fontFamily: FONT,
    fontSize: 14,
    color: css(activeColor),
    fontStyle: selected ? 'bold' : 'normal'
  });
  if (status) {
    scene.add.text(x + width - 55, y + 5, status, {
      fontFamily: FONT,
      fontSize: 11,
      color: '#8a1720',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
  }
  scene.add.text(x + width - 8, y + 4, `Lv.${mon.lvl}`, {
    fontFamily: FONT,
    fontSize: 13,
    color: mon.hp <= 0 ? '#77736b' : '#302d29',
    fontStyle: 'bold'
  }).setOrigin(1, 0);
  scene.add.text(x + 23, y + 23, 'COND', {
    fontFamily: FONT,
    fontSize: 10,
    color: '#397047',
    fontStyle: 'bold'
  });
  rosterMeter(scene, x + 62, y + 26, 102, mon.hp / stats.hp, ROSTER_UI.green, 6);
  scene.add.text(x + width - 8, y + 21, `${Math.round(mon.hp)}/${stats.hp}`, {
    fontFamily: FONT,
    fontSize: 12,
    color: mon.hp <= 0 ? '#77736b' : '#3c3934',
    fontStyle: 'bold'
  }).setOrigin(1, 0);
}

export function drawLineupScreen(scene, options) {
  const party = options.party || [];
  const selected = Math.max(0, Math.min(options.selected || 0, Math.max(0, party.length - 1)));
  const mon = party[selected];
  rosterFrame(scene, options.title || 'TRAVEL LINEUP', options.subtitle || 'A SUMMARY   B BACK');
  rosterPanel(scene, 10, 49, 166, 261);
  rosterPanel(scene, 184, 49, 286, 261);

  if (!mon) {
    scene.add.text(240, 153, 'NO WRESTLERS REGISTERED', {
      fontFamily: FONT,
      fontSize: 17,
      color: '#302d29',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    return;
  }

  scene.add.image(93, 56, battleTextureFor(mon.id)).setOrigin(0.5, 0);
  scene.add.text(93, 187, wrestlerName(mon, {short: true}), {
    fontFamily: FONT,
    fontSize: 16,
    color: '#7b1d2a',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0);
  const record = ROSTER[mon.id];
  scene.add.text(93, 208, `Lv.${mon.lvl}  ${record.style}`, {
    fontFamily: FONT,
    fontSize: 12,
    color: '#3c3934',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0);
  const stats = scaledStats(mon.id, mon.lvl, mon);
  scene.add.text(22, 230, 'CONDITION', {fontFamily: FONT, fontSize: 10, color: '#397047', fontStyle: 'bold'});
  rosterMeter(scene, 22, 244, 142, mon.hp / stats.hp, ROSTER_UI.green, 7);
  scene.add.text(164, 230, `${Math.round(mon.hp)}/${stats.hp}`, {fontFamily: FONT, fontSize: 11, color: '#3c3934', fontStyle: 'bold'}).setOrigin(1, 0);
  scene.add.text(22, 259, 'EXPERIENCE', {fontFamily: FONT, fontSize: 10, color: '#35658a', fontStyle: 'bold'});
  rosterMeter(scene, 22, 273, 142, experienceProgress(mon), ROSTER_UI.blue, 7);
  const stamina = staminaTotals(mon);
  scene.add.text(22, 288, `STAMINA ${stamina.current}/${stamina.maximum}`, {fontFamily: FONT, fontSize: 11, color: '#35658a', fontStyle: 'bold'});
  scene.add.text(164, 288, indexLabel(selected), {fontFamily: FONT, fontSize: 10, color: '#7b1d2a', fontStyle: 'bold'}).setOrigin(1, 0);

  party.slice(0, 6).forEach((entry, index) => drawLineupRow(scene, entry, index, index === selected));
  if (options.note) {
    const note = scene.add.text(327, 300, options.note, {
      fontFamily: FONT,
      fontSize: 11,
      color: '#8a1720',
      fontStyle: 'bold'
    }).setOrigin(0.5, 1);
    note.setBackgroundColor('#fff7df');
  }
}

function indexLabel(index) {
  return index === 0 ? 'LEAD' : `SLOT ${index + 1}`;
}
