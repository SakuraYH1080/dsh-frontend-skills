# 30 · 折射：SVG 位移链、边缘放大、液态形变

## 1. 为什么需要折射

只有 `blur` 的玻璃是"磨砂贴纸"。真实玻璃有**厚度**，厚度在边缘表现为位移与放大。
折射是把"贴纸"变成"材料"的那一步。

## 2. 原理

`feDisplacementMap` 用一张图（in2）的 R/G 通道作为 X/Y 位移量，去搬动另一张图（in）的像素。

```text
位移量 = scale × (channelValue/255 - 0.5)
```

所以：

- `scale` 控制最大位移（px）。
- `in2` 决定"往哪搬"——用噪声 → 不规则；用渐变 → 定向放大。
- 中间平坦处应位移为 0，只有边缘位移 → 这才是"边缘折射"。

## 3. 两种可用配方

### 3.1 边缘折射（推荐，用于组件）

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <filter id="lg-edge" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <!-- 1) 只保留边缘：用 feMorphology 收一圈再做差 -->
    <feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="1" seed="7" result="noise"/>
    <feGaussianBlur in="noise" stdDeviation="2" result="soft"/>
    <feDisplacementMap in="SourceGraphic" in2="soft" scale="9"
                       xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>
```

```css
.lg[data-lg-refract="on"] {
  -webkit-backdrop-filter: url(#lg-edge) blur(24px) saturate(160%);
  backdrop-filter: url(#lg-edge) blur(24px) saturate(160%);
}
```

参数：`baseFrequency` 0.004–0.012，`scale` 3–12。频率越高越碎，越高越像毛玻璃而不是厚玻璃。

### 3.2 边缘放大（便宜，兼容性最好）

不用 SVG，只用两条伪元素做出"边缘被放大"的错觉：

```css
.lg-thick::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1.5px;                        /* 边缘厚度 */
  background: linear-gradient(160deg, rgba(255,255,255,.55), rgba(255,255,255,0) 55%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}
```

这条路在 Safari / Firefox / Chrome 都稳定，代价是没有真实位移。**多数产品用这条就够。**

## 4. 液态形变（只用于瞬时反馈）

玻璃被按下时可以有轻微的"形变"，但只能是：

- `scale(0.995)` + 高光位置上移 1px
- 持续 120ms
- 不改变边界半径的数值（视觉上像挤压，不是橡皮）

**不要**用 `border-radius` 的动画做液态感（会每帧重算圆角与裁剪，非常贵，且在低端设备上撕裂）。

## 5. 性能代价

| 方案 | 相对开销 | 适用 |
| --- | --- | --- |
| 纯 blur | 1× | 所有设备 |
| blur + saturate + brightness | 1.2× | 所有设备 |
| + SVG displacement | 3–6× | 桌面；移动端仅在 `deep` 弹窗上 |
| 圆角动画 / 逐帧改 blur | 8×+ | 不用 |

**硬边界**：`url(#filter)` 走 `backdrop-filter` 在部分移动浏览器上会整块黑屏。必须用 `@supports` 探测并用 `glass.js` 的能力检测兜底：

```css
@supports not (backdrop-filter: url(#x)) {
  .lg[data-lg-refract="on"] { backdrop-filter: blur(var(--lg-blur)) saturate(var(--lg-saturate)); }
}
```

## 6. 常见错误

1. 整块位移（中间也动）→ 果冻。
2. `scale` 给到 30 → 水波纹。
3. 用 `filter:` 而不是 `backdrop-filter:` → 内容也被位移，字变糊。
4. 忘了 `color-interpolation-filters="sRGB"` → 颜色偏移。
5. 滤镜 id 在同一页重复 → 只有第一个生效。
6. 每个组件内联一份 SVG → 几十份滤镜，首屏卡顿。**一份全局，全站引用。**
