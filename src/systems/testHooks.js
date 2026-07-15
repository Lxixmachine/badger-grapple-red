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
      phase: scene.phase ?? null,
      naming: scene.naming ?? null,
      selected: scene.sel ?? scene.nameCursor ?? scene.nameSel ?? null,
      confirmSelected: scene.confirmSel ?? null,
      rivalPage: scene.rivalPage ?? null,
      nameDraft: scene.nameDraft ?? null,
      tab: scene.tab ?? null,
      summaryPage: scene.summaryPage ?? null,
      summaryIndex: scene.summaryIndex ?? null,
      mode: scene.mode ?? null,
      battlePhase: scene.battlePhase ?? null,
      battlePhaseHistory: [...(scene.battlePhaseHistory || [])],
      inputLocked: scene.inputLocked ?? null,
      over: scene.over ?? null,
      resultTitle: scene.resultTitle ?? null,
      area: scene.currentMapId ?? scene.area ?? null,
      tilePos: scene.tilePos ?? null,
      facing: scene.facing ?? null,
      objectIds: scene.map?.objects?.map(object => object.id) ?? null,
      playerScale: scene.player?.scaleX ?? null,
      playerWorldY: scene.player?.y ?? null,
      playerFrame: scene.player?.frame?.name ?? null,
      playerAnimation: scene.player?.anims?.currentAnim?.key ?? null,
      playerAnimationPlaying: scene.player?.anims?.isPlaying ?? null,
      actorIds: scene.actorEntries ? scene.actorEntries.map(e => e.data.id) : null,
      actorStates: scene.actorEntries ? scene.actorEntries.map(e => ({
        id: e.data.id,
        x: e.data.x,
        y: e.data.y,
        facing: e.data.facing,
        moving: Boolean(e.moving),
        animation: e.sprite.anims?.currentAnim?.key || null,
        animationPlaying: Boolean(e.sprite.anims?.isPlaying),
        frame: e.sprite.frame?.name ?? null
      })) : null,
      npcScales: scene.actorEntries ? scene.actorEntries.map(e => e.sprite.scaleX) : scene.npcList ? scene.npcList.map(e => e.npc.scaleX) : null,
      passable: scene.pass && scene.tilePos ? {
        left: scene.pass(scene.tilePos.x - 1, scene.tilePos.y),
        right: scene.pass(scene.tilePos.x + 1, scene.tilePos.y),
        up: scene.pass(scene.tilePos.x, scene.tilePos.y - 1),
        down: scene.pass(scene.tilePos.x, scene.tilePos.y + 1)
      } : null,
      tileRuntimeVersion: scene.bg?.getData?.('campTileRuntime') ?? null,
      messageOpen: scene.messageOpen ?? null,
      message: scene.message ?? null,
      trainerName: scene.trainerName ?? null,
      battleType: scene.type ?? null,
      battle: scene.state&&scene.battleDebugState?scene.battleDebugState():null,
      battleSprites: scene.enemySprite && scene.playerSprite ? {
        enemyTexture: scene.enemySprite.texture?.key ?? null,
        enemyFlipX: Boolean(scene.enemySprite.flipX),
        playerTexture: scene.playerSprite.texture?.key ?? null,
        playerFlipX: Boolean(scene.playerSprite.flipX)
      } : null,
      moveLearning: scene.moveLearn ? {
        wrestlerId: scene.moveLearn.mon?.id ?? null,
        move: scene.moveLearn.move ?? null,
        moves: [...(scene.moveLearn.mon?.moves || [])]
      } : null,
      npcTiles: scene.actorEntries ? scene.actorEntries.map(e => ({x: e.data.x, y: e.data.y})) : scene.npcList ? scene.npcList.map(e => ({x: e.npc.tile?.x ?? null, y: e.npc.tile?.y ?? null})) : null,
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
      } : null,
      slice: scene.sliceVersion ? {
        version: scene.sliceVersion,
        nativeWidth: scene.nativeWidth,
        nativeHeight: scene.nativeHeight,
        cellSize: scene.cellSize,
        cameraTilesWide: scene.cameraTilesWide,
        cameraTilesHigh: scene.cameraTilesHigh,
        mapWidth: scene.mapWidth,
        mapHeight: scene.mapHeight,
        playerDepth: scene.player?.depth ?? null,
        objects: (scene.depthObjects || []).map(object => {
          const definition = object.getData?.('definition');
          return {
            id: definition?.id ?? null,
            depth: object.depth,
            ownerDepth: object.getData?.('ownerDepth') ?? null,
            footprint: definition?.footprint ?? []
          };
        })
      } : null,
      grid: scene.gridContractVersion ? {
        version: scene.gridContractVersion,
        cellSize: scene.cellSize ?? null,
        mapWidth: scene.mapWidth ?? null,
        mapHeight: scene.mapHeight ?? null,
        renderModel: scene.map?.renderModel ?? null,
        authority: scene.gridAuthority ?? null,
        debugVisible: Boolean(scene.gridOverlay?.active)
      } : null,
      atlas: scene.atlasVersion ? {
        version: scene.atlasVersion,
        mode: scene.mode,
        selectedMap: scene.mode === 'region' ? scene.selectedIndex : null,
        mapId: scene.currentMapId ?? null,
        interiorId: scene.currentInteriorId ?? null,
        overlayMode: scene.overlayMode,
        mapWidth: scene.mapWidth ?? null,
        mapHeight: scene.mapHeight ?? null,
        returnDepth: scene.returnStack?.length ?? 0,
        metatileVersion: scene.metatileVersion ?? null,
        metatilePlacementCount: scene.metatilePlacements?.length ?? 0,
        metatileRenderCount: scene.metatileRenderCount ?? 0
      } : null
    };
  };

  window.__badgerTest = {
    activeSceneKeys,
    sceneState,
    press(key) {
      routeVirtualButton(key, 'down');
      if (['up', 'down', 'left', 'right'].includes(key)) routeVirtualButton(key, 'up');
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
    startMenu(data = {}) {
      const parent=game.scene.scenes.find(scene=>scene.scene?.isActive?.()&&scene.scene.key!=='MenuScene');
      parent?.scene?.launch('MenuScene',{parent,...data});
      return activeSceneKeys();
    },
    storage() {
      try {
        return JSON.parse(localStorage.getItem('badger_grapple_red_engine_v2') || 'null');
      } catch {
        return null;
      }
    },
    patchStorage(patch = {}) {
      let current = {};
      try {
        current = JSON.parse(localStorage.getItem('badger_grapple_red_engine_v2') || '{}');
      } catch {}
      const merged = {
        ...current,
        ...patch,
        flags: {...(current.flags || {}), ...(patch.flags || {})},
        keyItems: {...(current.keyItems || {}), ...(patch.keyItems || {})},
        trainersDefeated: {...(current.trainersDefeated || {}), ...(patch.trainersDefeated || {})},
        visitedMaps: {...(current.visitedMaps || {}), ...(patch.visitedMaps || {})}
      };
      localStorage.setItem('badger_grapple_red_engine_v2', JSON.stringify(merged));
      return merged;
    },
    restartOverworld() {
      const scene = game.scene.getScene('OverworldScene');
      if (scene?.scene?.isActive?.()) scene.scene.restart();
      else game.scene.start('OverworldScene');
      return activeSceneKeys();
    },
    clearSave() {
      localStorage.removeItem('badger_grapple_red_engine_v2');
    },
    winBattle() {
      const scene = game.scene.getScene('BattleScene');
      if (!scene?.scene?.isActive?.() || scene.over) return false;
      scene.win();
      return true;
    },
    loseBattle() {
      const scene = game.scene.getScene('BattleScene');
      if (!scene?.scene?.isActive?.() || scene.over) return false;
      scene.state.party.forEach(mon => { mon.hp = 0; });
      scene.lose();
      return true;
    },
    queueMoveLearning(move) {
      const scene = game.scene.getScene('BattleScene');
      const mon = scene?.state?.party?.[0];
      if (!scene?.scene?.isActive?.() || !mon || !move) return false;
      mon.pendingMoves = [move];
      scene.resolvePendingMoves(() => {});
      return true;
    }
  };
}
