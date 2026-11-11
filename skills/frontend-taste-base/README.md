# frontend-taste-base

通用品味基线。补在一切风格化前端 skill 之下的一层判据。

它只回答三个问题：

1. 这一页该分成几节、每节多高。
2. 什么东西可以动、动多少。
3. 这些字读起来像不像模型写的。

材质、配色体系、插画风格、组件库选型都不归它管。

---

## 它和另外七个 skill 的关系

| skill | 管什么 | 与本 skill 的关系 |
| --- | --- | --- |
| frontend-design-direction | 整体范式、信息分工、专项派活 | 在上层：先由它定规则与主导语言 |
| frontend-taste-base | 节的节奏、动效预算、文案腔调 | 骨架层（本 skill） |
| frontend-apple-minimal | 信息三层、字阶、粘性滚动 | 可直接套用，字阶由它给 |
| frontend-industrial-sci-fi | HUD / 切角 / 仪表盘 | 套在骨架之上，不改节高 |
| frontend-liquid-glass | 玻璃材质参数 | 同上，不改节高 |
| frontend-particles | 粒子层 | 同上，且受动效预算约束 |
| frontend-anime-fusion | 角色与界面的空间关系 | 同上 |
| frontend-ecosystem | 多层共存的交接、让位、退出、偏好 | 在下层：多层同时开工时才上场，不改节高 |

规则：风格 skill 可以套在 taste-base 上，不能反过来改节数与节高。让玻璃或粒子去决定页面分几节，等于把骨架交给材质。

---

## 安装

Claude Code 或兼容 ~/.agents 的宿主：

```bash
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-taste-base

# 或从本仓库克隆后手动安装
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git
cp -r dsh-frontend-skills/skills/frontend-taste-base ~/.agents/skills/
```

手工：把整个目录放进宿主的 skills 目录即可。SKILL.md 是唯一入口，其余文件按需读取。

验证安装：

```bash
node _tests/preflight.mjs
```

---

## 怎么用

### 一、从零开始

在写第一行 HTML 之前，读 SKILL.md 的第五节（执行流程），走完前三步：

- 分档（software / gaming / tech / product / service / place）
- 列节清单（每节一句可反驳的主张）
- 配节高（查窗口表，落进非法带就砍或拆）

然后再动手写结构。

### 二、改一个已经失败的页面

先跑检查器，让它告诉你问题在哪一组：

```bash
node assets/taste-check.mjs index.html
```

按输出逐条修。检查器只查能静态查出来的东西（结构、排版数值、动效属性、文案词表），查不出「这一节其实没信息」这种判断。

### 三、只想要那份检查清单

读 SKILL.md 的第六节。四组共 27 条，全是可以打勾的。

---

## 目录

```text
frontend-taste-base/
├── SKILL.md                  入口（模型读这个）
├── README.md                 你正在读（不进模型上下文）
├── VERIFICATION.md           实测记录
├── agents/openai.yaml        Codex 元数据
├── references/
│   ├── 00-constitution.md    为什么是这套规则
│   ├── 10-sections.md        节盒子、窗口表、中文换算
│   ├── 20-motion.md          三层结构、曲线、位移量
│   ├── 30-copy.md            两代 tell、纠偏表
│   ├── 40-type-cn.md         中文行宽、字号、标点
│   └── 50-audit.md           检查器与一票退回
├── assets/
│   ├── tokens.json           唯一数值真源
│   ├── taste-base.css        节盒子 + 动效 token
│   └── taste-check.mjs       静态检查器（零依赖）
├── templates/
│   ├── 01-editorial.html     变体 A：叙事长页
│   └── 02-place.html         变体 B：图册页
└── examples/
    └── README.md             截图放这里
```

---

## 三个断言，先接受再看细节

一、一屏一节，节高只能是 1 或 2。

不是审美偏好，是为了让「滚几下能看完」变成可预测的。用户滚到第三节就知道还有几节，这个预期本身就是体验。

二、每页只有一个 dealt moment。

一页里只有一处允许「动得很明显」。两处以上就是没有重点。滚动除了那一处，什么都不该移动。

三、文案的敌人不是华丽，是均匀。

每段都同样温暖、同样具体、每段都有一句金句收尾 —— 均匀本身就是 tell。修法不是加个性，是按客户选 register。

---

## 版本

1.0.0 · 2026-11

数值真源在 assets/tokens.json。改任何数字先改那里，再改 CSS 与检查器。
