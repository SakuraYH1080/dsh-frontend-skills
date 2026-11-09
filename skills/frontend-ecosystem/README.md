# frontend-ecosystem

一个只做「多层协作」的 Agent Skill：当一个产品里同时有动态场景、玻璃表面、角色和个性化设置时，它决定谁负责什么、谁在什么时候让位、增强层怎么退出、偏好怎么被验证。

它不教你怎么做玻璃、怎么画立绘、怎么调粒子——那些交给专项技能。它管的是它们凑在一起之后必然出现的那批问题：换壁纸时闪黑、玻璃压住正文、吉祥物挡住内容、拖动时右栏反复闪烁、预设导入后外观没变、关掉效果以后任务做不下去。

## 安装

标准 Agent Skills 包（根目录 `SKILL.md`），不绑定某一家 agent。

```sh
# 通用 skills CLI
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-ecosystem

# 或从本仓库克隆
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git
cp -R dsh-frontend-skills/skills/frontend-ecosystem ~/.agents/skills/frontend-ecosystem

# 手动：放进任一被扫描的根目录
cp -R frontend-ecosystem ~/.agents/skills/frontend-ecosystem
# 或项目级
cp -R frontend-ecosystem <项目>/.agents/skills/frontend-ecosystem
```

DSH 的扫描根（rank 由小到大）：`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`<dshHome>/skills`、`<agentsHome>/skills`。目录 bundle 必须是 `<name>/SKILL.md`，只扫直接子项。

## 用

- 直接说：「这个阅读工作台要有动态壁纸、玻璃面板和一个吉祥物」「换壁纸的时候会闪一下黑」「玻璃一开正文就看不清了」「吉祥物挡住了正文」「主题预设导入以后没生效」。
- 或点名：`使用 frontend-ecosystem`。

它会先问清一件事：用户此刻要完成的核心任务是什么。然后才分层——场景负责背景构图与光线，表面负责透光与承载文字，角色负责身份提示与入口，氛围负责鼠标反馈，业务界面负责对话与输入。每个增强层都要写出启用、让位、退出、恢复四个条件。

## 边界与转交

| 用户实际要的 | 交给谁 |
| --- | --- |
| 玻璃材质本身怎么调（模糊、折射、边缘高光） | `frontend-liquid-glass` |
| 粒子层怎么生成、怎么降级 | `frontend-particles` |
| 立绘和界面的空间关系、脸被不被压 | `frontend-anime-fusion` |
| 页面节高、字号阶梯、文案人味 | `frontend-taste-base` / `frontend-apple-minimal` |
| 工业科幻 / 冷白深墨的视觉语言 | `frontend-industrial-sci-fi` |
| 多层共存、切换交接、增强退出、偏好协议 | 本技能 |

## 看

```sh
python3 -m http.server 8080          # 在本目录运行
# http://localhost:8080/templates/lab.html

node assets/contrast.mjs --selftest  # 校准对比度与染色地板模型
node assets/contrast.mjs --fg f1f5ff --bg f1f5ff --over 101a30 --alpha 0.68
```

`templates/lab.html` 是一个单文件实验台：三个场景按代次交接、玻璃参数与代码默认曲线一致、巡灯员用拉绳预览 + 松手提交、设置抽屉里可导出导入偏好 JSON。它演示的是协议，不是成品视觉。

## 证据分级

技能里每条数字都标了来源，三种标记不可混用：

- 【源码】—— DSH Wallpaper Engine v1.4.2 安装产物中实测到的常量与表达式（附文件与行号）。
- 【手册】—— 《前端设计指导手册》第七章的教学参数与叙述，可用于讲清机制，不一定等于线上默认值。
- 【约束】—— 从源码与手册共同推出的可迁移规则，换到任何项目都应成立。

`references/00-constitution.md` 里有完整对照表，包括手册写「死区 3 CSS px」而源码常量为 `MASCOT_DRAG_SLOP_PX = 6` 这类出入。

## 许可

本 skill 的规则、表格、实验页与计算脚本均为原创；未复制任何第三方仓库的代码或素材。手册中的案例叙述只作机制说明，源码常量来自本机已安装的公开 npm 包（`dsh-plugin-wallpaper-engine@1.4.2`），仅引用常量数值与表达式。字体一律使用系统字体栈。详见 `references/00-constitution.md` 末节与 `VERIFICATION.md` 的许可核查段。
