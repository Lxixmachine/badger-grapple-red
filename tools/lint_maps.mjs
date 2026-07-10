// AI Map Linter — phase 1 implementation of docs/design_bible Volume XV
// ("treat maps like source code: validate first, polish second") using the
// FireRed Genome metric vocabulary. Reads the RENDERED area PNGs plus live
// game data, so it scores what the player actually sees.
//
// Rules implemented (warn-mode; --strict turns warnings into exit 1):
//   GRID-010  grid_exposure_index: % of 16px cells sitting in >=3x3 blocks
//             of pixel-identical cells (excluding water/borders). TG-010:
//             players should perceive landforms, not squares.  warn > 35
//   VAR-020   ground_variety: % of land cells differing from the modal
//             ground cell. Monotone fields read unfinished.       warn < 10
//   INT-030   interest_per_screen: every 16x11 camera window should hold
//             at least one point of interest (city-manifesto: interactable
//             per ~100 tiles; Vol VI: no dead screens).
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {AREAS, areaDimensions, spotKind} from '../src/data/maps.js';
import {layeredMap, layeredNpcs, layeredUpperDecor, layeredWaterRects} from '../src/data/layeredMaps.js';

const STRICT = process.argv.includes('--strict');
const TILE = 16;

function decodePng(path) {
  const buf = readFileSync(path);
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
    if (type === 'IEND') break;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const o = y * stride, prev = y > 0 ? out.subarray(o - stride, o) : null;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? out[o + x - bpp] : 0, up = prev ? prev[x] : 0, ul = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      if (f === 1) v += left; else if (f === 2) v += up; else if (f === 3) v += (left + up) >> 1; else if (f === 4) v += paeth(left, up, ul);
      out[o + x] = v & 0xff;
    }
  }
  return {width, height, bpp, stride, pixels: out};
}

function cellHashes(png) {
  const cw = Math.floor(png.width / TILE), ch = Math.floor(png.height / TILE);
  const grid = [];
  for (let cy = 0; cy < ch; cy++) {
    const row = [];
    for (let cx = 0; cx < cw; cx++) {
      const h = createHash('md5');
      for (let y = 0; y < TILE; y++) {
        const o = (cy * TILE + y) * png.stride + cx * TILE * png.bpp;
        h.update(png.pixels.subarray(o, o + TILE * png.bpp));
      }
      row.push(h.digest('base64').slice(0, 12));
    }
    grid.push(row);
  }
  return grid;
}

// NPC anchors that still live in OverworldScene code rather than the layered
// source (drawActors branches). Keep in sync until those areas migrate.
const SCENE_NPCS = {downtown: [[7, 8], [25, 6]], championship: [[10, 6]], studyhall: [[9, 8], [14, 7]]};

function interestCells(id) {
  const {width, height} = areaDimensions(id);
  const cells = new Set();
  const add = (x, y) => cells.add(x + ',' + y);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const k = spotKind(id, x, y);
    if (k !== '.' && k !== 'g') add(x, y);
  }
  (AREAS[id].exits || []).forEach(e => add(e.x, e.y));
  layeredNpcs(id).forEach(n => add(n.x, n.y));
  layeredUpperDecor(id).forEach(u => add(u.x, u.y));
  (layeredMap(id)?.lowerDecor || []).forEach(d => add(d.x, d.y));
  (SCENE_NPCS[id] || []).forEach(([x, y]) => add(x, y));
  return cells;
}

const OUTDOOR = new Set(['campus', 'lakeshore', 'river', 'downtown']);
const findings = [];
const summary = [];

for (const id of Object.keys(AREAS)) {
  const png = decodePng(new URL(`../public/assets/ui/area_${id}.png`, import.meta.url).pathname);
  const grid = cellHashes(png);
  const ch = grid.length, cw = grid[0].length;
  const water = new Set();
  for (const [x1, y1, x2, y2] of layeredWaterRects(id)) for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) water.add(x + ',' + y);
  const skip = (x, y) => water.has(x + ',' + y) || x === 0 || y === 0 || x === cw - 1 || y === ch - 1;

  // GRID-010: cells inside >=3x3 identical blocks
  let exposed = 0, counted = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (skip(x, y)) continue;
    counted++;
    let inBlock = false;
    outer: for (let oy = -2; oy <= 0 && !inBlock; oy++) for (let ox = -2; ox <= 0; ox++) {
      const x0 = x + ox, y0 = y + oy;
      if (x0 < 0 || y0 < 0 || x0 + 2 >= cw || y0 + 2 >= ch) continue;
      let same = true;
      for (let dy = 0; dy < 3 && same; dy++) for (let dx = 0; dx < 3; dx++) if (grid[y0 + dy][x0 + dx] !== grid[y0][x0]) { same = false; break; }
      if (same) { inBlock = true; break outer; }
    }
    if (inBlock) exposed++;
  }
  const gridExposure = counted ? Math.round(exposed / counted * 100) : 0;

  // VAR-020: variety vs modal cell
  const freq = new Map();
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { if (skip(x, y)) continue; freq.set(grid[y][x], (freq.get(grid[y][x]) || 0) + 1); }
  const modal = Math.max(0, ...freq.values());
  const variety = counted ? Math.round((counted - modal) / counted * 100) : 0;

  // INT-030: 16x11 camera windows, half-screen steps, must hold interest
  const interest = interestCells(id);
  const deadScreens = [];
  if (OUTDOOR.has(id)) {
    for (let wy = 0; wy + 11 <= ch || wy === 0; wy += 5) {
      for (let wx = 0; wx + 16 <= cw || wx === 0; wx += 8) {
        const x0 = Math.min(wx, Math.max(0, cw - 16)), y0 = Math.min(wy, Math.max(0, ch - 11));
        let hit = false;
        for (let y = y0; y < Math.min(y0 + 11, ch) && !hit; y++) for (let x = x0; x < Math.min(x0 + 16, cw); x++) if (interest.has(x + ',' + y)) { hit = true; break; }
        if (!hit) deadScreens.push(`(${x0},${y0})`);
        if (wx + 16 >= cw) break;
      }
      if (wy + 11 >= ch) break;
    }
  }

  summary.push({id, gridExposure, variety, deadScreens: deadScreens.length, interest: interest.size});
  // FireRed interiors keep deliberately plain floors (Vol IV) - fixtures, not
  // ground, carry interior identity - so interiors get a laxer threshold.
  const gridLimit = OUTDOOR.has(id) ? 35 : 75;
  if (gridExposure > gridLimit) findings.push({rule: 'GRID-010', sev: 'warn', area: id, msg: `grid_exposure_index ${gridExposure} (>${gridLimit}): large same-tile blocks read as squares, not landforms`, fix: 'add scatter/variant tiles or landform shaping to the monotone regions'});
  if (variety < 10) findings.push({rule: 'VAR-020', sev: 'warn', area: id, msg: `ground_variety ${variety}% (<10%): the modal ground tile dominates`, fix: 'raise scatter density near paths; add worn/flower/prop accents'});
  deadScreens.forEach(s => findings.push({rule: 'INT-030', sev: 'warn', area: id, msg: `dead screen at window ${s}: no interactable/landmark/NPC in a full camera view`, fix: 'seed a sign, item, NPC, or landmark inside this window'}));
}

console.log('MAP LINT (design_bible Vol XV, phase 1)');
console.log('area          grid_exposure  variety  interest  dead_screens');
for (const s of summary) console.log(`${s.id.padEnd(13)} ${String(s.gridExposure).padStart(8)}%      ${String(s.variety).padStart(4)}%  ${String(s.interest).padStart(6)}  ${String(s.deadScreens).padStart(8)}`);
console.log('');
if (findings.length) {
  for (const f of findings) console.log(`[${f.sev.toUpperCase()}] ${f.rule} ${f.area}: ${f.msg}\n       fix: ${f.fix}`);
  console.log(`\n${findings.length} finding(s).${STRICT ? '' : ' (warn mode - not failing the build)'}`);
  if (STRICT) process.exit(1);
} else {
  console.log('No findings - all maps within phase-1 thresholds.');
}
