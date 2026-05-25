# 🛣️ 完整道路系統使用指南

## 概述

本遊戲實現了一個完整的網格狀道路系統，包含多種道路類型和視覺化效果。所有道路都由程式化生成，並使用 InstancedMesh 進行批量渲染以優化效能。

## 道路類型

### 1. 高速公路 (Highway)
- **特徵**: 3 車道，高架橋，護欄，路燈
- **生成位置**: X 座標為 5 的倍數的位置
- **速度限制**: 120 km/h
- **視覺效果**:
  - 灰色路面 (#2a2a2a)
  - 高架橋（40% 機率）
  - 兩側護欄
  - 路燈間隔 25m
  - 服務區（每 5 個 chunk）

### 2. 城市道路 (City Center)
- **特徵**: 網格狀，十字路口，斑馬線
- **生成位置**: 原點附近（距離 < 3）
- **速度限制**: 60 km/h
- **視覺效果**:
  - 深灰色路面 (#333333)
  - 十字路口
  - 斑馬線
  - 路燈
  - 交通燈

### 3. 郊區道路 (Suburban)
- **特徵**: 2 車道，簡單交叉口
- **生成位置**: 城市周圍（距離 3-6）
- **速度限制**: 60 km/h
- **視覺效果**:
  - 深灰色路面 (#3a3a3a)
  - 雙向車道
  - 路燈

### 4. 工業區道路 (Industrial)
- **特徵**: 寬闊道路，服務區
- **生成位置**: 高速公路旁，城市外圍
- **速度限制**: 50 km/h
- **視覺效果**:
  - 灰色路面 (#444444)
  - 3 車道
  - 路燈

### 5. 鄉間道路 (Countryside)
- **特徵**: 單車道，簡單
- **生成位置**: 所有其他位置
- **速度限制**: 80 km/h
- **視覺效果**:
  - 深灰色路面 (#4a4a4a)
  - 單車道
  - 無路燈

## 系統架構

```
GameScene.tsx
├── WorldChunks (世界區塊流式載入)
│   └── ChunkStreamer
│       └── RoadNetworkRenderer (道路渲染器)
│           ├── 道路表面
│           ├── 車道標記
│           ├── 護欄
│           ├── 路燈 (InstancedMesh)
│           └── 服務區
├── RoadMarkingBatchSystem (道路標記批量渲染)
├── DecorationBatchSystem (裝飾物批量渲染)
└── TrafficBatchSystem (交通車批量渲染)
```

## 使用方式

### 方式 1: 在遊戲中查看

啟動遊戲後，駕駛車輛探索世界，你會看到：

1. **城市區域** (原點附近):
   - 網格狀道路
   - 十字路口
   - 斑馬線
   - 密集的路燈

2. **高速公路** (X = 0, ±5, ±10...):
   - 高架橋（灰色支柱支撐）
   - 兩側護欄
   - 服務區（每 5 個 chunk）

3. **郊區區域**:
   - 簡單雙向道路
   - 路燈間隔較寬

4. **鄉間區域**:
   - 簡單單車道
   - 無路燈

### 方式 2: 使用道路系統展示頁面

```tsx
import { RoadNetworkDemo } from './components/RoadNetworkDemo';

function App() {
  return <RoadNetworkDemo />;
}
```

這個組件會顯示一個靜態的道路網絡視圖，包含：
- 5x5 的 chunk 網格
- 所有道路類型
-  OrbitControls 可以旋轉、縮放查看

### 方式 3: 程式化生成特定區塊

```typescript
import { WorldGenerator } from '@/systems/WorldGenerator';
import { RoadNetworkRenderer } from '@/systems/RoadNetworkRenderer';
import * as THREE from 'three';

const generator = WorldGenerator.getInstance();
const renderer = RoadNetworkRenderer.getInstance();

// 生成 chunk (0, 0) 的數據
const chunkData = generator.generateChunk(0, 0);

// 創建 THREE.Group
const group = new THREE.Group();

// 渲染道路
renderer.buildChunkRoads(group, chunkData);

// 添加到場景
scene.add(group);
```

## 效能優化

### 1. InstancedMesh 批量渲染

所有重複物件（路燈、護欄等）都使用 InstancedMesh：

```typescript
// 舊方式：每個路燈一個 draw call
for (let i = 0; i < 100; i++) {
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  scene.add(lamp); // 100 次 draw calls
}

// 新方式：所有路燈一個 draw call
const instancedLamps = new THREE.InstancedMesh(lampGeo, lampMat, 100);
for (let i = 0; i < 100; i++) {
  instancedLamps.setMatrixAt(i, matrix);
}
scene.add(instancedLamps); // 1 次 draw call
```

### 2. 物件池

使用 ObjectPool 重複使用物件，減少 GC 壓力：

```typescript
import { ObjectPool } from '@/utils/objectPool';

const pool = new ObjectPool(
  () => new THREE.Vector3(),
  (vec) => vec.set(0, 0, 0),
  { initialSize: 50 }
);
```

### 3. 幾何體和材質快取

RoadNetworkRenderer 使用快取避免重複創建：

```typescript
private getMaterial(key: string, creator: () => THREE.Material): THREE.Material {
  if (!this.materialCache.has(key)) {
    this.materialCache.set(key, creator());
  }
  return this.materialCache.get(key)!;
}
```

## 自訂道路系統

### 添加新的道路類型

1. 在 `determineZone` 函數中添加新的區域類型
2. 在 `buildRoadSurface` 中添加新的路面顏色
3. 在 `generateRoadsForZone` 中添加新的道路邏輯

### 修改道路參數

編輯 `src/constants/world.ts`:

```typescript
export const WORLD = {
  CHUNK_SIZE: 100, // 每個 chunk 的大小（米）
  RENDER_DISTANCE_CHUNKS: 5, // 渲染距離（chunk 數量）
  // ...
};

export const HIGHWAY = {
  ELEVATED_HEIGHT: 8, // 高架橋高度（米）
  BARRIER_HEIGHT: 0.9, // 護欄高度（米）
  // ...
};
```

### 添加新的視覺效果

在 `RoadNetworkRenderer.ts` 中添加新的方法：

```typescript
private buildNewFeature(group: THREE.Group, chunkData: ChunkData): void {
  // 創建新的幾何體和材質
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

  // 創建 mesh 並添加到 group
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
}
```

## 常見問題

### Q: 為什麼有些區塊沒有道路？
A: 道路是由 WorldGenerator 根據區域類型程式化生成的。確保你調用了 `generateChunk` 方法。

### Q: 如何增加渲染距離？
A: 修改 `ChunkStreamer` 中的 `renderDistance` 屬性：

```typescript
this.renderDistance = 10; // 從 5 改為 10
```

### Q: 如何更改道路顏色？
A: 修改 `RoadNetworkRenderer.ts` 中的 `buildRoadSurface` 方法：

```typescript
const roadMat = new THREE.MeshStandardMaterial({
  color: 0x0000ff, // 改為藍色
  // ...
});
```

### Q: 效能不佳怎麼辦？
A: 嘗試以下優化：
1. 減少 `renderDistance`
2. 減少每個 chunk 的裝飾物數量
3. 使用更低的解析度貼圖
4. 關閉陰影

### Q: 如何添加彎道？
A: 目前道路系統只支援直線道路。添加彎道需要：
1. 修改 `generateRoadsForZone` 以支持曲線
2. 使用更複雜的幾何體（如 TubeGeometry）
3. 調整相鄰 chunk 的道路連接

## 效能指標

### 預期效能

| 場景 | Draw Calls | 幀率 |
|------|-----------|------|
| 城市區域 | ~200 | 60 FPS |
| 高速公路 | ~150 | 60 FPS |
| 郊區區域 | ~100 | 60 FPS |
| 鄉間區域 | ~50 | 60 FPS |

### 監控效能

在瀏覽器控制台查看：

```typescript
import { BatchSystem } from '@/systems/BatchSystem';

setInterval(() => {
  BatchSystem.printStats();
}, 5000);
```

輸出範例：
```
[BatchSystem Statistics]
  Total Batches: 12
  Total Instances: 1500
  Draw Call Reduction: 85%
  Estimated Memory: 60.00 KB
```

## 更多資源

- [Batch Rendering 系統使用指南](./BatchSystem.md)
- [WorldGenerator 文件](../systems/WorldGenerator.ts)
- [RoadNetworkRenderer 文件](../systems/RoadNetworkRenderer.ts)
- [Three.js InstancedMesh 文件](https://threejs.org/docs/#api/en/objects/InstancedMesh)
