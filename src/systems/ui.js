const Phaser = window.Phaser;
export function uiBox(scene,x,y,w,h){
  const g=scene.add.graphics();
  g.fillStyle(0x000000,.42);g.fillRoundedRect(x+3,y+3,w,h,4);
  g.fillStyle(0xfff6dc,1);g.fillRoundedRect(x,y,w,h,4);
  g.lineStyle(2,0x101010,1);g.strokeRoundedRect(x,y,w,h,4);
  g.lineStyle(1,0xffffff,.7);g.strokeRoundedRect(x+2,y+2,w-4,h-4,3);
  g.lineStyle(1,0xa58d65,1);g.strokeRoundedRect(x+4,y+4,w-8,h-8,2);
  g.lineStyle(1,0xd8c194,.55);g.lineBetween(x+6,y+h-6,x+w-6,y+h-6);
  return g;
}
export function hpBar(scene,x,y,w,h,p,color=0x55b867){const g=scene.add.graphics();g.fillStyle(0x151515,1);g.fillRect(x-1,y-1,w+2,h+2);g.fillStyle(0x323232,1);g.fillRect(x,y,w,h);const clamped=Phaser.Math.Clamp(p,0,1);const c=clamped<.22?0xd84c35:clamped<.5?0xd6b545:color;g.fillStyle(c,1);g.fillRect(x,y,Math.max(1,w*clamped),h);g.fillStyle(0xffffff,.28);g.fillRect(x,y,Math.max(1,w*clamped),1);g.lineStyle(1,0x111111,1);g.strokeRect(x-1,y-1,w+2,h+2);return g;}
export function setVirtualHandler(scene){window.__fallbackControlScene=scene;}
export const FONT='monospace';
