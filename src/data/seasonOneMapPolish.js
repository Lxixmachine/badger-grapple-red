const stamp = (id, editorStampId, x, y, width, height, extra = {}) => ({
  id,
  editorStampId,
  x,
  y,
  width,
  height,
  kind: 'decoration',
  ...extra
});

const actor = (id, sheet, x, y, facing, dialogue, extra = {}) => ({
  id,
  sheet,
  x,
  y,
  facing,
  dialogue,
  ...extra
});

const tallGrass = (id, x, y, width, height, extra = {}) => ({
  id,
  tile: 'tall_grass',
  tiles: ['tall_grass', 'tall_grass_b'],
  x,
  y,
  width,
  height,
  ...extra
});

// These placements are the production detail pass over the structural layout
// atlas. Every entry names a grid-native metatile stamp, so Map Studio and the
// live game use the same pixels, collision mask, and row-sliced occlusion.
export const SEASON_ONE_MAP_POLISH = {
  camp_randall: {
    // Camp Randall's production package owns its complete exterior grammar.
    // Keeping this layer empty prevents a second, stale decoration/collision
    // source from drifting away from the authoritative 24x20 layout.
    objects: [],
    actors: [],
    events: []
  },
  r1: {
    objects: [
      stamp('r1_waypoint_tree', 'tree_ornamental', 5, 8, 1, 2)
    ],
    terrain: [
      tallGrass('r1_grass_rex', 3, 7, 3, 3),
      tallGrass('r1_grass_marker', 12, 3, 3, 2),
      tallGrass('r1_grass_gauntlet', 3, 16, 3, 2),
      tallGrass('r1_grass_finish', 13, 18, 3, 2),
      {id: 'r1_flowers_white', tile: 'grass_white_flowers', x: 11, y: 3, width: 1, height: 1},
      {id: 'r1_flowers_cardinal', tile: 'grass_red_flowers', x: 7, y: 12, width: 1, height: 1},
      {id: 'r1_flowers_gold', tile: 'grass_gold_flowers', x: 15, y: 12, width: 1, height: 1}
    ]
  },
  lakeshore_path: {
    terrain: [
      tallGrass('lake_grass_west_north', 5, 5, 3, 2),
      tallGrass('lake_grass_west_south', 6, 7, 2, 2),
      tallGrass('lake_grass_middle_north', 18, 6, 3, 2),
      tallGrass('lake_grass_middle_south', 19, 8, 2, 2),
      tallGrass('lake_grass_first_north', 37, 6, 2, 2),
      tallGrass('lake_grass_first_south', 36, 8, 3, 2),
      {id: 'lake_flowers_white', tile: 'grass_white_flowers', x: 7, y: 5, width: 1, height: 1},
      {id: 'lake_flowers_cardinal', tile: 'grass_red_flowers', x: 46, y: 5, width: 1, height: 1}
    ]
  },
  picnic_point: {
    terrain: [
      tallGrass('picnic_grass_arrival', 39, 8, 3, 2),
      tallGrass('picnic_grass_arrival_tail', 40, 10, 2, 1),
      tallGrass('picnic_grass_first', 28, 8, 3, 2),
      tallGrass('picnic_grass_middle', 18, 8, 3, 2),
      {id: 'picnic_flowers_white', tile: 'grass_white_flowers', x: 36, y: 6, width: 1, height: 1},
      {id: 'picnic_flowers_cardinal', tile: 'grass_red_flowers', x: 8, y: 10, width: 1, height: 1}
    ]
  },
  monona_shore: {
    objects: [
      stamp('monona_rack', 'kayak_rack', 11, 5, 3, 2),
      stamp('monona_dock_0', 'timber_dock', 7, 6, 4, 2),
      stamp('monona_dock_1', 'timber_dock', 7, 9, 4, 2),
      stamp('monona_dock_2', 'timber_dock', 7, 12, 4, 2),
      stamp('monona_dock_3', 'timber_dock', 7, 15, 4, 2),
      stamp('monona_dock_4', 'timber_dock', 7, 18, 4, 2),
      stamp('monona_rock_w', 'rock_cluster', 4, 12, 2, 1),
      stamp('monona_rock_e', 'rock_cluster', 12, 18, 2, 1),
      stamp('monona_sign', 'campus_sign', 11, 4, 3, 2)
    ],
    actors: [
      actor('boat_attendant', 'manager', 4, 6, 'right', 'Voucher checked. The marked channel is safe.'),
      actor('monona_wrestler', 'athlete', 9, 16, 'up', 'Stay balanced through the wake and the scramble.'),
      actor('shore_scout', 'scout', 8, 6, 'up', 'Kohl Center is across the channel to the south.')
    ]
  },
  kohl_center: {
    objects: [
      stamp('kohl_plaza_mat', 'outdoor_wrestling_mat', 4, 5, 3, 2),
      stamp('kohl_plaza_bench', 'wood_bench', 8, 8, 3, 2),
      stamp('kohl_plaza_banner_w', 'banner_pole', 3, 8, 1, 2),
      stamp('kohl_plaza_banner_e', 'banner_pole', 12, 8, 1, 2),
      stamp('kohl_lamp_w', 'campus_lamp', 10, 16, 1, 2),
      stamp('kohl_lamp_e', 'campus_lamp', 29, 16, 1, 2),
      stamp('kohl_bench_w', 'wood_bench', 14, 18, 3, 2),
      stamp('kohl_bench_e', 'wood_bench', 23, 18, 3, 2),
      stamp('kohl_bracket_board', 'tournament_bracket_board', 18, 20, 3, 2),
      stamp('kohl_bike_rack', 'bike_rack', 32, 12, 3, 1),
      stamp('kohl_tree_w', 'tree_ornamental', 7, 19, 1, 2),
      stamp('kohl_tree_e', 'tree_ornamental', 35, 19, 1, 2)
    ],
    actors: [
      actor('conference_official', 'official', 20, 18, 'down', 'Check in here. The bracket is posted inside.'),
      actor('kohl_trainer', 'trainer', 5, 23, 'up', 'Recover before you enter a bracket.'),
      actor('kohl_fan', 'student', 8, 8, 'left', 'Championship Plaza keeps the district human-sized.', {patrol: {axis: 'horizontal', radius: 1, interval: 1450}}),
      actor('bus_manager', 'manager', 28, 18, 'right', 'The team bus returns to Camp Randall after the bracket.')
    ]
  },
  airport: {
    objects: [
      stamp('airport_sign', 'blank_plaque', 6, 0, 2, 1),
      stamp('airport_trash_w', 'trash_can', 0, 6, 1, 1),
      stamp('airport_trash_e', 'trash_can', 14, 6, 1, 1),
      stamp('airport_bollard_w', 'bollard', 5, 6, 1, 2),
      stamp('airport_bollard_e', 'bollard', 9, 6, 1, 2)
    ],
    actors: [
      actor('airport_official', 'official', 7, 3, 'down', 'Boarding opens when all four credentials are verified.'),
      actor('airport_coach', 'coach', 6, 6, 'right', 'Coach: Nationals starts before the first whistle.'),
      actor('airport_captain', 'captain', 8, 6, 'left', 'Captain: Stay with the team through the gate.')
    ]
  },
  st_louis: {
    objects: [
      stamp('stl_lamp_0', 'campus_lamp', 9, 12, 1, 2),
      stamp('stl_lamp_1', 'campus_lamp', 32, 12, 1, 2),
      stamp('stl_lamp_2', 'campus_lamp', 9, 21, 1, 2),
      stamp('stl_lamp_3', 'campus_lamp', 32, 21, 1, 2),
      stamp('stl_banner_w', 'banner_pole', 12, 14, 1, 2),
      stamp('stl_banner_e', 'banner_pole', 29, 14, 1, 2),
      stamp('stl_bench_w', 'wood_bench', 10, 18, 3, 2),
      stamp('stl_bench_e', 'wood_bench', 29, 18, 3, 2),
      stamp('stl_trophy_display', 'championship_trophy_case', 19, 22, 4, 2),
      stamp('stl_bracket_board', 'tournament_bracket_board', 10, 10, 3, 2),
      stamp('stl_tree_w', 'tree_ornamental', 8, 24, 1, 2),
      stamp('stl_tree_e', 'tree_ornamental', 34, 24, 1, 2),
      stamp('stl_planter_0', 'flower_planter', 13, 21, 2, 1),
      stamp('stl_planter_1', 'flower_planter', 27, 21, 2, 1)
    ],
    actors: [
      actor('stl_trainer', 'trainer', 5, 25, 'up', "The Trainer's Room is west of the arena district."),
      actor('stl_fan', 'student', 31, 10, 'up', 'The Arch passage opens after the final.', {patrol: {axis: 'horizontal', radius: 2, interval: 1350}})
    ]
  },
  coach_office: {
    actors: [
      actor('coach_office_review', 'coach', 5, 4, 'down', 'Coach: Show me what the season has taught you.', {condition: {flag: 'lockerUnlocked'}})
    ]
  },
  trainer_room: {
    objects: [
      stamp('trainer_waiting_bench', 'wood_bench', 1, 7, 3, 2),
      stamp('trainer_floor_medallion', 'trainer_floor_inlay', 6, 6, 3, 3, {walkable: true})
    ],
    actors: [
      actor('trainer_attendant', 'trainer', 7, 4, 'down', 'Full Condition and Stamina before you leave.'),
      actor('trainer_locker_attendant', 'manager', 4, 5, 'up', 'The team locker connects to every Trainer\'s Room.')
    ]
  },
  buckys_locker_room: {
    objects: [],
    actors: [
      actor('buckys_clerk', 'manager', 7, 4, 'down', 'Bucky\'s Locker Room carries road-tested equipment.')
    ]
  },
  field_house_floor: {
    actors: [
      actor('field_opener_inside', 'wrestler', 7, 6, 'down', 'The Opener: Win the first position and keep it.'),
      actor('field_floor_official', 'official', 4, 9, 'right', 'The Field House credential is decided on the center mat.'),
      actor('field_floor_regular', 'athlete', 10, 9, 'left', 'Pressure looks different when the stands are close.')
    ]
  },
  capitol_interior: {
    actors: [
      actor('capitol_booster_inside', 'manager', 3, 5, 'right', 'The voucher opens the water route.'),
      actor('senator_inside', 'official', 7, 9, 'down', 'The Senator: Control the center and the room follows.')
    ]
  },
  brittingham_boats: {
    actors: [
      actor('boat_attendant_inside', 'manager', 5, 4, 'down', 'Voucher checked. Stay in the marked channel.')
    ]
  },
  kohl_bracket_floor: {
    actors: [
      actor('kohl_round_one_inside', 'athlete', 6, 6, 'down', 'Quarterfinalist: Every point gets harder from here.'),
      actor('kohl_round_two_inside', 'wrestler', 7, 6, 'down', 'Semifinalist: Survive the whole bracket.'),
      actor('kohl_anchor_inside', 'captain', 8, 6, 'down', 'The Anchor: Nobody moves me twice.')
    ]
  },
  nationals_floor: {
    objects: [
      stamp('nationals_trophy_art', 'championship_trophy_case', 10, 2, 4, 2)
    ],
    actors: [
      actor('nationals_round_one_inside', 'athlete', 6, 6, 'down', 'Qualifier: Nationals starts before the final.'),
      actor('nationals_closer_inside', 'wrestler', 7, 6, 'down', 'The Closer: I only need one opening.'),
      actor('nationals_rex_inside', 'rex', 8, 6, 'down', 'Rex: We finish this where everybody can see it.')
    ]
  }
};

export function mapPolish(mapId) {
  return SEASON_ONE_MAP_POLISH[mapId] || {objects: [], actors: [], events: []};
}
