const LEGACY_WIDTH = 320;
const LEGACY_HEIGHT = 224;
const LEGACY_TEXT_RESOLUTION = 2;

function installTextSharpening(scene) {
  if (scene.__legacyTextSharpening) return;
  const sharpen = () => {
    scene.children?.list?.forEach(child => {
      if (child?.type === 'Text' && (child.style?.resolution || 1) < LEGACY_TEXT_RESOLUTION) {
        child.setResolution(LEGACY_TEXT_RESOLUTION);
      }
    });
  };
  scene.__legacyTextSharpening = sharpen;
  scene.events.on('postupdate', sharpen);
  scene.events.once('shutdown', () => {
    scene.events.off('postupdate', sharpen);
    delete scene.__legacyTextSharpening;
  });
  sharpen();
}

// Older menu and battle scenes still author their UI in the original logical
// resolution. Fit that stage inside the 480x320 world without stretching it.
export function fitLegacyViewport(scene) {
  const scale = Math.min(scene.scale.width / LEGACY_WIDTH, scene.scale.height / LEGACY_HEIGHT);
  const width = Math.round(LEGACY_WIDTH * scale);
  const height = Math.round(LEGACY_HEIGHT * scale);
  const x = Math.floor((scene.scale.width - width) / 2);
  const y = Math.floor((scene.scale.height - height) / 2);
  scene.cameras.main.setViewport(x, y, width, height);
  scene.cameras.main.setZoom(scale);
  scene.cameras.main.centerOn(LEGACY_WIDTH / 2, LEGACY_HEIGHT / 2);
  installTextSharpening(scene);
}
