// src/components/ui/MinimapRenderer.tsx
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useWorldStore } from '../../stores/worldStore';
import {
  DRIVE_ACCESS_RAMP_LENGTH,
  DRIVE_ACCESS_RAMP_WIDTH,
  DRIVE_CHUNK_SIZE,
  DRIVE_ELEVATED_WIDTH,
  DRIVE_ELEVATED_Y,
  driveElevatedRouteX,
  driveElevatedRouteZ,
  driveRingAnchor,
  getDriveAccessRampsForChunk,
  getDriveChunkType,
  type DriveChunkType,
} from '../../utils/driveSurface';
import type { RoadSegment } from '../../types/world';

type MapMode = 'follow' | 'north';

const PANEL_SIZE = 216;
const WORLD_SCALE = 0.24;
const HEIGHT_SKEW = 3.6;
const ROAD_STATUS_COLORS: Record<string, string> = {
  ground: 'rgba(148, 163, 184, 0.92)',
  highway: 'rgba(203, 213, 225, 0.95)',
  elevated: 'rgba(56, 189, 248, 0.92)',
  ramp: 'rgba(34, 197, 94, 0.92)',
  toll: 'rgba(234, 179, 8, 0.95)',
  special: 'rgba(167, 139, 250, 0.88)',
};

interface MapPoint {
  x: number;
  y: number;
}

interface SegmentStyle {
  color: string;
  width: number;
  elevation: number;
  dash?: number[];
  label?: string;
}

export function MinimapRenderer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mode, setMode] = useState<MapMode>('follow');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = PANEL_SIZE * dpr;
    canvas.height = PANEL_SIZE * dpr;
    canvas.style.width = `${PANEL_SIZE}px`;
    canvas.style.height = `${PANEL_SIZE}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    let raf = 0;
    const render = () => {
      const ctx = ctxRef.current;
      if (ctx) drawMap(ctx, mode, zoom);
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [mode, zoom]);

  const panelClass = collapsed
    ? 'h-11 w-11'
    : 'h-[280px] w-[236px] sm:h-[292px] sm:w-[252px]';

  return (
    <div className={`pointer-events-none fixed right-4 top-20 z-40 select-none transition-all ${panelClass}`}>
      <div
        className={`relative h-full w-full overflow-hidden rounded-lg border border-slate-600/80 bg-slate-950/80 shadow-2xl backdrop-blur-md transition-all ${
          collapsed ? 'p-0' : 'p-2'
        }`}
      >
        <button
          type="button"
          data-ui-interactive="true"
          aria-label={collapsed ? 'Expand navigation map' : 'Collapse navigation map'}
          onClick={() => setCollapsed((value) => !value)}
          onPointerDown={(e) => e.stopPropagation()}
          className={`pointer-events-auto absolute right-1.5 top-1.5 z-10 flex items-center justify-center rounded border border-slate-500 bg-slate-900/95 text-xs font-bold text-slate-100 hover:bg-slate-700 ${
            collapsed ? 'h-8 w-8' : 'h-7 w-7'
          }`}
        >
          {collapsed ? 'MAP' : '-'}
        </button>

        {!collapsed && (
          <>
            <div className="mb-2 flex h-7 items-center gap-1 pr-8">
              <button
                type="button"
                data-ui-interactive="true"
                onClick={() => setMode((value) => (value === 'follow' ? 'north' : 'follow'))}
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto h-7 rounded border border-slate-600 bg-slate-900 px-2 text-[10px] font-bold text-slate-200 hover:bg-slate-700"
              >
                {mode === 'follow' ? 'FOLLOW' : 'NORTH'}
              </button>
              <button
                type="button"
                data-ui-interactive="true"
                onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.25).toFixed(2))))}
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-900 text-sm font-bold text-slate-200 hover:bg-slate-700"
              >
                -
              </button>
              <button
                type="button"
                data-ui-interactive="true"
                onClick={() => setZoom((value) => Math.min(1.75, Number((value + 0.25).toFixed(2))))}
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded border border-slate-600 bg-slate-900 text-sm font-bold text-slate-200 hover:bg-slate-700"
              >
                +
              </button>
              <div className="ml-auto text-[10px] font-bold text-slate-400">{Math.round(zoom * 100)}%</div>
            </div>

            <canvas
              ref={canvasRef}
              className="block rounded-md border border-slate-700 bg-slate-950/70"
            />

            <MapReadout />
          </>
        )}
      </div>
    </div>
  );
}

function MapReadout() {
  const speed = useGameStore((state) => Math.round(state.vehicle.speed));
  const fuel = useGameStore((state) => Math.round(state.vehicle.fuel));

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-300">
      <div className="rounded border border-slate-700 bg-slate-900/80 px-2 py-1">
        <span className="text-slate-500">SPD</span> {speed} KM/H
      </div>
      <div className={`rounded border px-2 py-1 ${fuel < 20 ? 'border-red-500 bg-red-950/70 text-red-200' : 'border-slate-700 bg-slate-900/80'}`}>
        <span className="text-slate-500">FUEL</span> {fuel}%
      </div>
    </div>
  );
}

function drawMap(ctx: CanvasRenderingContext2D, mode: MapMode, zoom: number) {
  const state = useGameStore.getState();
  const { x, z } = state.playerPosition;
  const heading = state.vehicle.rotation.y || state.vehicle.headingAngle || 0;
  const scale = WORLD_SCALE * zoom;
  const center = PANEL_SIZE / 2;

  ctx.clearRect(0, 0, PANEL_SIZE, PANEL_SIZE);
  drawBackground(ctx);

  ctx.save();
  ctx.translate(center, center);
  if (mode === 'follow') ctx.rotate(-heading);
  ctx.scale(scale, scale);

  drawRoadSurfaceNetwork(ctx, x, z);
  drawWorldStoreRoads(ctx, x, z);
  drawSpecialRoadStateLabels(ctx, x, z);

  ctx.restore();

  drawLegend(ctx);
  drawCompass(ctx, heading, mode);
  drawPlayerArrow(ctx, center);
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, PANEL_SIZE, PANEL_SIZE);
  gradient.addColorStop(0, 'rgba(15, 23, 42, 0.98)');
  gradient.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, PANEL_SIZE, PANEL_SIZE);

  ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
  ctx.lineWidth = 1;
  for (let i = 24; i < PANEL_SIZE; i += 24) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, PANEL_SIZE);
    ctx.moveTo(0, i);
    ctx.lineTo(PANEL_SIZE, i);
    ctx.stroke();
  }
}

function project(dx: number, dz: number, elevation = 0): MapPoint {
  return {
    x: dx,
    y: dz - elevation * HEIGHT_SKEW,
  };
}

function strokeRoad(ctx: CanvasRenderingContext2D, points: MapPoint[], style: SegmentStyle) {
  if (points.length < 2) return;

  if (style.elevation > 0) {
    ctx.save();
    ctx.translate(style.elevation * 0.55, style.elevation * 0.9);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.lineWidth = style.width + 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (style.dash) ctx.setLineDash(style.dash);
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.strokeStyle = style.elevation > 0 ? 'rgba(224, 242, 254, 0.75)' : 'rgba(15, 23, 42, 0.55)';
  ctx.lineWidth = Math.max(1.5, style.width * 0.16);
  if (style.dash) ctx.setLineDash(style.dash);
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRoadSurfaceNetwork(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  drawMainHighway(ctx, playerX, playerZ);
  drawElevatedRoutes(ctx, playerX, playerZ);
  drawRingRoads(ctx, playerX, playerZ);
  drawAccessRamps(ctx, playerX, playerZ);
}

function drawMainHighway(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  const points = [
    project(-playerX, -560),
    project(-playerX, 760),
  ];
  strokeRoad(ctx, points, { color: ROAD_STATUS_COLORS.highway, width: 29, elevation: 0 });
  strokeRoad(ctx, points, { color: 'rgba(30, 41, 59, 0.45)', width: 2, elevation: 0, dash: [18, 14] });

  const chunkZ = Math.floor(playerZ / DRIVE_CHUNK_SIZE);
  for (let zc = chunkZ - 5; zc <= chunkZ + 7; zc++) {
    const type = getDriveChunkType(zc);
    if (type !== 'TOLL' && type !== 'OVERPASS') continue;
    const dz = zc * DRIVE_CHUNK_SIZE + DRIVE_CHUNK_SIZE / 2 - playerZ;
    const color = type === 'TOLL' ? ROAD_STATUS_COLORS.toll : ROAD_STATUS_COLORS.special;
    strokeRoad(ctx, [project(-playerX, dz - 26), project(-playerX, dz + 26)], {
      color,
      width: 35,
      elevation: type === 'OVERPASS' ? 2 : 0,
    });
  }
}

function drawElevatedRoutes(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  const verticalBase = Math.round((playerX - 210) / 520);
  for (let route = verticalBase - 1; route <= verticalBase + 1; route++) {
    const points: MapPoint[] = [];
    for (let z = playerZ - 620; z <= playerZ + 820; z += 32) {
      points.push(project(driveElevatedRouteX(route, z) - playerX, z - playerZ, DRIVE_ELEVATED_Y));
    }
    strokeRoad(ctx, points, {
      color: ROAD_STATUS_COLORS.elevated,
      width: DRIVE_ELEVATED_WIDTH * 0.62,
      elevation: DRIVE_ELEVATED_Y,
    });
  }

  const horizontalBase = Math.round((playerZ - 180) / 620);
  for (let route = horizontalBase - 1; route <= horizontalBase + 1; route++) {
    const points: MapPoint[] = [];
    for (let x = playerX - 640; x <= playerX + 640; x += 32) {
      points.push(project(x - playerX, driveElevatedRouteZ(route, x) - playerZ, DRIVE_ELEVATED_Y));
    }
    strokeRoad(ctx, points, {
      color: ROAD_STATUS_COLORS.elevated,
      width: DRIVE_ELEVATED_WIDTH * 0.58,
      elevation: DRIVE_ELEVATED_Y,
    });
  }
}

function drawRingRoads(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  const cellX = Math.round(playerX / 680);
  const cellZ = Math.round(playerZ / 680);

  for (let ax = cellX - 1; ax <= cellX + 1; ax++) {
    for (let az = cellZ - 1; az <= cellZ + 1; az++) {
      const anchor = driveRingAnchor(ax, az);
      const elevation = anchor.elevated ? DRIVE_ELEVATED_Y : 0;
      const points: MapPoint[] = [];
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const x = anchor.x + Math.cos(a) * anchor.radius;
        const z = anchor.z + Math.sin(a) * anchor.radius;
        points.push(project(x - playerX, z - playerZ, elevation));
      }
      strokeRoad(ctx, points, {
        color: anchor.elevated ? ROAD_STATUS_COLORS.elevated : ROAD_STATUS_COLORS.special,
        width: anchor.elevated ? 10 : 7,
        elevation,
      });
    }
  }
}

function drawAccessRamps(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  const chunkX = Math.floor(playerX / DRIVE_CHUNK_SIZE);
  const chunkZ = Math.floor(playerZ / DRIVE_CHUNK_SIZE);

  for (let cx = chunkX - 4; cx <= chunkX + 4; cx++) {
    for (let cz = chunkZ - 5; cz <= chunkZ + 6; cz++) {
      for (const ramp of getDriveAccessRampsForChunk(cx, cz)) {
        const half = DRIVE_ACCESS_RAMP_LENGTH / 2;
        const startElevation = ramp.up ? 0 : DRIVE_ELEVATED_Y;
        const endElevation = ramp.up ? DRIVE_ELEVATED_Y : 0;
        const start = ramp.axis === 'z'
          ? project(ramp.centerX - playerX, ramp.centerZ - half - playerZ, startElevation)
          : project(ramp.centerX - half - playerX, ramp.centerZ - playerZ, startElevation);
        const end = ramp.axis === 'z'
          ? project(ramp.centerX - playerX, ramp.centerZ + half - playerZ, endElevation)
          : project(ramp.centerX + half - playerX, ramp.centerZ - playerZ, endElevation);

        strokeRoad(ctx, [start, end], {
          color: ROAD_STATUS_COLORS.ramp,
          width: DRIVE_ACCESS_RAMP_WIDTH,
          elevation: DRIVE_ELEVATED_Y * 0.5,
        });
      }
    }
  }
}

function drawWorldStoreRoads(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  const chunks = useWorldStore.getState().activeChunks;

  for (const chunk of chunks.values()) {
    const chunkOriginX = chunk.gridX * DRIVE_CHUNK_SIZE;
    const chunkOriginZ = chunk.gridZ * DRIVE_CHUNK_SIZE;
    const nodeById = new Map(chunk.nodes.map((node) => [node.id, node]));

    for (const road of chunk.roads) {
      const startNode = nodeById.get(road.startNode);
      const endNode = nodeById.get(road.endNode);
      if (!startNode || !endNode) continue;

      const elevation = roadElevation(road);
      strokeRoad(ctx, [
        project(chunkOriginX + startNode.position.x - playerX, chunkOriginZ + startNode.position.z - playerZ, elevation),
        project(chunkOriginX + endNode.position.x - playerX, chunkOriginZ + endNode.position.z - playerZ, elevation),
      ], {
        color: roadColor(road),
        width: Math.max(5, Math.min(22, road.totalWidth * 0.6)),
        elevation,
        dash: road.type === 'ramp' ? [12, 8] : undefined,
      });
    }
  }
}

function roadElevation(road: RoadSegment) {
  return road.elevation === 'elevated' || road.elevation === 'bridge' ? DRIVE_ELEVATED_Y : 0;
}

function roadColor(road: RoadSegment) {
  if (road.type === 'ramp') return ROAD_STATUS_COLORS.ramp;
  if (road.elevation === 'elevated' || road.elevation === 'bridge') return ROAD_STATUS_COLORS.elevated;
  if (road.type === 'highway') return ROAD_STATUS_COLORS.highway;
  return ROAD_STATUS_COLORS.ground;
}

function drawSpecialRoadStateLabels(ctx: CanvasRenderingContext2D, playerX: number, playerZ: number) {
  const chunkZ = Math.floor(playerZ / DRIVE_CHUNK_SIZE);

  for (let zc = chunkZ - 5; zc <= chunkZ + 7; zc++) {
    const type = getDriveChunkType(zc);
    if (type === 'STRAIGHT') continue;

    const dz = zc * DRIVE_CHUNK_SIZE + DRIVE_CHUNK_SIZE / 2 - playerZ;
    const elevation = type === 'OVERPASS' || type === 'ELEVATED_UP' || type === 'ELEVATED_DOWN'
      ? DRIVE_ELEVATED_Y
      : 0;
    const p = project(-playerX, dz, elevation);
    const label = roadStateLabel(type);

    ctx.fillStyle = type === 'TOLL' ? ROAD_STATUS_COLORS.toll : ROAD_STATUS_COLORS.ramp;
    ctx.fillRect(p.x - 18, p.y - 7, 36, 14);
    ctx.fillStyle = '#020617';
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(label, p.x, p.y + 3);
  }
}

function roadStateLabel(type: DriveChunkType) {
  switch (type) {
    case 'TOLL':
      return 'TOLL';
    case 'OVERPASS':
      return 'OVP';
    case 'ELEVATED_UP':
      return 'UP';
    case 'ELEVATED_DOWN':
      return 'DOWN';
    case 'RAMP_ON':
      return 'ON';
    case 'RAMP_OFF':
      return 'OFF';
    default:
      return '';
  }
}

function drawLegend(ctx: CanvasRenderingContext2D) {
  const entries = [
    ['GND', ROAD_STATUS_COLORS.highway],
    ['ELV', ROAD_STATUS_COLORS.elevated],
    ['RMP', ROAD_STATUS_COLORS.ramp],
  ];

  ctx.font = 'bold 8px system-ui';
  ctx.textAlign = 'left';
  entries.forEach(([label, color], i) => {
    const x = 8 + i * 42;
    const y = PANEL_SIZE - 8;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 7, 12, 4);
    ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
    ctx.fillText(label, x + 15, y - 3);
  });
}

function drawCompass(ctx: CanvasRenderingContext2D, heading: number, mode: MapMode) {
  const northAngle = mode === 'follow' ? -heading : 0;
  const x = 24 + Math.sin(northAngle) * 9;
  const y = 26 - Math.cos(northAngle) * 9;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.arc(24, 26, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 26);
  ctx.lineTo(x, y);
  ctx.stroke();

  ctx.fillStyle = '#f87171';
  ctx.font = 'bold 10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('N', 24, 14);
}

function drawPlayerArrow(ctx: CanvasRenderingContext2D, center: number) {
  ctx.save();
  ctx.translate(center, center);
  ctx.fillStyle = '#818cf8';
  ctx.strokeStyle = '#eef2ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(-7, 9);
  ctx.lineTo(0, 5);
  ctx.lineTo(7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
