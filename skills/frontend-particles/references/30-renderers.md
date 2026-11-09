# 30 · 三条渲染路线

## 选型表（先看这个）

| 判据 | 纯 CSS | Canvas 2D | WebGL / WebGL2 |
|---|---|---|---|
| 粒子上限 | 80 | 2000 | 20000 |
| 需要 JS | 否 | 是 | 是 |
| 逐帧力场 | 否（只有关键帧动画） | 是 | 是 |
| 粒子间交互（连线） | 否 | 是（需网格） | 是（需 GPGPU 或 CPU 上传） |
| 每粒独立 shader 曲线 | 否 | 否（CPU 算） | 是 |
| 代码量（最小可用） | 40 行 CSS | 120 行 JS | 300 行 JS + GLSL |
| 首帧成本 | 0（合成层） | 建 canvas + 首帧 1–3ms | shader 编译 20–80ms |
| 内存 | 每粒子 1 个合成层 | 1 个 backing store | 1 个 FBO + 顶点缓冲 |
| 降级难度 | 极低 | 低 | 中（上下文丢失） |

**决策顺序**：先问「能不能不做交互」→ 能且 ≤80 粒 → CSS；不能 → 再问「有没有 ≥5000 粒或 shader 曲线」→ 没有 → Canvas 2D；有 → WebGL。

**为什么这个顺序成立**：每一档的代码量差 2.5–3 倍，而降级的复杂度差得更多。能用 CSS 解决的场景（装饰性星点、加载光环）用 Canvas 是在给自己造维护负担。

## 路线一：纯 CSS

```css
.p-field {
  position: fixed; inset: 0;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}
.p-dot {
  position: absolute;
  width: var(--s, 2px); height: var(--s, 2px);
  border-radius: 50%;
  background: #cfe3ff;
  opacity: 0;
  animation: drift var(--d, 14s) linear var(--delay, 0s) infinite;
  will-change: transform, opacity;
}
@keyframes drift {
  0%   { transform: translate3d(0, 0, 0); opacity: 0; }
  12%  { opacity: var(--a, .5); }
  85%  { opacity: var(--a, .5); }
  100% { transform: translate3d(var(--dx, 40px), -120px, 0); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .p-dot { animation: none; opacity: var(--a, .5); }
}
```

生成 60 个点用一次循环即可。每粒要有 `--s / --d / --dx / --delay / --a` 五个不同的值，否则会看出「同步脉冲」。

| 项 | 建议 | 原因 |
|---|---|---|
| 粒子数 | 40–80 | 超过 80 个合成层开始抢占 raster 时间 |
| `animation-duration` | 10–24s | 短于 10s 看出循环 |
| 每粒 `--delay` | 负数随机 | 用 `-` 让动画一开始就在中段，避免首屏齐发 |
| `will-change` | 只加在 `.p-dot` | 加在容器上会整层上合成 |
| `transform` | 只用 `translate3d` | 走合成线程，不触发 layout |

**反例**：把 `left/top` 做动画。每帧重排整层，60 个点能把主线程吃满。

## 路线二：Canvas 2D（主力）

```js
const cv = document.querySelector('canvas.p-canvas');
const ctx = cv.getContext('2d', { alpha: true, desynchronized: true });
let dpr = 1, w = 0, h = 0;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = cv.clientWidth; h = cv.clientHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now;
  ctx.fillStyle = 'rgba(11,14,20,0.18)';   // trail
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) draw(list[i]);
  raf = requestAnimationFrame(frame);
}
```

| 优化 | 效果（2000 粒，2K 屏） | 说明 |
|---|---|---|
| 每粒 `beginPath/arc/fill` | 8–14ms | 不可用 |
| 按颜色分组批量 `arc` | 4–6ms | 可用 |
| 改用 `fillRect` 画 1–2px 方块 | 1.8–2.6ms | 小粒子肉眼无法区分 |
| 预渲染 3 档 sprite 再 `drawImage` | 2.2–3.4ms | 需要柔和光点时用 |
| 加 `desynchronized: true` | 降 1–3ms 延迟 | 只对不用读像素的场景 |

**为什么 `fillRect` 能替代圆形**：2px 以下圆与方块的像素差异小于抗锯齿带来的模糊差异。这是最常见的「白拿 3 倍性能」的地方。

## 路线三：WebGL

最小结构：一个 `gl.POINTS` 绘制 + 顶点属性 `a_seed`，位置与透明度在 vertex shader 里由 `u_time` 算出。

```glsl
// vertex
attribute vec2 a_base;    // 初始位置 [0,1]
attribute vec2 a_vel;     // 速度
attribute float a_seed;   // 每粒随机种子
uniform float u_time;
uniform vec2 u_res;
void main() {
  vec2 p = a_base + a_vel * u_time;
  p = fract(p);                       // 环绕
  float ph = fract(a_seed + u_time * 0.18);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = mix(1.0, 3.0, fract(a_seed * 7.13)) * u_dpr;
}
```

| 要点 | 数值 | 原因 |
|---|---|---|
| 顶点数据上传 | 一次，之后不再 | 每帧 upload 会吃掉全部收益 |
| `gl_PointSize` | × dpr | 否则 2× 屏上粒子只有 1 个设备像素 |
| 混合 | `gl.blendFunc(SRC_ALPHA, ONE)` | 加法混合才有发光叠加感 |
| 深度测试 | 关闭 | 2D 粒子无需 z |
| `preserveDrawingBuffer` | false | true 会强制每帧拷贝，掉 30–50% |
| 上下文丢失 | 监听 `webglcontextlost` 并 `preventDefault()` | 移动端切后台必丢 |

**为什么 WebGL 在 < 5000 粒时反而慢**：首帧 shader 编译 20–80ms，加上上下文创建与首帧上传，小规模下总成本超过 Canvas 2D 的逐帧优势。判据是「稳态帧时间」而非直觉。

## 无 WebGL 回落

```js
function pick() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (gl && count >= 5000) return 'webgl';
  return 'canvas2d';
}
```

回落必须共享同一份参数（`assets/tokens.json`），否则视觉会「换了一个东西」。

## 常见错误

- CSS 路线里用 `filter: blur()` 做柔光：每个粒子一次高斯，80 个即 8–20ms。
- Canvas 路线每帧 `ctx.createRadialGradient`：每秒新建 3600 个渐变对象，GC 崩溃。渐变必须在初始化时建好并缓存。
- WebGL 路线在 `resize` 里重建 program：泄漏 GPU 资源，三次 resize 后上下文丢失。
