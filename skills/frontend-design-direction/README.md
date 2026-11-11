# frontend-design-direction

给一个新站、整页或整站改版定前端设计方向。它是"整体范式"层的技能：决定用户先看到什么、哪些对象值得比较、同一状态怎样跨页表达、哪一处细节值得意外。

## 什么时候用它

- 从零定一个站/一组页面的设计方向；
- 整站看着像模板，要去 AI 味、要形成可辨认的个性；
- 一次改版涉及排版 + 材质 + 角色 + 动效，需要分工与裁决；
- 要判断某个问题该由整体技能处理，还是直接交给专项。

不用于：只改一处材质、只调字阶、只换文案语气、只加一层粒子。那些直接进对应专项。

## 怎么用

1. 读 `SKILL.md`，走七步：任务句 → 内容盘点 → 标题/列表/详情分工 → 主导语言 → 识别细节 → 专项台账 → 同一任务验收。
2. 需要细则时按需打开 `references/`：

| 文件 | 解决什么 |
| --- | --- |
| `00-constitution.md` | 三个决策范围、四条不变量、反模式、术语 |
| `10-task-and-content.md` | 任务句、四层内容、折叠态字段算法、三种分工 |
| `20-visual-language.md` | 语言来源、5–7 条规则、token 三层、识别细节、跨页延续 |
| `30-routing-and-ownership.md` | 整体 vs 专项、七个专项的边界、交接合同、职责矩阵、冲突裁决 |
| `40-acceptance.md` | 同一任务四步、六组检查、对比度阈值、环境矩阵、证据分级 |
| `50-case-needlemarks.md` | 《针迹》完整案例：两条馆藏、两版骨架、字段与对比度 |
| `60-brief-template.md` | 九项简报模板与最小五行版 |

3. 产出一份简报（用 60 号模板），再开工。
4. 涉及玻璃或半透明表面时，用 `node scripts/contrast.mjs <tint> <alpha> <bg> <text>` 算合成底色与对比度；不带参数会打出亮底/暗底的对照表。

## 安装

```bash
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-design-direction

# 或从本仓库克隆后手动安装
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git
mkdir -p ~/.agents/skills
cp -R dsh-frontend-skills/skills/frontend-design-direction ~/.agents/skills/
```

DSH 从 `~/.agents/skills/<name>/SKILL.md` 读取，frontmatter 需要 `name` 与 `description`，name 必须匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`。

## 维护

- 只改 `SKILL.md` 的流程部分，不改专项的边界；专项能力变化时同步 `30-routing-and-ownership.md` 与职责矩阵。
- 案例只加"能改变做法"的事实；同类案例超过三个时合并，保留差异最大的两个。
- 每次改动在 `VERIFICATION.md` 记一条：改了什么、为什么、验过什么、还没验什么。当前记录含安装与调用结果、三场景路由演练、待复验清单。

## 与其他技能的关系

本项目不复制专项的参数，只决定"谁定稿、范围到哪、冲突怎么裁"。排版、材质、角色、动效的具体做法仍在各自专项里，一处决定只有一处定稿。
