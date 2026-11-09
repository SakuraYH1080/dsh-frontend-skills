---
name: frontend-particles
description: >-
  粒子层的生成、寿命、运动、交互、渲染路线与性能预算能力包。覆盖发射器模型与初始分布（均匀/高斯/环形/沿路径）、寿命曲线与对象池回收、速度场与力场（重力/风/漩涡/吸引子）、simplex 与 curl 噪声流场、拖尾与密度控制、Canvas 2D / WebGL / 纯 CSS 三条路线的选型判据、指针吸引排斥与空间网格连接线、点击爆发、对比度与遮罩层、60fps 与单帧 6ms 预算、DPR 上限 2、prefers-reduced-motion 静态帧与低端设备降级、移动端触摸与电池策略。用于：从零搭一层粒子背景、给现有页面补粒子层、粒子层掉帧要降级、粒子压住正文要修可读性、要在三条渲染路线里做选择。只决定粒子层，不决定页面布局、玻璃材质与角色立绘。当用户提到「粒子」「粒子背景」「星空背景」「星场」「漂浮粒子」「尘埃/粉尘效果」「数据流背景」「鼠标跟随粒子」「鼠标排斥粒子」「连接线/蛛网效果」「点击爆炸」「canvas 动画很卡」「requestAnimationFrame 掉帧」「粒子太花看不清字」「particles」「particle system」「starfield」「WebGL particles」「canvas particle animation」时加载。
whenToUse: 要给页面加一层粒子背景，或已有粒子层掉帧、压住正文、需要挑渲染路线并给出降级方案时。
metadata:
  domain: frontend-design
  scope: 粒子层的生成、寿命、运动、交互、渲染路线、性能预算与降级
  pairs-with: frontend-liquid-glass, frontend-apple-minimal, frontend-industrial-sci-fi
  version: "1.0.0"
---

# frontend-particles

这个 skill 只做一件事：把一个粒子层从「想让它出现」做到「它在 60fps 下稳定运行、不干扰正文、弱设备上自动退让」。

它不决定页面长什么样。粒子放在哪、和谁叠、什么颜色属于页面，不属于这里。

## 一、什么时候用 / 不用

**用**

- 页面上要叠一层持续运动的粒子：星场、尘埃、数据流、天气四类之一。
- 已有粒子层，出现掉帧、发热、移动端卡顿、标签页切回来一堆粒子堆在左上角。
- 粒子压在正文上导致文字发灰、发花、对比度不足。
- 要在 Canvas 2D / WebGL / 纯 CSS 之间选一条路线，并给出判据而不是偏好。
- 要接鼠标或手指：吸引、排斥、跟随、点击爆发、连接线。
- 要写降级：`prefers-reduced-motion`、DPR 上限、低端设备减半、无 WebGL 回落。

**不用**

| 用户实际要的 | 交给谁 | 为什么不是这里 |
|---|---|---|
| 毛玻璃、背景模糊、半透明分层材质 | `frontend-liquid-glass` | 玻璃的 blur / saturate / 边缘高光是它的事；本 skill 只交付粒子层 |
| 留白节奏、字号阶梯、栅格、滚动叙事 | `frontend-apple-minimal` | 那是版式与信息层级，粒子只能是它的下三层 |
| HUD、切角、编号、信号色、高密度操作台 | `frontend-industrial-sci-fi` | 那是秩序与符号系统，粒子在其中只是台账里的一行 |
| 角色立绘、表情、对话框、二次元构图 | `frontend-anime-fusion` | 角色与 UI 的空间关系归它；粒子最多做角色周围光点，位置由它定 |
| 已经有一层粒子，只想再加一层 | `frontend-particles` 本 skill | 同一视口只挂一个粒子 canvas；叠两层等于双倍成本、两套寿命，先合并 |

组合只能在用户明确要求时发生，且必须指定主导语言：材质归 `frontend-liquid-glass`，运动归本 skill，位置由页面布局决定。

## 二、核心原则与硬边界

### 原则 1：粒子是背景，正文是前景，两者不共享同一个可读性预算

判据是三个数，全部可量：

| 项 | 阈值 | 怎么验 |
|---|---|---|
| 正文区域内粒子峰值不透明度 | ≤ 0.18 | 最亮一帧截图取正文区域像素，与底色比对 |
| 正文与粒子叠合处对比度 | ≥ 4.5:1（大字 ≥ 3:1） | 取最深字色与最亮叠合底色算 WCAG 比值 |
| 粒子层 `pointer-events` | 恒为 `none` | 查 computed style |

**为什么成立**：正文的对比度预算是一次性的，粒子是持续变化的。只要粒子能把某一帧的底色抬亮 20%，就有某一帧读不清——用户不会停在那一帧等你解释。

反例：粒子 alpha 0.5、纯白、直接铺在 16px 正文后面，再补一句「有轻微光晕」。这不是设计，是把可读性交给随机数。

### 原则 2：先冻结一帧，再让它动

写任何 `requestAnimationFrame` 之前，先按最终 count 与分布画一帧并截图。判据：**把动画完全关掉，这一帧仍然成立**——有疏密、有焦点、不空。

**为什么成立**：动画会掩盖密度错误。静态帧空荡时，人会用更高速度、更多粒子去填，结果是又吵又卡。静态帧先过关，动起来只会更好，不会突然变好。

反例：800 粒、均匀分布、关掉动画后是一层灰雾——问题在分布与尺度对比，不在「动得不够」。

### 原则 3：预算是设计参数，写进第一版，不是事后优化

| 指标 | 数值 | 依据 |
|---|---|---|
| 帧预算 | 16.67ms | 1000 / 60 |
| JS 侧上限 | 6ms / 帧 | 留 10.6ms 给样式、合成、其他脚本 |
| DPR 上限 | 2 | 3× 屏的 backing store 面积是 2× 的 2.25 倍，视觉收益 ≤ 0 |
| Canvas2D 粒子上限 | `clamp(floor(W×H/3000), 60, 2000)` | 1920×1080 → 691 |
| WebGL 粒子上限 | `clamp(floor(W×H/220), 500, 20000)` | 1920×1080 → 9425 |
| CSS 粒子上限 | `clamp(floor(W×H/26000), 24, 80)` | 每粒一个合成层 |

**为什么成立**：6ms 不是保守，是必须。粒子层是装饰，装饰没有资格吃掉主线程一半时间；一旦超过，滚动与点击会先于画面出问题。

反例：按 3000 粒写完发现卡，再把 count 改成 300——运动参数是按 3000 调的，缩到 300 后整层变成几颗慢吞吞的亮点，等于重写。

### 原则 4：路线按数量和曲线需求选，不按喜好选

| 路线 | 适用 | 上限 | 什么时候必须换 |
|---|---|---|---|
| 纯 CSS | 装饰性、零 JS、可被 `prefers-reduced-motion` 一键停 | 80 粒 | 需要粒子间交互、连接线、逐帧力场 |
| Canvas 2D | 通用主力，逐帧更新，代码最短 | 2000 粒 | 需要 ≥5000 粒，或每粒独立 shader 曲线 |
| WebGL / WebGL2 | 万级粒子、GPU 端曲线、加法混合 | 20000 粒 | 需要读回像素、需要 DOM 层级交互 |

**为什么成立**：三条路线的成本结构不同。CSS 的成本在合成层数量，Canvas 2D 在 draw call 与像素填充，WebGL 在状态切换与显存带宽。用错结构，优化方向会完全相反。

反例：为了「显得专业」用 WebGL 画 200 个点，多出 shader 编译、上下文丢失恢复、回退分支三份代码，收益为零。

### 原则 5：每条曲线都必须是函数，不能用感觉描述

寿命归一化到 `t ∈ [0,1]`，透明度与尺寸都写成 `alpha = f(t)`、`size = g(t)`：

- 淡入淡出（默认）：`alpha = min(t/0.15, 1) × min((1-t)/0.35, 1)`，前 15% 淡入、后 35% 淡出。
- 二次衰减：`alpha = (1-t)²`，用于火花、爆点。
- 尺寸：`size = size0 × (1 - 0.6t)`（收缩）或 `size0 × (0.4 + 0.6t)`（膨胀，用于烟）。

**为什么成立**：寿命曲线决定「看起来是活的还是死的」。线性 alpha 两端有硬切，人眼会看到粒子「啪」地消失，这是最常见的廉价感来源。

反例：`alpha = 1 - t` 且不做淡入，粒子出生瞬间满亮度，一帧内冒出十几个白点，像坏点。

### 原则 6：默认降级，不是默认满配

| 档 | 条件 | 动作 |
|---|---|---|
| L0 | 桌面 + DPR≤2 + 无 reduced-motion | 满配 |
| L1 | 连续 30 帧 p95 > 20ms | DPR 2→1.5，count ×0.7 |
| L2 | L1 后仍超预算 | count ×0.5，关连接线，关拖尾 |
| L3 | `prefers-reduced-motion: reduce` / 无 WebGL / 省电 | 画一帧静态后停 rAF |

**硬边界**：本 skill 只决定粒子层的生成、运动与性能。页面布局、玻璃材质、角色立绘、品牌语言不在职责内，即使它们能让画面更好看。

### 一票退回

出现任一条，整层退回重做，不做局部修补：

- 粒子层 `pointer-events` 不是 `none`，或盖住了可点击元素。
- 正文区粒子峰值 alpha > 0.18，或叠合对比度 < 4.5:1。
- 主循环里每帧 `new Particle()`、每帧建 `CanvasGradient`、每帧设非空 `ctx.filter`。
- 用 `setInterval` 驱动动画，或 `visibilitychange` 后 rAF 继续跑。
- 连接线用双重循环，n > 300 仍未换空间网格。
- 监听 `mousemove` 直接改样式，没有帧内合并。
- 没有 `prefers-reduced-motion` 分支。
- 粒子承担信息功能（数量表示进度、颜色表示状态）——那是数据可视化，不是粒子层。

## 三、可调参数与设计变体

### 十个旋钮

| 参数 | 单位 | 默认 | 可用范围 | 改它会怎样 |
|---|---|---|---|---|
| `count` | 粒 | 见预设 | 60–2000（2D）/ 500–20000（GL） | 唯一直接影响成本的量 |
| `size` | px | 见预设 | 0.6–4.0 | < 1px 在 DPR 2 下会闪 |
| `lifeMs` | ms | 见预设 | 600–9000 | 越短越像火花，越长越像星尘 |
| `speed` | px/s | 见预设 | 4–260 | 与 `lifeMs` 相乘决定单粒行程 |
| `drag` | 每秒衰减 | 0.12 | 0–0.9 | 控制「有没有空气」 |
| `turbulence` | 0–1 | 0.35 | 0–1 | 噪声权重，> 0.6 会失去方向感 |
| `trail` | 每帧擦除 alpha | 0.18 | 0.05–0.5 | 残影长度 ≈ `1/trail` 帧，0.18 → 5.5 帧 |
| `connectDistance` | px | 120 | 80–200 | > 160 后连线密度失控 |
| `pointerRadius` | px | 140 | 60–260 | 与 `pointerForce` 一起决定手感 |
| `pointerForce` | px/s² | 220 | 0–600 | 正为排斥，负为吸引 |

### 四个预设

| 预设 | count | size | lifeMs | speed | trail | 场 | 一句话判据 |
|---|---|---|---|---|---|---|---|
| 星场 starfield | 220 | 0.8–2.2 | 无寿命 | 6/14/28（三层） | 0 | 无，仅视差漂移 | 落地页首屏，静止时也该好看 |
| 尘埃 dust | 140 | 1.0–2.6 | 9000 | 12 | 0.05 | curl，freq 0.0022，strength 26 | 内容页背景，几乎察觉不到在动 |
| 数据流 dataflow | 260 | 1.2–2.0 | 1400 | 160 | 0.22 | 沿路径 4 条，风 −40 | 科技/监控类，方向必须一致 |
| 天气 weather | 320 | 1.4–3.0 | 4200 | 88 | 0.10 | 重力 380 + 风 ±40（周期 7s） | 氛围页，必须有落点感 |

参数不是越多越好。四个预设之外每加一个旋钮，就要能说出它在什么情况下必须改；说不出来就不加。

## 四、参考资料读取路径

| 你在做什么 | 读这个文件 |
|---|---|
| 判断这层粒子该不该存在、是不是噪音 | `references/00-constitution.md` |
| 写发射器、初始分布、寿命曲线、对象池 | `references/10-lifecycle.md` |
| 调速度、力场、噪声流场、拖尾、大小曲线 | `references/20-motion.md` |
| 在 CSS / Canvas 2D / WebGL 之间选型，要可跑骨架 | `references/30-renderers.md` |
| 算预算、测帧时间、写暂停与四档降级 | `references/40-performance.md` |
| 接鼠标/触摸、连接线网格加速、点击爆发、视差 | `references/50-interaction.md` |
| 选星场/尘埃/数据流/天气之一，写变体卡 | `references/60-variants.md` |
| 要现成数值、CSS 变量、可跑实现 | `assets/tokens.json`、`assets/particles.css`、`assets/particles.js` |

**读取纪律**：不要一次全读。先读 `references/00-constitution.md`（62 行）确认该做，再按上表只读一行。一个页面通常只需要 2 个 reference：一个实现侧（20 / 30 / 40 / 50 之一）+ 一个变体（60）。七个文件全读会带来互相冲突的默认值，因为它们各自服务不同场景。

**运行期契约（`assets/particles.js`）**

| 调用 | 签名 | 说明 |
| --- | --- | --- |
| `ParticleField.create(opts)` | `{ canvas, preset, override } = { … }` → `Field` | 唯一的实例入口。`canvas` 必填，`preset` 取 `starfield / dust / dataflow / weather` 之一，`override` 覆盖单个参数 |
| `field.start()` | `() => this` | `resize() → _seedAll()`，绑 resize / pointermove / pointerdown / visibilitychange；`prefers-reduced-motion` 时只画一帧静态图，不起 rAF |
| `field.stop()` | `() => void` | 停 rAF 并解绑指针与可见性监听（resize 监听保留，需要 `destroy` 语义时自己置 `canvas.width = 0` 触发） |
| `field.resize()` | `() => void` | 读 `getBoundingClientRect()`，`dpr = min(devicePixelRatio, DEGRADE[tier].dpr, 2)`，再 `ctx.setTransform(dpr,0,0,dpr,0,0)` |
| `field.applyTier(tier)` | `(0\|1\|2\|3) => void` | 只升不降：`tier <= this.tier` 且 `tier !== 0` 时直接 return。`DEGRADE[3].static` 为真时画一帧后停表 |
| `ParticleField.countFor(route, w, h)` | `("css"\|"webgl"\|其他, number, number) => number` | `css` 24–80（`area/26000`）、`webgl` 500–20000（`area/220`）、其他 60–2000（`area/3000`） |
| `ParticleField.PRESETS / LIMITS / DEGRADE` | 三个常量对象 | 预设参数、硬上限（`dprCap 2`、`jsPerFrameMs 6`、`maxLinks 1200` 等）、四档降级表 |

字段的 `this.list` 是活粒子数组，`this.tier` 是当前档位，`this.frames` 是累计帧数。**没有 `destroy()`，也没有事件总线** —— 别凭印象调。

## 五、执行流程

1. **过闸**：按第四节第一行读宪法文件，回答「这层粒子在传达什么」。答不出来就停在这里，不要进入第 2 步。
2. **定变体**：在星场/尘埃/数据流/天气里选一个，抄变体卡并写满六个字段。
3. **定路线**：按原则 4 的表选路线；`count` 落在哪一档就选哪一档，不越档。
4. **冻结静态帧**：用最终 `count` 与分布画一帧，关掉动画截图。不成立就调分布与 `size`，不动速度。
5. **接运动**：先只开重力或风一个力，跑通再叠加噪声；更新顺序固定 加速度 → 速度 → 位置。
6. **接交互**：加指针力与视差；连接线必须走空间网格，n > 300 时单独测连线耗时。
7. **量预算**：跑 300 帧取 p95；超 6ms 就降档，不改设计。
8. **写降级**：四个分支全部落地——reduced-motion、无 WebGL、低端设备、标签页隐藏。
9. **验可读性**：取正文区域最亮帧算对比度；不达标先调遮罩，不调粒子颜色。

## 六、交付检查清单

- [ ] 粒子层 `pointer-events: none`，z-index 明确（背景 −1 或独立 stacking context）。
- [ ] 正文区粒子峰值 alpha ≤ 0.18，或存在一层 `rgba(11,14,20,0.55)` 以上的遮罩。
- [ ] 正文与粒子叠合处对比度 ≥ 4.5:1（大字 ≥ 3:1），有实测截图或算值。
- [ ] 主循环无每帧对象分配：粒子来自对象池，池容量 = count × 1.2。
- [ ] `devicePixelRatio` 被 `Math.min(dpr, 2)` 夹住。
- [ ] `visibilitychange` 隐藏时 `cancelAnimationFrame`，恢复时重置 `lastTime`。
- [ ] 300 帧内 JS 侧 p95 ≤ 6ms，并记录测量环境（机型、DPR、窗口尺寸）。
- [ ] `prefers-reduced-motion: reduce` 下只画一帧静态图，rAF 不启动。
- [ ] 连接线走网格分桶，n = 2000 时单帧连线耗时 < 2ms。
- [ ] L1 / L2 / L3 三档降级都有可触发条件，不是注释。
- [ ] `pointer: coarse` 时 count ×0.5，且无 hover 依赖。
- [ ] 关闭动画后静态帧成立，截图保留。

## 七、文件地图

```text
frontend-particles/
├── SKILL.md                        本文件：七节入口，只放判据与路由
├── README.md                       安装、调用、看模板、许可
├── agents/openai.yaml              Agent 市场的四个展示键
├── references/
│   ├── 00-constitution.md          粒子何时是信息、何时是噪音；一票退回
│   ├── 10-lifecycle.md             发射器、四种初始分布、寿命曲线、对象池
│   ├── 20-motion.md                速度场、四类力场、simplex/curl、拖尾、尺寸曲线
│   ├── 30-renderers.md             CSS / Canvas2D / WebGL 三路线与可跑骨架
│   ├── 40-performance.md           预算公式、测量方法、暂停、四档降级
│   ├── 50-interaction.md           指针力、视差、网格加速连接线、点击爆发
│   └── 60-variants.md              星场/尘埃/数据流/天气 + 变体卡格式
├── assets/
│   ├── tokens.json                 全部数值的唯一来源，参数表由此对齐
│   ├── particles.css               层级、遮罩、CSS 路线粒子、reduced-motion
│   └── particles.js                对象池 + 网格连线 + 四档降级的 Canvas2D 实现
├── templates/
│   ├── 01-starfield-canvas2d.html  零依赖星场，含暂停、降档与 p95 读数
│   └── 02-dust-css.html            纯 CSS 尘埃，无 JS 动画
└── examples/.gitkeep               留空，放你自己的落地页截图
```
