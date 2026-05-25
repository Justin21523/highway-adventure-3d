# Batch Rendering 系統使用指南

## 概述

Batch Rendering 系統使用 Three.js 的 `InstancedMesh` 技術，將多個相同幾何體的物件合併成一次繪製呼叫（draw call），大幅提升渲染效能。

## 效能提升

- **傳統方式**: N 個物件 = N 次 draw call
- **Batch 方式**: N 個物件 = 1 次 draw call
- **實際提升**: 通常可減少 70-90% 的 draw calls

## 系統架構

```
BatchSystem (整合入口)
├── BatchRenderingSystem (核心管理)
│   ├── Street Lights Batch
│   ├── Road Markings Batch
│   ├── Decorations Batch
│   └── Pickups Batch
├── TrafficBatchSystem (交通車渲染)
├── DecorationBatchSystem (裝飾物渲染)
├── RoadMarkingBatchSystem (道路標記渲染)
└── AssetLoader (批量資源載入)
```

## 使用方式

### 1. 初始化

```typescript
import { BatchSystem } from '@/systems/BatchSystem';

// 在遊戲啟動時初始化
BatchSystem.init();
```

### 2. 批量載入資源

```typescript
// 批量載入模型
const models = await BatchSystem.loadModels(
  [
    'assets/models/car.glb',
    'assets/models/tree.glb',
    'assets/models/building.glb',
  ],
  'initial_assets',
  (progress) => {
    console.log(`Loading: ${progress}%`);
  }
);

// 批量載入貼圖
const textures = await BatchSystem.loadTextures(
  [
    'assets/textures/road.jpg',
    'assets/textures/concrete.jpg',
    'assets/textures/grass.jpg',
  ],
  'world_textures'
);

// 獲取載入進度
const progress = BatchSystem.getBatchProgress('initial_assets');
console.log(`${progress.loaded}/${progress.total} (${progress.percentage}%)`);
```

### 3. 在組件中使用 Batch 系統

#### 交通車批量渲染

```tsx
import { TrafficBatchSystem } from '@/components/world/TrafficBatchSystem';

function GameScene() {
  return (
    <group>
      {/* 其他場景物件 */}
      <TrafficBatchSystem />
    </group>
  );
}
```

#### 裝飾物批量渲染

```tsx
import { DecorationBatchSystem } from '@/components/world/DecorationBatchSystem';

function GameScene() {
  return (
    <group>
      <DecorationBatchSystem />
    </group>
  );
}
```

#### 道路標記批量渲染

```tsx
import { RoadMarkingBatchSystem } from '@/components/world/RoadMarkingBatchSystem';

function GameScene() {
  return (
    <group>
      <RoadMarkingBatchSystem />
    </group>
  );
}
```

### 4. 完整場景範例

```tsx
import { BatchSystem } from '@/systems/BatchSystem';
import { TrafficBatchSystem } from '@/components/world/TrafficBatchSystem';
import { DecorationBatchSystem } from '@/components/world/DecorationBatchSystem';
import { RoadMarkingBatchSystem } from '@/components/world/RoadMarkingBatchSystem';

function GameScene() {
  // 在 useEffect 中初始化 batch 系統
  useEffect(() => {
    BatchSystem.init();

    // 預載入常用資源
    BatchSystem.loadModels([
      'assets/models/tree.glb',
      'assets/models/rock.glb',
    ], 'world_assets');

    return () => {
      BatchSystem.dispose();
    };
  }, []);

  return (
    <group>
      {/* 道路 */}
      <RoadGeometry />

      {/* 道路標記（批量渲染） */}
      <RoadMarkingBatchSystem />

      {/* 裝飾物（批量渲染） */}
      <DecorationBatchSystem />

      {/* 交通車（批量渲染） */}
      <TrafficBatchSystem />

      {/* 其他場景物件 */}
    </group>
  );
}
```

### 5. 獲取統計資訊

```typescript
// 獲取詳細統計
const stats = BatchSystem.getStats();
console.log('Batch Statistics:', stats);
// {
//   totalBatches: 12,
//   totalInstances: 1500,
//   drawCallReduction: 85%,
//   estimatedMemoryUsage: 60000
// }

// 快速列印統計到控制台
BatchSystem.printStats();
```

## 自訂 Batch 渲染

### 創建自訂 Batch Manager

```typescript
import { BatchRenderingSystem } from '@/systems/BatchRenderingSystem';
import * as THREE from 'three';

const batchSystem = BatchRenderingSystem.getInstance();

// 創建自訂 batch
const batch = batchSystem.createBatch('chunk_0_0', 'decorations', 100);

// 添加實例
batch.addInstance(
  new THREE.Vector3(10, 0, 20),  // 位置
  new THREE.Euler(0, 0, 0)        // 旋轉
);

// 更新實例
batch.updateInstance(0, new THREE.Vector3(15, 0, 25), new THREE.Euler(0, Math.PI, 0));

// 移除實例
batch.removeInstance(0);
```

### 使用 InstancedMesh 手動渲染

```typescript
import * as THREE from 'three';

// 創建 InstancedMesh
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const count = 100;

const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

// 設置每個實例的矩陣
const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(i * 2, 0, 0);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
}

instancedMesh.instanceMatrix.needsUpdate = true;

// 添加到場景
scene.add(instancedMesh);
```

## 最佳實踐

### 1. 使用 InstancedMesh 的時機

✅ **適合使用**:
- 大量相同幾何體（樹木、石頭、路燈等）
- 相同材質的不同實例
- 位置/旋轉/縮放不同的物件

❌ **不適合使用**:
- 每個物件都有獨特幾何體
- 每個物件都有不同材質
- 數量很少（< 10 個）

### 2. 管理實例生命周期

```typescript
// ✅ 正確：及時清理
useEffect(() => {
  const batch = createBatch();
  batch.addInstance(...);

  return () => {
    batch.dispose();
  };
}, []);

// ❌ 錯誤：記憶體洩漏
const batch = createBatch();
batch.addInstance(...);
// 沒有清理
```

### 3. 優化更新頻率

```typescript
// ✅ 正確：只在需要時更新
useFrame(() => {
  if (needsUpdate) {
    batch.updateAll();
  }
});

// ❌ 錯誤：每幀都創建新矩陣
useFrame(() => {
  const dummy = new THREE.Object3D(); // 每幀創建
  dummy.position.set(...);
  dummy.updateMatrix();
});
```

### 4. 使用物件池

```typescript
import { ObjectPool } from '@/utils/objectPool';

// 創建物件池
const pool = new ObjectPool(
  () => new THREE.Vector3(),
  (vec) => vec.set(0, 0, 0),
  { initialSize: 50 }
);

// 獲取物件
const pos = pool.acquire();
pos.set(10, 0, 20);

// 歸還物件
pool.release(pos);
```

## 效能指標

### 預期改善

| 場景 | 傳統 Draw Calls | Batch Draw Calls | 改善百分比 |
|------|----------------|------------------|-----------|
| 100 棵樹 | 100 | 1 | 99% |
| 50 輛車 | 350 | 7 | 98% |
| 200 個路燈 | 200 | 2 | 99% |
| 完整場景 | ~5000 | ~500 | 90% |

### 監控效能

```typescript
// 在開發時監控效能
setInterval(() => {
  const stats = BatchSystem.getStats();
  console.log(`Draw calls: ${stats.totalBatches}`);
  console.log(`Total instances: ${stats.totalInstances}`);
}, 5000);
```

## 常見問題

### Q: Batch 渲染和傳統渲染可以混用嗎？
A: 可以。InstancedMesh 和傳統 Mesh 可以在同一個場景中共存。

### Q: 如何更新動態物件（如交通車）？
A: 使用 `setMatrixAt(index, matrix)` 更新每個實例的位置，然後呼叫 `instanceMatrix.needsUpdate = true`。

### Q: 支援不同顏色嗎？
A: 支援。使用 `setColorAt(index, color)` 設置每個實例的顏色。

### Q: 支援陰影嗎？
A: 支援。設置 `castShadow = true` 和 `receiveShadow = true`。

### Q: 記憶體使用量是多少？
A: 每個實例約 40 位元組（矩陣 16 位元組 + 顏色 12 位元組 + 額外開銷）。1000 個實例約 40 KB。

## 更多資源

- [Three.js InstancedMesh 文件](https://threejs.org/docs/#api/en/objects/InstancedMesh)
- [效能優化指南](https://threejs.org/manual/#en/performance)
- [物件池實作](../utils/objectPool.ts)
