#!/usr/bin/env node
/**
 * taste-check.mjs — frontend-taste-base 的静态自检
 *
 * 用法：
 *   node assets/taste-check.mjs <页面.html> [更多.html ...]
 *   node assets/taste-check.mjs --json <页面.html>     # 机读输出
 *
 * 设计原则：
 *   - 零依赖，只读文件，不启动浏览器
 *   - 只检查"能静态判定"的项；判断类问题交给人（见 references/50-audit.md 第 5 节）
 *   - 六种状态：PASS / FAIL / OPEN / SETUP / ERROR / OFF
 *   - FAIL 只能通过 --waivers waivers.json 豁免，绝不能改检查去修
 *
 * 退出码：0 全 PASS 或 OPEN；1 存在 FAIL；2 脚本自身 ERROR
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const STATES = { PASS: "PASS", FAIL: "FAIL", OPEN: "OPEN", SETUP: "SETUP", ERROR: "ERROR", OFF: "OFF" };

const results = [];
function record(group, id, state, detail) {
  results.push({ group, id, state, detail: detail || "" });
}

/* ---------------- 参数 ---------------- */

const argv = process.argv.slice(2);
const jsonOut = argv.includes("--json");
let waiverPath = null;
const waiverIdx = argv.indexOf("--waivers");
if (waiverIdx >= 0) {
  waiverPath = argv[waiverIdx + 1];
  argv.splice(waiverIdx, 2);
}
const files = argv.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.error("用法: node assets/taste-check.mjs <页面.html> [--json] [--waivers waivers.json]");
  process.exit(2);
}

let waivers = [];
if (waiverPath) {
  try {
    const raw = JSON.parse(readFileSync(resolve(waiverPath), "utf8"));
    waivers = Array.isArray(raw.waivers) ? raw.waivers : [];
    if (waivers.length > 5) {
      record("waiver", "count", STATES.FAIL, "豁免超过 5 条：豁免 " + waivers.length + " 条。超过 5 条说明设计整体不合格，不是个别问题。");
    } else {
      record("waiver", "count", STATES.PASS, "豁免 " + waivers.length + " 条（上限 5）");
    }
  } catch (e) {
    record("waiver", "load", STATES.ERROR, "waivers.json 读不出来：" + e.message);
  }
}

/* ---------------- 逐文件检查 ---------------- */

for (const f of files) {
  const abs = resolve(f);
  let src;
  try {
    src = readFileSync(abs, "utf8");
  } catch (e) {
    record("file", "read", STATES.ERROR, abs + " 读不出来：" + e.message);
    continue;
  }

  const name = basename(abs);
  const tag = (id) => name + ":" + id;

  /* ---------- 1. 结构 ---------- */

  // 1.1 节数
  const sectionCount = (src.match(/<section\b/g) || []).length;
  if (sectionCount >= 5 && sectionCount <= 6) {
    record("结构", tag("sections"), STATES.PASS, "节数 " + sectionCount + "（5–6）");
  } else if (sectionCount === 0) {
    record("结构", tag("sections"), STATES.SETUP, "没有 <section>：可能用了别的语义标签，需人工确认节划分");
  } else {
    record("结构", tag("sections"), STATES.FAIL, "节数 " + sectionCount + "，要求 5–6");
  }

  // 1.2 --h 值
  const hVals = [...src.matchAll(/--h\s*:\s*(\d+)/g)].map((m) => Number(m[1]));
  const badH = hVals.filter((v) => v !== 1 && v !== 2);
  if (badH.length) {
    record("结构", tag("--h"), STATES.FAIL, "--h 出现 " + badH.join(",") + "，只允许 1 或 2");
  } else if (hVals.length) {
    record("结构", tag("--h"), STATES.PASS, "--h 取值 " + [...new Set(hVals)].join(",") + " 全部合法");
  } else {
    record("结构", tag("--h"), STATES.PASS, "未显式设置 --h，走默认值 1");
  }

  // 1.3 min-height 撑节
  if (/min-height\s*:\s*\d+(vh|svh|dvh|%)/.test(src)) {
    record("结构", tag("min-height"), STATES.FAIL, "用了 min-height 撑节：节高会变成随内容，整页节奏失效");
  } else {
    record("结构", tag("min-height"), STATES.PASS, "未用 min-height 撑节");
  }

  // 1.4 100vh / 100dvh
  if (/height\s*:\s*100(vh|dvh)\b/.test(src)) {
    record("结构", tag("viewport-unit"), STATES.FAIL, "用了 100vh 或 100dvh：地址栏让节高跳变。改 100svh");
  } else {
    record("结构", tag("viewport-unit"), STATES.PASS, "未用 100vh / 100dvh");
  }

  // 1.5 卡片化计数（启发式）
  const bgCount = (src.match(/background(-color)?\s*:\s*(?!transparent|none|inherit)/g) || []).length;
  const radiusCount = (src.match(/border-radius\s*:\s*(?!0\b|0px)/g) || []).length;
  const cardGuess = Math.min(bgCount, radiusCount);
  if (cardGuess > 6) {
    record("结构", tag("cards"), STATES.FAIL, "疑似卡片化元素 " + cardGuess + " 个（bg " + bgCount + " / radius " + radiusCount + "），上限 6");
  } else {
    record("结构", tag("cards"), STATES.PASS, "疑似卡片化元素 " + cardGuess + " 个（启发式，需人眼复核）");
  }

  // 1.6 分隔线
  const borderTop = (src.match(/border-top\s*:\s*(?!0|none)/g) || []).length;
  if (borderTop > 0) {
    record("结构", tag("dividers"), STATES.OPEN, "出现 " + borderTop + " 条 border-top：确认是否被当节分隔线用（禁止）");
  } else {
    record("结构", tag("dividers"), STATES.PASS, "无 border-top 分隔");
  }

  /* ---------- 2. 动效 ---------- */

  // 2.1 曲线控制点（粗查：cubic-bezier 里 y 超 1）
  const beziers = [...src.matchAll(/cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/g)];
  const overshoot = [];
  for (const m of beziers) {
    const y1 = Number(m[2]);
    const y2 = Number(m[4]);
    if (y1 < 0 || y1 > 1 || y2 < 0 || y2 > 1) overshoot.push(m[0]);
  }
  if (overshoot.length) {
    record("动效", tag("easing"), STATES.FAIL, "带回弹的曲线 " + overshoot.length + " 条：" + overshoot.slice(0, 3).join(" / "));
  } else {
    record("动效", tag("easing"), STATES.PASS, beziers.length + " 条曲线控制点 y 全在 [0,1]");
  }

  // 2.2 禁用属性动画
  const badTransitions = [...src.matchAll(/transition\s*:\s*([^;]+);/g)]
    .map((m) => m[1])
    .filter((v) => /\b(width|height|top|left|right|bottom|margin|padding|box-shadow|filter)\b/.test(v));
  if (badTransitions.length) {
    record("动效", tag("transition-prop"), STATES.FAIL, "过渡了非合成属性 " + badTransitions.length + " 处：" + badTransitions[0].trim().slice(0, 60));
  } else {
    record("动效", tag("transition-prop"), STATES.PASS, "过渡属性均为 transform / opacity 类");
  }

  // 2.3 will-change 位置
  if (/body\s*\{[^}]*will-change/.test(src) || /html\s*\{[^}]*will-change/.test(src)) {
    record("动效", tag("will-change"), STATES.FAIL, "will-change 加在 body / html：会把整页提升为合成层，显存暴涨");
  } else {
    record("动效", tag("will-change"), STATES.PASS, "will-change 未加在 body / html");
  }

  // 2.4 scroll 监听里读布局
  const scrollHandlers = [...src.matchAll(/addEventListener\(\s*['"]scroll['"][^)]*\)\s*=>?\s*\{([\s\S]{0,600}?)\}\s*\)/g)];
  const badScroll = scrollHandlers.filter((m) =>
    /getBoundingClientRect|offsetTop|offsetHeight|clientHeight|scrollTop/.test(m[1])
  );
  if (badScroll.length) {
    record("动效", tag("scroll-layout"), STATES.FAIL, "scroll 监听里同步读布局 " + badScroll.length + " 处：强制同步布局，会掉帧");
  } else if (scrollHandlers.length) {
    record("动效", tag("scroll-layout"), STATES.PASS, "scroll 监听 " + scrollHandlers.length + " 处均未同步读布局");
  } else {
    record("动效", tag("scroll-layout"), STATES.PASS, "无 scroll 监听");
  }

  // 2.5 reduced-motion
  if (/prefers-reduced-motion/.test(src)) {
    record("动效", tag("reduced-motion"), STATES.PASS, "已处理 prefers-reduced-motion");
  } else {
    record("动效", tag("reduced-motion"), STATES.FAIL, "没有 prefers-reduced-motion 分支");
  }

  // 2.6 滚动劫持
  if (/scroll-snap-type|preventDefault\(\s*\)[^}]*wheel|Lenis|locomotive-scroll/.test(src)) {
    record("动效", tag("scroll-hijack"), STATES.FAIL, "出现 scroll-snap / 滚动劫持 / 平滑滚动库");
  } else {
    record("动效", tag("scroll-hijack"), STATES.PASS, "无滚动劫持");
  }

  // 2.7 dealt moment 数量
  const moments = (src.match(/class="[^"]*\bmoment\b/g) || []).length;
  if (moments === 1) {
    record("动效", tag("moment"), STATES.PASS, "dealt moment 恰好 1 个");
  } else if (moments === 0) {
    record("动效", tag("moment"), STATES.OPEN, "未找到 dealt moment：确认是否真的没有设计滚动记忆点");
  } else {
    record("动效", tag("moment"), STATES.FAIL, "dealt moment " + moments + " 个，只能 1 个");
  }

  /* ---------- 3. 排版 ---------- */

  // 3.1 正文字号
  const fsBody = src.match(/--fs-body\s*:\s*(\d+)px/);
  if (fsBody) {
    const v = Number(fsBody[1]);
    record("排版", tag("body-size"), v >= 16 ? STATES.PASS : STATES.FAIL, "正文字号 " + v + "px（下限 16）");
  } else {
    record("排版", tag("body-size"), STATES.OPEN, "未显式声明 --fs-body，需人工确认正文实际字号");
  }

  // 3.2 正文行高
  const lhBody = src.match(/--lh-body\s*:\s*([\d.]+)/);
  if (lhBody) {
    const v = Number(lhBody[1]);
    record("排版", tag("body-lh"), v >= 1.7 ? STATES.PASS : STATES.FAIL, "正文行高 " + v + "（下限 1.7）");
  } else {
    record("排版", tag("body-lh"), STATES.OPEN, "未显式声明 --lh-body，需人工确认");
  }

  // 3.3 行宽
  const measure = src.match(/--measure\s*:\s*(\d+)em/);
  if (measure) {
    const v = Number(measure[1]);
    record("排版", tag("measure"), v >= 28 && v <= 40 ? STATES.PASS : STATES.FAIL, "行宽 " + v + "em（要求 28–40）");
  } else {
    record("排版", tag("measure"), STATES.OPEN, "未用 em 定义行宽：确认是否用了 ch（中文不准）");
  }

  // 3.4 中文斜体
  if (/font-style\s*:\s*italic/.test(src)) {
    record("排版", tag("italic"), STATES.FAIL, "出现 font-style: italic：中文是合成倾斜，必须去掉");
  } else {
    record("排版", tag("italic"), STATES.PASS, "无 font-style: italic");
  }

  // 3.5 中文字距
  const trOnCJK = /(?:h1|h2|h3|\.title|\.heading)[^{]*\{[^}]*letter-spacing\s*:\s*0?\.\d+em\s*;?[^}]*\}/.test(src);
  if (trOnCJK) {
    record("排版", tag("tracking-cjk"), STATES.OPEN, "给中文标题设了正字距：确认是否为全大写英文标签（仅它可加 0.14em）");
  } else {
    record("排版", tag("tracking-cjk"), STATES.PASS, "标题未加正字距");
  }

  // 3.6 避头尾
  if (/line-break\s*:\s*strict/.test(src)) {
    record("排版", tag("kin-soku"), STATES.PASS, "已设 line-break: strict");
  } else {
    record("排版", tag("kin-soku"), STATES.FAIL, "未设 line-break: strict：行首会出现 ，。、");
  }

  // 3.7 字体栈
  if (/Microsoft YaHei/.test(src)) {
    record("排版", tag("font-stack"), STATES.PASS, "字体栈含 Microsoft YaHei");
  } else {
    record("排版", tag("font-stack"), STATES.FAIL, "字体栈缺 Microsoft YaHei：Windows 会掉到宋体");
  }

  // 3.8 tabular-nums
  if (/<table\b/.test(src)) {
    record(
      "排版",
      tag("tabular-nums"),
      /tabular-nums/.test(src) ? STATES.PASS : STATES.FAIL,
      /tabular-nums/.test(src) ? "表格已设 tabular-nums" : "有表格但未设 tabular-nums：列对不齐"
    );
  } else {
    record("排版", tag("tabular-nums"), STATES.OFF, "无表格，跳过");
  }

  /* ---------- 4. 文案 ---------- */

  const BAN = ["强大", "极致", "领先", "贴心", "高效", "智能", "全新", "一站式", "全方位", "无缝", "沉浸式", "海量", "千万级", "高达", "低至", "仅需", "匠心", "致力于", "深耕", "赋能", "闭环", "抓手", "矩阵", "链路", "中台", "值得一提的是", "不得不说"];
  const hitBan = BAN.filter((w) => src.includes(w));
  if (hitBan.length) {
    record("文案", tag("ban-words"), STATES.FAIL, "命中禁用词 " + hitBan.length + " 个：" + hitBan.join("、"));
  } else {
    record("文案", tag("ban-words"), STATES.PASS, "未命中禁用词表");
  }

  // 半角标点（粗查：中文语境里的半角逗号句号）
  const halfPunct = (src.match(/[\u4e00-\u9fa5][,.](?=\s|[\u4e00-\u9fa5])/g) || []).length;
  if (halfPunct) {
    record("文案", tag("fullwidth-punct"), STATES.OPEN, "疑似中文里用了半角标点 " + halfPunct + " 处：需人眼确认（代码块内不算）");
  } else {
    record("文案", tag("fullwidth-punct"), STATES.PASS, "未发现中文夹半角标点");
  }

  /* ---------- 5. 基础 ---------- */

  if (/<meta[^>]+name=["']viewport["']/i.test(src)) {
    record("基础", tag("viewport"), STATES.PASS, "有 viewport meta");
  } else {
    record("基础", tag("viewport"), STATES.FAIL, "缺 viewport meta：手机端会按 980px 渲染");
  }

  if (/(src|href)=["']http/.test(src)) {
    record("基础", tag("external"), STATES.OPEN, "存在外链资源：模板要求自包含，需确认是否必须");
  } else {
    record("基础", tag("external"), STATES.PASS, "无外链资源");
  }

  if (/<html[^>]+lang=["']zh/i.test(src)) {
    record("基础", tag("lang"), STATES.PASS, "html lang 为中文");
  } else if (/<html[^>]+lang=/.test(src)) {
    record("基础", tag("lang"), STATES.OPEN, "html lang 非 zh：若页面主体是中文应改为 zh-CN");
  } else {
    record("基础", tag("lang"), STATES.FAIL, "html 缺 lang 属性");
  }
}

/* ---------------- 豁免 ---------------- */

if (waivers.length) {
  for (const w of waivers) {
    const hit = results.find((r) => r.id.endsWith(":" + w.id) || r.id === w.id);
    if (hit && hit.state === STATES.FAIL) {
      hit.state = STATES.OFF;
      hit.detail = "[已豁免] " + (w.reason || "") + (w.expires ? "（到期 " + w.expires + "）" : "");
    }
  }
}

/* ---------------- 汇总 ---------------- */

const counts = { PASS: 0, FAIL: 0, OPEN: 0, SETUP: 0, ERROR: 0, OFF: 0 };
for (const r of results) counts[r.state] = (counts[r.state] || 0) + 1;

if (jsonOut) {
  const out = { generated: new Date().toISOString(), files, counts, results };
  console.log(JSON.stringify(out, null, 2));
  writeFileSync(resolve("taste-check-report.json"), JSON.stringify(out, null, 2));
} else {
  let group = "";
  for (const r of results) {
    if (r.group !== group) {
      group = r.group;
      console.log("\n── " + group + " " + "─".repeat(Math.max(0, 46 - group.length * 2)));
    }
    console.log("  " + r.state.padEnd(6) + r.id + (r.detail ? "  " + r.detail : ""));
  }
  console.log("\n" + "═".repeat(52));
  console.log(
    "PASS " + counts.PASS + "   FAIL " + counts.FAIL + "   OPEN " + counts.OPEN +
    "   SETUP " + counts.SETUP + "   ERROR " + counts.ERROR + "   OFF " + counts.OFF
  );
  if (counts.FAIL === 0) {
    console.log("结论：无 FAIL。OPEN 与 SETUP 项仍需人眼过一遍（见 references/50-audit.md）。");
  } else {
    console.log("结论：有 " + counts.FAIL + " 条 FAIL。先改设计，不要改这份检查。");
  }
  writeFileSync(resolve("taste-check-report.json"), JSON.stringify({ files, counts, results }, null, 2));
}

process.exit(counts.ERROR > 0 ? 2 : counts.FAIL > 0 ? 1 : 0);
