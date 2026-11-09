# 40 · 性能预算、测量与降级

## 预算表（写死，不谈判）

| 指标 | 上限 | 为什么是这个数 |
|---|---|---|
| 帧时间 | 16.67ms（60fps） | 显示器刷新率，低于此即掉帧 |
| JS 侧单帧 | 6ms | 留 10.6ms 给样式/合成/其他脚本 |
| 首帧到首粒可见 | ≤ 120ms | 超过后用户已认为「这页没有背景」 |
| 内存增量 | ≤ 24MB | 2000 粒 × 24B + 1 个 2× 屏 backing store |
| 长任务 | 无 > 50ms 的帧 | 50ms 是「明显卡顿」的门槛 |
| GPU 时间（可测时） | ≤ 4ms | 与合成器共享，超出会拖累滚动 |

**为什么 JS 侧要卡 6ms 而不是 16ms**：`requestAnimationFrame` 的回调只占帧预算的一部分。滚动、输入、样式重算都在同一帧里排队。占满 16ms 的粒子层，等于让页面在滚动时每次都要等它。

## 粒子数上限公式

```text
Canvas2D:  n = clamp(floor(W × H / 3000), 60, 2000)
WebGL:     n = clamp(floor(W × H / 220), 500, 20000)
CSS:       n = clamp(floor(W × H / 26000), 24, 80)
```

| 视口 | Canvas2D | WebGL | CSS |
|---|---|---|---|
| 1920×1080 | 691 | 9425 | 80 |
| 1440×900 | 432 | 5890 | 49 |
| 390×844（手机） | 109 | 1496 | 24 |

**为什么按面积而不是按宽**：粒子铺满整屏，成本与像素面积近似正比。按宽算会在竖屏手机上给出 3 倍于实际的配额。

**为什么 CSS 的系数是 26000**：每个粒子是一个独立合成层，成本来自层数而不是像素。80 层是 Safari 与 Chrome 共同的性能拐点。

## 测量方法（必须能复现）

```js
const samples = [];
let last = performance.now();
function loop(now) {
  const dt = now - last;
  last = now;
  if (running) samples.push(dt);
  raf = requestAnimationFrame(loop);
}
// 300 帧后
samples.sort((a, b) => a - b);
const p50 = samples[Math.floor(samples.length * 0.5)];
const p95 = samples[Math.floor(samples.length * 0.95)];
console.log({ p50: p50.toFixed(2), p95: p95.toFixed(2), max: samples.at(-1).toFixed(2) });
```

| 指标 | 为什么看它 | 阈值 |
|---|---|---|
| p50 | 常态帧时间 | ≤ 16.7ms |
| **p95** | 卡顿感知 | ≤ 20ms |
| max | 单次长任务 | ≤ 50ms |
| 掉帧率 | `frames > 20ms` 的占比 | ≤ 2% |

**为什么用 p95 而不是平均**：平均会被大量好帧稀释。人眼对「偶尔一次 40ms」的感知远强于「每帧 17ms」。

测 JS 侧净耗时用 `performance.now()` 夹住更新 + 绘制：

```js
const t0 = performance.now();
update(dt); draw();
jsMs = performance.now() - t0;   // 这是预算表里那个 6ms
```

注意：Canvas2D 的 `fillRect` 是异步提交，`jsMs` 只反映 CPU 侧。GPU 侧要看 DevTools Performance 面板的 Raster 与 Composite 轨。

## DPR 处理

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = Math.round(cssW * dpr);
canvas.height = Math.round(cssH * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

| DPR | backing store（1440×900 CSS） | 相对像素 |
|---|---|---|
| 1 | 1.30M | 1.00× |
| 2 | 5.18M | 4.00× |
| 3 | 11.66M | 9.00× |

**为什么夹到 2**：3× 屏上 2px 粒子已占 6 个设备像素，肉眼与 2× 屏的差异小于 1 个灰阶；但填充成本是 2.25 倍。这个上限是纯收益。

**必须监听 DPR 变化**：拖到外接屏时 `devicePixelRatio` 会变，不重建 backing store 会导致粒子模糊或错位。

## 暂停与恢复

```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(raf); raf = 0;
  } else if (!raf && running) {
    last = performance.now();          // 关键：重置时间基准
    raf = requestAnimationFrame(loop);
  }
});
```

**为什么必须重置 last**：不用的话，切回来第一帧的 dt 是「后台停留的秒数」，粒子瞬移出屏或被夹到 0.05s 后仍出现位置跳变。

同样必须处理的：`IntersectionObserver` 判断粒子 canvas 是否在视口内，不在就不跑。长页面上这一条能省 100% 的无关开销。

## 四档降级

| 档 | 触发条件 | 动作 | 视觉后果 |
|---|---|---|---|
| L0 | 默认 | 满配 | — |
| L1 | 连续 30 帧 p95 > 20ms | DPR 2→1.5，n ×0.7，trail 0.18→0.25 | 略微变锐、变稀 |
| L2 | L1 后 30 帧仍 > 20ms | n ×0.5，关连接线，关拖尾（改 clearRect） | 明显变稀，无残影 |
| L3 | reduced-motion / 无 WebGL 且 n 超限 / 省电 | 画一帧静态图，停 rAF | 变成一张静态粒子图 |

降级检测必须降频：每 30 帧算一次，不要在每帧里排序。

```js
if (frameCount % 30 === 0) {
  const p95 = percentile(samples, 0.95);
  if (p95 > 20 && tier < 3) applyTier(++tier);
  samples.length = 0;
}
```

**为什么允许单向降级、不允许自动升档**：升档会在边界反复抖动（降→升→降），用户看到的是周期性卡顿。要升档必须显式重置。

## 低端设备识别

没有可靠的单一信号，用三条并集：

```js
const lowEnd =
  (navigator.hardwareConcurrency || 4) <= 4 ||
  (navigator.deviceMemory || 8) <= 4 ||
  (window.matchMedia('(pointer: coarse)').matches && innerWidth < 500);
```

命中则直接从 L1 起，粒子数 ×0.5。

**为什么不用 UA 判断**：UA 无法区分同型号的高低配，且会被冻结。这三个 API 至少反映真实能力。

## 省电与后台

```js
if (navigator.getBattery) {
  navigator.getBattery().then(b => {
    if (b.level < 0.2 && !b.charging) applyTier(3);
  });
}
```

不支持时退回「页面隐藏即停」，这一条覆盖 100% 场景。

## 常见错误

- 用 `setInterval(loop, 16)`：与刷新率不同步，必然抖动。只用 rAF。
- 在 rAF 里读 `getBoundingClientRect`：强制同步布局，单次 2–8ms。位置在 resize 时缓存。
- 每帧 `ctx.save() / restore()`：2000 粒 = 4000 次状态栈操作，约 0.8ms。用 `globalAlpha` 直接改再复位。
- 用 `filter: blur()` 或 `box-shadow` 做粒子发光：每次绘制触发离屏 blur，成本与半径平方相关。
