# 60 · 变体：四个预设 + 变体卡三行

## 1. 为什么要预设，而不是"一个主题走天下"

同一套语言在四种真实场景里，**最优解不同**：

| 场景 | 主要矛盾 | 该动哪个参数 |
| --- | --- | --- |
| 标准控制台 | 密度 vs 可扫 | 行高、切角、模块数 |
| 冷藏 / 洁净库（冷白） | 强光下对比不足 | 反相、线色、强调色降饱和 |
| 现场巡检（手持 / 平板） | 触控目标 & 反光 | 行高、字号、切角（更小） |
| 夜间值守 | 眩光 & 疲劳 | 底更暗、亮度上限、动效再短 |

预设改的是**这四组默认值**，不是换皮肤。任何预设下，第 2 节的那些"不变项"都不动。

## 2. 不变项（四个预设完全一致）

这些一旦按预设变化，就不再是同一套系统：

- 只有五档字号：40 / 20 / 13 / 11 / 10
- 只有一条线宽：1px
- `border-radius: 0`，切角只切右上 + 左下
- 强调色只填不描边，只表示"当前位置 / 可点击"
- 状态色只有三态、只升不降、必须显式 ACK
- 无 box-shadow、无 linear-gradient
- 动效四档 0 / 90 / 140 / 220ms，主曲线 `cubic-bezier(0.2,0,0,1)`

## 3. 四个预设的参数表

| 参数 | standard | cold-store | site | night-shift |
| --- | --- | --- | --- | --- |
| 页面底 | `#0A0C0E` | `#F2F4F3` | `#0A0C0E` | `#07090A` |
| 面板底 | `#111417` | `#E3E7E5` | `#111417` | `#0A0C0E` |
| 主文字 | `#F2F4F3` | `#0A0C0E` | `#F2F4F3` | `#E3E7E5` |
| 主线 | `#66737B` | `#717C83` | `#66737B` | `#66737B` |
| 次要文字 | `#828E96` | `#56626A` | `#828E96` | `#828E96` |
| 强调色 | `#C8F04B` | `#5A6D1E` | `#C8F04B` | `#A6C43E` |
| 强调 hover | `#BCE146` | `#4C5D19` | `#BCE146` | `#98B536` |
| 强调上的字 | `#0A0C0E` | `#F2F4F3` | `#0A0C0E` | `#0A0C0E` |
| 行高 | 32px | 36px | 40px | 32px |
| 切角 card | 8px | 8px | 4px | 8px |
| 内边距 | 16px | 20px | 16px | 16px |
| 模块/屏 | 12 | 10 | 6 | 8 |
| 主读数字号 | 20px | 20px | 40px | 20px |
| 动效 geom | 140ms | 160ms | 140ms | 90ms |
| 整片压暗 | 不用 | 不用 | 不用 | 不用（原理见下） |

四组数值各自的自洽理由：

- **cold-store 强调色压到 `#5A6D1E`**：浅底 `#F2F4F3` 上 `#C8F04B` 的对比只有 1.19:1，
  填充后连边框都看不见。`#5A6D1E` 对 `#F2F4F3` 是 5.22:1、对面板 `#E3E7E5` 是 4.62:1，够格做填充。
  代价是它压暗后黑字只剩 3.40:1，所以强调上的字必须换成 `#F2F4F3`（5.22:1）—— 这就是 `onSignal` 要分预设的原因。
- **hover 三档各给显式值**（`#BCE146` / `#4C5D19` / `#98B536`）：相对亮度分别为 0.650 / 0.094 / 0.400，
  对应常态的 0.751 / 0.132 / 0.479 下降 13% / 29% / 17%，肉眼可辨但仍是同一色相，不构成第二个强调色。
  hover 态上的字分别验过：13.06 / 6.58 / 8.55，全部 ≥4.5。不用 `filter` 压暗 —— 理由见下条 night-shift 段。
- **site 行高 40**：戴手套触控时，最小可靠点击目标 40px（Apple HIG 44 / Material 48 的工业折中，
  因为工业平板常戴薄手套，44 会浪费竖向空间）。
- **site 切角 4**：小屏上 8px 切角占掉了 6% 的短边，显得缺角；4px 有方向感但不抢面积。
- **night-shift geom 90**：夜间瞳孔放大，140ms 的位移会留下更明显的余像；90ms 减少余像堆积。
  底色压到 `#07090A`（与 ink-950 一致）、动效 90ms、interrupt 常亮不闪 —— 三件事合起来抑制眩光。
  **不用 `filter: brightness(0.9)` 压整片**：滤镜作用在渲染后的像素上，
  把 `#66737B` 主线在 raised `#111417` 上从 3.32:1 压到 2.92:1，所有对比度计算随之下失效；
  而它想解决的眩光，本来靠更深的底色就能解决。不可计算的样式规则等于没有规则。

## 4. 变体卡三行（每个预设的"身份证"）

任何交付都要在 README 或页面注释里写这三行，固定格式：

```text
preset: cold-store
density: 36px row / 10 modules per screen / padding 20px
dominant: research  (cut 8 / track 0.14em / timestamp absolute)
```

- `preset` 只能是四个值之一。
- `density` 必须给出三个可数数字 —— "较紧凑"这种描述无法被验证。
- `dominant` 只能是 `industry` / `research`，并括号给出三个派生值。

为什么强制写：预设一旦混用（比如 site 的行高 + cold-store 的反相），
默认值之间会互相矛盾（40px 行 + 浅底 + 12 模块 = 一屏放不下）。
三行卡强制作者说清"我选了哪一组"，而不是"我随手取了自己喜欢的几个值"。

**反面案例**：页面同时用了冷白底（cold-store）、40px 行高（site）、12 个模块（standard）。
浅底 + 12 模块 + 大行高 → 需要 1600px 竖向空间，于是作者开始全局缩字号，
五档字号被压成四档 —— 系统崩了。

## 5. standard（默认）

```text
preset: standard
density: 32px row / 12 modules per screen / padding 16px
dominant: industry  (cut 8 / track 0.14em / timestamp relative)
```

适合：桌面端设备管理、产线监控、调度台。
一屏 12 模块是上限，实际常用 8–10。

## 6. cold-store（反相）

```text
preset: cold-store
density: 36px row / 10 modules per screen / padding 20px
dominant: research  (cut 8 / track 0.14em / timestamp absolute)
```

适合：洁净室、冷藏库、白墙实验室、需要打印的场景（浅底打印更省墨且不糊）。

反相时**必须逐个检查的三处**：

1. 状态色：`#E8A33D` 在 `#F2F4F3` 上对比 1.95:1，**不够**；`nominal #8B979F` 也只有 2.55:1。
   浅底版压到 `nominal #6E7A82`（3.99:1，图形只需 3:1）/ `caution #8F5A10`（5.23:1）/ `interrupt #B22E26`（5.74:1）。
   状态色是语义通道，浅底改值不算换系统 —— 三个色相角度保持不变，换的只是明度。
2. 线色：`line-weak #262C31` 在浅底不可见，换 `#CBD2CF`。
3. 强调填充上的文字：`#5A6D1E` 底上用 `#F2F4F3`（5.22:1），不要用 `#0A0C0E`（3.40:1）。
   所以 `onSignal` 必须写进预设，不能在 CSS 里硬编码一个色。

## 7. site（现场）

```text
preset: site
density: 40px row / 6 modules per screen / padding 16px
dominant: industry  (cut 4 / track 0.14em / timestamp relative)
```

适合：平板巡检、手持终端、强反光的车间。

三条额外约束：

- 点击目标 ≥ 40×40px（含 padding），相邻目标间距 ≥ 8px。
- 字号不低于 13px（户外强光下 11px 的标签会消失）。
- 一屏 ≤ 6 模块：现场是"边走边看"，不是"坐着对比"。

## 8. night-shift（夜值）

```text
preset: night-shift
density: 32px row / 8 modules per screen / padding 16px
dominant: research  (cut 8 / track 0.14em / timestamp absolute)
```

适合：夜间值守、暗室、长时间单人监控。

三条额外约束：

- 底色 `#07090A`，主文字不用纯白 `#F2F4F3` → `#E3E7E5`（降低 6% 亮度，减少眩光）。
- 强调色降饱和 `#A6C43E`：夜间高饱和黄绿会产生光晕（halation），黄绿尤甚。
- INTERRUPT 的 1Hz 呼吸改为**常亮**：夜间闪烁的光源影响暗适应，
  操作员抬头看别处时需要重新适应 2–4 分钟。中断信息由 4px 红条 + 文字承担。

## 9. 预设切换的实现

```css
:root[data-isx-preset="standard"]   { --isx-row: 32px; --isx-cut: 8px;  --isx-pad: 16px; --isx-dur: 140ms; }
:root[data-isx-preset="cold-store"] { --isx-page: #F2F4F3; --isx-panel: #E3E7E5;
                                      --isx-text: #0A0C0E; --isx-line: #CBD2CF;
                                      --isx-row: 36px; --isx-cut: 8px; --isx-pad: 20px; --isx-dur: 160ms; }
:root[data-isx-preset="site"]       { --isx-row: 40px; --isx-cut: 4px;  --isx-pad: 16px; --isx-dur: 140ms; }
:root[data-isx-preset="night-shift"]{ --isx-page: #07090A; --isx-text: #E3E7E5;
                                      --isx-row: 32px; --isx-cut: 8px;  --isx-pad: 16px; --isx-dur: 90ms; }
```

一条纪律：**预设只改 `:root` 上的变量，不改组件**。
组件里出现 `[data-isx-preset="site"] .isx-row { ... }` 就是一次未来的不一致 ——
新增第五个预设时，你需要在 N 个组件里各补一条规则。
