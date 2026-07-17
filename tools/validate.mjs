import {ROSTER,STARTERS,PERSONAS} from '../src/data/roster.js';
import {MOVES} from '../src/data/moves.js';
import {AREAS,TRAINERS,TOURNAMENT,WORLD_META,TILE,areaDimensions,isBlocked,worldPlane,WILD_SLOTS,WILD_SLOT_CHANCES} from '../src/data/maps.js';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {LAYERED_MAPS,LAYERED_MAP_VERSION} from '../src/data/layeredMaps.js';
import {CAMP_TILE_RUNTIME_VERSION,campTilemap,campRuntimeStats,campRuntimeTile} from '../src/data/campRandallTilemaps.js';
import {validateSeasonOneLayouts} from './validate_region_layouts.mjs';
import {NPC_LOOKS} from '../src/data/npcLooks.js';

let errs=[];
const fileHash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const inBounds=(area,x,y)=>{const {width,height}=areaDimensions(area);return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<width&&y>=0&&y<height;};

for(const look of NPC_LOOKS){
  const sprite=fileURLToPath(new URL(`../public/assets/sprites/npc_${look}_walk.png`,import.meta.url));
  if(!existsSync(sprite)){errs.push(`semantic NPC sheet '${look}' is missing`);continue;}
  const bytes=readFileSync(sprite);
  if(bytes.length<24||bytes.readUInt32BE(16)!==72||bytes.readUInt32BE(20)!==144)errs.push(`semantic NPC sheet '${look}' must be exactly 72x144`);
}

for(const sourceUrl of [
  new URL('../art/imagegen/camp_randall_object_manifest.json',import.meta.url),
  new URL('../art/imagegen/world_composition_manifest.json',import.meta.url)
]){
  const source=JSON.parse(readFileSync(sourceUrl,'utf8'));
  for(const [areaId,area] of Object.entries(source.areas||{})){
    (area.npcs||[]).forEach((npc,index)=>{
      if(npc.look&&!NPC_LOOKS.includes(npc.look))errs.push(`${sourceUrl.pathname.split('/').pop()} area ${areaId}: npc ${index} look '${npc.look}' is not semantic`);
    });
  }
}

// The Season One design graph is the authority for what the world is becoming.
// The current runtime graph remains playable legacy data while maps are rebuilt.
const seasonRegionPath=fileURLToPath(new URL('../src/data/seasonOneRegion.json',import.meta.url));
const seasonRegion=JSON.parse(readFileSync(seasonRegionPath,'utf8'));
const seasonLayoutsPath=fileURLToPath(new URL('../src/data/seasonOneLayouts.json',import.meta.url));
const seasonLayouts=JSON.parse(readFileSync(seasonLayoutsPath,'utf8'));
if(seasonRegion.schemaVersion!==2)errs.push('Season One region schema version is unsupported');
if(seasonRegion.status!=='design-authority')errs.push('Season One region must be marked design-authority');
if(seasonRegion.layoutRevision!==seasonLayouts.revision)errs.push('Season One region and layout revision must match');
if(seasonRegion.tileSize!==32)errs.push('Season One region must use the approved 32px gameplay cell');
if(seasonRegion.camera?.outdoorTilesWide!==15||seasonRegion.camera?.outdoorTilesHigh!==10||seasonRegion.camera?.canvasWidth!==480||seasonRegion.camera?.canvasHeight!==320||seasonRegion.camera?.defaultWorldZoom!==1)errs.push('Season One outdoor camera contract must remain 15x10 cells at native 480x320');
errs.push(...validateSeasonOneLayouts(seasonRegion,seasonLayouts));
const productionBuildPath=fileURLToPath(new URL('../src/data/campRandallProductionBuild.json',import.meta.url));
const productionManifestPath=fileURLToPath(new URL('../art/imagegen/camp_randall_production_manifest.json',import.meta.url));
if(!existsSync(productionBuildPath))errs.push('Camp production build is missing; run npm run build:camp-production');
else{
  const production=JSON.parse(readFileSync(productionBuildPath,'utf8'));
  const productionManifest=JSON.parse(readFileSync(productionManifestPath,'utf8'));
  const hashFile=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
  if(production.version!==3||production.status!=='logical-grid-actor-production-pilot')errs.push('Camp production build version/status is unsupported');
  if(production.layoutRevision!==seasonLayouts.revision||production.cellSize!==seasonLayouts.contract.cellSize)errs.push('Camp production build diverges from the Season One layout contract');
  if(production.minimumBlockedCellCoverage!==productionManifest.minimumBlockedCellCoverage)errs.push('Camp production visual-coverage threshold diverges from its manifest');
  const actorContract=production.actorPixelContract||{};
  if(actorContract.logicalFrameWidth!==16||actorContract.logicalFrameHeight!==32||actorContract.bodyHeightMax!==24||actorContract.renderScale!==2||actorContract.maxOpaqueColors!==15||actorContract.binaryAlpha!==true||actorContract.sharedFootBaseline!==true)errs.push('Camp production actors must use the 16x32 logical-grid, exact-2x pixel contract');
  const actorPreview=production.actorPixelPreview||{};
  const actorPreviewPath=fileURLToPath(new URL(`../${actorPreview.path||''}`,import.meta.url));
  if(!actorPreview.path||!existsSync(actorPreviewPath)||actorPreview.sha256!==hashFile(actorPreviewPath))errs.push('Camp production actor pixel preview is missing or stale');
  if(production.sources?.manifest!==hashFile(productionManifestPath))errs.push('Camp production manifest is stale; run npm run build:camp-production');
  if(production.sources?.layout!==hashFile(seasonLayoutsPath))errs.push('Camp production layout is stale; run npm run build:camp-production');
  for(const [sourceId,relative] of Object.entries(productionManifest.sourceAssets||{})){
    const source=fileURLToPath(new URL(`../${relative}`,import.meta.url));
    if(!existsSync(source)||production.sources?.[sourceId]!==hashFile(source))errs.push(`Camp production source ${sourceId} is stale; run npm run build:camp-production`);
  }
  for(const [filename,expected] of Object.entries(production.outputs||{})){
    const output=fileURLToPath(new URL(`../public/assets/camp-production/${filename}`,import.meta.url));
    if(!existsSync(output)||hashFile(output)!==expected)errs.push(`Camp production output ${filename} is stale; run npm run build:camp-production`);
  }
  const packages=[production.map,...Object.values(production.interiors||{})];
  for(const entry of packages)for(const object of entry.objects||[]){
    if(object.audit?.minimumCoverage<production.minimumBlockedCellCoverage)errs.push(`Camp production object ${object.id} fails visible collision coverage`);
  }
  for(const [actorId,sheet] of Object.entries(production.actorSheets||{})){
    const output=fileURLToPath(new URL(`../public/${sheet.path.replace(/^\.\//,'')}`,import.meta.url));
    if(sheet.frameWidth!==32||sheet.frameHeight!==64||!existsSync(output))errs.push(`Camp production actor ${actorId} is missing or not 32x64 framed`);
    if(sheet.logicalFrameWidth!==16||sheet.logicalFrameHeight!==32||sheet.renderScale!==2)errs.push(`Camp production actor ${actorId} diverges from the logical-grid export contract`);
    if(!Array.isArray(sheet.palette)||sheet.palette.length===0||sheet.palette.length>15)errs.push(`Camp production actor ${actorId} exceeds the shared GBA-style palette budget`);
    const pixel=sheet.pixelMetrics||{};
    if(pixel.opaqueColorCount>15||pixel.partialAlphaPixelCount!==0||pixel.exactRenderScaleBlockCoverage!==1||pixel.frameVisibleSizes?.length!==12)errs.push(`Camp production actor ${actorId} fails exact pixel-discipline metrics`);
    for(const size of pixel.frameVisibleSizes||[]){
      if(size.width<20||size.width>32||size.height<2||size.height>48||size.width%2||size.height%2)errs.push(`Camp production actor ${actorId} has an invalid logical-frame silhouette`);
    }
  }
}
const campMetatileBuildPath=fileURLToPath(new URL('../src/data/campRandallMetatileBuild.json',import.meta.url));
const campMetatileOverridesPath=fileURLToPath(new URL('../art/metatiles/camp_randall_metatile_overrides.json',import.meta.url));
const worldTilesetBuildPath=fileURLToPath(new URL('../src/data/seasonOneWorldTilesetBuild.json',import.meta.url));
const worldTilesetManifestPath=fileURLToPath(new URL('../art/tilesets/season_one_world_tileset_manifest.json',import.meta.url));
const worldTilesetContractPath=fileURLToPath(new URL('../art/tilesets/season_one_tileset_contract.json',import.meta.url));
const preparedImagegenManifestPath=fileURLToPath(new URL('../art/tilesets/imagegen_v3/source_manifest.json',import.meta.url));
if(!existsSync(worldTilesetBuildPath))errs.push('Season One world tileset is missing; run npm run build:world-tileset');
else{
  const world=JSON.parse(readFileSync(worldTilesetBuildPath,'utf8'));
  const manifest=JSON.parse(readFileSync(worldTilesetManifestPath,'utf8'));
  const contract=JSON.parse(readFileSync(worldTilesetContractPath,'utf8'));
  if(world.schema!=='badger-grapple-world-tileset/v5'||world.version!==12||world.cellSize!==32)errs.push('Season One world tileset schema/version/cell size is unsupported');
  if(manifest.schema!=='badger-grapple-world-tileset-manifest/v2'||manifest.version!==2||manifest.logicalCellSize!==16||manifest.renderScale!==2)errs.push('Season One world tileset manifest must use the authored 16px/2x pipeline');
  if(contract.version!==5||contract.logicalCellSize!==16||contract.renderScale!==2||contract.rules?.imagegenSourceRequired!==true||contract.rules?.sceneCropStretching!==false||contract.rules?.quietGroundPalette!==true||contract.rules?.cardinalGroundReserved!==true)errs.push('Season One tileset contract does not enforce the Imagegen logical-grid pipeline');
  if(world.artPipeline?.logicalCellSize!==16||world.artPipeline?.renderScale!==2||world.artPipeline?.resampling!=='nearest'||world.artPipeline?.pixelPerfect!==true)errs.push('Season One world tileset is not an exact nearest-neighbor logical-grid export');
  if(world.artPipeline?.materialDiscipline?.profileVersion!==1||world.artPipeline?.materialDiscipline?.maxColorsPerMaterial!==4||world.artPipeline?.materialDiscipline?.assetCount<115||world.artPipeline?.materialDiscipline?.outputPartialAlphaPixelCount!==0||world.artPipeline?.materialDiscipline?.paletteViolationCount!==0)errs.push('Season One world tileset does not enforce material-specific pixel discipline');
  if(world.sources?.manifest!==fileHash(worldTilesetManifestPath))errs.push('Season One world tileset manifest is stale');
  if(!existsSync(worldTilesetContractPath)||world.sources?.contract!==fileHash(worldTilesetContractPath)||world.contract?.sha256!==fileHash(worldTilesetContractPath))errs.push('Season One world tileset contract is missing or stale');
  if(!existsSync(preparedImagegenManifestPath)||world.sources?.preparedImagegenManifest!==fileHash(preparedImagegenManifestPath))errs.push('Prepared Imagegen source manifest is missing or stale');
  else{
    const prepared=JSON.parse(readFileSync(preparedImagegenManifestPath,'utf8'));
    const discipline=prepared.materialDiscipline||{};
    const profilePath=fileURLToPath(new URL(`../${discipline.profilePath||''}`,import.meta.url));
    if(prepared.schema!=='badger-grapple-imagegen-tileset-sources/v2'||prepared.version!==4||Object.keys(prepared.assets||{}).length<115||world.sources?.preparedImagegenAssetCount!==Object.keys(prepared.assets||{}).length)errs.push('Prepared Imagegen source coverage is incomplete');
    if(discipline.profileVersion!==1||discipline.maxColorsPerMaterial!==4||discipline.disciplinedAssetCount!==Object.keys(prepared.assets||{}).length||!existsSync(profilePath)||discipline.profileSha256!==fileHash(profilePath)||world.sources?.materialProfile!==discipline.profileSha256)errs.push('Prepared Imagegen material profile is missing or stale');
    for(const asset of Object.values(prepared.assets||{})){
      const source=fileURLToPath(new URL(`../${asset.path}`,import.meta.url));
      if(!existsSync(source)||fileHash(source)!==asset.sha256)errs.push(`Prepared Imagegen asset ${asset.path} is missing or stale`);
      const pixel=asset.materialDiscipline||{};
      if(!Array.isArray(pixel.materials)||pixel.materials.length===0||!pixel.materialColorCounts||pixel.maxColorsPerMaterial>4||pixel.outputPartialAlphaPixelCount!==0||pixel.paletteViolationCount!==0)errs.push(`Prepared Imagegen asset ${asset.path} violates material pixel discipline`);
      for(const count of Object.values(pixel.materialColorCounts||{}))if(count<1||count>4)errs.push(`Prepared Imagegen asset ${asset.path} exceeds a four-color material ramp`);
    }
  }
  for(const [sourceId,relative] of Object.entries(manifest.referenceSources||{})){
    const source=fileURLToPath(new URL(`../${relative}`,import.meta.url));
    if(!existsSync(source)||world.sources?.referenceBoards?.[sourceId]!==fileHash(source))errs.push(`Season One Imagegen source board ${sourceId} is stale`);
  }
  const atlasPath=fileURLToPath(new URL(`../public/${world.atlas.path.replace(/^\.\//,'')}`,import.meta.url));
  if(!existsSync(atlasPath)||fileHash(atlasPath)!==world.atlas.sha256)errs.push('Season One world tileset atlas is missing or stale');
  const catalog=world.terrain?.catalog||[];
  const tileIds=new Set(catalog.map(tile=>tile.id));
  if(catalog.length<500||tileIds.size!==catalog.length)errs.push('Season One world ground catalog must contain at least 500 unique explicit tiles');
  for(const required of ['grass','mowed_grass','meadow_grass','brick','stone','concrete','dirt','sand','gravel','water','asphalt','timber','brick_path_cross','concrete_path_cross','timber_path_cross','surface_brick_blob_n_e_s_w_ne_se_sw_nw','shore_water_blob_n_e_s_w_ne_se_sw_nw','crosswalk_ns'])if(!tileIds.has(required))errs.push(`Season One world ground catalog is missing ${required}`);
  for(const tile of catalog){
    if(!['walkable','water'].includes(tile.behavior)||tile.coverage!=='full')errs.push(`Season One ground tile ${tile.id} must be full-cell with a supported behavior`);
    if(world.terrain.tiles?.[tile.id]!==tile.visual||!Number.isInteger(tile.visual)||tile.visual<0||tile.visual>=world.atlas.visualCount)errs.push(`Season One ground tile ${tile.id} references an invalid visual`);
    if(world.terrain.behaviors?.[tile.id]!==tile.behavior)errs.push(`Season One ground tile ${tile.id} behavior index is stale`);
  }
  for(const tile of catalog.filter(tile=>tile.id==='water'||tile.family==='shore_water'||tile.family==='water'))if(tile.behavior!=='water')errs.push(`Season One water tile ${tile.id} must block ordinary walking`);
  if(world.coverage?.contractSatisfied!==true||world.coverage?.blobSignatureCount!==47||world.coverage?.preparedImagegenAssetCount<115||world.coverage?.logicalCellSize!==16)errs.push('Season One world tileset does not satisfy the complete authored vocabulary contract');
  if(world.coverage?.pixelDiscipline?.version!==4||world.coverage?.pixelDiscipline?.assetCount<115||world.coverage?.pixelDiscipline?.maxColorsPerMaterial!==4||world.coverage?.pixelDiscipline?.outputPartialAlphaPixelCount!==0||world.coverage?.pixelDiscipline?.paletteViolationCount!==0)errs.push('Season One world tileset material-discipline coverage is incomplete');
  const groundMetrics=world.coverage?.groundMaterialMetrics||{};
  const groundValueContract=world.coverage?.groundValueContract||{};
  if(!groundMetrics.grass||groundMetrics.grass.uniqueColors!==2||groundMetrics.grass.dominantCoverage<0.94||groundMetrics.grass.meanLightness<0.62||groundMetrics.grass.meanLightness>0.70||groundMetrics.grass.meanSaturation>0.42||groundMetrics.grass.cardinalPixelCount!==0)errs.push('Season One grass violates the high-key two-color quiet-ground contract');
  if(!groundMetrics.grassB||groundMetrics.grassB.uniqueColors!==2||groundMetrics.grassB.dominantCoverage<=groundMetrics.grass.dominantCoverage||groundMetrics.grassB.meanLightness<groundMetrics.grass.meanLightness||groundMetrics.grassB.cardinalPixelCount!==0)errs.push('Season One sparse grass B violates the explicit quiet-ground variant contract');
  if(!groundMetrics.grassC||groundMetrics.grassC.uniqueColors!==2||groundMetrics.grassC.dominantCoverage<=groundMetrics.grassB?.dominantCoverage||groundMetrics.grassC.meanLightness<groundMetrics.grassB?.meanLightness||groundMetrics.grassC.cardinalPixelCount!==0)errs.push('Season One sparse grass C violates the explicit quiet-ground variant contract');
  if(!groundMetrics.mowedGrass||groundMetrics.mowedGrass.uniqueColors>3||groundMetrics.mowedGrass.meanLightness<0.60||groundMetrics.mowedGrass.meanSaturation>0.42||groundMetrics.mowedGrass.cardinalPixelCount!==0)errs.push('Season One maintained lawn violates the quiet-ground contract');
  if(!groundMetrics.campusPavers||groundMetrics.campusPavers.uniqueColors>3||groundMetrics.campusPavers.meanLightness<0.78||groundMetrics.campusPavers.meanSaturation>0.40||groundMetrics.campusPavers.cardinalPixelCount!==0)errs.push('Season One campus pavers violate the pale neutral-limestone contract');
  if(groundValueContract.grass?.meanLightnessMin!==0.62||groundValueContract.mowedGrass?.meanLightnessMin!==0.60||groundValueContract.campusPavers?.meanSaturationMax!==0.40)errs.push('Season One ground value thresholds are missing or stale');
  for(const family of ['surface_dirt','surface_brick','surface_stone','surface_sand','surface_gravel','surface_concrete','surface_timber','shore_water','road_asphalt_grass','road_asphalt_curb','lawn_mowed']){
    if((world.coverage?.groundFamilyCounts?.[family]||0)<47)errs.push(`Season One world transition family ${family} is incomplete`);
  }
  for(const required of ['tree_oak_a','tree_pine','forest_mass_core','forest_border_west_long','hedge_corner_nw','fence_long','wood_bench','roof_red_gable','door_red','awning_cardinal','trainer_room_exterior','buckys_locker_room_exterior','cliff_run','cliff_stairs','lakeshore_pier','terrace_chair_trio','lakeshore_boathouse','picnic_fire_circle','trail_sign','shoreline_cluster'])if(!world.stamps?.[required])errs.push(`Season One world stamp library is missing ${required}`);
  for(const required of ['field_house_arena_exterior','kohl_arena_exterior','nationals_arena_exterior','bascom_hall_exterior','wisconsin_capitol_exterior','brittingham_boats_exterior','bascom_lincoln_statue','bascom_memorial_balustrade','bascom_stair_landing','bascom_history_marker'])if(!world.stamps?.[required])errs.push(`Season One landmark stamp library is missing ${required}`);
  for(const required of ['equipment_annex_exterior','campus_housing_exterior','bookstore_row_exterior','theater_marquee_exterior','food_cart_row_exterior','capitol_hotel_exterior','civic_offices_exterior','transit_hotel_exterior','team_hotel_exterior','riverfront_hotel_exterior','state_facade_11x5','state_facade_10x3','state_facade_13x5','state_facade_8x5','state_facade_8x4','state_facade_10x5','state_facade_5x5','city_edge_horizontal','city_edge_vertical'])if(!world.stamps?.[required])errs.push(`Season One ordinary-building stamp library is missing ${required}`);
  if(Object.keys(world.terrain?.stamps||{}).length<26)errs.push('Season One world tileset is missing reusable ground assemblies');
}
if(!existsSync(campMetatileBuildPath))errs.push('Camp metatile build is missing; run npm run build:camp-metatiles');
else{
  const metatileBuild=JSON.parse(readFileSync(campMetatileBuildPath,'utf8'));
  if(metatileBuild.schema!=='badger-grapple-metatiles/v2'||metatileBuild.version!==20)errs.push('Camp metatile build schema/version is unsupported');
  if(metatileBuild.layoutRevision!==seasonLayouts.revision||metatileBuild.cellSize!==seasonLayouts.contract.cellSize)errs.push('Camp metatile build diverges from the Season One layout contract');
  if(metatileBuild.sources?.layout!==fileHash(seasonLayoutsPath)||metatileBuild.sources?.production!==fileHash(productionBuildPath)||metatileBuild.sources?.overrides!==fileHash(campMetatileOverridesPath)||metatileBuild.sources?.worldTileset!==fileHash(worldTilesetBuildPath))errs.push('Camp metatile build is stale; run npm run build:camp-metatiles');
  const atlasPath=fileURLToPath(new URL(`../public/${metatileBuild.atlas.path.replace(/^\.\//,'')}`,import.meta.url));
  if(!existsSync(atlasPath)||fileHash(atlasPath)!==metatileBuild.atlas.sha256)errs.push('Camp metatile atlas is missing or stale');
  if(metatileBuild.atlas.visualCount!==metatileBuild.atlas.entries?.length)errs.push('Camp metatile visual catalog is incomplete');
  if(metatileBuild.groundSystem?.primaryMaterial!=='brick'||metatileBuild.groundSystem?.connectedComponentCount!==1||metatileBuild.groundSystem?.anchorCount!==5||metatileBuild.groundSystem?.rawCutCount!==0||JSON.stringify(metatileBuild.groundSystem?.transitionFamilies)!==JSON.stringify(['surface_brick','surface_concrete']))errs.push('Camp Randall ground system is not one connected, transition-safe authored grid');
  if(!metatileBuild.visualHierarchyMetrics||metatileBuild.visualHierarchyMetrics.saturationDifference<=0||metatileBuild.visualHierarchyMetrics.ground?.meanSaturation>=metatileBuild.visualHierarchyMetrics.identityObjects?.meanSaturation)errs.push('Camp Randall ground is not visually quieter than its identity architecture');
  if(metatileBuild.pixelDiscipline?.version!==4||metatileBuild.pixelDiscipline?.profileVersion!==1||metatileBuild.pixelDiscipline?.assetCount<115||metatileBuild.pixelDiscipline?.maxColorsPerMaterial!==4||metatileBuild.pixelDiscipline?.outputPartialAlphaPixelCount!==0||metatileBuild.pixelDiscipline?.paletteViolationCount!==0)errs.push('Camp Randall did not inherit the Season One material pixel discipline');
  const terrainTiles=metatileBuild.terrain?.tiles||{};
  if(Object.keys(terrainTiles).length<500||metatileBuild.terrain?.catalog?.length!==Object.keys(terrainTiles).length)errs.push('Camp metatile ground catalog did not merge the Season One authoring kit');
  for(const required of ['grass','brick','dirt','stone','water','asphalt'])if(!Object.hasOwn(terrainTiles,required))errs.push(`Camp metatile ground catalog is missing ${required}`);
  for(const [material,visual] of Object.entries(terrainTiles))if(!Number.isInteger(visual)||visual<0||visual>=metatileBuild.atlas.visualCount)errs.push(`Camp metatile ground ${material} references an invalid visual`);
  const validateStamp=(label,stamp)=>{
    if(stamp.cells?.length!==stamp.height||stamp.cells?.some(row=>row.length!==stamp.width)){errs.push(`${label}: metatile matrix does not match footprint`);return;}
    for(let y=0;y<stamp.height;y++)for(let x=0;x<stamp.width;x++){
      const tile=metatileBuild.metatiles[stamp.cells[y][x]];
      if(!tile){errs.push(`${label}: missing metatile at ${x},${y}`);continue;}
      const expected=stamp.door?.x===x&&stamp.door?.y===y?'warp':stamp.collisionMask[y][x]==='#'?'solid':'walkable';
      if(tile.behavior!==expected)errs.push(`${label}: metatile behavior diverges at ${x},${y}`);
      if(!Number.isInteger(tile.visual)||tile.visual<0||tile.visual>=metatileBuild.atlas.visualCount)errs.push(`${label}: invalid visual at ${x},${y}`);
    }
  };
  for(const [id,stamp] of Object.entries(metatileBuild.stamps||{}))validateStamp(`Camp stamp ${id}`,stamp);
  for(const patch of metatileBuild.patches||[])validateStamp(`Camp patch ${patch.id}`,patch);
  const plannedMapIds=Object.keys(seasonLayouts.maps||{});
  const hierarchy=metatileBuild.groundHierarchy||{};
  const hierarchyContract=hierarchy.contract||{};
  if(hierarchyContract.grassVariantCoverageMin!==0.04||hierarchyContract.grassVariantCoverageMax!==0.16||hierarchyContract.maintainedLawnPads!=='required-for-institutional-buildings')errs.push('Season One ground hierarchy contract is missing or stale');
  const institutionalMaps=new Set(['camp_randall','field_house','state_street','bascom_hill','capitol_square','kohl_center','st_louis']);
  if(JSON.stringify(Object.keys(metatileBuild.plannedMaps||{}))!==JSON.stringify(plannedMapIds))errs.push('Map Studio must compile every Season One exterior in layout order');
  for(const mapId of plannedMapIds){
    const layout=seasonLayouts.maps[mapId];
    const planned=metatileBuild.plannedMaps?.[mapId];
    if(!planned||planned.width!==layout.size.width||planned.height!==layout.size.height||planned.terrain?.length!==layout.size.height||planned.terrain?.some(row=>row.length!==layout.size.width)){
      errs.push(`Map Studio exterior ${mapId} does not match its authoritative layout footprint`);
      continue;
    }
    for(const row of planned.terrain)for(const tileId of row)if(!Object.hasOwn(terrainTiles,tileId))errs.push(`Map Studio exterior ${mapId} references unknown ground tile ${tileId}`);
    const metrics=hierarchy.maps?.[mapId];
    if(!metrics)errs.push(`Map Studio exterior ${mapId} is missing ground hierarchy metrics`);
    else{
      if(metrics.grassCellCount>=25&&(metrics.grassVariantCoverage<hierarchyContract.grassVariantCoverageMin||metrics.grassVariantCoverage>hierarchyContract.grassVariantCoverageMax))errs.push(`Map Studio exterior ${mapId} grass variation is outside the quiet-ground contract`);
      if(institutionalMaps.has(mapId)&&metrics.maintainedLawnCellCount<1)errs.push(`Map Studio exterior ${mapId} is missing its maintained institutional lawn pad`);
    }
  }
}
const seasonNodes=seasonRegion.nodes||{};
const seasonNodeIds=Object.keys(seasonNodes);
const requiredSeasonNodes=['camp_randall','r1','field_house','lakeshore_path','picnic_point','state_street','bascom_hill','capitol_square','monona_shore','kohl_center','airport','st_louis'];
for(const id of requiredSeasonNodes)if(!seasonNodes[id])errs.push(`Season One region is missing '${id}'`);
for(const [id,node] of Object.entries(seasonNodes)){
  if(!/^[a-z][a-z0-9_]*$/.test(id))errs.push(`Season One node '${id}' must be a stable lowercase id`);
  if(!node.displayName||!node.kind||!Array.isArray(node.connections)||!Array.isArray(node.transitions)||!Array.isArray(node.services))errs.push(`Season One node '${id}' is missing identity, connections, transitions, or services`);
  for(const to of node.connections||[]){
    if(!seasonNodes[to])errs.push(`Season One node '${id}' connects to missing '${to}'`);
    else if(!(seasonNodes[to].connections||[]).includes(id))errs.push(`Season One physical connection '${id}' -> '${to}' is not reciprocal`);
  }
  for(const transition of node.transitions||[]){
    if(!seasonNodes[transition.to])errs.push(`Season One transition '${id}' -> '${transition.to}' targets a missing node`);
    if(!['fast_travel','cutscene','flight','homecoming'].includes(transition.type))errs.push(`Season One transition '${id}' -> '${transition.to}' has unsupported type '${transition.type}'`);
  }
  if(node.readyForFinalArt&&node.designStatus!=='approved_mockup')errs.push(`Season One node '${id}' cannot enter final art before an approved mockup`);
}
const homeNodes=seasonNodeIds.filter(id=>seasonNodes[id].kind==='home_town');
if(homeNodes.length!==1||homeNodes[0]!=='camp_randall')errs.push('Camp Randall must be the only Season One home town');
if(JSON.stringify(seasonNodes.camp_randall?.connections)!==JSON.stringify(['r1']))errs.push('Camp Randall must have exactly one physical world connection: R1');
if((seasonNodes.camp_randall?.services||[]).length)errs.push('Camp Randall must not contain the recurring town services');
if(seasonNodes.camp_randall?.xFactor?.entryGate!=='season_complete')errs.push('Camp Randall Stadium must remain closed until the season is complete');
if(seasonNodes.state_street?.kind!=='route'||(seasonNodes.state_street?.services||[]).length)errs.push('State Street is R2, not a service town');
if(seasonNodes.capitol_square?.kind!=='town')errs.push('Capitol Square must remain Town 2');
const canonicalServiceIds=Object.keys(seasonRegion.canonicalServices||{}).sort();
if(JSON.stringify(canonicalServiceIds)!==JSON.stringify(['buckys_locker_room','trainer_room']))errs.push('Season One canonical services must be Trainer\'s Room and Bucky\'s Locker Room');
for(const [id,node] of Object.entries(seasonNodes))if(node.kind==='town'){
  const services=[...(node.services||[])].sort();
  if(JSON.stringify(services)!==JSON.stringify(canonicalServiceIds))errs.push(`Season One town '${id}' must own both canonical services`);
}
for(const step of seasonRegion.seasonFlow||[]){
  if(!seasonNodes[step.from]||!seasonNodes[step.to]){errs.push(`Season One flow references missing '${step.from}' or '${step.to}'`);continue;}
  if(step.mode==='physical'){
    if(!seasonNodes[step.from].connections.includes(step.to))errs.push(`Season One physical flow breaks between '${step.from}' and '${step.to}'`);
  }else if(!seasonNodes[step.from].transitions.some(t=>t.to===step.to&&t.type===step.mode))errs.push(`Season One ${step.mode} flow '${step.from}' -> '${step.to}' lacks a matching transition`);
}
const credentials=seasonRegion.credentials||{};
for(const [id,credential] of Object.entries(credentials)){
  if(!seasonNodes[credential.earnedAt])errs.push(`Season One credential '${id}' is earned at missing '${credential.earnedAt}'`);
  else if(seasonNodes[credential.earnedAt].credential!==id)errs.push(`Season One credential '${id}' is not owned by '${credential.earnedAt}'`);
}
for(const id of seasonRegion.flightGate?.requires||[])if(!credentials[id])errs.push(`Season One flight gate references missing credential '${id}'`);
if(seasonRegion.flightGate?.node!=='airport'||(seasonRegion.flightGate?.requires||[]).length!==4)errs.push('Season One flight must leave from the airport and require all four credentials');

if(WORLD_META.tileSize!==TILE)errs.push(`WORLD_META.tileSize ${WORLD_META.tileSize} does not match TILE ${TILE}`);
if(WORLD_META.width!==28||WORLD_META.height!==14||WORLD_META.maxWidth<56||WORLD_META.maxHeight<20)errs.push('WORLD_META must retain 28x14 defaults and support 56-wide routes plus the 20-row Bascom Hill map');

if(LAYERED_MAP_VERSION!==1)errs.push(`layered map version ${LAYERED_MAP_VERSION} is unsupported`);
if(CAMP_TILE_RUNTIME_VERSION!==1)errs.push(`Camp Randall tile runtime version ${CAMP_TILE_RUNTIME_VERSION} is unsupported`);
const campAtlas=fileURLToPath(new URL('../public/assets/tiles/camp_randall_runtime_tiles.png',import.meta.url));
if(!existsSync(campAtlas))errs.push('Camp Randall runtime atlas is missing');
else{
  const atlasHash=createHash('sha256').update(readFileSync(campAtlas)).digest('hex');
  if(atlasHash!==campRuntimeStats().atlasSha256)errs.push('Camp Randall runtime atlas is stale; run npm run build:camp-tiles');
}
for(const [aid,map] of Object.entries(LAYERED_MAPS)){
  if(!AREAS[aid]){errs.push(`layered area ${aid}: missing from AREAS`);continue;}
  if(map.tiles.length!==map.height)errs.push(`layered area ${aid}: ${map.tiles.length} rows != height ${map.height}`);
  map.tiles.forEach((row,y)=>{
    if(row.length!==map.width)errs.push(`layered area ${aid}: row ${y} width ${row.length} != ${map.width}`);
    for(let x=0;x<row.length;x++){
      if(!'.#XgE'.includes(row[x]))errs.push(`layered area ${aid}: unsupported tile '${row[x]}' at (${x},${y})`);
      if(isBlocked(aid,x,y)!=='#X'.includes(row[x]))errs.push(`layered area ${aid}: collision diverges at (${x},${y})`);
    }
  });
  const missingDecor=!map.bakedComposition&&!map.tileRuntime&&(!map.lowerDecor?.length||!map.upperDecor?.length);
  if(missingDecor||!map.interactions?.length||(!map.npcs?.length&&!map.allowEmptyNpcs))errs.push(`layered area ${aid}: authored composition/decor, interactions, and NPC layers must be populated`);
  if(map.tileRuntime){
    const runtime=campTilemap(aid);
    if(!runtime)errs.push(`layered area ${aid}: tileRuntime has no compiled map`);
    else if(runtime.width!==map.width||runtime.height!==map.height)errs.push(`layered area ${aid}: compiled tile dimensions diverge`);
    else{
      const sourcePath=fileURLToPath(new URL(`../public/assets/ui/${runtime.source}`,import.meta.url));
      const sourceHash=createHash('sha256').update(readFileSync(sourcePath)).update(map.tiles.join('\n')).digest('hex');
      if(sourceHash!==runtime.sourceSha256)errs.push(`layered area ${aid}: compiled tile runtime is stale; run npm run build:camp-tiles`);
      for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
        const tile=campRuntimeTile(aid,x,y);
        if(!tile)errs.push(`layered area ${aid}: missing compiled tile at (${x},${y})`);
        else if(tile.blocked!=='#X'.includes(map.tiles[y][x]))errs.push(`layered area ${aid}: compiled tile behavior diverges at (${x},${y})`);
      }
    }
  }
  for(const exit of map.exits||[]){if(map.tiles[exit.y]?.[exit.x]!=='E')errs.push(`layered area ${aid}: exit (${exit.x},${exit.y}) is not marked E`);}
  for(const upper of map.upperDecor||[]){
    if(!Number.isFinite(upper.depthY))errs.push(`layered area ${aid}: upper ${upper.texture} has no depthY`);
    const asset=fileURLToPath(new URL(`../public/assets/layers/${upper.texture}.png`,import.meta.url));
    if(!existsSync(asset))errs.push(`layered area ${aid}: upper texture ${upper.texture}.png is missing`);
  }
  for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)if(map.tiles[y][x]==='X'){
    const covered=(map.upperDecor||[]).some(entry=>entry.source==='tileQuad'&&x>=entry.x&&x<=entry.x+1&&y===entry.y+1);
    if(!covered)errs.push(`layered area ${aid}: occlusion collision X at (${x},${y}) has no tree canopy owner`);
  }
}

for(const [id,r] of Object.entries(ROSTER)){
  (r.moves||[]).forEach(mk=>{if(!MOVES[mk])errs.push(`roster ${id}: move '${mk}' missing from MOVES`);});
  if(r.evolvesTo&&!ROSTER[r.evolvesTo])errs.push(`roster ${id}: evolvesTo '${r.evolvesTo}' missing from ROSTER`);
  if(r.evolvesTo&&!r.evolveLvl)errs.push(`roster ${id}: has evolvesTo but no evolveLvl`);
}
STARTERS.forEach(id=>{if(!ROSTER[id])errs.push(`STARTERS references missing roster id '${id}'`);});

for(const [aid,a] of Object.entries(AREAS)){
  if(!/^[a-z][a-z0-9_]*$/.test(aid))errs.push(`area id '${aid}' must be a stable lowercase data id`);
  if(!a.name||!a.bg)errs.push(`area ${aid}: missing name or bg`);
  if(!inBounds(aid,a.start?.x,a.start?.y))errs.push(`area ${aid}: start (${a.start?.x},${a.start?.y}) out of bounds`);
  if(inBounds(aid,a.start?.x,a.start?.y)&&isBlocked(aid,a.start.x,a.start.y))errs.push(`area ${aid}: start (${a.start.x},${a.start.y}) is BLOCKED`);

  if(a.encounters){
    const wl=a.wildLevels;
    if(!Array.isArray(wl)||wl.length!==2||!Number.isInteger(wl[0])||!Number.isInteger(wl[1])||wl[0]<1||wl[0]>wl[1])errs.push(`area ${aid}: encounters need wildLevels [min,max] with 1<=min<=max`);
  }
  if(a.captain){
    if(!ROSTER[a.captain.id])errs.push(`area ${aid} captain id '${a.captain.id}' missing from ROSTER`);
    if(!inBounds(aid,a.captain.x,a.captain.y))errs.push(`area ${aid}: captain at (${a.captain.x},${a.captain.y}) out of bounds`);
    (a.captain.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`area ${aid} captain team member '${id}' missing from ROSTER`);});
    if(!a.captain.badge)errs.push(`area ${aid} captain has no badge name`);
  }

  (a.exits||[]).forEach(e=>{
    if(!AREAS[e.to])errs.push(`area ${aid} exit -> missing area '${e.to}'`);
    if(!inBounds(aid,e.x,e.y))errs.push(`area ${aid}: exit to '${e.to}' at (${e.x},${e.y}) out of bounds`);
    if(AREAS[e.to]&&!inBounds(e.to,e.tx,e.ty))errs.push(`area ${aid}: exit to '${e.to}' lands at (${e.tx},${e.ty}) out of bounds`);
    if(e.gate){e.gate.forEach(b=>{
      const grantedSomewhere=Object.values(AREAS).some(a2=>a2.captain?.badge===b);
      if(!grantedSomewhere)errs.push(`area ${aid} exit gate references badge '${b}' that no captain grants`);
    });}
  });
}

function bfsReach(area,sx,sy,tx,ty){
  const seen=new Set([sx+','+sy]);const q=[[sx,sy]];
  while(q.length){const [x,y]=q.shift();if(x===tx&&y===ty)return true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;
      if(!inBounds(area,nx,ny))continue;
      const k=nx+','+ny;if(seen.has(k))continue;seen.add(k);
      if(!isBlocked(area,nx,ny)||(nx===tx&&ny===ty))q.push([nx,ny]);
    }}
  return false;
}

for(const [aid,a] of Object.entries(AREAS)){
  (a.npcs||[]).forEach((npc,index)=>{
    if(npc.look&&!NPC_LOOKS.includes(npc.look))errs.push(`area ${aid}: npc ${index} look '${npc.look}' has no generated semantic NPC sheet`);
  });
  (a.exits||[]).forEach(e=>{
    if(!bfsReach(aid,a.start.x,a.start.y,e.x,e.y))errs.push(`area ${aid}: exit to '${e.to}' at (${e.x},${e.y}) is UNREACHABLE from spawn`);
    if(AREAS[e.to]&&isBlocked(e.to,e.tx,e.ty))errs.push(`area ${aid}: warp to '${e.to}' lands on BLOCKED tile (${e.tx},${e.ty})`);
  });
  if(a.captain&&!bfsReach(aid,a.start.x,a.start.y,a.captain.x,a.captain.y+1)&&!bfsReach(aid,a.start.x,a.start.y,a.captain.x,a.captain.y-1))errs.push(`area ${aid}: captain at (${a.captain.x},${a.captain.y}) may be unreachable`);
}

for(const [tid,t] of Object.entries(TRAINERS)){
  if(!AREAS[t.area])errs.push(`trainer ${tid}: area '${t.area}' missing from AREAS`);
  if(AREAS[t.area]&&!inBounds(t.area,t.pos?.x,t.pos?.y))errs.push(`trainer ${tid}: position (${t.pos?.x},${t.pos?.y}) out of bounds`);
  if(AREAS[t.area]&&inBounds(t.area,t.pos?.x,t.pos?.y)&&isBlocked(t.area,t.pos.x,t.pos.y))errs.push(`trainer ${tid}: position (${t.pos.x},${t.pos.y}) is BLOCKED`);
  if(!['up','down','left','right'].includes(t.facing))errs.push(`trainer ${tid}: invalid facing '${t.facing}'`);
  if(t.look&&!NPC_LOOKS.includes(t.look))errs.push(`trainer ${tid}: look '${t.look}' has no generated semantic NPC sheet`);
  if(!Number.isInteger(t.sightRange)||t.sightRange<1)errs.push(`trainer ${tid}: sightRange must be a positive integer`);
  (t.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`trainer ${tid} team member '${id}' missing from ROSTER`);});
  if(!t.team||!t.team.length)errs.push(`trainer ${tid} has empty team`);
  // v21.11: trainers must be BFS-reachable from the area spawn and their
  // sight cone must start on a walkable tile (a dead cone can never fire).
  if(AREAS[t.area]&&inBounds(t.area,t.pos?.x,t.pos?.y)){
    const a=AREAS[t.area];
    if(!bfsReach(t.area,a.start.x,a.start.y,t.pos.x,t.pos.y))errs.push(`trainer ${tid}: UNREACHABLE from '${t.area}' spawn`);
    const d={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[t.facing];
    if(d&&isBlocked(t.area,t.pos.x+d[0],t.pos.y+d[1]))errs.push(`trainer ${tid}: first sight tile (${t.pos.x+d[0]},${t.pos.y+d[1]}) is blocked - cone is dead`);
  }
}

// v21.12: Big Ten Championship integrity - the desk must be reachable, its badge
// gate must be grantable, and every bracket team must exist in the roster.
if(!AREAS[TOURNAMENT.desk.area])errs.push(`tournament desk area '${TOURNAMENT.desk.area}' missing`);
else{
  const a=AREAS[TOURNAMENT.desk.area];
  if(isBlocked(TOURNAMENT.desk.area,TOURNAMENT.desk.x,TOURNAMENT.desk.y))errs.push('tournament desk stands on a BLOCKED tile');
  if(!bfsReach(TOURNAMENT.desk.area,a.start.x,a.start.y,TOURNAMENT.desk.x,TOURNAMENT.desk.y))errs.push('tournament desk is UNREACHABLE from the hall spawn');
}
TOURNAMENT.requires.forEach(b=>{if(!Object.values(AREAS).some(a2=>a2.captain?.badge===b))errs.push(`tournament requires badge '${b}' that no captain grants`);});
if(TOURNAMENT.rounds.length!==3)errs.push('tournament must have exactly 3 rounds (round counter and champion flag assume it)');
TOURNAMENT.rounds.forEach((r,i)=>{
  if(!r.team||!r.team.length)errs.push(`tournament round ${i} has an empty team`);
  (r.team||[]).forEach(([id])=>{if(!ROSTER[id])errs.push(`tournament round ${i} team member '${id}' missing from ROSTER`);});
  if(!r.trainerName||!r.intro||!r.win)errs.push(`tournament round ${i} is missing trainerName/intro/win text`);
});
const battleAssets=new Set();
for(const [id,r] of Object.entries(ROSTER)){
  if(!PERSONAS[r.asset])errs.push(`roster ${id}: asset '${r.asset}' has no persona family (battle-form fiction breaks)`);
  if(!r.spirit)errs.push(`roster ${id}: spirit identity is missing`);
  if(!r.battleAsset)errs.push(`roster ${id}: battleAsset is missing`);
  if(battleAssets.has(r.battleAsset))errs.push(`roster ${id}: battleAsset '${r.battleAsset}' is not unique`);
  battleAssets.add(r.battleAsset);
  for(const suffix of ['', '_back']){
    const sprite=fileURLToPath(new URL(`../public/assets/sprites/battle_${r.battleAsset}${suffix}_v3.png`,import.meta.url));
    if(!existsSync(sprite)){errs.push(`roster ${id}: battle sprite '${sprite}' is missing`);continue;}
    const bytes=readFileSync(sprite);
    if(bytes.length<24||bytes.readUInt32BE(16)!==128||bytes.readUInt32BE(20)!==128)errs.push(`roster ${id}: ${suffix?'back':'front'} battle sprite must be exactly 128x128 (64px logical at exact 2x)`);
  }
}

// v21.43 Gen-1 encounter slots: every encounter area needs a 10-slot table,
// canonical 256-sum chances, roster-valid ids, and levels inside the band.
if(WILD_SLOT_CHANCES.reduce((a,b)=>a+b,0)!==256)errs.push('WILD_SLOT_CHANCES must sum to 256 (pokered contract)');
for(const [aid,a] of Object.entries(AREAS)){
  if(!a.encounters)continue;
  const slots=WILD_SLOTS[aid];
  if(!slots){errs.push(`area ${aid}: encounters enabled but no WILD_SLOTS table`);continue;}
  if(slots.length!==WILD_SLOT_CHANCES.length)errs.push(`area ${aid}: WILD_SLOTS needs ${WILD_SLOT_CHANCES.length} slots, has ${slots.length}`);
  slots.forEach(([lvl,id],i)=>{
    if(!ROSTER[id])errs.push(`area ${aid} slot ${i}: id '${id}' missing from ROSTER`);
    const [lo,hi]=a.wildLevels||[1,99];
    if(lvl<lo||lvl>hi)errs.push(`area ${aid} slot ${i}: level ${lvl} outside wild band ${lo}-${hi}`);
  });
}

// One-plane law (v21.40): the outdoor world must stitch into a single
// consistent geography via exit offsets - the Town Map renders from it.
const plane=worldPlane();
plane.conflicts.forEach(c=>errs.push(`world plane contradiction: ${c}`));
for(const id of WORLD_META.activeOutdoorAreas)if(!plane.pos[id])errs.push(`world plane: outdoor area '${id}' is unreachable from campus via outdoor exits`);
const campStats=campRuntimeStats();
const manifestPath=fileURLToPath(new URL('../art/imagegen/camp_randall_object_manifest.json',import.meta.url));
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
const manifestBuildPath=fileURLToPath(new URL('../src/data/campRandallManifestBuild.json',import.meta.url));
if(!existsSync(manifestBuildPath))errs.push('Camp Randall manifest build record is missing; run npm run build:camp-manifest');
else{
  const build=JSON.parse(readFileSync(manifestBuildPath,'utf8'));
  if(build.version!==1||build.tileSize!==TILE)errs.push('Camp Randall manifest build version/tile size is unsupported');
  for(const [path,expected] of Object.entries(build.inputSha256||{})){
    const source=fileURLToPath(new URL(`../${path}`,import.meta.url));
    const bytes=readFileSync(source);
    const canonical=path.endsWith('.json')?bytes.toString('utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n'):bytes;
    const actual=createHash('sha256').update(canonical).digest('hex');
    if(actual!==expected)errs.push(`Camp Randall manifest input ${path} is stale; run npm run build:camp-manifest`);
  }
  for(const [path,expected] of Object.entries(build.outputSha256||{})){
    const output=fileURLToPath(new URL(`../${path}`,import.meta.url));
    if(!existsSync(output))errs.push(`Camp Randall generated output ${path} is missing; run npm run build:camp-manifest`);
    else{
      const actual=createHash('sha256').update(readFileSync(output)).digest('hex');
      if(actual!==expected)errs.push(`Camp Randall generated output ${path} is stale; run npm run build:camp-manifest`);
    }
  }
}
const fillRect=(grid,rect,value)=>{const [x1,y1,x2,y2]=rect;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=value;};
for(const [aid,spec] of Object.entries(manifest.areas)){
  const map=LAYERED_MAPS[aid];
  if(!map){errs.push(`manifest area ${aid} has no runtime map`);continue;}
  if(map.manifestRuntime!=='camp-randall-objects-v1')errs.push(`manifest area ${aid} is not marked as object-owned runtime`);
  if(map.width!==spec.width||map.height!==spec.height)errs.push(`manifest area ${aid} dimensions diverge`);
  const expected=Array.from({length:spec.height},()=>Array(spec.width).fill('.'));
  for(const rect of spec.walls.solidRects)fillRect(expected,rect,'#');
  for(const [x,y] of spec.walls.openCells||[])expected[y][x]='.';
  for(const object of spec.objects){
    if(!object.walkable)fillRect(expected,object.footprint,'#');
    for(const [x,y] of object.walkableCells||[])expected[y][x]='.';
    for(const [x,y] of object.doorCells||[])expected[y][x]='E';
    const upper=(map.upperDecor||[]).filter(entry=>entry.owner===object.id);
    if(object.riseRows>0){
      if(upper.length!==1)errs.push(`manifest ${aid}/${object.id}: expected one owned foreground, found ${upper.length}`);
      else{
        const [x1,,x2]=object.footprint;
        const asset=fileURLToPath(new URL(`../public/assets/layers/${upper[0].texture}.png`,import.meta.url));
        if(!existsSync(asset))errs.push(`manifest ${aid}/${object.id}: foreground asset missing`);
        else{
          const png=readFileSync(asset);const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
          if(width!==(x2-x1+1)*TILE||height!==object.riseRows*TILE)errs.push(`manifest ${aid}/${object.id}: foreground is ${width}x${height}, expected ${(x2-x1+1)*TILE}x${object.riseRows*TILE}`);
        }
      }
    }else if(upper.length)errs.push(`manifest ${aid}/${object.id}: zero-rise object owns a foreground`);
  }
  for(const [x,y] of spec.walls.exitCells||[])expected[y][x]='E';
  expected.forEach((row,y)=>{if(row.join('')!==map.tiles[y])errs.push(`manifest area ${aid}: collision row ${y} was not generated from object footprints`);});
}

// Legacy v21.62 full-composition maps remain validated so the current build is
// playable during migration. They are not the production template for new
// Season One maps; see docs/PROVEN_RPG_ENGINEERING_AUDIT.md and Law 6c.
const worldManifestPath=fileURLToPath(new URL('../art/imagegen/world_composition_manifest.json',import.meta.url));
const worldManifest=JSON.parse(readFileSync(worldManifestPath,'utf8'));
const worldBuildPath=fileURLToPath(new URL('../src/data/worldCompositionBuild.json',import.meta.url));
if(!existsSync(worldBuildPath))errs.push('World composition build record is missing; run npm run build:world-compositions');
else{
  const build=JSON.parse(readFileSync(worldBuildPath,'utf8'));
  if(build.version!==1)errs.push('World composition build version is unsupported');
  for(const [path,expected] of Object.entries(build.inputSha256||{})){
    const source=fileURLToPath(new URL(`../${path}`,import.meta.url));
    if(!existsSync(source))errs.push(`World composition input ${path} is missing`);
    else{
      const bytes=readFileSync(source);
      const canonical=path.endsWith('.json')?bytes.toString('utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n'):bytes;
      const actual=createHash('sha256').update(canonical).digest('hex');
      if(actual!==expected)errs.push(`World composition input ${path} is stale; run npm run build:world-compositions`);
    }
  }
  for(const [path,expected] of Object.entries(build.outputSha256||{})){
    const output=fileURLToPath(new URL(`../${path}`,import.meta.url));
    if(!existsSync(output))errs.push(`World composition output ${path} is missing; run npm run build:world-compositions`);
    else if(createHash('sha256').update(readFileSync(output)).digest('hex')!==expected)errs.push(`World composition output ${path} is stale; run npm run build:world-compositions`);
  }
}
for(const [aid,spec] of Object.entries(worldManifest.areas)){
  const map=LAYERED_MAPS[aid];
  if(!map){errs.push(`world composition ${aid}: missing runtime map`);continue;}
  if(map.manifestRuntime!=='world-full-composition-v1'||!map.bakedComposition)errs.push(`world composition ${aid}: runtime ownership marker is missing`);
  if(map.width!==spec.width||map.height!==spec.height)errs.push(`world composition ${aid}: dimensions diverge`);
  if((map.upperDecor||[]).length)errs.push(`world composition ${aid}: full painting must not use rectangular upper patches`);
  const expected=Array.from({length:spec.height},()=>Array(spec.width).fill('.'));
  for(const rect of spec.solidRects||[])fillRect(expected,rect,'#');
  for(const rect of spec.openRects||[])fillRect(expected,rect,'.');
  for(const rect of spec.grassRects||[])fillRect(expected,rect,'g');
  for(const object of spec.objects||[])for(const rect of object.footprints||[object.footprint])if(rect)fillRect(expected,rect,'#');
  for(const [x,y] of spec.exitCells||[])expected[y][x]='E';
  expected.forEach((row,y)=>{if(row.join('')!==map.tiles[y])errs.push(`world composition ${aid}: behavior row ${y} was not generated from the manifest`);});
  for(const exit of spec.exits||[])if(!spec.exitCells.some(([x,y])=>x===exit.x&&y===exit.y))errs.push(`world composition ${aid}: exit (${exit.x},${exit.y}) lacks an authored exit cell`);
  for(const interaction of spec.interactions||[]){
    for(const [x,y] of interaction.tiles||[])if(x<0||x>=spec.width||y<0||y>=spec.height)errs.push(`world composition ${aid}: ${interaction.kind} interaction (${x},${y}) is out of bounds`);
    if(interaction.rect){const [x1,y1,x2,y2]=interaction.rect;if(x1<0||y1<0||x2>=spec.width||y2>=spec.height)errs.push(`world composition ${aid}: ${interaction.kind} interaction rect is out of bounds`);}
  }
  const output=fileURLToPath(new URL(`../public/assets/ui/area_${aid}.png`,import.meta.url));
  if(existsSync(output)){
    const png=readFileSync(output),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    if(width!==spec.width*TILE||height!==spec.height*TILE)errs.push(`world composition ${aid}: image is ${width}x${height}, expected ${spec.width*TILE}x${spec.height*TILE}`);
  }
}
const servicePolicy=worldManifest.townServicePolicy;
for(const [town,services] of Object.entries(servicePolicy?.towns||{})){
  if(!AREAS[town]){errs.push(`town service policy: missing town '${town}'`);continue;}
  for(const role of servicePolicy.requiredRoles||[]){
    const service=services[role];
    if(!service||!AREAS[service]){errs.push(`town service policy: ${town} has no ${role} area`);continue;}
    if(!AREAS[town].exits.some(exit=>exit.to===service))errs.push(`town service policy: ${town} has no visible door to ${role} '${service}'`);
    if(!AREAS[service].exits.some(exit=>exit.to===town))errs.push(`town service policy: ${role} '${service}' does not return to ${town}`);
  }
  if(services.gym){
    if(!AREAS[services.gym])errs.push(`town service policy: ${town} gym '${services.gym}' is missing`);
    else{
      if(!AREAS[town].exits.some(exit=>exit.to===services.gym))errs.push(`town service policy: ${town} has no visible gym door to '${services.gym}'`);
      if(!AREAS[services.gym].exits.some(exit=>exit.to===town))errs.push(`town service policy: gym '${services.gym}' does not return to ${town}`);
    }
  }
}
// Full-composition rooms intentionally preserve unique continuous pixels while
// behavior remains cell-owned. A 32-column atlas may grow vertically, but the
// unique-tile budget remains bounded so full paintings do not explode memory.
if(campStats.tileCount>1280)errs.push(`Camp Randall runtime has ${campStats.tileCount} tiles; full-composition atlas budget is 1280`);
console.log(errs.length?errs.join('\n'):`ALL VALID - ${Object.keys(ROSTER).length} roster entries, ${Object.keys(MOVES).length} moves, ${Object.keys(AREAS).length} legacy areas, ${Object.keys(TRAINERS).length} trainers. Season atlas ${Object.keys(seasonLayouts.maps).length} exteriors/${Object.keys(seasonLayouts.interiors).length} interiors @${seasonLayouts.contract.cellSize}px; legacy Camp runtime v${campStats.version}/${campStats.tileCount} tiles.`);
if(errs.length)process.exit(1);
