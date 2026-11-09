# 10 · 生成与生命周期

## 发射器模型

粒子不是「一堆点」，是「一个发射器持续产出、粒子按寿命消亡」。三个必须分开的量：

| 量 | 含义 | 典型值 |
|---|---|---|
| `emitRate` | 每秒出生数 | 20–120 |
| `maxAlive` | 同时存活上限（= 池容量） | count |
| `lifeMs` | 单粒寿命 | 600–9000 |

稳定状态下的活粒数 ≈ `emitRate × lifeMs / 1000`。所以先定 `maxAlive`，反推 `emitRate = maxAlive × 1000 / lifeMs`。

**为什么不能反过来**：先定 emitRate 再调寿命，会得到一个不可控的稳态粒子数，draw call 抖动。

## 四种初始分布

```js
// 1. 均匀：适合星场、通用背景
x = Math.random() * w; y = Math.random() * h;

// 2. 高斯（Box-Muller）：适合尘埃团、焦点周围的光斑
const u = 1 - Math.random(), v = Math.random();
const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
x = cx + g * sigmaX; y = cy + g * sigmaY;

// 3. 环形（角度+半径双抖动）：适合光环、加载态
const a = Math.random() * Math.PI * 2;
const r = radius + (Math.random() - 0.5) * ringThickness;
x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;

// 4. 沿路径：适合数据流、光束
const t = Math.random();
const p = pathAt(t);              // 预采样好的折线或曲线
x = p.x + (Math.random() - 0.5) * spread;
y = p.y + (Math.random() - 0.5) * spread;
```

| 分布 | 视觉特征 | 用在 | 反例 |
|---|---|---|---|
| 均匀 | 平稳、无焦点 | 星场、大面积底噪 | 做「有故事」的背景显得平 |
| 高斯 | 有中心、边缘稀疏 | 尘埃团、人物/卡片周围 | sigma 过小会聚成一坨白斑 |
| 环形 | 明确几何 | 光环、仪表、加载 | 与圆角矩形 UI 同框时显得刻意 |
| 沿路径 | 有方向、可读性强 | 数据流、连接线、路线 | 路径交叉处密度突增，需额外去重 |

高斯分布的 `sigma` 建议取容器短边的 6%–12%。小于 4% 时，1280 宽下 90% 粒子落在 100px 半径内。

## 寿命曲线

归一化 `t = age / lifeMs ∈ [0,1]`。

```js
// 淡入淡出（默认）
alpha = Math.min(t / 0.15, 1) * Math.min((1 - t) / 0.35, 1);
// 二次衰减（火花）
alpha = (1 - t) * (1 - t);
// 闪烁星（无寿命，用相位）
alpha = 0.35 + 0.35 * Math.sin(phase + time * 0.0012);
```

| 曲线 | 前段行为 | 后段行为 | 用在 |
|---|---|---|---|
| 线性 `1-t` | 出生满亮 | 硬切消失 | 不要用：两端都是硬边 |
| 淡入淡出 | 15% 内升到满 | 35% 内降到 0 | 通用默认 |
| 二次衰减 | 满亮 | 快速衰减 | 火花、点击爆发 |
| 正弦闪烁 | 无出生感 | 无死亡感 | 星场（配合极长寿命或无限） |

**为什么淡入必须有**：眼睛对「凭空出现的亮点」敏感度远高于移动。一帧内出生 6 颗满亮度粒子，看起来像坏点。

## 尺寸曲线

```js
size = size0 * (1 - 0.6 * t);        // 收缩：尘埃、雪花
size = size0 * (0.4 + 0.6 * t);      // 膨胀：烟、雾
size = size0 * (1 + 0.15 * Math.sin(t * Math.PI)); // 呼吸：光点
```

尺寸小于 1px 时不要靠抗锯齿，直接改透明度；DPR 2 下 1px 的圆实际是 2×2 设备像素，仍然可见。

## 对象池

**硬要求**：主循环内零分配。粒子数组在初始化时一次建满。

```js
class Pool {
  constructor(max) {
    this.items = new Array(max);
    this.free = new Int32Array(max);
    this.freeCount = 0;
    for (let i = 0; i < max; i++) {
      this.items[i] = { x:0, y:0, vx:0, vy:0, age:0, life:0, size:0, alpha:0, alive:false, seed:0 };
      this.free[i] = max - 1 - i;
      this.freeCount++;
    }
  }
  spawn() {
    if (this.freeCount === 0) return null;      // 满了就丢弃，不要扩容
    const p = this.items[this.free[--this.freeCount]];
    p.alive = true; p.age = 0;
    return p;
  }
  recycle(i) {                                   // 用索引回收，不 splice
    this.items[i].alive = false;
    this.free[this.freeCount++] = i;
  }
}
```

| 做法 | 每帧成本（2000 粒） | 结论 |
|---|---|---|
| `new Particle()` 每帧 | 2000 次分配，GC 每 8–20s 一次停顿 6–14ms | 掉帧 |
| `splice` 删除死亡粒子 | O(n) 搬移，2000 粒时 0.4–1.2ms | 可接受但无必要 |
| 索引 + 交换删除 | O(1) | 用这个 |
| 对象池 + 索引回收 | O(1)，零分配 | 默认 |

## 回收时机

不要每帧遍历后再删。在更新循环里判死，就地回收并把该帧的空位用最后一个活粒填上：

```js
for (let i = 0; i < aliveCount; ) {
  const p = list[i];
  p.age += dt;
  if (p.age >= p.life) { recycle(p); list[i] = list[--aliveCount]; continue; }
  update(p, dt);
  i++;
}
```

**为什么交换删除能用**：粒子之间无顺序依赖。唯一代价是渲染顺序抖动，对 alpha 混合的粒子不可见。

## 常见错误

- 用 `Date.now()` 算 dt：会被系统时间调整打断。用 `performance.now()`，并把 `dt` 夹到 0–50ms，防止标签页切回时瞬移。
- 池容量等于 count 但 emitRate 偏高：稳态活粒超过容量后 `spawn` 恒返回 null，画面变稀。容量取 `count × 1.2`。
- 回收时不重置 `alpha`：下一帧复用的第一帧会带着上一世的透明度。
