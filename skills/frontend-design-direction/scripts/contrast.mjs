#!/usr/bin/env node
// 玻璃可读性检查：合成底色 + 对比度。
// 用法：
//   node scripts/contrast.mjs "#ffffff" 0.55 "#14161a" "#1a1d22"
//   参数：tint alpha background text
// 无参数时输出聊天框场景的对照表。

const lin = (v) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const lum = (hex) => {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => lin(parseInt(c.substr(i, 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const A = lum(a), B = lum(b);
  return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05);
};
const composite = (tint, alpha, bg) => {
  const t = tint.replace('#', ''), b = bg.replace('#', '');
  let out = '#';
  for (let i = 0; i < 3; i++) {
    const tv = parseInt(t.substr(i * 2, 2), 16);
    const bv = parseInt(b.substr(i * 2, 2), 16);
    out += Math.round(tv * alpha + bv * (1 - alpha)).toString(16).padStart(2, '0');
  }
  return out;
};
const verdict = (r) => (r >= 4.5 ? 'PASS 正文' : r >= 3 ? 'ONLY 大字/非文字' : 'FAIL');

const args = process.argv.slice(2);
if (args.length === 4) {
  const [tint, alpha, bg, text] = args;
  const c = composite(tint, parseFloat(alpha), bg);
  const r = ratio(text, c);
  console.log(`glass ${tint} a=${alpha} over ${bg} -> ${c}`);
  console.log(`text ${text} contrast ${r.toFixed(2)} : 1  ${verdict(r)}`);
} else {
  const bgs = { '亮底-消息区 #f7f7f8': '#f7f7f8', '亮底-壁纸 #e8e2d6': '#e8e2d6', '暗底-消息区 #14161a': '#14161a', '暗底-壁纸 #2b3138': '#2b3138' };
  console.log('== 白 tint 气泡，文字 #1a1d22 ==');
  for (const a of [0.45, 0.55, 0.65, 0.75]) {
    for (const [k, bg] of Object.entries(bgs)) {
      const c = composite('#ffffff', a, bg);
      const r = ratio('#1a1d22', c);
      console.log(`a=${a.toFixed(2)} ${k} -> ${c} ${r.toFixed(2)}:1 ${verdict(r)}`);
    }
  }
  console.log('');
  console.log('== 深 tint #0c1017 气泡，文字 #f2f4f8 ==');
  for (const a of [0.45, 0.55, 0.65, 0.78]) {
    for (const [k, bg] of Object.entries(bgs)) {
      const c = composite('#0c1017', a, bg);
      const r = ratio('#f2f4f8', c);
      console.log(`a=${a.toFixed(2)} ${k} -> ${c} ${r.toFixed(2)}:1 ${verdict(r)}`);
    }
  }
}
