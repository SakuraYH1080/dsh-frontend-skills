# 20 · 动效：三层，三条曲线，一个预算

这份文件解决一个问题：**这页该动什么，动多久，动多快。**
它不教你怎么写动画，它教你砍掉不该动的。

---

## 1. 三层结构：每一层回答不同的问题

页面上的动效只允许分三层。每层必须能回答一个具体问题，答不上来就删。

| 层 | 回答的问题 | 出现次数 | 时长 | 触发 |
| --- | --- | --- | --- | --- |
| **入场层** | 「这页值得我看下去吗」 | 每页 1 次，只在 hero | 1.1s（+ 错开） | 页面加载后 |
| **dealt moment** | 「这一节有什么是我没想到的」 | 每页 **恰好 1 次** | 0.4–1.2s，随滚动进度 | 滚动到该节 |
| **hover 层** | 「我碰到东西了吗」 | 不限，但每个元素一致 | 120–240ms | pointer 事件 |

**三层之外的一切动效都是错的。** 具体指：节与节之间的连续视差、循环背景动画、滚动驱动的全局位移、每张卡片各自浮入、按钮呼吸光晕、loading 骨架屏之外的任何"假装在忙"。

### 1.1 为什么入场只做 hero

hero 入场是唯一一次"读者对页面还没有判断"的时刻。这时候动，是在建立第一印象，值得。

第一节之后的每一次入场动画，读者已经知道自己在看什么了，动画只有一个作用：延迟他看到内容。**滚动时读者已经用速度表达了自己的意图**，页面再补一段 0.6s 的淡入，就是在跟读者的速度对抗。

### 1.2 为什么只允许一个 dealt moment

「dealt moment」是这一页里唯一一个"专门为它设计过"的滚动瞬间。它的功能是让读者在滑动的惯性中停一下，记住这个页面。

一页只能有一个，因为**第二个出现时，第一个就不再特殊**。两三个"惊喜"等于没有惊喜，读者会把它归类为"这页动画挺多的"，而不是"这页有个地方很妙"。

taste-skill 的牌库有 18 张 moment，在役 13 张，退役 5 张。退役的原因是它们彼此太像，或者成本太高（要 WebGL、要预渲染视频）。

---

## 2. 三条曲线，全部无过冲

只允许三条 easing。全部用 `cubic-bezier`，不用 `ease` / `ease-in-out`（浏览器默认值太软，看起来像慢动作）。

```css
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);      /* 入场：快速起，长尾停 */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);      /* 大位移、整块进入 */
--ease-in-out-quad: cubic-bezier(0.45, 0, 0.55, 1);   /* 状态切换、颜色、透明度 */
```

### 2.1 为什么禁过冲

`cubic-bezier(0.34, 1.56, 0.64, 1)` 这类带回弹的曲线，在单元素上看着活泼，在一页上就是廉价。

真实原因有三条：

1. 过冲会让元素短暂越过它该在的位置，于是在某些视口尺寸下撞到别的元素或出界，出现一帧的裁切。
2. 文字跟着过冲时，抗锯齿会重新计算，中间几帧字体发虚。
3. 过冲是所有"模板感"页面的共同特征。它是批量生产动画最容易加的调味料，因此成了批量生产的标记。

判据：曲线的两个控制点的 y 值必须都在 [0,1] 区间内。

### 2.2 为什么只动 transform 与 opacity

浏览器对 `transform` 与 `opacity` 可以只走合成线程（compositor），不动布局、不重绘。

动 `width` / `height` / `top` / `left` / `margin` 会触发 layout，动 `background-color` / `box-shadow` / `filter` 会触发 paint。在低端设备上，这两类都会让同屏其它滚动元素掉帧。

允许的例外只有一个：`clip-path` 用于 dealt moment 的揭示，前提是它在**独立的合成层**上（加 `will-change: clip-path` 且元素本身不参与布局）。

---

## 3. 时长阶梯

四档，不多不少：

| 档 | 时长 | 用在哪 |
| --- | --- | --- |
| 微 | 120ms | hover 的颜色、透明度、图标位移 ≤4px |
| 小 | 240ms | 按钮按下、卡片抬起、下拉展开 |
| 中 | 400ms | 面板进出、内容块替换、dealt moment 的短版本 |
| 大 | 650ms | 整屏级转场、hero 内部元素的收尾 |

hero 入场总时长 1.1s，是"大档 + 错开"的组合，不是单元素跑 1.1s。

### 3.1 错开（stagger）的规则

- 元素数 ≤ 3：间隔 120ms
- 元素数 4–6：间隔 90ms
- 元素数 > 6：**不要错开**，改成整块一起入（总时长不动，单元素 650ms）

最后一条反直觉，但它是对的：错开 8 个元素，最后一个要等 8 × 90 = 720ms 才开始，读者早就滚走了。这时候"错开"变成了"延迟"。

### 3.2 总时长上限

从页面可交互到最后一个 hero 元素落位，**不超过 1.6s**。

超过这个数，读者会开始怀疑页面卡了。1.1s 是 taste-skill 的默认值，留 0.5s 给网络与字体加载的抖动。

---

## 4. dealt moment：13 张在役牌

一张 moment 必须满足三条：只发生在自己的节盒子内、可被跳过（跳过滚动时不留残影）、不依赖鼠标。

在役的 13 张，按实现成本排序：

| 牌 | 做法 | 成本 | 适合档 |
| --- | --- | --- | --- |
| sticky-pin | 节内 `position: sticky`，内容在固定位置替换 | 低 | 全部 |
| clip-reveal | `clip-path` 从一条线展开成整块 | 低 | software / tech |
| number-count | 数字从 0 走到目标值，只在进入视口时一次 | 低 | software / service |
| image-swap | 同一位置三张图按滚动进度切换 | 低 | product / place |
| type-mask | 大字被容器遮住，随滚动露出 | 低 | 全部 |
| section-shift | 整块内容在节内水平位移 20–30% | 低 | gaming / tech |
| line-draw | SVG 描边动画，`stroke-dashoffset` | 中 | tech / industrial |
| grid-morph | 卡片从网格排布变成单列 | 中 | software |
| scroll-zoom | 一张图在节内从 1.0 放大到 1.15 | 低 | place / product |
| text-scramble | 短标题字符替换后定格 | 中 | gaming |
| cursor-trail | 指针经过留下短轨迹 | 中 | gaming |
| liquid-hover | WebGL 液体变形 | 高 | 只用于 software 的 hero |
| vhs-glitch | 三帧错位 + 色偏 | 中 | gaming |

**退役的 5 张**（不要用）：closing-lift（结尾整页抬起，看起来像 bug）、headline-arrives（标题逐字飞入，模板感最强）、lines-rise（正文行逐行上浮，8 行要 2s）、window-parallax（浏览器窗口视差，纯装饰）、word-rotate（单词轮播，读者永远只看到一半）。

### 4.1 一张 moment 的自检

做完之后问三个问题：

1. 把滚动条快速拖过这一节，有没有残留的中间态？（有 = 状态没在退出时复位）
2. 在 60Hz 屏上有没有一帧跳？（有 = 动了非合成属性，或用了 `setTimeout` 而非 `requestAnimationFrame`）
3. 关掉动效（`prefers-reduced-motion`）之后，这一节还是完整的吗？（不是 = 内容依赖动效才可见，这是致命错误）

---

## 5. 性能预算

单帧 16.7ms 里，动画能占的**不超过 6ms**。

具体约束：

- 同屏同时运动的元素 ≤ 8 个
- 单个元素上的 `filter` / `backdrop-filter` 面积 ≤ 视口 40%
- 不在 `scroll` 事件里同步读布局（`getBoundingClientRect`），要用 `IntersectionObserver` 或 `ScrollTimeline`
- 大图位移用 `transform: translate3d()`，并给容器 `contain: layout paint`
- 页面总动画元素不超过 20 个（含 hover 层）

### 5.1 三条会翻车的写法

```js
// 错：每帧读布局
window.addEventListener('scroll', () => {
  const r = el.getBoundingClientRect();
  el.style.transform = 'translateY(' + (r.top * 0.1) + 'px)';
});

// 错：用 setTimeout 做逐帧
setTimeout(step, 16);

// 错：给整页加 will-change
document.body { will-change: transform; }
```

第一条会强制同步布局，第二条会抖动且不看刷新率，第三条会让浏览器把整页提升为合成层，显存暴涨。

### 5.2 正确的最小写法

```css
.reveal {
  opacity: 0;
  transform: translate3d(0, 24px, 0);
  transition: opacity 650ms var(--ease-out-quart),
              transform 650ms var(--ease-out-quart);
}
.reveal.is-in {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
```

```js
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }
}, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
```

`unobserve` 那一行是关键：入场只做一次，读者往回滚不该重播。

---

## 6. prefers-reduced-motion：不是关掉，是换成静态帧

`prefers-reduced-motion: reduce` 的用户不是"不要动"，是"不要位移与缩放"。颜色与透明度的小变化是允许的。

```css
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  .moment { /* 直接给终态 */ }
  * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
```

关键要求：**所有 moment 必须有一个静态终态**。如果一张 moment 的终态是"内容还没出现"，那它在降级模式下就是空白 —— 这是设计错误，不是可访问性问题。

### 6.1 移动端的额外降级

- 触摸设备上禁用 `cursor-trail` 与所有依赖 `mousemove` 的 moment
- 电池模式下（`navigator.getBattery()` 可用时）把 hero 入场降到 400ms
- 低端设备判据：`navigator.hardwareConcurrency <= 4` 或 `deviceMemory <= 4` 时，关掉 WebGL moment

---

## 7. 常见"假动效"的识别

下面这些看起来像动效，实际上是在掩盖内容不足。删掉它们，页面会变好。

| 现象 | 真实问题 | 修法 |
| --- | --- | --- |
| 每张卡片各自浮入 | 卡片本身就多余 | 合并成一段文字 |
| 数字滚动但数字不重要 | 缺一个真正的证据 | 换成一句客户原话 |
| 背景一直有粒子/渐变流动 | 这一屏没有焦点 | 删背景，放一张真图 |
| 按钮有光晕呼吸 | 按钮不显眼是因为页面没有层级 | 改字重与留白，不是加动效 |
| hover 抬起 + 阴影 + 边框变色 | 三件事同时在说"可点" | 只留一件事，通常留位移 |
| 页面滚动时元素错位速度不同 | 想显得"有深度" | 删掉，或只留一层 0.15 的视差 |

判据一句话：**如果一个动效删掉之后页面信息量没有变化，它就只是噪音。**

---

## 8. 一票退回清单

- [ ] 出现了第二张 dealt moment
- [ ] 用了带回弹的曲线（控制点 y 超出 [0,1]）
- [ ] 动了 `width` / `height` / `top` / `left` 做位移动画
- [ ] 在 `scroll` 监听里同步读布局
- [ ] 给整页或 body 加了 `will-change`
- [ ] 某个 moment 在 `prefers-reduced-motion` 下变成空白
- [ ] hero 入场总时长超过 1.6s
- [ ] 错开了 6 个以上元素
- [ ] 目录/导航/hover 之外的循环动画
