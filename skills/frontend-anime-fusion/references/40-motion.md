# 40 · 动效：合成层上的呼吸

## 1. 只允许动 transform 与 opacity

角色是页面上最大的位图（常见 1200×1800 或更大）。任何触发 layout / paint 的动画，每帧都要重算这一整块。

| 属性 | 是否允许 | 原因 |
| --- | --- | --- |
| transform（translate / scale / rotate） | 允许 | 合成器处理，不重绘 |
| opacity | 允许 | 同上 |
| clip-path 的静态值 | 允许 | B 模型切片靠它，但**不参与动画** |
| filter（drop-shadow / blur） | 静态允许，动画禁止 | 每帧重建阴影，1080p 下约 8–14ms |
| mask-position / mask-image 动画 | 禁止 | 触发整层重绘 |
| width / height / top / left | 禁止 | 逐帧 layout |
| backdrop-filter 动画 | 禁止 | 越界到 liquid-glass，且极贵 |

**判据**：`grep -E "transition|animation" *.css` 的结果里，出现的属性名只能是 transform 或 opacity。

## 2. 入场编排：角色先，面板后

| 元素 | 延迟 | 时长 | 缓动 | 位移 |
| --- | --- | --- | --- | --- |
| 背景环境 | 0ms | 480ms | cubic-bezier(.22,.61,.36,1) | 无（只淡入） |
| 角色 | 0ms | 620ms | cubic-bezier(.22,.61,.36,1) | translateY(18px) → 0 |
| 面板 | 140ms | 460ms | cubic-bezier(.22,.61,.36,1) | translateY(24px) → 0 |
| 前景氛围 | 320ms | 700ms | linear | 只淡入 0 → 目标不透明度 |

**为什么错开 120–200ms**：小于 120ms 人眼判定为「同时出现」，错开白做；大于 200ms 面板出现时角色已经静止，观众已经完成对主角色的注意分配，面板变成「迟到的补充」，反而显得卡。140–160ms 是最稳的区间。

**为什么角色在前**：观众先建立「这里有个人」的空间认知，再接受「面板插进来」。反过来先出面板，角色就变成「填充背景的图」。

```css
@keyframes af-rise { from { opacity: 0; transform: translateY(var(--af-enter-shift, 18px)); } to { opacity: 1; transform: none; } }
.af-char  { animation: af-rise 620ms cubic-bezier(.22,.61,.36,1) both; }
.af-panel { animation: af-rise 460ms cubic-bezier(.22,.61,.36,1) 140ms both;
            --af-enter-shift: 24px; }
@media (prefers-reduced-motion: reduce) {
  .af-char, .af-panel { animation: none; }
}
```

`prefers-reduced-motion` 时必须整体关掉入场，而不是「缩短到 100ms」——后者对前庭敏感人群仍是运动。

## 3. 呼吸位移：±2px / 4s

呼吸的作用是让静帧不像截图。幅度超过 3px 从「呼吸」变成「漂浮」；周期短于 3s 变成「心跳」，长于 6s 察觉不到。

```css
@keyframes af-breath { 0%, 100% { transform: translateY(calc(var(--af-breath-amp) * -1)); }
                       50%      { transform: translateY(var(--af-breath-amp)); } }
.af-char__img { animation: af-breath var(--af-breath-dur, 4s) ease-in-out infinite; }
```

**代价**：常驻动画让合成层永不释放，笔记本续航下降约 3–6%，页面在低端机上掉 1–2 帧。因此：

- 呼吸只给角色，不叠加给面板或背景（三处同时呼吸 = 整页在晃）。
- 视口不可见时暂停：`IntersectionObserver` 命中率 < 0.1 时移除动画类。
- `prefers-reduced-motion` 下彻底停用。

**只动 img 不动容器**：动容器会让内部的边缘光、mask 一起位移，看起来像整块贴纸在飘。

## 4. 视差：角色位移必须小于背景

| 层 | 位移系数 | 说明 |
| --- | --- | --- |
| 背景环境 | 1.0 | 基准：页面滚动 1px，背景视觉位移 1px |
| 角色（A 模型） | 0.45（0.35–0.55） | 慢于背景 → 角色读作「比背景更远」，站在空间里 |
| 角色（B 模型） | 0.85（0.75–0.90） | 前片比后片多 0.15，形成「角色探出屏幕」的额外一层 |
| 角色（C 模型） | 0 | 在文档流里，不参与视差，随内容滚动 |
| 面板 | 0 | 操作层，动起来点不中 |
| 前景氛围 | 1.6 | 快于背景，形成第三层纵深 |

**为什么角色必须慢于背景（位移 < 1.0）**：系数小于 1 意味着滚动时角色「落在页面后面」，这正是空间深度的读法——越远的东西相对视点移动越慢。系数大于 1 会让角色贴死在屏幕上滑过背景，读作「一张贴在玻璃上的贴纸」，也就是本 skill 要消灭的那种观感。前景取 1.6 是因为它离眼睛最近，本来就该最快。

**判据**：`--af-parallax` 恒 < 1.0；只有 L3 前景允许 > 1.0。把系数和 z 序对齐检查一遍：z=0 的背景 1.0，z=10 的角色 0.45–0.85，z=30 的前景 1.6。

**B 模型的两片**：后片用 `--af-parallax`，前片用 `--af-parallax + 0.15`，差值固定。差值小于 0.1 看不出层次，大于 0.2 会让手和身体在滚动中「滑开」，比脱开更糟。

```js
// 单次 rAF 更新，读写分离避免 layout thrashing
let y = 0, ticking = false;
function onScroll() { y = window.scrollY; if (!ticking) { ticking = true; requestAnimationFrame(apply); } }
function apply() { char.style.transform = "translate3d(0," + (y * 0.45).toFixed(2) + "px,0)"; ticking = false; }
```

**代价**：滚动监听 + 每帧写 transform，在中端机上约 0.4ms/帧。若同时有 3 个视差层，控制在一个 rAF 里统一写。

## 5. hover 视线跟随

两种实现，代价差一个数量级：

| 方案 | 做法 | 代价 | 适用 |
| --- | --- | --- | --- |
| 伪 3D 视差 | 整张立绘 `translate` 反向 ≤ 6px + `rotate` ≤ 1.2deg | 低（纯 transform） | 默认方案 |
| 眼球层分离 | 眼睛单独一张 PNG，按指针位置切 `object-position` | 中（多一次绘制，且需素材支持） | 角色有独立眼图层时 |
| 真实骨骼 / WebGL | 顶点变形 | 高（> 40KB JS + 显存） | 不做 |

伪 3D 的数值边界：位移不超过角色宽度的 1.2%（1200px 宽 → 14px），旋转不超过 1.2deg。超过就变成「角色在晃」，不再是「看着你」。

```css
.af-char__img { transition: transform 320ms cubic-bezier(.22,.61,.36,1); will-change: transform; }
```

**必须在指针离开时回正**，且回正时长比进入短 80ms（进入 320ms，回正 240ms）——回正慢会让人觉得角色「舍不得」。

## 6. 点击切换表情

```js
const EXPR = ["neutral", "smile", "surprise"];   // 表情数量上限 3
```

| 项 | 数值 | 原因 |
| --- | --- | --- |
| 表情数量 | 2–3 | 超过 3 个需要 UI 提示，破坏「角色自己反应」的错觉 |
| 切换过渡 | 180ms 交叉淡入 | 短于 120ms 像闪烁，长于 260ms 像加载 |
| 预热 | 首次交互前 `new Image()` 预载全部表情 | 否则第一次点击有 200–600ms 空白 |
| 触发区域 | 角色头部矩形（禁区） | 点身体会与面板点击冲突 |

**代价**：每个表情是一张全尺寸图。3 张 1200×1800 PNG 约 1.2–3.5MB（视压缩），首屏不应加载第二、三张，改为 `requestIdleCallback` 预热。

**判据**：切换时角色不发生位移或缩放，只换图。任何「弹一下」的反馈都说明混进了 transform 动画。

## 7. 动效预算总表

| 项 | 上限 | 检测方法 |
| --- | --- | --- |
| 常驻动画数量 | 1（只有呼吸） | 数 `animation` 声明 |
| 单帧脚本耗时 | 2ms | Performance 面板 |
| 滚动掉帧 | 0 帧 > 16.7ms（中端机） | 录制 3 秒滚动 |
| 动画属性种类 | 2（transform / opacity） | grep |
| 首屏动效总时长 | ≤ 1.1s | 最后一段动画结束时间 |

## 8. 反例

- 入场用 `@keyframes` 同时改 `opacity` 和 `filter: blur(20px) → 0`：模糊动画在 1080p 下掉到 22fps。
- 呼吸加在 `.af-char` 容器上，同时容器有 `mask-image`：mask 跟着位移，边缘闪烁。
- 视差用 `top: scrollY * 0.5 + "px"`：每帧 layout，滚动卡顿。
- hover 位移 30px：角色像被鼠标拖着走。
- 点击切换表情用 `display: none / block`：没有过渡，硬切，像 GIF 卡帧。
- 三张表情图全在首屏 `<img>`：首屏多下载 2MB，LCP 恶化 800ms。
