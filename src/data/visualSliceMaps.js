export const SLICE_CELL = 32;
export const SLICE_NATIVE_WIDTH = 480;
export const SLICE_NATIVE_HEIGHT = 320;
export const SLICE_CAMERA_COLS = SLICE_NATIVE_WIDTH / SLICE_CELL;
export const SLICE_CAMERA_ROWS = SLICE_NATIVE_HEIGHT / SLICE_CELL;

const boundary = (width, height, openings = []) => {
  const open = new Set(openings.map(([x, y]) => `${x},${y}`));
  const cells = [];
  for (let x = 0; x < width; x += 1) {
    if (!open.has(`${x},0`)) cells.push([x, 0]);
    if (!open.has(`${x},${height - 1}`)) cells.push([x, height - 1]);
  }
  for (let y = 1; y < height - 1; y += 1) {
    if (!open.has(`0,${y}`)) cells.push([0, y]);
    if (!open.has(`${width - 1},${y}`)) cells.push([width - 1, y]);
  }
  return cells;
};

const rectCells = (x, y, width, height, openings = []) => {
  const open = new Set(openings.map(([openX, openY]) => `${openX},${openY}`));
  const cells = [];
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      if (!open.has(`${col},${row}`)) cells.push([col, row]);
    }
  }
  return cells;
};

const exteriorObjects = [
  {
    id: 'west-pine-cluster',
    kind: 'pineCluster',
    x: 1,
    baseY: 6,
    width: 2,
    footprint: [[1, 6], [2, 6]]
  },
  {
    id: 'east-pine-cluster',
    kind: 'pineCluster',
    x: 18,
    baseY: 7,
    width: 2,
    footprint: [[18, 7], [19, 7]]
  },
  {
    id: 'southwest-pine-cluster',
    kind: 'pineCluster',
    x: 2,
    baseY: 13,
    width: 2,
    footprint: [[2, 13], [3, 13]]
  },
  {
    id: 'southeast-pine-cluster',
    kind: 'pineCluster',
    x: 18,
    baseY: 13,
    width: 2,
    footprint: [[18, 13], [19, 13]]
  },
  {
    id: 'campus-bench',
    kind: 'bench',
    x: 3,
    baseY: 9,
    width: 2,
    footprint: [[3, 9], [4, 9]]
  },
  {
    id: 'field-house-sign',
    kind: 'sign',
    x: 17,
    baseY: 9,
    width: 1,
    footprint: [[17, 9]],
    message: 'FIELD HOUSE  |  BADGER WRESTLING'
  }
];

const interiorObjects = [
  {
    id: 'trophy-case',
    kind: 'trophyCase',
    x: 6,
    baseY: 3,
    width: 3,
    footprint: [[6, 3], [7, 3], [8, 3]],
    message: 'The center shelf is empty. It is waiting for a championship trophy.'
  },
  {
    id: 'west-bench',
    kind: 'lockerBench',
    x: 2,
    baseY: 6,
    width: 3,
    footprint: [[2, 6], [3, 6], [4, 6]]
  },
  {
    id: 'east-bench',
    kind: 'lockerBench',
    x: 10,
    baseY: 6,
    width: 3,
    footprint: [[10, 6], [11, 6], [12, 6]]
  }
];

const exteriorBlocked = [
  ...boundary(22, 16),
  ...rectCells(6, 1, 9, 5, [[10, 5]]),
  ...rectCells(6, 6, 3, 1),
  ...rectCells(12, 6, 3, 1),
  ...exteriorObjects.flatMap(object => object.footprint)
];

const interiorBlocked = [
  ...boundary(15, 10, [[7, 9]]),
  ...rectCells(1, 1, 4, 2),
  ...rectCells(10, 1, 4, 2),
  ...interiorObjects.flatMap(object => object.footprint),
  [7, 5]
];

export const VISUAL_SLICE_MAPS = {
  exterior: {
    id: 'camp_randall_scale_slice',
    label: 'CAMP RANDALL',
    kind: 'exterior',
    width: 22,
    height: 16,
    spawn: {x: 10, y: 7, facing: 'up'},
    building: {
      x: 6,
      y: 1,
      width: 9,
      height: 5,
      door: {x: 10, y: 5},
      landing: {x: 9, y: 6, width: 3, height: 1},
      path: {centerX: 10.5, y: 7, width: 2, height: 9}
    },
    blocked: exteriorBlocked,
    objects: exteriorObjects,
    actors: [
      {id: 'assistant-coach', kind: 'coach', x: 14, y: 9, facing: 'left'}
    ],
    warps: [
      {x: 10, y: 5, to: 'teamRoom', spawn: {x: 7, y: 8, facing: 'up'}}
    ]
  },
  teamRoom: {
    id: 'team_locker_room_scale_slice',
    label: 'TEAM LOCKER ROOM',
    kind: 'interior',
    width: 15,
    height: 10,
    spawn: {x: 7, y: 8, facing: 'up'},
    blocked: interiorBlocked,
    objects: interiorObjects,
    actors: [
      {id: 'head-coach', kind: 'coach', x: 7, y: 5, facing: 'down'}
    ],
    warps: [
      {x: 7, y: 9, to: 'exterior', spawn: {x: 10, y: 6, facing: 'down'}}
    ]
  }
};

export function visualSliceMap(id) {
  return VISUAL_SLICE_MAPS[id] || VISUAL_SLICE_MAPS.exterior;
}
