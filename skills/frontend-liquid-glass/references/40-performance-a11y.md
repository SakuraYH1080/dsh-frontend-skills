# 40 · 性能、降级与可读性算例

## 1. 性能预算

| 指标 | 目标 | 测量方法 |
| --- | --- | --- |
| 滚动帧率 | ≥ 55fps | Chrome DevTools Performance，录 3s 滚动 |
| 首屏 GPU 纹理 | ≤ 3 层玻璃 | 统计同时可见的 `.lg` 数量 |
| 单帧主线程 | ≤ 8ms | Performance 面板长任务 |
| 移动端内存 | ≤ +40MB | Safari Web Inspector |
| 电池档位 | 低电量模式仍可用 | 手动开启低电量模式 |

## 2. 降级阶梯（四级）

```text
L0 完整        blur + saturate + brightness + SVG 折射 + 噪声
L1 无折射      blur + saturate + brightness + 噪声        （移动端 / 低端）
L2 弱模糊      blur 6px + saturate 110%，去掉噪声         （掉帧触发）
L3 实心        tint α 0.98，无滤镜，保留边框与阴影         （reduced-transparency / 不支持）
```

触发条件：

| 级别 | 触发 |
| --- | --- |
| L1 | `navigator.hardwareConcurrency ≤ 4` 或 `deviceMemory ≤ 2` 或 `saveData` |
| L2 | 300ms 窗口 fps < 45 连续 3 次（见 `assets/glass.js`） |
| L3 | `prefers-reduced-transparency: reduce` 或 `@supports not (backdrop-filter)` |

**降级只降不升**（避免抖动），除非页面重新加载。

## 3. 可读性算例

玻璃的可读性不能靠"看起来还行"。用相对亮度公式算：

```text
sRGB → 线性：c = c/255; c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4
L = 0.2126R + 0.7152G + 0.0722B
对比度 = (L1 + 0.05) / (L2 + 0.05)
```

### 算例 A：浅色玻璃 + 深色文字

- 玻璃合成后的底色（tint 白 α .42 叠在最亮的白色背景上）≈ `#FFFFFF` → L ≈ 1.000
- 文字 `#11141A`：R=17→0.0056, G=20→0.0069, B=26→0.0100 → L ≈ 0.0068
- 对比度 = (1.000+0.05)/(0.0068+0.05) = **18.4 : 1** ✅

### 算例 B：同玻璃叠在最暗背景（#000）上

- 合成底色 ≈ `rgba(255,255,255,.42)` 覆在 #000 → `#6B6B6B` → L ≈ 0.146
- 同一文字 #11141A → L 0.0068
- 对比度 = (0.146+0.05)/(0.0068+0.05) = **3.44 : 1** ❌

**结论**：同一套参数在亮背景合格、在暗背景不合格。所以必须有承载层。
把 `--lg-scrim` 加到 α 0.60（白）后，合成底 ≈ `#B4B4B4` → L ≈ 0.472 → 对比度 **9.2 : 1** ✅

**这就是"承载层先定，玻璃后定"的算术依据。**

### 算例 C：深色玻璃 + 浅色文字

- 深色 tint `#0C1017` α .55 覆在 `#F0F0F0` 背景 → 约 `#7A7E85` → L ≈ 0.203
- 文字 `#F2F4F8` → L ≈ 0.902
- 对比度 = (0.902+0.05)/(0.203+0.05) = **3.76 : 1** ❌
- 把 α 提到 0.78 → 合成 ≈ `#3C4046` → L ≈ 0.050 → 对比度 **9.5 : 1** ✅

## 4. 浏览器差异

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| Safari 需要前缀 | `-webkit-backdrop-filter` | 两个都写 |
| Safari 中 `overflow: hidden` 的祖先会裁剪模糊 | 已知行为 | 把玻璃提到不会被裁剪的层 |
| Firefox 旧版不支持 | 支持到 103+ | `@supports` 回退 |
| Chrome 合成层过多 | 每个 `.lg` 一个层 | 限制同时可见层数 |
| 某些安卓 WebView 黑块 | `url(#filter)` + backdrop 组合 | 不启用折射 |
| iOS 滚动时闪烁 | 动态改 blur | 只改 tint α |

## 5. 检测脚本

`assets/glass.js` 提供：

- `supportsBackdrop()` — 能力探测
- `init({ refract, guard })` — 注入滤镜 + 启动帧率守卫
- 事件 `lg:degraded` — 降级时广播，便于上报
- 类 `.lg-lite` — 由守卫添加，CSS 里对应 L2

## 6. 打印与导出

- `@media print` 里玻璃一律变白底 + 1px 细边 + 无阴影。
- 导出 PNG 时如果走 `html2canvas`，`backdrop-filter` **不会**被渲染 → 必须临时打 `.lg-export` 类切到实心底色，否则导出的图是空白。
