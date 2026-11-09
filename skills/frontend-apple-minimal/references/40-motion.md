# 40 · 动效：曲线、时长、编排、性能

---

## 1. 曲线

### 四条够用的曲线

| token | 值 | 用途 | 为什么 |
|---|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 入场、展开 | 起步快、末尾极缓，接近「物体被放下」 |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | 往返、切换 | 对称，来回速度一致 |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | 离场、收起 | 加速离开，暗示「不再需要」 |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 位移、滑动 | Material 的标准曲线，中段匀速感最强 |

### 为什么不用 ease / linear

- `ease`（默认值）在 0.25/0.1/0.25/1，收尾不够干净，20px 以上的位移会「滑一下再停」。
- `linear` 只用于**滚动驱动**（因为进度必须线性映射，否则滚动与动画不同步）与**无限循环**（加载指示）。

### 数值怎么读

`cubic-bezier(x1, y1, x2, y2)` 的两个控制点。y1 > 1 表示「过冲」（先冲过终点再回来），`0.16, 1, 0.3, 1` 的 y1=1 刚好到顶不过冲，这是它耐看的原因。想做「弹一下」用 `0.34, 1.56, 0.64, 1`，但只在 ≤ 200ms 的微交互里用，长动画过冲会晕。

---

## 2. 时长阶梯

| token | 值 | 用途 | 理由 |
|---|---|---|---|
| `--t-1` | 120ms | hover、按下、颜色变化 | 低于 100ms 人会以为「瞬间」而非「过渡」 |
| `--t-2` | 240ms | 展开、淡入、位移 ≤ 24px | 默认值，覆盖 80% 的场景 |
| `--t-3` | 400ms | 面板滑入、整段替换 | 超过 300ms 才读得出「这是一次转场」 |
| `--t-4` | 650ms | 首屏叙事、一次性揭示 | 上限；再长会被当成加载 |

### 时长与距离的配比

同样 240ms，位移 8px 显得慢、位移 80px 显得快。经验比例：**每 100px 位移配 120ms**，即 24px → 约 30ms 的位移分量 + 基础 210ms ≈ 240ms。位移超过 24px 时按此追加，但总时长不超过 650ms。

### 离场比入场快

离场时长 = 入场 × 0.6（240 → 144，取 120）。理由：读者决定离开时不想等；而入场需要时间被看见。

---

## 3. 编排

### 序列

| 序号 | 元素 | 延迟 | 时长 |
|---|---|---|---|
| 1 | 容器/背景 | 0 | 400ms |
| 2 | 标题 | 60ms | 240ms |
| 3 | 正文 | 120ms | 240ms |
| 4 | CTA | 180ms | 240ms |

总时长 420ms。超过 500ms 的入场，读者会开始滚动，看到的是动画中途。

### 同组错开

60–90ms/个，≤ 4 个（见 30-scroll.md）。

### 编排的反模式

- 每个元素不同曲线：看起来像不同人做的。
- 每个元素不同时长：同上。
- 从 0 透明度起步 + 从 100px 外飞入 + 带 blur：三个变量同时变，读者只能感知「花」。

**正确做法**：整页只用一条曲线（`--ease-out`）、两档时长（120/240）、两档位移（8/16px）。

---

## 4. 只动 transform 与 opacity

### 为什么

浏览器渲染管线：Layout → Paint → Composite。改 `width/height/top/left/margin/padding/border-width` 会触发布局（最贵）；改 `background-color/box-shadow/filter` 会触发重绘；只有 `transform` 与 `opacity` 能只走合成层。

60fps 下每帧预算 16.7ms。一次布局抖动在中等复杂度页面上就要 8–15ms，两个元素同时抖就掉帧。

### 等价替换表

| 想改 | 改成 |
|---|---|
| `width` 展开 | `transform: scaleX()`（配 `transform-origin`） |
| `height` 展开 | `grid-template-rows: 0fr → 1fr`（现代浏览器可动）或 `max-height`（需预估） |
| `top/left` 位移 | `transform: translate()` |
| `margin` 挤压 | `transform: translate()` + 预留空间 |
| `box-shadow` 变深 | 预置两层阴影，切 `opacity` |
| `filter: blur()` 入场 | 单独一层，`opacity` + 固定 blur |

**`box-shadow` 的例外**：值变化会重绘整个阴影区域。要做「浮起」效果，用两个伪元素叠两层阴影，动 `opacity`。

---

## 5. will-change 的生命周期

`will-change: transform` 会提前把元素提升为合成层，代价是显存与层数。

| 规则 | 说明 |
|---|---|
| 只在即将动画时加 | 静态元素加 = 白占显存 |
| 动画结束移除 | 用 `transitionend` 或 `animationend` 移除 |
| 每页 ≤ 8 个 | 超过后合成开销反超收益 |
| 不要给 `:hover` 常态加 | 鼠标扫过一片卡片会同时提升几十层 |

```css
.card:hover { will-change: transform; }   /* 只在 hover 期间 */
```

iOS Safari 上 `will-change` 过多会触发「层爆炸」，表现为页面整体变模糊（层被降采样）。

---

## 6. 性能陷阱清单

| 陷阱 | 症状 | 修法 |
|---|---|---|
| 滚动里读 `offsetTop` | 每帧强制同步布局，滚动卡 | 用 IO 或 `animation-timeline` |
| `backdrop-filter` 大面积 | 滚动掉帧 | 限制在 ≤ 320×320 的小块 |
| 多个 `position: fixed` 元素 | 移动端合成层过多 | 合并为一个容器 |
| `transition: all` | 意外触发昂贵属性 | 显式列出 `transform, opacity` |
| 图片无尺寸 | 布局跳动（CLS） | 写 `aspect-ratio` |
| 字体加载后重排 | 文字闪动 | 系统字体栈，无外部字体 |
| 长列表全量渲染 | 首屏慢 | 内容分页或 `content-visibility: auto` |

### `content-visibility`

长页里给非首屏 section 加 `content-visibility: auto; contain-intrinsic-size: auto 800px;` 可跳过离屏渲染。注意：`contain-intrinsic-size` 要给接近真实的高度，否则滚动条会跳。

---

## 7. 规则

- **规则**：一条曲线、两档时长、两档位移，覆盖整页。
- **规则**：只动 transform / opacity；其余属性先找等价替换。
- **规则**：离场 = 入场 × 0.6。
- **规则**：`will-change` 局部、临时、≤ 8 个。
