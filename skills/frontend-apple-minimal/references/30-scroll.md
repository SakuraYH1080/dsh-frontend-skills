# 30 · Sticky 与滚动驱动叙事

---

## 1. position: sticky 的四个边界条件

sticky 不是「滚动到某处就固定」，它是一个双向约束。四条任意一条不满足，它就不生效（且**不会报错**，只会静默退化）。

| 条件 | 规则 | 失效症状 |
|---|---|---|
| ① 有滚动容器 | `overflow` 为 `visible` 的最近祖先链上不能出现 `hidden/auto/scroll` | 完全不粘，像普通元素 |
| ② 有高度可置换 | 父容器高度必须 > 元素高度 | 粘一下就跟着父容器一起滚走 |
| ③ 有阈值 | 必须写 `top/bottom` 之一（`left/right` 仅横向滚动有效） | 不生效 |
| ④ 有高度约束 | 元素本身不能被 `height: 100%` 撑满父容器 | 没有可滑动的余量 |

### 最小可用组合

```css
.sticky-head {
  position: sticky;
  top: 0;
  z-index: 10;
  /* 父级不能有 overflow: hidden */
}
.sticky-track {           /* 提供高度置换 */
  min-height: 200vh;
}
```

### 为什么常常要在父级加 `overflow: clip` 而不是 `hidden`

`overflow: hidden` 会创建新的滚动上下文，直接杀死内部 sticky；`overflow: clip` 不创建滚动上下文（只是裁剪），sticky 仍生效。这是最常见的「sticky 突然失效」原因。

**反例**：`body { overflow-x: hidden; }` —— 为了消除横向滚动条加的一行，会让全站 sticky 失效。改用 `overflow-x: clip`。

### 粘性区的高度预算

| 用途 | 高度 | 理由 |
|---|---|---|
| 顶栏 | 56–64px | 超过 72px 会吃掉手机 1/4 视口 |
| 侧栏目录 | `calc(100vh - 96px)` | 底部留 32px 防裁切 |
| 图文对照（左图右文） | 图 `100vh` 粘住，文字滚动 | 文字长度需 ≥ 1.6 屏，否则「粘」没有意义 |

---

## 2. 滚动驱动动画

### 两种时间轴

| 写法 | 含义 | 典型用途 |
|---|---|---|
| `animation-timeline: view()` | 元素进入/离开视口时推进 | 入场、淡入、放大 |
| `animation-timeline: scroll()` | 容器滚动进度时推进 | 进度条、背景位移 |

### view() 的区间控制

```css
@keyframes rise {
  from { opacity: 0.001; transform: translateY(24px); }
  to   { opacity: 1;     transform: translateY(0); }
}
.reveal {
  animation: rise linear both;
  animation-timeline: view();
  animation-range: entry 20% cover 45%;
}
```

- `entry 20%`：元素顶边进入视口 20% 时开始
- `cover 45%`：元素被视口覆盖 45% 时结束
- 区间跨度建议 ≥ 25% 视口高度，短于 20% 会「闪一下就好」，读者以为卡顿。

**为什么用 `cover` 不用 `exit`**：`exit` 是元素开始离开视口之后，那时读者已经在看下一屏，动画白做。

### scroll() 的进度条

```css
@keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.progress {
  transform-origin: 0 50%;
  animation: grow linear;
  animation-timeline: scroll(root block);
}
```

`scroll(root block)` 取整个文档的纵向滚动；要取某个容器用 `scroll(nearest block)`，但该容器必须有 `overflow-y: auto`。

### 能力检测

```css
@supports (animation-timeline: view()) {
  .reveal { animation: rise linear both; animation-timeline: view(); }
}
```

不支持时元素保持**最终态**（不要保持初始态，否则内容永远不可见）。所以默认样式必须是「已显示」，动画只负责「从未显示到已显示」的过渡。

**这是最容易出事故的一条**：默认写 `opacity: 0` + 靠 JS 加类显示，JS 一挂全站空白。

---

## 3. IntersectionObserver 兜底

### 为什么还要它

`animation-timeline` 在 Safari 26 之前只有部分支持，且无法在 iframe 内可靠工作。生产环境仍需 IO 版本。

### 最小实现（见 assets/scroll-narrative.js）

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.dataset.inview = "1";
      io.unobserve(e.target);      // 一次性，避免回滚重复触发
    }
  }
}, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
```

参数理由：

| 参数 | 值 | 理由 |
|---|---|---|
| `threshold` | 0.15 | 元素露出 15% 即算「看到」，低于 0.1 会在边缘抖动 |
| `rootMargin` 底 | −12% | 让触发提前到「快进入」而非「刚进入」，避免用户看到未动画状态 |
| `unobserve` | 触发后 | 回滚再滚下去不该重播，重播是最廉价的「AI 感」 |

### 与 CSS 的分工

- CSS 负责**跟随滚动位置**的连续量（进度条、视差、粘性）。
- JS 负责**离散阈值**的触发（进入/离开、编号切换）。
- 两者不要做同一件事，会产生互相覆盖的抖动。

---

## 4. 视差

### 速度比

| 速度比 | 效果 | 适用 |
|---|---|---|
| 0.15 | 几乎静止，只有极轻微深度 | 文字旁的背景色块 |
| 0.25 | 可感知的层次 | 默认值 |
| 0.4 | 明显分层 | 全幅图 + 前景文字 |
| > 0.5 | 眩晕 | 不用 |

速度比定义：背景位移 = 滚动距离 × 速度比，方向与滚动相反。

### 实现（CSS，无 JS）

```css
@keyframes drift { from { transform: translateY(-6%); } to { transform: translateY(6%); } }
.parallax-layer {
  animation: drift linear both;
  animation-timeline: view();
  animation-range: cover;
}
```

12% 的总位移对应约 0.24 的速度比（`cover` 区间约等于 1 个视口 + 元素高度）。

### 视差的三条禁忌

1. **不要给文字做视差**：文字的位移会被读成「页面在抖」，且破坏行基线的稳定感。
2. **不要让两层速度比相同**：等于没有层次，只是整体平移。
3. **不要用 `background-attachment: fixed` 做视差**：移动端 iOS 会直接忽略，且触发全页重绘（性能最差的一种视差）。

---

## 5. 滚动叙事的编排

### 三段式

| 阶段 | 滚动位置 | 画面 |
|---|---|---|
| 建立 | 0–1 屏 | hero 完整，无动画 |
| 推进 | 1–4 屏 | 每个 section 进入时 240ms 淡入上移 16px |
| 收束 | 末尾 0.8 屏 | CTA 段无动画（静止=终点信号） |

### 错开（stagger）

同一组内的元素依次延迟 60–90ms。低于 60ms 看起来像同时出现；高于 120ms 最后一个元素出现时读者已经移开视线。

```css
.card:nth-child(1) { transition-delay: 0ms; }
.card:nth-child(2) { transition-delay: 70ms; }
.card:nth-child(3) { transition-delay: 140ms; }
```

组内元素 ≤ 4 个。第 5 个开始总延迟超过 350ms，组已经不是「一组」。

### 滚动锁定区（scroll-hijack）

**不要做。** 把滚轮事件吃掉、强制走固定步数的「钉住」效果，在触控板与移动端体验极差，且会破坏锚点跳转与浏览器前进后退。

需要类似效果时用 `position: sticky` + 长轨道（section 高度 200–300vh，内部 sticky 的图随滚动切换），滚轮仍归浏览器所有。

---

## 6. 规则

- **规则**：sticky 前先查四条边界条件，尤其祖先链上的 `overflow`。
- **规则**：滚动驱动的默认态必须是「已显示」，动画只做过渡。
- **规则**：视差比 0.15–0.4，只给背景层，不给文字。
- **规则**：错开 60–90ms，组内 ≤ 4 个，触发一次性。
