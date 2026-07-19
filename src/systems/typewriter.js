export function beginTypewriter(scene, {text, delay, onUpdate, onComplete}) {
  const fullText = String(text || '');
  let index = 0;
  onUpdate?.('');
  if (!fullText) {
    onComplete?.();
    return null;
  }
  return scene.time.addEvent({
    delay: Math.max(1, Math.round(Number(delay) || 1)),
    repeat: Math.max(0, fullText.length - 1),
    callback: () => {
      index += 1;
      onUpdate?.(fullText.slice(0, index));
      if (index >= fullText.length) onComplete?.();
    }
  });
}

export function stopTypewriter(timer) {
  timer?.remove?.(false);
}
