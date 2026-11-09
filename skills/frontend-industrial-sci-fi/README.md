# frontend-industrial-sci-fi

工业科幻视觉系统：把「科研机构语言」与「工业秩序语言」压成一套可复用的界面语法 —— 深墨底、单一信号色、对角切角、1px 细线分区、三态语义、机械动效。

## 安装

```bash
# 方式一：从 Agent Skills 源装
npx skills add SakuraYH1080/dsh-frontend-skills --skill frontend-industrial-sci-fi

# 方式二：克隆后拷进本地 skill 目录
git clone https://github.com/SakuraYH1080/dsh-frontend-skills.git
cp -R dsh-frontend-skills/skills/frontend-industrial-sci-fi ~/.agents/skills/frontend-industrial-sci-fi
```

拷完确认 `~/.agents/skills/frontend-industrial-sci-fi/SKILL.md` 存在且 frontmatter 的 `name` 与目录名一致。

## 用

把整个目录交给 agent，或让它在需要时按 `SKILL.md` 第四节的读取路径按需打开 reference。最省事的开场：

```text
用 frontend-industrial-sci-fi 做一个设备监控控制台，预设 standard，偏 industry。
```

交付时它会先给你一张变体卡三行（preset / density / dominant），再给代码。

## 看

直接双击，或起一个本地静态服务器：

```bash
cd skills/frontend-industrial-sci-fi/templates
python3 -m http.server 8080
# http://localhost:8080/console.html   深底控制台
# http://localhost:8080/archive.html   浅底档案（cold-store 反相预设）
```

两个模板零依赖：不引 CDN、不引外链字体、不构建，只用系统字体栈 `ui-monospace` / `-apple-system` / `"PingFang SC"`。
页脚的四个预设按钮可实时切 standard / cold-store / site / night-shift 四套 token（写入 `:root[data-isx-preset]` 并记进 localStorage）。

## 目录

```text
SKILL.md                 入口（模型读这一个就够起步）
references/00…60         七份按需加载的规则文件
assets/tokens.json       平台无关 Token
assets/industrial.css    .isx-* 组件 + 切角边框实现
assets/industrial.js     状态机（只升不降）/ 数字滚动 / 预设切换
templates/*.html         两个可直接运行的样板
examples/                放你自己的截图与录屏（目录默认空）
```

## 许可

本 skill 的文本、Token、CSS、JS、HTML 均为原创实现，随本仓库分发。

设计语言的参考来源与许可状态：

- 「工业秩序」一侧的组织方式参考 `hhikr/endfield-ui-skill`（无根 LICENSE，仅借鉴信息组织方式，未复制代码）。
- 「科研机构」一侧的视觉参考 `tmc5csxr9m-cpu/rhine-lock`（AGPL-3.0，未复制任何源码，未引入其仓库内容）。
- 字体只使用系统字体栈；文中提及的 Saira / Montserrat / JetBrains Mono 若被使用者自行引入，其许可为 SIL OFL 1.1。

换言之：**本目录不含任何第三方仓库代码或图片素材。** 全部图形由 CSS `clip-path` 与 1px 边框生成。
