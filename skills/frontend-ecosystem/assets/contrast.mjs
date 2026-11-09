#!/usr/bin/env node
// frontend-ecosystem · 对比度与覆盖度计算
// 用法：
//   node contrast.mjs --fg f1f5ff --bg 101a30 --over ffffff --alpha 0.68
//   node contrast.mjs --coverage --floor 0.59 --alpha 0.04
//   node contrast.mjs --selftest
// 只做数学，不读任何文件、不发任何请求。

const USAGE = `用法：
  node contrast.mjs --fg <hex> --bg <hex> [--over <hex>] [--alpha <0-1>]
  node contrast.mjs --coverage --floor <0-1> --alpha <0-1>
  node contrast.mjs --selftest

  --fg      文字色（可省略 #）
  --bg      最终底色；给出 --alpha 时它是"被叠的那层"
  --over    叠加上去的颜色；不给则取 --fg 的同族亮色不合适，请显式给
  --alpha   叠加不透明度（0-1）

判据：正文 >= 4.5:1；大字（>=24px 或 >=19px 粗体）>= 3:1；非文本（边框、图形）>= 3:1
`;

function parseHex(s) {
  const v = String(s).replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(v)) throw new Error(`颜色格式应为 6 位十六进制：${s}`);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function toHex(rgb) {
  return "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}

function blend(top, bottom, alpha) {
  return top.map((c, i) => c * alpha + bottom[i] * (1 - alpha));
}

function channelLum(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  return 0.2126 * channelLum(rgb[0]) + 0.7152 * channelLum(rgb[1]) + 0.0722 * channelLum(rgb[2]);
}

export function contrastRatio(fgHex, bgHex) {
  const a = luminance(parseHex(fgHex));
  const b = luminance(parseHex(bgHex));
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// 覆盖度模型：C = F + a * (1 - F)
export function coverage(floor, alpha) {
  return floor + alpha * (1 - floor);
}

// 源码映射：glassAlpha(0-100) -> a；暗主题再乘 0.4
export function glassAlphaToA(glassAlpha, dark = false) {
  const a = Math.max(0.1, 0.25 - (glassAlpha / 100) * 0.15);
  return dark ? a * 0.4 : a;
}

// 地板：浅 0.45 / 深 0.59，再乘保真度
export function readabilityFloor(fidelity = 1, dark = false) {
  const base = dark ? 0.59 : 0.45;
  return base * Math.min(1, Math.max(0, fidelity));
}

function selftest() {
  const out = [];
  const push = (s) => out.push(s);

  push("== 源码参数复算（应与源码常量一致） ==");
  push(`a(glassAlpha=100, dark) = ${glassAlphaToA(100, true).toFixed(4)}   期望 0.0400`);
  push(`floor(保真度100%, dark)   = ${readabilityFloor(1, true).toFixed(4)}   期望 0.5900`);
  push(`coverage(0.59, 0.04)      = ${coverage(0.59, 0.04).toFixed(4)}   期望 0.6064`);
  push(`coverage(0.2065, 0.04)    = ${coverage(0.2065, 0.04).toFixed(5)}  期望 0.23824`);

  push("");
  push("== 复算手册算例：找它用的是哪条叠合链 ==");
  push("链 A：白色叠在深底 #101a30 上，文字 #f1f5ff（alpha 越大越亮）");
  for (const alpha of [0.6, 0.68]) {
    const under = blend(parseHex("ffffff"), parseHex("101a30"), alpha);
    push(`  alpha=${alpha}  底色 ${toHex(under)}  对 #f1f5ff = ${contrastRatio("f1f5ff", toHex(under)).toFixed(2)}:1`);
  }
  push("链 B：深色 #101a30 叠在亮底 #f1f5ff 上，文字仍为 #f1f5ff（alpha 越大越暗）");
  for (const alpha of [0.6, 0.62, 0.68]) {
    const under = blend(parseHex("101a30"), parseHex("f1f5ff"), alpha);
    push(`  alpha=${alpha}  底色 ${toHex(under)}  对 #f1f5ff = ${contrastRatio("f1f5ff", toHex(under)).toFixed(2)}:1`);
  }
  push("结论：手册的 4.20 / 5.50 只可能来自链 B（亮文字 + 深色遮罩叠在亮底上）。");
  push("      链 A 方向相反（alpha 越大对比越低），不可能是它。");
  push("      链 B 复算得 4.43 / 5.78，与手册相差 0.2–0.3，属取整或色值微差；量级一致，绝对值不可照抄。");

  push("");
  push("== 判据 ==");
  push("正文 4.5:1；大字 3:1；非文本 3:1；任何数字必须附取样点，否则视为未测。");

  const bad = out.filter((l) => /NaN|Infinity|undefined/.test(l));
  if (bad.length) {
    console.error("自检出现非法数值：" + bad.join(" | "));
    process.exitCode = 1;
    return;
  }
  console.log(out.join("\n"));
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith("--")) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }

  if (args.selftest) return selftest();
  if (args.help || (!args.fg && !args.coverage)) {
    console.log(USAGE);
    return;
  }

  if (args.coverage) {
    const floor = Number(args.floor ?? 0.59);
    const alpha = Number(args.alpha ?? 0.04);
    console.log(JSON.stringify({ floor, alpha, coverage: Number(coverage(floor, alpha).toFixed(4)) }, null, 2));
    return;
  }

  let bgHex = String(args.bg).replace(/^#/, "");
  if (args.alpha !== undefined) {
    if (!args.over) throw new Error("给出 --alpha 时必须同时给 --over（叠加色）");
    const alpha = Number(args.alpha);
    if (!(alpha >= 0 && alpha <= 1)) throw new Error("--alpha 必须在 0–1 之间");
    bgHex = toHex(blend(parseHex(args.over), parseHex(bgHex), alpha)).replace(/^#/, "");
  }

  const ratio = contrastRatio(String(args.fg), bgHex);
  const result = {
    fg: "#" + String(args.fg).replace(/^#/, ""),
    bg: "#" + bgHex,
    ratio: Number(ratio.toFixed(2)),
    threshold: 4.5,
    pass: ratio >= 4.5,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 2;
}

main(process.argv.slice(2));
