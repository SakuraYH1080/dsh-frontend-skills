# frontend-liquid-glass

一个只做「液态玻璃材质」的 Agent Skill。它把玻璃拆成四个可分别控制的成因（模糊 / 折射 / 边缘高光 / 环境色渗透），给出九旋钮参数表、四套场景预设、可运行实验室与降级策略。

## 安装

标准 Agent Skills 包（根目录 `SKILL.md`），不绑定某一家 agent。

```sh
# 通用 skills CLI
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-liquid-glass

# 手动：放进任一被扫描的根目录
cp -R frontend-liquid-glass ~/.agents/skills/frontend-liquid-glass
# 或项目级
cp -R frontend-liquid-glass <项目>/.agents/skills/frontend-liquid-glass
```

DSH 的扫描根（rank 由小到大）：`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`<dshHome>/skills`、`<agentsHome>/skills`。目录 bundle 必须是 `<name>/SKILL.md`，只扫直接子项。

## 用

- 直接说「给这个页面加液态玻璃」「玻璃糊成一片读不清」「玻璃在手机上掉帧」。
- 或点名：`使用 frontend-liquid-glass`。

它只改材质，不动版式与品牌语言。要给整体风格，另外搭配 `frontend-apple-minimal` 或 `frontend-industrial-sci-fi`，并明确以谁为主导。

## 看

```sh
python3 -m http.server 8080     # 在本目录运行
# http://localhost:8080/templates/lab.html
# http://localhost:8080/templates/panels.html
```

## 许可

本 skill 的规则、参数、CSS/JS 均为原创；未复制任何第三方仓库的代码或素材。字体一律使用系统字体栈与可选的 SIL OFL 字体（需自行随附许可证）。详见 `references/00-constitution.md` 末节与 `VERIFICATION.md` 的许可核查段。
