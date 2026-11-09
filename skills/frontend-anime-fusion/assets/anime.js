/* frontend-anime-fusion · anime.js
 * 零依赖 IIFE。暴露全局 window.AnimeFusion：init / forbidCheck / version。
 * 只写 transform 与 opacity；不读布局属性进动画循环。
 */
(function (global) {
  "use strict";

  var DEFAULTS = {
    parallax: 0.45,        /* 恒 < 1.0；B 模型 0.85 */
    gazeMax: 14,           /* px；角色宽 1200 时约 1.2% */
    gazeRotate: 1.2,       /* deg */
    gazeEnterMs: 320,
    gazeExitMs: 240,
    expressionMs: 180,
    headroom: 10,          /* % of char height；init 时会用 --af-headroom 覆盖 */
    headRatioW: 0.62,
    headRatioH: 0.26
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function prefersReduced() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /* ---------- 视差：单次 rAF，读写分离 ---------- */
  function initParallax(stage, opts) {
    var char = stage.querySelector(".af-char");
    if (!char || prefersReduced()) return function () {};
    var ratio = clamp(opts.parallax, 0, 0.9);
    var y = 0;
    var ticking = false;

    function apply() {
      char.style.transform = "translate3d(-50%," + (y * (1 - ratio)).toFixed(2) + "px,0)";
      ticking = false;
    }

    function onScroll() {
      y = global.scrollY || 0;
      if (!ticking) { ticking = true; global.requestAnimationFrame(apply); }
    }

    global.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return function () { global.removeEventListener("scroll", onScroll); };
  }

  /* ---------- hover 视线跟随：伪 3D，位移 <= 14px ---------- */
  function initGaze(stage, opts) {
    var img = stage.querySelector(".af-char__img") || stage.querySelector(".af-char");
    if (!img || prefersReduced()) return function () {};
    var reduced = global.matchMedia && global.matchMedia("(pointer: coarse)").matches;
    if (reduced) return function () {};   /* 触摸设备不做，白烧一次绘制 */

    var rect = null;
    function measure() { rect = img.getBoundingClientRect(); }
    measure();
    global.addEventListener("resize", measure, { passive: true });

    function onMove(e) {
      if (!rect) return;
      var dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      var dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      dx = clamp(dx, -1, 1);
      dy = clamp(dy, -1, 1);
      img.style.transition = "transform " + opts.gazeEnterMs + "ms cubic-bezier(.22,.61,.36,1)";
      img.style.transform =
        "translate3d(" + (dx * -opts.gazeMax).toFixed(2) + "px," +
        (dy * -opts.gazeMax * 0.5).toFixed(2) + "px,0) rotate(" +
        (dx * -opts.gazeRotate).toFixed(2) + "deg)";
    }

    function onLeave() {
      img.style.transition = "transform " + opts.gazeExitMs + "ms cubic-bezier(.4,0,1,1)";
      img.style.transform = "translate3d(0,0,0) rotate(0deg)";
    }

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return function () {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      global.removeEventListener("resize", measure);
    };
  }

  /* ---------- 表情切换：只换图，不位移 ---------- */
  function initExpressions(stage, opts) {
    var img = stage.querySelector(".af-char__img");
    var list = opts.expressions || [];
    if (!img || list.length < 2) return function () {};

    /* 预载：首屏只加载第一张 */
    function preload() {
      for (var i = 1; i < list.length; i++) { var im = new global.Image(); im.src = list[i]; }
    }
    if (global.requestIdleCallback) global.requestIdleCallback(preload);
    else global.setTimeout(preload, 1200);

    var idx = 0;
    function swap() {
      idx = (idx + 1) % list.length;
      img.style.transition = "opacity " + opts.expressionMs + "ms ease";
      img.style.opacity = "0.35";
      global.setTimeout(function () {
        img.src = list[idx];
        img.style.opacity = "1";
      }, opts.expressionMs / 2);
    }

    /* 触发区：头部矩形（禁区），避免与面板点击冲突 */
    var zone = stage.querySelector("[data-af-face]") || img;
    zone.addEventListener("click", swap);
    zone.style.cursor = "pointer";
    return function () { zone.removeEventListener("click", swap); };
  }

  /* ---------- 禁区检测：返回与头部矩形相交的面板 ---------- */
  function forbidCheck(stage, opts) {
    /* 允许直接传选择器；opts 可省，缺省值回到 CSS 变量与 DEFAULTS */
    if (typeof stage === "string") stage = document.querySelector(stage);
    if (!stage) return [];
    opts = opts || {};
    var charEl = stage.querySelector(".af-char");
    if (!charEl) return [];
    var c = charEl.getBoundingClientRect();
    var cssRoom = parseFloat(global.getComputedStyle(stage).getPropertyValue("--af-headroom"));
    var roomPct = opts.headroom != null ? opts.headroom
      : (isFinite(cssRoom) && cssRoom > 0 ? cssRoom : DEFAULTS.headroom);
    var rw = opts.headRatioW != null ? opts.headRatioW : DEFAULTS.headRatioW;
    var rh = opts.headRatioH != null ? opts.headRatioH : DEFAULTS.headRatioH;
    var headroom = roomPct / 100;
    var head = {
      left: c.left + c.width * (0.5 - rw / 2),
      top: c.top + c.height * headroom,
      right: c.left + c.width * (0.5 + rw / 2),
      bottom: c.top + c.height * (headroom + rh)
    };

    var out = [];
    var panels = stage.querySelectorAll(".af-panel");
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i].getBoundingClientRect();
      var w = Math.min(head.right, p.right) - Math.max(head.left, p.left);
      var h = Math.min(head.bottom, p.bottom) - Math.max(head.top, p.top);
      if (w > 0 && h > 0) {
        out.push({
          el: panels[i],
          area: Math.round(w * h),
          ratio: +((w * h) / (head.right - head.left) / (head.bottom - head.top)).toFixed(3)
        });
      }
    }
    if (out.length) {
      console.warn("[af] 面板侵入头部禁区：", out.map(function (o) { return o.ratio; }).join(", "));
    }
    return out;
  }

  /* ---------- 入口 ---------- */
  function init(root, options) {
    var stage = typeof root === "string" ? document.querySelector(root) : (root || document.body);
    if (!stage) return null;
    var opts = {};
    var k;
    for (k in DEFAULTS) if (Object.prototype.hasOwnProperty.call(DEFAULTS, k)) opts[k] = DEFAULTS[k];
    for (k in options || {}) if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k];

    var headroom = parseFloat(getComputedStyle(stage).getPropertyValue("--af-headroom")) || 10;
    opts.headroom = headroom;

    var offs = [
      initParallax(stage, opts),
      initGaze(stage, opts),
      initExpressions(stage, opts)
    ];

    /* 入场后一次，窗口尺寸稳定后再查一次 */
    global.setTimeout(function () { forbidCheck(stage, opts); }, 900);
    global.addEventListener("resize", function () { forbidCheck(stage, opts); }, { passive: true });

    return {
      destroy: function () { offs.forEach(function (f) { if (f) f(); }); },
      check: function () { return forbidCheck(stage, opts); }
    };
  }

  global.AnimeFusion = { init: init, forbidCheck: forbidCheck, version: "1.0.0" };
})(typeof window !== "undefined" ? window : this);

