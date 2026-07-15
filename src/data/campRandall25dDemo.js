export const CAMP_DEMO_GRID = 32;
export const CAMP_DEMO_ORIGIN = 16;
export const CAMP_DEMO_WIDTH = 48;
export const CAMP_DEMO_HEIGHT = 31;
export const CAMP_DEMO_WORLD_WIDTH = 1536;
export const CAMP_DEMO_WORLD_HEIGHT = 992;

export const campDemoCellKey = (x, y) => `${x},${y}`;

function addRect(cells, left, top, right, bottom) {
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) cells.add(campDemoCellKey(x, y));
  }
}

function createWalkableCells() {
  const cells = new Set();

  // The art is continuous. These cells are only the invisible navigation contract.
  addRect(cells, 23, 11, 24, 30); // South arrival and main promenade.
  addRect(cells, 22, 11, 25, 14); // Stadium forecourt.
  addRect(cells, 9, 19, 38, 19); // East-west campus walk.
  addRect(cells, 9, 19, 11, 21); // Team Building forecourt.
  addRect(cells, 36, 19, 38, 21); // Coach's Office forecourt.
  addRect(cells, 9, 21, 38, 24); // Open lower campus lawn.

  // Poles and clipped shrubs occupy feet-space while their upper art remains visual.
  [
    [18, 23], [19, 22], [19, 23], [20, 23],
    [27, 23], [28, 22], [28, 23], [29, 23]
  ].forEach(([x, y]) => cells.delete(campDemoCellKey(x, y)));

  return cells;
}

export const CAMP_DEMO_WALKABLE = createWalkableCells();

export const CAMP_DEMO_DOORS = [
  {
    id: 'stadium',
    name: 'CAMP RANDALL STADIUM',
    approaches: [{x: 23, y: 11, facing: 'up'}, {x: 24, y: 11, facing: 'up'}],
    message: 'CAMP RANDALL STADIUM\nThe championship tunnel waits beyond the arch.'
  },
  {
    id: 'team-building',
    name: 'TEAM BUILDING',
    approaches: [{x: 10, y: 19, facing: 'up'}],
    message: 'TEAM BUILDING\nLocker Room / Wrestling Room'
  },
  {
    id: 'coach-office',
    name: "COACH'S OFFICE",
    approaches: [{x: 36, y: 19, facing: 'up'}, {x: 37, y: 19, facing: 'up'}],
    message: "COACH'S OFFICE\nCoach is reviewing the opening-day lineup."
  }
];

export const CAMP_DEMO_ACTORS = [
  {
    id: 'assistant-coach',
    texture: 'coach',
    x: 24,
    y: 17,
    facing: 'down',
    dialogue: 'Assistant Coach: The main walk connects every place the team needs.'
  },
  {
    id: 'captain',
    texture: 'captain',
    x: 14,
    y: 22,
    facing: 'right',
    patrol: {axis: 'horizontal', radius: 2, interval: 1450},
    dialogue: 'Captain: Practice is through the west doors. Coach works across the quad.'
  },
  {
    id: 'student',
    texture: 'student',
    x: 12,
    y: 24,
    facing: 'right',
    patrol: {axis: 'horizontal', radius: 2, interval: 1750},
    dialogue: 'Student: The stadium arch is visible from the moment you arrive.'
  },
  {
    id: 'athlete',
    texture: 'athlete',
    x: 33,
    y: 23,
    facing: 'left',
    patrol: {axis: 'horizontal', radius: 2, interval: 1600},
    dialogue: 'Athlete: The paths read first. The landscaping fills in the campus around them.'
  }
];

export const CAMP_DEMO_OCCLUDERS = [
  {
    id: 'stadium-entry',
    texture: 'camp-demo-occluder-stadium',
    x: 352,
    y: 64,
    depth: 369
  },
  {
    id: 'team-entry',
    texture: 'camp-demo-occluder-team',
    x: 160,
    y: 432,
    depth: 625
  },
  {
    id: 'office-entry',
    texture: 'camp-demo-occluder-office',
    x: 1024,
    y: 432,
    depth: 625
  }
];

export const CAMP_DEMO_CAMERA_ZONES = [
  {
    id: 'stadium-reveal',
    label: 'CAMP RANDALL STADIUM',
    bounds: {left: 22, top: 11, right: 25, bottom: 14},
    target: {x: 768, y: 300},
    zoom: 1.08
  },
  {
    id: 'team-building-reveal',
    label: 'TEAM BUILDING',
    bounds: {left: 9, top: 19, right: 13, bottom: 22},
    target: {x: 336, y: 520},
    zoom: 1.04
  },
  {
    id: 'coach-office-reveal',
    label: "COACH'S OFFICE",
    bounds: {left: 34, top: 19, right: 38, bottom: 22},
    target: {x: 1184, y: 520},
    zoom: 1.04
  }
];

export const CAMP_DEMO_SPAWN = {x: 23, y: 30, facing: 'up'};

export function campDemoWorldPosition(x, y) {
  return {
    x: CAMP_DEMO_ORIGIN + x * CAMP_DEMO_GRID,
    y: CAMP_DEMO_ORIGIN + y * CAMP_DEMO_GRID
  };
}

export function campDemoZoneAt(x, y) {
  return CAMP_DEMO_CAMERA_ZONES.find(zone => x >= zone.bounds.left && x <= zone.bounds.right
    && y >= zone.bounds.top && y <= zone.bounds.bottom) || null;
}
