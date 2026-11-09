# frontend-apple-minimal

极简主义的信息层级、留白节奏与滚动叙事——一套判据，不是一套皮肤。

## 安装

```bash
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-apple-minimal
# 或直接拷贝目录到你的 skills 扫描根
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git && cp -R dsh-frontend-skills/skills/frontend-apple-minimal ~/.dsh/skills/
```

## DSH 扫描根

按 rank 顺序读取，同名 skill 取 rank 最小的一份：

1. `<project>/.dsh/skills/`
2. `~/.dsh/skills/`
3. 插件内置 skills 目录

## 用法

- 只看判据：读 `SKILL.md` 第一、二节。
- 要动手：从第三节预设表选一个，把 `assets/tokens.json` 抄进项目，再用 `assets/apple-minimal.css` 打底。
- 要排页面：照第五节执行流程走，每一步只读对应的一份 reference。
- 要查具体数值（灰阶、clamp、曲线、对比度）：`references/10-type-grid.md`、`references/40-motion.md`。

## 本地预览

```bash
cd frontend-apple-minimal
python3 -m http.server 8080
# 然后打开 http://127.0.0.1:8080/templates/launch-page.html
```

两个模板都不引任何外部资源，双击 HTML 也能直接看。

## 结构

```
SKILL.md  README.md  agents/  references/  assets/  templates/  examples/
```

## 许可

本目录内容为原创，随仓库许可发布。参考仓库仅借鉴目录组织方式，未复制其源码。
模板与样式不含任何第三方字体或图片，只用系统字体栈与 CSS/SVG 绘制。
