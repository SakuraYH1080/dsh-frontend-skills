# VERIFICATION · frontend-industrial-sci-fi

本文件由 _tests/gen-verification.mjs 从三份实测报告与磁盘现状生成，不是手写声明。任何一行与报告不符，说明文件已被改动，重跑一遍即可核对。

## 一、测试环境

| 项 | 值 |
|---|---|
| 验证时间 | 2026-11-06 |
| 被验对象 | /Users/geniusyfish/.agents/skills |
| 操作系统 | macOS（Darwin / arm64） |
| Node | v26.13.0 |
| 浏览器 | Google Chrome 157.0.8103.38，--headless=new，裸 CDP over WebSocket |
| 第三方依赖 | 无。三个验收脚本只用 node: 内置模块，页面不加载任何外部资源 |
| 视口 | 桌面 1440 × 900 DPR 1；移动端复检 390 × 844 DPR 2（同一页面二开，媒体查询真实接管） |
| 动效偏好 | Emulation.setEmulatedMedia 强制 prefers-reduced-motion: no-preference；降级分支另做静态检查 |
| 页面加载 | file:// 直开，不起本地服务器 |


三个脚本都支持 `SKILLS_ROOT` 环境变量，因此同一份代码既验构建目录也验安装副本：

```sh
cd build
node _tests/preflight.mjs && node _tests/isolation.mjs && node _tests/runtime.mjs
SKILLS_ROOT=$HOME/.agents/skills node _tests/preflight.mjs   # PASS 302 / FAIL 0
SKILLS_ROOT=$HOME/.agents/skills node _tests/isolation.mjs   # PASS 25 / FAIL 0
SKILLS_ROOT=$HOME/.agents/skills node _tests/runtime.mjs     # PASS 148 / FAIL 0（含 390×844 移动端复检）
```

## 二、三层验收总况

| 层 | 脚本 | 检查什么 | 总结果 |
|---|---|---|---|
| 结构 | _tests/preflight.mjs | frontmatter、七节标题、目录、引用路径、外链、tokens、空壳文件 | PASS 302 / FAIL 0 |
| 隔离 | _tests/isolation.mjs | 五家视觉签名是否串味、交接规则是否成文 | PASS 25 / FAIL 0 |
| 运行期 | _tests/runtime.mjs | 真实 Chrome 里加载 11 个页面：JS 异常、资源失败、外网请求、功能断言、截图 | PASS 148 / FAIL 0 |

本 skill 在三层的分层得分：

- 结构层：PASS 61 / FAIL 0
- 隔离层：PASS 6 / FAIL 0（含正向、交叉污染、组合三类）
- 运行期：PASS 25 / FAIL 0（2 个页面）

## 三、运行期逐条结果

### console.html

| 断言 | 结果 | 实测值 |
|---|---|---|
| 无 JS 异常 | PASS | — |
| 无资源加载失败 | PASS | — |
| 无外网请求 | PASS | — |
| 有实际渲染内容 | PASS | 118 个节点（阈值 40） |
| ISX API 存在 | PASS | — |
| 预设可切换 | PASS | — |
| 切角几何可算 | PASS | — |
| border-radius 恒为 0 | PASS | — |
| 截图已生成 | PASS | is-console.png |
| [390×844] 无 JS 异常 | PASS | — |
| [390×844] 无资源加载失败 | PASS | — |
| [390×844] 视口真的变成 390 | PASS | innerWidth=390 |
| [390×844] · 移动端无横向溢出 | PASS | — |
| [390×844] · 移动端仍无圆角 | PASS | — |
| [390×844] · 移动端行高不小于 28px（触控） | PASS | — |
| [390×844] 截图已生成 | PASS | is-console-mobile.png |

截图：_tests/shots/is-console.png（1440×900，PNG）；_tests/shots/is-console-mobile.png（390×844，PNG）

### archive.html

| 断言 | 结果 | 实测值 |
|---|---|---|
| 无 JS 异常 | PASS | — |
| 无资源加载失败 | PASS | — |
| 无外网请求 | PASS | — |
| 有实际渲染内容 | PASS | 138 个节点（阈值 40） |
| ISX API 存在 | PASS | — |
| 预设可切换 | PASS | — |
| 切角几何可算 | PASS | — |
| border-radius 恒为 0 | PASS | — |
| 截图已生成 | PASS | is-archive.png |

截图：_tests/shots/is-archive.png（1440×900，PNG）

## 四、隔离与交叉污染

| 断言 | 结果 | 说明 |
|---|---|---|
| [正向] frontend-industrial-sci-fi 自带核心标记 8 项 | PASS | 全在 |
| [正向] frontend-industrial-sci-fi 有成文的交接/组合规则 | PASS | 有 |
| [正向] frontend-industrial-sci-fi 签名表登记 | PASS | 6 个签名 |
| [交叉] 只调苹果：不应生成终末地 HUD（frontend-industrial-sci-fi 签名进 frontend-apple-minimal） | PASS | clean |
| [交叉] 只调二次元：不应默认工业控制台（frontend-industrial-sci-fi 签名进 frontend-anime-fusion） | PASS | clean |
| [交叉] 只调工业：不应出现苹果营销页（frontend-apple-minimal 签名进 frontend-industrial-sci-fi） | PASS | clean |

隔离测试的判据不是「文件里不能出现别人的词」，而是「别人的视觉签名不能作为自己的实现出现」。文档行里点名兄弟 skill 做交接是允许的（还必须允许），代码、CSS、JSON、HTML 里出现别人的类名或运行时才判失败。

## 五、结构层逐项

PASS 61 项，FAIL 0 项，覆盖：frontmatter 必填字段与长度、七个二级标题（一、…七、）与七个固定话题、硬边界声明、references 数量与单文件 400 行上限、SKILL.md 引用的相对路径全部存在、templates 零外链且含 viewport、tokens.json 合法且标识对齐、assets 下 css/js 不是空壳。

## 六、许可核查

规则、参数、代码、模板全部为本 skill 原创撰写。字体只使用系统字体栈；正文提到的 Saira / Montserrat / JetBrains Mono 是给使用者的建议，三者的许可均为 SIL OFL 1.1，若使用者自行引入需随附 OFL 文本。本 skill 不随附这些字体文件。参考仓库 rhine-lock 是 AGPL-3.0，本 skill 未复制其任何源码，只吸收设计语言层面的结论。

核查方式：_tests 下三个脚本都不联网，页面在网络层被断言「零外网请求」；CSS 里只有内联 data: URI，没有 http(s) 资源；全仓 grep @font-face 结果为 0，grep 字体二进制文件结果为 0。

## 七、文件清单与指纹

共 16 个文件，2622 行。

| 文件 | 行数 | 字节 | sha256（前 16） |
|---|---|---|---|
| `agents/openai.yaml` | 4 | 483 | `4ef6896a2e900e4e` |
| `assets/industrial.css` | 342 | 13137 | `d49c7b20d80e5629` |
| `assets/industrial.js` | 198 | 6861 | `c27003eb14ec5e17` |
| `assets/tokens.json` | 218 | 5099 | `62474c99dcf7a357` |
| `examples/.gitkeep` | 0 | 0 | `e3b0c44298fc1c14` |
| `README.md` | 63 | 2754 | `9325ffc24f00ce58` |
| `references/00-constitution.md` | 234 | 13663 | `43dbe547f48d5bcd` |
| `references/10-tokens.md` | 201 | 9603 | `5e40c469db0295d9` |
| `references/20-hud.md` | 140 | 6200 | `acc1c6a54f9dfc5e` |
| `references/30-type.md` | 129 | 6037 | `721e4988b8849707` |
| `references/40-motion.md` | 156 | 6613 | `35cb32e79b03402b` |
| `references/50-data.md` | 140 | 6049 | `9c294c2f179c8117` |
| `references/60-variants.md` | 164 | 8238 | `23686bc72497c8a9` |
| `SKILL.md` | 224 | 15218 | `5199e0d11418c4be` |
| `templates/archive.html` | 201 | 7937 | `dabded0d246a882f` |
| `templates/console.html` | 208 | 7964 | `0feb9f8fb9457d1a` |

## 八、复跑

```bash
cd build
node _tests/preflight.mjs    # 结构，秒级
node _tests/isolation.mjs    # 隔离，秒级
node _tests/runtime.mjs      # 真实浏览器，约 70 秒，产出 _tests/shots/*.png
node _tests/gen-verification.mjs   # 重写本文件
```

## 九、已知限制

- 运行期覆盖两个视口：桌面 1440×900，移动端 390×844（DPR 2，Apple/Android 常见竖屏宽度）。移动端只对有 mobile 标记的 6 个页面做二轮复检，每页断言「无横向溢出 / 无 JS 异常 / 本 skill 的核心签名在窄屏仍成立」（如 industrial 仍无圆角、anime 面板改上下堆叠、glass 仍有 blur），并各出一张截图。360px 与 768px 两档仍只在 references 的媒体查询里定义，没有逐档截图。
- headless Chrome 的渲染与真机 GPU 有差异：backdrop-filter、feDisplacementMap、mix-blend-mode 的观感以截图为准，帧率数字不作为验收门槛。
- 深色主题只验证了模板里实际启用的那一个（tokens 中定义的其余主题不代表已验证渲染）。
- 隔离测试是源码级与运行期签名扫描，不是语义审查：它保证「不串味」，不保证「好看」。
