import {NATIVE_HEIGHT,NATIVE_WIDTH} from './nativeViewport.js';

const TEXT_SCALE = 1.45;

function numeric(value) {
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function scaleFont(value) {
  const parsed = numeric(value);
  if (parsed === null) return value;
  const scaled = Math.max(10, Math.round(parsed * TEXT_SCALE));
  return typeof value === 'string' ? `${scaled}px` : scaled;
}

// Project an older coordinate layout onto the native canvas while creating
// every vector and text object at its final integer size. No camera or object
// scale is involved, so UI pixels stay aligned with the framebuffer.
export function installNativeLayoutGrid(scene, logicalWidth=320, logicalHeight=224) {
  if (scene.add.__nativeLayoutGrid) return;
  const sx = NATIVE_WIDTH / logicalWidth;
  const sy = NATIVE_HEIGHT / logicalHeight;
  const sr = (sx + sy) / 2;
  const x = value => Math.round(value * sx);
  const y = value => Math.round(value * sy);
  const w = value => Math.max(1, Math.round(value * sx));
  const h = value => Math.max(1, Math.round(value * sy));
  const radius = value => Math.max(1, Math.round(value * sr));
  const add = scene.add;
  const original = {
    text: add.text.bind(add),
    graphics: add.graphics.bind(add),
    image: add.image.bind(add),
    line: add.line.bind(add),
    circle: add.circle.bind(add)
  };

  add.text = (px,py,content,style={}) => {
    const projected = {...style, fontSize: scaleFont(style.fontSize)};
    if (style.lineSpacing !== undefined) projected.lineSpacing = h(style.lineSpacing);
    if (style.strokeThickness !== undefined) projected.strokeThickness = radius(style.strokeThickness);
    if (style.wordWrap) projected.wordWrap = {...style.wordWrap, width: w(style.wordWrap.width)};
    if (style.fixedWidth !== undefined) projected.fixedWidth = w(style.fixedWidth);
    if (style.fixedHeight !== undefined) projected.fixedHeight = h(style.fixedHeight);
    return original.text(x(px), y(py), content, projected);
  };
  add.image = (px,py,...args) => original.image(x(px), y(py), ...args);
  add.line = (px,py,x1,y1,x2,y2,...args) => original.line(x(px), y(py), x(x1), y(y1), x(x2), y(y2), ...args);
  add.circle = (px,py,r,...args) => original.circle(x(px), y(py), radius(r), ...args);
  add.graphics = (...args) => {
    const graphics = original.graphics(...args);
    const wrap = (method,map) => {
      const call = graphics[method].bind(graphics);
      graphics[method] = (...values) => { call(...map(values)); return graphics; };
    };
    wrap('lineStyle',values => [radius(values[0]),...values.slice(1)]);
    for (const method of ['fillRect','strokeRect']) wrap(method,values => [x(values[0]),y(values[1]),w(values[2]),h(values[3]),...values.slice(4)]);
    for (const method of ['fillRoundedRect','strokeRoundedRect']) wrap(method,values => [x(values[0]),y(values[1]),w(values[2]),h(values[3]),radius(values[4]||1),...values.slice(5)]);
    wrap('lineBetween',values => [x(values[0]),y(values[1]),x(values[2]),y(values[3]),...values.slice(4)]);
    for (const method of ['fillCircle','strokeCircle']) wrap(method,values => [x(values[0]),y(values[1]),radius(values[2]),...values.slice(3)]);
    wrap('fillTriangle',values => [x(values[0]),y(values[1]),x(values[2]),y(values[3]),x(values[4]),y(values[5]),...values.slice(6)]);
    return graphics;
  };
  add.__nativeLayoutGrid = true;
}
