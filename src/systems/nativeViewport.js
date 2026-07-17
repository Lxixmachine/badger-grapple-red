export const NATIVE_WIDTH = 480;
export const NATIVE_HEIGHT = 320;

export function useNativeViewport(scene) {
  const camera = scene.cameras.main;
  camera.setViewport(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);
  camera.setZoom(1);
  camera.centerOn(NATIVE_WIDTH / 2, NATIVE_HEIGHT / 2);
  camera.setRoundPixels(true);
}
