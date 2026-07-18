import {FONT} from './ui.js';

export const MENU_UI = Object.freeze({
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

export function menuCss(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function menuFrame(scene, title, subtitle = '') {
  const g = scene.add.graphics();
  g.fillStyle(MENU_UI.navy, 1);
  g.fillRect(0, 0, 480, 320);
  g.fillStyle(MENU_UI.navyLight, 1);
  g.fillRect(0, 42, 480, 278);
  for (let y = 58; y < 320; y += 32) {
    g.fillStyle(0xffffff, 0.025);
    g.fillRect(0, y, 480, 1);
  }
  g.fillStyle(MENU_UI.cardinal, 1);
  g.fillRect(0, 0, 480, 5);
  g.fillStyle(MENU_UI.gold, 1);
  g.fillRect(0, 5, 480, 2);
  g.fillStyle(MENU_UI.cardinal, 1);
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

export function menuPanel(scene, x, y, width, height, fill = MENU_UI.paper) {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.35);
  g.fillRect(x + 4, y + 4, width, height);
  g.fillStyle(fill, 1);
  g.fillRect(x, y, width, height);
  g.lineStyle(3, MENU_UI.ink, 1);
  g.strokeRect(x, y, width, height);
  g.lineStyle(1, MENU_UI.gold, 1);
  g.strokeRect(x + 5, y + 5, width - 10, height - 10);
  return g;
}

export function menuMeter(scene, x, y, width, value, color, height = 7) {
  const ratio = Math.max(0, Math.min(1, Number(value) || 0));
  const g = scene.add.graphics();
  g.fillStyle(MENU_UI.ink, 1);
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

export function menuSectionLabel(scene, x, y, label, width = 120) {
  scene.add.text(x, y, label, {
    fontFamily: FONT,
    fontSize: 11,
    color: '#7b1d2a',
    fontStyle: 'bold'
  });
  const g = scene.add.graphics();
  g.fillStyle(MENU_UI.cardinal, 0.75);
  g.fillRect(x, y + 17, width, 2);
  return g;
}

export function menuListRow(scene, options) {
  const x = options.x ?? 18;
  const y = options.y ?? 58;
  const width = options.width ?? 270;
  const height = options.height ?? 31;
  const active = Boolean(options.active);
  const disabled = Boolean(options.disabled);
  const g = scene.add.graphics();
  if (active) {
    g.fillStyle(MENU_UI.cardinal, 0.13);
    g.fillRect(x, y, width, height);
    g.lineStyle(1, MENU_UI.cardinal, 0.9);
    g.strokeRect(x, y, width, height);
  } else if (options.striped) {
    g.fillStyle(MENU_UI.line, 0.09);
    g.fillRect(x, y, width, height);
  }
  scene.add.text(x + 7, y + Math.max(3, Math.floor((height - 18) / 2)), active ? '>' : ' ', {
    fontFamily: FONT,
    fontSize: 14,
    color: active ? '#b41820' : '#655f55',
    fontStyle: 'bold'
  });
  scene.add.text(x + 23, y + (options.secondary ? 3 : Math.max(3, Math.floor((height - 18) / 2))), options.label || '', {
    fontFamily: FONT,
    fontSize: options.fontSize || 13,
    color: disabled ? '#8d887e' : active ? '#8a1720' : '#17151a',
    fontStyle: active || options.bold ? 'bold' : 'normal'
  });
  if (options.secondary) {
    scene.add.text(x + 23, y + 19, options.secondary, {
      fontFamily: FONT,
      fontSize: 10,
      color: disabled ? '#9a958b' : '#655f55',
      fontStyle: 'bold'
    });
  }
  if (options.right) {
    scene.add.text(x + width - 7, y + (options.secondary ? 4 : Math.max(3, Math.floor((height - 18) / 2))), options.right, {
      fontFamily: FONT,
      fontSize: options.rightSize || 12,
      color: disabled ? '#8d887e' : active ? '#8a1720' : '#3c3934',
      fontStyle: 'bold'
    }).setOrigin(1, 0);
  }
  return g;
}

export function menuFooter(scene, text, options = {}) {
  const y = options.y ?? 284;
  menuPanel(scene, 10, y, 460, 26, options.fill ?? MENU_UI.paper);
  scene.add.text(240, y + 5, text || '', {
    fontFamily: FONT,
    fontSize: options.fontSize || 11,
    color: options.alert ? '#8a1720' : '#3c3934',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0);
}

export function menuItemIcon(scene, x, y, key, kind = 'item', size = 48) {
  const colors = {
    sportsDrink: 0x3a8a9a,
    athleticTape: 0xd6a336,
    trainerKit: 0x3a8a52,
    filmStudy: 0x7a4ac9,
    practiceSinglet: 0xb41820,
    travelSinglet: 0x7b1d2a,
    starterSinglet: 0xd6a336
  };
  const color = colors[key] || MENU_UI.muted;
  const g = scene.add.graphics();
  g.fillStyle(MENU_UI.paperAlt, 1);
  g.fillRect(x, y, size, size);
  g.lineStyle(2, MENU_UI.ink, 1);
  g.strokeRect(x, y, size, size);
  g.lineStyle(1, MENU_UI.gold, 1);
  g.strokeRect(x + 4, y + 4, size - 8, size - 8);
  const cx = x + size / 2;
  const cy = y + size / 2;
  g.fillStyle(color, 1);
  g.lineStyle(2, MENU_UI.ink, 1);
  if (key === 'sportsDrink') {
    g.fillRect(cx - 7, cy - 11, 14, 24);
    g.fillRect(cx - 4, cy - 15, 8, 5);
    g.strokeRect(cx - 7, cy - 11, 14, 24);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(cx - 5, cy - 5, 10, 3);
  } else if (key === 'athleticTape') {
    g.fillCircle(cx, cy, 13);
    g.strokeCircle(cx, cy, 13);
    g.fillStyle(MENU_UI.paper, 1);
    g.fillCircle(cx, cy, 6);
    g.strokeCircle(cx, cy, 6);
  } else if (key === 'trainerKit') {
    g.fillRect(cx - 14, cy - 8, 28, 20);
    g.strokeRect(cx - 14, cy - 8, 28, 20);
    g.strokeRect(cx - 7, cy - 14, 14, 7);
    g.fillStyle(0xffffff, 0.9);
    g.fillRect(cx - 2, cy - 5, 4, 12);
    g.fillRect(cx - 6, cy - 1, 12, 4);
  } else if (key === 'filmStudy') {
    g.fillRect(cx - 14, cy - 11, 28, 22);
    g.strokeRect(cx - 14, cy - 11, 28, 22);
    g.fillStyle(MENU_UI.paper, 1);
    for (let offset = -9; offset <= 9; offset += 6) {
      g.fillRect(cx + offset - 1, cy - 8, 3, 3);
      g.fillRect(cx + offset - 1, cy + 5, 3, 3);
    }
  } else if (kind === 'singlet') {
    g.fillRect(cx - 8, cy - 10, 16, 24);
    g.fillRect(cx - 14, cy - 10, 7, 10);
    g.fillRect(cx + 7, cy - 10, 7, 10);
    g.fillStyle(MENU_UI.paperAlt, 1);
    g.fillTriangle(cx - 7, cy + 6, cx + 7, cy + 6, cx, cy + 15);
  } else {
    g.fillCircle(cx, cy, 12);
    g.strokeCircle(cx, cy, 12);
  }
  return g;
}

export function menuConfirm(scene, options) {
  const x = options.x ?? 82;
  const y = options.y ?? 96;
  const width = options.width ?? 316;
  const height = options.height ?? 136;
  const veil = scene.add.graphics();
  veil.fillStyle(0x08080c, 0.58);
  veil.fillRect(0, 42, 480, 278);
  menuPanel(scene, x, y, width, height);
  scene.add.text(x + 18, y + 18, options.title || 'CONFIRM', {
    fontFamily: FONT,
    fontSize: 17,
    color: '#7b1d2a',
    fontStyle: 'bold'
  });
  scene.add.text(x + 18, y + 48, options.body || '', {
    fontFamily: FONT,
    fontSize: 13,
    color: '#3c3934',
    fontStyle: 'bold',
    wordWrap: {width: width - 36},
    lineSpacing: 3
  });
  scene.add.text(x + width / 2, y + height - 28, options.action || 'A CONFIRM   B BACK', {
    fontFamily: FONT,
    fontSize: 12,
    color: '#7b1d2a',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0);
}
