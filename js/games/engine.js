/* Goon — mini moteur commun aux jeux d'arcade
   Chaque jeu fournit : init, update, draw, hud, down/up/swipe, summary.
   Le moteur gère : canvas net (écrans Retina), boucle, entrées tactiles/clavier,
   sons synthétiques, particules, textes flottants, intro et fin de partie. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const FONT = '"Lilita One", system-ui, sans-serif';
  const SANS = '"Nunito", system-ui, sans-serif';
  const COL = { ocre: '#0E5A8A', ocreD: '#0A3F63', ocreL: '#3A8FC4', lagon: '#FF7A59', lagonD: '#E0553A', sable: '#EAF4F8', creme: '#F4FAFD', brun: '#0B1D2A', or: '#F2C14E' };
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  function weighted(list) {
    const tot = list.reduce((s, x) => s + x.w, 0); let r = Math.random() * tot;
    for (const x of list) { r -= x.w; if (r <= 0) return x; }
    return list[list.length - 1];
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function mixColor(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp(pa >> 16, pb >> 16, t)), g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bl = Math.round(lerp(pa & 255, pb & 255, t));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  function rrect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function pearl(g, x, y, s, rot, c1, c2) {
    const r = 4.2 * s, gr = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.45, c1 || '#F3EEE6'); gr.addColorStop(1, c2 || '#B9C7D3');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(11,29,42,.25)'; g.lineWidth = Math.max(1, 0.3 * s); g.stroke();
  }
  const H = { TAU, FONT, SANS, COL, rand, randInt, clamp, lerp, pick, weighted, mulberry, mixColor, rrect, pearl };

  function make(def) {
    let cv, ctx, raf = 0, last = 0, opts = {}, k = null, ac = null, ptr = null;

    /* ---------- son ---------- */
    function audio() {
      if (!opts.sound) return null;
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
      return ac;
    }
    function tone(f, d, type, vol, f2, delay) {
      const a = audio(); if (!a) return;
      const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
    }
    function noise(d, vol, freq, type, delay) {
      const a = audio(); if (!a) return;
      const len = Math.max(1, Math.floor(a.sampleRate * d)), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.createBufferSource(); src.buffer = buf;
      const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq || 1200;
      const g = a.createGain(); g.gain.value = vol || 0.2;
      src.connect(f).connect(g).connect(a.destination); src.start(a.currentTime + (delay || 0));
    }
    const SFX = {
      jump() { tone(320, 0.14, 'triangle', 0.14, 640); },
      flap() { noise(0.09, 0.16, 900); tone(500, 0.06, 'triangle', 0.05, 380); },
      coin() { tone(988, 0.08, 'square', 0.06); tone(1319, 0.16, 'square', 0.06, null, 0.07); },
      power() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, null, i * 0.05)); },
      crash() { noise(0.35, 0.3, 300, 'lowpass'); tone(160, 0.35, 'sawtooth', 0.12, 50); },
      thud() { tone(120, 0.12, 'sine', 0.3, 60); noise(0.05, 0.15, 500); },
      perfect() { tone(880, 0.12, 'sine', 0.14); tone(1320, 0.22, 'sine', 0.12, null, 0.06); },
      level() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, null, i * 0.08)); },
      tick() { tone(1000, 0.04, 'square', 0.04); }
    };
    const sfx = n => { try { (def.sfx && def.sfx[n] ? def.sfx[n] : SFX[n])(k); } catch (e) { } };
    const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } };

    function measureSafeTop() {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
      document.body.appendChild(d); const h = d.getBoundingClientRect().height; d.remove(); const ph = document.getElementById("phone"); const fr = ph ? parseFloat(getComputedStyle(ph).getPropertyValue("--frame-top")) || 0 : 0; return (h || 0) + fr;
    }
    function resize() {
      if (!cv || !k) return;
      const r = cv.getBoundingClientRect();
      k.W = Math.max(1, r.width); k.H = Math.max(1, r.height);
      k.DPR = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(k.W * k.DPR); cv.height = Math.round(k.H * k.DPR);
      k.safeTop = measureSafeTop();
      if (def.resize) def.resize(k);
    }

    function text(str, x, y, size, color, align, font, weight, outline) {
      ctx.font = (weight ? weight + ' ' : '') + Math.round(size) + 'px ' + (font || FONT);
      ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      if (outline !== false) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = 'rgba(11,29,42,.75)'; ctx.strokeText(str, x, y); }
      ctx.fillStyle = color || '#fff'; ctx.fillText(str, x, y);
    }

    function newKit() {
      return Object.assign({}, H, {
        W: 0, H: 0, DPR: 1, safeTop: 0, time: 0, phase: 'ready', pt: 0, shake: 0, flash: 0, held: false, pressT: -9,
        popups: [], parts: [], done: false, opts,
        get ctx() { return ctx; },
        text, tone, noise, audio, sfx, buzz,
        popup(x, y, str, color, size, delay) { this.popups.push({ x, y, text: str, color: color || '#fff', size: size || 24, t: -(delay || 0), life: 1.1 }); },
        burst(x, y, cols, n, power, grav, sq) {
          for (let i = 0; i < n; i++) {
            const a = rand(0, TAU), v = rand(60, 260) * (power || 1);
            this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * (power || 1), g: grav == null ? 600 : grav, life: rand(0.4, 0.95), t: 0, c: cols[i % cols.length], s: rand(3, 7) * (sq ? 1.4 : 1), sq: !!sq, rot: rand(0, TAU) });
          }
        },
        over(msg) {
          if (this.phase !== 'play') return;
          this.phase = 'over'; this.pt = 0; this.shake = 0.8; this.flash = 1; this.overMsg = msg || 'Aïe !';
          sfx('crash'); buzz([40, 30, 70]);
          if (def.onOver) def.onOver(this);
        },
        scoreHUD(value, label, sub) {
          const top = this.safeTop;
          text(label || 'SCORE', this.W / 2, top + 14, 11, 'rgba(255,255,255,.9)', 'center', SANS, '900', false);
          text(String(value), this.W / 2, top + 40, 32, '#FFFFFF', 'center');
          if (sub) text(sub, this.W / 2, top + 66, 13, COL.or, 'center', SANS, '900');
        }
      });
    }

    /* ---------- boucle ---------- */
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.034, (ts - (last || ts)) / 1000); last = ts;
      step(dt); if (k) render();
    }
    function step(dt) {
      k.time += dt; k.pt += dt;
      if (k.shake > 0) k.shake = Math.max(0, k.shake - dt * 2.5);
      if (k.flash > 0) k.flash = Math.max(0, k.flash - dt * 4);
      if (k.phase === 'intro' && def.autoStart !== false && k.pt > 1.1) { k.phase = 'play'; k.pt = 0; }
      if (k.phase === 'play' || k.phase === 'intro' || k.phase === 'ready') def.update(dt, k);
      else if (k.phase === 'over') {
        if (def.updateOver) def.updateOver(dt, k);
        if (k.pt > (def.overDelay || 1.3) && !k.done) { k.done = true; finish(); return; }
      }
      k.popups = k.popups.filter(p => (p.t += dt) < p.life);
      k.parts = k.parts.filter(p => { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 6; return p.t < p.life; });
    }
    function render() {
      ctx.setTransform(k.DPR, 0, 0, k.DPR, 0, 0);
      const sh = k.shake > 0 ? k.shake * 7 : 0;
      ctx.save(); if (sh) ctx.translate(rand(-sh, sh), rand(-sh, sh));
      def.draw(ctx, k);
      k.parts.forEach(p => {
        ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c;
        if (p.sq) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); }
        else ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      });
      ctx.globalAlpha = 1;
      ctx.restore();
      k.popups.forEach(p => {
        if (p.t < 0) return;
        const q = p.t / p.life, a = q < 0.15 ? q / 0.15 : 1 - Math.max(0, (q - 0.6) / 0.4);
        ctx.globalAlpha = a; text(p.text, p.x, p.y - q * 34, p.size * (q < 0.15 ? 0.6 + 0.4 * q / 0.15 : 1), p.color);
      });
      ctx.globalAlpha = 1;
      if (def.hud) def.hud(ctx, k);
      if (k.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (k.flash * 0.6) + ')'; ctx.fillRect(0, 0, k.W, k.H); }
      if (k.phase === 'intro') {
        const a = Math.min(1, k.pt / 0.25);
        ctx.globalAlpha = a;
        text(def.name, k.W / 2, k.H * 0.3, Math.min(38, k.W / 11), '#FFFFFF');
        text(def.hint || '', k.W / 2, k.H * 0.3 + 38, 15, '#D6F3FF', 'center', SANS, '800');
        if (def.autoStart === false) { ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(k.time * 5)); text('Touche pour commencer', k.W / 2, k.H * 0.3 + 66, 15, '#FFFFFF', 'center', SANS, '900'); }
        ctx.globalAlpha = 1;
      }
      if (k.phase === 'over' && k.pt > 0.15) {
        ctx.globalAlpha = Math.min(1, (k.pt - 0.15) / 0.2);
        text(k.overMsg, k.W / 2, k.H * 0.36, 44, COL.or);
        ctx.globalAlpha = 1;
      }
    }

    /* ---------- entrées ---------- */
    function down() {
      k.held = true; k.pressT = k.time; audio();
      if (k.phase === 'intro') { k.phase = 'play'; k.pt = 0; }
      if (k.phase === 'play' && def.down) def.down(k);
    }
    function up() { k.held = false; if (k.phase === 'play' && def.up) def.up(k); }
    function onDown(e) {
      if (!k) return; e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { }
      ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, swiped: false };
      down();
    }
    function onMove(e) {
      if (!k || !ptr || e.pointerId !== ptr.id) return;
      if (!ptr.swiped && e.clientY - ptr.y > 38) { ptr.swiped = true; if (k.phase === 'play' && def.swipe) def.swipe(k, 'down'); }
    }
    function onUp(e) { if (!k || !ptr || e.pointerId !== ptr.id) return; ptr = null; up(); }
    function onKey(e) {
      if (!k || e.repeat) return;
      const isJump = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW';
      const isDown = e.code === 'ArrowDown' || e.code === 'KeyS';
      if (!isJump && !isDown) return;
      e.preventDefault();
      if (isJump) { if (e.type === 'keydown') down(); else up(); }
      else if (e.type === 'keydown' && k.phase === 'play' && def.swipe) def.swipe(k, 'down');
    }
    const onCtx = e => e.preventDefault();
    function bind() {
      cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp); cv.addEventListener('contextmenu', onCtx);
      window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('resize', resize);
    }
    function unbind() {
      if (!cv) return;
      cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); cv.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('resize', resize);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; unbind(); if (def.stop && k) def.stop(k); }
    function finish() { const res = def.summary(k); stop(); if (opts.onEnd) opts.onEnd(res, false); }

    return {
      start(canvas, o) {
        cv = canvas; ctx = cv.getContext('2d'); opts = o || {};
        k = newKit(); k.opts = opts; resize(); def.init(k); bind(); last = 0;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
      },
      begin() { if (k && k.phase === 'ready') { k.phase = 'intro'; k.pt = 0; if (def.begin) def.begin(k); } },
      quit() { const r = k ? def.summary(k) : null; stop(); k = null; return r; },
      setSound(v) { opts.sound = v; if (!v && def.mute && k) def.mute(k); },
      get running() { return !!raf; }
    };
  }

  window.GoonEngine = Object.assign({ make }, H);
})();
