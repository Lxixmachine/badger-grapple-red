export const GAME_W = 320;
export const GAME_H = 224;
export const LEGACY_W = 240;
export const LEGACY_H = 170;
export const LEGACY_ZOOM = GAME_W / LEGACY_W;

export function useLegacyLayout(scene) {
  scene.cameras.main.setZoom(LEGACY_ZOOM);
  scene.cameras.main.setScroll(0, 0);
}
