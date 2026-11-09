# 50 · 交互：指针、视差、连接线、点击

## 指针输入统一

鼠标与触摸走同一条路径，只认 `pointermove`：

```js
const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
let pending = null;

addEventListener('pointermove', e => { pending = { x: e.clientX, y: e.clientY }; }, { passive: true });
addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });

// 帧内合并：一帧最多消费一次
function consumePointer(dt) {
  if (!pending) { pointer.vx *= 0.86; pointer.vy *= 0.86; return; }
  const { x, y } = pending; pending = null;
  pointer.vx = (x - pointer.x) / Math.max(dt, 0.001);
  pointer.vy = (y - pointer.y) / Math.max(dt, 0.001);
  pointer.x = x; pointer.y = y; pointer.active = true;
}
```

**为什么必须帧内合并**：`pointermove` 在 120Hz 触控板上每秒 120 次，直接改样式会触发 120 次样式重算。合并到 rAF 后是 60 次，且拿到的是「本帧净位移」，速度更准。

反例：在 `pointermove` 里遍历全部粒子。2000 粒 × 120 次/秒 = 24 万次计算/秒，主线程直接满。

## 三种力

| 力 | 公式 | 手感 | 参数 |
|---|---|---|---|
| 排斥 | `a += dir * k / (d + 40)` | 粒子被推开，光标处留空 | k = 220，R = 140 |
| 吸引 | `a -= dir * k / (d + 40)` | 粒子聚向光标 | k = 120，R = 200 |
| 跟随 | `v += (target - p) * 0.08` | 粒子朝光标漂移，无加速度感 | 系数 0.03–0.12 |

```js
const dx = p.x - pointer.x, dy = p.y - pointer.y;
const d2 = dx * dx + dy * dy;
const R = 140;
if (d2 < R * R) {
  const d = Math.sqrt(d2) + 40;
  const f = 220 / d * dt;
  p.vx += (dx / d) * f;
  p.vy += (dy / d) * f;
}
```

**为什么用 `d2 < R*R` 而不是 `Math.hypot`**：开方只在半径内才需要。全屏 2000 粒时，这一条省掉 2000 次开方，约 0.1ms。

## 指针速度映射

速度要映射成「拖拽感」，不能直接当力：

```js
const speed = Math.min(Math.hypot(pointer.vx, pointer.vy), 3000);
const boost = 1 + Math.min(speed / 1200, 1.5);   // 1.0 – 2.5
p.vx += (dx / d) * f * boost;
```

| 指针速度 | boost | 效果 |
|---|---|---|
| 0–200 px/s | 1.0 | 静止时只有基础力 |
| 800 | 1.67 | 明显推开 |
| >1200 | 2.5（封顶） | 快速划过留出通道 |

**为什么封顶**：不快于 2.5 倍时，快速划过的效果与慢速几乎相同，用户会失去「我的手在拨开它们」的因果感；过快则一划就清空，画面留白过久。

## 点击爆发

```js
addEventListener('pointerdown', e => burst(e.clientX, e.clientY, 18), { passive: true });

function burst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const p = pool.spawn(); if (!p) return;
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
    const s = 140 + Math.random() * 180;
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
    p.life = 600 + Math.random() * 300;
    p.size = 1.4 + Math.random() * 1.6;
    p.drag = 2.4;          // 高阻尼：向外扩散后停住
  }
}
```

| 参数 | 值 | 原因 |
|---|---|---|
| 数量 | 16–24 | 少于 12 看不出爆发，多于是喷泉 |
| 角度 | 均匀 + 0.4rad 抖动 | 完全均匀像机械 |
| 初速 | 140–320 px/s | 与 life 0.6–0.9s 配合，行程 100–250px |
| 阻尼 | 2.0–3.0 | 必须远高于环境粒子，否则扩散成雾 |
| 频率 | 每 200ms 最多 2 次 | 连点不叠加 |

**为什么必须设节流**：连点 10 次 = 200 颗额外粒子，池会被瞬时占满，背景层粒子因 `spawn` 返回 null 而变稀——用户以为「炸没了」。

## 视差分层

把粒子按深度分 2–3 层，不同层对指针的响应系数不同：

| 层 | 深度 | 位移系数 | 尺寸 | 透明度 |
|---|---|---|---|---|
| 远 | 0.35 | 4–8px | 0.8–1.4 | 0.25–0.4 |
| 中 | 0.65 | 10–18px | 1.2–2.0 | 0.45–0.65 |
| 近 | 1.00 | 22–38px | 1.8–3.0 | 0.65–0.85 |

```js
const px = (pointer.x - cx) * 0.02 * layer.depth;
const py = (pointer.y - cy) * 0.02 * layer.depth;
ctx.setTransform(dpr, 0, 0, dpr, px, py);
```

**为什么系数这么小**：全屏位移超过 40px 时，用户会认为背景在「跟着我跑」，而不是「我在移动」。视差是暗示，不是位移。

## 连接线（必须网格加速）

朴素双重循环：n=2000 → 200 万次距离判断 → 12–30ms，直接超预算。

```js
const CELL = 120;   // = connectDistance
function grid(points) {
  const map = new Map();
  for (const p of points) {
    const k = (Math.floor(p.x / CELL) << 16) ^ Math.floor(p.y / CELL);
    let arr = map.get(k); if (!arr) map.set(k, arr = []);
    arr.push(p);
  }
  return map;
}
function links(points, maxD) {
  const map = grid(points), out = [];
  const maxD2 = maxD * maxD;
  for (const p of points) {
    const gx = Math.floor(p.x / CELL), gy = Math.floor(p.y / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const arr = map.get(((gx + ox) << 16) ^ (gy + oy)); if (!arr) continue;
      for (const q of arr) {
        if (q.id <= p.id) continue;                 // 每对只算一次
        const dx = q.x - p.x, dy = q.y - p.y;
        if (dx * dx + dy * dy < maxD2) out.push([p, q]);
      }
    }
  }
  return out;
}
```

| n | 朴素 O(n²) | 网格（9 邻域） | 加速比 |
|---|---|---|---|
| 300 | 0.9ms | 0.15ms | 6× |
| 800 | 6.4ms | 0.42ms | 15× |
| 2000 | 40ms | 1.1ms | 36× |

**为什么是 9 邻域**：`CELL >= maxD` 时，任一配对的两点最多相隔一个格子，检查 3×3 必然覆盖。若 `CELL < maxD` 则需要更多邻域，得不偿失。

连线透明度按距离线性衰减，上限 0.16：

```js
const a = (1 - Math.sqrt(d2) / maxD) * 0.16;
```

上限 0.16 的理由：连线是辅助结构，不能与粒子同亮度，否则整层变成一张灰网。另加 `maxLinks = 1200` 硬上限，超出即截断。

## 触摸

| 差异 | 处理 |
|---|---|
| 没有 hover | 排斥力只在 `pointerdown` 后生效，或完全关掉 |
| 手指遮挡 | 指针位置整体上移 40px，避免粒子被手挡住 |
| 多点触控 | 只取第一个 pointer，其余忽略 |
| 滚动冲突 | `touchmove` 只用 `passive: true`，绝不 `preventDefault` |

```css
@media (pointer: coarse) {
  .p-field { opacity: .8; }
}
```

触摸设备上粒子数 ×0.5，连接线默认关闭（手指路径短，连线几乎看不见，却要付全部成本）。

## 常见错误

- 用 `mousemove` 且没加 passive：滚动时每个事件都要等主线程确认，滚动变涩。
- 指针位置存 `clientX` 但 canvas 有 `transform: scale()`：坐标错位。用 `getBoundingClientRect` 换算一次并缓存。
- 排斥力没有半径判断：全屏 2000 粒每帧都算，白付 3ms。
- 连接线不限制总条数：密集区一次生成 4 万条，draw call 爆炸。
