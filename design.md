# GuitarTabs 设计文档

- 文档版本：v2.0
- 初版日期：2026-04-17
- 最近更新：2026-04-18

## 1. 背景与目标

### 1.1 产品定位
GuitarTabs 是一款用于吉他谱记录、浏览、注释与播放的跨平台应用，面向学习者、教师和内容整理者。

### 1.2 主要目标
- 统一管理本地 Guitar Pro 乐谱文件。
- 支持六线谱 / 五线谱切换显示。
- 提供基于小节的内联注释与注释抽屉。
- 支持基础播放控制与定位跳转。
- 在桌面端与浏览器端保持尽可能一致的体验。

### 1.3 非目标
- 不在本阶段实现云端协作编辑。
- 不在本阶段实现复杂的谱面排版编辑器。
- 不依赖后端服务完成基础读写。
- 不承诺支持所有第三方谱面格式的完全兼容，只以 AlphaTab 已支持范围为准。

### 1.4 目标用户
- 学习者：记录练习笔记、标记难点、回放复听。
- 教师：为乐谱添加讲解注释并分享给学生。
- 整理者：集中管理本地曲谱与注释内容。

## 2. 设计原则

### 2.1 体验原则
- 注释必须“贴在谱上”，而不是仅存在列表中。
- 核心操作尽量一眼可见，减少多级弹窗。
- 播放、选中、注释三类状态保持同步。
- 任意操作失败都应给出明确反馈，不允许静默失败。

### 2.2 技术原则
- 以 AlphaTab 作为谱面渲染核心，避免重复造轮子。
- Electron 仅承担桌面壳层与文件访问，不承载业务逻辑。
- 前端状态使用轻量全局状态管理，避免深层 props 传递。
- 注释数据与谱面文件解耦，便于重命名和迁移。

## 3. 技术架构

### 3.1 总体架构
```text
Electron Shell
  └─ Web App (React SPA)
       ├─ Score Viewer / Annotation Layer
       ├─ Playback Controls
       ├─ Annotation Drawer
       ├─ State Store (Zustand)
       └─ Services
            ├─ AlphaTab Rendering
            ├─ AlphaSynth Playback
            ├─ File Hash / Persistence
            └─ Import / Export
```

### 3.2 技术选型
| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面壳 | Electron | 仅用于桌面打包、文件系统访问与窗口管理 |
| UI 框架 | React 18+ | 组件化开发，生态成熟 |
| 构建工具 | Vite | 开发启动快，热更新体验好 |
| 乐谱渲染 | AlphaTab | 支持 Guitar Pro 导入、乐谱渲染与播放数据 |
| 音频播放 | AlphaSynth | 与 AlphaTab 配套使用 |
| 状态管理 | Zustand | 轻量、直接、便于维护 |
| 样式 | Tailwind CSS | 快速搭建 UI，便于统一设计语言 |
| 打包 | electron-builder | 支持桌面安装包产物 |
| 测试 | Playwright / Vitest | 覆盖 E2E、组件与工具函数 |

### 3.3 部署模式
- Web 模式：直接运行 SPA，使用浏览器能力完成主要交互。
- 桌面模式：通过 Electron 访问本地文件系统，支持更完整的导入/持久化能力。
- 两种模式共用同一套业务组件，差异仅体现在文件访问与存储层。

## 4. 业务范围

### 4.1 乐谱展示
#### 功能点
- 支持六线谱 / 五线谱切换。
- 支持缩放显示。
- 支持点击小节跳转定位。
- 支持多小节横向滚动浏览。

#### 交互要求
- 切换谱面类型时，保留当前文件、注释与播放位置。
- 缩放只影响视图，不改变数据本身。
- 跳转后应高亮当前小节，便于用户确认位置。

### 4.2 文件导入
#### 支持格式
- `.gp3`
- `.gp4`
- `.gp5`
- `.gtp`
- `.xml` / `.musicxml`（MusicXML，按 AlphaTab 当前兼容范围支持，存在部分降级可能）

#### 流程
1. 用户选择文件。
2. 系统校验格式与大小。
3. 根据文件类型选择解析器：Guitar Pro 或 MusicXML。
4. AlphaTab 解析并加载谱面。
5. 计算文件 hash。
6. 查询并恢复匹配的注释数据。

#### 导入规则
- 同一逻辑文件可通过 hash 识别，而不是只依赖文件名。
- 导入失败时必须区分“格式不支持”“文件损坏”“文件过大”“解析异常”。
- MusicXML 文件与 Guitar Pro 文件应走统一的导入结果结构，避免上层组件感知格式差异。
- 如不同格式在小节编号或声部结构上存在差异，应在导入适配层完成归一化。
- MusicXML 能力边界应以 AlphaTab 的实际兼容情况为准，必要时允许局部降级显示。

### 4.3 播放控制
#### 能力
- 播放 / 暂停 / 停止。
- 进度拖动。
- 播放速度调节：0.25x ~ 2.0x。

### 4.4 注释系统
#### 功能点
- 基于小节创建注释。
- 支持多个注释挂在同一小节。
- 支持编辑、删除、跳转。
- 支持抽屉列表与谱面气泡两种入口。

#### 设计目标
- 注释在谱面上可见，但不遮挡主要内容。
- 列表用于管理，气泡用于快速预览。
- 编辑应尽量在原位完成，降低上下文切换成本。

## 5. 核心数据模型

### 5.1 乐谱与小节
```typescript
interface ScoreDocument {
  id: string;
  filePath: string;
  fileName: string;
  fileHash: string;
  title?: string;
  artist?: string;
  viewMode: 'tab' | 'standard';
  measureCount: number;
}
```

### 5.2 注释模型
```typescript
interface Annotation {
  id: string;
  scoreHash: string;
  measureIndex: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.3 渲染位置信息
```typescript
interface MeasurePosition {
  measureIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### 5.4 应用状态
```typescript
interface AppState {
  score: ScoreDocument | null;
  measurePositions: Map<number, MeasurePosition>;
  annotations: Annotation[];
  ui: {
    selectedMeasures: number[];
    drawerOpen: boolean;
    activeAnnotationId: string | null;
    highlightMeasureIndex: number | null;
  };
  player: {
    isPlaying: boolean;
    positionMs: number;
    playbackSpeed: number;
    loopRange: { from: number; to: number } | null;
  };
}
```

## 6. 关键交互流程

### 6.1 导入与恢复
```text
选择文件 -> 校验格式 -> 解析谱面 -> 计算 hash -> 恢复注释 -> 渲染谱面
```

关键点：
- hash 作为注释关联主键。
- 若同名文件内容变化，应视为新的谱面对象。
- 若 hash 相同但路径变化，应恢复原注释。

### 6.2 小节注释创建
```text
点击小节 -> 进入选中态 -> 输入注释 -> 保存 -> 气泡生成 -> 抽屉列表刷新
```

关键点：
- 点击小节时高亮命中区域。
- 保存后立即更新谱面气泡，不依赖页面刷新。
- 空内容不允许保存。

### 6.3 注释浏览与跳转
```text
打开抽屉 -> 浏览列表 -> 点击条目 -> 滚动到小节 -> 展开气泡 -> 标记 active
```

关键点：
- 列表按 measureIndex 排序。
- 点击条目后，谱面应自动滚动到目标小节。
- 若目标小节不在当前可视区域，应优先定位再高亮。

## 7. 组件设计

### 7.1 组件职责
| 组件 | 职责 | 依赖 |
|------|------|------|
| `ScoreViewer` | 谱面渲染容器，集成 AlphaTab | AlphaTab API |
| `AnnotationLayer` | 叠加注释气泡与命中区域 | `measurePositions`、`annotations` |
| `AnnotationBubble` | 单个小节注释气泡 | `Annotation`、布局坐标 |
| `AnnotationDrawer` | 右侧注释抽屉面板 | `AnnotationList` |
| `AnnotationList` | 注释列表与排序 | `AnnotationItem` |
| `AnnotationItem` | 单条注释展示、编辑入口 | 无 |
| `PlayerControls` | 播放控制条 | AlphaSynth / 播放状态 |
| `Toolbar` | 导入、切换谱面、缩放等操作 | 文件选择器、状态 |
| `FileInput` | 文件导入入口 | 无 |
| `MeasureOverlay` | 小节透明命中层 | `ScoreViewer` |

### 7.2 Props 约定
```typescript
interface ScoreViewerProps {
  score: ScoreDocument | null;
  viewMode: 'tab' | 'standard';
  onMeasureClick: (measureIndex: number) => void;
  onPositionsCalculated: (positions: Map<number, MeasurePosition>) => void;
}

interface AnnotationBubbleProps {
  annotation: Annotation;
  position: { x: number; y: number };
  isActive: boolean;
  onClick: () => void;
  onEdit: (content: string) => void;
}

interface AnnotationDrawerProps {
  isOpen: boolean;
  annotations: Annotation[];
  activeAnnotationId: string | null;
  onToggle: () => void;
  onAnnotationClick: (id: string) => void;
  onAnnotationDelete: (id: string) => void;
}
```

## 8. AlphaTab 集成方案

### 8.1 位置获取
AlphaTab 渲染后需要获取每个小节的坐标，用于气泡定位与命中层绘制。建议采用“两步法”：

1. 先通过渲染回调或渲染结果获取小节边界。
2. 将结果写入 `measurePositions`，供注释层与抽屉联动使用。

### 8.1.1 MusicXML 兼容说明
- MusicXML 导入后应尽量映射为与 Guitar Pro 一致的 `ScoreDocument`、`MeasurePosition` 和 `Annotation` 结构。
- 若 MusicXML 中存在多个乐器声部，默认只呈现当前主谱或当前选中的谱表。
- 若某些 MusicXML 特性无法完全映射，应在导入阶段降级处理，并向用户提示可能存在显示差异。

### 8.2 定位原则
- 气泡定位基于小节左上角或上边界附近。
- 同一小节存在多个注释时，采用纵向堆叠。
- 若超出容器宽度，允许自动翻转到左侧或下方。

### 8.3 示例流程
```typescript
const positions = new Map<number, MeasurePosition>();

alphaTabRenderer.onRender((result) => {
  result.measures.forEach((measure) => {
    positions.set(measure.index, {
      measureIndex: measure.index,
      x: measure.bounds.x,
      y: measure.bounds.y,
      width: measure.bounds.width,
      height: measure.bounds.height,
    });
  });

  setMeasurePositions(positions);
});
```

## 9. 注释展示规则

### 9.1 气泡状态
| 状态 | 表现 | 行为 |
|------|------|------|
| 默认 | 小尺寸气泡，仅显示摘要 | 不遮挡谱面主内容 |
| 悬停 | 显示完整预览与手型光标 | 提示可点击编辑 |
| 展开 | 弹出浮层展示完整内容 | 支持编辑、删除、关闭 |

### 9.2 视觉要求
- 气泡颜色应低干扰，避免盖住谱面主要信息。
- 摘要文字超出时使用省略号。
- 同一小节多条注释时，需保留间距与层级。

### 9.3 排序规则
- 默认按 `measureIndex` 升序。
- 同一小节内按 `createdAt` 升序。
- 新建注释应立即出现在当前小节列表中。

## 10. 数据持久化

### 10.1 存储策略
- Web 端：`localStorage` 或 `IndexedDB`，优先考虑更适合扩展的 `IndexedDB`。
- Electron 端：`electron-store` 或本地 JSON 文件。
- 注释与应用配置分离存储，避免互相污染。

### 10.2 键设计
建议采用以下结构：
```json
{
  "scoreHash": "sha256-...",
  "annotations": [ ... ],
  "updatedAt": "2026-04-18T10:00:00.000Z"
}
```

### 10.3 恢复逻辑
- 导入文件后先计算 hash。
- 如果命中已有 hash，自动恢复对应注释。
- 如果没有命中，创建新的空注释集合。
- 如检测到旧版本数据结构，先做迁移再加载。

## 11. 错误处理与边界情况

| 场景 | 处理方式 |
|------|----------|
| 格式不支持 | 提示“当前文件格式不受支持” |
| 文件损坏 | 提示解析失败，并允许重新选择文件 |
| 文件过大 | 提示可能影响性能，询问是否继续导入 |
| 渲染失败 | 显示占位状态，并记录错误日志 |
| 无音色库 | 提示安装或加载音色库 |
| 存储空间不足 | 提示导出或清理旧数据 |
| 小节位置缺失 | 禁用对应气泡，避免悬空展示 |

## 12. 可访问性与体验要求

### 12.1 可访问性
- 所有可交互元素都应有明确 `aria-label`。
- 支持键盘操作：Tab、Enter、Esc、方向键。
- 抽屉和浮层必须支持焦点管理。
- 气泡内容应可被屏幕阅读器读取。

### 12.2 体验细节
- 播放高亮变化应平滑，不要闪烁。
- 气泡出现/消失使用短时动画即可，不应过度干扰阅读。
- 抽屉开合时保留当前滚动位置。
- 缩放倍率应记忆到当前乐谱会话。

## 13. 测试策略

### 13.1 单元测试
建议覆盖：
- `fileHash` 计算逻辑。
- `measurePosition` 转换逻辑。
- MusicXML 解析后的归一化逻辑。
- 注释 CRUD reducers / store actions。
- 排序与过滤函数。

### 13.2 集成测试
建议覆盖：
- AlphaTab 渲染结果解析。
- 注释创建后气泡是否正确落位。

### 13.3 E2E 测试
建议覆盖：
- 文件导入。
- MusicXML 文件导入。
- 谱面渲染。
- 小节点击选中。
- 注释创建 / 编辑 / 删除。
- 抽屉打开 / 关闭。
- 六线谱 / 五线谱切换。

### 13.4 测试夹具
```typescript
export const testScore = {
  path: 'test-fixtures/sample.gp5',
  measureCount: 16,
  hash: 'a1b2c3d4...'
};
```

## 14. 建议目录结构
```text
guitar-tabs/
├─ electron/
│  └─ main.ts
├─ src/
│  ├─ components/
│  │  ├─ ScoreViewer.tsx
│  │  ├─ AnnotationBubble.tsx
│  │  ├─ AnnotationLayer.tsx
│  │  ├─ AnnotationDrawer.tsx
│  │  ├─ AnnotationList.tsx
│  │  ├─ AnnotationItem.tsx
│  │  ├─ PlayerControls.tsx
│  │  ├─ Toolbar.tsx
│  │  ├─ FileInput.tsx
│  │  └─ MeasureOverlay.tsx
│  ├─ stores/
│  │  └─ useAppStore.ts
│  ├─ hooks/
│  │  ├─ useAnnotations.ts
│  │  └─ useScoreRenderer.ts
│  ├─ utils/
│  │  ├─ measurePosition.ts
│  │  └─ fileHash.ts
│  ├─ types/
│  │  └─ index.ts
│  ├─ App.tsx
│  └─ main.tsx
├─ public/
│  └─ samples/
├─ tests/
│  ├─ e2e/
│  ├─ unit/
│  └─ fixtures/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ electron-builder.json
```

## 15. 待确认事项
- 是否必须支持五线谱与六线谱的实时切换，还是仅作为导入后的展示模式？
- 注释是否需要导出/导入能力，格式是 JSON 还是纯文本？
- 大文件导入的性能边界是多少，是否需要分段加载？
- 气泡动画是否需要更强的视觉风格，还是以低干扰为主？

## 16. 风险与建议

### 16.1 主要风险
- AlphaTab 的渲染坐标获取方式如果不稳定，会影响注释定位。
- 同一小节多注释与长文本气泡容易造成遮挡。
- 文件 hash 作为主键虽然可靠，但会让“同名不同内容”被视作不同乐谱，需要用户理解这一点。
- 桌面端与 Web 端在存储和文件访问能力上存在天然差异。

### 16.2 建议
- 先实现“导入 + 渲染 + 小节注释 + 抽屉管理 + 本地持久化”的最小闭环。
- 先支持单文件离线场景。
- 先把谱面定位和体验增强做完，再做更复杂的视觉优化。
- 为 AlphaTab 相关逻辑预留独立适配层，避免未来替换渲染引擎时大面积改动。
- MusicXML 支持建议与 Guitar Pro 导入共用同一套上层能力，差异收敛在解析适配层。

---

如果后续进入实现阶段，建议把本设计拆成以下里程碑：
1. 乐谱导入与渲染
2. 注释 CRUD 与持久化
3. 体验增强
4. 发布准备

## 17. MVP 范围建议

### 17.1 第一阶段必须交付
- 本地导入 `.gp3/.gp4/.gp5/.gtp` 文件。
- 若实现成本可控，同步加入 MusicXML 导入作为首版支持格式。
- 使用 AlphaTab 完成谱面渲染。
- 支持小节点击与当前小节高亮。
- 支持单小节注释创建、编辑、删除。
- 支持注释抽屉列表。
- 支持本地持久化与重载恢复。

### 17.2 第一阶段可延后
- 五线谱 / 六线谱实时切换。
- 注释导出 / 导入。
- 搜索、筛选与标签能力。
- 更复杂的动画和视觉主题切换。

### 17.3 版本优先级
| 优先级 | 功能 | 说明 |
|------|------|------|
| P0 | 导入、渲染、注释、持久化 | 没有这些就不能形成闭环 |
| P1 | 体验增强、抽屉管理 | 提升可用性和完成度 |
| P2 | 导出、主题优化 | 属于增强能力 |

## 18. 验收标准

### 18.1 功能验收
- 任意支持格式文件导入后，能在 3 秒内完成可视化反馈；若超时，应展示加载状态。
- MusicXML 文件导入后应能正确显示谱面并恢复注释。
- 小节点击后，当前小节状态、注释气泡与抽屉条目应同时变化。
- 注释保存后刷新页面仍可恢复。
- 重新导入同一谱面文件后，历史注释仍可自动关联。

### 18.2 质量验收
- 不得出现导入后无响应、点击无反馈、保存后丢失等静默失败。
- 核心操作路径至少有明确成功/失败提示。
- 主流程在桌面端与网页端的行为应保持一致。
- 核心交互不依赖人工刷新页面。

### 18.3 性能验收
- 常规曲谱导入与渲染应保持流畅。
- 注释列表刷新不应触发整页重绘。
- 小节定位计算应尽量复用已有渲染结果，不重复扫描全谱。

## 19. 术语定义

### 19.1 术语表
| 术语 | 含义 |
|------|------|
| 谱面 | 通过 AlphaTab 渲染出的吉他谱页面 |
| 小节 | 谱面中最小的定位与注释单元 |
| 气泡 | 贴在小节附近的注释预览 UI |
| 抽屉 | 右侧的注释管理侧边栏 |
| hash | 用于识别同一谱面文件的内容指纹 |

## 20. 设计决策记录

### 20.1 已确定
- 以小节作为注释粒度。
- 以文件内容 hash 作为注释主键。
- 以 AlphaTab 作为唯一渲染引擎。
- 以本地离线作为唯一运行模式。

### 20.2 仍待确认
- 是否将注释模型扩展到“段落级”或“乐句级”。
- 是否需要独立的导出格式版本号。
- 是否要允许用户手动修复 hash 关联。

## 21. 后续演进建议

### 21.1 第二阶段
- 添加注释导出 / 导入。
- 增强搜索、筛选与标签能力。

### 21.2 暂不纳入当前版本
- 云同步、账号体系、多设备同步、分享链接与只读预览不在当前离线版本范围内。

### 21.3 架构预留
- 注释存储层应抽象成独立仓储接口，方便替换持久化实现。
- 乐谱渲染层应保留适配层，避免未来切换渲染器时影响业务层。
- UI 组件应避免直接读取文件系统，统一通过服务层访问。

## 22. 实现拆解建议

### 22.1 阶段一：基础闭环
目标是先把“导入 -> 渲染 -> 注释 -> 持久化”跑通。

- 建立项目基础脚手架与目录结构。
- 接入 AlphaTab，完成单文件谱面渲染。
- 完成文件导入、hash 计算与注释恢复。
- 完成小节点击、选中和当前小节高亮。
- 完成注释 CRUD 与本地持久化。
- 完成注释抽屉列表与跳转联动。

### 22.2 阶段二：体验增强
目标是提升可用性和可维护性。

- 完善导入错误提示与空状态。
- 完善键盘快捷键与无障碍支持。
- 完善注释动画、悬停态和展开态。
- 增加注释导出 / 导入。
- 增加搜索、筛选、标签能力。

### 22.3 阶段三：发布准备
目标是让产品具备稳定交付能力。

- 补齐单元测试、集成测试和 E2E 测试。
- 完善桌面端打包配置。
- 处理桌面端与 Web 端差异。
- 输出用户说明或最小帮助文档。

## 23. 模块边界建议

### 23.1 服务层
服务层负责所有副作用和外部能力，不直接暴露给 UI 组件。

- `fileHashService`：负责文件 hash 计算。
- `scoreImportService`：负责文件校验与谱面导入。
- `annotationStoreService`：负责注释读写与迁移。
- `playbackService`：负责基础播放控制。
- `scoreLayoutService`：负责小节位置与布局数据整理。

### 23.2 状态层
状态层仅保存“当前 UI 与业务状态”，不执行复杂副作用。

- 由 store 保存当前谱面、注释、播放状态、选择状态。
- 由 action 触发服务层能力，再把结果写回状态。
- 避免把 AlphaTab 实例直接塞进全局状态，减少序列化和可测试性问题。

### 23.3 视图层
视图层只关心渲染和交互，不关心存储细节。

- `ScoreViewer` 负责谱面呈现与点击命中。
- `AnnotationLayer` 负责气泡和定位。
- `AnnotationDrawer` 负责列表浏览与跳转。
- `Toolbar` 负责导入、切换、缩放等入口。
- `PlayerControls` 负责播放面板交互。

## 24. 接口约定建议

### 24.1 文件导入接口
```typescript
interface ImportScoreResult {
  score: ScoreDocument;
  positions: Map<number, MeasurePosition>;
  annotations: Annotation[];
}

interface ScoreImportService {
  importFile(file: File | string): Promise<ImportScoreResult>;
}
```

### 24.2 注释仓储接口
```typescript
interface AnnotationRepository {
  load(scoreHash: string): Promise<Annotation[]>;
  save(scoreHash: string, annotations: Annotation[]): Promise<void>;
  remove(scoreHash: string): Promise<void>;
  export(scoreHash: string): Promise<string>;
  import(scoreHash: string, payload: string): Promise<void>;
}
```

### 24.3 播放控制接口
```typescript
interface PlaybackController {
  play(): void;
  pause(): void;
  stop(): void;
  seek(positionMs: number): void;
  setSpeed(speed: number): void;
  setLoopRange(range: { from: number; to: number } | null): void;
}
```

## 25. 风险控制清单

### 25.1 最高优先级风险
- AlphaTab 坐标获取不稳定。
- 注释定位受缩放与容器尺寸变化影响。
- 播放状态与小节高亮不同步。

### 25.2 缓解策略
- 给渲染位置信息加版本号和重算机制。
- 每次缩放或容器重排后都允许重新计算位置。
- 播放高亮和手动选中分离成独立状态。
- 所有关键流程都保留可回退的空状态。

## 26. 评审检查清单

### 26.1 设计评审时重点确认
- 注释粒度是否始终固定为“小节”。
- 是否接受 hash 作为唯一主键策略。
- 是否接受本地优先、无账号起步的产品方向。
- 是否需要先做桌面端还是先做 Web 端。
- 是否要在第一版就纳入导出能力。

### 26.2 开发前必须确认
- AlphaTab 和 AlphaSynth 的具体版本。
- Electron 是否为必须项，还是可延后到桌面版。
- 注释数据是否需要向下兼容旧版本。
- 测试基线是否先用样例谱面文件建立。
