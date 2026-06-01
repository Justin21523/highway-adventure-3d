export const DRIVE_CHUNK_SIZE = 100;
export const DRIVE_ELEVATED_Y = 9;
export const DRIVE_ELEVATED_X = 20.4;
export const DRIVE_ELEVATED_WIDTH = 18;
export const DRIVE_ELEVATED_RAMP_X = DRIVE_ELEVATED_X;
export const DRIVE_ACCESS_RAMP_LENGTH = 86;
export const DRIVE_ACCESS_RAMP_WIDTH = 7;

export type DriveChunkType =
  | 'STRAIGHT'
  | 'RAMP_ON'
  | 'RAMP_OFF'
  | 'TOLL'
  | 'OVERPASS'
  | 'ELEVATED_UP'
  | 'ELEVATED_DOWN'
  | 'CURVE'
  | 'ROTATING_INTERCHANGE';

export interface DriveSurfaceSample {
  playerY: number;
  elevation: number;
  isElevated: boolean;
}

export interface DriveAccessRamp {
  axis: 'x' | 'z';
  centerX: number;
  centerZ: number;
  up: boolean;
  seed: number;
}

export interface DriveRingAnchor {
  x: number;
  z: number;
  radius: number;
  elevated: boolean;
}

function driveHash2(cx: number, cz: number, salt = 0) {
  return ((cx * 73856093) ^ (cz * 19349663) ^ (salt * 83492791)) >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function driveElevatedRouteX(route: number, z: number) {
  const base = route * 520 + 210;
  return base + Math.sin(z * 0.0045 + route * 1.11) * 35;
}

export function driveElevatedRouteZ(route: number, x: number) {
  const base = route * 620 + 180;
  return base + Math.cos(x * 0.004 + route * 1.41) * 40;
}

export function driveRingAnchor(cellX: number, cellZ: number): DriveRingAnchor {
  const rng = mulberry32(driveHash2(cellX, cellZ, 70));
  return {
    x: cellX * 680 + (rng() - 0.5) * 130,
    z: cellZ * 680 + (rng() - 0.5) * 130,
    radius: 105 + rng() * 55,
    elevated: rng() > 0.66,
  };
}

export function getDriveChunkType(idx: number): DriveChunkType {
  const abs = Math.abs(idx);
  if (abs === 0) return 'STRAIGHT';
  // Big features placed first so the more-frequent ramp pattern doesn't override them.
  if (abs % 28 === 14) return 'OVERPASS';
  // Rare rotating interchange and periodic sweeping curve add visual variety beside
  // the straight deck. Both keep the drivable surface flat (see sampleDriveSurface),
  // so they are purely decorative flourishes.
  if (abs % 32 === 16) return 'ROTATING_INTERCHANGE';
  if (abs % 20 === 10) return 'TOLL';
  if (abs % 14 === 7) return 'CURVE';
  // Elevated up/down ramps are now denser (every 6 chunks instead of 10) so
  // the player encounters more "上下高架" transitions while driving.
  if (abs % 6 === 3) return 'ELEVATED_UP';
  if (abs % 6 === 0) return 'ELEVATED_DOWN';
  // Surface on/off ramps spaced every 4 chunks (was 8).
  if (abs % 4 === 2) return 'RAMP_ON';
  if (abs % 4 === 1) return 'RAMP_OFF';
  return 'STRAIGHT';
}

function isNearMainElevatedDeck(x: number) {
  return Math.abs(x - DRIVE_ELEVATED_X) <= DRIVE_ELEVATED_WIDTH / 2 + 1.5;
}

function isNearElevatedNetwork(x: number, z: number) {
  const halfWidth = DRIVE_ELEVATED_WIDTH / 2 + 1.5;
  const routeXBase = Math.round((x - 210) / 520);
  for (let route = routeXBase - 1; route <= routeXBase + 1; route++) {
    if (Math.abs(x - driveElevatedRouteX(route, z)) <= halfWidth) return true;
  }

  const routeZBase = Math.round((z - 180) / 620);
  for (let route = routeZBase - 1; route <= routeZBase + 1; route++) {
    if (Math.abs(z - driveElevatedRouteZ(route, x)) <= halfWidth) return true;
  }

  const cellX = Math.round(x / 680);
  const cellZ = Math.round(z / 680);
  for (let ax = cellX - 1; ax <= cellX + 1; ax++) {
    for (let az = cellZ - 1; az <= cellZ + 1; az++) {
      const anchor = driveRingAnchor(ax, az);
      if (!anchor.elevated) continue;
      const dist = Math.hypot(x - anchor.x, z - anchor.z);
      if (Math.abs(dist - anchor.radius) <= halfWidth) return true;
    }
  }

  return false;
}

function collectAccessRampCandidates(x: number, z: number): DriveAccessRamp[] {
  const ramps: DriveAccessRamp[] = [];
  const verticalRouteBase = Math.round((x - 210) / 520);
  const verticalRampBase = Math.round(z / 500);
  for (let route = verticalRouteBase - 1; route <= verticalRouteBase + 1; route++) {
    for (let rz = verticalRampBase - 1; rz <= verticalRampBase + 1; rz++) {
      const centerZ = rz * 500 + route * 95;
      ramps.push({
        axis: 'z',
        centerX: driveElevatedRouteX(route, centerZ),
        centerZ,
        up: (route + rz) % 2 === 0,
        seed: driveHash2(route, rz, 301),
      });
    }
  }

  const horizontalRouteBase = Math.round((z - 180) / 620);
  const horizontalRampBase = Math.round(x / 520);
  for (let route = horizontalRouteBase - 1; route <= horizontalRouteBase + 1; route++) {
    for (let rx = horizontalRampBase - 1; rx <= horizontalRampBase + 1; rx++) {
      const centerX = rx * 520 + route * 85;
      ramps.push({
        axis: 'x',
        centerX,
        centerZ: driveElevatedRouteZ(route, centerX),
        up: (route + rx) % 2 !== 0,
        seed: driveHash2(route, rx, 302),
      });
    }
  }

  const cellX = Math.round(x / 680);
  const cellZ = Math.round(z / 680);
  for (let ax = cellX - 1; ax <= cellX + 1; ax++) {
    for (let az = cellZ - 1; az <= cellZ + 1; az++) {
      const anchor = driveRingAnchor(ax, az);
      if (!anchor.elevated) continue;
      ramps.push(
        {
          axis: 'z',
          centerX: anchor.x + anchor.radius,
          centerZ: anchor.z,
          up: (ax + az) % 2 === 0,
          seed: driveHash2(ax, az, 401),
        },
        {
          axis: 'z',
          centerX: anchor.x - anchor.radius,
          centerZ: anchor.z,
          up: (ax + az) % 2 !== 0,
          seed: driveHash2(ax, az, 402),
        },
        {
          axis: 'x',
          centerX: anchor.x,
          centerZ: anchor.z + anchor.radius,
          up: (ax - az) % 2 === 0,
          seed: driveHash2(ax, az, 403),
        },
        {
          axis: 'x',
          centerX: anchor.x,
          centerZ: anchor.z - anchor.radius,
          up: (ax - az) % 2 !== 0,
          seed: driveHash2(ax, az, 404),
        },
      );
    }
  }

  return ramps;
}

export function getDriveAccessRampsForChunk(cx: number, cz: number): DriveAccessRamp[] {
  const centerX = cx * DRIVE_CHUNK_SIZE;
  const centerZ = cz * DRIVE_CHUNK_SIZE;
  const minX = centerX - DRIVE_CHUNK_SIZE / 2;
  const maxX = centerX + DRIVE_CHUNK_SIZE / 2;
  const minZ = centerZ - DRIVE_CHUNK_SIZE / 2;
  const maxZ = centerZ + DRIVE_CHUNK_SIZE / 2;
  const candidates = collectAccessRampCandidates(centerX, centerZ);
  const seen = new Set<number>();

  return candidates.filter((ramp) => {
    if (seen.has(ramp.seed)) return false;
    seen.add(ramp.seed);
    return (
      ramp.centerX >= minX &&
      ramp.centerX < maxX &&
      ramp.centerZ >= minZ &&
      ramp.centerZ < maxZ
    );
  });
}

function sampleAccessRamp(x: number, z: number): number | null {
  const ramps = collectAccessRampCandidates(x, z);
  const halfLength = DRIVE_ACCESS_RAMP_LENGTH / 2;
  const halfWidth = DRIVE_ACCESS_RAMP_WIDTH / 2;

  for (const ramp of ramps) {
    const along = ramp.axis === 'z' ? z - ramp.centerZ : x - ramp.centerX;
    const lateral = ramp.axis === 'z' ? x - ramp.centerX : z - ramp.centerZ;
    if (Math.abs(lateral) > halfWidth || along < -halfLength || along > halfLength) continue;

    const t = (along + halfLength) / DRIVE_ACCESS_RAMP_LENGTH;
    return (ramp.up ? t : 1 - t) * DRIVE_ELEVATED_Y;
  }

  return null;
}

export function sampleDriveSurface(
  x: number,
  z: number,
  wasElevated: boolean,
): DriveSurfaceSample {
  const chunkIdx = Math.round(z / DRIVE_CHUNK_SIZE);
  const localZ = z - chunkIdx * DRIVE_CHUNK_SIZE;
  const type = getDriveChunkType(chunkIdx);
  const onRampX = Math.abs(x - DRIVE_ELEVATED_RAMP_X) <= 3.2;
  const rampProgress = Math.max(0, Math.min(1, (localZ + 45) / 90));

  if (onRampX && type === 'ELEVATED_UP') {
    const elevation = rampProgress * DRIVE_ELEVATED_Y;
    return {
      playerY: elevation + 0.5,
      elevation,
      isElevated: elevation > DRIVE_ELEVATED_Y * 0.65,
    };
  }

  if (onRampX && type === 'ELEVATED_DOWN') {
    const elevation = (1 - rampProgress) * DRIVE_ELEVATED_Y;
    return {
      playerY: elevation + 0.5,
      elevation,
      isElevated: elevation > DRIVE_ELEVATED_Y * 0.35,
    };
  }

  const accessRampElevation = sampleAccessRamp(x, z);
  if (accessRampElevation !== null) {
    return {
      playerY: accessRampElevation + 0.5,
      elevation: accessRampElevation,
      isElevated: accessRampElevation > DRIVE_ELEVATED_Y * 0.45,
    };
  }

  if (wasElevated && (isNearMainElevatedDeck(x) || isNearElevatedNetwork(x, z))) {
    return {
      playerY: DRIVE_ELEVATED_Y + 0.5,
      elevation: DRIVE_ELEVATED_Y,
      isElevated: true,
    };
  }

  return {
    playerY: 0.5,
    elevation: 0,
    isElevated: false,
  };
}
