/* frontend-industrial-sci-fi · industrial.js
 * 零依赖、零构建，classic script（直接 <script src> 引入即可）。
 * 只做四件事：
 *   1) 状态机 —— 只升不降，降级必须显式 ACK
 *   2) 数字滚动 —— 90ms，变化 < 2% 时直接替换
 *   3) 预设切换 —— 只改 :root 的 data-isx-preset
 *   4) 动效降级 —— 跟随 prefers-reduced-motion
 */
(function (global) {
  "use strict";

  var SEQ = { NOMINAL: 0, CAUTION: 1, INTERRUPT: 2 };
  var ORDER = ["NOMINAL", "CAUTION", "INTERRUPT"];
  var reduced = false;
  try {
    reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { reduced = false; }

  /* ---------------- 1. 状态机：只升不降 ---------------- */
  function StateMachine(initial) {
    this.current = SEQ[initial] != null ? initial : "NOMINAL";
    this.peak = this.current;        // 历史最高，只增不减
    this.listeners = [];
  }

  StateMachine.prototype.on = function (fn) {
    this.listeners.push(fn);
    return this;
  };

  StateMachine.prototype._emit = function (reason) {
    var self = this;
    this.listeners.forEach(function (fn) {
      fn({ current: self.current, peak: self.peak, reason: reason });
    });
  };

  // 只升：传入更低的状态会被忽略，除非显式 acknowledge()
  StateMachine.prototype.raise = function (next) {
    if (SEQ[next] == null) return this;
    if (SEQ[next] <= SEQ[this.peak]) {
      this.current = next;           // 当前值可以回落，但 peak 不动
      this._emit("observe");
      return this;
    }
    this.peak = next;
    this.current = next;
    this._emit("raise");
    return this;
  };

  // 唯一的降级路径：确认。降级到 current，同时把 peak 拉平
  StateMachine.prototype.acknowledge = function (to) {
    var target = to && SEQ[to] != null ? to : "NOMINAL";
    this.peak = target;
    this.current = target;
    this._emit("ack");
    return this;
  };

  StateMachine.prototype.visualState = function () {
    return this.peak;                // 视觉上永远显示最高态
  };

  /* ---------------- 2. 数字滚动 ---------------- */
  function fmt(n, digits) {
    var d = digits == null ? 1 : digits;
    return n.toFixed(d);
  }

  function roll(el, to, opt) {
    opt = opt || {};
    var digits = opt.digits == null ? 1 : opt.digits;
    var ms = opt.ms == null ? 90 : opt.ms;
    var from = parseFloat(el.getAttribute("data-v"));
    if (isNaN(from)) from = to;

    var delta = Math.abs(to - from);
    var threshold = Math.abs(from) * 0.02;

    if (reduced || ms === 0 || delta <= threshold) {
      el.textContent = fmt(to, digits);
      el.setAttribute("data-v", String(to));
      return;
    }

    var t0 = (global.performance && performance.now) ? performance.now() : Date.now();
    function step(t) {
      var now = t || ((global.performance && performance.now) ? performance.now() : Date.now());
      var k = Math.min(1, (now - t0) / ms);
      el.textContent = fmt(from + (to - from) * k, digits);
      if (k < 1) {
        global.requestAnimationFrame(step);
      } else {
        el.textContent = fmt(to, digits);
        el.setAttribute("data-v", String(to));
      }
    }
    global.requestAnimationFrame(step);
  }

  /* ---------------- 3. 预设切换 ---------------- */
  var PRESETS = ["standard", "cold-store", "site", "night-shift"];

  function setPreset(name) {
    if (PRESETS.indexOf(name) < 0) return false;
    document.documentElement.setAttribute("data-isx-preset", name);
    try { localStorage.setItem("isx-preset", name); } catch (e) {}
    return true;
  }

  function restorePreset() {
    var saved = null;
    try { saved = localStorage.getItem("isx-preset"); } catch (e) {}
    if (saved && PRESETS.indexOf(saved) >= 0) {
      document.documentElement.setAttribute("data-isx-preset", saved);
    }
  }

  /* ---------------- 4. 切角尺寸注入 ---------------- */
  // 只用于需要 JS 侧知道切深的场景（如 canvas / SVG 对齐）。
  var CUT = { chip: 4, card: 8, panel: 14 };
  function cutOf(level) { return CUT[level] || CUT.card; }

  /* ---------------- 5. 状态条渲染 ---------------- */
  // data-v 是 0..1 的真实值；长度来自数据，不是装饰。
  function paintGauge(el, value, state) {
    var v = Math.max(0, Math.min(1, value));
    el.style.setProperty("--v", String(v));
    if (state) el.setAttribute("data-state", state);
  }

  /* ---------------- 6. 时间戳 ---------------- */
  function pad(n, w) { var s = String(n); while (s.length < (w || 2)) s = "0" + s; return s; }

  function stamp(d, mode) {
    d = d || new Date();
    var Y = d.getFullYear(), M = pad(d.getMonth() + 1), D = pad(d.getDate());
    var h = pad(d.getHours()), m = pad(d.getMinutes()), s = pad(d.getSeconds());
    if (mode === "iso") {
      var off = -d.getTimezoneOffset();
      var sign = off >= 0 ? "+" : "-";
      var oh = pad(Math.floor(Math.abs(off) / 60)), om = pad(Math.abs(off) % 60);
      return Y + "-" + M + "-" + D + "T" + h + ":" + m + ":" + s + sign + oh + ":" + om;
    }
    if (mode === "time") return h + ":" + m + ":" + s;
    return Y + "-" + M + "-" + D + " " + h + ":" + m + ":" + s;
  }

  /* ---------------- 7. 自动装配 ---------------- */
  function init(root) {
    root = root || document;

    // 7.1 状态条：从 --v 初始值补一次渲染
    Array.prototype.forEach.call(root.querySelectorAll(".isx-gauge"), function (g) {
      var fill = g.querySelector(".isx-gauge-fill");
      if (!fill) return;
      var v = parseFloat(getComputedStyle(g).getPropertyValue("--v"));
      if (!isNaN(v)) fill.style.width = (Math.max(0, Math.min(1, v)) * 100) + "%";
    });

    // 7.2 时间戳占位
    Array.prototype.forEach.call(root.querySelectorAll("[data-isx-stamp]"), function (el) {
      el.textContent = stamp(new Date(), el.getAttribute("data-isx-stamp"));
    });

    // 7.3 预设切换按钮
    Array.prototype.forEach.call(root.querySelectorAll("[data-isx-set-preset]"), function (btn) {
      btn.addEventListener("click", function () {
        setPreset(btn.getAttribute("data-isx-set-preset"));
      });
    });

    // 7.4 降级标记，供 CSS / 业务读取
    if (reduced) document.documentElement.setAttribute("data-isx-reduced-motion", "true");
  }

  global.ISX = {
    version: "1.0.0",
    StateMachine: StateMachine,
    SEQ: SEQ,
    ORDER: ORDER,
    roll: roll,
    paintGauge: paintGauge,
    setPreset: setPreset,
    restorePreset: restorePreset,
    cutOf: cutOf,
    stamp: stamp,
    init: init,
    reducedMotion: function () { return reduced; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { init(document); });
  } else {
    init(document);
  }
})(typeof window !== "undefined" ? window : this);
