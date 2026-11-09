# 50 · 响应式与可读性

---

## 1. 断点：内容驱动而非设备驱动

### 为什么不用 768 / 1024 / 1440

那是设备清单，不是布局事实。真正的信号是「这一行开始超过 75 字符」「这张图开始小于 320px」「两栏开始挤」。

### 本文档采用的三个断点（附触发事实）

| 断点 | 触发时发生了什么 | 处理 |
|---|---|---|
| 640px | 600px 栏宽 + 左右各 20px 边距 = 640，正文开始被压 | 边距降到 20px，栏宽 `100%` |
| 900px | 5fr/7fr 分栏的文字块 < 420px，lead 开始断句难看 | hero 改为上下堆叠 |
| 1200px | 1120px 容器 + 边距 > 视口，出现横向滚动 | 容器 `min(1120px, 100% - 2×min(6vw,96px))` |

写法上用 `min()`/`clamp()` 优先，media query 只在「行为」真的需要换的时候用（堆叠、隐藏、字号档位切换）。

```css
.container {
  width: min(1120px, 100% - 2 * min(6vw, 96px));
  margin-inline: auto;
}
```

这一行就替代了三个断点的容器规则。

### 断点写在哪

```css
/* 移动优先：默认单列 */
.grid { display: grid; grid-template-columns: 1fr; }

/* 只在需要两栏时加 */
@media (min-width: 900px) {
  .grid { grid-template-columns: 5fr 7fr; }
}
```

**反例**：`max-width` 写法（桌面优先）+ 五六个断点层层覆盖，最终没人知道某个宽度下生效的是哪条。

---

## 2. 流体排版

### 字号

全部用 `clamp()`，见 10-type-grid.md 的插值表。要点：

- min 是「再小就难读」的下限（h1 40px、body 16px）。
- max 是「再大就失衡」的上限（h1 72px）。
- 中间用 vw 线性过渡，不用阶梯跳变。

### 间距

section 间距也要流体：

```css
:root {
  --section-s: clamp(56px, 7vw, 96px);
  --section-m: clamp(72px, 9vw, 128px);
  --section-l: clamp(88px, 11vw, 160px);
}
```

理由：手机上 160px 的空隙等于 1/5 屏，会把内容推得太散；用 vw 让它在窄屏自然收缩到 88px，同时保持阶梯关系（88 < 112 < 136 的比值不变）。

**注意**：clamp 的 min/max 仍要是 8 的倍数（56/72/88 都是），否则会破坏网格。

### 不要用 `font-size: Xvw`

纯 vw 字号在 320px 屏会小到 12px、在 2560px 屏会大到 90px，两头都坏。clamp 就是为这个存在的。

---

## 3. 触控目标

| 元素 | 最小命中区 | 说明 |
|---|---|---|
| 主按钮 | 48×48px（高 48） | 高度按 8 网格取 48 |
| 次级按钮/链接 | 44×44px | WCAG 2.5.5 的 AAA 值，也是 iOS HIG 的默认 |
| 图标按钮 | 44×44px，图标本身 20×20 | 图标小于 20px 会看不清，命中区小于 44 会误触 |
| 行内文字链接 | 不强制 | 但相邻链接间距 ≥ 8px，否则会点错 |

### 实现

```css
.icon-btn {
  display: inline-grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  /* 视觉上可以更小，用负 margin 或 padding 补足命中区 */
}
```

**反例**：`padding: 4px 8px` 的 12px 文字按钮，实际命中区约 30×20px，手机上误触率明显上升。

### 间距

相邻可点元素至少 8px 空隙。低于 8px 时手指的接触面积（约 45×45 的椭圆）会同时压到两个。

---

## 4. prefers-reduced-motion

### 必须做的事

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

为什么用 0.01ms 而不是 `none`：`animation: none` 会让依赖 `animationend` 的脚本永远等不到事件；0.01ms 会正常触发结束事件，且肉眼不可见。

### 但不要把所有动效都砍掉

- 保留：颜色/透明度的即时变化（120ms 以内）、焦点框出现。
- 砍掉：位移、缩放、视差、滚动驱动、自动播放。
- 理由：reduced-motion 的诉求是「不要有前庭刺激」，不是「不要有反馈」。

### 也检查 scroll-driven

```css
@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
  .parallax-layer { animation: none; }
}
```

滚动驱动动画不在 `transition` 覆盖范围内，必须单独写。

---

## 5. 对比度门槛

| 内容 | 门槛 | 说明 |
|---|---|---|
| 正文（< 24px 常规 / < 19px 粗体） | 4.5:1 | WCAG AA |
| 大字（≥ 24px 常规 / ≥ 19px 粗体） | 3:1 | — |
| 图标（承载信息） | 3:1 | 装饰性图标不受限 |
| 边框/分隔线 | 无硬性要求 | 但承载输入框边界时需 3:1 |
| 焦点指示 | 3:1 且面积足够 | 见下 |

### 本文档灰阶的实测值（白底 #FFFFFF）

`#31313A` 12.88 · `#4C4C53` 8.52 · `#73737B` 4.70 · `#9A9AA1` 2.80 · `#C6C6CB` 1.70

所以：正文用 #31313A 或 #4C4C53；次要文字最浅到 #73737B（4.70，刚过线）；#9A9AA1 及更浅只能做分隔线与禁用态。

### 深底（#0A0A0C）

`#FFFFFF` 19.78 · `#C6C6CB` 11.62 · `#9A9AA1` 7.07 · `#73737B` 4.21（**不过 4.5**）· `#5EA8FF` 8.03

所以深色模式正文用 #C6C6CB，次要文字用 #9A9AA1；#73737B 在深底上不够，不要照搬浅色模式的次要灰。

### 焦点可见性

```css
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- 不用 `outline: none`，除非同时给了等效的可见替代。
- `outline-offset: 2px` 让描边不与元素边重合，在深色底与图片上都可见。
- `--accent` #0A6CFF 在白底 4.56:1、深底 4.33:1，都过 3:1 的焦点门槛。

---

## 6. 缩放与重排

| 场景 | 要求 |
|---|---|
| 200% 文字缩放 | 不裁切、不重叠、无横向滚动 |
| 320px 宽（等效 400% 缩放） | 单列，正文 ≥ 16px，无横向滚动 |
| 只看键盘 | 焦点顺序 = 视觉顺序，无焦点陷阱 |
| 系统字体放大 | 用 `rem` 而非 `px` 做正文与间距基准 |

### rem 与 px 的分工

- 字号、正文间距：`rem`（跟随用户设置）。
- 边框、1px 线、图标尺寸：`px`（不应被放大）。

```css
:root { font-size: 100%; }        /* 尊重浏览器设置 */
body { font-size: clamp(1rem, 0.125vw + 0.9625rem, 1.0625rem); }
```

1.0625rem = 17px（在 16px 根字号下）。

---

## 7. 语义与结构

| 项 | 规则 |
|---|---|
| 标题层级 | 每页一个 h1；h2 对应 section；不跳级 |
| 地标 | `header` / `nav` / `main` / `footer` 各一（nav 可多个，需 aria-label） |
| 跳转链接 | 首个可聚焦元素为「跳到正文」 |
| 图片 | 有信息给 `alt`，纯装饰 `alt=""` |
| 装饰元素 | `aria-hidden="true"` |
| 动画内容 | 提供暂停（超过 5 秒的自动播放必须可停） |

---

## 8. 规则

- **规则**：断点由内容挤压触发，数量 ≤ 3。
- **规则**：字号与间距用 clamp，min/max 仍是 8 的倍数。
- **规则**：命中区 ≥ 44×44px，相邻 ≥ 8px。
- **规则**：reduced-motion 分支必须存在，且滚动驱动动画单独处理。
- **规则**：正文对比度 ≥ 4.5:1，深色模式单独取色不取反。
