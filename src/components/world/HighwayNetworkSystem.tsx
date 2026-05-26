// src/components/world/HighwayNetworkSystem.tsx
//
// Complete divided highway generator with on/off ramps, toll plazas, and overpasses.
// Streams chunks based on player position from worldStore.
//
// COORDINATE CONVENTION (critical):
//   X axis: lateral (left/right across the road)
//   Y axis: vertical (up)
//   Z axis: forward direction of travel (player drives in +Z)
//
// PlaneGeometry(width, height) lies in XY plane facing +Z by default.
// After rotation.x = -π/2, the plane lies flat (normal=+Y) with:
//   - PlaneGeometry's width  → X extent (lateral)
//   - PlaneGeometry's height → Z extent (forward/back)
// So geometries that should span the full chunk length need Z=CHUNK_LENGTH,
// which means PlaneGeometry(width_along_X, CHUNK_LENGTH).

import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '../../stores/worldStore';

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

const CHUNK_LENGTH = 80;       // Z length of each chunk (meters)
const LOAD_AHEAD = 12;         // chunks ahead of player to keep loaded
const LOAD_BEHIND = 6;         // chunks behind player to keep loaded

// Road cross-section layout (X positions, centered on 0)
const LANE_WIDTH = 3.7;
const SHOULDER_WIDTH = 2.5;
const MEDIAN_WIDTH = 5.0;
const LANES_PER_SIDE = 2;
const HALF_MEDIAN = MEDIAN_WIDTH / 2;                                       // 2.5
const ROAD_HALF = LANES_PER_SIDE * LANE_WIDTH + SHOULDER_WIDTH + HALF_MEDIAN; // 12.4
const TOTAL_ROAD_WIDTH = ROAD_HALF * 2;                                     // 24.8

// Key X positions (right side; mirror for left)
const X_INNER_LINE   = HALF_MEDIAN;                       //  2.5 (between median and inner lane)
const X_BETWEEN_LANE = HALF_MEDIAN + LANE_WIDTH;          //  6.2 (between lanes)
const X_OUTER_LINE   = HALF_MEDIAN + LANE_WIDTH * 2;      //  9.9 (between outer lane and shoulder)
const X_SHOULDER_END = X_OUTER_LINE + SHOULDER_WIDTH;     // 12.4 (outer edge of shoulder)

// Lane CENTERS (for traffic/visual)
export const LANE_CENTER_INNER_R = (X_INNER_LINE + X_BETWEEN_LANE) / 2;     // 4.35
export const LANE_CENTER_OUTER_R = (X_BETWEEN_LANE + X_OUTER_LINE) / 2;     // 8.05
export const LANE_CENTER_INNER_L = -LANE_CENTER_INNER_R;
export const LANE_CENTER_OUTER_L = -LANE_CENTER_OUTER_R;

// Elevated highway (running parallel to ground highway, ~8m above)
const ELEVATED_Y       = 9;     // height of elevated deck above ground
const ELEVATED_WIDTH   = 18;    // total width of elevated road (4 lanes + median + shoulders)
const E_LANE_WIDTH     = 3.5;
const E_MEDIAN         = 1.4;
const E_HALF_MEDIAN    = E_MEDIAN / 2;
const E_LANE_INNER_R   = E_HALF_MEDIAN + E_LANE_WIDTH / 2;        // 2.45
const E_LANE_OUTER_R   = E_HALF_MEDIAN + E_LANE_WIDTH * 1.5;      // 5.95
const E_LANE_INNER_L   = -E_LANE_INNER_R;
const E_LANE_OUTER_L   = -E_LANE_OUTER_R;
const E_OUTER_EDGE     = E_HALF_MEDIAN + E_LANE_WIDTH * 2;        // 7.7
const E_HALF_WIDTH     = ELEVATED_WIDTH / 2;                       // 9.0

type ChunkType =
  | 'STRAIGHT'
  | 'RAMP_ON'         // side on-ramp at ground level
  | 'RAMP_OFF'        // side off-ramp at ground level
  | 'TOLL'            // toll plaza on ground
  | 'OVERPASS'        // perpendicular bridge crossing both highways
  | 'ELEVATED_UP'     // up-ramp from ground to elevated
  | 'ELEVATED_DOWN';  // down-ramp from elevated to ground

function getChunkType(idx: number): ChunkType {
  const abs = Math.abs(idx);
  if (abs === 0) return 'STRAIGHT';
  // Priority: more specific first
  if (abs % 24 === 12) return 'OVERPASS';
  if (abs % 16 === 8)  return 'TOLL';
  if (abs % 10 === 5)  return 'ELEVATED_UP';
  if (abs % 10 === 0)  return 'ELEVATED_DOWN';
  if (abs % 8  === 0)  return 'RAMP_ON';
  if (abs % 8  === 4)  return 'RAMP_OFF';
  return 'STRAIGHT';
}

/* ─────────────────────────────────────────────
 * Shared geometry & material pools
 * ───────────────────────────────────────────── */

function makeShared() {
  // ── Geometries lying flat (X across, Z forward) ──
  // PlaneGeometry(X_extent, Z_extent) after rotation.x = -π/2
  const roadGeo     = new THREE.PlaneGeometry(TOTAL_ROAD_WIDTH, CHUNK_LENGTH);
  const grassGeo    = new THREE.PlaneGeometry(80, CHUNK_LENGTH);
  const shoulderGeo = new THREE.PlaneGeometry(SHOULDER_WIDTH, CHUNK_LENGTH);
  const medianFloorGeo = new THREE.PlaneGeometry(MEDIAN_WIDTH, CHUNK_LENGTH);
  // Lane lines (thin in X, long in Z)
  const solidLineGeo = new THREE.PlaneGeometry(0.20, CHUNK_LENGTH * 0.98);
  const edgeLineGeo  = new THREE.PlaneGeometry(0.25, CHUNK_LENGTH * 0.98);
  // Single dash segment (thin in X, short in Z)
  const dashLineGeo  = new THREE.PlaneGeometry(0.18, 4.5);
  // Ramp lane (extra lane on the right): thin X, full Z
  const rampLaneGeo  = new THREE.PlaneGeometry(LANE_WIDTH, CHUNK_LENGTH);
  // Diagonal ramp road (long along Z, normal width)
  const rampRoadGeo  = new THREE.PlaneGeometry(LANE_WIDTH + 1, 60);

  // ── 3D boxes (X, Y, Z explicit) ──
  // Median barrier: thin in X (0.45), short Y (0.55), runs along Z
  const medianBarGeo = new THREE.BoxGeometry(0.45, 0.55, CHUNK_LENGTH);
  // Guardrail: thin X, short Y, full Z
  const railGeo = new THREE.BoxGeometry(0.25, 0.75, CHUNK_LENGTH);

  // Streetlight parts
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 7, 6);
  const armGeo  = new THREE.BoxGeometry(3, 0.08, 0.08);
  const headGeo = new THREE.BoxGeometry(1.4, 0.18, 0.35);

  // Toll plaza
  const gantryBeamGeo   = new THREE.BoxGeometry(TOTAL_ROAD_WIDTH + 4, 0.6, 1.2);
  const gantryPillarGeo = new THREE.CylinderGeometry(0.3, 0.4, 6.5, 8);
  const tollBoothGeo    = new THREE.BoxGeometry(2.0, 2.8, 4);
  const tollRoofGeo     = new THREE.BoxGeometry(2.6, 0.25, 4.4);
  const tollWindowGeo   = new THREE.BoxGeometry(0.6, 0.55, 0.08);
  const coneGeo         = new THREE.ConeGeometry(0.25, 0.7, 6);

  // Overpass (bridge crosses along X above the highway)
  // Bridge deck: 80 wide along X (crossing the highway), 12 deep along Z (lane width)
  const bridgeDeckGeo   = new THREE.PlaneGeometry(80, 12);
  // Bridge guardrail (runs along X): 80 along X, 0.9 Y, 0.3 Z
  const bridgeRailGeo   = new THREE.BoxGeometry(80, 0.9, 0.3);
  // Overpass support pillar — sized for an Y=15 deck (above the elevated highway)
  const pillarGeo       = new THREE.CylinderGeometry(0.55, 0.65, 15, 8);
  const pillarCapGeo    = new THREE.BoxGeometry(3, 0.5, 3);

  // Sign post
  const signPoleGeo  = new THREE.CylinderGeometry(0.07, 0.07, 5, 6);
  const signBoardGeo = new THREE.BoxGeometry(5, 1.8, 0.15);

  // ── Elevated highway parts ──
  const eRoadGeo     = new THREE.PlaneGeometry(ELEVATED_WIDTH, CHUNK_LENGTH);
  const eMedianGeo   = new THREE.PlaneGeometry(E_MEDIAN, CHUNK_LENGTH);
  const eEdgeLineGeo = new THREE.PlaneGeometry(0.18, CHUNK_LENGTH * 0.98);
  const eDashGeo     = new THREE.PlaneGeometry(0.16, 3.5);
  // Side guardrails (along Z)
  const eRailGeo     = new THREE.BoxGeometry(0.2, 1.0, CHUNK_LENGTH);
  // Pillar (concrete column from ground up to elevated underside)
  const ePillarGeo   = new THREE.CylinderGeometry(0.65, 0.85, ELEVATED_Y, 8);
  // Pillar cap (sits at the top of the pillar, just under the deck)
  const ePillarCapGeo = new THREE.BoxGeometry(ELEVATED_WIDTH + 1, 0.8, 2.8);
  // Underside cross-beam every ~20m to look structural
  const eUnderBeamGeo = new THREE.BoxGeometry(ELEVATED_WIDTH, 0.4, 0.6);
  // Up-ramp / down-ramp surface: 3.5m wide, 90m long (slightly overlaps chunk edges)
  const rampSurfaceGeo = new THREE.PlaneGeometry(4.0, 90);
  // Ramp guardrails along the ramp
  const rampRailGeo    = new THREE.BoxGeometry(0.15, 0.8, 90);

  // Decorations: buildings, trees, hills, cross streets
  // Buildings come in a few base shapes; we scale per-instance
  const buildingSmallGeo  = new THREE.BoxGeometry(6, 6, 6);
  const buildingMedGeo    = new THREE.BoxGeometry(8, 12, 8);
  const buildingTallGeo   = new THREE.BoxGeometry(7, 22, 7);
  const buildingWideGeo   = new THREE.BoxGeometry(14, 8, 10);
  const buildingWindowGeo = new THREE.PlaneGeometry(0.7, 0.7);
  // Trees
  const treeTrunkGeo  = new THREE.CylinderGeometry(0.25, 0.35, 3, 6);
  const treeCanopyGeo = new THREE.SphereGeometry(1.8, 8, 6);
  // Hill / mountain in the far distance
  const hillGeo = new THREE.ConeGeometry(28, 22, 8);
  // Cross street: a perpendicular road in the grass area, runs along X.
  // PlaneGeometry(length_along_X, width_along_Z) — after rotation.x = -π/2.
  const crossStreetGeo = new THREE.PlaneGeometry(120, 9);
  const crossLineGeo   = new THREE.PlaneGeometry(110, 0.18);

  // ── Materials ──
  const asphalt   = new THREE.MeshStandardMaterial({ color: '#181820', roughness: 0.94, metalness: 0.04 });
  const rampMat   = new THREE.MeshStandardMaterial({ color: '#1f1f28', roughness: 0.9,  metalness: 0.04 });
  const grass     = new THREE.MeshStandardMaterial({ color: '#1d4d1b', roughness: 1.0 });
  const shoulder  = new THREE.MeshStandardMaterial({ color: '#3a3a40', roughness: 0.95 });
  const median    = new THREE.MeshStandardMaterial({ color: '#274d1f', roughness: 1.0 });
  const white     = new THREE.MeshStandardMaterial({ color: '#f8f8f8', emissive: '#e8e8e8', emissiveIntensity: 0.18 });
  const yellow    = new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 0.25 });
  const concrete  = new THREE.MeshStandardMaterial({ color: '#7b7b82', roughness: 0.8, metalness: 0.1 });
  const steel     = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.35, metalness: 0.7 });
  const poleMat   = new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.5, metalness: 0.5 });
  const lightMat  = new THREE.MeshStandardMaterial({ color: '#fef3c7', emissive: '#fde68a', emissiveIntensity: 3.5 });
  const tollWall  = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5, metalness: 0.2 });
  const tollRoof  = new THREE.MeshStandardMaterial({ color: '#1e3a5f', roughness: 0.55 });
  const tollWin   = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#fde047', emissiveIntensity: 1.5 });
  const orange    = new THREE.MeshStandardMaterial({ color: '#f97316', emissive: '#ea580c', emissiveIntensity: 0.4 });
  const signMat   = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 });

  // Building materials (a few variants)
  const buildingA = new THREE.MeshStandardMaterial({ color: '#6b7280', roughness: 0.7, metalness: 0.15 });
  const buildingB = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.7, metalness: 0.2 });
  const buildingC = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85, metalness: 0.05 });
  const buildingD = new THREE.MeshStandardMaterial({ color: '#7c3aed', roughness: 0.6, metalness: 0.2 });
  const windowMat = new THREE.MeshStandardMaterial({ color: '#fde68a', emissive: '#fde047', emissiveIntensity: 1.6 });
  // Trees
  const trunkMat  = new THREE.MeshStandardMaterial({ color: '#3f2a1d', roughness: 0.95 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.9 });
  // Hill
  const hillMat   = new THREE.MeshStandardMaterial({ color: '#3d4a2a', roughness: 1.0 });

  return {
    geo: {
      road: roadGeo, grass: grassGeo, shoulder: shoulderGeo,
      medianFloor: medianFloorGeo, medianBar: medianBarGeo, rail: railGeo,
      solidLine: solidLineGeo, edgeLine: edgeLineGeo, dashLine: dashLineGeo,
      rampLane: rampLaneGeo, rampRoad: rampRoadGeo,
      pole: poleGeo, arm: armGeo, head: headGeo,
      gantryBeam: gantryBeamGeo, gantryPillar: gantryPillarGeo,
      tollBooth: tollBoothGeo, tollRoof: tollRoofGeo, tollWindow: tollWindowGeo,
      cone: coneGeo,
      bridgeDeck: bridgeDeckGeo, bridgeRail: bridgeRailGeo,
      pillar: pillarGeo, pillarCap: pillarCapGeo,
      signPole: signPoleGeo, signBoard: signBoardGeo,
      buildingSmall: buildingSmallGeo, buildingMed: buildingMedGeo,
      buildingTall: buildingTallGeo, buildingWide: buildingWideGeo,
      buildingWindow: buildingWindowGeo,
      treeTrunk: treeTrunkGeo, treeCanopy: treeCanopyGeo,
      hill: hillGeo,
      crossStreet: crossStreetGeo, crossLine: crossLineGeo,
      eRoad: eRoadGeo, eMedian: eMedianGeo, eEdgeLine: eEdgeLineGeo,
      eDash: eDashGeo, eRail: eRailGeo,
      ePillar: ePillarGeo, ePillarCap: ePillarCapGeo, eUnderBeam: eUnderBeamGeo,
      rampSurface: rampSurfaceGeo, rampRail: rampRailGeo,
    },
    mat: {
      asphalt, ramp: rampMat, grass, shoulder, median,
      white, yellow, concrete, steel, pole: poleMat, light: lightMat,
      tollWall, tollRoof, tollWin, orange, sign: signMat,
      buildingA, buildingB, buildingC, buildingD, windowMat,
      trunkMat, canopyMat, hillMat,
    },
  };
}

type Shared = ReturnType<typeof makeShared>;

/* ─────────────────────────────────────────────
 * Chunk builders
 * ───────────────────────────────────────────── */

function buildStraightBase(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;

  // Asphalt road surface
  const road = new THREE.Mesh(geo.road, mat.asphalt);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0;
  road.receiveShadow = true;
  g.add(road);

  // Grass on both sides
  for (const sx of [-1, 1]) {
    const grass = new THREE.Mesh(geo.grass, mat.grass);
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(sx * (ROAD_HALF + 40), -0.05, 0);
    grass.receiveShadow = true;
    g.add(grass);
  }

  // Hard shoulders (paler asphalt strip just inside guardrail)
  for (const sx of [-1, 1]) {
    const sh = new THREE.Mesh(geo.shoulder, mat.shoulder);
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(sx * (X_OUTER_LINE + SHOULDER_WIDTH / 2), 0.005, 0);
    g.add(sh);
  }

  // Median floor (green strip in the middle)
  const medianFloor = new THREE.Mesh(geo.medianFloor, mat.median);
  medianFloor.rotation.x = -Math.PI / 2;
  medianFloor.position.y = 0.005;
  g.add(medianFloor);

  // Concrete median barriers (one each side of the median)
  for (const sx of [-1, 1]) {
    const bar = new THREE.Mesh(geo.medianBar, mat.concrete);
    bar.position.set(sx * (HALF_MEDIAN - 0.22), 0.28, 0);
    bar.castShadow = true;
    g.add(bar);
  }

  // Yellow median-edge lines
  for (const sx of [-1, 1]) {
    const yl = new THREE.Mesh(geo.solidLine, mat.yellow);
    yl.rotation.x = -Math.PI / 2;
    yl.position.set(sx * (X_INNER_LINE - 0.08), 0.02, 0);
    g.add(yl);
  }

  // Dashed lane dividers (between inner/outer lanes on each side)
  const dashCount = Math.floor(CHUNK_LENGTH / 8);
  for (let d = 0; d < dashCount; d++) {
    const zOff = -CHUNK_LENGTH / 2 + d * 8 + 4;
    for (const sx of [-1, 1]) {
      const dash = new THREE.Mesh(geo.dashLine, mat.white);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(sx * X_BETWEEN_LANE, 0.02, zOff);
      g.add(dash);
    }
  }

  // Solid white outer edge lines
  for (const sx of [-1, 1]) {
    const el = new THREE.Mesh(geo.edgeLine, mat.white);
    el.rotation.x = -Math.PI / 2;
    el.position.set(sx * X_OUTER_LINE, 0.02, 0);
    g.add(el);
  }

  // Guardrails (outer edges)
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(geo.rail, mat.steel);
    rail.position.set(sx * (X_SHOULDER_END + 0.15), 0.38, 0);
    rail.castShadow = true;
    g.add(rail);
  }
}

function buildStreetlights(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;
  for (const sx of [-1, 1]) {
    const xBase = sx * (X_SHOULDER_END + 1.5);
    const pole = new THREE.Mesh(geo.pole, mat.pole);
    pole.position.set(xBase, 3.5, -CHUNK_LENGTH / 4);
    pole.castShadow = true;
    g.add(pole);
    const arm = new THREE.Mesh(geo.arm, mat.pole);
    arm.position.set(xBase - sx * 1.5, 7, -CHUNK_LENGTH / 4);
    g.add(arm);
    const head = new THREE.Mesh(geo.head, mat.light);
    head.position.set(xBase - sx * 3.0, 7, -CHUNK_LENGTH / 4);
    g.add(head);
  }
}

// Build a flat angled ramp using a parent group:
// - parent group holds the world Y rotation (orientation in the X-Z plane)
// - child mesh lies flat (rotation.x = -π/2) in the group's local frame
// This guarantees the ramp stays horizontal regardless of the Y angle.
function buildAngledRamp(
  parent: THREE.Group, shared: Shared, anchorX: number, anchorZ: number, yawDeg: number,
) {
  const { geo, mat } = shared;
  const yawRad = (yawDeg * Math.PI) / 180;

  const rampGroup = new THREE.Group();
  rampGroup.position.set(anchorX, 0, anchorZ);
  rampGroup.rotation.y = yawRad;
  parent.add(rampGroup);

  const ramp = new THREE.Mesh(geo.rampRoad, mat.ramp);
  ramp.rotation.x = -Math.PI / 2;
  ramp.position.set(0, 0, 0);
  ramp.receiveShadow = true;
  rampGroup.add(ramp);
}

function buildRampOn(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;

  // Acceleration lane (extra lane on the right side of right shoulder)
  const accLane = new THREE.Mesh(geo.rampLane, mat.asphalt);
  accLane.rotation.x = -Math.PI / 2;
  accLane.position.set(X_SHOULDER_END + LANE_WIDTH / 2, 0.005, 0);
  accLane.receiveShadow = true;
  g.add(accLane);

  // Dashed merge line between shoulder edge and acceleration lane
  const dashCount = Math.floor(CHUNK_LENGTH / 6);
  for (let d = 0; d < dashCount; d++) {
    const zOff = -CHUNK_LENGTH / 2 + d * 6 + 3;
    const dash = new THREE.Mesh(geo.dashLine, mat.white);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(X_SHOULDER_END, 0.02, zOff);
    g.add(dash);
  }

  // Angled ramp road merging in from the right-rear (yaw rotates clockwise from above)
  buildAngledRamp(g, shared, X_SHOULDER_END + LANE_WIDTH + 8, -25, -25);

  addSign(g, shared, X_SHOULDER_END + 1.5, -CHUNK_LENGTH / 3);
}

function buildRampOff(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;

  const decLane = new THREE.Mesh(geo.rampLane, mat.asphalt);
  decLane.rotation.x = -Math.PI / 2;
  decLane.position.set(X_SHOULDER_END + LANE_WIDTH / 2, 0.005, 0);
  decLane.receiveShadow = true;
  g.add(decLane);

  const dashCount = Math.floor(CHUNK_LENGTH / 6);
  for (let d = 0; d < dashCount; d++) {
    const zOff = -CHUNK_LENGTH / 2 + d * 6 + 3;
    const dash = new THREE.Mesh(geo.dashLine, mat.white);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(X_SHOULDER_END, 0.02, zOff);
    g.add(dash);
  }

  // Angled ramp peeling out to the right-front (yaw counter-clockwise from above)
  buildAngledRamp(g, shared, X_SHOULDER_END + LANE_WIDTH + 8, 25, 25);

  addSign(g, shared, X_SHOULDER_END + 1.5, CHUNK_LENGTH / 3);
}

function buildTollPlaza(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;

  // Overhead gantry beam spanning the entire road
  const beam = new THREE.Mesh(geo.gantryBeam, mat.concrete);
  beam.position.set(0, 5.8, 0);
  beam.castShadow = true;
  g.add(beam);

  // Two vertical support pillars
  for (const sx of [-1, 1]) {
    const pillar = new THREE.Mesh(geo.gantryPillar, mat.concrete);
    pillar.position.set(sx * (ROAD_HALF + 1), 3.25, 0);
    pillar.castShadow = true;
    g.add(pillar);
  }

  // Toll booth in each of the 4 lanes (centered at lane centres)
  const laneCenters = [
    LANE_CENTER_INNER_R, LANE_CENTER_OUTER_R,
    LANE_CENTER_INNER_L, LANE_CENTER_OUTER_L,
  ];
  for (const lx of laneCenters) {
    const booth = new THREE.Mesh(geo.tollBooth, mat.tollWall);
    booth.position.set(lx, 1.4, 0);
    booth.castShadow = true;
    g.add(booth);

    const roof = new THREE.Mesh(geo.tollRoof, mat.tollRoof);
    roof.position.set(lx, 2.925, 0);
    g.add(roof);

    const win = new THREE.Mesh(geo.tollWindow, mat.tollWin);
    // Window facing -Z (toward player approaching from -Z is irrelevant since
    // player drives in +Z; window faces both sides via separate window slabs)
    win.position.set(lx, 1.5, 2.05);
    g.add(win);
    const win2 = new THREE.Mesh(geo.tollWindow, mat.tollWin);
    win2.position.set(lx, 1.5, -2.05);
    g.add(win2);
  }

  // Approach cones leading up to booths (10m, 16m, 22m before the booth on -Z side)
  for (let i = 0; i < 3; i++) {
    const z = -10 - i * 6;
    for (const lx of laneCenters) {
      const cone = new THREE.Mesh(geo.cone, mat.orange);
      cone.position.set(lx, 0.35, z);
      g.add(cone);
    }
  }
}

function buildOverpass(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;
  // Bridge crosses ABOVE the elevated highway (Y=9), so place it at Y=15
  const bridgeY = 15;

  // Bridge deck: PlaneGeometry(80, 12) laid flat → spans 80 along X, 12 along Z
  const deck = new THREE.Mesh(geo.bridgeDeck, mat.asphalt);
  deck.rotation.x = -Math.PI / 2;
  deck.position.set(0, bridgeY, 0);
  deck.receiveShadow = true;
  g.add(deck);

  // Bridge guardrails (BoxGeometry 80 along X, no extra rotation)
  for (const zEdge of [-6, 6]) {
    const rail = new THREE.Mesh(geo.bridgeRail, mat.steel);
    rail.position.set(0, bridgeY + 0.45, zEdge);
    rail.castShadow = true;
    g.add(rail);
  }

  // 4 support pillars — span from ground (Y=0) up to the bridge underside (Y=bridgeY)
  for (const px of [-22, 22]) {
    for (const pz of [-4, 4]) {
      const pillar = new THREE.Mesh(geo.pillar, mat.concrete);
      pillar.position.set(px, bridgeY / 2, pz);
      pillar.castShadow = true;
      g.add(pillar);
      const cap = new THREE.Mesh(geo.pillarCap, mat.concrete);
      cap.position.set(px, bridgeY - 0.25, pz);
      g.add(cap);
    }
  }

  // Bridge yellow centre line (running along X direction since the bridge spans X)
  // We want a line at Z=0 on the bridge, ~70 long along X, thin in Z.
  const centerLine = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 0.2),
    mat.yellow
  );
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, bridgeY + 0.01, 0);
  g.add(centerLine);
}

/* ─────────────────────────────────────────────
 * Seeded random for deterministic prop placement
 * ───────────────────────────────────────────── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function pickBuilding(rng: () => number, shared: Shared) {
  const r = rng();
  const geo = shared.geo;
  const mat = shared.mat;
  if (r < 0.25) return { g: geo.buildingSmall, m: mat.buildingA, hHalf: 3 };
  if (r < 0.55) return { g: geo.buildingMed, m: mat.buildingB, hHalf: 6 };
  if (r < 0.85) return { g: geo.buildingWide, m: mat.buildingC, hHalf: 4 };
  return { g: geo.buildingTall, m: mat.buildingD, hHalf: 11 };
}

/* ─────────────────────────────────────────────
 * Roadside decorations: buildings, trees, hills, cross streets
 * ───────────────────────────────────────────── */

function addRoadsideDecorations(g: THREE.Group, shared: Shared, idx: number) {
  const rng = mulberry32(Math.abs(idx) * 7919 + 13);
  const { geo, mat } = shared;

  // ── Buildings: 2-4 per side, placed beyond the grass strip ──
  for (const side of [-1, 1] as const) {
    const count = 2 + Math.floor(rng() * 3); // 2..4
    for (let i = 0; i < count; i++) {
      const b = pickBuilding(rng, shared);
      const bx = side * (25 + rng() * 30); // 25-55 away from centre
      const bz = -CHUNK_LENGTH / 2 + rng() * CHUNK_LENGTH;
      const building = new THREE.Mesh(b.g, b.m);
      building.position.set(bx, b.hHalf, bz);
      // Slight per-instance variety: a tiny Y rotation
      building.rotation.y = rng() * Math.PI * 2;
      building.castShadow = true;
      building.receiveShadow = true;
      g.add(building);
    }
  }

  // ── Trees: 4-8 scattered in the grass area ──
  const treeCount = 4 + Math.floor(rng() * 5);
  for (let i = 0; i < treeCount; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    const tx = side * (16 + rng() * 14); // 16-30 from centre (closer in than buildings)
    const tz = -CHUNK_LENGTH / 2 + rng() * CHUNK_LENGTH;
    const trunk = new THREE.Mesh(geo.treeTrunk, mat.trunkMat);
    trunk.position.set(tx, 1.5, tz);
    trunk.castShadow = true;
    g.add(trunk);
    const canopy = new THREE.Mesh(geo.treeCanopy, mat.canopyMat);
    canopy.position.set(tx, 3.6, tz);
    canopy.scale.set(0.8 + rng() * 0.6, 0.8 + rng() * 0.6, 0.8 + rng() * 0.6);
    canopy.castShadow = true;
    g.add(canopy);
  }

  // ── Distant hill on one side every ~6 chunks ──
  if (Math.abs(idx) % 6 === 0) {
    const side = rng() < 0.5 ? -1 : 1;
    const hill = new THREE.Mesh(geo.hill, mat.hillMat);
    hill.position.set(side * 95, 11, (rng() - 0.5) * CHUNK_LENGTH);
    hill.castShadow = true;
    hill.receiveShadow = true;
    g.add(hill);
  }
}

/* ─────────────────────────────────────────────
 * Cross street (perpendicular road in the grass)
 * Generates a 2-lane perpendicular road visible from the highway every
 * CROSS_STREET_PERIOD chunks. The cross road runs along X axis.
 * ───────────────────────────────────────────── */

const CROSS_STREET_PERIOD = 6; // every Nth chunk has a cross street

function addCrossStreet(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;

  // Cross street pavement
  const street = new THREE.Mesh(geo.crossStreet, mat.asphalt);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.005, 0); // centre of chunk, perpendicular to highway
  street.receiveShadow = true;
  g.add(street);

  // Yellow centre line running along X
  const line = new THREE.Mesh(geo.crossLine, mat.yellow);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.025, 0);
  g.add(line);

  // Edge curbs on the cross street (along X, on +/- Z edges)
  // Use a slim box geometry inline (rare object, no need to share)
  for (const zEdge of [-4.5, 4.5]) {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(110, 0.18, 0.3),
      mat.shoulder
    );
    curb.position.set(0, 0.09, zEdge);
    g.add(curb);
  }
}

function addSign(g: THREE.Group, shared: Shared, x: number, z: number) {
  const { geo, mat } = shared;
  const pole = new THREE.Mesh(geo.signPole, mat.pole);
  pole.position.set(x, 2.5, z);
  pole.castShadow = true;
  g.add(pole);
  const board = new THREE.Mesh(geo.signBoard, mat.sign);
  board.position.set(x, 5.5, z);
  g.add(board);
}

/* ─────────────────────────────────────────────
 * Elevated highway (Y = ELEVATED_Y, parallel to ground)
 * ───────────────────────────────────────────── */

function buildElevatedHighway(g: THREE.Group, shared: Shared, idx: number, skipPillars: boolean) {
  const { geo, mat } = shared;

  // ── Deck surface ──
  const deck = new THREE.Mesh(geo.eRoad, mat.asphalt);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = ELEVATED_Y;
  deck.receiveShadow = true;
  g.add(deck);

  // ── Median (slim concrete strip) ──
  const med = new THREE.Mesh(geo.eMedian, mat.concrete);
  med.rotation.x = -Math.PI / 2;
  med.position.y = ELEVATED_Y + 0.01;
  g.add(med);

  // Yellow median-edge lines
  for (const sx of [-1, 1]) {
    const yl = new THREE.Mesh(geo.eEdgeLine, mat.yellow);
    yl.rotation.x = -Math.PI / 2;
    yl.position.set(sx * (E_HALF_MEDIAN + 0.05), ELEVATED_Y + 0.02, 0);
    g.add(yl);
  }

  // Dashed lane dividers between inner/outer lanes (each side)
  const dashCount = Math.floor(CHUNK_LENGTH / 7);
  for (let d = 0; d < dashCount; d++) {
    const zOff = -CHUNK_LENGTH / 2 + d * 7 + 3.5;
    for (const sx of [-1, 1]) {
      const dash = new THREE.Mesh(geo.eDash, mat.white);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(sx * (E_HALF_MEDIAN + E_LANE_WIDTH), ELEVATED_Y + 0.02, zOff);
      g.add(dash);
    }
  }

  // White outer edge lines
  for (const sx of [-1, 1]) {
    const el = new THREE.Mesh(geo.eEdgeLine, mat.white);
    el.rotation.x = -Math.PI / 2;
    el.position.set(sx * E_OUTER_EDGE, ELEVATED_Y + 0.02, 0);
    g.add(el);
  }

  // ── Side guardrails (tall, modern look) ──
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(geo.eRail, mat.steel);
    rail.position.set(sx * (E_HALF_WIDTH + 0.1), ELEVATED_Y + 0.5, 0);
    rail.castShadow = true;
    g.add(rail);
  }

  // ── Support pillars (skip on chunks where pillars would clip into toll booths / overpass) ──
  if (!skipPillars) {
    // 4 pillar-pairs per 80m chunk = 8 pillars per chunk. Pillars at X = ±13.5
    // (just outside the ground highway shoulder, between road and grass) so they
    // do NOT clip into ground highway lanes or toll booths.
    for (let s = 0; s < 4; s++) {
      const zOff = -CHUNK_LENGTH / 2 + 10 + s * 20;
      for (const sx of [-1, 1]) {
        const pillar = new THREE.Mesh(geo.ePillar, mat.concrete);
        pillar.position.set(sx * 13.5, ELEVATED_Y / 2, zOff);
        pillar.castShadow = true;
        g.add(pillar);
      }
      // Wide cross-beam at the top of the pillars, connecting them under the deck
      const cap = new THREE.Mesh(geo.ePillarCap, mat.concrete);
      cap.position.set(0, ELEVATED_Y - 0.6, zOff);
      cap.castShadow = true;
      g.add(cap);
    }
  }

  // ── Cross-beam under the deck every 10m (extra structural detail) ──
  for (let s = 0; s < 8; s++) {
    const zOff = -CHUNK_LENGTH / 2 + 5 + s * 10;
    const beam = new THREE.Mesh(geo.eUnderBeam, mat.concrete);
    beam.position.set(0, ELEVATED_Y - 0.25, zOff);
    g.add(beam);
  }

  // ── Streetlights on elevated highway (alternate chunks) ──
  if (Math.abs(idx) % 2 === 1) {
    for (const sx of [-1, 1]) {
      const pole = new THREE.Mesh(geo.pole, mat.pole);
      pole.position.set(sx * (E_HALF_WIDTH + 0.5), ELEVATED_Y + 3.5, 0);
      pole.castShadow = true;
      g.add(pole);
      const head = new THREE.Mesh(geo.head, mat.light);
      head.position.set(sx * (E_HALF_WIDTH - 0.5), ELEVATED_Y + 6.5, 0);
      g.add(head);
    }
  }
}

/* ─────────────────────────────────────────────
 * Up-ramp from ground → elevated
 * The ramp surface is tilted: low Y at -Z end, high Y at +Z end.
 * Located on the RIGHT side of the highway, between ground and elevated.
 * ───────────────────────────────────────────── */

function buildElevatedRampUp(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;
  const slope = Math.atan2(ELEVATED_Y, 80); // rise/run

  // Position the ramp on the right side, between ground highway shoulder and elevated edge
  const rampX = X_SHOULDER_END + 4;
  const ramp = new THREE.Mesh(geo.rampSurface, mat.asphalt);
  ramp.rotation.x = -Math.PI / 2 - slope;
  ramp.position.set(rampX, ELEVATED_Y / 2, 0);
  ramp.receiveShadow = true;
  g.add(ramp);

  // Ramp guardrails (tilted to match the ramp)
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(geo.rampRail, mat.steel);
    rail.rotation.x = -slope;
    rail.position.set(rampX + sx * 2.1, ELEVATED_Y / 2 + 0.5, 0);
    g.add(rail);
  }

  // Sign at the bottom of the ramp indicating "↑ 上高架"
  addSign(g, shared, rampX, -CHUNK_LENGTH / 2 + 5);

  // Yellow arrow markings on the ramp (small painted arrow pattern)
  for (let i = 0; i < 5; i++) {
    const localZ = -35 + i * 15; // along the ramp's Z axis
    // Position the arrow on the tilted plane
    const arrow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.4, 1.4),
      mat.yellow
    );
    arrow.rotation.x = -Math.PI / 2 - slope;
    arrow.position.set(
      rampX,
      ELEVATED_Y / 2 + (localZ / 80) * ELEVATED_Y + 0.05,
      localZ * Math.cos(slope)
    );
    g.add(arrow);
  }
}

/* ─────────────────────────────────────────────
 * Down-ramp from elevated → ground
 * Tilted opposite direction: high Y at -Z end, low Y at +Z end.
 * ───────────────────────────────────────────── */

function buildElevatedRampDown(g: THREE.Group, shared: Shared) {
  const { geo, mat } = shared;
  const slope = Math.atan2(ELEVATED_Y, 80);

  const rampX = X_SHOULDER_END + 4;
  const ramp = new THREE.Mesh(geo.rampSurface, mat.asphalt);
  ramp.rotation.x = -Math.PI / 2 + slope; // opposite tilt
  ramp.position.set(rampX, ELEVATED_Y / 2, 0);
  ramp.receiveShadow = true;
  g.add(ramp);

  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(geo.rampRail, mat.steel);
    rail.rotation.x = slope;
    rail.position.set(rampX + sx * 2.1, ELEVATED_Y / 2 + 0.5, 0);
    g.add(rail);
  }

  // Sign at the top of the ramp indicating "↓ 下高架"
  addSign(g, shared, rampX, -CHUNK_LENGTH / 2 + 5);
}

function buildChunk(idx: number, shared: Shared): THREE.Group {
  const g = new THREE.Group();
  g.name = `hwy_${idx}`;
  g.position.set(0, 0, idx * CHUNK_LENGTH);

  // Base ground highway is always present
  buildStraightBase(g, shared);
  if (Math.abs(idx) % 2 === 0) buildStreetlights(g, shared);

  const type = getChunkType(idx);

  // Elevated highway is always present (with pillars/support running parallel above).
  // Skip pillars on TOLL chunks (would clip into the gantry pillars) and on OVERPASS
  // chunks (would clip into the overpass support pillars).
  const skipElevatedPillars = type === 'TOLL' || type === 'OVERPASS';
  buildElevatedHighway(g, shared, idx, skipElevatedPillars);

  if (type === 'RAMP_ON')        buildRampOn(g, shared);
  if (type === 'RAMP_OFF')       buildRampOff(g, shared);
  if (type === 'TOLL')           buildTollPlaza(g, shared);
  if (type === 'OVERPASS')       buildOverpass(g, shared);
  if (type === 'ELEVATED_UP')    buildElevatedRampUp(g, shared);
  if (type === 'ELEVATED_DOWN')  buildElevatedRampDown(g, shared);

  // Always add roadside decorations (buildings, trees, hills) — deterministic per chunk
  addRoadsideDecorations(g, shared, idx);

  // Occasional cross street: skip on chunks that already have a special structure
  // to avoid visual conflicts with toll plaza / overpass / ramp roads
  const isSpecial = type !== 'STRAIGHT';
  if (!isSpecial && Math.abs(idx) % CROSS_STREET_PERIOD === 3) {
    addCrossStreet(g, shared);
  }

  return g;
}

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export function HighwayNetworkSystem() {
  const containerRef = useRef<THREE.Group>(null);
  const chunkMapRef = useRef<Map<number, THREE.Group>>(new Map());
  const playerChunkRef = useRef<number>(Number.MIN_SAFE_INTEGER);

  // Shared resources created once
  const shared = useMemo(() => makeShared(), []);

  // Stream chunks every frame based on player Z
  useFrame(() => {
    const { playerPosition } = useWorldStore.getState();
    const targetChunk = Math.floor(playerPosition.z / CHUNK_LENGTH);

    if (targetChunk === playerChunkRef.current) return;
    playerChunkRef.current = targetChunk;

    const loadStart = targetChunk - LOAD_BEHIND;
    const loadEnd = targetChunk + LOAD_AHEAD;

    // Spawn missing chunks
    for (let i = loadStart; i <= loadEnd; i++) {
      if (!chunkMapRef.current.has(i)) {
        const chunk = buildChunk(i, shared);
        chunkMapRef.current.set(i, chunk);
        containerRef.current?.add(chunk);
      }
    }

    // Remove distant chunks (no geometry disposal — geometries are shared
    // singletons, materials are shared. Inline geometries become garbage and
    // are collected when no mesh references them).
    const toRemove: number[] = [];
    chunkMapRef.current.forEach((chunk, idx) => {
      if (idx < loadStart - 2 || idx > loadEnd + 2) {
        containerRef.current?.remove(chunk);
        // Dispose any per-chunk inline geometries (those NOT in shared)
        chunk.traverse(child => {
          const m = child as THREE.Mesh;
          if (!m.isMesh) return;
          // Walk through every shared geometry; if mesh.geometry isn't one of
          // them, it's inline and safe to dispose.
          const geo = m.geometry;
          const isShared = Object.values(shared.geo).includes(geo as never);
          if (!isShared) geo.dispose();
        });
        toRemove.push(idx);
      }
    });
    toRemove.forEach(idx => chunkMapRef.current.delete(idx));
  });

  // Dispose shared resources on unmount
  useEffect(() => () => {
    Object.values(shared.geo).forEach(g => g.dispose());
    Object.values(shared.mat).forEach(m => m.dispose());
    chunkMapRef.current.clear();
  }, [shared]);

  return <group ref={containerRef} />;
}
