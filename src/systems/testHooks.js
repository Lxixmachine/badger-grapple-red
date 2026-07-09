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
      page: scene.page ?? null,
      naming: scene.naming ?? null,
      selected: scene.sel ?? scene.nameSel ?? null,
      mode: scene.mode ?? null,
      inputLocked: scene.inputLocked ?? null,
      over: scene.over ?? null,
      resultTitle: scene.resultTitle ?? null,
      area: scene.area ?? null,
      tilePos: scene.tilePos ?? null,
      messageOpen: scene.messageOpen ?? null,
      message: scene.message ?? null
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
    storage() {
      try {
        return JSON.parse(localStorage.getItem('badger_grapple_red_engine_v2') || 'null');
      } catch {
        return null;
      }
    },
    clearSave() {
      localStorage.removeItem('badger_grapple_red_engine_v2');
    }
  };
}
