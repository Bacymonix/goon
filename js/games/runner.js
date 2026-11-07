/* Goon — La Course du Crabe (course infinie)
   Touche = saut (maintenir = plus haut) · glisser vers le bas = se baisser / retomber vite.
   Aléatoire : obstacles, raies à 3 hauteurs, perles, bonus (bulle-bouclier, perle dorée), cycle jour/nuit. */
(function () {
  'use strict';
  const E = window.GoonEngine;
  const { rand, randInt, pick, weighted, mulberry, mixColor, rrect, pearl, COL, TAU, clamp } = E;
  let S = 4, GY = 400, PX = 60, st = null;
  const BW = 14, BH = 10, DUCKH = 6;
  const SKY = [[0, '#0E6BA8', '#6CC1DF'], [0.42, '#0E6BA8', '#6CC1DF'], [0.5, '#0E5A8A', '#5BB3D6'], [0.57, '#141B3A', '#3B2E5A'], [0.87, '#141B3A', '#3B2E5A'], [0.94, '#3A8FC4', '#9ED8EC'], [1, '#0E6BA8', '#6CC1DF']];

  function skyAt(p) {
    for (let i = 0; i < SKY.length - 1; i++) {
      const a = SKY[i], b = SKY[i + 1];
      if (p >= a[0] && p <= b[0]) { const t = (p - a[0]) / (b[0] - a[0] || 1); return [mixColor(a[1], b[1], t), mixColor(a[2], b[2], t)]; }
    }
    return [SKY[0][1], SKY[0][2]];
  }
  const dayPhase = () => ((st.t + st.dayOff * 60) / 60) % 1;
  const nightAmt = p => p < 0.5 ? 0 : p < 0.57 ? (p - 0.5) / 0.07 : p < 0.87 ? 1 : p < 0.94 ? 1 - (p - 0.87) / 0.07 : 0;

  function reset() {
    st = {
      x: 0, t: 0, speed: 55, y: 0, vy: 0, ground: true, holdT: 0, duck: 0, fast: false, obs: [], items: [],
      nextObs: 75, nextItem: 50, pearls: 0, bonus: 0, mult: 1, multT: 0, shield: false, inv: 0, legT: 0,
      dayOff: Math.random(), meters: 0, nextMile: 250, dead: false, rot: 0,
      stars: Array.from({ length: 40 }, () => [Math.random(), Math.random() * 0.8, Math.random()])
    };
  }

  function spawnObstacle(k) {
    const m = st.meters;
    const o = weighted([
      { t: 'rock', w: 3 }, { t: 'corail', w: 3 }, { t: 'fire', w: m > 60 ? 2 : 0 }, { t: 'corail2', w: m > 140 ? 2 : 0 },
      { t: 'log', w: m > 220 ? 1.4 : 0 }, { t: 'ray', w: m > 170 ? 2.4 : 0 }
    ].filter(x => x.w > 0));
    const dims = { rock: [9, 6], corail: [6, 12], corail2: [13, 10], fire: [9, 7], log: [17, 5], ray: [11, 6] }[o.t];
    const ob = { t: o.t, x: st.nextObs, w: dims[0], h: dims[1], y: 0, seed: Math.random() * 100 };
    if (o.t === 'ray') { const alt = weighted([{ y: 2, w: 2 }, { y: 8.5, w: 2 }, { y: 16, w: 1.4 }]); ob.y = alt.y; }
    st.obs.push(ob);
    const minGap = st.speed * 0.72 + 14;
    st.nextObs += ob.w + minGap * rand(1, 1.75);
  }

  function spawnItems() {
    const x = st.nextItem;
    const r = Math.random();
    if (r < 0.08) st.items.push({ t: pick(['gold', 'shield']), x, y: 11 });
    else if (r < 0.55) { for (let i = 0; i < 4; i++) st.items.push({ t: 'f', x: x + i * 6, y: 3 }); }
    else { [7, 14, 18, 14, 7].forEach((h, i) => st.items.push({ t: 'f', x: x + i * 6, y: h })); }
    st.nextItem += rand(70, 150);
  }

  const def = {
    name: 'La Course du Crabe',
    hint: 'Touche pour sauter · glisse vers le bas pour te baisser',
    resize(k) { S = Math.min(k.W, k.H * 0.8) / 100; GY = k.H * 0.72; PX = 16 * S; },
    init(k) { reset(); },
    down(k) {
      if (st.ground) { st.vy = 165; st.ground = false; st.holdT = 0; st.duck = 0; st.fast = false; k.sfx('jump'); }
    },
    swipe(k) { if (!st.ground) { st.fast = true; st.vy = Math.min(st.vy, -40); } else st.duck = 0.6; },
    update(dt, k) {
      st.legT += dt * (k.phase === 'play' ? st.speed / 9 : 3);
      if (k.phase !== 'play') return;
      st.t += dt;
      st.speed = Math.min(122, 55 + st.t * 1.15);
      const dx = st.speed * dt; st.x += dx; st.meters += dx / 6;
      if (!st.ground) {
        let g = 560;
        if (k.held && st.holdT < 0.22 && st.vy > 0) { g *= 0.42; st.holdT += dt; }
        if (st.fast) g *= 2.2;
        st.vy -= g * dt; st.y += st.vy * dt;
        if (st.y <= 0) { st.y = 0; st.vy = 0; st.ground = true; st.fast = false; k.burst(PX + 7 * S, GY, ['#C9A06C', '#E3C08E'], 5, 0.4, 500); }
      }
      if (st.duck > 0) st.duck -= dt;
      if (st.multT > 0) { st.multT -= dt; if (st.multT <= 0) st.mult = 1; }
      if (st.inv > 0) st.inv -= dt;
      const ahead = st.x + k.W / S + 20;
      while (st.nextObs < ahead) spawnObstacle(k);
      while (st.nextItem < ahead) spawnItems();

      const duck = st.duck > 0 && st.ground;
      const px0 = st.x + 2.5, px1 = st.x + BW - 2.5, py0 = st.y, py1 = st.y + (duck ? DUCKH : BH) - 0.8;
      for (const o of st.obs) {
        if (o.t === 'ray') o.x -= 12 * dt;
        if (o.hit) continue;
        const ox0 = o.x + 1, ox1 = o.x + o.w - 1, oy0 = o.y + 0.3, oy1 = o.y + o.h - 0.8;
        if (ox1 > px0 && ox0 < px1 && oy1 > py0 && oy0 < py1) {
          if (st.inv > 0) continue;
          if (st.shield) {
            st.shield = false; st.inv = 1.2; o.hit = true; k.sfx('thud'); k.shake = 0.4;
            k.popup(PX + 7 * S, GY - 22 * S, 'Sauvé par l\'bulle-bouclier !', COL.lagon, 18);
            k.burst(PX + 7 * S, GY - 5 * S, [COL.lagon, '#fff'], 18, 0.8);
            continue;
          }
          st.dead = true; k.over('Aïe !'); return;
        }
      }
      for (const it of st.items) {
        if (it.got) continue;
        if (it.x + 2 > px0 && it.x - 2 < px1 && it.y + 2 > py0 && it.y - 2 < py1 + 1) {
          it.got = true;
          const sx = PX + (it.x - st.x) * S, sy = GY - it.y * S;
          if (it.t === 'f') { st.pearls++; st.bonus += 10 * st.mult; k.sfx('coin'); k.popup(sx, sy - 10, '+' + 10 * st.mult, COL.or, 18); }
          else if (it.t === 'gold') { st.mult = 2; st.multT = 7; k.sfx('power'); k.popup(sx, sy - 10, 'Points ×2 !', COL.or, 26); k.burst(sx, sy, [COL.or, '#D6F3FF'], 20, 0.8); }
          else { st.shield = true; k.sfx('power'); k.popup(sx, sy - 10, 'Bulle-bouclier !', COL.lagon, 24); k.burst(sx, sy, [COL.lagon, '#FFFFFF'], 20, 0.8); }
        }
      }
      st.obs = st.obs.filter(o => o.x + o.w > st.x - 40);
      st.items = st.items.filter(i => i.x > st.x - 40 && !(i.got && i.x < st.x));
      if (st.meters >= st.nextMile) { k.sfx('level'); k.popup(k.W / 2, k.H * 0.28, st.nextMile + ' m !', '#FFFFFF', 34); st.nextMile += 250; }
    },
    updateOver(dt) { st.rot = Math.min(1.6, st.rot + dt * 5); },
    draw(g, k) {
      const W = k.W, Hh = k.H, p = dayPhase(), n = nightAmt(p), [top, bot] = skyAt(p);
      let gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, top); gr.addColorStop(1, bot);
      g.fillStyle = gr; g.fillRect(0, 0, W, GY + 1);
      if (n > 0) { g.fillStyle = 'rgba(255,255,240,' + (0.8 * n) + ')'; st.stars.forEach(s => { g.fillRect(s[0] * W, s[1] * GY, 1.5 + s[2], 1.5 + s[2]); }); }
      // soleil / lune
      const day = p < 0.55, q = day ? p / 0.55 : (p - 0.55) / 0.45;
      const cx = W * (0.15 + 0.7 * q), cy = GY - Math.sin(q * Math.PI) * GY * 0.6;
      g.fillStyle = day ? '#D6F3FF' : '#F1EEDC'; g.beginPath(); g.arc(cx, cy, 6 * S, 0, TAU); g.fill();
      if (!day) { g.fillStyle = top; g.beginPath(); g.arc(cx + 2.4 * S, cy - 1.4 * S, 5.4 * S, 0, TAU); g.fill(); }
      // récifs lointaines
      const off1 = st.x * 0.15 * S, tile = 70 * S;
      g.fillStyle = mixColor('#2C6A86', '#3B2E5A', n * 0.7);
      for (let i = Math.floor(off1 / tile) - 1; i < Math.floor(off1 / tile) + W / tile + 2; i++) {
        const r = mulberry(i * 7919 + 3), w = (30 + r() * 26) * S, h = (8 + r() * 16) * S, x = i * tile - off1 + r() * 14 * S, sl = h * 0.5;
        g.beginPath(); g.moveTo(x - sl, GY); g.lineTo(x, GY - h); g.lineTo(x + w, GY - h); g.lineTo(x + w + sl, GY); g.closePath(); g.fill();
      }
      // collines proches
      g.fillStyle = mixColor('#1D4E66', '#2A2140', n * 0.7);
      g.beginPath(); g.moveTo(0, GY);
      for (let x = 0; x <= W + 8; x += 8) { const hx = x / S + st.x * 0.4; g.lineTo(x, GY - S * (4 + 2.6 * Math.sin(hx * 0.05) + 1.6 * Math.sin(hx * 0.13 + 1.7))); }
      g.lineTo(W, GY); g.closePath(); g.fill();
      // sol
      gr = g.createLinearGradient(0, GY, 0, Hh); gr.addColorStop(0, mixColor('#E9C696', '#5B4A6B', n * 0.6)); gr.addColorStop(1, mixColor('#B67647', '#2B2340', n * 0.6));
      g.fillStyle = gr; g.fillRect(0, GY, W, Hh - GY);
      g.fillStyle = mixColor('#7A4E2D', '#1B1530', n * 0.5); g.fillRect(0, GY, W, Math.max(2, 0.6 * S));
      const zw = 6 * S, zo = (st.x * S) % (zw * 2);
      for (let x = -zo; x < W + zw * 2; x += zw * 2) {
        g.fillStyle = COL.lagon; g.beginPath(); g.moveTo(x, GY + 5 * S); g.lineTo(x + zw / 2, GY + 2.6 * S); g.lineTo(x + zw, GY + 5 * S); g.fill();
        g.fillStyle = COL.or; g.beginPath(); g.moveTo(x + zw, GY + 5 * S); g.lineTo(x + zw * 1.5, GY + 2.6 * S); g.lineTo(x + zw * 2, GY + 5 * S); g.fill();
      }
      g.fillStyle = 'rgba(90,55,25,.35)';
      const ptile = 23 * S, poff = st.x * S;
      for (let i = Math.floor(poff / ptile); i < Math.floor(poff / ptile) + W / ptile + 2; i++) {
        const r = mulberry(i * 131 + 7); g.fillRect(i * ptile - poff + r() * ptile, GY + (8 + r() * 20) * S, (0.6 + r()) * S, 0.5 * S);
      }
      if (n > 0) { g.fillStyle = 'rgba(20,18,50,' + (0.18 * n) + ')'; g.fillRect(0, 0, W, Hh); }
      st.obs.forEach(o => drawObs(g, k, o));
      st.items.forEach(it => {
        if (it.got) return;
        const sx = PX + (it.x - st.x) * S, sy = GY - it.y * S + Math.sin(k.time * 4 + it.x) * 0.6 * S;
        if (it.t === 'f') pearl(g, sx, sy, S * 0.42, 0.5);
        else if (it.t === 'gold') { glow(g, sx, sy, 6 * S, 'rgba(255,215,110,.6)'); pearl(g, sx, sy, S * 0.7, 0.3, '#FFD24A', '#C77D12'); }
        else { glow(g, sx, sy, 6 * S, 'rgba(20,179,190,.5)'); bubbleShield(g, sx, sy, 3 * S, k.time); }
      });
      drawCrabe(g, k);
    },
    hud(g, k) {
      k.scoreHUD(Math.floor(st.meters) + st.bonus, 'POINTS', Math.floor(st.meters) + ' m');
      let y = k.safeTop + 90;
      if (st.mult > 1) { k.text('×2 · ' + Math.ceil(st.multT) + ' s', k.W / 2, y, 16, COL.or, 'center', E.SANS, '900'); y += 20; }
      if (st.shield) k.text('🫧 Bulle-bouclier actif', k.W / 2, y, 14, '#BFF3F6', 'center', E.SANS, '900');
    },
    summary() {
      const m = Math.floor(st.meters);
      return { score: m + st.bonus, meters: m, pearls: st.pearls, lines: ['🦀 ' + m + ' m parcourus', '🐚 ' + st.pearls + ' perle' + (st.pearls > 1 ? 's' : '') + ' ramassée' + (st.pearls > 1 ? 's' : '')] };
    }
  };

  function glow(g, x, y, r, c) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  function bubbleShield(g, x, y, r, t) {
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(0.8, 'rgba(160,220,255,.15)'); gr.addColorStop(1, 'rgba(160,220,255,.45)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = Math.max(1.5, r * 0.08); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.4, r * 0.18, r * 0.1, -0.6, 0, TAU); g.fill();
  }

  function drawObs(g, k, o) {
    const x = PX + (o.x - st.x) * S, w = o.w * S, h = o.h * S, base = GY - o.y * S;
    if (x > k.W + 40 || x + w < -40) return;
    if (o.hit) g.globalAlpha = 0.35;
    if (o.t === 'rock') {
      g.fillStyle = '#6A8494';
      g.beginPath(); g.moveTo(x, base); g.lineTo(x + w * 0.12, base - h * 0.7); g.lineTo(x + w * 0.45, base - h); g.lineTo(x + w * 0.85, base - h * 0.75); g.lineTo(x + w, base); g.closePath(); g.fill();
      g.fillStyle = '#A8917E'; g.beginPath(); g.moveTo(x + w * 0.2, base - h * 0.6); g.lineTo(x + w * 0.45, base - h * 0.92); g.lineTo(x + w * 0.55, base - h * 0.5); g.closePath(); g.fill();
    } else if (o.t === 'corail' || o.t === 'corail2') {
      const one = (cx, hh) => {
        g.fillStyle = '#F2707F'; rrect(g, cx - 1.6 * S, base - hh, 3.2 * S, hh, 1.6 * S); g.fill();
        rrect(g, cx - 4 * S, base - hh * 0.75, 1.6 * S, hh * 0.38, 0.8 * S); g.fill(); g.fillRect(cx - 4 * S, base - hh * 0.45, 3 * S, 1.3 * S);
        rrect(g, cx + 2.4 * S, base - hh * 0.62, 1.6 * S, hh * 0.32, 0.8 * S); g.fill(); g.fillRect(cx + 1 * S, base - hh * 0.36, 3 * S, 1.3 * S);
        g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(cx - 0.4 * S, base - hh + S, 0.5 * S, hh - 2 * S);
      };
      if (o.t === 'corail') one(x + w / 2, h); else { one(x + w * 0.3, h); one(x + w * 0.75, h * 0.75); }
    } else if (o.t === 'fire') {
      g.fillStyle = '#6B4226'; g.save(); g.translate(x + w / 2, base - S);
      g.rotate(0.35); g.fillRect(-w / 2, -S, w, 2 * S); g.rotate(-0.7); g.fillRect(-w / 2, -S, w, 2 * S); g.restore();
      for (let i = 0; i < 3; i++) {
        const fh = h * (0.75 + 0.25 * Math.sin(k.time * 18 + i * 2 + o.seed)), fx = x + w * (0.25 + i * 0.25);
        g.fillStyle = i === 1 ? COL.or : COL.ocreL;
        g.beginPath(); g.moveTo(fx - 2 * S, base - 1.5 * S); g.quadraticCurveTo(fx - 1.5 * S, base - fh * 0.6, fx, base - fh); g.quadraticCurveTo(fx + 1.5 * S, base - fh * 0.6, fx + 2 * S, base - 1.5 * S); g.closePath(); g.fill();
      }
    } else if (o.t === 'log') {
      g.fillStyle = '#7A4E2D'; rrect(g, x, base - h, w, h, h / 2); g.fill();
      g.fillStyle = '#C9A06C'; g.beginPath(); g.ellipse(x + w - h * 0.3, base - h / 2, h * 0.3, h * 0.45, 0, 0, TAU); g.fill();
      g.strokeStyle = '#5A3218'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + h * 0.6, base - h * 0.35); g.lineTo(x + w * 0.6, base - h * 0.35); g.stroke();
    } else if (o.t === 'ray') {
      const cy = base - h / 2, cx = x + w / 2, flap = Math.sin(k.time * 12 + o.seed) * 0.9;
      g.fillStyle = '#0B1D2A';
      g.beginPath(); g.moveTo(cx - S, cy); g.lineTo(cx - 6 * S, cy - 4 * S * flap - 0.5 * S); g.lineTo(cx + 2 * S, cy - 0.5 * S); g.closePath(); g.fill();
      g.beginPath(); g.ellipse(cx, cy, 4 * S, 1.8 * S, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(cx + S, cy); g.lineTo(cx + 5 * S, cy - 4 * S * flap + 0.5 * S); g.lineTo(cx + 3 * S, cy + 0.5 * S); g.closePath(); g.fill();
      g.fillStyle = '#D9826B'; g.beginPath(); g.arc(cx - 4.2 * S, cy - 0.6 * S, 1.3 * S, 0, TAU); g.fill();
      g.fillStyle = COL.or; g.beginPath(); g.moveTo(cx - 5.4 * S, cy - 0.6 * S); g.lineTo(cx - 6.6 * S, cy); g.lineTo(cx - 5.2 * S, cy + 0.1 * S); g.fill();
    }
    g.globalAlpha = 1;
  }

  function drawCrabe(g, k) {
    const s = S, duck = st.duck > 0 && st.ground && !st.dead;
    const bx = PX + 7 * s, by = GY - st.y * s;
    if (st.mult > 1) glow(g, bx, by - 5 * s, 12 * s, 'rgba(255,210,90,.55)');
    if (st.inv > 0 && Math.floor(k.time * 12) % 2) g.globalAlpha = 0.45;
    g.save(); g.translate(bx, by);
    if (st.dead) g.rotate(-st.rot * 0.6); else if (!st.ground) g.rotate(-clamp(st.vy / 900, -0.25, 0.25));
    if (duck) g.scale(1.1, 0.62);
    const run = st.ground && !st.dead;
    g.strokeStyle = '#8E1F14'; g.lineWidth = 1.1 * s; g.lineCap = 'round';
    [-5, -3.2, 3.2, 5].forEach((lx, i) => {
      const sw = run ? Math.sin(st.legT * 1.4 + i * 1.3) * 1.2 * s : 0;
      g.beginPath(); g.moveTo(lx * 0.6 * s, -3 * s); g.lineTo(lx * s + sw, -1.6 * s); g.lineTo(lx * s * 1.1 + sw, 0); g.stroke();
    });
    g.fillStyle = '#D9412B'; g.beginPath(); g.ellipse(0, -4.6 * s, 6.2 * s, 3.6 * s, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-1.5 * s, -6 * s, 2.6 * s, 1 * s, -0.2, 0, TAU); g.fill();
    const cl = run ? Math.sin(st.legT * 2) * 0.3 : 0.2;
    [[-1, -6.5], [1, 6.5]].forEach(([d, cx]) => {
      g.strokeStyle = '#D9412B'; g.lineWidth = 1.2 * s; g.beginPath(); g.moveTo(d * 4.5 * s, -6 * s); g.lineTo(cx * s, -8.5 * s); g.stroke();
      g.fillStyle = '#E5533A'; g.beginPath(); g.arc(cx * s, -9.5 * s, 1.9 * s, -Math.PI * 0.1 + cl, Math.PI * 1.6 - cl); g.lineTo(cx * s, -9.5 * s); g.fill();
    });
    g.strokeStyle = '#8E1F14'; g.lineWidth = 0.6 * s;
    [-1.4, 1.4].forEach(ex => {
      g.beginPath(); g.moveTo(ex * s, -7.6 * s); g.lineTo(ex * s * 1.2, -10.2 * s); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex * s * 1.2, -10.6 * s, 1 * s, 0, TAU); g.fill();
      g.fillStyle = '#000'; g.beginPath(); g.arc(ex * s * 1.2 + 0.25 * s, -10.6 * s, 0.45 * s, 0, TAU); g.fill();
    });
    g.restore(); g.globalAlpha = 1;
    if (st.shield) { g.globalAlpha = 0.55 + 0.25 * Math.sin(k.time * 6); bubbleShield(g, bx, by - 6 * s, 9 * s, k.time); g.globalAlpha = 1; }
  }

  (window.GOON_GAMES = window.GOON_GAMES || {}).runner = {
    id: 'runner', name: 'La Course du Crabe', icon: '🦀', color: '#7A4E2D', color2: '#F2C14E',
    tagline: 'Saute, baisse-toi, ne t\'arrête jamais.', unit: 'points',
    perles: s => Math.min(100, Math.round(s / 10)),
    botScore: r => Math.round(120 + Math.pow(r, 1.5) * 1100),
    tutorial: [['👆', '<b>Touche</b> pour sauter (maintiens pour sauter plus haut)'], ['👇', '<b>Glisse vers le bas</b> pour te baisser ou retomber vite'], ['🐟', 'Les raies nagent à 3 hauteurs : saute, baisse-toi… ou passe dessous'], ['🫧', '<b>Bulle-bouclier</b> = bouclier · <b>perle dorée</b> = points ×2']],
    badges: res => res.score >= 1000 ? ['coureur'] : [],
    controller: E.make(def)
  };
})();
