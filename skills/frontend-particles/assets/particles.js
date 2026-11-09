/* frontend-particles · particles.js
 * 零依赖 Canvas 2D 粒子层：对象池 / 网格加速连线 / 四档降级 / 三种指针力。
 * 数值全部来自 assets/tokens.json，两边必须一致。
 *
 * 用法：
 *   const p = ParticleField.create({ canvas: document.querySelector('#pf'), preset: 'dust' });
 *   p.start();
 */
(function (global) {
  'use strict';

  // ---- 与 tokens.json 对齐的默认值 -----------------------------------
  var LIMITS = {
    bodyAlphaMax: 0.18,
    dprCap: 2,
    jsPerFrameMs: 6,
    connectDistancePx: 120,
    maxLinks: 1200,
    linkAlphaMax: 0.16,
    sizeMin: 0.6,
    sizeMax: 4,
    dtClampSec: 0.05,
    poolSlack: 1.2
  };

  var PRESETS = {
    starfield: { count: 220, sizeMin: 0.8, sizeMax: 2.2, speed: 14, life: 0, trail: 0, layers: 3,
                 field: 'none', link: false, pointer: 'parallax' },
    dust:      { count: 140, sizeMin: 1.0, sizeMax: 2.6, speed: 12, life: 9000, trail: 0.05, layers: 2,
                 field: 'curl', noiseFreq: 0.0022, noiseStrength: 26, noiseTime: 0.06,
                 fieldMax: 26, link: false, pointer: 'repel' },
    dataflow:  { count: 260, sizeMin: 1.2, sizeMax: 2.0, speed: 160, life: 1400, trail: 0.22, layers: 2,
                 field: 'wind', wind: -40, link: false, pointer: 'none' },
    weather:   { count: 320, sizeMin: 1.4, sizeMax: 3.0, speed: 88, life: 4200, trail: 0.10, layers: 2,
                 field: 'gravity', gravity: 380, wind: 40, windPeriodMs: 7000,
                 link: false, pointer: 'none' }
  };

  var DEGRADE = {
    0: { dpr: 2,   countFactor: 1.0, link: true,  trail: true  },
    1: { dpr: 1.5, countFactor: 0.7, link: true,  trail: true  },
    2: { dpr: 1.5, countFactor: 0.5, link: false, trail: false },
    3: { dpr: 1.5, countFactor: 0.5, link: false, trail: false, static: true }
  };

  // ---- 粒子池 --------------------------------------------------------
  function Pool(max) {
    this.max = max;
    this.items = new Array(max);
    this.free = new Int32Array(max);
    this.freeCount = max;
    for (var i = 0; i < max; i++) {
      this.items[i] = { slot: i, uid: 0, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 0,
                        size: 1, alpha: 0, alive: false, seed: Math.random() };
      this.free[i] = max - 1 - i;
    }
  }
  Pool.prototype.spawn = function () {
    if (this.freeCount === 0) return null;
    var p = this.items[this.free[--this.freeCount]];
    p.alive = true;
    p.age = 0;
    p.vx = 0;
    p.vy = 0;
    p.alpha = 0;
    return p;
  };
  Pool.prototype.recycle = function (p) {
    p.alive = false;
    this.free[this.freeCount++] = p.slot;   // 必须回填槽位号，不能回填被覆盖的字段
  };

  // ---- 简易 simplex（2D，无外部依赖） --------------------------------
  var PERM = new Uint8Array(512);
  (function seedPerm() {
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    var s = 1337;
    for (var j = 255; j > 0; j--) {
      s = (s * 16807) % 2147483647;
      var k = s % (j + 1);
      var t = p[j]; p[j] = p[k]; p[k] = t;
    }
    for (var m = 0; m < 512; m++) PERM[m] = p[m & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(h, x, y) {
    switch (h & 7) {
      case 0: return  x + y;
      case 1: return  x - y;
      case 2: return -x + y;
      case 3: return -x - y;
      case 4: return  x;
      case 5: return -x;
      case 6: return  y;
      default: return -y;
    }
  }
  function noise2(x, y) {
    var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = fade(xf), v = fade(yf);
    var aa = PERM[PERM[xi] + yi], ab = PERM[PERM[xi] + yi + 1];
    var ba = PERM[PERM[xi + 1] + yi], bb = PERM[PERM[xi + 1] + yi + 1];
    var x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    var x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.7;   // 归一到约 [-1,1]
  }

  // ---- 主类 ----------------------------------------------------------
  function Field(opts) {
    this.canvas = opts.canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.presetName = opts.preset || 'dust';
    this.cfg = Object.assign({}, PRESETS[this.presetName] || PRESETS.dust, opts.override || {});
    this.tier = 0;
    this.w = 0; this.h = 0; this.dpr = 1;
    this.raf = 0;
    this.running = false;
    this.last = 0;
    this.time = 0;
    this.frames = 0;
    this.samples = [];
    this.links = [];
    this.pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false };
    this.pending = null;
    this.grid = new Map();
    this.reduced = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    this.pool = new Pool(Math.round(this.cfg.count * LIMITS.poolSlack));
    this.list = [];
    this.uid = 0;
    this._onMove = this._onMove.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onVis = this._onVis.bind(this);
  }

  Field.prototype.resize = function () {
    var r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width));
    this.h = Math.max(1, Math.round(r.height));
    this.dpr = Math.min(global.devicePixelRatio || 1, DEGRADE[this.tier].dpr, LIMITS.dprCap);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.w, this.h);
  };

  Field.prototype._emit = function () {
    var p = this.pool.spawn();
    if (!p) return;
    var cfg = this.cfg;
    var layer = cfg.layers > 1 ? Math.floor(Math.random() * cfg.layers) : 0;
    var depth = cfg.layers > 1 ? (layer + 1) / cfg.layers : 1;
    p.x = Math.random() * this.w;
    p.y = Math.random() * this.h;
    p.size = (cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin)) * (0.7 + 0.5 * depth);
    p.size = Math.min(Math.max(p.size, LIMITS.sizeMin), LIMITS.sizeMax);
    p.life = cfg.life || 0;
    p.seed = Math.random() * 1000;
    p.alpha = 0;
    var s = cfg.speed * (0.5 + 0.8 * depth);
    if (cfg.field === 'gravity') {
      p.vx = (Math.random() - 0.5) * 12;
      p.vy = s;
    } else if (cfg.field === 'wind') {
      p.vx = cfg.wind > 0 ? s : -s;
      p.vy = (Math.random() - 0.5) * 24;
    } else if (cfg.field === 'curl') {
      p.vx = (Math.random() - 0.5) * s;
      p.vy = (Math.random() - 0.5) * s;
    } else {
      p.vx = (Math.random() - 0.5) * s * 0.4;
      p.vy = (Math.random() - 0.5) * s * 0.4 - s * 0.25;
    }
    p.uid = ++this.uid;
    this.list.push(p);
  };

  Field.prototype._seedAll = function () {
    var target = Math.round(this.cfg.count * DEGRADE[this.tier].countFactor);
    for (var i = 0; i < target; i++) this._emit();
  };

  Field.prototype._onMove = function (e) {
    this.pending = { x: e.clientX, y: e.clientY };
  };

  Field.prototype._onDown = function (e) {
    var now = performance.now();
    if (this._lastBurst && now - this._lastBurst < 200) return;
    this._lastBurst = now;
    var n = 18;
    for (var i = 0; i < n; i++) {
      var p = this.pool.spawn();
      if (!p) break;
      var a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      var s = 140 + Math.random() * 180;
      p.x = e.clientX; p.y = e.clientY;
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s;
      p.life = 600 + Math.random() * 300;
      p.size = 1.4 + Math.random() * 1.6;
      p.alpha = 1;
      p.seed = Math.random() * 1000;
      p.uid = ++this.uid;
      this.list.push(p);
    }
  };

  Field.prototype._onVis = function () {
    if (document.hidden) {
      this._stopRaf();
    } else if (this.running && !this.reduced) {
      this.last = performance.now();
      this._startRaf();
    }
  };

  Field.prototype._consumePointer = function (dt) {
    var p = this.pointer;
    if (!this.pending) {
      p.vx *= 0.86; p.vy *= 0.86;
      return;
    }
    var nx = this.pending.x, ny = this.pending.y;
    this.pending = null;
    p.vx = (nx - p.x) / Math.max(dt, 0.001);
    p.vy = (ny - p.y) / Math.max(dt, 0.001);
    p.x = nx; p.y = ny; p.active = true;
  };

  Field.prototype._update = function (dt) {
    var cfg = this.cfg, list = this.list, n = list.length, i;
    var t = this.time;
    var windOsc = cfg.windPeriodMs
      ? Math.sin(t * 2 * Math.PI / (cfg.windPeriodMs / 1000)) * cfg.wind : 0;

    for (i = 0; i < n; ) {
      var p = list[i];
      p.age += dt * 1000;

      if (p.life > 0 && p.age >= p.life) {
        this.pool.recycle(p);
        list[i] = list[--n];
        list.length = n;
        continue;
      }

      // 力场
      if (cfg.field === 'gravity') {
        p.vx += windOsc * dt;
        p.vy += (cfg.gravity || 380) * dt;
      } else if (cfg.field === 'wind') {
        p.vy += (cfg.wind || 0) * dt * 0.2;
      } else if (cfg.field === 'curl') {
        var f = (cfg.noiseFreq || 0.0022);
        var e = 0.6;
        var nx = noise2(p.x * f, (p.y + e) * f + t * (cfg.noiseTime || 0.06));
        var nx2 = noise2(p.x * f, (p.y - e) * f + t * (cfg.noiseTime || 0.06));
        var ny = noise2((p.x + e) * f, p.y * f + t * (cfg.noiseTime || 0.06));
        var ny2 = noise2((p.x - e) * f, p.y * f + t * (cfg.noiseTime || 0.06));
        p.vx += ((nx - nx2) / (2 * e)) * (cfg.noiseStrength || 26) * dt;
        p.vy += -((ny - ny2) / (2 * e)) * (cfg.noiseStrength || 26) * dt;
      }

      // 指针力
      if (cfg.pointer === 'repel' && this.pointer.active) {
        var dx = p.x - this.pointer.x, dy = p.y - this.pointer.y;
        var d2 = dx * dx + dy * dy, R = 140;
        if (d2 < R * R) {
          var d = Math.sqrt(d2) + 40;
          var boost = 1 + Math.min(Math.hypot(this.pointer.vx, this.pointer.vy) / 1200, 1.5);
          var acc = (220 / d) * dt * boost;
          p.vx += (dx / d) * acc;
          p.vy += (dy / d) * acc;
        }
      } else if (cfg.pointer === 'attract' && this.pointer.active) {
        var adx = this.pointer.x - p.x, ady = this.pointer.y - p.y;
        var ad2 = adx * adx + ady * ady, aR = 200;
        if (ad2 < aR * aR) {
          var ad = Math.sqrt(ad2) + 40;
          var aacc = (120 / ad) * dt;
          p.vx += (adx / ad) * aacc;
          p.vy += (ady / ad) * aacc;
        }
      }

      // 阻尼
      var drag = p.life > 0 && p.life < 1000 ? 2.4 : 0.12;
      var damp = 1 - drag * dt;
      if (damp < 0) damp = 0;
      p.vx *= damp; p.vy *= damp;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 边界：环绕
      if (p.x < -20) p.x = this.w + 20;
      else if (p.x > this.w + 20) p.x = -20;
      if (p.y < -20) p.y = this.h + 20;
      else if (p.y > this.h + 20) p.y = -20;

      // 寿命曲线
      if (p.life > 0) {
        var tt = p.age / p.life;
        p.alpha = Math.min(tt / 0.15, 1) * Math.min((1 - tt) / 0.35, 1);
        p.size = p.size * (1 - 0.6 * dt * 0.4);
      } else {
        p.alpha = 0.35 + 0.35 * Math.sin(p.seed + t * 0.0012);
      }

      i++;
    }

    // 维持数量
    var targetCount = Math.round(cfg.count * DEGRADE[this.tier].countFactor);
    while (this.list.length < targetCount) this._emit();
  };

  // 网格键必须是单射：XOR 在 gx/gy 为负时会把不同格子映到同一个键。
  // 线性组合 + 偏移在 |g| < 4096 时无碰撞，够覆盖 4000×4000 / cell。
  function cellKey(gx, gy) { return (gx + 4096) * 8192 + (gy + 4096); }

  Field.prototype._buildGrid = function (cell) {
    var map = this.grid;
    map.clear();
    var list = this.list;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var k = cellKey(Math.floor(p.x / cell), Math.floor(p.y / cell));
      var arr = map.get(k);
      if (!arr) { arr = []; map.set(k, arr); }
      arr.push(p);
    }
    return map;
  };

  Field.prototype._drawLinks = function () {
    var cell = LIMITS.connectDistancePx;
    var map = this._buildGrid(cell);
    var maxD = cell, maxD2 = maxD * maxD;
    var ctx = this.ctx;
    var list = this.list, maxLinks = LIMITS.maxLinks, made = 0;
    ctx.strokeStyle = 'rgba(143,180,217,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < list.length && made < maxLinks; i++) {
      var p = list[i];
      var gx = Math.floor(p.x / cell), gy = Math.floor(p.y / cell);
      for (var ox = -1; ox <= 1 && made < maxLinks; ox++) {
        for (var oy = -1; oy <= 1 && made < maxLinks; oy++) {
          var arr = map.get(cellKey(gx + ox, gy + oy));
          if (!arr) continue;
          for (var j = 0; j < arr.length && made < maxLinks; j++) {
            var q = arr[j];
            if (q.uid <= p.uid) continue;   // 单调 uid 去重，避免同一对连线画两次
            var dx = q.x - p.x, dy = q.y - p.y;
            if (dx * dx + dy * dy < maxD2) {
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              made++;
            }
          }
        }
      }
    }
    ctx.stroke();
  };

  Field.prototype._draw = function () {
    var ctx = this.ctx, cfg = this.cfg;
    var useTrail = DEGRADE[this.tier].trail;
    if (useTrail) {
      ctx.fillStyle = 'rgba(11,14,20,' + (cfg.trail || 0.18) + ')';
      ctx.fillRect(0, 0, this.w, this.h);
    } else {
      ctx.clearRect(0, 0, this.w, this.h);
    }

    if (DEGRADE[this.tier].link) this._drawLinks();

    var list = this.list;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = '#cfe3ff';
      var s = p.size;
      ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, s, s);
    }
    ctx.globalAlpha = 1;
  };

  Field.prototype._frame = function (now) {
    var dt = Math.min((now - this.last) / 1000, LIMITS.dtClampSec);
    this.last = now;
    this.time += dt * 1000;

    var t0 = performance.now();
    this._consumePointer(dt);
    this._update(dt);
    this._draw();
    var jsMs = performance.now() - t0;

    this.samples.push(jsMs);
    this.frames++;
    if (this.frames % 30 === 0) this._checkBudget();
    this.raf = requestAnimationFrame(this._frameBound);
  };

  Field.prototype._checkBudget = function () {
    if (!this.samples.length) return;
    var sorted = this.samples.slice().sort(function (a, b) { return a - b; });
    var p95 = sorted[Math.floor(sorted.length * 0.95)];
    this.samples.length = 0;
    if (p95 > LIMITS.jsPerFrameMs * 1.2 && this.tier < 2) {
      this.applyTier(this.tier + 1);
    }
  };

  Field.prototype.applyTier = function (tier) {
    if (tier <= this.tier && tier !== 0) return;
    this.tier = Math.min(tier, 3);
    var d = DEGRADE[this.tier];
    if (d.static) {
      this.resize();
      this._update(0.016);
      this._draw();
      this._stopRaf();
      this.running = false;
      return;
    }
    this.resize();
    var keep = Math.round(this.cfg.count * d.countFactor);
    while (this.list.length > keep) {
      var p = this.list.pop();
      this.pool.recycle(p);
    }
  };

  Field.prototype._startRaf = function () {
    if (this.raf) return;
    this._frameBound = this._frame.bind(this);
    this.raf = requestAnimationFrame(this._frameBound);
  };

  Field.prototype._stopRaf = function () {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  };

  Field.prototype.start = function () {
    this.resize();
    this._seedAll();
    this.running = true;

    global.addEventListener('resize', this._resizeBound || (this._resizeBound = this.resize.bind(this)));
    global.addEventListener('pointermove', this._onMove, { passive: true });
    global.addEventListener('pointerdown', this._onDown, { passive: true });
    document.addEventListener('visibilitychange', this._onVis);

    if (this.reduced) {
      this._update(0.016);
      this._draw();
      return this;
    }
    this.last = performance.now();
    this._startRaf();
    return this;
  };

  Field.prototype.stop = function () {
    this.running = false;
    this._stopRaf();
    global.removeEventListener('pointermove', this._onMove);
    global.removeEventListener('pointerdown', this._onDown);
    document.removeEventListener('visibilitychange', this._onVis);
  };

  // ---- 对外接口 ------------------------------------------------------
  var API = {
    PRESETS: PRESETS,
    LIMITS: LIMITS,
    DEGRADE: DEGRADE,
    create: function (opts) { return new Field(opts || {}); },
    /** 按视口面积给出该路线的粒子上限 */
    countFor: function (route, w, h) {
      var area = w * h;
      if (route === 'css') return Math.max(24, Math.min(80, Math.floor(area / 26000)));
      if (route === 'webgl') return Math.max(500, Math.min(20000, Math.floor(area / 220)));
      return Math.max(60, Math.min(2000, Math.floor(area / 3000)));
    }
  };

  global.ParticleField = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
