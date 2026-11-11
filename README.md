# dsh-frontend-skills

八个面向前端视觉设计的中文 Agent Skill，可被 DSH / Claude Code / Cursor 等支持 `AGENTS.md` 式 skill 目录的 agent 直接索引。

每个 skill 是一个自包含目录：根目录 `SKILL.md`（YAML frontmatter + 判据正文），配 `references/` 细则、`assets/` 可抄的 token 与代码、`templates/` 可双击打开的模板、`examples/`、`VERIFICATION.md`（自检清单与实测记录）。

它们的共同设计前提：**只解决自己那一层的问题，把别的层留给兄弟 skill。** 一个页面里同时要角色、留白、玻璃、粒子时，必须指定一个主导语言，其余服从。

其中一个（`frontend-ecosystem`）不生产视觉，它是编排层：只回答「这几层同时存在时，谁在什么时候让位、怎么退出、偏好怎么存」。

另外两层管的是「在动手之前」和「在细节之下」：`frontend-design-direction` 定整体范式与分工，`frontend-taste-base` 给节高、动效预算与文案声口的底线判据。

---

## 一览

| Skill | 解决什么 | 什么时候加载 |
|---|---|---|
| [`frontend-anime-fusion`](skills/frontend-anime-fusion/) | 二次元角色立绘与现代 UI 的空间关系：分层模型、构图比例、遮挡顺序、可读性 | 角色展示页、游戏启动器、抽卡界面；立绘被面板压脸、屏幕裁掉头顶 |
| [`frontend-apple-minimal`](skills/frontend-apple-minimal/) | 极简信息设计：一屏讲一件事、留白阶梯、模块化字阶、长页滚动节奏 | 产品发布页、文档站、品牌主页；页面信息层级发虚、间距字号不自洽 |
| [`frontend-industrial-sci-fi`](skills/frontend-industrial-sci-fi/) | 工业科幻视觉系统：双底色、单一信号色、切角几何、HUD 编号、三态语义 | 控制台、数据面板、监控大屏、单机游戏 UI；切角像贴纸、强调色撞车 |
| [`frontend-liquid-glass`](skills/frontend-liquid-glass/) | 液态玻璃材质：模糊/折射/边缘高光/环境色渗透四成因与九旋钮参数 | 玻璃导航栏、浮层、播放器面板；玻璃糊成一片、读不清、移动端掉帧 |
| [`frontend-particles`](skills/frontend-particles/) | 粒子层：发射器与寿命、力场与噪声流场、三条渲染路线选型、性能预算 | 粒子背景、星场、鼠标跟随与连接线；canvas 动画掉帧、粒子压住正文 |
| [`frontend-ecosystem`](skills/frontend-ecosystem/) | 多层协作编排：五层职责切分、按就绪交接的场景切换、表面可读性秩序、角色安全区、偏好寿命与版本化预设 | 场景 + 玻璃 + 角色 + 设置同处一个产品；换壁纸闪黑、玻璃读不清、角色挡内容、设置存不住 |
| [`frontend-design-direction`](skills/frontend-design-direction/) | 整体范式与专项分工：任务句 → 内容分工 → 主导语言 → 识别细节 → 专项台账 → 同一任务验收 | 新站/整站改版、整站去 AI 味、多个专项抢同一块表面，需要先定规则与实际分工 |
| [`frontend-taste-base`](skills/frontend-taste-base/) | 通用品味基线：一屏一节的节高窗口表、动效三层预算、文案 AI 味两级清单 | 写营销页/落地页骨架之前；页面「哪里都对合起来不对」要定位节高、层级还是文案 |

`frontend-ecosystem` 与其他五个不是并列关系：它只在「多层同时开工」时上场，单项问题仍然交给对应的专项 skill，它自己不调材质、不画角色、不做粒子。

八个 skill 分四层：`frontend-design-direction`（方向）→ `frontend-taste-base`（品味底线）→ 五个视觉专项 → `frontend-ecosystem`（多层编排）。方向层与编排层都不生产视觉，它们只决定「谁定稿、范围到哪、冲突怎么裁」。

---

## 安装

### 方式一：skills CLI

```bash
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-liquid-glass
```

把 `--skill` 换成任意一个名字即可，或用 `--all` 装全部。

### 方式二：克隆后拷进扫描根

```bash
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git
cd dsh-frontend-skills

# 用户级：所有项目可见
cp -R skills/frontend-* ~/.agents/skills/

# 项目级：只在当前项目生效
mkdir -p .agents/skills && cp -R skills/frontend-* .agents/skills/
```

### 方式三：只装一个

```bash
cp -R skills/frontend-industrial-sci-fi ~/.agents/skills/frontend-industrial-sci-fi
```

---

## DSH 的扫描根

按 rank 由小到大读取，同名 skill 取 rank 最小的一份：

1. `<project>/.dsh/skills/`
2. `<project>/.agents/skills/`
3. `<dshHome>/skills/`
4. `<agentsHome>/skills/`

目录 bundle 必须是 `<name>/SKILL.md`，**只扫直接子项**（不会递归下钻）。目录名必须与 frontmatter 的 `name` 完全一致，否则不会被索引。放进去即可，无需重启。

---

## 加载之后怎么用

三个入口等价：

1. 说原话：「这个落地页粒子有点卡」→ 命中 `frontend-particles` 的 `whenToUse`。
2. 点名：「使用 frontend-liquid-glass」。
3. 组合：「以 frontend-industrial-sci-fi 为主导，配一层 frontend-particles 的尘埃」—— 组合时必须显式指定主导，否则两套视觉语言会互相拆台。

每个 skill 内部都有「读取路径」一节：先读 `SKILL.md` 的判断部分，只在需要具体数值时才打开对应的 `references/` 文件。不要把整包塞给模型。

---

## 目录结构

```text
skills/
  frontend-anime-fusion/
    SKILL.md            入口：frontmatter + 判据正文
    README.md           安装、触发词、文件清单
    VERIFICATION.md     自检清单与逐条实测结果
    agents/openai.yaml  agent 平台声明
    references/         分主题细则（按需读）
    assets/             可直接抄的 token / CSS / JS
    templates/          零依赖 HTML，双击即开
    examples/           截图与示例
```

135 个文件，约 2.2 MB（其中 frontend-taste-base 的 examples/shots 占 1.1 MB 截图）。

---

## 本地预览模板

```bash
cd skills/frontend-liquid-glass && python3 -m http.server 8080
# http://localhost:8080/templates/lab.html
```

换成任意一个 skill 的目录，模板都是零依赖（系统字体栈、内联 SVG、无 CDN、无外链）。

---

## 内容边界

- 全部为原创参数、CSS、JS、HTML，不含任何第三方仓库代码或位图素材。
- 图形一律由 CSS `clip-path`、`border`、内联 SVG、Canvas 生成。
- 字体只使用系统字体栈；文中提及的 Saira / Montserrat / JetBrains Mono 等若被使用者自行引入，其许可为 SIL OFL 1.1，需随附许可证。
- 个别 skill 在设计语言的组织方式上参考过公开仓库的思路，未复制源码，来源与许可状态记在各 `README.md` 的「许可」段与 `VERIFICATION.md` 的许可核查段。

## License

MIT，见 [LICENSE](LICENSE)。
