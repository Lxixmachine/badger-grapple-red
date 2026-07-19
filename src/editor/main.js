import {cloneProject, createSeedProject, PROJECT_SCHEMA, TERRAIN, validateProject} from './project.js';
import {analyzeMapGrid, assessPlacement} from './gridAnalysis.js';
import {MapRenderer} from './renderer.js';

const STORAGE_KEY = 'badger-grapple-map-studio-v4-imagegen-tileset';
const PALETTE_PREFS_KEY = 'badger-grapple-map-studio-palette-v1';
const canvas = document.querySelector('#mapCanvas');
const editorShell = document.querySelector('.editor-shell');
const workspace = document.querySelector('#workspace');
const mapSelect = document.querySelector('#mapSelect');
const paletteContent = document.querySelector('#paletteContent');
const inspectorContent = document.querySelector('#inspectorContent');
const validationContent = document.querySelector('#validationContent');
const validationCount = document.querySelector('#validationCount');
const deleteButton = document.querySelector('#deleteButton');
const playtestButton = document.querySelector('#playtestButton');
const cellReadout = document.querySelector('#cellReadout');
const modeReadout = document.querySelector('#modeReadout');
const brushReadout = document.querySelector('#brushReadout');
const semanticReadout = document.querySelector('#semanticReadout');
const mapStatus = document.querySelector('#mapStatus');
const saveStatus = document.querySelector('#saveStatus');
const zoomValue = document.querySelector('#zoomValue');
const fileInput = document.querySelector('#fileInput');
const paletteSearch = document.querySelector('#paletteSearch');
const favoriteFilter = document.querySelector('#favoriteFilter');
const inspectorPanel = document.querySelector('#inspectorPanel');

const seedProject = createSeedProject();
let project = new URLSearchParams(window.location.search).has('seed')
  ? cloneProject(seedProject)
  : loadDraft(seedProject);
let mode = window.matchMedia('(pointer: coarse)').matches ? 'pan' : 'select';
let paletteTab = 'terrain';
let selectedTerrain = 'brick';
let selectedGroundFamily = 'path_brick';
let selectedGroundStampFamily = 'brick_walk';
let selectedMetatile = null;
let selectedMetatileFamily = 'team_building';
let selectedObjectFamily = 'trees';
let paletteQuery = '';
let favoriteOnly = false;
let showAdvancedStructure = false;
const palettePreferences = loadPalettePreferences();
let favoriteAssets = new Set(palettePreferences.favorites);
let recentAssets = [...palettePreferences.recents];
let placingAsset = null;
let selection = null;
let hoverCell = null;
let inspectedCell = null;
let showGrid = true;
let showCollision = false;
let cameraPreview = false;
let zoom = 1;
let gesture = null;
let renderFrame = 0;
let history = [draftSnapshot(project)];
let historyIndex = 0;
let validationFocus = [];

const renderer = new MapRenderer(canvas, requestRender);

function compactDraft(source) {
  const compact = cloneProject(source);
  delete compact.assets;
  for (const map of Object.values(compact.maps || {})) {
    delete map.metatileAtlas;
    delete map.terrainTiles;
  }
  return compact;
}

function draftSnapshot(source) {
  return JSON.stringify(compactDraft(source));
}

function loadDraft(seed) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schema === PROJECT_SCHEMA) {
      return migrateDraft(saved, seed);
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return seed;
}

function migrateDraft(saved, seed) {
  const migrated = cloneProject(saved);
  const refreshPlannedAssets = migrated.layoutRevision !== seed.layoutRevision
    || migrated.metatileVersion !== seed.metatileVersion;
  migrated.maps ||= {};
  for (const [mapId, seedMap] of Object.entries(seed.maps)) {
    const savedMap = migrated.maps?.[mapId];
    if (!savedMap || savedMap.width !== seedMap.width || savedMap.height !== seedMap.height) {
      migrated.maps[mapId] = cloneProject(seedMap);
      continue;
    }
    const terrain = seedMap.terrain.map((row, y) => row.map((material, x) => {
      const previous = savedMap.terrain?.[y]?.[x];
      const previousDefault = savedMap.originalTerrain?.[y]?.[x];
      return previous !== undefined && previous !== previousDefault ? previous : material;
    }));
    Object.assign(savedMap, {
      renderModel: seedMap.renderModel,
      background: cloneProject(seedMap.background),
      metatileAtlas: cloneProject(seedMap.metatileAtlas),
      terrainTiles: cloneProject(seedMap.terrainTiles),
      originalTerrain: cloneProject(seedMap.originalTerrain),
      terrain
    });
    const seedObjects = new Map((seedMap.objects || []).map(object => [object.id, object]));
    savedMap.objects = (savedMap.objects || []).map(object => {
      if (object.sourceKind !== 'planned-metatile' || !refreshPlannedAssets) return object;
      const replacement = seedObjects.get(object.id);
      return replacement ? {...cloneProject(replacement), x: object.x, y: object.y, name: object.name} : object;
    });
    delete savedMap.terrainVariants;
  }
  migrated.productionVersion = seed.productionVersion;
  migrated.layoutRevision = seed.layoutRevision;
  migrated.metatileVersion = seed.metatileVersion;
  migrated.createdFrom = seed.createdFrom;
  migrated.assets = cloneProject(seed.assets);
  return migrated;
}

function activeMap() {
  return project.maps[project.activeMapId];
}

function objectPlacement(object) {
  return {
    kind: 'object',
    width: object.width,
    height: object.height,
    collisionMask: object.collisionMask || object.defaultCollisionMask,
    door: object.door || object.defaultDoor || null,
    metatiles: object.metatiles || null
  };
}

function palettePlacement(assetRef = placingAsset) {
  if (!assetRef) return null;
  if (assetRef.kind === 'groundStamp') {
    const stamp = (project.assets.groundStamps || []).find(entry => entry.id === assetRef.id);
    return stamp ? {...stamp, kind: 'groundStamp'} : null;
  }
  if (assetRef.kind === 'object') {
    const asset = project.assets.objects.find(entry => entry.id === assetRef.id);
    return asset ? objectPlacement(asset) : null;
  }
  if (assetRef.kind === 'actor') return {kind: 'actor'};
  return null;
}

function placementAssessmentAt(cell, grid = null) {
  if (!cell) return null;
  let placement = palettePlacement();
  const options = {analysis: grid || analyzeMapGrid(project, activeMap())};
  if (!placement && (mode === 'terrain' || mode === 'fill')) {
    placement = {kind: 'groundStamp', width: 1, height: 1, cells: [[selectedTerrain]]};
  } else if (!placement && mode === 'structure' && selectedMetatile) {
    const tile = metatileById(selectedMetatile);
    if (tile) {
      const owner = objectAtCell(cell);
      placement = {
        kind: 'object', width: 1, height: 1,
        collisionMask: [tile.behavior === 'solid' ? '#' : '.'],
        door: tile.behavior === 'warp' ? {x: 0, y: 0} : null,
        metatiles: [[tile.id]]
      };
      options.ignoreObjectId = owner?.id || null;
    }
  }
  if (!placement) return null;
  return assessPlacement(project, activeMap(), placement, cell, options);
}

function currentCamera() {
  const map = activeMap();
  const review = map.cameraReviews?.[0];
  const width = Math.min(15, map.width);
  const height = Math.min(10, map.height);
  return review
    ? {x: review.x, y: review.y, width: Math.min(review.width, map.width), height: Math.min(review.height, map.height)}
    : {x: 0, y: 0, width, height};
}

function renderState() {
  const map = activeMap();
  const gridAnalysis = analyzeMapGrid(project, map);
  return {
    project,
    map,
    mode,
    selection,
    hoverCell,
    inspectedCell,
    showGrid,
    showCollision,
    cameraPreview,
    camera: currentCamera(),
    selectedTerrain,
    selectedMetatile,
    placingAsset,
    gridAnalysis,
    movingEntry: gesture?.type === 'move' ? {kind: gesture.kind, entry: gesture.entry} : null,
    placementAssessment: gesture?.type === 'move'
      ? gesture.assessment || null
      : placementAssessmentAt(hoverCell, gridAnalysis)
  };
}

function requestRender() {
  if (renderFrame) return;
  renderFrame = requestAnimationFrame(() => {
    renderFrame = 0;
    renderer.render(renderState());
    applyZoom();
  });
}

function applyZoom() {
  canvas.style.width = `${Math.round(canvas.width * zoom)}px`;
  canvas.style.height = `${Math.round(canvas.height * zoom)}px`;
  zoomValue.value = `${Math.round(zoom * 100)}%`;
}

function saveDraft(label = 'Draft saved') {
  try {
    localStorage.setItem(STORAGE_KEY, draftSnapshot(project));
    saveStatus.textContent = label;
  } catch {
    saveStatus.textContent = 'Draft is too large for browser storage; export JSON to preserve it';
  }
}

function recordHistory(label) {
  const snapshot = draftSnapshot(project);
  if (snapshot === history[historyIndex]) return;
  history = history.slice(0, historyIndex + 1);
  history.push(snapshot);
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  saveDraft(label);
  updateHistoryButtons();
  updateInspector();
  updateValidation();
  requestRender();
}

function restoreHistory(index) {
  if (index < 0 || index >= history.length) return;
  const previousSelection = selection ? {...selection} : null;
  historyIndex = index;
  project = migrateDraft(JSON.parse(history[historyIndex]), seedProject);
  if (!project.maps[project.activeMapId]) project.activeMapId = Object.keys(project.maps)[0];
  selection = previousSelection;
  if (selection && !selectedEntry()) selection = null;
  inspectedCell = null;
  placingAsset = null;
  saveDraft(index < history.length - 1 ? 'Undo applied' : 'Redo applied');
  buildMapSelect();
  buildPalette();
  updateAll();
}

function updateHistoryButtons() {
  document.querySelector('#undoButton').disabled = historyIndex <= 0;
  document.querySelector('#redoButton').disabled = historyIndex >= history.length - 1;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function loadPalettePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PALETTE_PREFS_KEY));
    return {
      favorites: Array.isArray(saved?.favorites) ? saved.favorites : [],
      recents: Array.isArray(saved?.recents) ? saved.recents : []
    };
  } catch {
    localStorage.removeItem(PALETTE_PREFS_KEY);
    return {favorites: [], recents: []};
  }
}

function savePalettePreferences() {
  localStorage.setItem(PALETTE_PREFS_KEY, JSON.stringify({
    favorites: [...favoriteAssets],
    recents: recentAssets.slice(0, 16)
  }));
}

function paletteKey(kind, id) {
  return `${kind}:${id}`;
}

function trackRecent(kind, id) {
  const key = paletteKey(kind, id);
  recentAssets = [key, ...recentAssets.filter(entry => entry !== key)].slice(0, 16);
  savePalettePreferences();
}

function toggleFavorite(kind, id) {
  const key = paletteKey(kind, id);
  if (favoriteAssets.has(key)) favoriteAssets.delete(key);
  else favoriteAssets.add(key);
  savePalettePreferences();
  buildPalette();
}

function favoriteButton(kind, id) {
  const starred = favoriteAssets.has(paletteKey(kind, id));
  return `<button class="favorite-button ${starred ? 'starred' : ''}" data-favorite-kind="${kind}" data-favorite-id="${escapeHtml(id)}" aria-label="${starred ? 'Remove from' : 'Add to'} favorites" title="${starred ? 'Remove from' : 'Add to'} favorites">${starred ? '&#9733;' : '&#9734;'}</button>`;
}

function bindFavoriteButtons() {
  paletteContent.querySelectorAll('[data-favorite-kind]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(button.dataset.favoriteKind, button.dataset.favoriteId);
  }));
}

function friendlyName(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function paletteMatches(entry, kind, extra = []) {
  const key = paletteKey(kind, entry.id);
  if (favoriteOnly && !favoriteAssets.has(key)) return false;
  if (!paletteQuery) return true;
  const haystack = [entry.id, entry.name, entry.family, entry.category, ...(entry.tags || []), ...extra]
    .filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(paletteQuery);
}

function sortPaletteEntries(entries, kind) {
  return [...entries].sort((first, second) => {
    const firstKey = paletteKey(kind, first.id);
    const secondKey = paletteKey(kind, second.id);
    const favoriteDelta = Number(favoriteAssets.has(secondKey)) - Number(favoriteAssets.has(firstKey));
    if (favoriteDelta) return favoriteDelta;
    const firstRecent = recentAssets.indexOf(firstKey);
    const secondRecent = recentAssets.indexOf(secondKey);
    if (firstRecent >= 0 || secondRecent >= 0) {
      if (firstRecent < 0) return 1;
      if (secondRecent < 0) return -1;
      if (firstRecent !== secondRecent) return firstRecent - secondRecent;
    }
    return String(first.name || first.id).localeCompare(String(second.name || second.id));
  });
}

function updateBrushReadout() {
  if (placingAsset) {
    const collection = placingAsset.kind === 'groundStamp'
      ? project.assets.groundStamps
      : placingAsset.kind === 'object' ? project.assets.objects : project.assets.actors;
    brushReadout.textContent = collection?.find(entry => entry.id === placingAsset.id)?.name || placingAsset.id;
    return;
  }
  if (mode === 'terrain' || mode === 'fill') {
    brushReadout.textContent = (project.assets.groundTiles || []).find(entry => entry.id === selectedTerrain)?.name || friendlyName(selectedTerrain);
  } else if (mode === 'structure') {
    brushReadout.textContent = metatileById(selectedMetatile)?.names?.[0] || 'Choose a structure cell';
  } else {
    brushReadout.textContent = friendlyName(mode);
  }
}

function uniqueId(base, entries) {
  const ids = new Set(entries.map(entry => entry.id));
  if (!ids.has(base)) return base;
  let index = 2;
  while (ids.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function cursorForMode(value = mode) {
  if (value === 'pan') return 'grab';
  if (value === 'inspect') return 'help';
  if (value === 'pick') return 'copy';
  if (value === 'erase') return 'not-allowed';
  return value === 'select' || value === 'event' ? 'default' : 'crosshair';
}

function buildMapSelect() {
  const options = type => Object.values(project.maps)
    .filter(map => map.type === type)
    .map(map => `<option value="${escapeHtml(map.id)}">${escapeHtml(map.name)}</option>`)
    .join('');
  mapSelect.innerHTML = `<optgroup label="Exterior maps">${options('exterior')}</optgroup><optgroup label="Interiors">${options('interior')}</optgroup>`;
  mapSelect.value = project.activeMapId;
}

function setMode(nextMode) {
  mode = nextMode;
  if (nextMode !== 'select') placingAsset = null;
  document.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === mode));
  modeReadout.textContent = mode[0].toUpperCase() + mode.slice(1);
  canvas.style.cursor = cursorForMode();
  updateBrushReadout();
  requestRender();
}

function metatileThumb(tile) {
  const cell = tile.cellSize;
  const sourceX = (tile.visual % tile.atlasColumns) * cell;
  const sourceY = Math.floor(tile.visual / tile.atlasColumns) * cell;
  return `<div class="palette-thumb metatile-preview"><span style="width:${cell}px;height:${cell}px;background-image:url('${tile.atlasPath}');background-position:-${sourceX}px -${sourceY}px"></span></div>`;
}

function buildPaletteLegacy() {
  document.querySelectorAll('[data-palette]').forEach(button => button.classList.toggle('active', button.dataset.palette === paletteTab));
  if (paletteTab === 'terrain') {
    const map = activeMap();
    const terrainEntries = Object.entries(TERRAIN).filter(([id]) => activeMap().type === 'exterior' ? id !== 'floor' : id === 'floor');
    const allGroundTiles = map.renderModel === 'metatile' ? (project.assets.groundTiles || []) : [];
    const groundFamilies = [...new Set(allGroundTiles.map(tile => tile.family).filter(Boolean))];
    if (!groundFamilies.includes(selectedGroundFamily)) {
      selectedGroundFamily = groundFamilies.includes('path_brick') ? 'path_brick' : groundFamilies[0] || '';
    }
    const coreGroundTiles = allGroundTiles.filter(tile => tile.tags?.includes('base'));
    const groundTiles = allGroundTiles.filter(tile => tile.family === selectedGroundFamily && !tile.tags?.includes('base'));
    const allGroundStamps = map.renderModel === 'metatile' ? (project.assets.groundStamps || []) : [];
    const groundStampFamilies = [...new Set(allGroundStamps.map(stamp => stamp.family).filter(Boolean))];
    if (!groundStampFamilies.includes(selectedGroundStampFamily)) {
      selectedGroundStampFamily = groundStampFamilies.includes('brick_walk') ? 'brick_walk' : groundStampFamilies[0] || '';
    }
    const groundStamps = allGroundStamps.filter(stamp => stamp.family === selectedGroundStampFamily);
    const allStructureTiles = map.renderModel === 'metatile'
      ? (project.assets.metatiles || []).filter(tile => tile.palette)
      : [];
    const structureFamilies = [...new Set(allStructureTiles.map(tile => tile.families?.[0]).filter(Boolean))];
    if (!structureFamilies.includes(selectedMetatileFamily)) {
      selectedMetatileFamily = structureFamilies.includes('team_building') ? 'team_building' : structureFamilies[0] || '';
    }
    const structureTiles = allStructureTiles.filter(tile => tile.families?.[0] === selectedMetatileFamily);
    const groundMarkup = allGroundTiles.length ? `
      <div class="palette-grid ground-tile-grid">${coreGroundTiles.map(tile => `
        <div class="palette-item terrain-item ${selectedTerrain === tile.id ? 'active' : ''}" data-terrain="${tile.id}" role="button" tabindex="0" title="${escapeHtml(tile.name)}">
          ${metatileThumb(tile)}<span>${escapeHtml(tile.name)}</span>
        </div>`).join('')}</div>
      <div class="palette-section-title structure-title">Transitions and details</div>
      <label class="metatile-family"><span>Family</span><select id="groundFamily">${groundFamilies.map(family => `
        <option value="${family}" ${family === selectedGroundFamily ? 'selected' : ''}>${escapeHtml(family.replaceAll('_', ' '))}</option>`).join('')}</select></label>
      <div class="palette-grid ground-tile-grid">${groundTiles.map(tile => `
        <div class="palette-item terrain-item ${selectedTerrain === tile.id ? 'active' : ''}" data-terrain="${tile.id}" role="button" tabindex="0" title="${escapeHtml(tile.name)}">
          ${metatileThumb(tile)}<span>${escapeHtml(tile.name)}</span>
        </div>`).join('')}</div>` : `<div class="palette-grid">${terrainEntries.map(([id, terrain]) => `
        <div class="palette-item terrain-item ${selectedTerrain === id ? 'active' : ''}" data-terrain="${id}" role="button" tabindex="0">
          <div class="terrain-swatch ${id}"></div><span>${escapeHtml(terrain.label)}</span>
        </div>`).join('')}</div>`;
    const groundStampMarkup = groundStamps.length ? `
      <div class="palette-section-title structure-title">Ground assemblies</div>
      <label class="metatile-family"><span>Family</span><select id="groundStampFamily">${groundStampFamilies.map(family => `
        <option value="${family}" ${family === selectedGroundStampFamily ? 'selected' : ''}>${escapeHtml(family.replaceAll('_', ' '))}</option>`).join('')}</select></label>
      <div class="palette-grid">${groundStamps.map(stamp => `
        <div class="palette-item ${placingAsset?.kind === 'groundStamp' && placingAsset.id === stamp.id ? 'active' : ''}" draggable="true" data-ground-stamp="${stamp.id}" role="button" tabindex="0" title="${escapeHtml(stamp.name)}">
          <div class="palette-thumb"><img src="${stamp.thumbnail}" alt="" /></div><span>${escapeHtml(stamp.name)}</span>
        </div>`).join('')}</div>` : '';
    paletteContent.innerHTML = `<div class="palette-section-title">Ground tiles</div>${groundMarkup}${groundStampMarkup}${structureTiles.length ? `
        <div class="palette-section-title structure-title">Structure metatiles</div>
        <label class="metatile-family"><span>Family</span><select id="metatileFamily">${structureFamilies.map(family => `
          <option value="${family}" ${family === selectedMetatileFamily ? 'selected' : ''}>${escapeHtml(family.replaceAll('_', ' '))}</option>`).join('')}</select></label>
        <div class="palette-grid metatile-grid">${structureTiles.map(tile => `
          <div class="palette-item metatile-item ${selectedMetatile === tile.id ? 'active' : ''}" draggable="true" data-metatile="${tile.id}" role="button" tabindex="0" title="${escapeHtml(tile.names?.[0] || tile.id)}">
            ${metatileThumb(tile)}<span class="visually-hidden">${escapeHtml(tile.names?.[0] || tile.id)}</span>
          </div>`).join('')}</div>` : ''}`;
    paletteContent.querySelector('#groundFamily')?.addEventListener('change', event => {
      selectedGroundFamily = event.currentTarget.value;
      buildPalette();
    });
    paletteContent.querySelector('#groundStampFamily')?.addEventListener('change', event => {
      selectedGroundStampFamily = event.currentTarget.value;
      buildPalette();
    });
    paletteContent.querySelector('#metatileFamily')?.addEventListener('change', event => {
      selectedMetatileFamily = event.currentTarget.value;
      selectedMetatile = null;
      buildPalette();
    });
    paletteContent.querySelectorAll('[data-terrain]').forEach(item => {
      item.addEventListener('click', () => {
        selectedTerrain = item.dataset.terrain;
        selectedMetatile = null;
        placingAsset = null;
        setMode('terrain');
        buildPalette();
      });
    });
    paletteContent.querySelectorAll('[data-metatile]').forEach(item => {
      const activate = () => {
        selectedMetatile = item.dataset.metatile;
        placingAsset = null;
        setMode('structure');
        buildPalette();
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
      item.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-badger-asset', JSON.stringify({kind: 'metatile', id: item.dataset.metatile}));
      });
    });
    paletteContent.querySelectorAll('[data-ground-stamp]').forEach(item => {
      const activate = () => {
        placingAsset = {kind: 'groundStamp', id: item.dataset.groundStamp};
        selectedMetatile = null;
        setMode('select');
        buildPalette();
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
      item.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-badger-asset', JSON.stringify({kind: 'groundStamp', id: item.dataset.groundStamp}));
      });
    });
    return;
  }

  const map = activeMap();
  const availableAssets = paletteTab === 'objects'
    ? project.assets.objects.filter(asset => asset.mapType === map.type && (!asset.mapId || asset.mapId === map.id))
    : project.assets.actors;
  const objectFamilies = paletteTab === 'objects'
    ? [...new Set(availableAssets.map(asset => asset.category).filter(Boolean))]
    : [];
  if (paletteTab === 'objects' && !objectFamilies.includes(selectedObjectFamily)) {
    selectedObjectFamily = objectFamilies.includes('trees') ? 'trees' : objectFamilies[0] || '';
  }
  const assets = paletteTab === 'objects'
    ? availableAssets.filter(asset => asset.category === selectedObjectFamily)
    : availableAssets;
  const objectFilter = paletteTab === 'objects' ? `<label class="metatile-family"><span>Family</span><select id="objectFamily">${objectFamilies.map(family => `
    <option value="${family}" ${family === selectedObjectFamily ? 'selected' : ''}>${escapeHtml(family.replaceAll('_', ' '))}</option>`).join('')}</select></label>` : '';
  paletteContent.innerHTML = `${objectFilter}<div class="palette-grid">${assets.map(asset => {
    const active = placingAsset?.id === asset.id ? 'active' : '';
    const thumb = paletteTab === 'actors'
      ? `<div class="palette-thumb"><span class="actor-thumb" style="width:32px;height:60px;background-image:url('${asset.path}');background-position:-32px 0;background-repeat:no-repeat"></span></div>`
      : `<div class="palette-thumb"><img src="${asset.path}" alt="" /></div>`;
    return `<div class="palette-item ${active}" draggable="true" data-asset="${escapeHtml(asset.id)}" data-asset-kind="${paletteTab === 'actors' ? 'actor' : 'object'}" role="button" tabindex="0">${thumb}<span>${escapeHtml(asset.name)}</span></div>`;
  }).join('')}</div>`;
  paletteContent.querySelector('#objectFamily')?.addEventListener('change', event => {
    selectedObjectFamily = event.currentTarget.value;
    buildPalette();
  });
  paletteContent.querySelectorAll('[data-asset]').forEach(item => {
    const activate = () => {
      placingAsset = {kind: item.dataset.assetKind, id: item.dataset.asset};
      setMode('select');
      buildPalette();
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
    item.addEventListener('dragstart', event => {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-badger-asset', JSON.stringify({kind: item.dataset.assetKind, id: item.dataset.asset}));
    });
  });
}

function buildPalette() {
  document.querySelectorAll('[data-palette]').forEach(button => button.classList.toggle('active', button.dataset.palette === paletteTab));
  const familyOptions = (families, selected, entries, property) => families.map(family => {
    const count = entries.filter(entry => entry[property] === family).length;
    return `<option value="${escapeHtml(family)}" ${family === selected ? 'selected' : ''}>${escapeHtml(friendlyName(family))} (${count})</option>`;
  }).join('');
  const emptyMarkup = message => `<div class="palette-empty">${escapeHtml(message)}</div>`;

  if (paletteTab === 'terrain') {
    const map = activeMap();
    const terrainEntries = Object.entries(TERRAIN)
      .filter(([id]) => map.type === 'exterior' ? id !== 'floor' : id === 'floor')
      .map(([id, terrain]) => ({id, name: terrain.label, family: 'base'}));
    const allGroundTiles = map.renderModel === 'metatile' ? (project.assets.groundTiles || []) : [];
    const allGroundStamps = map.renderModel === 'metatile' ? (project.assets.groundStamps || []) : [];
    const allStructureTiles = map.renderModel === 'metatile'
      ? (project.assets.metatiles || []).filter(tile => tile.palette)
      : [];
    const groundFamilies = [...new Set(allGroundTiles.map(tile => tile.family).filter(Boolean))].sort();
    const groundStampFamilies = [...new Set(allGroundStamps.map(stamp => stamp.family).filter(Boolean))].sort();
    const structureFamilies = [...new Set(allStructureTiles.map(tile => tile.families?.[0]).filter(Boolean))].sort();
    if (!groundFamilies.includes(selectedGroundFamily)) selectedGroundFamily = groundFamilies.includes('path_brick') ? 'path_brick' : groundFamilies[0] || '';
    if (!groundStampFamilies.includes(selectedGroundStampFamily)) selectedGroundStampFamily = groundStampFamilies.includes('brick_walk') ? 'brick_walk' : groundStampFamilies[0] || '';
    if (!structureFamilies.includes(selectedMetatileFamily)) selectedMetatileFamily = structureFamilies.includes('team_building') ? 'team_building' : structureFamilies[0] || '';

    const surfaceSource = allGroundTiles.length ? allGroundTiles.filter(tile => tile.tags?.includes('base')) : terrainEntries;
    const surfaces = sortPaletteEntries(surfaceSource.filter(tile => paletteMatches(tile, 'terrain')), 'terrain');
    const groundSource = paletteQuery || favoriteOnly
      ? allGroundTiles.filter(tile => !tile.tags?.includes('base'))
      : allGroundTiles.filter(tile => tile.family === selectedGroundFamily && !tile.tags?.includes('base'));
    const groundTiles = sortPaletteEntries(groundSource.filter(tile => paletteMatches(tile, 'terrain')), 'terrain');
    const stampSource = paletteQuery || favoriteOnly
      ? allGroundStamps
      : allGroundStamps.filter(stamp => stamp.family === selectedGroundStampFamily);
    const groundStamps = sortPaletteEntries(stampSource.filter(stamp => paletteMatches(stamp, 'groundStamp')), 'groundStamp');
    const structureSource = paletteQuery || favoriteOnly
      ? allStructureTiles
      : allStructureTiles.filter(tile => tile.families?.[0] === selectedMetatileFamily);
    const structureTiles = sortPaletteEntries(
      structureSource.filter(tile => paletteMatches(tile, 'metatile', tile.names || [])),
      'metatile'
    );

    const surfaceCards = surfaces.map(tile => `
      <div class="palette-item terrain-item ${selectedTerrain === tile.id ? 'active' : ''}" data-terrain="${escapeHtml(tile.id)}" role="button" aria-label="${escapeHtml(tile.name)}" tabindex="0" title="${escapeHtml(tile.name)}">
        ${allGroundTiles.length ? metatileThumb(tile) : `<div class="terrain-swatch ${escapeHtml(tile.id)}"></div>`}
        <span>${escapeHtml(tile.name)}</span>${favoriteButton('terrain', tile.id)}
      </div>`).join('');
    const stampCards = groundStamps.map(stamp => `
      <div class="palette-item ${placingAsset?.kind === 'groundStamp' && placingAsset.id === stamp.id ? 'active' : ''}" draggable="true" data-ground-stamp="${escapeHtml(stamp.id)}" role="button" aria-label="${escapeHtml(stamp.name)}" tabindex="0" title="${escapeHtml(stamp.name)}">
        <div class="palette-thumb"><img src="${stamp.thumbnail}" alt="" /></div><span>${escapeHtml(stamp.name)}</span>${favoriteButton('groundStamp', stamp.id)}
      </div>`).join('');
    const groundCards = groundTiles.map(tile => `
      <div class="palette-item terrain-item ${selectedTerrain === tile.id ? 'active' : ''}" data-terrain="${escapeHtml(tile.id)}" role="button" aria-label="${escapeHtml(tile.name)}" tabindex="0" title="${escapeHtml(tile.name)}">
        ${metatileThumb(tile)}<span>${escapeHtml(tile.name)}</span>${favoriteButton('terrain', tile.id)}
      </div>`).join('');
    const structureCards = structureTiles.map(tile => `
      <div class="palette-item metatile-item ${selectedMetatile === tile.id ? 'active' : ''}" draggable="true" data-metatile="${escapeHtml(tile.id)}" role="button" aria-label="${escapeHtml(tile.names?.[0] || tile.id)}" tabindex="0" title="${escapeHtml(tile.names?.[0] || tile.id)}">
        ${metatileThumb(tile)}<span class="visually-hidden">${escapeHtml(tile.names?.[0] || tile.id)}</span>${favoriteButton('metatile', tile.id)}
      </div>`).join('');

    paletteContent.innerHTML = `
      <div class="palette-section-title">Surfaces <span class="palette-count">${surfaces.length}</span></div>
      ${surfaceCards ? `<div class="palette-grid ground-tile-grid">${surfaceCards}</div>` : emptyMarkup('No surfaces match this filter.')}
      ${allGroundStamps.length ? `
        <div class="palette-section-title structure-title">Ready-made paths and areas <span class="palette-count">${groundStamps.length}</span></div>
        <label class="metatile-family"><span>Family</span><select id="groundStampFamily">${familyOptions(groundStampFamilies, selectedGroundStampFamily, allGroundStamps, 'family')}</select></label>
        ${stampCards ? `<div class="palette-grid">${stampCards}</div>` : emptyMarkup('No path assemblies match this filter.')}` : ''}
      ${allGroundTiles.length ? `
        <details class="palette-disclosure" ${(paletteQuery || favoriteOnly) ? 'open' : ''}>
          <summary>Individual transitions <span class="palette-count">${groundTiles.length}</span></summary>
          <div class="palette-disclosure-body">
            <label class="metatile-family"><span>Family</span><select id="groundFamily">${familyOptions(groundFamilies, selectedGroundFamily, allGroundTiles, 'family')}</select></label>
            ${groundCards ? `<div class="palette-grid ground-tile-grid">${groundCards}</div>` : emptyMarkup('No individual tiles match this filter.')}
          </div>
        </details>` : ''}
      ${allStructureTiles.length ? `
        <details id="structureDisclosure" class="palette-disclosure" ${(showAdvancedStructure || paletteQuery) ? 'open' : ''}>
          <summary>Advanced structure cells <span class="palette-count">${structureTiles.length}</span></summary>
          <div class="palette-disclosure-body">
            <div class="advanced-note">Use complete buildings and props from Stamps for normal map work. These cells are for repairing or authoring one exact structure tile.</div>
            <label class="metatile-family"><span>Family</span><select id="metatileFamily">${familyOptions(structureFamilies, selectedMetatileFamily, allStructureTiles.map(tile => ({...tile, family: tile.families?.[0]})), 'family')}</select></label>
            ${structureCards ? `<div class="palette-grid metatile-grid">${structureCards}</div>` : emptyMarkup('No structure cells match this filter.')}
          </div>
        </details>` : ''}`;

    paletteContent.querySelector('#groundFamily')?.addEventListener('change', event => { selectedGroundFamily = event.currentTarget.value; buildPalette(); });
    paletteContent.querySelector('#groundStampFamily')?.addEventListener('change', event => { selectedGroundStampFamily = event.currentTarget.value; buildPalette(); });
    paletteContent.querySelector('#metatileFamily')?.addEventListener('change', event => { selectedMetatileFamily = event.currentTarget.value; selectedMetatile = null; buildPalette(); });
    paletteContent.querySelector('#structureDisclosure')?.addEventListener('toggle', event => { showAdvancedStructure = event.currentTarget.open; });
    paletteContent.querySelectorAll('[data-terrain]').forEach(item => {
      const activate = () => {
        selectedTerrain = item.dataset.terrain;
        selectedMetatile = null;
        placingAsset = null;
        trackRecent('terrain', selectedTerrain);
        setMode('terrain');
        buildPalette();
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
    });
    paletteContent.querySelectorAll('[data-metatile]').forEach(item => {
      const activate = () => {
        selectedMetatile = item.dataset.metatile;
        placingAsset = null;
        trackRecent('metatile', selectedMetatile);
        setMode('structure');
        buildPalette();
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
      item.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-badger-asset', JSON.stringify({kind: 'metatile', id: item.dataset.metatile}));
      });
    });
    paletteContent.querySelectorAll('[data-ground-stamp]').forEach(item => {
      const activate = () => {
        placingAsset = {kind: 'groundStamp', id: item.dataset.groundStamp};
        selectedMetatile = null;
        trackRecent('groundStamp', item.dataset.groundStamp);
        setMode('select');
        buildPalette();
      };
      item.addEventListener('click', activate);
      item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
      item.addEventListener('dragstart', event => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-badger-asset', JSON.stringify({kind: 'groundStamp', id: item.dataset.groundStamp}));
      });
    });
    bindFavoriteButtons();
    updateBrushReadout();
    return;
  }

  const map = activeMap();
  const kind = paletteTab === 'objects' ? 'object' : 'actor';
  const availableAssets = paletteTab === 'objects'
    ? project.assets.objects.filter(asset => asset.mapType === map.type && (!asset.mapId || asset.mapId === map.id))
    : project.assets.actors;
  const objectFamilies = paletteTab === 'objects'
    ? [...new Set(availableAssets.map(asset => asset.category).filter(Boolean))].sort()
    : [];
  if (paletteTab === 'objects' && !objectFamilies.includes(selectedObjectFamily)) selectedObjectFamily = objectFamilies.includes('trees') ? 'trees' : objectFamilies[0] || '';
  const source = paletteQuery || favoriteOnly || paletteTab === 'actors'
    ? availableAssets
    : availableAssets.filter(asset => asset.category === selectedObjectFamily);
  const assets = sortPaletteEntries(source.filter(asset => paletteMatches(asset, kind)), kind);
  const objectFilter = paletteTab === 'objects'
    ? `<label class="metatile-family"><span>Family</span><select id="objectFamily">${familyOptions(objectFamilies, selectedObjectFamily, availableAssets, 'category')}</select></label>`
    : '';
  const cards = assets.map(asset => {
    const active = placingAsset?.id === asset.id ? 'active' : '';
    const thumb = paletteTab === 'actors'
      ? `<div class="palette-thumb"><span class="actor-thumb" style="width:32px;height:60px;background-image:url('${asset.path}');background-position:-32px 0;background-repeat:no-repeat"></span></div>`
      : `<div class="palette-thumb"><img src="${asset.path}" alt="" /></div>`;
    return `<div class="palette-item ${active}" draggable="true" data-asset="${escapeHtml(asset.id)}" data-asset-kind="${kind}" role="button" aria-label="${escapeHtml(asset.name)}" tabindex="0">${thumb}<span>${escapeHtml(asset.name)}</span>${favoriteButton(kind, asset.id)}</div>`;
  }).join('');
  paletteContent.innerHTML = `${objectFilter}<div class="palette-section-title">${paletteTab === 'objects' ? friendlyName(selectedObjectFamily) : 'Characters'} <span class="palette-count">${assets.length}</span></div>${cards ? `<div class="palette-grid">${cards}</div>` : emptyMarkup('No assets match this filter.')}`;
  paletteContent.querySelector('#objectFamily')?.addEventListener('change', event => { selectedObjectFamily = event.currentTarget.value; buildPalette(); });
  paletteContent.querySelectorAll('[data-asset]').forEach(item => {
    const activate = () => {
      placingAsset = {kind: item.dataset.assetKind, id: item.dataset.asset};
      trackRecent(item.dataset.assetKind, item.dataset.asset);
      setMode('select');
      buildPalette();
    };
    item.addEventListener('click', activate);
    item.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') activate(); });
    item.addEventListener('dragstart', event => {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/x-badger-asset', JSON.stringify({kind: item.dataset.assetKind, id: item.dataset.asset}));
    });
  });
  bindFavoriteButtons();
  updateBrushReadout();
}

function selectedEntry() {
  if (!selection) return null;
  const map = activeMap();
  if (selection.kind === 'object') return map.objects.find(entry => entry.id === selection.id) || null;
  if (selection.kind === 'actor') return map.actors.find(entry => entry.id === selection.id) || null;
  return map.events.find(entry => entry.id === selection.id) || null;
}

function effectiveCellBehavior(cell) {
  if (!cell) return 'outside';
  if (cell.conflicts.some(issue => issue.severity === 'error')) return 'conflict';
  if (cell.objectCells.some(entry => entry.door)) return 'warp';
  if (cell.groundBehavior === 'water') return 'water';
  if (!cell.passable) return 'solid';
  if (!cell.reachable) return 'unreachable';
  return 'walkable';
}

function behaviorBadge(behavior) {
  return `<span class="behavior-badge ${escapeHtml(behavior)}">${escapeHtml(behavior)}</span>`;
}

function cellSummary(cell, assessment = null) {
  if (!cell) return 'Outside map';
  if (assessment && !assessment.valid) return `Blocked · ${assessment.errors[0]}`;
  const behavior = effectiveCellBehavior(cell);
  const owners = cell.objectCells.map(entry => entry.object.name || entry.object.id);
  const occupants = [...owners, ...cell.actors.map(actor => actor.name || actor.id), ...cell.events.map(event => event.label || event.id)];
  const ground = (project.assets.groundTiles || []).find(entry => entry.id === cell.terrainId)?.name || friendlyName(cell.terrainId);
  return `${friendlyName(behavior)} · ${ground}${occupants.length ? ` · ${occupants.join(', ')}` : ''}`;
}

function updateSemanticReadout(cell = hoverCell) {
  if (!cell) {
    semanticReadout.textContent = 'Outside map';
    return;
  }
  const grid = analyzeMapGrid(project, activeMap());
  semanticReadout.textContent = cellSummary(grid.cellAt(cell.x, cell.y), placementAssessmentAt(cell, grid));
}

function updateCellInspector(cellPoint) {
  const map = activeMap();
  const grid = analyzeMapGrid(project, map);
  const cell = grid.cellAt(cellPoint.x, cellPoint.y);
  if (!cell) {
    inspectedCell = null;
    updateInspector();
    return;
  }
  const behavior = effectiveCellBehavior(cell);
  const ground = (project.assets.groundTiles || []).find(entry => entry.id === cell.terrainId);
  const structureRows = cell.objectCells.map(entry => `
    <div class="cell-owner">
      <span>${escapeHtml(entry.object.name || entry.object.id)} · ${entry.localX},${entry.localY} · ${escapeHtml(entry.behavior)}</span>
      <button data-cell-owner="${escapeHtml(entry.object.id)}">Select</button>
    </div>`).join('');
  const actorRows = cell.actors.map(actor => `
    <div class="cell-owner"><span>${escapeHtml(actor.name || actor.id)} · actor</span><button data-cell-actor="${escapeHtml(actor.id)}">Select</button></div>`).join('');
  const eventRows = cell.events.map(event => `
    <div class="cell-owner"><span>${escapeHtml(event.label || event.id)} · event</span><button data-cell-event="${escapeHtml(event.id)}">Select</button></div>`).join('');
  inspectorContent.innerHTML = `
    <div class="field-group">
      <label class="field-label"><span>Cell</span><span class="read-only-value">${cell.x}, ${cell.y}</span></label>
      <label class="field-label"><span>Behavior</span>${behaviorBadge(behavior)}</label>
      <label class="field-label"><span>Ground</span><span class="read-only-value">${escapeHtml(ground?.name || friendlyName(cell.terrainId))}</span></label>
      <label class="field-label"><span>Ground ID</span><span class="read-only-value">${escapeHtml(cell.terrainId || 'none')}</span></label>
      <label class="field-label"><span>Reachable</span><span class="read-only-value">${cell.reachable ? 'Yes' : 'No'}</span></label>
      <label class="field-label"><span>Runtime role</span><span class="read-only-value">${cell.critical.length ? escapeHtml(cell.critical.join(', ')) : 'None'}</span></label>
      <label class="field-label"><span>Connection</span><span class="read-only-value">${cell.connections.length ? cell.connections.map(entry => entry.to).join(', ') : 'None'}</span></label>
    </div>
    <div class="field-group">
      <strong>Grid owners</strong>
      <div class="cell-owner-list">${structureRows}${actorRows}${eventRows || ''}</div>
      ${structureRows || actorRows || eventRows ? '' : '<span class="read-only-value">Ground only</span>'}
    </div>
    ${cell.conflicts.length ? `<div class="field-group"><strong>Ownership notes</strong>${cell.conflicts.map(issue => `<div class="cell-conflict">${escapeHtml(issue.message)}</div>`).join('')}</div>` : ''}
    ${map.type === 'exterior' ? connectionsSection(map) : ''}`;
  inspectorContent.querySelectorAll('[data-cell-owner]').forEach(button => button.addEventListener('click', () => {
    selection = {kind: 'object', id: button.dataset.cellOwner};
    updateInspector(); requestRender();
  }));
  inspectorContent.querySelectorAll('[data-cell-actor]').forEach(button => button.addEventListener('click', () => {
    selection = {kind: 'actor', id: button.dataset.cellActor};
    updateInspector(); requestRender();
  }));
  inspectorContent.querySelectorAll('[data-cell-event]').forEach(button => button.addEventListener('click', () => {
    selection = {kind: 'event', id: button.dataset.cellEvent};
    updateInspector(); requestRender();
  }));
  if (map.type === 'exterior') bindConnectionsSection(map);
}

function updateInspector() {
  const map = activeMap();
  const entry = selectedEntry();
  deleteButton.disabled = !entry;
  if (!entry) {
    if (inspectedCell) {
      updateCellInspector(inspectedCell);
      return;
    }
    inspectorContent.innerHTML = `
      <div class="field-group">
        <label class="field-label"><span>Name</span><span class="read-only-value">${escapeHtml(map.name)}</span></label>
        <label class="field-label"><span>Type</span><span class="read-only-value">${escapeHtml(map.type)}</span></label>
        <label class="field-label"><span>Size</span><span class="read-only-value">${map.width} x ${map.height}</span></label>
        <label class="field-label"><span>Objects</span><span class="read-only-value">${map.objects.length}</span></label>
        <label class="field-label"><span>Actors</span><span class="read-only-value">${map.actors.length}</span></label>
        <label class="field-label"><span>Events</span><span class="read-only-value">${map.events.length}</span></label>
      </div>${map.type === 'exterior' ? connectionsSection(map) : ''}`;
    if (map.type === 'exterior') bindConnectionsSection(map);
    return;
  }
  if (selection.kind === 'object') updateObjectInspector(entry);
  else if (selection.kind === 'actor') updateActorInspector(entry);
  else updateEventInspector(entry);
}

const CONNECTION_EDGES = ['north', 'south', 'east', 'west'];

function exteriorMapOptions(selected, excludeId) {
  return Object.values(project.maps)
    .filter(map => map.type === 'exterior' && map.id !== excludeId)
    .map(map => `<option value="${map.id}" ${selected === map.id ? 'selected' : ''}>${escapeHtml(map.name)}</option>`)
    .join('');
}

function connectionsSection(map) {
  const rows = (map.connections || []).map((connection, index) => `
    <div class="field-group connection-row">
      <label class="field-label"><span>Edge</span><select data-connection="${index}" data-connection-field="edge">${CONNECTION_EDGES.map(edge => `<option value="${edge}" ${connection.edge === edge ? 'selected' : ''}>${edge}</option>`).join('')}</select></label>
      <div class="coordinate-row">
        <label class="field-label"><span>Start</span><input type="number" data-connection="${index}" data-connection-field="start" value="${connection.start}" /></label>
        <label class="field-label"><span>Span</span><input type="number" data-connection="${index}" data-connection-field="span" value="${connection.span}" /></label>
      </div>
      <label class="field-label"><span>Leads to</span><select data-connection="${index}" data-connection-field="to">${exteriorMapOptions(connection.to, map.id)}</select></label>
      <label class="field-label"><span>To edge</span><select data-connection="${index}" data-connection-field="toEdge">${CONNECTION_EDGES.map(edge => `<option value="${edge}" ${connection.toEdge === edge ? 'selected' : ''}>${edge}</option>`).join('')}</select></label>
      <label class="field-label"><span>To start</span><input type="number" data-connection="${index}" data-connection-field="toStart" value="${connection.toStart}" /></label>
      <div class="inspector-actions"><button data-action="remove-connection" data-index="${index}">Remove connection</button></div>
    </div>`).join('');
  return `
    <div class="field-group">
      <strong>Edge connections</strong>
      ${rows || '<span class="read-only-value">No connections yet.</span>'}
      <div class="inspector-actions"><button data-action="add-connection">Add connection</button></div>
    </div>`;
}

function bindConnectionsSection(map) {
  inspectorContent.querySelectorAll('[data-connection]').forEach(input => input.addEventListener('change', () => {
    const connection = map.connections[Number(input.dataset.connection)];
    if (!connection) return;
    const field = input.dataset.connectionField;
    connection[field] = input.type === 'number' ? Math.max(0, Math.round(Number(input.value) || 0)) : input.value;
    if (field === 'span') connection.span = Math.max(1, connection.span);
    recordHistory('Connection updated');
  }));
  inspectorContent.querySelectorAll('[data-action="remove-connection"]').forEach(button => button.addEventListener('click', () => {
    map.connections.splice(Number(button.dataset.index), 1);
    recordHistory('Connection removed');
  }));
  inspectorContent.querySelector('[data-action="add-connection"]')?.addEventListener('click', () => {
    const firstOther = Object.values(project.maps).find(entry => entry.type === 'exterior' && entry.id !== map.id);
    if (!firstOther) return;
    map.connections = map.connections || [];
    map.connections.push({edge: 'east', start: 1, span: 2, to: firstOther.id, toEdge: 'west', toStart: 1});
    recordHistory('Connection added');
  });
}

function coordinateFields(entry) {
  return `<div class="coordinate-row">
    <label class="field-label"><span>X</span><input type="number" data-field="x" value="${entry.x}" /></label>
    <label class="field-label"><span>Y</span><input type="number" data-field="y" value="${entry.y}" /></label>
  </div>`;
}

function gridArtLabel(object) {
  const source = object.sourceFootprint;
  if (!source) return 'Custom grid object';
  const sourceSize = `${source.width} x ${source.height}`;
  if (object.compositionPolicy === 'exact') return `Exact ${sourceSize} stamp`;
  if (object.compositionPolicy === 'repeat-x') return `Horizontal modular ${sourceSize} -> ${object.width} x ${object.height}`;
  if (object.compositionPolicy === 'repeat-y') return `Vertical modular ${sourceSize} -> ${object.width} x ${object.height}`;
  return `Native ${sourceSize} stamp`;
}

function updateObjectInspector(object) {
  inspectorContent.innerHTML = `
    <div class="field-group">
      <label class="field-label"><span>ID</span><span class="read-only-value">${escapeHtml(object.id)}</span></label>
      <label class="field-label"><span>Name</span><input data-field="name" value="${escapeHtml(object.name)}" /></label>
      ${coordinateFields(object)}
      <label class="field-label"><span>Footprint</span><span class="read-only-value">${object.width} x ${object.height} locked</span></label>
      <label class="field-label"><span>Tile assembly</span><span class="read-only-value">${escapeHtml(gridArtLabel(object))}</span></label>
      <label class="field-label"><span>Depth</span><select data-field="depthMode"><option value="row-sliced" ${object.depthMode === 'row-sliced' ? 'selected' : ''}>Row sliced</option><option value="flat" ${object.depthMode === 'flat' ? 'selected' : ''}>Flat object</option></select></label>
      <label class="field-label"><span>Destination</span><select data-field="interior"><option value="">None</option>${Object.values(project.maps).filter(map => map.type === 'interior').map(map => `<option value="${map.id}" ${object.interior === map.id ? 'selected' : ''}>${escapeHtml(map.name)}</option>`).join('')}</select></label>
    </div>
    <div class="field-group">
      <strong>Collision mask</strong>
      <div class="mask-grid" style="grid-template-columns:repeat(${object.width},26px)">${object.collisionMask.map((row, y) => [...row].map((marker, x) => {
        const door = object.door?.x === x && object.door?.y === y;
        return `<button class="mask-cell ${marker === '#' ? 'solid' : ''} ${door ? 'door' : ''}" data-mask-x="${x}" data-mask-y="${y}" title="Cell ${x},${y}">${marker}</button>`;
      }).join('')).join('')}</div>
      <div class="inspector-actions"><button data-action="duplicate">Duplicate</button><button data-action="clear-door">Clear door</button></div>
    </div>`;
  bindInspectorFields('object', object);
  inspectorContent.querySelectorAll('[data-mask-x]').forEach(button => button.addEventListener('click', () => {
    toggleCollisionCell(object, Number(button.dataset.maskX), Number(button.dataset.maskY));
    recordHistory('Collision updated');
  }));
  inspectorContent.querySelector('[data-action="duplicate"]').addEventListener('click', () => duplicateSelection());
  inspectorContent.querySelector('[data-action="clear-door"]').addEventListener('click', () => {
    if (object.door) {
      const tileId = object.metatiles?.[object.door.y]?.[object.door.x];
      if (tileId) object.metatiles[object.door.y][object.door.x] = behaviorVariant(tileId, 'walkable');
    }
    object.door = null;
    recordHistory('Door cleared');
  });
}

function updateActorInspector(actor) {
  inspectorContent.innerHTML = `
    <div class="field-group">
      <label class="field-label"><span>ID</span><span class="read-only-value">${escapeHtml(actor.id)}</span></label>
      <label class="field-label"><span>Name</span><input data-field="name" value="${escapeHtml(actor.name)}" /></label>
      ${coordinateFields(actor)}
      <label class="field-label"><span>Facing</span><select data-field="facing">${['down', 'left', 'right', 'up'].map(value => `<option value="${value}" ${actor.facing === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
      <label class="field-label"><span>Solid</span><input type="checkbox" data-field="solid" ${actor.solid ? 'checked' : ''} /></label>
      <label class="field-label"><span>Condition</span><input data-field="condition" value="${escapeHtml(actor.condition || '')}" /></label>
      <label class="field-label"><span>Dialogue</span><textarea data-field="dialogue">${escapeHtml(actor.dialogue)}</textarea></label>
    </div>
    <div class="inspector-actions"><button data-action="duplicate">Duplicate</button></div>`;
  bindInspectorFields('actor', actor);
  inspectorContent.querySelector('[data-action="duplicate"]').addEventListener('click', () => duplicateSelection());
}

function updateEventInspector(eventEntry) {
  inspectorContent.innerHTML = `
    <div class="field-group">
      <label class="field-label"><span>ID</span><span class="read-only-value">${escapeHtml(eventEntry.id)}</span></label>
      <label class="field-label"><span>Label</span><input data-field="label" value="${escapeHtml(eventEntry.label)}" /></label>
      ${coordinateFields(eventEntry)}
      <label class="field-label"><span>Story beat</span><input type="number" data-field="beat" value="${eventEntry.beat ?? ''}" /></label>
      <label class="field-label"><span>Kind</span><select data-field="kind"><option value="">Marker (no effect)</option><option value="message" ${eventEntry.kind === 'message' ? 'selected' : ''}>Message on step</option></select></label>
      <label class="field-label"><span>Text</span><textarea data-field="text">${escapeHtml(eventEntry.text || '')}</textarea></label>
      <label class="field-label"><span>Once</span><input type="checkbox" data-field="once" ${eventEntry.once ? 'checked' : ''} /></label>
    </div>`;
  bindInspectorFields('event', eventEntry);
}

function bindInspectorFields(kind, entry) {
  inspectorContent.querySelectorAll('[data-field]').forEach(input => input.addEventListener('change', () => {
    const field = input.dataset.field;
    const previous = entry[field];
    let value = input.type === 'checkbox' ? input.checked : input.value;
    if (input.type === 'number') value = value === '' ? null : Number(value);
    if (field === 'x' || field === 'y') {
      const map = activeMap();
      const extent = kind === 'object' ? (field === 'x' ? entry.width : entry.height) : 1;
      value = clamp(Math.round(value || 0), 0, (field === 'x' ? map.width : map.height) - extent);
    }
    if (['condition', 'interior', 'kind', 'text'].includes(field) && value === '') value = null;
    if (field === 'once' && !value) value = null;
    let assessment = null;
    if (field === 'x' || field === 'y') {
      const origin = {x: field === 'x' ? value : entry.x, y: field === 'y' ? value : entry.y};
      const placement = kind === 'object' ? objectPlacement(entry)
        : kind === 'actor' ? {kind: 'actor'}
          : {kind: 'event', eventKind: entry.kind || null};
      assessment = assessPlacement(project, activeMap(), placement, origin, {
        ignoreObjectId: kind === 'object' ? entry.id : null,
        ignoreActorId: kind === 'actor' ? entry.id : null,
        ignoreEventId: kind === 'event' ? entry.id : null
      });
    } else if (kind === 'actor' && field === 'solid' && value) {
      assessment = assessPlacement(project, activeMap(), {kind: 'actor'}, entry, {ignoreActorId: entry.id});
    } else if (kind === 'event' && field === 'kind' && value === 'message') {
      assessment = assessPlacement(project, activeMap(), {kind: 'event', eventKind: 'message'}, entry, {ignoreEventId: entry.id});
    }
    if (assessment && !assessment.valid) {
      if (input.type === 'checkbox') input.checked = Boolean(previous);
      else input.value = previous ?? '';
      rejectPlacement(assessment);
      return;
    }
    entry[field] = value;
    recordHistory(`${kind} updated`);
  }));
}

function updateValidation() {
  const report = validateProject(project);
  const count = report.errors.length + report.warnings.length;
  validationCount.textContent = String(count);
  if (!count) {
    validationContent.innerHTML = '<div class="validation-ok">Grid, footprints, collision, and doors are valid.</div>';
    return;
  }
  const messages = [
    ...report.errors.map(message => ({message, severity: 'error'})),
    ...report.warnings.map(message => ({message, severity: 'warning'}))
  ];
  validationFocus = messages.map(entry => validationLocation(entry.message));
  validationContent.innerHTML = `<div class="validation-list">${messages.map((entry, index) => `
    <button class="validation-item ${entry.severity === 'warning' ? 'warning' : ''}" data-validation-index="${index}">${escapeHtml(entry.message)}</button>`).join('')}</div>`;
  validationContent.querySelectorAll('[data-validation-index]').forEach(button => button.addEventListener('click', () => {
    focusValidationLocation(validationFocus[Number(button.dataset.validationIndex)]);
  }));
}

function validationLocation(message) {
  const mapId = Object.keys(project.maps).sort((a, b) => b.length - a.length)
    .find(id => message === id || message.startsWith(`${id}:`) || message.startsWith(`${id}.`));
  if (!mapId) return null;
  const map = project.maps[mapId];
  const token = message.slice(mapId.length + 1).split(':')[0];
  const object = map.objects.find(entry => entry.id === token);
  const actor = map.actors.find(entry => entry.id === token);
  const event = map.events.find(entry => entry.id === token);
  const coordinateMatch = message.match(/(?:cell|at|is)\s+(\d+),(\d+)/i);
  let x = coordinateMatch ? Number(coordinateMatch[1]) : null;
  let y = coordinateMatch ? Number(coordinateMatch[2]) : null;
  if (object && x !== null && y !== null && x < object.width && y < object.height) {
    x += object.x;
    y += object.y;
  }
  if (object && (x === null || y === null)) {
    x = object.x + Math.floor(object.width / 2);
    y = object.y + Math.floor(object.height / 2);
  }
  if (actor && (x === null || y === null)) ({x, y} = actor);
  if (event && (x === null || y === null)) ({x, y} = event);
  return {
    mapId,
    selection: object ? {kind: 'object', id: object.id}
      : actor ? {kind: 'actor', id: actor.id}
        : event ? {kind: 'event', id: event.id} : null,
    cell: Number.isInteger(x) && Number.isInteger(y) ? {x, y} : null
  };
}

function focusValidationLocation(location) {
  if (!location || !project.maps[location.mapId]) return;
  project.activeMapId = location.mapId;
  mapSelect.value = location.mapId;
  selection = location.selection;
  inspectedCell = location.cell;
  placingAsset = null;
  buildPalette();
  updateAll();
  inspectorPanel.classList.add('mobile-open');
  requestAnimationFrame(() => {
    if (!location.cell) return;
    const map = activeMap();
    const left = location.cell.x * map.cellSize * zoom - workspace.clientWidth / 2;
    const top = location.cell.y * map.cellSize * zoom - workspace.clientHeight / 2;
    workspace.scrollTo({left: Math.max(0, left), top: Math.max(0, top), behavior: 'smooth'});
  });
}

function updateAll() {
  const map = activeMap();
  mapStatus.textContent = `${map.width} x ${map.height} cells`;
  playtestButton.href = map.type === 'interior'
    ? `./?atlas=1&interior=${encodeURIComponent(map.id)}`
    : `./?atlas=1&play=1&area=${encodeURIComponent(map.id)}`;
  updateHistoryButtons();
  updateInspector();
  updateValidation();
  updateBrushReadout();
  requestRender();
}

function cellFromClient(clientX, clientY) {
  const map = activeMap();
  const bounds = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - bounds.left) * canvas.width / bounds.width / map.cellSize);
  const y = Math.floor((clientY - bounds.top) * canvas.height / bounds.height / map.cellSize);
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;
  return {x, y};
}

function setTerrain(cell, material) {
  const map = activeMap();
  const assessment = assessPlacement(project, map, {
    kind: 'groundStamp', width: 1, height: 1, cells: [[material]]
  }, cell);
  if (!assessment.valid) {
    rejectPlacement(assessment);
    return false;
  }
  map.terrain[cell.y][cell.x] = material;
  return true;
}

function fillTerrain(cell, material) {
  const map = activeMap();
  const target = map.terrain[cell.y][cell.x];
  if (target === material) {
    saveStatus.textContent = 'Fill skipped: the area already uses this tile';
    return;
  }
  const pending = [cell];
  const visited = new Set();
  while (pending.length) {
    const current = pending.pop();
    const key = `${current.x},${current.y}`;
    if (visited.has(key) || map.terrain[current.y]?.[current.x] !== target) continue;
    visited.add(key);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x >= 0 && y >= 0 && x < map.width && y < map.height) pending.push({x, y});
    }
  }
  for (const key of visited) {
    const [x, y] = key.split(',').map(Number);
    const assessment = assessPlacement(project, map, {
      kind: 'groundStamp', width: 1, height: 1, cells: [[material]]
    }, {x, y});
    if (!assessment.valid) {
      rejectPlacement(assessment);
      return;
    }
  }
  for (const key of visited) {
    const [x, y] = key.split(',').map(Number);
    map.terrain[y][x] = material;
  }
  recordHistory(`${visited.size} ground cells filled`);
}

function pickAt(cell) {
  const map = activeMap();
  const hit = renderer.hitTest(renderState(), cell.x, cell.y);
  if (hit?.kind === 'actor') {
    const actor = map.actors.find(entry => entry.id === hit.id);
    const asset = project.assets.actors.find(entry => entry.id === actor?.assetId);
    if (asset) {
      paletteTab = 'actors';
      placingAsset = {kind: 'actor', id: asset.id};
      trackRecent('actor', asset.id);
      setMode('select');
      buildPalette();
      return;
    }
  }
  if (hit?.kind === 'object') {
    const object = map.objects.find(entry => entry.id === hit.id);
    const localX = cell.x - object.x;
    const localY = cell.y - object.y;
    const tileId = object.metatiles?.[localY]?.[localX];
    if (tileId) {
      const tile = metatileById(tileId);
      paletteTab = 'terrain';
      selectedMetatile = tileId;
      selectedMetatileFamily = tile?.families?.[0] || selectedMetatileFamily;
      showAdvancedStructure = true;
      trackRecent('metatile', tileId);
      setMode('structure');
      buildPalette();
      return;
    }
    const asset = project.assets.objects.find(entry => entry.id === object?.assetId);
    if (asset) {
      paletteTab = 'objects';
      selectedObjectFamily = asset.category || selectedObjectFamily;
      placingAsset = {kind: 'object', id: asset.id};
      trackRecent('object', asset.id);
      setMode('select');
      buildPalette();
      return;
    }
  }
  selectedTerrain = map.terrain[cell.y][cell.x];
  const tile = (project.assets.groundTiles || []).find(entry => entry.id === selectedTerrain);
  if (tile?.family) selectedGroundFamily = tile.family;
  paletteTab = 'terrain';
  trackRecent('terrain', selectedTerrain);
  setMode('terrain');
  buildPalette();
}

function eraseAt(cell) {
  const map = activeMap();
  const hit = renderer.hitTest(renderState(), cell.x, cell.y);
  if (hit) {
    const key = hit.kind === 'object' ? 'objects' : hit.kind === 'actor' ? 'actors' : 'events';
    map[key] = map[key].filter(entry => entry.id !== hit.id);
    if (selection?.id === hit.id) selection = null;
    recordHistory(`${friendlyName(hit.kind)} erased`);
    return;
  }
  const replacement = map.originalTerrain?.[cell.y]?.[cell.x] || (map.type === 'exterior' ? 'grass' : 'floor');
  if (map.terrain[cell.y][cell.x] === replacement) {
    saveStatus.textContent = 'Nothing to erase in this cell';
    return;
  }
  map.terrain[cell.y][cell.x] = replacement;
  recordHistory('Ground cell restored');
}

function metatileById(tileId) {
  return (project.assets.metatiles || []).find(tile => tile.id === tileId) || null;
}

function behaviorVariant(tileId, behavior) {
  const current = metatileById(tileId);
  if (!current) return tileId;
  return (project.assets.metatiles || []).find(tile => tile.visual === current.visual && tile.behavior === behavior)?.id || tileId;
}

function setMaskMarker(object, localX, localY, marker) {
  const row = object.collisionMask[localY].split('');
  row[localX] = marker;
  object.collisionMask[localY] = row.join('');
}

function applyMetatileBehavior(object, localX, localY, tileId) {
  const tile = metatileById(tileId);
  if (!tile) return;
  const previousDoor = object.door ? {...object.door} : null;
  if (tile.behavior === 'warp') {
    if (previousDoor && (previousDoor.x !== localX || previousDoor.y !== localY)) {
      const previousId = object.metatiles?.[previousDoor.y]?.[previousDoor.x];
      if (previousId) object.metatiles[previousDoor.y][previousDoor.x] = behaviorVariant(previousId, 'walkable');
      setMaskMarker(object, previousDoor.x, previousDoor.y, '.');
    }
    object.door = {x: localX, y: localY};
    setMaskMarker(object, localX, localY, '.');
  } else {
    if (object.door?.x === localX && object.door?.y === localY) object.door = null;
    setMaskMarker(object, localX, localY, tile.behavior === 'solid' ? '#' : '.');
  }
}

function objectAtCell(cell) {
  return [...activeMap().objects].reverse().find(object => (
    cell.x >= object.x && cell.y >= object.y
    && cell.x < object.x + object.width && cell.y < object.y + object.height
  )) || null;
}

function paintStructureMetatile(cell, tileId) {
  const tile = metatileById(tileId);
  if (!tile || activeMap().renderModel !== 'metatile') return;
  let object = objectAtCell(cell);
  const assessment = assessPlacement(project, activeMap(), {
    kind: 'object', width: 1, height: 1,
    collisionMask: [tile.behavior === 'solid' ? '#' : '.'],
    door: tile.behavior === 'warp' ? {x: 0, y: 0} : null,
    metatiles: [[tileId]]
  }, cell, {ignoreObjectId: object?.id || null});
  if (!assessment.valid) {
    rejectPlacement(assessment);
    return false;
  }
  if (!object) {
    object = {
      id: uniqueId('metatile_patch', activeMap().objects),
      assetId: null,
      sourceKind: 'metatile',
      name: tile.names?.[0] || 'Structure metatile',
      x: cell.x,
      y: cell.y,
      width: 1,
      height: 1,
      depthMode: 'row-sliced',
      collisionMask: ['.'],
      door: null,
      metatiles: [[tileId]],
      gate: null,
      interior: null
    };
    activeMap().objects.push(object);
  } else {
    const localX = cell.x - object.x;
    const localY = cell.y - object.y;
    if (!object.metatiles) return;
    object.metatiles[localY][localX] = tileId;
  }
  const localX = cell.x - object.x;
  const localY = cell.y - object.y;
  applyMetatileBehavior(object, localX, localY, tileId);
  selection = {kind: 'object', id: object.id};
  return true;
}

function toggleCollisionCell(object, localX, localY, marker = null) {
  if (localX < 0 || localY < 0 || localX >= object.width || localY >= object.height) return;
  if (object.door?.x === localX && object.door?.y === localY) return;
  const next = marker || (object.collisionMask[localY][localX] === '#' ? '.' : '#');
  if (next === '#') {
    const tileId = object.metatiles?.[localY]?.[localX];
    const solidTileId = tileId ? behaviorVariant(tileId, 'solid') : null;
    const assessment = assessPlacement(project, activeMap(), {
      kind: 'object', width: 1, height: 1, collisionMask: ['#'], door: null,
      metatiles: solidTileId ? [[solidTileId]] : null
    }, {x: object.x + localX, y: object.y + localY}, {ignoreObjectId: object.id});
    if (!assessment.valid) {
      rejectPlacement(assessment);
      return false;
    }
  }
  setMaskMarker(object, localX, localY, next);
  const tileId = object.metatiles?.[localY]?.[localX];
  if (tileId) object.metatiles[localY][localX] = behaviorVariant(tileId, next === '#' ? 'solid' : 'walkable');
  return true;
}

function rejectPlacement(assessment) {
  saveStatus.textContent = `Placement blocked: ${assessment.errors[0]}`;
  semanticReadout.textContent = `Blocked · ${assessment.errors[0]}`;
  requestRender();
}

function applyGroundStamp(stampId, cell) {
  const map = activeMap();
  const stamp = (project.assets.groundStamps || []).find(entry => entry.id === stampId);
  if (!stamp || map.renderModel !== 'metatile') return;
  const assessment = assessPlacement(project, map, {...stamp, kind: 'groundStamp'}, cell);
  if (!assessment.valid) {
    rejectPlacement(assessment);
    return;
  }
  const originX = assessment.origin.x;
  const originY = assessment.origin.y;
  for (let y = 0; y < stamp.height; y += 1) {
    for (let x = 0; x < stamp.width; x += 1) {
      const tileId = stamp.cells[y][x];
      if (tileId) map.terrain[originY + y][originX + x] = tileId;
    }
  }
  placingAsset = null;
  buildPalette();
  recordHistory('Ground assembly placed');
}

function addObject(assetId, cell) {
  const map = activeMap();
  const asset = project.assets.objects.find(entry => entry.id === assetId);
  if (!asset) return;
  const assessment = assessPlacement(project, map, objectPlacement(asset), cell);
  if (!assessment.valid) {
    rejectPlacement(assessment);
    return;
  }
  const object = {
    id: uniqueId(asset.sourceId, map.objects),
    assetId: asset.id,
    sourceKind: asset.sourceKind || null,
    name: asset.name,
    x: assessment.origin.x,
    y: assessment.origin.y,
    width: asset.width,
    height: asset.height,
    depthMode: 'row-sliced',
    collisionMask: [...asset.defaultCollisionMask],
    door: asset.defaultDoor ? {...asset.defaultDoor} : null,
    metatiles: asset.metatiles ? cloneProject(asset.metatiles) : null,
    gate: null,
    interior: null
  };
  map.objects.push(object);
  selection = {kind: 'object', id: object.id};
  placingAsset = null;
  buildPalette();
  recordHistory('Object placed');
}

function addActor(assetId, cell) {
  const map = activeMap();
  const asset = project.assets.actors.find(entry => entry.id === assetId);
  if (!asset) return;
  const assessment = assessPlacement(project, map, {kind: 'actor'}, cell);
  if (!assessment.valid) {
    rejectPlacement(assessment);
    return;
  }
  const actor = {
    id: uniqueId(asset.sourceId, map.actors),
    assetId: asset.id,
    name: asset.name,
    x: cell.x,
    y: cell.y,
    facing: 'down',
    solid: true,
    condition: null,
    dialogue: ''
  };
  map.actors.push(actor);
  selection = {kind: 'actor', id: actor.id};
  placingAsset = null;
  buildPalette();
  recordHistory('Actor placed');
}

function nearestValidPlacement(placement, preferred) {
  const map = activeMap();
  const candidates = [];
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      candidates.push({x, y, distance: Math.abs(x - preferred.x) + Math.abs(y - preferred.y)});
    }
  }
  candidates.sort((first, second) => first.distance - second.distance || first.y - second.y || first.x - second.x);
  for (const candidate of candidates) {
    const assessment = assessPlacement(project, map, placement, candidate);
    if (assessment.valid) return assessment;
  }
  return null;
}

function duplicateSelection() {
  const entry = selectedEntry();
  if (!entry || selection.kind === 'event') return;
  const map = activeMap();
  const collection = selection.kind === 'object' ? map.objects : map.actors;
  const copy = cloneProject(entry);
  const placement = selection.kind === 'object' ? objectPlacement(copy) : {kind: 'actor'};
  const assessment = nearestValidPlacement(placement, {x: entry.x + 1, y: entry.y + 1});
  if (!assessment) {
    saveStatus.textContent = 'Duplicate blocked: no unowned grid footprint is available';
    return;
  }
  copy.id = uniqueId(entry.id, collection);
  copy.x = assessment.origin.x;
  copy.y = assessment.origin.y;
  collection.push(copy);
  selection = {kind: selection.kind, id: copy.id};
  recordHistory('Selection duplicated');
}

function deleteSelection() {
  if (!selection) return;
  const map = activeMap();
  const key = selection.kind === 'object' ? 'objects' : selection.kind === 'actor' ? 'actors' : 'events';
  map[key] = map[key].filter(entry => entry.id !== selection.id);
  selection = null;
  recordHistory('Selection deleted');
}

function startDrag(hit, cell, pointerId) {
  const entry = hit && (hit.kind === 'object'
    ? activeMap().objects.find(candidate => candidate.id === hit.id)
    : hit.kind === 'actor'
      ? activeMap().actors.find(candidate => candidate.id === hit.id)
      : activeMap().events.find(candidate => candidate.id === hit.id));
  if (!entry) return;
  selection = hit;
  gesture = {
    type: 'move',
    pointerId,
    entry,
    kind: hit.kind,
    offsetX: cell.x - entry.x,
    offsetY: cell.y - entry.y,
    startX: entry.x,
    startY: entry.y,
    changed: false,
    assessment: null
  };
  updateInspector();
  requestRender();
}

function moveGesture(cell) {
  const map = activeMap();
  if (gesture.type === 'paint-terrain') {
    const key = `${cell.x},${cell.y}`;
    if (!gesture.visited.has(key)) {
      gesture.visited.add(key);
      setTerrain(cell, gesture.material);
      requestRender();
    }
    return;
  }
  if (gesture.type === 'paint-structure') {
    const key = `${cell.x},${cell.y}`;
    if (!gesture.visited.has(key)) {
      gesture.visited.add(key);
      paintStructureMetatile(cell, gesture.tileId);
      requestRender();
    }
    return;
  }
  if (gesture.type === 'paint-collision') {
    const object = gesture.object;
    const localX = cell.x - object.x;
    const localY = cell.y - object.y;
    const key = `${localX},${localY}`;
    if (!gesture.visited.has(key)) {
      gesture.visited.add(key);
      toggleCollisionCell(object, localX, localY, gesture.marker);
      requestRender();
    }
    return;
  }
  if (gesture.type === 'camera') {
    setCameraAt(cell);
    return;
  }
  if (gesture.type !== 'move') return;
  const extentX = gesture.kind === 'object' ? gesture.entry.width : 1;
  const extentY = gesture.kind === 'object' ? gesture.entry.height : 1;
  const candidate = {
    x: clamp(cell.x - gesture.offsetX, 0, map.width - extentX),
    y: clamp(cell.y - gesture.offsetY, 0, map.height - extentY)
  };
  const placement = gesture.kind === 'object'
    ? objectPlacement(gesture.entry)
    : gesture.kind === 'actor'
      ? {kind: 'actor'}
      : {kind: 'event', eventKind: gesture.entry.kind || null};
  const assessment = assessPlacement(project, map, placement, candidate, {
    ignoreObjectId: gesture.kind === 'object' ? gesture.entry.id : null,
    ignoreActorId: gesture.kind === 'actor' ? gesture.entry.id : null,
    ignoreEventId: gesture.kind === 'event' ? gesture.entry.id : null
  });
  gesture.assessment = assessment;
  if (!assessment.valid) {
    semanticReadout.textContent = `Blocked · ${assessment.errors[0]}`;
    requestRender();
    return;
  }
  gesture.entry.x = assessment.origin.x;
  gesture.entry.y = assessment.origin.y;
  gesture.changed = gesture.changed || gesture.entry.x !== gesture.startX || gesture.entry.y !== gesture.startY;
  requestRender();
}

function setCameraAt(cell) {
  const map = activeMap();
  const camera = currentCamera();
  const x = clamp(cell.x - Math.floor(camera.width / 2), 0, map.width - camera.width);
  const y = clamp(cell.y - Math.floor(camera.height / 2), 0, map.height - camera.height);
  if (!map.cameraReviews.length) map.cameraReviews.push({id: 'editor_view', label: 'Editor view', x, y, width: camera.width, height: camera.height});
  else Object.assign(map.cameraReviews[0], {x, y, width: camera.width, height: camera.height});
  cameraPreview = true;
  document.querySelector('#cameraButton').classList.add('active');
  requestRender();
}

canvas.addEventListener('pointerdown', event => {
  if (mode === 'pan' || event.button === 1) {
    event.preventDefault();
    gesture = {
      type: 'pan',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: workspace.scrollLeft,
      scrollTop: workspace.scrollTop
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
    return;
  }
  const cell = cellFromClient(event.clientX, event.clientY);
  if (!cell) return;
  inspectedCell = cell;
  canvas.focus();
  if (mode === 'inspect') {
    selection = null;
    updateInspector();
    inspectorPanel.classList.add('mobile-open');
    requestRender();
    return;
  }
  if (mode === 'pick') {
    pickAt(cell);
    return;
  }
  if (mode === 'fill') {
    fillTerrain(cell, selectedTerrain);
    return;
  }
  if (mode === 'erase') {
    eraseAt(cell);
    return;
  }
  if (placingAsset) {
    if (placingAsset.kind === 'groundStamp') applyGroundStamp(placingAsset.id, cell);
    else if (placingAsset.kind === 'object') addObject(placingAsset.id, cell);
    else addActor(placingAsset.id, cell);
    return;
  }
  if (mode === 'terrain') {
    gesture = {type: 'paint-terrain', pointerId: event.pointerId, material: selectedTerrain, visited: new Set()};
    canvas.setPointerCapture(event.pointerId);
    moveGesture(cell);
    return;
  }
  if (mode === 'structure') {
    if (!selectedMetatile || activeMap().renderModel !== 'metatile') return;
    gesture = {type: 'paint-structure', pointerId: event.pointerId, tileId: selectedMetatile, visited: new Set()};
    canvas.setPointerCapture(event.pointerId);
    moveGesture(cell);
    return;
  }
  if (mode === 'collision') {
    const object = selection?.kind === 'object' ? selectedEntry() : null;
    if (!object) return;
    const localX = cell.x - object.x;
    const localY = cell.y - object.y;
    if (localX < 0 || localY < 0 || localX >= object.width || localY >= object.height) return;
    const marker = object.collisionMask[localY][localX] === '#' ? '.' : '#';
    gesture = {type: 'paint-collision', pointerId: event.pointerId, object, marker, visited: new Set()};
    canvas.setPointerCapture(event.pointerId);
    moveGesture(cell);
    return;
  }
  if (mode === 'door') {
    const object = selection?.kind === 'object' ? selectedEntry() : null;
    if (!object) return;
    const localX = cell.x - object.x;
    const localY = cell.y - object.y;
    if (localX < 0 || localY < 0 || localX >= object.width || localY >= object.height) return;
    const same = object.door?.x === localX && object.door?.y === localY;
    if (same) {
      const tileId = object.metatiles?.[localY]?.[localX];
      if (tileId) object.metatiles[localY][localX] = behaviorVariant(tileId, 'walkable');
      object.door = null;
    } else {
      const tileId = object.metatiles?.[localY]?.[localX];
      const warpTileId = tileId ? behaviorVariant(tileId, 'warp') : null;
      const assessment = assessPlacement(project, activeMap(), {
        kind: 'object', width: 1, height: 1, collisionMask: ['.'], door: {x: 0, y: 0},
        metatiles: warpTileId ? [[warpTileId]] : null
      }, cell, {ignoreObjectId: object.id});
      if (!assessment.valid) {
        rejectPlacement(assessment);
        return;
      }
      if (object.door) {
        const previous = object.door;
        const previousId = object.metatiles?.[previous.y]?.[previous.x];
        if (previousId) object.metatiles[previous.y][previous.x] = behaviorVariant(previousId, 'walkable');
      }
      setMaskMarker(object, localX, localY, '.');
      object.door = {x: localX, y: localY};
      if (tileId) object.metatiles[localY][localX] = behaviorVariant(tileId, 'warp');
    }
    recordHistory(same ? 'Door cleared' : 'Door placed');
    return;
  }
  if (mode === 'camera') {
    gesture = {type: 'camera', pointerId: event.pointerId};
    canvas.setPointerCapture(event.pointerId);
    setCameraAt(cell);
    return;
  }
  const hit = renderer.hitTest(renderState(), cell.x, cell.y);
  if (mode === 'event') {
    if (hit?.kind === 'event') startDrag(hit, cell, event.pointerId);
    else {
      const map = activeMap();
      const eventEntry = {id: uniqueId('event', map.events), label: 'New event', x: cell.x, y: cell.y, beat: null};
      map.events.push(eventEntry);
      selection = {kind: 'event', id: eventEntry.id};
      recordHistory('Event added');
    }
    return;
  }
  if (hit) {
    startDrag(hit, cell, event.pointerId);
    canvas.setPointerCapture(event.pointerId);
  } else {
    selection = null;
    updateInspector();
    requestRender();
  }
});

canvas.addEventListener('pointermove', event => {
  if (gesture?.type === 'pan') {
    workspace.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.startX);
    workspace.scrollTop = gesture.scrollTop - (event.clientY - gesture.startY);
    hoverCell = null;
    cellReadout.textContent = 'Cell --,--';
    return;
  }
  const cell = cellFromClient(event.clientX, event.clientY);
  hoverCell = cell;
  cellReadout.textContent = cell ? `Cell ${cell.x},${cell.y}` : 'Cell --,--';
  updateSemanticReadout(cell);
  if (gesture && cell) moveGesture(cell);
  requestRender();
});

canvas.addEventListener('pointerleave', () => {
  if (!gesture) {
    hoverCell = null;
    cellReadout.textContent = 'Cell --,--';
    semanticReadout.textContent = 'Outside map';
    requestRender();
  }
});

function finishGesture(event) {
  if (!gesture || (gesture.pointerId !== undefined && event.pointerId !== gesture.pointerId)) return;
  if (gesture.type === 'pan') {
    gesture = null;
    canvas.style.cursor = cursorForMode();
    return;
  }
  if (gesture.type === 'move' && !gesture.changed) {
    const blocked = gesture.assessment && !gesture.assessment.valid;
    gesture = null;
    if (!blocked) saveStatus.textContent = 'Selection unchanged';
    updateSemanticReadout();
    requestRender();
    return;
  }
  const label = gesture.type === 'paint-terrain' ? 'Terrain painted'
    : gesture.type === 'paint-structure' ? 'Structure metatiles painted'
    : gesture.type === 'paint-collision' ? 'Collision painted'
      : gesture.type === 'camera' ? 'Camera window moved' : 'Selection moved';
  gesture = null;
  recordHistory(label);
}

canvas.addEventListener('pointerup', finishGesture);
canvas.addEventListener('pointercancel', finishGesture);
canvas.addEventListener('contextmenu', event => event.preventDefault());

canvas.addEventListener('dragover', event => {
  if (event.dataTransfer.types.includes('application/x-badger-asset')) event.preventDefault();
});
canvas.addEventListener('drop', event => {
  event.preventDefault();
  const cell = cellFromClient(event.clientX, event.clientY);
  if (!cell) return;
  try {
    const asset = JSON.parse(event.dataTransfer.getData('application/x-badger-asset'));
    if (asset.kind === 'metatile') {
      paintStructureMetatile(cell, asset.id);
      recordHistory('Structure metatile placed');
    } else if (asset.kind === 'groundStamp') applyGroundStamp(asset.id, cell);
    else if (asset.kind === 'object') addObject(asset.id, cell);
    else addActor(asset.id, cell);
  } catch {
    saveStatus.textContent = 'Unsupported drop data';
  }
});

mapSelect.addEventListener('change', () => {
  project.activeMapId = mapSelect.value;
  history[historyIndex] = draftSnapshot(project);
  selection = null;
  inspectedCell = null;
  placingAsset = null;
  workspace.scrollTo({left: 0, top: 0});
  saveDraft('Map changed');
  buildPalette();
  updateAll();
});

document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.tool)));
document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => {
  paletteTab = button.dataset.palette;
  placingAsset = null;
  buildPalette();
}));
paletteSearch.addEventListener('input', event => {
  paletteQuery = event.currentTarget.value.trim().toLowerCase();
  buildPalette();
});
favoriteFilter.addEventListener('click', () => {
  favoriteOnly = !favoriteOnly;
  favoriteFilter.classList.toggle('active', favoriteOnly);
  favoriteFilter.setAttribute('aria-pressed', String(favoriteOnly));
  favoriteFilter.innerHTML = favoriteOnly ? '&#9733;' : '&#9734;';
  buildPalette();
});
document.querySelector('#paletteExpand').addEventListener('click', () => {
  editorShell.classList.toggle('palette-wide');
  requestRender();
});
document.querySelector('#inspectorToggle').addEventListener('click', () => inspectorPanel.classList.add('mobile-open'));
document.querySelector('#inspectorClose').addEventListener('click', () => inspectorPanel.classList.remove('mobile-open'));
document.querySelector('#undoButton').addEventListener('click', () => restoreHistory(historyIndex - 1));
document.querySelector('#redoButton').addEventListener('click', () => restoreHistory(historyIndex + 1));
document.querySelector('#gridButton').addEventListener('click', event => {
  showGrid = !showGrid; event.currentTarget.classList.toggle('active', showGrid); requestRender();
});
document.querySelector('#collisionButton').addEventListener('click', event => {
  showCollision = !showCollision;
  event.currentTarget.classList.toggle('active', showCollision);
  document.querySelector('#behaviorLegend').hidden = !showCollision;
  requestRender();
});
document.querySelector('#cameraButton').addEventListener('click', event => {
  cameraPreview = !cameraPreview; event.currentTarget.classList.toggle('active', cameraPreview); requestRender();
});
document.querySelector('#zoomOut').addEventListener('click', () => { zoom = clamp(zoom - .25, .5, 2); requestRender(); });
document.querySelector('#zoomIn').addEventListener('click', () => { zoom = clamp(zoom + .25, .5, 2); requestRender(); });
deleteButton.addEventListener('click', deleteSelection);

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.querySelector('#exportButton').addEventListener('click', () => {
  const report = validateProject(project);
  if (!report.valid) {
    saveStatus.textContent = `Export blocked: ${report.errors.length} validation errors`;
    updateValidation();
    return;
  }
  const exportProject = cloneProject(project);
  exportProject.revision += 1;
  exportProject.exportedAt = new Date().toISOString();
  const blob = new Blob([`${JSON.stringify(exportProject, null, 2)}\n`], {type: 'application/json'});
  downloadBlob(blob, `badger-grapple-${project.activeMapId}-map-pack.json`);
  saveStatus.textContent = 'Validated JSON exported';
});

document.querySelector('#pngButton').addEventListener('click', () => {
  renderer.render(renderState(), true);
  canvas.toBlob(blob => {
    if (blob) downloadBlob(blob, `${project.activeMapId}-review.png`);
    requestRender();
    saveStatus.textContent = 'Clean review PNG exported';
  }, 'image/png');
});

document.querySelector('#importButton').addEventListener('click', () => fileInput.click());
document.querySelector('#resetButton').addEventListener('click', () => {
  if (!window.confirm('Reset the local map draft to the current production seed?')) return;
  project = createSeedProject();
  history = [draftSnapshot(project)];
  historyIndex = 0;
  selection = null;
  inspectedCell = null;
  placingAsset = null;
  localStorage.removeItem(STORAGE_KEY);
  saveDraft('Draft reset to production seed');
  buildMapSelect();
  buildPalette();
  updateAll();
});
fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  fileInput.value = '';
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    const report = validateProject(imported);
    if (!report.valid) throw new Error(`${report.errors.length} validation errors`);
    project = imported;
    history = [draftSnapshot(project)];
    historyIndex = 0;
    selection = null;
    inspectedCell = null;
    placingAsset = null;
    saveDraft(`Imported ${file.name}`);
    buildMapSelect();
    buildPalette();
    updateAll();
  } catch (error) {
    saveStatus.textContent = `Import failed: ${error.message}`;
  }
});

window.addEventListener('keydown', event => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    restoreHistory(event.shiftKey ? historyIndex + 1 : historyIndex - 1);
    return;
  }
  if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault(); restoreHistory(historyIndex + 1); return;
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && document.activeElement === canvas) {
    event.preventDefault(); deleteSelection(); return;
  }
  const toolKeys = {h: 'pan', g: 'inspect', v: 'select', i: 'pick', t: 'terrain', f: 'fill', x: 'erase', s: 'structure', c: 'collision', d: 'door', e: 'event'};
  if (document.activeElement === canvas && toolKeys[event.key.toLowerCase()]) setMode(toolKeys[event.key.toLowerCase()]);
});

buildMapSelect();
buildPalette();
setMode(mode);
updateAll();

window.__badgerMapEditorTest = {
  project: () => cloneProject(project),
  placementAt: (x, y) => {
    const assessment = placementAssessmentAt({x, y});
    return assessment ? cloneProject(assessment) : null;
  },
  state: () => {
    const grid = analyzeMapGrid(project, activeMap());
    const assessment = gesture?.type === 'move' ? gesture.assessment : placementAssessmentAt(hoverCell, grid);
    return {
      activeMapId: project.activeMapId,
      mode,
      selection: selection ? {...selection} : null,
      inspectedCell: inspectedCell ? {...inspectedCell} : null,
      showGrid,
      showCollision,
      cameraPreview,
      zoom,
      selectedTerrain,
      selectedMetatile,
      paletteQuery,
      favoriteOnly,
      grid: {
        conflictCount: grid.conflicts.length,
        reachableCount: grid.reachable.size,
        hover: hoverCell ? cloneProject(grid.cellAt(hoverCell.x, hoverCell.y)) : null
      },
      placementAssessment: assessment ? cloneProject(assessment) : null,
      validation: validateProject(project)
    };
  }
};
