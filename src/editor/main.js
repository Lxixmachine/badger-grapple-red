import {cloneProject, createSeedProject, PROJECT_SCHEMA, TERRAIN, validateProject} from './project.js';
import {MapRenderer} from './renderer.js';

const STORAGE_KEY = 'badger-grapple-map-studio-v2-metatiles';
const canvas = document.querySelector('#mapCanvas');
const workspace = document.querySelector('#workspace');
const mapSelect = document.querySelector('#mapSelect');
const paletteContent = document.querySelector('#paletteContent');
const inspectorContent = document.querySelector('#inspectorContent');
const validationContent = document.querySelector('#validationContent');
const validationCount = document.querySelector('#validationCount');
const deleteButton = document.querySelector('#deleteButton');
const cellReadout = document.querySelector('#cellReadout');
const modeReadout = document.querySelector('#modeReadout');
const mapStatus = document.querySelector('#mapStatus');
const saveStatus = document.querySelector('#saveStatus');
const zoomValue = document.querySelector('#zoomValue');
const fileInput = document.querySelector('#fileInput');

let project = loadDraft();
let mode = window.matchMedia('(pointer: coarse)').matches ? 'pan' : 'select';
let paletteTab = 'terrain';
let selectedTerrain = 'brick';
let selectedMetatile = null;
let selectedMetatileFamily = 'team_building';
let placingAsset = null;
let selection = null;
let hoverCell = null;
let showGrid = true;
let showCollision = false;
let cameraPreview = false;
let zoom = 1;
let gesture = null;
let renderFrame = 0;
let history = [JSON.stringify(project)];
let historyIndex = 0;

const renderer = new MapRenderer(canvas, requestRender);

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.schema === PROJECT_SCHEMA) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createSeedProject();
}

function activeMap() {
  return project.maps[project.activeMapId];
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
  return {
    project,
    map: activeMap(),
    mode,
    selection,
    hoverCell,
    showGrid,
    showCollision,
    cameraPreview,
    camera: currentCamera(),
    selectedTerrain,
    selectedMetatile
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  saveStatus.textContent = label;
}

function recordHistory(label) {
  const snapshot = JSON.stringify(project);
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
  project = JSON.parse(history[historyIndex]);
  if (!project.maps[project.activeMapId]) project.activeMapId = Object.keys(project.maps)[0];
  selection = previousSelection;
  if (selection && !selectedEntry()) selection = null;
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
  return value === 'pan' ? 'grab' : value === 'select' || value === 'event' ? 'default' : 'crosshair';
}

function buildMapSelect() {
  mapSelect.innerHTML = Object.values(project.maps)
    .map(map => `<option value="${escapeHtml(map.id)}">${escapeHtml(map.name)}</option>`)
    .join('');
  mapSelect.value = project.activeMapId;
}

function setMode(nextMode) {
  mode = nextMode;
  if (nextMode !== 'select') placingAsset = null;
  document.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === mode));
  modeReadout.textContent = mode[0].toUpperCase() + mode.slice(1);
  canvas.style.cursor = cursorForMode();
  requestRender();
}

function metatileThumb(tile) {
  const cell = tile.cellSize;
  const sourceX = (tile.visual % tile.atlasColumns) * cell;
  const sourceY = Math.floor(tile.visual / tile.atlasColumns) * cell;
  return `<div class="palette-thumb metatile-preview"><span style="width:${cell}px;height:${cell}px;background-image:url('${tile.atlasPath}');background-position:-${sourceX}px -${sourceY}px"></span></div>`;
}

function buildPalette() {
  document.querySelectorAll('[data-palette]').forEach(button => button.classList.toggle('active', button.dataset.palette === paletteTab));
  if (paletteTab === 'terrain') {
    const map = activeMap();
    const terrainEntries = Object.entries(TERRAIN).filter(([id]) => activeMap().type === 'exterior' ? id !== 'floor' : id === 'floor');
    const allStructureTiles = map.renderModel === 'metatile'
      ? (project.assets.metatiles || []).filter(tile => tile.palette)
      : [];
    const structureFamilies = [...new Set(allStructureTiles.map(tile => tile.families?.[0]).filter(Boolean))];
    if (!structureFamilies.includes(selectedMetatileFamily)) {
      selectedMetatileFamily = structureFamilies.includes('team_building') ? 'team_building' : structureFamilies[0] || '';
    }
    const structureTiles = allStructureTiles.filter(tile => tile.families?.[0] === selectedMetatileFamily);
    paletteContent.innerHTML = `<div class="palette-section-title">Ground brushes</div><div class="palette-grid">${terrainEntries.map(([id, terrain]) => `
      <div class="palette-item terrain-item ${selectedTerrain === id ? 'active' : ''}" data-terrain="${id}" role="button" tabindex="0">
        <div class="terrain-swatch ${id}"></div><span>${escapeHtml(terrain.label)}</span>
      </div>`).join('')}</div>${structureTiles.length ? `
        <div class="palette-section-title structure-title">Structure metatiles</div>
        <label class="metatile-family"><span>Family</span><select id="metatileFamily">${structureFamilies.map(family => `
          <option value="${family}" ${family === selectedMetatileFamily ? 'selected' : ''}>${escapeHtml(family.replaceAll('_', ' '))}</option>`).join('')}</select></label>
        <div class="palette-grid metatile-grid">${structureTiles.map(tile => `
          <div class="palette-item metatile-item ${selectedMetatile === tile.id ? 'active' : ''}" draggable="true" data-metatile="${tile.id}" role="button" tabindex="0" title="${escapeHtml(tile.names?.[0] || tile.id)}">
            ${metatileThumb(tile)}<span class="visually-hidden">${escapeHtml(tile.names?.[0] || tile.id)}</span>
          </div>`).join('')}</div>` : ''}`;
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
    return;
  }

  const map = activeMap();
  const assets = paletteTab === 'objects'
    ? project.assets.objects.filter(asset => asset.mapType === map.type)
    : project.assets.actors;
  paletteContent.innerHTML = `<div class="palette-grid">${assets.map(asset => {
    const active = placingAsset?.id === asset.id ? 'active' : '';
    const thumb = paletteTab === 'actors'
      ? `<div class="palette-thumb"><span class="actor-thumb" style="width:32px;height:60px;background-image:url('${asset.path}');background-position:-32px 0;background-repeat:no-repeat"></span></div>`
      : `<div class="palette-thumb"><img src="${asset.path}" alt="" /></div>`;
    return `<div class="palette-item ${active}" draggable="true" data-asset="${escapeHtml(asset.id)}" data-asset-kind="${paletteTab === 'actors' ? 'actor' : 'object'}" role="button" tabindex="0">${thumb}<span>${escapeHtml(asset.name)}</span></div>`;
  }).join('')}</div>`;
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

function selectedEntry() {
  if (!selection) return null;
  const map = activeMap();
  if (selection.kind === 'object') return map.objects.find(entry => entry.id === selection.id) || null;
  if (selection.kind === 'actor') return map.actors.find(entry => entry.id === selection.id) || null;
  return map.events.find(entry => entry.id === selection.id) || null;
}

function updateInspector() {
  const map = activeMap();
  const entry = selectedEntry();
  deleteButton.disabled = !entry;
  if (!entry) {
    inspectorContent.innerHTML = `
      <div class="field-group">
        <label class="field-label"><span>Name</span><span class="read-only-value">${escapeHtml(map.name)}</span></label>
        <label class="field-label"><span>Type</span><span class="read-only-value">${escapeHtml(map.type)}</span></label>
        <label class="field-label"><span>Size</span><span class="read-only-value">${map.width} x ${map.height}</span></label>
        <label class="field-label"><span>Objects</span><span class="read-only-value">${map.objects.length}</span></label>
        <label class="field-label"><span>Actors</span><span class="read-only-value">${map.actors.length}</span></label>
        <label class="field-label"><span>Events</span><span class="read-only-value">${map.events.length}</span></label>
      </div>`;
    return;
  }
  if (selection.kind === 'object') updateObjectInspector(entry);
  else if (selection.kind === 'actor') updateActorInspector(entry);
  else updateEventInspector(entry);
}

function coordinateFields(entry) {
  return `<div class="coordinate-row">
    <label class="field-label"><span>X</span><input type="number" data-field="x" value="${entry.x}" /></label>
    <label class="field-label"><span>Y</span><input type="number" data-field="y" value="${entry.y}" /></label>
  </div>`;
}

function updateObjectInspector(object) {
  inspectorContent.innerHTML = `
    <div class="field-group">
      <label class="field-label"><span>ID</span><span class="read-only-value">${escapeHtml(object.id)}</span></label>
      <label class="field-label"><span>Name</span><input data-field="name" value="${escapeHtml(object.name)}" /></label>
      ${coordinateFields(object)}
      <label class="field-label"><span>Footprint</span><span class="read-only-value">${object.width} x ${object.height} locked</span></label>
      <label class="field-label"><span>Depth</span><select data-field="depthMode"><option value="row-sliced" ${object.depthMode === 'row-sliced' ? 'selected' : ''}>Row sliced</option><option value="flat" ${object.depthMode === 'flat' ? 'selected' : ''}>Flat object</option></select></label>
      <label class="field-label"><span>Destination</span><span class="read-only-value">${escapeHtml(object.interior || 'None')}</span></label>
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
    </div>`;
  bindInspectorFields('event', eventEntry);
}

function bindInspectorFields(kind, entry) {
  inspectorContent.querySelectorAll('[data-field]').forEach(input => input.addEventListener('change', () => {
    const field = input.dataset.field;
    let value = input.type === 'checkbox' ? input.checked : input.value;
    if (input.type === 'number') value = value === '' ? null : Number(value);
    if (field === 'x' || field === 'y') {
      const map = activeMap();
      const extent = kind === 'object' ? (field === 'x' ? entry.width : entry.height) : 1;
      value = clamp(Math.round(value || 0), 0, (field === 'x' ? map.width : map.height) - extent);
    }
    if (field === 'condition' && value === '') value = null;
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
  validationContent.innerHTML = `<div class="validation-list">${report.errors.map(message => `<div class="validation-item">${escapeHtml(message)}</div>`).join('')}${report.warnings.map(message => `<div class="validation-item warning">${escapeHtml(message)}</div>`).join('')}</div>`;
}

function updateAll() {
  const map = activeMap();
  mapStatus.textContent = `${map.width} x ${map.height} cells`;
  updateHistoryButtons();
  updateInspector();
  updateValidation();
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
  activeMap().terrain[cell.y][cell.x] = material;
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
}

function toggleCollisionCell(object, localX, localY, marker = null) {
  if (localX < 0 || localY < 0 || localX >= object.width || localY >= object.height) return;
  if (object.door?.x === localX && object.door?.y === localY) return;
  const next = marker || (object.collisionMask[localY][localX] === '#' ? '.' : '#');
  setMaskMarker(object, localX, localY, next);
  const tileId = object.metatiles?.[localY]?.[localX];
  if (tileId) object.metatiles[localY][localX] = behaviorVariant(tileId, next === '#' ? 'solid' : 'walkable');
}

function addObject(assetId, cell) {
  const map = activeMap();
  const asset = project.assets.objects.find(entry => entry.id === assetId);
  if (!asset) return;
  const object = {
    id: uniqueId(asset.sourceId, map.objects),
    assetId: asset.id,
    name: asset.name,
    x: clamp(cell.x, 0, map.width - asset.width),
    y: clamp(cell.y, 0, map.height - asset.height),
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

function duplicateSelection() {
  const entry = selectedEntry();
  if (!entry || selection.kind === 'event') return;
  const map = activeMap();
  const collection = selection.kind === 'object' ? map.objects : map.actors;
  const copy = cloneProject(entry);
  copy.id = uniqueId(entry.id, collection);
  copy.x = clamp(entry.x + 1, 0, map.width - (entry.width || 1));
  copy.y = clamp(entry.y + 1, 0, map.height - (entry.height || 1));
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
    offsetY: cell.y - entry.y
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
  gesture.entry.x = clamp(cell.x - gesture.offsetX, 0, map.width - extentX);
  gesture.entry.y = clamp(cell.y - gesture.offsetY, 0, map.height - extentY);
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
  canvas.focus();
  if (placingAsset) {
    if (placingAsset.kind === 'object') addObject(placingAsset.id, cell);
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
      if (object.door) {
        const previous = object.door;
        const previousId = object.metatiles?.[previous.y]?.[previous.x];
        if (previousId) object.metatiles[previous.y][previous.x] = behaviorVariant(previousId, 'walkable');
      }
      setMaskMarker(object, localX, localY, '.');
      object.door = {x: localX, y: localY};
      const tileId = object.metatiles?.[localY]?.[localX];
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
  if (gesture && cell) moveGesture(cell);
  requestRender();
});

canvas.addEventListener('pointerleave', () => {
  if (!gesture) {
    hoverCell = null;
    cellReadout.textContent = 'Cell --,--';
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
    } else if (asset.kind === 'object') addObject(asset.id, cell);
    else addActor(asset.id, cell);
  } catch {
    saveStatus.textContent = 'Unsupported drop data';
  }
});

mapSelect.addEventListener('change', () => {
  project.activeMapId = mapSelect.value;
  history[historyIndex] = JSON.stringify(project);
  selection = null;
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
document.querySelector('#undoButton').addEventListener('click', () => restoreHistory(historyIndex - 1));
document.querySelector('#redoButton').addEventListener('click', () => restoreHistory(historyIndex + 1));
document.querySelector('#gridButton').addEventListener('click', event => {
  showGrid = !showGrid; event.currentTarget.classList.toggle('active', showGrid); requestRender();
});
document.querySelector('#collisionButton').addEventListener('click', event => {
  showCollision = !showCollision; event.currentTarget.classList.toggle('active', showCollision); requestRender();
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
  history = [JSON.stringify(project)];
  historyIndex = 0;
  selection = null;
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
    history = [JSON.stringify(project)];
    historyIndex = 0;
    selection = null;
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
  const toolKeys = {h: 'pan', v: 'select', t: 'terrain', s: 'structure', c: 'collision', d: 'door', e: 'event'};
  if (document.activeElement === canvas && toolKeys[event.key.toLowerCase()]) setMode(toolKeys[event.key.toLowerCase()]);
});

buildMapSelect();
buildPalette();
setMode(mode);
updateAll();

window.__badgerMapEditorTest = {
  project: () => cloneProject(project),
  state: () => ({
    activeMapId: project.activeMapId,
    mode,
    selection: selection ? {...selection} : null,
    showGrid,
    showCollision,
    cameraPreview,
    zoom,
    validation: validateProject(project)
  })
};
