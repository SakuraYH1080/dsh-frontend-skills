# frontend-anime-fusion

把二次元角色立绘放进现代界面，且让角色与 UI 成为**一套空间系统**，而不是「背景上贴一张图」。
本 skill 只决定角色与界面的空间关系——分层、构图、遮挡、裁切、可读性。它不决定工业 HUD、苹果式留白、玻璃材质参数、粒子算法。

## 安装

```bash
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-anime-fusion
```

或手动放进任意一个 DSH 扫描根（只扫**直接子项**，bundle 必须是 `<name>/SKILL.md`）：

```bash
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git && cd dsh-frontend-skills

cp -R skills/frontend-anime-fusion <项目>/.dsh/skills/     # 项目级，优先级最高
cp -R skills/frontend-anime-fusion <项目>/.agents/skills/  # 项目级，次之
cp -R skills/frontend-anime-fusion <dshHome>/skills/       # 用户级，全部项目可见
cp -R skills/frontend-anime-fusion <agentsHome>/skills/    # 用户级，兼容路径
```

装完确认 `<根>/frontend-anime-fusion/SKILL.md` 存在。目录名必须与 frontmatter 的 `name` 完全一致，否则不会被索引。

## 用

用户原话触发：

- 「做个二次元角色主页」「立绘和面板怎么摆才不土」
- 「角色能不能从面板后面探出来」「交互式角色页」
- 「anime character landing page」「character over UI layering」

点名调用：`用 frontend-anime-fusion 重做这一屏`。

边界声明：本 skill 不产出工业控制台、苹果营销版式、玻璃材质配方、粒子系统。需要那些时交给 `frontend-industrial-sci-fi` / `frontend-apple-minimal` / `frontend-liquid-glass` / `frontend-particles`，并按用户指定的主导语言组合。

## 看

```bash
cd skills/frontend-anime-fusion
python3 -m http.server 8000
```

- `templates/stage.html` — A 模型：角色在界面之后，四层结构 + 底边遮罩 + 按 F 看头部禁区
- `templates/launcher.html` — B 模型：角色穿透界面，同一切线切两片，按 F 看切线位置

两份模板零依赖：系统字体栈、内联 SVG 角色、无 CDN、无外链。双击也能开。

## 许可

参数、CSS、JS 均为原创。角色图形是内联 SVG 占位符，不含任何第三方素材——替换为真实立绘时请按 `references/60-copyright.md` 记录来源与授权。
