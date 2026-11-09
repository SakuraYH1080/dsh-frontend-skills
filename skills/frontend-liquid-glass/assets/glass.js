/* frontend-liquid-glass · glass.js v1.0  （零依赖）
   三件事：
   1) 注入 SVG 折射滤镜 <filter id="lg-refract">（feTurbulence + feDisplacementMap）
   2) 能力探测：把不支持 / 低端设备降级到 .lg-lite
   3) 滚动性能守卫：检测长任务与掉帧，必要时自动降级（可关）

   用法：
     <script src="glass.js"></script>
     LiquidGlass.init();                  // 全部默认开启
     LiquidGlass.init({ refract: true, guard: true });
*/
(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  /** 折射滤镜：一条 1px 的位移边 + 轻微的湍流扰动，
   *  scale 越大"厚度"越明显；超过 18 就开始像水波纹，不再是玻璃。 */
  function injectRefraction(opts) {
    opts = opts || {};
    var scale = opts.scale == null ? 9 : opts.scale;
    var base = opts.baseFrequency == null ? 0.008 : opts.baseFrequency;
    if (document.getElementById("lg-refract-svg")) return;

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("id", "lg-refract-svg");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.style.position = "absolute";
    svg.style.pointerEvents = "none";

    svg.innerHTML =
      '<filter id="lg-refract" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">' +
        '<feTurbulence type="fractalNoise" baseFrequency="' + base + '" numOctaves="1" seed="7" result="noise"/>' +
        '<feGaussianBlur in="noise" stdDeviation="2" result="softNoise"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="softNoise" scale="' + scale + '" ' +
          'xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter>';

    document.body.appendChild(svg);
    document.documentElement.classList.add("lg-has-refract");
  }

  function supportsBackdrop() {
    if (!window.CSS || !CSS.supports) return false;
    return CSS.supports("backdrop-filter", "blur(1px)") ||
           CSS.supports("-webkit-backdrop-filter", "blur(1px)");
  }

  function isLowPower() {
    var nav = navigator;
    var mem = nav.deviceMemory || 8;
    var cores = nav.hardwareConcurrency || 8;
    var saveData = nav.connection && nav.connection.saveData;
    return saveData === true || mem <= 2 || cores <= 4;
  }

  /** 滚动性能守卫：统计 300ms 窗口内低于 45fps 的次数，连续 3 次就降级。
   *  一旦降级不再自动升回（避免来回抖动）。 */
  function startGuard() {
    if (!("requestAnimationFrame" in window)) return;
    var lowStreak = 0, last = performance.now(), frames = 0, acc = 0, degraded = false;

    function tick(now) {
      var dt = now - last; last = now;
      if (dt > 0 && dt < 200) { frames++; acc += dt; }
      if (acc >= 300) {
        var fps = frames / (acc / 1000);
        frames = 0; acc = 0;
        if (fps < 45) {
          lowStreak++;
          if (lowStreak >= 3 && !degraded) {
            degraded = true;
            document.documentElement.classList.add("lg-lite");
            document.dispatchEvent(new CustomEvent("lg:degraded", { detail: { fps: fps } }));
          }
        } else {
          lowStreak = 0;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function init(cfg) {
    cfg = Object.assign({ refract: true, guard: true, scale: 9 }, cfg || {});
    var ok = supportsBackdrop();

    if (!ok || isLowPower()) {
      document.documentElement.classList.add("lg-lite");
    }
    if (cfg.refract && ok && !isLowPower()) {
      try { injectRefraction({ scale: cfg.scale }); } catch (e) { /* 降级即可 */ }
    }
    if (cfg.guard && ok && !isLowPower()) startGuard();
  }

  global.LiquidGlass = { init: init, supportsBackdrop: supportsBackdrop, injectRefraction: injectRefraction };
})(window);
