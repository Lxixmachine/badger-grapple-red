export const WORLD_META = {
  version: '21.10',
  tileSize: 16,
  width: 28,
  height: 14,
  source: 'code-data',
  nextPipeline: 'tiled-json'
};

export const AREAS = {
  fieldhouse: { name: 'FIELD HOUSE', bg: 'area_fieldhouse', start: { x: 14, y: 11 }, exits: [{ x: 14, y: 1, to: 'campus', tx: 14, ty: 12, msg: 'You step out onto campus.' }], encounters: false },
  campus: {
    name: 'CAMPUS QUAD',
    bg: 'area_campus',
    start: { x: 14, y: 12 },
    exits: [
      { x: 14, y: 13, to: 'fieldhouse', tx: 14, ty: 2, msg: 'Back inside the Field House.' },
      { x: 23, y: 3, to: 'studyhall', tx: 5, ty: 10, msg: 'Study Hall.' },
      { x: 27, y: 7, to: 'lakeshore', tx: 1, ty: 7, msg: 'Lakeshore path.' },
      { x: 1, y: 7, to: 'downtown', tx: 26, ty: 7, msg: 'Downtown Madison.' },
      { x: 14, y: 1, to: 'conference', tx: 14, ty: 12, msg: 'Conference Arena.' },
      { x: 9, y: 3, to: 'shop', tx: 14, ty: 10, msg: 'Team Shop.' },
      { x: 18, y: 3, to: 'recovery', tx: 14, ty: 10, msg: 'Recovery Center.' }
    ],
    encounters: true
  },
  studyhall: { name: 'STUDY HALL', bg: 'area_fieldhouse', start: { x: 5, y: 10 }, exits: [{ x: 5, y: 11, to: 'campus', tx: 23, ty: 3, msg: 'Campus Quad.' }], encounters: false },
  shop: {
    name: 'TEAM SHOP',
    bg: 'area_shop',
    start: { x: 14, y: 10 },
    exits: [
      { x: 13, y: 12, to: 'campus', tx: 9, ty: 4, msg: 'Campus Quad.' },
      { x: 14, y: 12, to: 'campus', tx: 9, ty: 4, msg: 'Campus Quad.' },
      { x: 15, y: 12, to: 'campus', tx: 9, ty: 4, msg: 'Campus Quad.' }
    ],
    encounters: false
  },
  recovery: {
    name: 'RECOVERY CENTER',
    bg: 'area_recovery',
    start: { x: 14, y: 10 },
    exits: [
      { x: 13, y: 12, to: 'campus', tx: 18, ty: 4, msg: 'Campus Quad.' },
      { x: 14, y: 12, to: 'campus', tx: 18, ty: 4, msg: 'Campus Quad.' },
      { x: 15, y: 12, to: 'campus', tx: 18, ty: 4, msg: 'Campus Quad.' }
    ],
    encounters: false
  },
  lakeshore: {
    name: 'LAKESHORE',
    bg: 'area_lakeshore',
    start: { x: 1, y: 7 },
    exits: [
      { x: 0, y: 7, to: 'campus', tx: 26, ty: 7, msg: 'Campus Quad.' },
      { x: 27, y: 9, to: 'river', tx: 1, ty: 9, msg: 'River Trail.' }
    ],
    encounters: true
  },
  downtown: { name: 'DOWNTOWN', bg: 'area_downtown', start: { x: 26, y: 7 }, exits: [{ x: 27, y: 7, to: 'campus', tx: 1, ty: 7, msg: 'Campus Quad.' }], encounters: false },
  river: {
    name: 'RIVER TRAIL',
    bg: 'area_river',
    start: { x: 1, y: 9 },
    exits: [
      { x: 0, y: 9, to: 'lakeshore', tx: 26, ty: 9, msg: 'Lakeshore.' },
      { x: 27, y: 6, to: 'championship', tx: 1, ty: 6, msg: 'Championship Hall.', gate: ['Neutral Badge', 'Scramble Badge'] }
    ],
    encounters: true,
    captain: { x: 24, y: 9, id: 'scrambleboss', lvl: 14, type: 'gym', badge: 'Scramble Badge', team: [['funklord', 13], ['scrambleboss', 14]], reward: { grit: 26, rep: 16 }, intro: 'The Funk Doctor: Solve the scramble or get solved.', beaten: 'The Funk Doctor: Scramble Badge earned. The river road to Championship is open.' }
  },
  conference: {
    name: 'CONFERENCE ARENA',
    bg: 'area_conference',
    start: { x: 14, y: 12 },
    exits: [{ x: 14, y: 13, to: 'campus', tx: 14, ty: 2, msg: 'Campus Quad.' }],
    captain: { x: 14, y: 5, id: 'captainneutral', lvl: 8, type: 'gym', badge: 'Neutral Badge', team: [['drillpartner', 7], ['captainneutral', 8]], reward: { grit: 22, rep: 14 }, intro: 'Captain Neutral: Show me you can win one real varsity dual.', beaten: 'Captain Neutral: Neutral Badge earned. Lakeshore and the River Trail are open.' }
  },
  championship: {
    name: 'CHAMPIONSHIP HALL',
    bg: 'area_championship',
    start: { x: 1, y: 6 },
    exits: [{ x: 0, y: 6, to: 'river', tx: 26, ty: 6, msg: 'River Trail.' }],
    captain: { x: 19, y: 6, id: 'topboss', lvl: 17, type: 'gym', badge: 'Top Badge', team: [['lockthrow', 15], ['rideking', 16], ['topboss', 17]], reward: { grit: 34, rep: 26 }, intro: 'The Anchor: Everyone who walks in here gets ridden. Prove me wrong.', beaten: 'The Anchor: Top Badge earned. The Big Ten Championship desk is open - win the bracket and this hall hangs your banner.' }
  }
};

export const TRAINERS = {
  campus_recruit: { id: 'campus_recruit', look: 'red', area: 'campus', name: 'Buckshot', pos: { x: 22, y: 9 }, facing: 'left', sightRange: 5, team: [['drillpartner', 6], ['pacesetter', 6]], reward: { grit: 9, rep: 8 }, line: 'Buckshot: Want to test yourself? Two matches, back to back.', beaten: 'Buckshot: Good matches. Come back stronger.', spot: "Buckshot: Hey - you! Let's go!" },
  campus_rival: { id: 'campus_rival', look: 'purple', area: 'campus', name: 'Rex', pos: { x: 17, y: 5 }, facing: 'down', sightRange: 5, team: [['lakechain', 7], ['fieldflyer', 7]], reward: { grit: 12, rep: 10 }, line: 'Rex: Build your lineup all you want. I still want that dual meet. Right now.', beaten: 'Rex: Fine. You earned that one. Next time I bring a real team.', spot: 'Rex: There you are. No walking away this time.' },
  // v21.11 route trainers - level curve sits between Badge 1 (Lv8) and Badge 3 (Lv17)
  lakeshore_marina: { id: 'lakeshore_marina', look: 'green', area: 'lakeshore', name: 'Marina', pos: { x: 16, y: 9 }, facing: 'left', sightRange: 4, team: [['riverroller', 9], ['lakechain', 9]], reward: { grit: 10, rep: 8 }, line: 'Marina: I run the shoreline every morning. Show me your conditioning.', beaten: 'Marina: Good pace. The river crowd wrestles harder - be ready.', spot: 'Marina: You there! Nobody crosses the shore without a match.' },
  lakeshore_sandy: { id: 'lakeshore_sandy', look: 'gold', area: 'lakeshore', name: 'Sandy', pos: { x: 20, y: 11 }, facing: 'up', sightRange: 4, team: [['whizzkid', 10]], reward: { grit: 9, rep: 7 }, line: 'Sandy: Try to score on my whizzer. Everyone tries.', beaten: 'Sandy: First one to score on him all season. Respect.', spot: 'Sandy: Hold up! My guy needs a live opponent.' },
  downtown_deion: { id: 'downtown_deion', look: 'purple', area: 'downtown', name: 'Deion', pos: { x: 12, y: 5 }, facing: 'down', sightRange: 3, team: [['lockthrow', 10], ['drillveteran', 11]], reward: { grit: 13, rep: 11 }, line: 'Deion: The downtown crowd loves a big throw. Give them a show.', beaten: 'Deion: The crowd is yours. For now.', spot: 'Deion: A wrestler on Main Street? The show starts NOW.' },
  river_gus: { id: 'river_gus', look: 'red', area: 'river', name: 'Gus', pos: { x: 5, y: 4 }, facing: 'down', sightRange: 4, team: [['pacecommand', 13]], reward: { grit: 12, rep: 9 }, line: 'Gus: Third period is where matches are won. Prove you have a tank.', beaten: 'Gus: You outlasted the Commander. That says plenty.', spot: 'Gus: Fresh legs in my grass? Time to empty the tank.' },
  river_tavi: { id: 'river_tavi', look: 'gray', area: 'river', name: 'Tavi', pos: { x: 22, y: 8 }, facing: 'left', sightRange: 4, team: [['funkflyer', 12], ['riverroller', 12]], reward: { grit: 14, rep: 10 }, line: 'Tavi: The Funk Doctor taught me everything. Well - almost everything.', beaten: 'Tavi: You scramble clean. The Doctor is just up the path. Good luck.', spot: 'Tavi: Heading for the Doctor? You roll through me first.' }
};

// v21.12 Big Ten Championship - the endgame bracket in Championship Hall.
// Unlocks with all three gym badges. Round 2 pays off Rex's promised dual meet.
export const TOURNAMENT = {
  name: 'BIG TEN CHAMPIONSHIP',
  desk: { area: 'championship', x: 10, y: 6 },
  requires: ['Neutral Badge', 'Scramble Badge', 'Top Badge'],
  rounds: [
    { key: 'quarterfinal', label: 'QUARTERFINAL', trainerName: 'Iron Ivan', team: [['matgeneral', 17], ['lockthrow', 18]], reward: { grit: 20, rep: 14 }, intro: 'Iron Ivan: Quarterfinal. I have pinned everyone in my bracket. You are next.', win: 'Iron Ivan is out of the bracket. Semifinal is set: Rex finally gets his dual meet.' },
    { key: 'semifinal', label: 'SEMIFINAL', trainerName: 'Rex', team: [['chainmaster', 18], ['funkflyer', 18], ['drillveteran', 19]], reward: { grit: 24, rep: 18 }, intro: 'Rex: I told you I would bring a real team. This is the dual meet you owe me. Big Ten semifinal - no walking away.', win: 'Rex: ...That was the match I wanted. You earned the final. Go take it.' },
    { key: 'final', label: 'BIG TEN FINAL', trainerName: 'The Prodigy', team: [['tilttech', 20], ['pacecommand', 20], ['buckallam', 21]], reward: { grit: 40, rep: 32 }, intro: 'The Prodigy: Big Ten final. Undefeated since sixth grade. Nobody remembers second place.', win: 'BIG TEN CHAMPION! The whole hall is on its feet. Your banner goes up in Championship Hall.' }
  ]
};
