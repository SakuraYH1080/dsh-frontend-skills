# frontend-particles

粒子背景的独立 skill。只做「会动的底」，不碰版式、材质、角色与品牌语言。

它交付：发射器与生命周期、力场与噪声流场、三条渲染路线的选型判据、
指针交互与网格加速连接线、性能预算与四档降级。

## 安装

```bash
# 方式一：装到用户级 skills 目录（所有项目可用）
cp -R frontend-particles ~/.agents/skills/

# 方式二：只在当前项目里用
mkdir -p .agents/skills && cp -R frontend-particles .agents/skills/

# 方式三：DSH 自己的 skills 根
cp -R frontend-particles ~/.dsh/skills/
```

DSH 扫描这四个根：`<项目>/.dsh/skills`、`<项目>/.agents/skills`、`<dshHome>/skills`、
`<agentsHome>/skills`。目录 bundle 必须是 `<name>/SKILL.md`，只扫直接子项，放进去即可，无需重启。

## 用

三种触发方式，效果一样：

- 说原话：「给这个落地页加一层星场背景」「粒子层有点卡」「粒子压得正文看不清」。
- 点名 skill：「用 frontend-particles 做一层尘埃」。
- 与兄弟 skill 组合：必须指定主导语言，例如「以 frontend-industrial-sci-fi 为主导，
  粒子只做数据流层」。默认不组合。

## 看

```bash
cd templates && python3 -m http.server 8080
```

- `http://localhost:8080/01-starfield-canvas2d.html` —— 三层视差星场，Canvas 2D，
  带暂停、降档按钮与 p50/p95 实时读数。
- `http://localhost:8080/02-dust-css.html` —— 纯 CSS 尘埃，无一行 JS，60 粒。

两个文件都不引 CDN、不引外链字体、不带构建步骤，双击也能开。

## 四个变体

| 变体 | 一句话 | count | 什么时候用 |
|---|---|---|---|
| starfield 星场 | 三层视差、无寿命、只漂移 | 220 | 落地页首屏，静止时也要好看 |
| dust 尘埃 | curl 噪声、慢、几乎察觉不到 | 140 | 内容页背景，长时间停留 |
| dataflow 数据流 | 沿路径、方向一致、有拖尾 | 260 | 科技/监控类，暗示传输 |
| weather 天气 | 重力 + 周期风、有落点 | 320 | 氛围页，需要一个「天气」 |

## 目录

```text
SKILL.md        七节入口：判据与路由
references/     按需读的细节（7 个文件，每个 ≤ 400 行）
assets/         tokens.json（数值唯一来源）+ particles.css + particles.js
templates/      两个可直接打开的 HTML
examples/       截图位（当前为空）
```

`assets/particles.js` 暴露 `ParticleField.create({ canvas, preset, override })` 与
`ParticleField.countFor(route, w, h)`，无依赖、无构建，可直接 `<script src>` 引入。

## 许可

规则、参数、代码均为本 skill 原创撰写。无第三方字体、无外部 CDN、无位图素材；
粒子与遮罩全部由 CSS/Canvas 生成。不包含任何第三方仓库的源码。
