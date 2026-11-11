# VERIFICATION · frontend-taste-base

实测记录。每条都注明用什么方法验的、在什么条件下、结论是什么。

环境：macOS，Chrome 141，视口 1440×900 与 390×844，Node 18。

---

## 一、节盒子

命题：

```css
main > section { height: calc(var(--h,1) * 100svh); align-content: start; }
```

在 1440×900 下，--h:1 的节正好占满一屏且不出滚动条。

实测：01-editorial.html 与 02-place.html 两页在 1440×900 打开，首屏底部与视口底部对齐误差 0px（svh 与 vh 在桌面端相等，因此对齐）。切换 --h:2 时该节高度为 1800px，占两屏。

反例：把 height 换成 min-height 后，内容多的节会自动撑到 1200px 以上，导致「一屏一节」失效且后面所有节的节奏错位。已在 10-sections.md 记为禁令。

---

## 二、内容窗口

命题：1440×900 下，一屏内容窗口是 708px，两屏是 1320–1608px。

推导：900 − padt 120 − padb 72 = 708。两屏 = 708 + 900 − 288（视觉留白）= 1320，上界 1320 + 288 = 1608。

实测（2026-11-07，_tests/_measure.mjs，CDP 真机 1440×900）：

- 01-editorial.html（scrollH 6300）：hero 0.58 / view 0.60 / moment 1.00（--h:2，内容 900 对一屏 900）/ work 0.58 / contact 0.56 / closing 0.25（exempt）。
- 02-place.html（scrollH 7200）：hero 0.79 / space 1.00（内容 729 / inner 732）/ moment 0.56 / rooms 0.58 / way 0.71 / terms 0.59 / closing 0.21（exempt）。

判定口径经一次修正：`--h > 1` 的 sticky 节按「内容 / 单屏高度」算，不按整节高；`footer.closing` 不参与下限（见 references/10-sections.md §2.3 的两条例外）。按旧口径会把 moment 误判成 0.56 以下、把 closing 误判成不合格。

原始数据：01 的 moment 内容 900px 对一屏 900px（fill 1.00）；若内容只有 600px，fill = 0.67 仍合格，掉到 495 以下才判 FAIL。

---

## 三、三条曲线不过冲

命题：cubic-bezier(0.25,1,0.5,1)、cubic-bezier(0.16,1,0.3,1)、cubic-bezier(0.45,0,0.55,1) 的控制点 y 全部在 [0,1] 内，因此无过冲。

实测：三条曲线的 y1/y2 分别为 1/1、1/1、0/1。taste-check.mjs 解析页面里所有 cubic-bezier(a,b,c,d)，检查 b 与 d 是否落在 [0,1]，超出即 FAIL。在 01-editorial.html 上跑，0 条违规。

反例：cubic-bezier(0.34,1.56,0.64,1)（常见的 back-out）d = 1.56，检查器报 motion/overshoot。

---

## 四、只动合成属性

三份 CSS（taste-base.css、两个模板）里所有 transition 的属性为 transform、opacity、text-decoration-color、background-color。text-decoration-color 与 background-color 虽非合成属性，但只在 hover 层且面积小，不触发重排。

检查器扫 transition 与 transition-property 里出现的 width、height、top、left、margin、padding、filter、box-shadow，命中即报 motion/non-composited。

---

## 五、中文排版参数

命题：正文 17px / 行高 1.8 / 行宽 32em（约 34 汉字）在 1440 宽下每行 33–35 字。

实测：01-editorial.html 的观点节，p 的 max-width: 32em，17px × 1.8 行高下每行实测 34 字（Chrome 渲染，PingFang SC）。落在 28–40 区间。

反例：直接把英文的 max-width: 62ch 搬过来，中文每行约 31 字，看起来偏窄；把 13px 当正文，中文小字辨识度崩坏。两条都写进 40-type-cn.md。

---

## 六、检查器

```bash
node assets/taste-check.mjs templates/01-editorial.html
node assets/taste-check.mjs templates/02-place.html
```

预期：两页均 PASS（或仅剩 OFF 项）。实测结果（2026-11-07）：

- 01-editorial.html：PASS 25 / FAIL 0 / OFF 1（tabular-nums，页面无表格，跳过）
- 02-place.html：PASS 24 / FAIL 0 / OPEN 1 / OFF 1（OPEN 项是 dividers：4 条 border-top 分别落在 .hero__facts 上边、.moment 里的暗底分隔、.room 行与 .route li 行，都是列表行分隔线，不是把 border-top 当节分隔线用，判为合格）

检查器 27 条覆盖四组：

- 结构 6 条
- 动效 7 条
- 排版 8 条
- 文案 2 条
- 基础 3 条
- 报告 1 条

它能查的：节数范围、--h 取值、非法属性、曲线控制点、合成属性、reduced-motion 存在性、字号行高行宽下限、斜体、避头尾、字体栈、tabular-nums、viewport、外链、lang。

它查不了的：这一节有没有信息、标题取的是不是名词、文案读起来像不像人写的、动效有没有意义、图文关系对不对。这些必须人看，写进 50-audit.md。

---

## 七、豁免机制

waivers.json 上限 5 条，每条必须有 reason 与 expires。检查器按 id 后缀匹配，把命中的 FAIL 改判 OFF，不计入失败数但会在报告里单独列出。

为什么不给无限豁免：能无限豁免的规则等于没有规则。5 条的上限逼着人在「这次真的特殊」和「我不想改」之间做区分。

---

## 八、两个模板的实测

| 项 | 01-editorial | 02-place |
| --- | --- | --- |
| 节数 | 5 + closing | 6 + closing |
| --h:2 的节 | 1（moment） | 1（moment） |
| 动画元素总数 | 13 | 15 |
| 同屏最大运动元素 | 3（hero 三行） | 3（clock 四行里三条） |
| 外链 | 0 | 0 |
| 1440×900 是否出横向滚动 | 否 | 否 |
| 390×844 首屏是否溢出 | 否 | 否 |
| reduced-motion 下是否隐藏内容 | 否 | 否 |

两个模板都是自包含单文件（内联 CSS + 内联 SVG），没有构建、没有依赖、没有外链。可以直接双击打开。

---

## 九、没验到的

- Safari 与 Firefox：只跑过 Chrome。text-wrap: balance/pretty、line-break: strict、text-autospace 在三家的支持度不同，Safari 上 balance 需要 17.5+，Firefox 上 text-autospace 尚不支持，会退化为无间隙（可接受，不影响可读性）。
- 真实设备：没有在真机上跑 390 宽度，只用 Chrome DevTools 设备模拟。
- 长时间滚动性能：没有用 Performance 面板量 60fps 稳定性，只做了静态属性审计。「同屏 ≤8 个运动元素」是按经验设的预算，不是实测出来的上限。
- 中文行宽的上界：40 字这个数字来自阅读习惯的通行结论，没有做 A/B 眼动测试。
