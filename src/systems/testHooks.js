export function installTestHooks(game, routeVirtualButton) {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('test')) return;
  if (params.has('reset')) localStorage.removeItem('badger_grapple_red_engine_v2');

  const activeSceneKeys = () => game.scene.scenes
    .filter(scene => scene.scene?.isActive?.())
    .map(scene => scene.scene.key);

  const sceneState = key => {
    const scene = game.scene.getScene(key);
    if (!scene) return null;
    return {
      active: scene.scene?.isActive?.() || false,
      visible: scene.scene?.isVisible?.() || false,
      id: scene.id ?? null,
      lvl: scene.lvl ?? null,
      page: scene.page ?? null,
      naming: scene.naming ?? null,
      selected: scene.sel ?? scene.nameSel ?? null,
      mode: scene.mode ?? null,
      inputLocked: scene.inputLocked ?? null,
      over: scene.over ?? null,
      resultTitle: scene.resultTitle ?? null,
      area: scene.area ?? null,
      tilePos: scene.tilePos ?? null,
      playerScale: scene.player?.scaleX ?? null,
      npcScales: scene.npcList ? scene.npcList.map(e => e.npc.scaleX) : null,
      passable: scene.pass && scene.tilePos ? {
        left: scene.pass(scene.tilePos.x - 1, scene.tilePos.y),
        right: scene.pass(scene.tilePos.x + 1, scene.tilePos.y),
        up: scene.pass(scene.tilePos.x, scene.tilePos.y - 1),
        down: scene.pass(scene.tilePos.x, scene.tilePos.y + 1)
      } : null,
      messageOpen: scene.messageOpen ?? null,
      message: scene.message ?? null,
      trainerName: scene.trainerName ?? null,
      npcTiles: scene.npcList ? scene.npcList.map(e => ({x: e.npc.tile?.x ?? null, y: e.npc.tile?.y ?? null})) : null,
      layered: scene.layeredMapVersion ? {
        version: scene.layeredMapVersion,
        upperCount: scene.upperObjects?.length || 0,
        directActorDepth: Array.isArray(scene.actors),
        upperDepths: (scene.upperObjects || []).map(obj => obj.depth),
        upperTextures: (scene.upperObjects || []).map(obj => obj.texture?.key || null)
      } : null,
      camera: scene.worldCamera && scene.uiCamera ? {
        count: scene.cameras.cameras.length,
        worldZoom: scene.worldCamera.zoom,
        uiZoom: scene.uiCamera.zoom,
        worldTilesWide: scene.worldCamera.width / scene.worldCamera.zoom / 16,
        worldTilesHigh: scene.worldCamera.height / scene.worldCamera.zoom / 16,
        worldIgnoresUi: (scene.uiLayer.cameraFilter & scene.worldCamera.id) !== 0,
        uiIgnoresWorld: (scene.worldLayer.cameraFilter & scene.uiCamera.id) !== 0
      } : null
    };
  };

  window.__badgerTest = {
    activeSceneKeys,
    sceneState,
    press(key) {
      routeVirtualButton(key);
      return activeSceneKeys();
    },
    startBattle(data = {}) {
      game.scene.start('BattleScene', data);
      return activeSceneKeys();
    },
    startScout(data = {}) {
      game.scene.start('ScoutScene', data);
      return activeSceneKeys();
    },
    storage() {
      try {
        return JSON.parse(localStorage.getItem('badger_grapple_red_engine_v2') || 'null');
      } catch {
        return null;
      }
    },
    clearSave() {
      localStorage.removeItem('badger_grapple_red_engine_v2');
    },
    winBattle() {
      const scene = game.scene.getScene('BattleScene');
      if (!scene?.scene?.isActive?.() || scene.over) return false;
      scene.win();
      return true;
    }
  };
}
