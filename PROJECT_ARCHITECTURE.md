# 專案架構與核心邏輯摘要

> Highway Adventure 3D — 一款以 Three.js + React Three Fiber 打造的瀏覽器開車／RPG 遊戲。
> 玩家在無限延伸的程序化世界中駕駛、探索分區（高速公路／商家區／住宅區／一般道路／工業區）、
> 接 NPC 任務、進商店消費、躲避 AI 車流。
>
> 本文件由全專案掃描產生，供另一個 AI 快速理解現況以接手開發。**未修改任何程式碼。**

---

## 1. 技術棧

| 類別 | 內容 |
|------|------|
| 程式語言 | TypeScript 5.4（`strict: true`、`noUnusedLocals: false`、`noFallthroughCasesInSwitch: true`、module resolution = `bundler`） |
| 執行環境 | 瀏覽器（純前端，無後端） |
| 建置工具 | Vite 5、`@vitejs/plugin-react`；`tsc -b` 專案參照建置 |
| UI 框架 | React 18.3（StrictMode） |
| 3D / 渲染 | Three.js 0.164、`@react-three/fiber` 8、`@react-three/drei` 9、`@react-three/postprocessing` 2 / `postprocessing` 6 |
| 狀態管理 | Zustand 4.5（6 個獨立 store） |
| 樣式 | Tailwind CSS 3.4 + PostCSS + autoprefixer |
| 程式碼檢查 | ESLint 8 + `@typescript-eslint` + react-hooks / react-refresh plugins |
| 資料庫 | 無。存檔使用瀏覽器 `localStorage`（`SaveManager`，key=`highway_adventure_save_v1`，schema v2） |
| 路徑別名 | `@/* → src/*`，另有 `@stores/* @systems/* @components/*` 等（見 `tsconfig.app.json`） |

`npm run dev`（Vite）、`npm run build`（`tsc -b && vite build`）、`npm run typecheck`、`npm run lint`。

> ✅ **目前 `npm run typecheck` 全綠（0 錯誤）、`npm run build` 可成功產出 `dist/`。**
> 先前 `App.tsx` 的壞 import 與車輛型別問題已修復（詳見 §6）。

---

## 2. 資料夾結構

```
highway-adventure-3d/
├── index.html                      網頁進入點（#root + loading screen）
├── package.json / vite.config.ts / tsconfig*.json / tailwind.config.js / postcss.config.js
├── docs/ROAD_SYSTEM.md             道路系統設計筆記
├── PROJECT_ARCHITECTURE.md         （本文件）
└── src/
    ├── main.tsx                    React 進入點：掛載 <App/>，移除 loading screen
    ├── App.tsx                     最上層：Canvas、全域 managers、UI overlays、gameState 機（start/loading/playing）
    ├── index.ts                    函式庫式彙總匯出（re-export 型別/系統，部分對外 API 表面）
    ├── index.css                   全域樣式 + Tailwind 指令
    │
    ├── components/                 React/R3F 元件（場景物件 + 2D UI）
    │   ├── GameScene.tsx           ★ 主 3D 場景組裝：掛載所有 world 系統 + useGameLoop()
    │   ├── PlayerVehicle.tsx       玩家車輛 mesh（共享 vehicleRef）
    │   ├── CameraRig.tsx           跟車攝影機
    │   ├── HUD.tsx / QuestLog / ShopModal / GarageModal / PauseMenu / NotificationToast
    │   ├── InteractionOverlay / LoadingScreen / StartScreen / PostProcessing
    │   ├── Obstacles / PickupObjects / ShopBuildings
    │   ├── ShopInteriorScene.tsx   進店後的獨立 3D 室內場景（取代戶外場景）
    │   ├── ShopInteriorOverlay.tsx 室內 UI
    │   ├── WorldChunks.tsx         （死碼，未掛載）舊區塊渲染
    │   ├── ui/                     純 2D UI overlay 元件
    │   │   ├── MiniGameRenderer.tsx  ★ 實際小地圖實作（Canvas 2D）— export `MinimapRenderer`
    │   │   ├── MinimapRenderer.tsx   1 行 re-export shim → MiniGameRenderer
    │   │   ├── AchievementPanel.tsx  （空檔，無 export）
    │   │   ├── AchivementPanel.tsx   ★ 實際成就面板（檔名拼字錯誤）— export `AchievementPanel`
    │   │   ├── CrashOverlay / QuestDialog / QuestHintOverlay
    │   └── world/                  3D 世界系統（多數為每幀 useFrame 的批次渲染器）
    │       ├── HighwayNetworkSystem.tsx ★ 最大檔(1.7k 行)：中央高速公路走廊網格渲染（匝道/收費/高架/環道）
    │       ├── CityStreetSystem.tsx     ★ 商家/住宅分區的正交街道網格（InstancedMesh）
    │       ├── DecorationBatchSystem.tsx ★ 樹/石/招牌/房屋的 InstancedMesh 批次裝飾（分區感知）
    │       ├── WorldShopSpawner.tsx     ★ 依分區生成商店並註冊到 shopStore
    │       ├── NPCSpawner.tsx           ★ 依分區生成任務 NPC（QuestManager 路徑）
    │       ├── ChunkRenderer.tsx        從 worldStore.activeChunks 渲染區塊道路網格
    │       ├── TrafficBatchSystem.tsx   AI 車流 InstancedMesh 渲染
    │       ├── TrafficAIController.tsx  驅動 TrafficAI 系統
    │       ├── RoadMarkingBatchSystem.tsx 道路標線批次
    │       ├── RoadSignSystem / CheckpointSystem / GarageZone / PickupSystem
    │       ├── ParallaxScenery / ParallaxBackground 遠景視差層（純背景）
    │       ├── LightingController / PostProcessingPipeline / CollisionManager / DynamicObstacles
    │       ├── WorldSyncManager.tsx     App 層每幀：依車速驅動 MusicManager + 防禦性世界座標同步
    │       ├── QuestProgressTracker.tsx 依玩家狀態推進任務進度（純邏輯）
    │       ├── QuestZoneIndicator.tsx   任務目標位置的世界指示器
    │       ├── NPCQuestGiver.tsx        （死碼，未掛載）QuestChunkManager 路徑的 NPC
    │       ├── RoadNetworkGenerator.tsx （死碼）／ HighwayChunkGenerator（死碼）／ WorldStreamManager（死碼）
    │
    ├── systems/                    無框架的核心邏輯（多為 singleton，部分實作 GameSystem 介面）
    │   ├── GameRuntime.ts          ★ 主迴圈協調器 + 事件匯流排；持有 registerSystem 的系統清單
    │   ├── ChunkStreamer.ts        ★ 依玩家位置串流區塊：呼叫 WorldGenerator + registerChunk
    │   ├── WorldGenerator.ts       ★ 程序化世界資料：區塊道路/節點/商店/POI（zone 委派 ZoneManager）
    │   ├── ZoneManager.ts          ★ 單一權威分區來源（純函式）：zoneAtChunk/zoneAtWorld/zoneColor/zoneLabel
    │   ├── VehiclePhysics.ts       玩家車輛街機物理（讀控制、寫 vehicle 狀態）
    │   ├── TrafficAI.ts            AI 車流生成 + 行為（lane following / 變道）
    │   ├── QuestSystem.ts          任務系統（gameplay 事件 → 進度）
    │   ├── ShopSystem.ts           商店鄰近偵測 / 互動
    │   ├── PickupSystem.ts         拾取物生成/收集
    │   ├── EnvironmentSystem.ts    天氣 + 環境（需 scene 參照）
    │   ├── DayNightCycle.ts        晝夜循環
    │   ├── RoadNetworkRenderer.ts  （工具類，被 ChunkStreamer 用來建道路 mesh）
    │   └── VehicleUpgradeSystem.ts 升級件 → 有效車輛數值換算
    │
    ├── managers/                   應用層 singleton（生命週期 init/dispose）
    │   ├── SaveManager.ts          localStorage 存讀檔（schema v2）
    │   ├── InputManager.ts         鍵盤/觸控輸入 → 控制狀態
    │   ├── AudioManager / MusicManager  WebAudio 音效 / 程序化音樂
    │   ├── NotificationManager     通知佇列
    │   ├── PerformanceScaler.ts    依 FPS 自動調整畫質
    │   ├── AchievementManager / StatsTracker  成就 / 統計
    │   ├── VFXManager / WeatherSystem
    │   ├── QuestManager.ts         ★ 實際使用中的任務產生器（分區加權 + 確定性 seed + 真實商店目標）
    │   └── QuestChunkManager.ts    （死碼路徑）另一套區塊任務產生器
    │
    ├── stores/                     Zustand 全域狀態（6 個）
    │   ├── gameStore.ts            玩家 profile、vehicle、controls、activeQuest、availableQuests、notifications、scene/camera ref
    │   ├── worldStore.ts           playerPosition、currentChunkId、activeChunks(Map)、elevation
    │   ├── shopStore.ts            activeShops、interactionZones、inventory、nearest/interior shop
    │   ├── questStore.ts           activeQuests、completedQuests、worldEvents、tour、worldPickups、stats
    │   ├── trafficStore.ts         activeCars、spawnConfig、laneOccupancy
    │   └── performanceStore.ts     metrics、qualityTier、settings、fpsHistory
    │
    ├── hooks/                      React hooks（橋接 store/系統 ↔ 元件）
    │   ├── useGameLoop.tsx         ★ 在 GameScene 內：init 並 registerSystem，每幀 runtime.update()
    │   ├── useGameOrchestrator.tsx App 層：晝夜/天氣/統計/成就/通知/音樂 + 自動存檔
    │   ├── useGameLoopManager.tsx  App 層：WeatherSystem / PerformanceScaler 每幀更新
    │   ├── useControls / useArcadePhysics / usePlayerVehicle / useFloatingOrigin
    │   ├── useQuests / useQuestProgressSync / useShops / useTraffic / usePickups
    │   ├── useWorldStreaming / useEnvironment / useVehicleCustomization
    │
    ├── ui/                         另一組 overlay 元件（GPSNavigator / ShopInteraction / PauseMenu / TutorialOverlay）
    ├── constants/                  數值常數（world / road / zones / physics / vehicles / shops / traffic / economy）
    ├── config/                     gameConfig / qualityPresets / roadPresets
    ├── types/                      TypeScript 型別定義（core / world / quest / shop / vehicle / traffic / poi / building …）
    └── utils/                      工具（driveSurface ★、batchRenderer、objectPool、seedRandom、math、format、distance、webglDetect）
```

★ = 核心業務邏輯，建議優先閱讀。

---

## 3. 各程式碼檔案說明

> 為避免冗長，型別/常數/工具類以精簡條目呈現；核心邏輯檔給較完整說明。
> 「關鍵依賴」以模組層級概括（store/系統/型別），非逐一列出 import。

### 3.1 進入點與最上層

**`src/main.tsx`** — React 進入點。掛載 `<App/>`（StrictMode），React mount 後淡出移除 `#loading-screen`。依賴：`App`、`index.css`。

**`src/App.tsx`** — 應用最上層。
- 主要用途：渲染 R3F `<Canvas>`、初始化全域 managers、管理 `gameState`（`start`/`loading`/`playing`）與 modal 開關、全域鍵盤事件（Esc 暫停、Q 任務、E 進店、X 出店）。
- 重要元件/函式：`App()`（預設匯出）、`RuntimeManagers`（在 Canvas 內初始化 PerformanceScaler、注入 scene/camera ref，掛 `useGameLoopManager`+`useGameOrchestrator`）、`WebGLErrorBoundary`、`WebGLBlockedScreen`、`handleStart()`。
- 場景組成：`interiorShopId ? <ShopInteriorScene/> : <GameScene/>`，外加 `<PlayerVehicle/> <CameraRig/> <NPCSpawner/> <QuestZoneIndicator/>`；UI：`<HUD/> <MinimapRenderer/> <QuestDialog/> <PauseMenu/>` 等。
- 關鍵依賴：所有 managers、`useGameStore`/`useShopStore`、`GameScene`、眾多 UI。
- **待辦/問題**：
  - L48–50 從 `./components/player/PlayerVehicle`、`./components/player/CameraRig`、`./components/world/WorldSyncManager` import — **前二者路徑錯誤（檔案實際在 `./components/`），`WorldSyncManager` 元件根本不存在**。
  - L255 `<WorldSyncManager … musicRef={musicRef} />` 使用了**未宣告的 `musicRef`**。
  - `<QuestDialog/>` 重複渲染兩次（L271、L276）。
  - 以上導致 Vite/Rollup 無法 build，目前無法執行。

**`src/index.ts`** — 函式庫式彙總 re-export（型別與部分系統），看似為將本專案當套件輸出的表面。對 app 執行非必要。

### 3.2 systems/（核心邏輯，無 React）

**`systems/GameRuntime.ts`** — ★ 主迴圈協調器 + 事件匯流排（singleton）。
- 重要：`class GameRuntime`（`registerSystem/unregisterSystem`、`start/stop`、`update(delta)` 逐一呼叫各系統 `update`、`dispatchEvent/on`）、`interface GameSystem {init/update/onModeChange?/dispose}`、`type GameEventType`（20 種事件：chunk_loaded、quest_completed、coin_collected…）。
- 依賴：全部 6 個 store。所有逐幀系統邏輯都經由此處而非各自 useFrame。

**`systems/ChunkStreamer.ts`** — ★ 區塊串流（GameSystem）。依 `worldStore.playerPosition` 計算需載入區塊，`WorldGenerator.generateChunk(cx,cz)` 產生後 `worldStore.registerChunk`；超出範圍卸載；更新 `performanceStore` active-chunk 數。用 `RoadNetworkRenderer` 建道路 mesh。

**`systems/WorldGenerator.ts`** — ★ 程序化世界資料（singleton，含 chunkCache、globalSeed=42）。
- 重要：`generateChunk(cx,cz)→{chunkData,shops,pois}`、`determineZone(cx,cz)`（**已委派 `zoneAtChunk`**）、`generateChunkData/generateShops/generatePOIs`、`getShopCountForZone`。
- 依賴：`ZoneManager`、`worldStore/shopStore/questStore`、`constants/world`、`SeededRandom`、shop 常數。

**`systems/ZoneManager.ts`** — ★ 單一權威分區來源（純函式、確定性、無 React）。
- 匯出：`ZONE_GRID_SIZE(=100)`、`zoneAtChunk(cx,cz):ZoneType`、`zoneAtWorld(x,z)`、`roadTypeForZone(zone)→'highway'|'city'`、`zoneColor(zone)`、`zoneLabel(zone)`（中文）。
- 佈局：中央走廊 `|cx|<=1`→highway；中環 `|cx|∈[2,3]` 依 `(ring+band)%3` 輪替 cityCenter/suburban/countryside；外環 countryside + seeded industrial。可調常數在 `constants/zones.ts`。
- 依賴：`constants/world`、`constants/zones`、`types/core`。

**`systems/VehiclePhysics.ts`** — 玩家車輛街機物理（GameSystem）。讀控制與升級數值，積分速度/轉向/漂移/boost/油料，寫入 `gameStore.vehicle`。**註：目前有多個 type 錯誤（IVehicleState 缺 maxSpeed/boostTimer/steerAngle、缺 `controls` 屬性），屬未完成重構。**

**`systems/TrafficAI.ts`** — AI 車流生成與行為（含本地 `SeededRandom`）。沿車道行駛、跟車、變道，寫入 `trafficStore.activeCars`。

**`systems/QuestSystem.ts`** — 任務系統（706 行，GameSystem）。將 gameplay 事件轉為任務進度、處理可用任務/世界事件（與 `questStore` 互動）。為較舊/平行的任務邏輯之一。

**`systems/ShopSystem.ts`** — 商店鄰近偵測與互動狀態（更新 `shopStore.nearestShopId`、進出店）。

**`systems/PickupSystem.ts`** — 拾取物（金幣/道具）生成與收集，與 `questStore.worldPickups`/`gameStore` 互動。

**`systems/EnvironmentSystem.ts`** — 天氣/環境（需 scene 參照，於 `useGameLoop` 單獨初始化與更新）。`type WeatherType`。

**`systems/DayNightCycle.ts`** — 晝夜循環：`TimePhase`、`CycleEvent`、`class DayNightCycle`（計算光向/天色/霧）。

**`systems/RoadNetworkRenderer.ts`** — 將區塊道路資料轉為 Three.js mesh 的工具類（被 ChunkStreamer 使用；非 R3F 元件）。匯出單例 `roadNetworkRenderer`。

**`systems/VehicleUpgradeSystem.ts`** — `calculateEffectiveStats(ownedItems)`、`applyStatsToPhysics(stats)`、`UPGRADE_EFFECTS`、`DEFAULT_STATS`：升級件 → 車輛數值。

### 3.3 managers/（應用層 singleton）

**`managers/SaveManager.ts`** — ★ localStorage 存讀檔。`save/load/reset/dispose`、30s 自動存檔。**schema `SAVE_VERSION=2`**：載入舊版時丟棄 `availableQuests`（60m 格座標已失效），保留 profile。依賴 `gameStore`、`types/core`。

**`managers/QuestManager.ts`** — ★ **實際使用中**的任務產生器（singleton，被 `NPCSpawner`/`QuestDialog` 使用）。
- 重要：`QUEST_TEMPLATES`（7 類）、`generateQuest(chunkId,category,level,roadType,seedSalt)`、`loadChunkQuests`（分區加權 `zoneCategoryWeights`）、`assignQuestsToNPC`、`acceptQuest`、`updateQuestProgress`、`completeQuest`、`getQuestHint`。
- 確定性：以 `chunkRng(chunkId)`（FNV-1a + mulberry32）取代所有 `Math.random`；delivery 任務 `pickNearbyShop` 指向真實商店；drift/speed 限 highway。
- 依賴：`gameStore`、`shopStore`、`ZoneManager`、`types/core`、`types/shop`。

**`managers/QuestChunkManager.ts`** — 平行的區塊任務產生器（確定性 seededRandom）。**僅被未掛載的 `NPCQuestGiver` 使用＝死碼路徑**；其 delivery/challenge/tour 模板為空陣列。

**`managers/InputManager.ts`** — 鍵盤/觸控輸入 → `IControlState`。`init/dispose`。

**`managers/AudioManager.ts` / `MusicManager.ts`** — WebAudio 音效（風聲等）/ 程序化背景音樂。

**`managers/NotificationManager.ts`** — 通知佇列：`Notification`、`NotificationPriority`、`class NotificationManager`。

**`managers/PerformanceScaler.ts`** — 依 FPS 自動升降畫質（與 `performanceStore`/qualityPresets 協作）。

**`managers/AchievementManager.ts` / `StatsTracker.ts`** — 成就解鎖 / 玩家統計（`PlayerStats`）。

**`managers/VFXManager.ts` / `WeatherSystem.ts`** — 視覺特效池 / 天氣狀態（`WeatherState`、`TimeOfDay`）。

### 3.4 stores/（Zustand）

| 檔案 | 狀態重點 | 關鍵 actions |
|------|----------|--------------|
| `gameStore.ts` | `profile`(等級/金幣/inventory/已解鎖車)、`vehicle`(IVehicleState)、`controls`、`gameMode`、`activeQuest`/`availableQuests`、`notifications`、`sceneRef`/`cameraRef` | `setGameMode`、`addCoins/addXp`、`addItemToInventory`、`completeQuest`、`updateQuestStats`、`addNotification` |
| `worldStore.ts` | `playerPosition`、`currentChunkId`、`activeChunks: Map<ChunkId,ChunkData>`、`isElevated`/`elevation`、`discoveredPoiIds` | `setPlayerPosition`、`registerChunk`、`setElevation`、subscribe |
| `shopStore.ts` | `activeShops: Map`、`interactionZones`、`inventory`、`nearestShopId`、`interiorShopId` | `registerShop/unregisterShop`、`getShopsInChunk`、`enterShopInterior/exitShopInterior`、`buyItem` |
| `questStore.ts` | `activeQuests`、`completedQuests`、`availableQuests`、`worldEvents`、`activeTour`、`worldPickups: Map`、`stats` | 任務生命週期、`QuestStats`（categoryCompleted Record） |
| `trafficStore.ts` | `activeCars: Map<EntityId,TrafficCar>`、`spawnConfig`、`laneOccupancy`、`isEnabled` | spawn/despawn、車道占用 |
| `performanceStore.ts` | `metrics`、`qualityTier`、`settings`、`fpsHistory`、`autoScaleEnabled` | `setActiveChunks`、品質調整 |

> 註：`gameStore` 與 `questStore` 都持有任務/統計欄位，存在部分重疊（歷史演進產物）。

### 3.5 components/world/（3D 世界系統）

**`GameScene.tsx`** — ★ 主場景組裝。呼叫 `useGameLoop()`，掛載：燈光、`WorldShopSpawner`、`ShopBuildings`、`Obstacles`、`PickupObjects`/`PickupSystem`、`TrafficBatchSystem`/`TrafficAIController`、`PlayerVehicle`、`CameraRig`、`HighwayNetworkSystem`、**`CityStreetSystem`**、`ChunkRenderer`、`RoadMarkingBatchSystem`、`DecorationBatchSystem`、`CheckpointSystem`、`RoadSignSystem`、`GarageZone`、`ShopInteraction`、`ParallaxScenery/Background`、`QuestProgressTracker`。

**`HighwayNetworkSystem.tsx`** — ★（1.7k 行）中央高速公路走廊渲染。`buildChunk(cx,cz)`：`cx===0` 才建分隔式幹道 + 高架 + 依 `getDriveChunkType(cz)` 加匝道/收費/高架/`CURVE`/`ROTATING_INTERCHANGE`；所有區塊加 organic/ring/elevated/access 道路網與 `addRoadsideDecorations`（**依 `zoneAtChunk` 區分**：industrial 才放泛用建物、cityCenter 抑制樹）。匯出 lane center 常數。依賴：`utils/driveSurface`、`ZoneManager`、`worldStore`。

**`CityStreetSystem.tsx`** — ★ 商家/住宅分區的 3×3 正交街道網格（InstancedMesh 柏油 + 中線），確定性 seeded、`isStreetZone(cx,cz)` 閘控、隨 `worldStore.activeChunks` 生成/卸載。依賴：`ZoneManager`、`worldStore`、`constants/world`。

**`DecorationBatchSystem.tsx`** — ★ 樹/石/招牌/**房屋**的 InstancedMesh 批次。`generateChunkDecorations` 依 `zoneAtChunk` 決定密度（`TREE_CHANCE_BY_ZONE`，highway/cityCenter=0；suburban 放房屋 pool；countryside 保留樹石），含 per-chunk 上限與隱藏未用 instance。依賴：`ZoneManager`、`worldStore`、`constants/world`。

**`WorldShopSpawner.tsx`** — ★ 依分區生成商店（`shopCountForZone`：cityCenter 4–6 / suburban 1–2 / highway 0–1），seeded（mulberry32），註冊到 `shopStore`。依賴：`ZoneManager`、`shopStore`、`worldStore`、shop 常數。

**`NPCSpawner.tsx`** — ★ 任務 NPC 生成（**App.tsx 掛載中**）。`getSpawnPositions(gx,gz,zone)`：highway 休息站 / cityCenter 查 `shopStore.getShopsInChunk` 站店門 / suburban 街上 / 其他景點；確定性 `slotHash`/`npcName`；用 `QuestManager.assignQuestsToNPC`。依賴：`gameStore`、`shopStore`、`QuestManager`、`ZoneManager`。

**`ChunkRenderer.tsx`** — 由 `worldStore.activeChunks` 的道路資料渲染 mesh。
**`TrafficBatchSystem.tsx` / `TrafficAIController.tsx`** — AI 車流批次渲染 / 驅動 `TrafficAI`。
**`RoadMarkingBatchSystem.tsx`** — 道路標線批次（`MarkingType`）。
**`QuestProgressTracker.tsx`** — 依玩家位置/速度/漂移推進 `activeQuest` 進度（純邏輯）。
**`QuestZoneIndicator.tsx`** — 在世界中以光柱標示 `reachLocation` 目標。**待辦**：L121 距離標籤為 placeholder（建議改 sprite）。
**`ParallaxScenery.tsx` / `ParallaxBackground.tsx`** — 遠景視差層（純背景，不需分區）。
**`CheckpointSystem` / `RoadSignSystem` / `GarageZone` / `PickupSystem` / `CollisionManager` / `DynamicObstacles` / `LightingController` / `PostProcessingPipeline`** — 各自單一職責的世界子系統。
**`NPCQuestGiver.tsx`** — 用 `QuestChunkManager`，**未被任何檔案掛載＝死碼**。
**`RoadNetworkGenerator.tsx` / `HighwayChunkGenerator.tsx` / `WorldStreamManager.tsx` / `components/WorldChunks.tsx`** — **死碼**（未掛載，僅 `index.ts` 匯出或無人引用）。

### 3.6 components/（其餘）與 ui/

- **`PlayerVehicle.tsx`**（在 `components/`，非 `player/`）— 玩家車 mesh。**`CameraRig.tsx`** — 跟車攝影機。
- **UI**：`HUD`、`QuestLog`、`ShopModal`、`GarageModal`、`PauseMenu`、`NotificationToast`、`InteractionOverlay`、`LoadingScreen`、`StartScreen`、`PostProcessing`、`ShopBuildings`、`Obstacles`、`PickupObjects`。
- **`ShopInteriorScene.tsx`**（528 行）— 進店後的獨立室內 3D 場景；`ShopInteriorOverlay.tsx` 為其 UI。
- **`components/ui/`**：`MiniGameRenderer.tsx`（★ 小地圖實作，**已加分區疊色 `drawZoneFill` + `drawZoneLegend`**，export `MinimapRenderer`）、`MinimapRenderer.tsx`（1 行 shim）、`AchivementPanel.tsx`（★ 實作，檔名拼錯）、`AchievementPanel.tsx`（空）、`CrashOverlay`、`QuestDialog`（接受/檢視任務）、`QuestHintOverlay`。
- **`ui/`**：`GPSNavigator.tsx`（指南針 + 任務距離）、`ShopInteraction.tsx`（戶外進店觸發）、`PauseMenu.tsx`、`TutorialOverlay.tsx`。

### 3.7 hooks/

| Hook | 用途 |
|------|------|
| `useGameLoop.tsx` | ★ GameScene 內：init + registerSystem（ChunkStreamer/TrafficAI/ShopSystem/QuestSystem/PickupSystem/VehiclePhysics），每幀 `runtime.update()` + EnvironmentSystem。另有 `useScene`、`useSystem`。 |
| `useGameOrchestrator.tsx` | App 層：持有 DayNightCycle/WeatherSystem/StatsTracker/AchievementManager/NotificationManager/MusicManager，定期 `SaveManager.save()`。 |
| `useGameLoopManager.tsx` | App 層：每幀更新 WeatherSystem、PerformanceScaler，隨機切換天氣。 |
| `useControls.tsx` | 鍵盤/觸控 → `ControlState`。 |
| `useArcadePhysics / usePlayerVehicle / useFloatingOrigin / useVehicleCustomization` | 車輛物理/狀態/浮動原點/外觀。 |
| `useQuests / useQuestProgressSync / useShops / useTraffic / usePickups / useWorldStreaming / useEnvironment` | 各 store/系統的 React 橋接與衍生選擇器。 |

**待辦**：`useQuestProgressSync.ts` 早期版本曾有 status 比較問題（已於分區工程中修正）。

### 3.8 constants/ config/ types/ utils/

- **constants/**：`world.ts`（`WORLD.CHUNK_SIZE=100`、`ZONE_DISTRIBUTION`…）、`zones.ts`（`ZONE_LAYOUT`：走廊寬/帶深/工業機率）、`road.ts`（`ROAD_CONFIG`，舊 60m 格，僅死碼 RoadNetworkGenerator 仍用）、`physics.ts`、`vehicles.ts`、`shops.ts`（含 `ITEM_CATALOG`）、`traffic.ts`、`economy.ts`（`xpForLevel/levelFromXp`）。
- **config/**：`gameConfig.ts`、`qualityPresets.ts`（`QUALITY_PRESETS` + `getNext/PrevQuality`）、`roadPresets.ts`（各 RoadType 預設）。
- **types/**：`core.ts`（最核心：`ZoneType`、`IVehicleState`、`IPlayerProfile`、`IQuest`、以及**重複的** `Quest/QuestObjective/ObjectiveType`）、`world.ts`（`ChunkData`、`RoadSegment`、`RoadNode`、`PointOfInterest`）、`quest.ts`（另一套 `Quest/ObjectiveType`，含 snake_case 變體）、`shop.ts`、`vehicle.ts`、`traffic.ts`、`poi.ts`、`building.ts`、`audio.ts`、`vfx.ts`、`economy.ts`、`input.ts`、`performance.ts`。
- **utils/**：`driveSurface.ts`（★ 高速公路幾何取樣：`getDriveChunkType`、`sampleDriveSurface`、`driveRingAnchor` 等，含 `DRIVE_CHUNK_SIZE=100`）、`batchRenderer.ts`（`BatchManager` + 各式 InstancedMesh 工廠）、`objectPool.ts`（`ObjectPool`）、`seedRandom.ts`（`SeededRandom`）、`math.ts`、`format.ts`、`distance.ts`（區塊座標換算）、`webglDetect.ts`。

---

## 4. 核心邏輯流程

### 4.1 啟動與主執行路徑

```
index.html (#root, loading screen)
   └─ main.tsx → ReactDOM.render(<App/>)
        └─ App(): gameState 'start' → StartScreen
             └─ handleStart(): AudioManager/MusicManager/SaveManager/InputManager init → 'playing'
                  └─ <Canvas> (R3F)
                       ├─ <RuntimeManagers/>  → PerformanceScaler.init; useGameLoopManager(); useGameOrchestrator()
                       └─ <GameScene/>        → useGameLoop()
                            ├─ (mount) GameRuntime.registerSystem × N，runtime.start()
                            └─ (每幀) useFrame → GameRuntime.update(delta)
                                          └─ 逐一 system.update(delta):
                                             ChunkStreamer → TrafficAI → ShopSystem
                                             → QuestSystem → PickupSystem → VehiclePhysics
                                          （EnvironmentSystem 另由 useGameLoop 單獨更新）
```

兩層迴圈：**App 層**（`useGameLoopManager`/`useGameOrchestrator`：天氣、晝夜、統計、成就、存檔）與 **Scene 層**（`useGameLoop` → `GameRuntime`：核心 gameplay 系統）。

### 4.2 世界串流與分區資料流（核心）

```
VehiclePhysics 寫 gameStore.vehicle / worldStore.playerPosition
        │
        ▼
ChunkStreamer.update()  ── 依 playerPosition 計算需載入的 (cx,cz)
        │  WorldGenerator.generateChunk(cx,cz)
        │      └─ determineZone() → ZoneManager.zoneAtChunk(cx,cz)   ← 單一權威
        │      └─ 產生 chunkData(含 zone) / shops / pois
        ▼
worldStore.registerChunk(chunkId, chunkData)   →  activeChunks: Map
        │
        ├─► ChunkRenderer / DecorationBatchSystem / CityStreetSystem  訂閱 activeChunks → 依 zoneAtChunk 渲染
        ├─► WorldShopSpawner（依 zoneAtChunk）→ shopStore.registerShop
        ├─► NPCSpawner（依 zoneAtChunk）→ QuestManager.assignQuestsToNPC
        └─► MiniGameRenderer 每幀以 zoneColor(zoneAtWorld()) 疊出分區小地圖
```

**關鍵設計：所有「這裡是什麼分區？」一律查 `ZoneManager.zoneAtChunk`（純函式、確定性、100m 格）**，使渲染/商店/裝飾/NPC/任務/小地圖一致。`HighwayNetworkSystem` 的分隔式幹道仍固定在 `cx===0`，`cx=±1` 為 highway 緩衝（抑制商店/房屋）。

### 4.3 任務流程（實際使用路徑：QuestManager）

```
NPCSpawner 生成 NPC → QuestManager.assignQuestsToNPC(chunkId, roadType, level)
   └─ loadChunkQuests: zoneCategoryWeights(zone) 加權選類別（seeded by chunkId）
        └─ generateQuest: 模板過濾(level/roadType) → 目標位置
             · reachLocation：100m 格上路；delivery → pickNearbyShop(真實商店)
玩家靠近 NPC → gameStore.setInteractionTarget → <QuestDialog/> 接受
   → gameStore.availableQuests/activeQuest
QuestProgressTracker / useQuestProgressSync 依車輛狀態推進 → completeQuest → 發獎
SaveManager 每 30s 存檔（schema v2：載入舊檔丟棄過期 quest 座標）
```

> 平行存在的 `QuestSystem`（systems/）與 `QuestChunkManager`+`NPCQuestGiver`（死碼）為歷史演進殘留。

### 4.4 關鍵演算法

- **分區決策**（`ZoneManager.zoneAtChunk`）：走廊 `|cx|<=1`→highway；中環依沿 Z 主題帶 `band=floor(cz/DISTRICT_DEPTH)` 與 `(ring+band)%3` 輪替；外環 seeded hash 點綴 industrial。純確定性。
- **道路片段型別**（`driveSurface.getDriveChunkType(idx)`）：依 `abs(idx)%N` 週期決定 STRAIGHT/RAMP/TOLL/OVERPASS/ELEVATED/CURVE/ROTATING_INTERCHANGE；`sampleDriveSurface` 供物理取樣高架/匝道高度。
- **確定性 seeding**：多處用 `mulberry32(hash(chunkId))`（QuestManager/WorldShopSpawner/NPCSpawner）與 `SeededRandom`（WorldGenerator/TrafficAI），確保「開遠再回／重整」世界一致（global seed=42）。

---

## 5. 對外介面（API / CLI / 主要簽章）

本專案無對外 HTTP API，無 CLI。對外「介面」即下列三類：

### 5.1 npm scripts
- `npm run dev` — Vite 開發伺服器
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — 預覽 build
- `npm run typecheck` — `tsc -b --noEmit`
- `npm run lint` — ESLint

### 5.2 鍵盤/玩家輸入（App.tsx 全域）
- `Esc` 暫停/恢復（室內時退出商店）、`Q` 任務面板、`E` 進入最近商店、`X` 離開商店；駕駛控制由 `InputManager`/`useControls`（WASD/方向鍵 + 觸控）。

### 5.3 主要程式介面（供接手開發呼叫）
- **分區**：`zoneAtChunk(cx,cz)`、`zoneAtWorld(x,z)`、`roadTypeForZone(zone)`、`zoneColor(zone)`、`zoneLabel(zone)`、`ZONE_GRID_SIZE`（`systems/ZoneManager`）。
- **世界**：`WorldGenerator.getInstance().generateChunk(cx,cz)`；`ChunkStreamer.getInstance().init()`；`useWorldStore`（`registerChunk`、`activeChunks`、`setPlayerPosition`）。
- **執行**：`GameRuntime.getInstance()`（`registerSystem`、`update`、`on/dispatchEvent`）；`GameSystem` 介面（`init/update/dispose`）。
- **任務**：`QuestManager.getInstance()`（`loadChunkQuests`、`generateQuest`、`assignQuestsToNPC`、`acceptQuest`、`updateQuestProgress`、`completeQuest`）。
- **商店**：`useShopStore`（`registerShop`、`getShopsInChunk`、`enterShopInterior/exitShopInterior`、`buyItem`）。
- **存檔**：`SaveManager.getInstance()`（`init/save/load/reset/dispose`，`SAVE_VERSION`）。
- **車輛數值**：`calculateEffectiveStats(ownedItems)`、`applyStatsToPhysics(stats)`（`systems/VehicleUpgradeSystem`）。
- **道路幾何**：`getDriveChunkType(idx)`、`sampleDriveSurface(x,z,wasElevated)`、`getDriveAccessRampsForChunk(cx,cz)`（`utils/driveSurface`）。
- **狀態 store**：`useGameStore / useWorldStore / useShopStore / useQuestStore / useTrafficStore / usePerformanceStore`。

---

## 6. 已知問題與待辦彙整（給接手者）

1. **✅【已修復】`src/App.tsx` build 阻斷**：
   - import 路徑修正（`PlayerVehicle`/`CameraRig` 改回 `./components/...`）。
   - **新建** `src/components/world/WorldSyncManager.tsx`（先前根本不存在）：每幀依車速驅動 `MusicManager.updateDynamics` + 防禦性世界座標同步。
   - 於 App 補上 `const musicRef = useRef(MusicManager.getInstance())`、`import * as THREE`。
   - `<PlayerVehicle ref={vRef}/>` 修正為 `vehicleRef={vRef}`（PlayerVehicle 非 forwardRef）。
   - App.tsx 原有元件**全部保留**（依使用者要求未刪除）。
2. **✅【已修復】車輛狀態型別**：`IVehicleState`（core.ts）補上 `maxSpeed`/`boostTimer`/`steerAngle`，`INITIAL_VEHICLE` 同步補值；`gameStore` **新增實際的 `controls` 欄位 + `INITIAL_CONTROLS`，並把原本是 noop 的 `setControls` 改為真正寫入**（先前車輛根本收不到輸入，屬潛在 runtime bug）；`VehiclePhysics` 的 `VehicleState` 改從 `@/types/core` import。`typecheck` 現為 0 錯誤。
   - ⚠️ 仍待清理：`types/core.ts` 與 `types/quest.ts` 各有一套 `Quest/QuestObjective/ObjectiveType`（後者含 `reach_location` snake_case 變體），`core.ts` 內 `QuestObjective` 重複宣告。目前可編譯，但建議後續收斂為單一來源。
3. **✅【已修復】重複掛載**：`PlayerVehicle`/`CameraRig`/`QuestProgressTracker` 先前在 App 與 GameScene **各掛一次**（雙車／雙相機／任務進度重複累加）。現統一由 **App 掛載一次**；`GameScene` 改為接收 App 傳入的 `vehicleRef`（`<GameScene vehicleRef={vRef} />`）供 `GarageZone`/`ShopInteraction` 追車。App 內重複的第二個 `<QuestDialog/>` 也已移除（現只剩一個）。
4. **✅【已修復】QuestDialog 無限 re-render 崩潰**：`src/components/ui/QuestDialog.tsx` 先前在 render 中直接呼叫 `setSelectedQuestId(null)`（→ "Too many re-renders"），且 `useCallback`/`useEffect` 被放在 early-return 之後（違反 Rules of Hooks）。已改為：所有 hooks 移到最上方且無條件呼叫、用 `useEffect` 依 `isActive` 重置選取、early-return 移到 hooks 之後；並移除誤植的 `import { drawIndex, select } from 'three/webgpu'`。
5. **✅【已修復】撞擊後車輛永久卡死**：根因是 `GarageZone` 與 `ShopInteraction` 的**proximity 自動觸發**——車庫在高速公路中線每 2000m、商店在 z=1500，玩家只要開進範圍就自動 `setGameMode('garage'/'shop')`＋把車吸附並 `speed:0`；而該模式下 `VehiclePhysics` 直接 return（物理停用），車又被吸附在觸發半徑內，離開條件（dist>20/25）永遠不成立 → 永久凍結且無 UI。修法：車庫改為**按 G 才進入**（符合畫面提示）且 `App` 將 `GarageModal` 綁定 `gameMode==='garage'`、關閉時回到 `playing`；`ShopInteraction` 移除自動進入（真正購物走 E 鍵 + `shopStore` + `ShopInteriorScene`）。
6. **✅【已修復】無法駛離高速公路 / 看不到分區**：`VehiclePhysics` 先前把車側向夾在 `maxDriveX=42`（且超出時 `speed*=0.92`、heading 強制歸零＝像撞到隱形牆卡住），玩家根本到不了商家/住宅/一般道路區。修法：放寬到 `MAX_DRIVE_X=700`（≈cx ±7，涵蓋所有分區）且只在中央走廊（`|x|<=60`）做高架/匝道地表取樣、其餘分區為平坦可駛地面。世界本來就是 2D 串流（`HighwayNetworkSystem`/`ChunkStreamer` 依玩家 X/Z 載入方塊區），故無未渲染黑畫面風險。現在向側邊開即可穿越「高速公路→商家/住宅→一般道路」並看到明顯分區（小地圖亦同步上色）。
7. **命名/重複檔**：`MiniGameRenderer.tsx`(實作) vs `MinimapRenderer.tsx`(shim)；`AchivementPanel.tsx`(實作，拼字錯) vs `AchievementPanel.tsx`(空)。
8. **死碼（未掛載）**：`NPCQuestGiver`、`QuestChunkManager`、`RoadNetworkGenerator`、`HighwayChunkGenerator`、`WorldStreamManager`、`components/WorldChunks.tsx`。`constants/road.ts`（60m 格）僅死碼使用。
9. **平行系統**：任務有 `QuestManager`(實際用) 與 `QuestSystem`/`QuestChunkManager`(舊/死) 兩套；`gameStore` 與 `questStore` 任務欄位部分重疊。建議後續收斂。
10. **placeholder**：`StartScreen` 背景動畫、`QuestZoneIndicator` 距離標籤、`useVehicleCustomization` 的 `spoiler-placeholder`。

---

## 7. 玩法擴充系統（A–E，已實作）

在地基之上新增的實際玩法（全部「可恢復、不凍結」，絕不用 proximity 自動切 gameMode）：

| 主題 | 新檔/改動 | 重點 |
|------|-----------|------|
| **A 碰撞風險** | `TrafficAIController.tsx`(碰撞+近距) · `VFXLayer.tsx`(新) · `CrashOverlay.tsx`(檢查點重生) · `gameStore`(invulnerableUntil/combo) | 撞車流＝減速/擊退/扣血/火花，0.8s 無敵；擦身 combo；血量歸零→在 `lastCheckpoint` 重生。`VFXManager` 終於被掛載渲染。 |
| **B 分區活動** | `stores/activityStore.ts`(新引擎) · `ActivityRunner.tsx`(新) · `ui/ActivityHUD.tsx`(新) · `QuestDialog`(送貨啟動) | 通用 checkpoint+計時引擎：高速公路競速(按 R)、鄉間巡遊(按 T)、商家送貨(接 delivery 任務)。 |
| **C 進度/車庫** | `types/core`(rank/reputation/paint/mults) · `gameStore`(equip 套數值/purchase/setPaint/addReputation) · `VehicleUpgradeSystem`(effectiveVehicleStats) · `GarageModal.tsx`(重寫:車輛/升級/外觀/維修) · `VehiclePhysics`(accel/handlingMult) · `SaveManager`(v3) | 段位/聲望、買換車(操控真的不同)、inventory 升級套到物理、烤漆、付費維修。 |
| **D 活的世界** | `PoliceSystem.tsx`(新) · `EventDirector.tsx`(新) · `gameStore`(wantedLevel) | 通緝值→警車追逐(複用碰撞)、甩開給獎；隨機寶箱事件；HUD 通緝星級。 |
| **E Meta** | `POISystem.tsx`(新,景點探索) · `stores/dailyStore.ts`(新) · `ui/ComboIndicator.tsx` · `ui/DailyChallenges.tsx` · `AchievementManager`(解鎖 toast) | 景點發現(接活 `discoverPoi` 死資料)、每日挑戰(日期 seed,自動發獎)、combo HUD、成就解鎖通知。 |

**操作鍵**：`R` 高速公路競速、`T` 鄉間巡遊、`G` 車庫、`E` 進店、`Q` 任務、`Esc` 暫停。
**新 store**：`activityStore`、`dailyStore`（加上既有 6 個共 8 個 zustand store）。

## 附註：掃描涵蓋與限制

- 掃描範圍：`src/` 下全部 **138** 個 `.ts/.tsx`（共 ~25,700 行），已排除 `node_modules`、`.git`、`dist`。
- **無任何檔案無法讀取**（全部可存取）。
- 為控制篇幅，超大檔（如 1.7k 行的 `HighwayNetworkSystem.tsx`、706 行 `QuestSystem.ts`、528 行 `ShopInteriorScene.tsx`）以「最高層級類別/方法 + 職責」摘要，未逐行展開；極簡的 getter/setter、格式化與數學輔助函式（`utils/format.ts`、`utils/math.ts` 等）以群組方式概述。
- 標 ★ 之檔案為核心業務邏輯，建議優先閱讀。
