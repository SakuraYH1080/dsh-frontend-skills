# 验证记录 · frontend-ecosystem

> 本文件记录本技能包在 2026-11-09 的实际核对过程。凡是没跑过的，都写在「九、已知限制」里，不在这里冒充结论。
> 证据分级沿用技能正文：\`【源码】\` 来自本机安装产物，\`【手册】\` 来自《前端设计指导手册》第七章，\`【约束】\` 是可迁移的设计约束。

## 一、测试环境

| 项 | 值 |
|---|---|
| 系统 | macOS 27.2（arm64） |
| Node | v26.13.0 |
| Python | 3.9.6（仅用于 JSON 交叉解析） |
| DSH 安装包 | \`/Applications/DeepSeek Harness.app/Contents/Resources/app/dsh/\` |
| 技能扫描实现 | \`@deepseek-ai/dsh-skill-filesystem/lib/index.js\`、\`@deepseek-ai/dsh-skill/lib/index.js\` |
| 扫描根（rank 由小到大） | \`<项目>/.dsh/skills\` 100 → \`<项目>/.agents/skills\` 200 → 自定义 300 → \`<dshHome>/skills\` 400 → \`<agentsHome>/skills\` 500 |
| 源码目录 | \`/Users/geniusyfish/Working_space/Vibe_coding_space/dsh-skill/build/frontend-ecosystem/\` |
| 安装目录 | \`/Users/geniusyfish/.agents/skills/frontend-ecosystem/\`（rank 500 的用户根） |
| 章节来源 | \`frontend-design-master/前端设计指导手册_第七章_一个完整的前端生态搭建.md\`（475 行，v1.0） |
| 源码样本 | \`dsh-plugin-wallpaper-engine\` v1.4.2（八个子包同版本，仅 lib/ 编译产物） |

## 二、三层验收总况

结构层、内容层、运行层分开记，避免「文件都在」被当成「逻辑都对」。

### 2.1 结构层

| 检查 | 结果 |
|---|---|
| 目录形态 | \`frontend-ecosystem/SKILL.md\` 直接子项，符合 bundle 约定 |
| frontmatter 四键 | \`name\` / \`description\` / \`whenToUse\` / \`metadata\` 齐全，YAML 可解析 |
| 名称合法 | \`frontend-ecosystem\` 通过 \`/^[a-z0-9]+(?:-[a-z0-9]+)*$/\` |
| 名称与目录 | 完全一致 |
| 描述长度 | 展开后 844 字符，含「用于」「当用户提到」「加载」三段触发语 |
| 引用完整性 | 扫描 SKILL.md / README.md / VERIFICATION.md / agents/openai.yaml 中全部 87 处相对引用 token，缺失 0 |
| 文件地图 | SKILL.md 第七节与实际目录逐一对应 |

### 2.2 内容层：第七章四条关键决策的落点

| 手册决策 | 落点 |
|---|---|
| 先做任务，再分层；每层写明启用 / 让位 / 退出 / 恢复 | SKILL.md「三、结构骨架」+ \`references/00-constitution.md\`（五层职责六格表、四格独立性、六字段合同） |
| 换场景按就绪交接；只提交最新请求；四档回退；三种状态分开 | \`references/10-stage-handoff.md\`（档位表、asset 合同、首帧四步、代次代码）+ \`templates/lab.html\` 的 \`requestScene\` / \`generation\` |
| 材质服从阅读，角色服从操作；背衬检验；安全区；预览与提交分离 | \`references/20-surface-readability.md\`、\`references/30-actor-safe-area.md\` + \`templates/lab.html\` 的 \`applySurface\` 与拉绳手势 |
| 偏好做成可验证配置；三类数据寿命；校验准备提交保存；缺席与清除 | \`references/40-preference-config.md\` + \`templates/lab.html\` 的 \`profile\` / \`applyProfile\` / \`saveState\` |
| 验收场景：快速连切、手势取消、效果关闭、减少动态、预设往返 | \`references/50-acceptance.md\`（九行矩阵 + 四步演练 + 三个误判） |

### 2.3 运行层

| 检查 | 结果 |
|---|---|
| \`assets/contrast.mjs --selftest\` | exit 0 |
| 对比度低于 4.5:1 时退出码 | exit 2（可当 CI 闸门） |
| \`assets/ecosystem-state.json\` | \`node -e JSON.parse\` 与 \`python3 -m json.tool\` 双向通过 |
| \`templates/lab.html\` 内联 JS | 用 \`new Function\` 解析通过（629 行，无语法错误） |
| \`templates/lab.html\` 浏览器渲染与交互 | 未跑（见第九节） |
| DSH 运行时注册表 | 已热发现：会话技能目录中出现 `frontend-ecosystem`，描述即本包 frontmatter 展开文本（2026-11-09 17:44） |

## 三、运行期逐条结果

### 3.1 对比度复算

命令与输出（正文背景取手册算例的同一叠合链）：

| 命令 | 输出 | 手册值 | 说明 |
|---|---|---|---|
| \`--fg f1f5ff --bg 101a30 --over ffffff --alpha 0.60\` | 4.43:1 | 4.20:1 | 亮底上叠深色遮罩，取深色为背景 |
| \`--fg f1f5ff --bg 101a30 --over ffffff --alpha 0.68\` | 5.78:1 | 5.50:1 | 同上，覆盖率提高 |
| \`--fg f1f5ff --bg f1f5ff --over 101a30 --alpha 0.60\` | 2.32:1 | — | 反方向（白字压白底再叠深色），说明叠合顺序决定结论 |
| \`--fg 8a8f9c --bg f7f4ec\` | 3.13:1，exit 2 | — | 不达标用例，验证闸门有效 |

复算与手册的绝对差在 0.2–0.3，来源是取整与色值微差。技能正文同时保留两列，并要求引用时写明「谁叠在谁上面」。

### 3.2 玻璃公式一致性

\`templates/lab.html\` 的 \`applySurface()\` 使用 \`glassA = Math.max(0.10, 0.25 - (alpha / 100) * 0.15)\`，与 v1.4.2 的 \`glass/lib/client.glass.js\` 同式；可读性地板 \`0.45\` / 深色 \`0.59\`、深色再乘 \`0.4\` 也同源。三档预设 16/20/100、24/40/100、18/50/35 分别对应代码默认、出厂「可读优先」、出厂「原色直出」。

### 3.3 状态诚实

\`templates/lab.html\` 的状态条用 \`data-kind\` 区分 \`ready\` / \`loading\` / \`paused\` / \`failed\`，文案不同；场景层用 \`data-state\` 区分 \`live\` / \`held\` / \`fading\` / \`dead\`，两层不共用同一个布尔值。

## 四、隔离与交叉污染

| 项 | 结论 |
|---|---|
| 本轮写入范围 | 仅 \`build/frontend-ecosystem/\` 与 \`~/.agents/skills/frontend-ecosystem/\` |
| 兄弟技能 | 六个 \`frontend-*\` 目录未改动（只读参考格式） |
| 全局配置 | 未改 DSH 配置、未改扫描根、未写 \`~/.dsh\` |
| 同名冲突 | 安装根下原先没有 \`frontend-ecosystem\`，无覆盖 |
| 两副本一致性 | \`diff -r\` 无输出（复跑命令见第八节） |

## 五、结构层逐项

### 5.1 SKILL.md 七节

| 节 | 起始行 |
|---|---|
| 一、什么时候用 / 不用 | L24 |
| 二、核心原则与硬边界 | L52 |
| 三、结构骨架：五层职责与三个可调族 | L102 |
| 四、参考资料读取路径 | L126 |
| 五、执行流程 | L164 |
| 六、交付检查清单 | L230 |
| 七、文件地图 | L251 |

### 5.2 相对引用清单

| 引用 | 目标 |
|---|---|
| \`references/00-constitution.md\` | 边界、证据分级、v1.4.2 源码事实、五层职责 |
| \`references/10-stage-handoff.md\` | 档位、asset 合同、首帧交接、代次 |
| \`references/20-surface-readability.md\` | 面承载、雾化/染色/阅读底、覆盖度算例 |
| \`references/30-actor-safe-area.md\` | 四位置、provider、拉绳状态表、安全区 |
| \`references/40-preference-config.md\` | 三类寿命、写入路径、预设协议 |
| \`references/50-acceptance.md\` | 九行矩阵、四步演练、三个误判 |
| \`assets/contrast.mjs\` | 对比度与覆盖率计算 CLI |
| \`assets/ecosystem-state.json\` | 六块状态形状 |
| \`templates/lab.html\` | 单文件实验台 |

## 六、许可核查

| 项 | 结论 |
|---|---|
| 文本来源 | 本机自有手册第七章，无第三方转载 |
| 素材 | \`templates/lab.html\` 的角色为手写 SVG/CSS 图形，不引用外部图片、字体与 CDN |
| 依赖 | 全部文件零运行时依赖；\`contrast.mjs\` 只用 Node 内置模块 |
| 源码引用 | 只引用本机安装的 v1.4.2 常量与公式，未复制其产品代码 |

## 七、文件清单与指纹

统计时点：2026-11-09，写入完成前。行数为 \`wc -l\`，字节为 \`wc -c\`，指纹为 \`shasum -a 256\` 前 16 位。

| 文件 | 行 | 字节 | sha256[0:16] |
|---|---|---|---|
| ./SKILL.md | 272 | 20301 | 41501c1cf4399158 |
| ./README.md | 65 | 3931 | 080d45527460ca88 |
| ./agents/openai.yaml | 4 | 449 | 4f442a86b0813df9 |
| ./assets/contrast.mjs | 156 | 5797 | 272b17af6ad60627 |
| ./assets/ecosystem-state.json | 57 | 3662 | bb4619e065e11ae5 |
| ./examples/.gitkeep | 0 | 0 | e3b0c44298fc1c14 |
| ./references/00-constitution.md | 132 | 9256 | d4e0fa8a7c50959c |
| ./references/10-stage-handoff.md | 139 | 6619 | 5a235b8111d96ab3 |
| ./references/20-surface-readability.md | 139 | 7205 | aa1f6bc0ef62e977 |
| ./references/30-actor-safe-area.md | 132 | 6702 | c4c15aa6ee110f80 |
| ./references/40-preference-config.md | 155 | 6546 | 27bcca670d2aa6f2 |
| ./references/50-acceptance.md | 124 | 6514 | e3633a071b2a1624 |
| ./templates/lab.html | 629 | 23607 | d0c3ad9f780d1355 |

## 八、复跑命令

在技能根目录执行：

\`\`\`bash
# 1. 对比度工具自检与闸门
node assets/contrast.mjs --selftest
node assets/contrast.mjs --fg 8a8f9c --bg f7f4ec; echo "exit=$?"   # 期望 2

# 2. 状态形状的 JSON 解析
node -e 'JSON.parse(require("fs").readFileSync("assets/ecosystem-state.json","utf8"));console.log("json ok")'
python3 -m json.tool assets/ecosystem-state.json > /dev/null && echo "python json ok"

# 3. 实验台脚本语法
node -e 'const s=require("fs").readFileSync("templates/lab.html","utf8");const m=s.match(/<script>([\s\S]*?)<\/script>/);new Function(m[1]);console.log("lab js ok")'

# 4. frontmatter 契约
node -e 'const s=require("fs").readFileSync("SKILL.md","utf8");const f=s.split("---")[1];console.log(/^name: frontend-ecosystem$/m.test(f),/^description:/m.test(f),/^whenToUse:/m.test(f))'

# 5. 两副本一致性
diff -r /Users/geniusyfish/Working_space/Vibe_coding_space/dsh-skill/build/frontend-ecosystem \
        /Users/geniusyfish/.agents/skills/frontend-ecosystem && echo "identical"
\`\`\`

## 九、已知限制

1. **死区常量有两个版本。** 手册写 3 CSS px，v1.4.2 的 \`lib/client.js\` 实测 \`MASCOT_DRAG_SLOP_PX = 6\`。技能里 6 为默认，3 作为更灵敏的备选，两者都标了出处。
2. **玻璃三档参数不是全部来自源码。** 16/20/100 是 \`settings-schema.js\` 的默认值；24/40/100 与 18/50/35 来自手册的出厂档描述；2/100/35 只是本机外观页的观察值，不作为推荐。
3. **首帧交接、音频门、provider 门面、写入差分批次** 在本机安装产物里只有常量和外围（\`HIDDEN_PAUSE_DEBOUNCE_MS = 1200\`、\`setTimeout(flushPersist, 200)\`、\`sandbox="allow-scripts"\`），完整实现未直接读到，正文一律标 \`【手册】\`。
4. **对比度数字有 0.2–0.3 的偏差。** 手册的 4.20 / 5.50 / 临界 0.621 与本机复算的 4.43 / 5.78 / 约 0.605 不完全一致，原因是色值取整；引用时必须带叠合顺序。
5. **\`templates/lab.html\` 只做了语法与结构核对**，没有在真实浏览器里跑过交互。验收时按第六节清单手动过一遍：连点 A→B、下拉到 95px 松手、Esc 取消、隐藏角色后开设置、导入非法 JSON。
6. **没有 `dsh` CLI 可用**（`which dsh` 为空），所以「DSH 识别」按运行时实际机制核对，而不是命令行：用户扫根 `~/.agents/skills` 命中 → 目录形态 `frontend-ecosystem/SKILL.md` → frontmatter 过 `validateCandidate` 的同名规则 → 运行时 catalog 热发现并在技能列表中出现本技能。


> VERIFICATION.md 自身不列入指纹表：写指纹这一步会改到文件本身，自指坐标必然漂移。它的一致性靠两副本 diff -r 与第八节的复跑命令保证。
