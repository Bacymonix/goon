/* Goon — La Tour de Corail
   Les blocs glissent : touche pour les poser. Ce qui dépasse tombe.
   3 placements parfaits d'affilée = le bloc s'élargit.
   Aléatoire : vitesse, côté d'arrivée, visages d'animaux, blocs dorés, courants qui accélèrent le bloc. */
(function () {
  'use strict';
  const E = window.GoonEngine;
  const { rand, pick, mulberry, mixColor, rrect, COL, TAU, clamp, lerp } = E;
  let BH = 30, baseW = 220, G0 = 600, st = null;
  const COLS = ['#0E5A8A', '#FF7A59', '#F2C14E', '#56709C', '#7A4E2D', '#0A3F63', '#E86A4C', '#2F7D57', '#3A8FC4'];
  const FACES = ['dauphin', 'pieuvre', 'requin', 'tortue', 'baleine'];
  const SKY = [[0, '#2F86B8', '#7CC6E0'], [18, '#0E5A8A', '#5BB3D6'], [36, '#141B3A', '#3B2E5A'], [60, '#05060F', '#141B3A']];

  function skyAt(h) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (h <= b[0]) { const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1); return [mixColor(a[1], b[1], t), mixColor(a[2], b[2], t)]; }
    }
    return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]];
  }

  function reset(k) {
    st = { blocks: [], mov: null, cam: 0, score: 0, perfects: 0, combo: 0, maxCombo: 0, debris: [], zoom: 1, lastCol: null, stars: Array.from({ length: 50 }, () => [Math.random(), Math.random(), Math.random()]) };
    st.base = { x: k.W / 2 - baseW / 2, w: baseW };
    spawn(k);
  }
  const topBlock = () => st.blocks.length ? st.blocks[st.blocks.length - 1] : st.base;
  const scr = i => G0 - (i + 1) * BH + st.cam; // haut du bloc i à l'écran

  function spawn(k) {
    const prev = topBlock(), n = st.blocks.length, f = k.W / 375;
    let col; do { col = pick(COLS); } while (col === st.lastCol);
    st.lastCol = col;
    const dir = n === 0 ? 1 : (Math.random() < 0.6 ? -st.mov.dir : (Math.random() < 0.5 ? 1 : -1));
    const w = prev.w;
    st.mov = {
      w, dir, col, face: pick(FACES), gold: n >= 3 && Math.random() < 0.1,
      speed: Math.min(430, (150 + n * 6) * rand(0.82, 1.18)) * Math.max(0.8, Math.min(1.6, f)),
      x: dir > 0 ? -w * 0.4 : k.W - w * 0.6, t: 0,
      gust: n >= 5 && Math.random() < 0.14 ? { at: rand(0.4, 1.2), dur: 0.7, on: false } : null
    };
  }

  function drop(k) {
    const m = st.mov, prev = topBlock(), i = st.blocks.length;
    const ov0 = Math.max(m.x, prev.x), ov1 = Math.min(m.x + m.w, prev.x + prev.w);
    const y = scr(i);
    if (ov1 - ov0 <= 1) {
      st.debris.push({ x: m.x, y, w: m.w, h: BH, vx: m.dir * 60, vy: 0, rot: 0, vr: m.dir * 2, col: m.col });
      st.mov = null; k.over('Patatras !'); return;
    }
    const tol = Math.max(4, prev.w * 0.035);
    let b;
    if (Math.abs(m.x - prev.x) <= tol) {
      st.combo++; st.perfects++; st.maxCombo = Math.max(st.maxCombo, st.combo);
      let w = prev.w, x = prev.x;
      if (st.combo >= 3 && w < baseW) { const grow = Math.min(baseW - w, baseW * 0.07); w += grow; x -= grow / 2; }
      b = { x, w, col: m.col, face: m.face, gold: m.gold };
      const bonus = m.gold ? 3 : 1;
      st.score += 1 + bonus;
      k.sfx('perfect'); k.buzz(20);
      k.popup(k.W / 2, y - 10, m.gold ? 'OR PARFAIT +' + (1 + bonus) : (st.combo >= 3 ? 'PARFAIT ×' + st.combo : 'PARFAIT !'), m.gold ? COL.or : '#FFFFFF', m.gold ? 26 : 22);
      k.burst(x + w / 2, y + BH / 2, m.gold ? [COL.or, '#D6F3FF'] : ['#FFFFFF', COL.lagon], 14, 0.6, 300);
      b.ring = 1;
    } else {
      st.combo = 0;
      b = { x: ov0, w: ov1 - ov0, col: m.col, face: m.face, gold: false };
      if (m.x < prev.x) st.debris.push({ x: m.x, y, w: prev.x - m.x, h: BH, vx: -50, vy: -40, rot: 0, vr: -2.5, col: m.col });
      else st.debris.push({ x: ov1, y, w: m.x + m.w - ov1, h: BH, vx: 50, vy: -40, rot: 0, vr: 2.5, col: m.col });
      st.score += 1;
      k.sfx('thud');
    }
    st.blocks.push(b);
    spawn(k);
  }

  const def = {
    name: 'La Tour de Corail',
    hint: 'Touche pour poser le bloc · vise le parfait',
    resize(k) { BH = clamp(k.H * 0.052, 24, 42); baseW = Math.min(k.W * 0.6, 260); G0 = k.H * 0.8; if (st) { const dx = (k.W / 2 - baseW / 2) - st.base.x; st.base.x += dx; } },
    init(k) { reset(k); },
    down(k) { if (st.mov) drop(k); },
    update(dt, k) {
      const m = st.mov;
      if (m && (k.phase === 'play' || k.phase === 'intro')) {
        m.t += dt;
        let sp = m.speed;
        if (m.gust && m.t > m.gust.at && m.t < m.gust.at + m.gust.dur) { sp *= 1.7; m.gust.on = true; } else if (m.gust) m.gust.on = false;
        m.x += m.dir * sp * dt;
        const minX = -m.w * 0.45, maxX = k.W - m.w * 0.55;
        if (m.x < minX) { m.x = minX; m.dir = 1; } if (m.x > maxX) { m.x = maxX; m.dir = -1; }
      }
      const target = Math.max(0, (st.blocks.length + 2) * BH - k.H * 0.42);
      st.cam = lerp(st.cam, target, Math.min(1, dt * 5));
      upd(dt);
    },
    updateOver(dt, k) {
      upd(dt);
      const towerH = (st.blocks.length + 2) * BH;
      const z = Math.min(1, (k.H * 0.62) / towerH);
      st.zoom = lerp(st.zoom, z, Math.min(1, dt * 3));
      st.cam = lerp(st.cam, 0, Math.min(1, dt * 3));
    },
    overDelay: 1.8,
    draw(g, k) {
      const W = k.W, Hh = k.H, n = st.blocks.length;
      const [top, bot] = skyAt(n * Math.min(1, st.zoom * 1.2));
      const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, top); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
      const night = clamp((n - 26) / 14, 0, 1);
      if (night > 0) { g.fillStyle = 'rgba(255,255,240,' + (0.8 * night) + ')'; st.stars.forEach(s => g.fillRect(s[0] * W, s[1] * Hh * 0.8, 1.2 + s[2] * 1.5, 1.2 + s[2] * 1.5)); }
      g.save();
      if (st.zoom < 0.999) { g.translate(W / 2, G0); g.scale(st.zoom, st.zoom); g.translate(-W / 2, -G0); }
      // décor au sol
      const gy = G0 + st.cam;
      if (gy < Hh / Math.min(1, st.zoom) + 200) {
        const r = mulberry(11);
        g.fillStyle = '#2C6A86';
        for (let i = 0; i < 4; i++) { const x = (i + r() * 0.6) / 4 * W, w = (0.15 + r() * 0.15) * W, h = (0.05 + r() * 0.08) * Hh; g.beginPath(); g.moveTo(x - h * 0.6, gy + BH); g.lineTo(x, gy + BH - h); g.lineTo(x + w, gy + BH - h); g.lineTo(x + w + h * 0.6, gy + BH); g.fill(); }
        g.fillStyle = '#DCAC74'; g.fillRect(-W, gy + BH, W * 3, Hh * 3);
        g.fillStyle = '#7A4E2D'; g.fillRect(-W, gy + BH, W * 3, 3);
      }
      // socle
      g.fillStyle = '#1B3B52'; rrect(g, st.base.x - 10, gy, st.base.w + 20, BH, 6); g.fill();
      g.fillStyle = COL.or; g.font = '900 ' + Math.round(BH * 0.42) + 'px ' + E.SANS; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('LA GOON', st.base.x + st.base.w / 2, gy + BH / 2 + 1);
      st.blocks.forEach((b, i) => { drawBlock(g, b.x, scr(i), b.w, b, k); if (b.ring > 0) { b.ring -= 0.03; g.strokeStyle = 'rgba(255,255,255,' + b.ring + ')'; g.lineWidth = 3; g.strokeRect(b.x - (1 - b.ring) * 14, scr(i) - (1 - b.ring) * 8, b.w + (1 - b.ring) * 28, BH + (1 - b.ring) * 16); } });
      if (st.mov) drawBlock(g, st.mov.x, scr(n), st.mov.w, st.mov, k);
      st.debris.forEach(d => { g.save(); g.translate(d.x + d.w / 2, d.y + d.h / 2); g.rotate(d.rot); drawBlock(g, -d.w / 2, -d.h / 2, d.w, { col: d.col, face: null }, k); g.restore(); });
      g.restore();
      if (st.mov && st.mov.gust && st.mov.gust.on) k.text('Courant !', W / 2, k.safeTop + 86, 18, '#FFFFFF', 'center', E.SANS, '900');
    },
    hud(g, k) { k.scoreHUD(st.score, 'POINTS', st.blocks.length + ' étage' + (st.blocks.length > 1 ? 's' : '') + (st.combo >= 2 ? ' · combo ×' + st.combo : '')); },
    summary() {
      return { score: st.score, floors: st.blocks.length, perfects: st.perfects, lines: ['🗼 ' + st.blocks.length + ' étage' + (st.blocks.length > 1 ? 's' : ''), '✨ ' + st.perfects + ' placement' + (st.perfects > 1 ? 's' : '') + ' parfait' + (st.perfects > 1 ? 's' : ''), '🔥 Meilleur combo ×' + st.maxCombo] };
    }
  };

  function upd(dt) {
    st.debris.forEach(d => { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; });
    st.debris = st.debris.filter(d => d.y < 4000);
  }

  function drawBlock(g, x, y, w, b, k) {
    const col = b.gold ? '#F2C14E' : b.col;
    g.fillStyle = col; g.fillRect(x, y, w, BH);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, w, BH * 0.18);
    g.fillStyle = 'rgba(11,29,42,.28)'; g.fillRect(x, y + BH * 0.8, w, BH * 0.2);
    g.strokeStyle = 'rgba(246,235,221,.7)'; g.lineWidth = Math.max(1.5, BH * 0.06); g.beginPath();
    const zz = BH * 0.32; let j = 0;
    for (let zx = x + 2; zx <= x + w - 2; zx += zz / 2) g.lineTo(zx, y + BH * (j++ % 2 ? 0.84 : 0.95)); g.stroke();
    g.strokeStyle = 'rgba(11,29,42,.5)'; g.lineWidth = 1.5; g.strokeRect(x + 0.75, y + 0.75, w - 1.5, BH - 1.5);
    if (b.gold) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + 0.2 * Math.sin(k.time * 8)) + ')'; g.fillRect(x, y, w, BH * 0.8); }
    if (!b.face || w < BH * 1.1) return; g.fillStyle = 'rgba(255,255,255,.35)'; for (let q = 0; q < 3; q++) { g.beginPath(); g.arc(x + w * (0.25 + q * 0.25), y + BH * (0.4 + (q % 2) * 0.15), BH * (0.08 + q * 0.02), 0, TAU); g.fill(); } return;
    const cx = x + w / 2, ey = y + BH * 0.36, es = BH * 0.13, gap = Math.min(w * 0.18, BH * 0.42);
    g.fillStyle = '#F4FAFD';
    g.beginPath(); g.ellipse(cx - gap, ey, es * 1.3, es, 0, 0, TAU); g.ellipse(cx + gap, ey, es * 1.3, es, 0, 0, TAU); g.fill();
    g.fillStyle = '#0B1D2A'; g.beginPath(); g.arc(cx - gap, ey, es * 0.55, 0, TAU); g.arc(cx + gap, ey, es * 0.55, 0, TAU); g.fill();
    const my = y + BH * 0.62;
    if (b.face === 'dauphin') { g.fillStyle = COL.or; g.beginPath(); g.moveTo(cx - BH * 0.14, my - BH * 0.12); g.lineTo(cx + BH * 0.14, my - BH * 0.12); g.lineTo(cx, my + BH * 0.1); g.closePath(); g.fill(); }
    else if (b.face === 'pieuvre') { g.fillStyle = '#0B1D2A'; g.beginPath(); g.arc(cx, my - BH * 0.06, BH * 0.07, 0, TAU); g.fill(); g.strokeStyle = '#0B1D2A'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, my, BH * 0.1, 0.2, Math.PI - 0.2); g.stroke(); }
    else if (b.face === 'requin') { g.fillStyle = '#0B1D2A'; g.beginPath(); g.moveTo(cx - BH * 0.08, my - BH * 0.08); g.lineTo(cx + BH * 0.08, my - BH * 0.08); g.lineTo(cx, my + BH * 0.04); g.fill(); g.fillStyle = '#F4FAFD'; for (let t = -2; t <= 2; t++) g.fillRect(cx + t * BH * 0.07 - 1, my + BH * 0.06, 2, BH * 0.06); }
    else if (b.face === 'tortue') { g.strokeStyle = '#0B1D2A'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - BH * 0.14, my); g.quadraticCurveTo(cx, my + BH * 0.1, cx + BH * 0.14, my); g.stroke(); }
    else { g.strokeStyle = '#EAF4F8'; g.lineWidth = 2; g.beginPath(); g.arc(cx - gap - es * 1.6, ey - es, es * 1.2, Math.PI * 0.6, Math.PI * 1.4); g.stroke(); g.beginPath(); g.arc(cx + gap + es * 1.6, ey - es, es * 1.2, -Math.PI * 0.4, Math.PI * 0.4); g.stroke(); g.fillStyle = '#0B1D2A'; g.fillRect(cx - BH * 0.1, my - BH * 0.02, BH * 0.2, BH * 0.06); }
  }

  (window.GOON_GAMES = window.GOON_GAMES || {}).stack = {
    id: 'stack', name: 'La Tour de Corail', icon: '🧱', art: 'trésor', color: '#56709C', color2: '#F2C14E',
    tagline: 'Empile les coraux, remonte vers la surface.', unit: 'points',
    perles: s => Math.min(100, s * 3),
    botScore: r => Math.round(4 + Math.pow(r, 1.4) * 38),
    tutorial: [['👆', '<b>Touche</b> pour poser le bloc qui glisse'], ['✂️', 'Ce qui dépasse tombe : ton trésor s\'affine…'], ['✨', '<b>Parfait</b> = bonus · 3 parfaits d\'affilée = le bloc s\'élargit'], ['🌟', 'Bloc doré posé parfaitement = +3 · attention aux courants !']],
    badges: res => res.floors >= 25 ? ['batisseur'] : [],
    controller: E.make(def)
  };
})();
