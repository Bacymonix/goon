/* Goon — L'Épreuve du Harpon
   Maintiens le doigt pour armer le harpon, glisse pour viser, relâche pour tirer.
   Vent, distance, cible mobile, fatigue des bras et perles dorées bonus. */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const LEVELS = [
    { dist: 20, wind: 0,   move: 0,  speed: 0,   sway: 1.5 },
    { dist: 30, wind: 2.2, move: 0,  speed: 0,   sway: 1.8 },
    { dist: 40, wind: 3.0, move: 6,  speed: 1.0, sway: 2.0 },
    { dist: 50, wind: 3.8, move: 9,  speed: 1.3, sway: 2.3 },
    { dist: 60, wind: 4.5, move: 12, speed: 1.6, sway: 2.6 }
  ];
  const ARROWS = LEVELS.length;
  const AIM_TIME = 10;     // secondes par flèche
  const FULL_DRAW = 0.6;   // secondes pour armer le harpon à fond
  const FATIGUE_AT = 3.2;  // au-delà, les bras tremblent
  const COL = { ocre: '#0E5A8A', ocreD: '#0A3F63', lagon: '#FF7A59', lagonD: '#E0553A', sable: '#EAF4F8', creme: '#F4FAFD', brun: '#0B1D2A', or: '#F2C14E' };
  const FONT = '"Lilita One", system-ui, sans-serif';
  const SANS = '"Nunito", system-ui, sans-serif';

  let cv, ctx, bg, W = 0, H = 0, U = 1, DPR = 1, safeTop = 0, raf = 0, last = 0, opts = {}, G = null, ac = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------------- Son (WebAudio, aucun fichier) ---------------- */
  function audio() {
    if (!opts.sound) return null;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) { ac = null; }
    return ac;
  }
  function tone(f, d, type, vol, f2, delay) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.03);
  }
  function noise(d, vol, freq) {
    const a = audio(); if (!a) return;
    const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200;
    const g = a.createGain(); g.gain.value = vol || 0.2;
    src.connect(f).connect(g).connect(a.destination); src.start();
  }
  const SFX = {
    release() { tone(230, 0.18, 'triangle', 0.25, 90); noise(0.12, 0.15, 2600); },
    hit() { tone(140, 0.12, 'sine', 0.35, 70); noise(0.06, 0.25, 600); },
    bull() { SFX.hit(); tone(880, 0.25, 'sine', 0.16, null, 0.05); tone(1320, 0.4, 'sine', 0.12, null, 0.12); },
    miss() { noise(0.25, 0.12, 900); },
    pearl() { [988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, null, i * 0.07)); },
    tick() { tone(1000, 0.04, 'square', 0.04); },
    end() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, null, i * 0.1)); }
  };
  const sfx = n => { try { SFX[n](); } catch (e) { } };
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } };

  /* ---------------- Mise en page ---------------- */
  const horizon = () => H * 0.5;
  const hudBottom = () => safeTop + 104;

  function measureSafeTop() {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none';
    document.body.appendChild(d);
    const h = d.getBoundingClientRect().height; d.remove(); const ph = document.getElementById("phone"); const fr = ph ? parseFloat(getComputedStyle(ph).getPropertyValue("--frame-top")) || 0 : 0; return (h || 0) + fr;
  }
  function resize() {
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    U = Math.min(W, H * 0.72) / 100;
    safeTop = measureSafeTop();
    bg = renderBg();
    if (G) { if (G.target) layout(G.target); clampAim(); }
  }

  function layout(t) {
    const hz = horizon();
    t.R = 27 * U * 20 / t.dist;
    t.groundY = hz + (H - hz) * 0.55 * (20 / t.dist);
    t.baseX = W / 2 + t.off * Math.min(W * 0.2, 16 * U);
    t.cy = t.groundY - t.R * 1.6;
  }
  function targetPos(t, time) {
    return { x: t.baseX + (t.move ? Math.sin(time * t.speed + t.phase) * t.move * U : 0), y: t.cy };
  }
  function clampAim() {
    if (!G) return;
    G.aim.x = clamp(G.aim.x, 4 * U, W - 4 * U);
    G.aim.y = clamp(G.aim.y, hudBottom(), H - 22 * U);
  }

  /* ---------------- Décor (rendu une fois par taille d'écran) ---------------- */
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); }
  function rrect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function renderBg() {
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    const g = c.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    const hz = horizon(), rnd = mulberry(7);
    // ciel
    let gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, '#0B4F7C'); gr.addColorStop(0.5, '#2F86B8'); gr.addColorStop(0.86, '#7CC6E0'); gr.addColorStop(1, '#5BB3D6');
    g.fillStyle = gr; g.fillRect(0, 0, W, hz + 2);
    // soleil
    const sx = W * 0.76, sy = hz - 11 * U;
    const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 28 * U);
    sg.addColorStop(0, 'rgba(255,240,200,.95)'); sg.addColorStop(0.25, 'rgba(255,224,170,.55)'); sg.addColorStop(1, 'rgba(255,220,160,0)');
    g.fillStyle = sg; g.fillRect(sx - 28 * U, sy - 28 * U, 56 * U, 56 * U);
    g.fillStyle = '#D6F3FF'; circle(g, sx, sy, 6.5 * U); g.fill();
    // nuages
    g.fillStyle = 'rgba(255,250,240,.5)';
    for (let i = 0; i < 4; i++) {
      const x = rnd() * W, y = hz * (0.12 + rnd() * 0.42), w = (12 + rnd() * 16) * U;
      g.beginPath(); g.ellipse(x, y, w, w * 0.22, 0, 0, TAU); g.ellipse(x + w * 0.3, y - w * 0.12, w * 0.5, w * 0.2, 0, 0, TAU); g.fill();
    }
    // récifs
    récifs(g, hz, '#2C6A86', 5, 8, 15, rnd);
    récifs(g, hz, '#1D4E66', 4, 3, 8, rnd);
    // algues
    algue(g, W * 0.09, hz + 1, 4.6 * U); algue(g, W * 0.15, hz + 1, 3.3 * U); algue(g, W * 0.91, hz + 1, 3.8 * U);
    // sol
    gr = g.createLinearGradient(0, hz, 0, H);
    gr.addColorStop(0, '#EBC898'); gr.addColorStop(0.45, '#DCAC74'); gr.addColorStop(1, '#B67647');
    g.fillStyle = gr; g.fillRect(0, hz, W, H - hz);
    // touffes d'herbe
    for (let i = 0; i < 80; i++) {
      const y = hz + 4 + Math.pow(rnd(), 1.5) * (H - hz), k = (y - hz) / (H - hz), x = rnd() * W, s = (0.35 + k * 2.2) * U;
      g.strokeStyle = 'rgba(105,70,30,' + (0.22 + k * 0.3) + ')'; g.lineWidth = Math.max(1, s * 0.28); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - s, y); g.quadraticCurveTo(x - s * 0.6, y - s * 1.2, x - s * 0.2, y - s * 1.8);
      g.moveTo(x, y); g.lineTo(x + s * 0.1, y - s * 2.1);
      g.moveTo(x + s, y); g.quadraticCurveTo(x + s * 0.6, y - s * 1.1, x + s * 0.3, y - s * 1.6); g.stroke();
    }
    return c;
  }
  function récifs(g, hz, color, count, hmin, hmax, rnd) {
    g.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const cx = (i + rnd() * 0.8) / count * W, w = (10 + rnd() * 22) * U, h = (hmin + rnd() * (hmax - hmin)) * U, sl = h * 0.55;
      g.beginPath(); g.moveTo(cx - w / 2 - sl, hz + 1); g.lineTo(cx - w / 2, hz - h); g.lineTo(cx + w / 2, hz - h); g.lineTo(cx + w / 2 + sl, hz + 1); g.closePath(); g.fill();
    }
  }
  function algue(g, x, base, s) {
    g.strokeStyle = '#1F7A5C'; g.lineWidth = Math.max(2, s * 0.35); g.lineCap = 'round';
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * s * 0.5, base); g.quadraticCurveTo(x + i * s * 0.5 + s * 0.6, base - s * 1.2, x + i * s * 0.4, base - s * (2.2 + (i + 1) * 0.3)); g.stroke(); }
  }

  /* ---------------- Partie ---------------- */
  function newGame() {
    G = {
      i: -1, phase: 'ready', pt: 0, time: 0, score: 0, combo: 0, maxCombo: 0, bulls: 0, pearls: 0, shots: 0,
      results: [], target: null, aim: { x: W / 2, y: H * 0.66 }, holding: false, holdT: 0, pid: null, f0: null, a0: null,
      flight: null, impact: null, stuck: null, missAt: null, popups: [], parts: [], shake: 0, pearl: null,
      timer: AIM_TIME, lastTick: 0, jit: { x: 0, y: 0 }, dust: [], done: false
    };
    for (let k = 0; k < 28; k++) G.dust.push({ x: Math.random() * W, y: horizon() + Math.random() * (H - horizon()), s: Math.random() });
  }

  function nextArrow() {
    G.i++;
    if (G.i >= ARROWS) { G.phase = 'end'; G.pt = 0; sfx('end'); return; }
    const L = LEVELS[G.i];
    const t = {
      dist: L.dist + Math.round(rand(-2, 2)),
      wind: G.i === 0 ? 0 : Math.round((Math.random() < 0.5 ? -1 : 1) * rand(0.45, 1) * L.wind * 10) / 10,
      move: L.move, speed: L.speed, phase: rand(0, TAU), off: rand(-1, 1), sway: L.sway
    };
    layout(t);
    G.target = t; G.impact = null; G.flight = null; G.stuck = null; G.missAt = null;
    G.timer = AIM_TIME; G.lastTick = 0; G.holding = false; G.holdT = 0;
    G.aim = { x: t.baseX + rand(-12, 12) * U, y: Math.min(H - 24 * U, t.cy + t.R + 12 * U) };
    clampAim();
    const top = hudBottom() + 14, bottom = Math.max(top + 30, horizon() - 30 * U);
    G.pearl = (G.i >= 1 && Math.random() < 0.4)
      ? { dir: Math.random() < 0.5 ? 1 : -1, y: rand(top, bottom), speed: rand(9, 13) * U, t0: G.time + rand(1.2, 3.2), alive: true }
      : null;
    G.phase = 'intro'; G.pt = 0;
  }

  function swayAmp() {
    let k;
    if (!G.holding) k = 1.25;
    else if (G.holdT < FULL_DRAW) k = 1.25 - 0.5 * (G.holdT / FULL_DRAW);
    else if (G.holdT < FATIGUE_AT) k = 0.75;
    else k = 0.75 + (G.holdT - FATIGUE_AT) * 0.9;
    return G.target.sway * U * k;
  }
  function sway() {
    const a = swayAmp(), s = G.time;
    return {
      x: a * (0.62 * Math.sin(s * 1.7) + 0.38 * Math.sin(s * 2.9 + 1.3)) + G.jit.x,
      y: a * (0.6 * Math.cos(s * 1.3) + 0.4 * Math.sin(s * 2.3 + 0.7)) + G.jit.y
    };
  }

  function release() {
    if (G.phase !== 'aim') return;
    const t = G.target, draw = clamp(G.holdT / FULL_DRAW, 0, 1), sw = sway();
    const ax = G.aim.x + sw.x, ay = G.aim.y + sw.y;
    const drift = t.wind * (t.dist / 10) * 0.5 * U;
    const drop = Math.pow(1 - draw, 1.5) * 30 * U;
    G.flight = { from: { x: W / 2, y: H - 10 * U }, ax, ay, to: { x: ax + drift, y: ay + drop }, t0: G.time, T: 0.22 + t.dist * 0.005, draw, drift, drop };
    G.holding = false; G.phase = 'flight'; G.shots++;
    sfx('release'); buzz(12);
  }

  function record(r) { G.results.push(r); }

  function timeout() {
    G.shots++; G.combo = 0;
    record({ pts: 0, bonus: 0, label: 'Trop tard !' });
    popup(W / 2, H * 0.42, 'Trop tard !', '#fff', 30);
    G.phase = 'result'; G.pt = 0; sfx('miss');
  }

  function pearlPos(f) {
    const dt = G.time - f.t0; if (dt < 0) return null;
    const x = f.dir > 0 ? -8 * U + dt * f.speed : W + 8 * U - dt * f.speed;
    if (x < -12 * U || x > W + 12 * U) return null;
    return { x, y: f.y + Math.sin(dt * 2.4) * 3 * U, rot: Math.sin(dt * 1.8) * 0.5 + (f.dir > 0 ? 0.35 : -0.35) };
  }

  function resolve() {
    const f = G.flight, P = f.to, t = G.target, tp = targetPos(t, G.time);
    G.impact = { x: P.x, y: P.y, ax: f.ax, ay: f.ay };
    // Perle dorée : bonus mais la flèche ne touche pas la cible
    if (G.pearl && G.pearl.alive) {
      const fp = pearlPos(G.pearl);
      if (fp && Math.hypot(P.x - fp.x, P.y - fp.y) < 6 * U) {
        G.pearl.alive = false; G.pearls++; G.score += 15;
        record({ pts: 0, bonus: 15, pearl: true, label: 'Perle dorée' });
        popup(P.x, P.y - 4 * U, 'PERLE DORÉE  +15', COL.or, 28);
        burst(P.x, P.y, [COL.or, '#D6F3FF', '#FFFFFF'], 30, 1.4);
        G.shake = 0.6; sfx('pearl'); buzz([20, 40, 20]);
        G.phase = 'result'; G.pt = 0; return;
      }
    }
    const d = Math.hypot(P.x - tp.x, P.y - tp.y) / t.R;
    const pts = d <= 0.2 ? 10 : d <= 0.4 ? 8 : d <= 0.6 ? 6 : d <= 0.8 ? 4 : d <= 1 ? 2 : 0;
    let bonus = 0, label;
    if (pts === 10) { G.combo++; G.bulls++; bonus = G.combo > 1 ? 5 * (G.combo - 1) : 0; label = 'PLEIN CENTRE !'; }
    else { G.combo = 0; label = { 8: 'Très bien !', 6: 'Bien', 4: 'Pas mal', 2: 'Touché', 0: 'Manqué…' }[pts]; }
    G.maxCombo = Math.max(G.maxCombo, G.combo);
    G.score += pts + bonus;
    record({ pts, bonus, label });
    if (pts > 0) {
      G.stuck = { dx: (P.x - tp.x) / t.R, dy: (P.y - tp.y) / t.R };
      popup(P.x, P.y - 5 * U, '+' + pts, pts === 10 ? COL.or : '#FFFFFF', pts === 10 ? 40 : 32);
      popup(P.x, P.y + 4 * U, label, pts === 10 ? COL.or : '#FFFFFF', 18, 0.1);
      if (bonus) popup(W / 2, H * 0.3, 'COMBO ×' + G.combo + '  +' + bonus, COL.or, 30, 0.25);
      const ringCol = [COL.creme, COL.brun, COL.lagon, COL.ocre, COL.or][Math.min(4, Math.floor(pts / 2) - 1)];
      burst(P.x, P.y, [ringCol, '#D8B06A', '#FFFFFF'], pts === 10 ? 34 : 16, pts === 10 ? 1.3 : 0.8);
      if (pts === 10) { G.shake = 0.8; sfx('bull'); buzz([25, 30, 50]); } else { G.shake = 0.3; sfx('hit'); buzz(25); }
    } else {
      G.missAt = { x: P.x, y: P.y };
      popup(P.x, P.y - 3 * U, label, '#FFFFFF', 24);
      burst(P.x, P.y, ['#C9A06C', '#A97B4D'], 10, 0.6);
      sfx('miss');
    }
    G.phase = 'result'; G.pt = 0;
  }

  function popup(x, y, text, color, size, delay) { G.popups.push({ x, y, text, color, size, t: -(delay || 0), life: 1.2 }); }
  function burst(x, y, cols, n, power) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), v = rand(8, 30) * U * power;
      G.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10 * U, g: 60 * U, life: rand(0.4, 0.9), t: 0, c: cols[i % cols.length], s: rand(0.5, 1.2) * U });
    }
  }

  function finish() {
    const res = summary();
    stopLoop();
    if (opts.onEnd) opts.onEnd(res, false);
  }
  function summary() {
    return G ? { score: G.score, results: G.results.slice(), bulls: G.bulls, maxCombo: G.maxCombo, pearls: G.pearls, shots: G.shots } : null;
  }

  /* ---------------- Boucle ---------------- */
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    update(dt); draw();
  }

  function update(dt) {
    G.time += dt; G.pt += dt;
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.4);
    const w = G.target ? G.target.wind : 0, hz = horizon();
    G.dust.forEach(d => {
      d.x += (w * (5 + d.s * 6) * U + (w === 0 ? 1.5 * U : 0)) * dt;
      if (d.x > W + 5) d.x = -5; if (d.x < -5) d.x = W + 5;
      d.y += Math.sin(G.time * 2 + d.s * 10) * 0.2;
      if (d.y < hz) d.y = hz + 2;
    });
    if (G.holding && G.holdT > FATIGUE_AT) { const k = (G.holdT - FATIGUE_AT) * 0.5 * U; G.jit = { x: rand(-k, k), y: rand(-k, k) }; }
    else G.jit = { x: 0, y: 0 };

    if (G.phase === 'intro' && G.pt > 1.1) { G.phase = 'aim'; G.pt = 0; }
    else if (G.phase === 'aim') {
      if (G.holding) G.holdT += dt;
      G.timer -= dt;
      const c = Math.ceil(G.timer);
      if (G.timer <= 3 && c !== G.lastTick && c > 0) { G.lastTick = c; sfx('tick'); }
      if (G.timer <= 0) { if (G.holding) release(); else timeout(); }
    }
    else if (G.phase === 'flight') { if (G.time - G.flight.t0 >= G.flight.T) resolve(); }
    else if (G.phase === 'result' && G.pt > 1.5) nextArrow();
    else if (G.phase === 'end' && G.pt > 0.9 && !G.done) { G.done = true; finish(); return; }

    G.popups = G.popups.filter(p => (p.t += dt) < p.life);
    G.parts = G.parts.filter(p => { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.t < p.life; });
  }

  /* ---------------- Dessin ---------------- */
  function draw() {
    if (!G) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const sh = G.shake > 0 ? G.shake * 2 * U : 0;
    ctx.save(); if (sh) ctx.translate(rand(-sh, sh), rand(-sh, sh));
    ctx.drawImage(bg, 0, 0, W, H);
    drawDust();
    if (G.target) drawTarget();
    drawPearl();
    if (G.phase === 'result' && G.missAt) drawMiss();
    if (G.phase === 'result' && G.impact) drawTrace();
    if (G.phase === 'flight') drawFlyingArrow();
    drawBow();
    if (G.phase === 'aim') drawReticle();
    drawParts();
    ctx.restore();
    drawPopups();
    drawHUD();
    if (G.phase === 'intro') drawBanner();
    if (G.phase === 'aim' && G.i <= 1 && !G.holding && G.timer > AIM_TIME - 6) drawHint();
  }

  function drawDust() {
    ctx.fillStyle = 'rgba(255,240,215,.55)';
    G.dust.forEach(d => { const k = (d.y - horizon()) / (H - horizon()); circle(ctx, d.x, d.y, (0.15 + k * 0.45) * U); ctx.fill(); });
  }

  function drawTarget() {
    const t = G.target, p = targetPos(t, G.time), R = t.R;
    ctx.globalAlpha = G.phase === 'intro' ? Math.min(1, G.pt / 0.35) : 1;
    ctx.fillStyle = 'rgba(5,30,50,.22)';
    ctx.beginPath(); ctx.ellipse(p.x, t.groundY, R * 0.85, R * 0.13, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6B4226'; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, R * 0.09);
    ctx.beginPath(); ctx.moveTo(p.x - R * 0.62, t.groundY); ctx.lineTo(p.x - R * 0.2, p.y);
    ctx.moveTo(p.x + R * 0.62, t.groundY); ctx.lineTo(p.x + R * 0.2, p.y); ctx.stroke();
    ctx.fillStyle = '#D8B06A'; circle(ctx, p.x, p.y, R * 1.09); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,30,.35)'; ctx.lineWidth = Math.max(1, R * 0.02);
    circle(ctx, p.x, p.y, R * 1.045); ctx.stroke();
    const rings = [[1, COL.creme], [0.8, COL.brun], [0.6, COL.lagon], [0.4, COL.ocre], [0.2, COL.or]];
    rings.forEach(([k, c]) => { ctx.fillStyle = c; circle(ctx, p.x, p.y, R * k); ctx.fill(); });
    // motif dents de scie sur l'anneau brun
    ctx.fillStyle = 'rgba(246,235,221,.85)';
    const N = 18;
    for (let i = 0; i < N; i++) {
      const a = i / N * TAU, da = TAU / N / 2.4;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * R * 0.64, p.y + Math.sin(a) * R * 0.64);
      ctx.lineTo(p.x + Math.cos(a - da) * R * 0.76, p.y + Math.sin(a - da) * R * 0.76);
      ctx.lineTo(p.x + Math.cos(a + da) * R * 0.76, p.y + Math.sin(a + da) * R * 0.76);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
    rings.forEach(([k]) => { circle(ctx, p.x, p.y, R * k); ctx.stroke(); });
    if (G.stuck) drawStuck(p.x + G.stuck.dx * R, p.y + G.stuck.dy * R, R);
    ctx.globalAlpha = 1;
  }

  function drawStuck(x, y, R) {
    const s = clamp(R / (20 * U), 0.6, 1.4);
    ctx.fillStyle = 'rgba(30,15,5,.6)'; circle(ctx, x, y, 0.7 * U * s); ctx.fill();
    ctx.strokeStyle = '#5A2E14'; ctx.lineWidth = 0.7 * U * s; ctx.lineCap = 'round';
    const ex = x + 1.2 * U * s, ey = y + 3.4 * U * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = COL.ocre;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 1.6 * U * s, ey + 0.6 * U * s); ctx.lineTo(ex - 0.2 * U * s, ey - 1.2 * U * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.lagon;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + 1.5 * U * s, ey + 0.2 * U * s); ctx.lineTo(ex + 0.3 * U * s, ey - 1.3 * U * s); ctx.closePath(); ctx.fill();
  }

  function drawPearl() {
    const f = G.pearl; if (!f || !f.alive || G.phase === 'intro') return;
    const p = pearlPos(f); if (!p) return;
    const r = 3.4 * U, glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9 * U);
    glow.addColorStop(0, 'rgba(255,220,120,.55)'); glow.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = glow; ctx.fillRect(p.x - 9 * U, p.y - 9 * U, 18 * U, 18 * U);
    const gr = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r);
    gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.45, '#FFD24A'); gr.addColorStop(1, '#C77D12');
    ctx.fillStyle = gr; circle(ctx, p.x, p.y, r); ctx.fill();
  }

  function drawMiss() {
    const m = G.missAt, a = 1 - clamp(G.pt / 1.4, 0, 1);
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#5A2E14'; ctx.lineWidth = 0.6 * U;
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + 1.2 * U, m.y + 3 * U); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawTrace() {
    // montre où tu visais → où la flèche est arrivée (pour apprendre le courant)
    const im = G.impact, a = clamp(G.pt / 0.3, 0, 1) * (1 - clamp((G.pt - 1.1) / 0.4, 0, 1));
    if (Math.hypot(im.x - im.ax, im.y - im.ay) < 1.5 * U) return;
    ctx.globalAlpha = a * 0.9;
    ctx.setLineDash([0.8 * U, 0.9 * U]); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, 0.35 * U);
    ctx.beginPath(); ctx.moveTo(im.ax, im.ay); ctx.lineTo(im.x, im.y); ctx.stroke(); ctx.setLineDash([]);
    circle(ctx, im.ax, im.ay, 1.6 * U); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function flightPoint(f, e) {
    const dist = G.target.dist;
    return {
      x: lerp(f.from.x, f.ax, e) + f.drift * e * e,
      y: lerp(f.from.y, f.ay + f.drop, e) - Math.sin(Math.PI * e) * (5 + dist * 0.12) * U
    };
  }
  function drawFlyingArrow() {
    const f = G.flight, p = clamp((G.time - f.t0) / f.T, 0, 1), e = 1 - Math.pow(1 - p, 1.7);
    const a = flightPoint(f, e), b = flightPoint(f, Math.max(0, e - 0.05));
    let dx = a.x - b.x, dy = a.y - b.y; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const len = lerp(24 * U, 2.6 * U, e), wdt = lerp(0.9 * U, 0.3 * U, e);
    const tx = a.x - dx * len, ty = a.y - dy * len;
    ctx.strokeStyle = '#5A2E14'; ctx.lineWidth = wdt; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(a.x, a.y); ctx.stroke();
    ctx.fillStyle = '#4A4038';
    ctx.beginPath(); ctx.moveTo(a.x + dx * wdt * 3, a.y + dy * wdt * 3); ctx.lineTo(a.x - dy * wdt * 1.6, a.y + dx * wdt * 1.6); ctx.lineTo(a.x + dy * wdt * 1.6, a.y - dx * wdt * 1.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.ocre;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - dy * wdt * 2.4 - dx * wdt * 3, ty + dx * wdt * 2.4 - dy * wdt * 3); ctx.lineTo(tx + dx * wdt * 3, ty + dy * wdt * 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.lagon;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + dy * wdt * 2.4 - dx * wdt * 3, ty - dx * wdt * 2.4 - dy * wdt * 3); ctx.lineTo(tx + dx * wdt * 3, ty + dy * wdt * 3); ctx.closePath(); ctx.fill();
  }

  function drawBow() {
    const cx = W / 2, by = H - 9 * U, bw = Math.min(30 * U, W * 0.38);
    const draw = (G.phase === 'aim' && G.holding) ? clamp(G.holdT / FULL_DRAW, 0, 1) : 0;
    const ang = clamp(Math.atan2(G.aim.x - cx, by - G.aim.y) * 0.35, -0.35, 0.35);
    const showArrow = G.phase === 'aim' || G.phase === 'intro';
    ctx.save(); ctx.translate(cx, by); ctx.rotate(ang);
    const pull = 2 * U + draw * 9 * U;
    ctx.strokeStyle = 'rgba(255,246,232,.95)'; ctx.lineWidth = Math.max(1.2, 0.35 * U);
    ctx.beginPath(); ctx.moveTo(-bw, 1 * U); ctx.lineTo(0, showArrow ? pull : 1 * U); ctx.lineTo(bw, 1 * U); ctx.stroke();
    if (showArrow) {
      const tip = pull - 26 * U;
      ctx.strokeStyle = '#6B3A1A'; ctx.lineWidth = 0.9 * U; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, pull); ctx.lineTo(0, tip + 2 * U); ctx.stroke();
      ctx.fillStyle = '#4A4038';
      ctx.beginPath(); ctx.moveTo(0, tip - 1 * U); ctx.lineTo(1.6 * U, tip + 2.6 * U); ctx.lineTo(-1.6 * U, tip + 2.6 * U); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.ocre; ctx.beginPath(); ctx.moveTo(0, pull - 1 * U); ctx.lineTo(-2 * U, pull + 0.6 * U); ctx.lineTo(-0.4 * U, pull - 5 * U); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.lagon; ctx.beginPath(); ctx.moveTo(0, pull - 1 * U); ctx.lineTo(2 * U, pull + 0.6 * U); ctx.lineTo(0.4 * U, pull - 5 * U); ctx.closePath(); ctx.fill();
    }
    const bend = draw * 1.6 * U;
    const stave = () => { ctx.beginPath(); ctx.moveTo(-bw, 1 * U); ctx.bezierCurveTo(-bw * 0.78, -7 * U - bend, -bw * 0.3, -6 * U, 0, -4.6 * U); ctx.bezierCurveTo(bw * 0.3, -6 * U, bw * 0.78, -7 * U - bend, bw, 1 * U); };
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#17394F'; ctx.lineWidth = 2.4 * U; stave(); ctx.stroke();
    ctx.strokeStyle = '#8C4A22'; ctx.lineWidth = 0.9 * U; stave(); ctx.stroke();
    ctx.fillStyle = COL.ocre; rrect(ctx, -2.4 * U, -6.6 * U, 4.8 * U, 4 * U, 0.8 * U); ctx.fill();
    ctx.fillStyle = COL.lagon; ctx.fillRect(-2.4 * U, -5.3 * U, 4.8 * U, 0.6 * U); ctx.fillRect(-2.4 * U, -4.1 * U, 4.8 * U, 0.6 * U);
    ctx.fillStyle = COL.or; circle(ctx, -bw, 1 * U, 0.8 * U); ctx.fill(); circle(ctx, bw, 1 * U, 0.8 * U); ctx.fill();
    ctx.restore();
  }

  function drawReticle() {
    const sw = sway(), x = G.aim.x + sw.x, y = G.aim.y + sw.y;
    const draw = G.holding ? clamp(G.holdT / FULL_DRAW, 0, 1) : 0;
    const tired = G.holding && G.holdT > FATIGUE_AT;
    const r = (4.4 - 1.6 * draw) * U;
    const col = tired ? '#FF8A65' : draw >= 1 ? COL.or : '#FFFFFF';
    const lines = () => {
      circle(ctx, x, y, r); ctx.stroke();
      ctx.beginPath();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { ctx.moveTo(x + dx * r * 0.45, y + dy * r * 0.45); ctx.lineTo(x + dx * r * 1.6, y + dy * r * 1.6); });
      ctx.stroke();
    };
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(11,29,42,.55)'; ctx.lineWidth = Math.max(2.5, 0.85 * U); lines();
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, 0.42 * U); lines();
    ctx.fillStyle = col; circle(ctx, x, y, Math.max(1.5, 0.35 * U)); ctx.fill();
    if (G.holding) {
      ctx.strokeStyle = draw >= 1 ? COL.or : COL.lagon; ctx.lineWidth = 0.7 * U;
      ctx.beginPath(); ctx.arc(x, y, r + 2 * U, -Math.PI / 2, -Math.PI / 2 + TAU * draw); ctx.stroke();
    }
    if (tired) text('Tes bras tremblent !', x, y + r + 5 * U, 14, '#FFE0D6', 'center', SANS, '800');
  }

  function drawParts() {
    G.parts.forEach(p => { ctx.globalAlpha = 1 - p.t / p.life; ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); });
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, size, color, align, font, weight, outline) {
    ctx.font = (weight ? weight + ' ' : '') + size + 'px ' + (font || FONT);
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(11,29,42,.55)'; ctx.fillText(str, x + 1.5, y + 2);
    if (outline) { ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.16); ctx.strokeStyle = 'rgba(11,29,42,.85)'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
  }

  function drawPopups() {
    G.popups.forEach(p => {
      if (p.t < 0) return;
      const k = p.t / p.life, a = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      const sc = k < 0.15 ? 0.6 + 0.4 * (k / 0.15) : 1;
      ctx.globalAlpha = a;
      text(p.text, p.x, p.y - k * 9 * U, Math.round(p.size * sc), p.color, 'center', null, null, true);
    });
    ctx.globalAlpha = 1;
  }

  function pill(x, y, w, h, align) {
    const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    ctx.fillStyle = 'rgba(11,29,42,.45)'; rrect(ctx, px, y - h / 2, w, h, h / 2); ctx.fill();
    return px;
  }

  function drawHUD() {
    const top = safeTop;
    text('SCORE', W / 2, top + 14, 11, 'rgba(255,255,255,.85)', 'center', SANS, '800');
    text(String(G.score), W / 2, top + 38, 30, '#FFFFFF', 'center');
    if (!G.target) return;
    const t = G.target, rowY = top + 74;
    // distance
    ctx.font = '800 14px ' + SANS;
    const dTxt = '🎯 ' + t.dist + ' m', dW = ctx.measureText(dTxt).width + 22;
    pill(14, rowY, dW, 28, 'left'); text(dTxt, 14 + dW / 2, rowY + 1, 14, '#FFFFFF', 'center', SANS, '800');
    // courant
    const wTxt = t.wind === 0 ? 'Pas de courant' : Math.abs(t.wind).toFixed(1) + ' m/s';
    ctx.font = '800 14px ' + SANS;
    const arrowW = t.wind === 0 ? 0 : 30, wW = ctx.measureText(wTxt).width + 24 + arrowW;
    const wx = pill(W - 14, rowY, wW, 28, 'right');
    text(wTxt, wx + 12 + arrowW + ctx.measureText(wTxt).width / 2, rowY + 1, 14, '#FFFFFF', 'center', SANS, '800');
    if (t.wind !== 0) {
      const ax = wx + 12, len = 8 + Math.min(1, Math.abs(t.wind) / 4.5) * 14, dir = Math.sign(t.wind);
      const sx = dir > 0 ? ax : ax + len + 4, ex = dir > 0 ? ax + len + 4 : ax;
      ctx.strokeStyle = COL.lagon; ctx.fillStyle = COL.lagon; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, rowY); ctx.lineTo(ex, rowY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + dir * 3, rowY); ctx.lineTo(ex - dir * 4, rowY - 5); ctx.lineTo(ex - dir * 4, rowY + 5); ctx.closePath(); ctx.fill();
    }
    // flèches restantes
    const n = ARROWS, gap = 18, sx0 = W / 2 - (n - 1) * gap / 2;
    for (let i = 0; i < n; i++) {
      const r = G.results[i], x = sx0 + i * gap;
      let c = 'rgba(255,255,255,.25)';
      if (r) c = r.pearl ? COL.or : r.pts === 10 ? COL.or : r.pts >= 6 ? COL.lagon : r.pts > 0 ? COL.creme : 'rgba(11,29,42,.6)';
      else if (i === G.i) c = '#FFFFFF';
      ctx.fillStyle = c; circle(ctx, x, rowY, i === G.i && !r ? 6 : 5); ctx.fill();
      if (i === G.i && !r) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; circle(ctx, x, rowY, 9); ctx.stroke(); }
    }
    if (G.combo >= 1 && (G.phase === 'aim' || G.phase === 'intro')) text('Combo ×' + G.combo, W / 2, rowY + 20, 13, COL.or, 'center', SANS, '900');
    // chrono
    if (G.phase === 'aim') {
      const k = clamp(G.timer / AIM_TIME, 0, 1), by = top + 98;
      ctx.fillStyle = 'rgba(255,255,255,.25)'; rrect(ctx, 16, by, W - 32, 5, 2.5); ctx.fill();
      ctx.fillStyle = k < 0.3 ? '#FF7A50' : COL.lagon; rrect(ctx, 16, by, Math.max(5, (W - 32) * k), 5, 2.5); ctx.fill();
    }
  }

  function drawBanner() {
    const k = G.pt, a = k < 0.2 ? k / 0.2 : k > 0.85 ? Math.max(0, (1.1 - k) / 0.25) : 1;
    const t = G.target, y = H * 0.3;
    ctx.globalAlpha = a;
    const last = G.i === ARROWS - 1;
    text(last ? 'DERNIÈRE FLÈCHE !' : 'FLÈCHE ' + (G.i + 1) + '/' + ARROWS, W / 2, y, last ? 30 : 36, '#FFFFFF', 'center');
    const parts = [t.dist + ' m', t.wind === 0 ? 'sans courant' : 'courant ' + Math.abs(t.wind).toFixed(1) + ' m/s'];
    if (t.move) parts.push('cible mobile');
    text(parts.join(' · '), W / 2, y + 34, 16, '#D6F3FF', 'center', SANS, '800');
    ctx.globalAlpha = 1;
  }

  function drawHint() {
    const a = 0.65 + 0.35 * Math.sin(G.time * 4);
    ctx.globalAlpha = a;
    text("Maintiens · glisse pour viser · relâche", W / 2, H - 30 * U, 15, '#FFFFFF', 'center', SANS, '800');
    ctx.globalAlpha = 1;
  }

  /* ---------------- Contrôles ---------------- */
  function onDown(e) {
    if (!G) return;
    if (G.phase === 'intro') { G.phase = 'aim'; G.pt = 0; }
    if (G.phase !== 'aim' || G.holding) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    G.holding = true; G.holdT = 0; G.pid = e.pointerId;
    G.f0 = { x: e.clientX, y: e.clientY }; G.a0 = { x: G.aim.x, y: G.aim.y };
    audio();
  }
  function onMove(e) {
    if (!G || !G.holding || e.pointerId !== G.pid) return;
    e.preventDefault();
    G.aim.x = G.a0.x + (e.clientX - G.f0.x);
    G.aim.y = G.a0.y + (e.clientY - G.f0.y);
    clampAim();
  }
  function onUp(e) { if (!G || !G.holding || e.pointerId !== G.pid) return; release(); }
  function onCtx(e) { e.preventDefault(); }

  function bind() {
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    cv.addEventListener('contextmenu', onCtx);
    window.addEventListener('resize', resize);
  }
  function unbind() {
    if (!cv) return;
    cv.removeEventListener('pointerdown', onDown);
    cv.removeEventListener('pointermove', onMove);
    cv.removeEventListener('pointerup', onUp);
    cv.removeEventListener('pointercancel', onUp);
    cv.removeEventListener('contextmenu', onCtx);
    window.removeEventListener('resize', resize);
  }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; unbind(); }

  window.ArcheryGame = {
    start(canvas, o) {
      cv = canvas; ctx = cv.getContext('2d'); opts = o || {};
      resize(); newGame(); bind(); last = 0;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    begin() { if (G && G.phase === 'ready') nextArrow(); },
    quit() { const r = summary(); stopLoop(); G = null; return r; },
    setSound(v) { opts.sound = v; },
    get running() { return !!raf; }
  };
})();
