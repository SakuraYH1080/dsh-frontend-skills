/* frontend-apple-minimal · assets/scroll-narrative.js
   零依赖、classic script（不是 module：file:// 下 module 会被 CORS 拦掉）。
   三件事：揭示（IntersectionObserver）、目录高亮、视差。
   全部可缺席：脚本不加载时页面是完成态，不是隐藏态。 */
(function (global) {
  "use strict";

  var REVEAL_ROOT_MARGIN = "0px 0px -12% 0px"; /* 底部内缩 12%：元素进到视口下沿 12% 才算进入 */
  var REVEAL_THRESHOLD = 0.15;                 /* 可见面积 15%：低于它，长卡片会在露头瞬间就播完 */
  var TOC_ROOT_MARGIN = "-45% 0px -45% 0px";   /* 视口中线所在的标题 = 当前项 */
  var PARALLAX_MIN = 0.15;
  var PARALLAX_MAX = 0.4;                      /* 超过 0.4 位移量和滚动量接近 1:1，读成抖动 */
  var PARALLAX_DEFAULT = 0.25;
  var HEADER_STUCK_AT = 24;                    /* 滚过 24px 才给顶栏加分隔线 */

  function prefersReduced() {
    return global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* ── 揭示 ───────────────────────────────────────────── */
  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    /* 无 IO 或无动画偏好：直接给完成态，不隐藏任何内容 */
    if (!("IntersectionObserver" in global) || prefersReduced()) {
      for (var i = 0; i < items.length; i++) items[i].dataset.inview = "1";
      return;
    }

    /* 只有这一刻起才允许「先藏后显」；在此之前 CSS 里元素是可见的 */
    document.documentElement.classList.add("js-scroll");

    var io = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        var entry = entries[k];
        if (!entry.isIntersecting) continue;
        entry.target.dataset.inview = "1";
        io.unobserve(entry.target);  /* 一次性：来回滚动不重播，重播会被读成闪烁 */
      }
    }, { rootMargin: REVEAL_ROOT_MARGIN, threshold: REVEAL_THRESHOLD });

    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  }

  /* ── 目录高亮 ───────────────────────────────────────── */
  function initToc() {
    var links = document.querySelectorAll("[data-toc-link]");
    if (!links.length || !("IntersectionObserver" in global)) return;

    var byId = {};
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href.charAt(0) !== "#") continue;
      byId[href.slice(1)] = links[i];
    }

    var targets = [];
    for (var id in byId) {
      var el = document.getElementById(id);
      if (el) targets.push(el);
    }
    if (!targets.length) return;

    var toc = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        var e = entries[k];
        if (!e.isIntersecting) continue;
        for (var m = 0; m < links.length; m++) links[m].removeAttribute("aria-current");
        var active = byId[e.target.id];
        if (active) active.setAttribute("aria-current", "true");
      }
    }, { rootMargin: TOC_ROOT_MARGIN, threshold: 0 });

    for (var t = 0; t < targets.length; t++) toc.observe(targets[t]);
  }

  /* ── 视差 ───────────────────────────────────────────── */
  function initParallax() {
    var layers = document.querySelectorAll("[data-parallax]");
    if (!layers.length) return;
    if (prefersReduced()) return;  /* 前庭敏感：直接不动，CSS 也强制 transform: none */

    var ticking = false;

    function frame() {
      ticking = false;
      var vh = global.innerHeight || document.documentElement.clientHeight;
      for (var i = 0; i < layers.length; i++) {
        var el = layers[i];
        var box = el.getBoundingClientRect();
        if (box.bottom < -vh || box.top > vh * 2) continue; /* 屏幕外不算，省掉一半布局读取 */

        var ratio = parseFloat(el.dataset.parallax);
        if (isNaN(ratio)) ratio = PARALLAX_DEFAULT;
        ratio = clamp(ratio, PARALLAX_MIN, PARALLAX_MAX);

        /* 以元素中心到视口中心的距离为基准：元素居中时偏移为 0，进出对称 */
        var fromCenter = box.top + box.height / 2 - vh / 2;
        var offset = -fromCenter * ratio;
        /* 位移只写成一个自定义属性，真正的 transform 在 CSS 里，避免覆盖其他 transform */
        el.style.setProperty("--p-offset", offset.toFixed(2) + "px");
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(frame);
    }

    global.addEventListener("scroll", onScroll, { passive: true });
    global.addEventListener("resize", onScroll, { passive: true });
    frame();
  }

  /* ── 顶栏状态 ───────────────────────────────────────── */
  function initHeader() {
    var header = document.querySelector("[data-header]");
    if (!header) return;

    function onScroll() {
      var y = global.scrollY || document.documentElement.scrollTop;
      header.dataset.stuck = y > HEADER_STUCK_AT ? "1" : "0";
    }
    global.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function init() {
    initReveal();
    initToc();
    initParallax();
    initHeader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  global.ScrollNarrative = { init: init };
})(window);
