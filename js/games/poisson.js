/* Goon — La Nage du Poisson-Lune
   Touche pour donner un coup de nageoire et passer entre les trésors.
   Aléatoire : hauteur et taille des passages, courants de courant (montantes ou descendantes), perles, ambiance. */
(function () {
  'use strict';
  const E = window.GoonEngine;
  const { rand, pick, mulberry, rrect, pearl, COL, TAU, clamp } = E;
  let u = 4, EX = 100, GYb = 700, st = null;
  const PALS = [
    { top: '#0B4F7C', bot: '#7CC6E0', far: '#2C6A86' },
    { top: '#0E5A8A', bot: '#5BB3D6', far: '#1D4E66' },
    { top: '#141B3A', bot: '#5B3A6B', far: '#2A2140' }
  ];
  const SEG_COLS = ['#0E5A8A', '#FF7A59', '#F2C14E', '#56709C', '#7A4E2D', '#2F7D57', '#0A3F63'];

  function reset(k) {
    st = {
      y: k.H * 0.45, vy: 0, t: 0, poles: [], nextX: 0, score: 0, poleCount: 0, pearls: 0, items: [],
      wind: { state: 'none', next: rand(6, 10), t: 0, dir: 1, acc: 0 }, gusts: 0, flapT: 0, pal: pick(PALS), lastGap: null, rot: 0,
      clouds: Array.from({ length: 5 }, () => ({ x: Math.random(), y: rand(0.08, 0.5), s: rand(0.7, 1.4) }))
    };
    st.nextX = k.W + 20 * u;
  }
  const speed = () => 42 + Math.min(18, st.poleCount * 0.6);
  const minY = k => k.safeTop + 96;

  function addPole(k) {
    const gap = Math.max(37, 52 - st.poleCount * 0.5) * rand(0.95, 1.08) * u;
    let lo = minY(k) + gap / 2, hi = GYb - gap / 2 - 8 * u;
    let gy = rand(lo, hi);
    if (st.lastGap != null) gy = clamp(gy, st.lastGap - 34 * u, st.lastGap + 34 * u);
    gy = clamp(gy, lo, hi);
    st.lastGap = gy;
    const cols = Array.from({ length: 8 }, () => pick(SEG_COLS));
    const pole = { x: st.nextX, gy, gap, cols, passed: false, seed: Math.random() * 1000 };
    st.poles.push(pole);
    const r = Math.random();
    if (r < 0.08) st.items.push({ x: st.nextX + 8.5 * u, y: gy + rand(-0.25, 0.25) * gap, gold: true });
    else if (r < 0.4) st.items.push({ x: st.nextX + 8.5 * u, y: gy + rand(-0.25, 0.25) * gap, gold: false });
    st.nextX += (62 + rand(0, 12)) * u;
  }

  function circleRect(cx, cy, r, x, y, w, h) {
    const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h);
    return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
  }

  const def = {
    name: 'La Nage du Poisson-Lune',
    hint: 'Touche pour donner un coup de nageoire',
    autoStart: false,
    overDelay: 1.4,
    resize(k) { u = Math.min(k.W, k.H * 0.62) / 100; EX = k.W * 0.28; GYb = k.H * 0.88; },
    init(k) { reset(k); },
    down(k) { st.vy = -98; st.flapT = 0.25; k.sfx('flap'); },
    update(dt, k) {
      st.flapT = Math.max(0, st.flapT - dt);
      if (k.phase !== 'play') { st.y = k.H * 0.45 + Math.sin(k.time * 3) * 2 * u; return; }
      st.t += dt;
      const sp = speed() * u;
      // courant
      const w = st.wind;
      if (st.poleCount >= 3) {
        if (w.state === 'none' && st.t > w.next) { w.state = 'warn'; w.t = 0; w.dir = Math.random() < 0.5 ? -1 : 1; w.acc = rand(90, 140); }
        else if (w.state === 'warn' && (w.t += dt) > 1) { w.state = 'on'; w.t = 0; k.sfx('flap'); }
        else if (w.state === 'on' && (w.t += dt) > 1.8) { w.state = 'none'; w.next = st.t + rand(6, 12); st.gusts++; }
      }
      let g = 330 + (w.state === 'on' ? w.dir * w.acc : 0);
      st.vy = Math.min(170, st.vy + g * dt);
      st.y += st.vy * u * dt;
      const r = 4.2 * u;
      if (st.y - r < minY(k) - 40) { st.y = minY(k) - 40 + r; st.vy = Math.max(0, st.vy); }
      if (st.y + r >= GYb) { st.y = GYb - r; k.over('Aïe !'); return; }
      // trésors
      while (st.nextX < k.W + 40 * u) addPole(k);
      const PW = 17 * u, cap = 2 * u, capH = 4.5 * u;
      for (const p of st.poles) {
        p.x -= sp * dt;
        const top = p.gy - p.gap / 2, bot = p.gy + p.gap / 2;
        if (circleRect(EX, st.y, r * 0.86, p.x, -50, PW, top + 50) || circleRect(EX, st.y, r * 0.86, p.x - cap, top - capH, PW + 2 * cap, capH) ||
          circleRect(EX, st.y, r * 0.86, p.x, bot, PW, GYb - bot) || circleRect(EX, st.y, r * 0.86, p.x - cap, bot, PW + 2 * cap, capH)) { k.over('Aïe !'); return; }
        if (!p.passed && p.x + PW < EX - r) { p.passed = true; st.poleCount++; st.score++; k.sfx('tick'); }
      }
      for (const it of st.items) {
        it.x -= sp * dt;
        if (!it.got && Math.hypot(it.x - EX, it.y - st.y) < r + 3 * u) {
          it.got = true; st.pearls++; const b = it.gold ? 3 : 1; st.score += b;
          k.sfx(it.gold ? 'power' : 'coin'); k.popup(it.x, it.y - 10, '+' + b, COL.or, it.gold ? 28 : 20);
          if (it.gold) k.burst(it.x, it.y, [COL.or, '#D6F3FF'], 16, 0.7);
        }
      }
      st.poles = st.poles.filter(p => p.x > -30 * u);
      st.items = st.items.filter(i => i.x > -10 * u && !i.got);
      st.clouds.forEach(c => { c.x -= dt * 0.03 * c.s; if (c.x < -0.3) { c.x = 1.2; c.y = rand(0.08, 0.5); } });
    },
    updateOver(dt, k) {
      st.vy = Math.min(220, st.vy + 500 * dt); st.y = Math.min(GYb - 3 * u, st.y + st.vy * u * dt * 0.6); st.rot = Math.min(1.4, st.rot + dt * 4);
    },
    draw(g, k) {
      const W = k.W, Hh = k.H, P = st.pal;
      let gr = g.createLinearGradient(0, 0, 0, GYb); gr.addColorStop(0, P.top); gr.addColorStop(1, P.bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, GYb);
      g.fillStyle = 'rgba(255,250,240,.45)';
      st.clouds.forEach(c => { const x = c.x * W, y = c.y * GYb, s = 14 * u * c.s; g.beginPath(); g.ellipse(x, y, s, s * 0.28, 0, 0, TAU); g.ellipse(x + s * 0.35, y - s * 0.14, s * 0.5, s * 0.24, 0, 0, TAU); g.fill(); });
      const off = st.t * 4 * u, tile = 60 * u;
      g.fillStyle = P.far;
      for (let i = Math.floor(off / tile) - 1; i < Math.floor(off / tile) + W / tile + 2; i++) {
        const r = mulberry(i * 31 + 5), x = i * tile - off, w = (24 + r() * 26) * u, h = (10 + r() * 22) * u;
        g.beginPath(); g.moveTo(x - h * 0.5, GYb); g.lineTo(x, GYb - h); g.lineTo(x + w, GYb - h); g.lineTo(x + w + h * 0.5, GYb); g.fill();
      }
      // courant
      const w = st.wind;
      if (w.state !== 'none') {
        const a = w.state === 'warn' ? 0.5 + 0.5 * Math.sin(k.time * 14) : 0.8;
        g.strokeStyle = 'rgba(255,255,255,' + (0.35 * a) + ')'; g.lineWidth = 2;
        for (let i = 0; i < 14; i++) {
          const x = (i * 97 + k.time * 60) % W, y0 = ((i * 53 + (w.dir > 0 ? 1 : -1) * k.time * 260) % GYb + GYb) % GYb;
          g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + w.dir * 22); g.stroke();
        }
        g.globalAlpha = a;
        k.text(w.dir < 0 ? 'Courant montant ↑' : 'Courant descendant ↓', W / 2, k.safeTop + 84, 17, '#FFFFFF', 'center', E.SANS, '900');
        g.globalAlpha = 1;
      }
      // trésors
      const PW = 17 * u;
      st.poles.forEach(p => drawPole(g, p, PW));
      st.items.forEach(it => { if (it.gold) { const gg = g.createRadialGradient(it.x, it.y, 0, it.x, it.y, 8 * u); gg.addColorStop(0, 'rgba(255,215,110,.6)'); gg.addColorStop(1, 'rgba(255,215,110,0)'); g.fillStyle = gg; g.fillRect(it.x - 8 * u, it.y - 8 * u, 16 * u, 16 * u); } pearl(g, it.x, it.y + Math.sin(k.time * 4 + it.x) * u, u * (it.gold ? 0.7 : 0.5), 0.4, it.gold ? '#FFD24A' : undefined, it.gold ? '#C77D12' : undefined); });
      // sol
      g.fillStyle = '#DCAC74'; g.fillRect(0, GYb, W, Hh - GYb);
      g.fillStyle = '#7A4E2D'; g.fillRect(0, GYb, W, 3);
      const zw = 6 * u, zo = (st.t * speed() * u) % (zw * 2);
      for (let x = -zo; x < W + zw * 2; x += zw * 2) {
        g.fillStyle = COL.lagon; g.beginPath(); g.moveTo(x, GYb + 5 * u); g.lineTo(x + zw / 2, GYb + 2.5 * u); g.lineTo(x + zw, GYb + 5 * u); g.fill();
        g.fillStyle = COL.ocre; g.beginPath(); g.moveTo(x + zw, GYb + 5 * u); g.lineTo(x + zw * 1.5, GYb + 2.5 * u); g.lineTo(x + zw * 2, GYb + 5 * u); g.fill();
      }
      drawPoisson(g, k);
    },
    hud(g, k) { k.scoreHUD(st.score, 'CORAUX', st.pearls ? '🐚 ' + st.pearls : null); },
    summary() {
      return { score: st.score, poles: st.poleCount, pearls: st.pearls, lines: ['🐠 ' + st.poleCount + ' corail' + (st.poleCount > 1 ? 'x' : '') + ' franchi' + (st.poleCount > 1 ? 's' : ''), '🐚 ' + st.pearls + ' perle' + (st.pearls > 1 ? 's' : '') + ' attrapée' + (st.pearls > 1 ? 's' : ''), '🌬️ ' + st.gusts + ' courant' + (st.gusts > 1 ? 's' : '') + ' encaissé' + (st.gusts > 1 ? 's' : '')] };
    }
  };

  function drawPole(g, p, PW) {
    const top = p.gy - p.gap / 2, bot = p.gy + p.gap / 2, seg = 13 * u;
    const segment = (y, i, flip) => {
      const c = p.cols[i % p.cols.length];
      g.fillStyle = c; g.fillRect(p.x, y, PW, seg);
      g.strokeStyle = 'rgba(11,29,42,.45)'; g.lineWidth = 2; g.strokeRect(p.x + 1, y + 1, PW - 2, seg - 2);
      g.fillStyle = 'rgba(255,255,255,.22)';
      const r0 = mulberry(Math.floor(p.seed) + i * 13);
      for (let j = 0; j < 4; j++) { const a = r0(), b = r0(); g.beginPath(); g.arc(p.x + PW * (0.2 + 0.6 * a), y + seg * (0.2 + 0.6 * b), PW * (0.05 + 0.06 * a), 0, TAU); g.fill(); }
    };
    let i = 0;
    for (let y = top - seg; y > -seg; y -= seg) segment(y, i++, true);
    i = 3;
    for (let y = bot; y < GYb; y += seg) segment(y, i++, false);
    // chapeaux (ailes) au bord du passage
    const cap = 2 * u, capH = 4.5 * u;
    [[top - capH, -1], [bot, 1]].forEach(([y, d]) => {
      g.fillStyle = '#0B1D2A'; rrect(g, p.x - cap, y, PW + cap * 2, capH, 3); g.fill();
      g.fillStyle = COL.or; g.beginPath();
      g.moveTo(p.x - cap, y + capH / 2); g.lineTo(p.x - cap - 4 * u, y + (d < 0 ? capH : 0)); g.lineTo(p.x, y + (d < 0 ? capH : 0)); g.fill();
      g.beginPath(); g.moveTo(p.x + PW + cap, y + capH / 2); g.lineTo(p.x + PW + cap + 4 * u, y + (d < 0 ? capH : 0)); g.lineTo(p.x + PW, y + (d < 0 ? capH : 0)); g.fill();
    });
  }

  function drawPoisson(g, k) {
    const s = u, y = st.y;
    g.save(); g.translate(EX, y);
    g.rotate(st.rot || clamp(st.vy / 260, -0.45, 0.6));
    const fin = st.flapT > 0 ? st.flapT / 0.25 : 0.3 + 0.2 * Math.sin(k.time * 8);
    g.fillStyle = '#E0553A'; g.beginPath(); g.moveTo(-4.5 * s, 0); g.lineTo(-8.5 * s, -3 * s - fin * 1.5 * s); g.lineTo(-8.5 * s, 3 * s + fin * 1.5 * s); g.closePath(); g.fill();
    g.fillStyle = '#FF8C42'; g.beginPath(); g.ellipse(0, 0, 5.5 * s, 3.6 * s, 0, 0, TAU); g.fill();
    g.fillStyle = '#FFFFFF'; g.fillRect(-1.6 * s, -3.3 * s, 1.4 * s, 6.6 * s); g.fillRect(2 * s, -2.9 * s, 1.1 * s, 5.8 * s);
    g.fillStyle = '#E86A2C'; g.beginPath(); g.moveTo(-1 * s, -3 * s); g.lineTo(-3 * s, -6 * s * fin - 1 * s); g.lineTo(2 * s, -3 * s); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(3.6 * s, -1 * s, 1.3 * s, 0, TAU); g.fill();
    g.fillStyle = '#0B1D2A'; g.beginPath(); g.arc(3.9 * s, -1 * s, 0.6 * s, 0, TAU); g.fill();
    g.restore();
  }

  (window.GOON_GAMES = window.GOON_GAMES || {}).poisson = {
    id: 'poisson', name: 'La Nage du Poisson-Lune', icon: '🐠', color: '#2E86C1', color2: '#FF7A59',
    tagline: 'Nage entre les coraux, défie les courants.', unit: 'coraux',
    perles: s => Math.min(100, s * 3),
    botScore: r => Math.round(2 + Math.pow(r, 1.6) * 34),
    tutorial: [['👆', '<b>Touche</b> pour donner un coup de nageoire et remonter'], ['↔️', 'Passe entre les coraux sans les toucher'], ['🌬️', 'Gare aux <b>courants</b> : ils te poussent vers le haut ou le bas'], ['🐚', 'Perle = +1 · perle dorée = +3']],
    badges: res => res.poles >= 20 ? ['poisson-volant'] : [],
    controller: E.make(def)
  };
})();
