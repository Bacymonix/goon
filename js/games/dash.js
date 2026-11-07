/* Goon — Abysse Dash (plateformes en rythme)
   Le trésor avance tout seul. Touche = saut (maintenir = sauts enchaînés).
   Anneaux dorés : touche en plein vol pour rebondir. Plaques bleues : super saut.
   Aléatoire : niveau généré à l'infini à partir de blocs tirés au sort, ambiance de couleurs, perles. */
(function () {
  'use strict';
  const E = window.GoonEngine;
  const { rand, randInt, pick, weighted, mulberry, rrect, pearl, COL, TAU } = E;
  let B = 34, GY = 500, PXT = 2.5, st = null, mus = null;
  const G = 51, V0 = 15.4, PAD = 21.6, ORB = 16;
  const PALS = [
    { bg1: '#2A0F2E', bg2: '#0E5A8A', mount: '#4A1A35', ground: '#1C0B1A', line: '#F2C14E' },
    { bg1: '#062A3A', bg2: '#FF7A59', mount: '#0A4152', ground: '#04161F', line: '#FFB4A2' },
    { bg1: '#1A0A05', bg2: '#0A3F63', mount: '#3A1508', ground: '#100604', line: '#3A8FC4' },
    { bg1: '#0B0E24', bg2: '#3B2E5A', mount: '#1B1B3A', ground: '#07081A', line: '#FF7A59' }
  ];
  // Blocs de niveau (lignes du haut vers le bas, la dernière ligne est posée au sol)
  // . vide  # bloc  ^ pic  o anneau  _ plaque  p perle
  const CHUNKS = [
    { t: 0, r: ['..^..'] },
    { t: 0, r: ['..^^...'] },
    { t: 0, r: ['..###...'] },
    { t: 0, r: ['...p..', '......', '...^..'] },
    { t: 1, r: ['..^^^..'] },
    { t: 1, r: ['....#...', '..###...'] },
    { t: 1, r: ['..#^^#....'] },
    { t: 1, r: ['....####..', '..##^^^^..'] },
    { t: 1, r: ['.._.^^^^......'] },
    { t: 2, r: ['.....o.....', '..^^^^^^^^.'] },
    { t: 2, r: ['......##....', '....##^^....', '..##^^^^##..'] },
    { t: 2, r: ['.._.^^^^......^^..'] },
    { t: 'rythme' }
  ];

  function reset() {
    st = { x: 0, y: 0, vy: 0, ground: true, rot: 0, tiles: [], genX: 10, pearls: 0, level: 1, V: 8.4, pal: pick(PALS), trail: [], dead: false, beat0: 0, lastLevelAt: 0 };
  }

  function addChunk() {
    const dist = st.x;
    const maxT = dist > 70 ? 2 : dist > 25 ? 1 : 0;
    const pool = CHUNKS.filter(c => c.t === 'rythme' ? dist > 40 : c.t <= maxT).map(c => ({ c, w: c.t === 'rythme' ? 1.2 : 1 + (c.t === maxT ? 1.2 : 0) }));
    const ch = weighted(pool).c;
    let x0 = st.genX;
    if (ch.t === 'rythme') {
      const n = randInt(3, 5), gap = Math.ceil(st.V * 0.6) + 2;
      for (let i = 0; i < n; i++) st.tiles.push({ x: x0 + 2 + i * gap, L: 0, c: '^' });
      if (Math.random() < 0.5) st.tiles.push({ x: x0 + 2 + gap, L: 2.4, c: 'p' });
      st.genX = x0 + 2 + n * gap;
    } else {
      const rows = ch.r, h = rows.length;
      let hasP = false, hazard = [];
      rows.forEach((row, ri) => {
        const L = h - 1 - ri;
        for (let ci = 0; ci < row.length; ci++) {
          const c = row[ci]; if (c === '.') continue;
          st.tiles.push({ x: x0 + ci, L, c });
          if (c === 'p') hasP = true;
          if (c === '^') hazard.push(ci);
        }
      });
      if (!hasP && hazard.length && Math.random() < 0.35) st.tiles.push({ x: x0 + hazard[Math.floor(hazard.length / 2)], L: h + 1.4, c: 'p' });
      st.genX = x0 + rows[0].length;
    }
    st.genX += Math.ceil(st.V * 0.45) + randInt(1, 4);
  }

  function solid(t) { return t.c === '#'; }

  function stepPhys(dt, k) {
    const p = st, prevY = p.y;
    p.x += p.V * dt;
    if (!p.ground) { p.vy -= G * dt; p.y += p.vy * dt; p.rot += dt * 5.2; }
    const near = p.tiles.filter(t => t.x > p.x - 2 && t.x < p.x + 2);
    const ox = t => t.x < p.x + 0.95 && t.x + 1 > p.x + 0.05;
    // atterrissage
    if (!p.ground && p.vy <= 0) {
      for (const t of near) {
        if (!solid(t) || !ox(t)) continue;
        const top = t.L + 1;
        if (prevY >= top - 0.08 && p.y <= top) { p.y = top; land(k); break; }
      }
      if (!p.ground && p.y <= 0) { p.y = 0; land(k); }
    }
    // marche dans le vide
    if (p.ground && p.y > 0) {
      if (!near.some(t => solid(t) && ox(t) && Math.abs(t.L + 1 - p.y) < 0.02)) { p.ground = false; p.vy = 0; }
    }
    // collisions mortelles
    const x0 = p.x + 0.06, x1 = p.x + 0.94, y0 = p.y + 0.06, y1 = p.y + 0.94;
    for (const t of near) {
      if (t.c === '#') { if (t.x < x1 && t.x + 1 > x0 && t.L < y1 && t.L + 1 > y0) return die(k); }
      else if (t.c === '^') { if (t.x + 0.3 < x1 && t.x + 0.7 > x0 && t.L < y1 && t.L + 0.55 > y0) return die(k); }
      else if (t.c === 'o' && !t.used) {
        const d = Math.hypot(p.x + 0.5 - (t.x + 0.5), p.y + 0.5 - (t.L + 0.5));
        if (d < 1 && k.time - k.pressT < 0.16 && !p.ground) { t.used = true; p.vy = ORB; k.pressT = -9; k.sfx('jump'); k.burst(sx(t.x + 0.5), sy(t.L + 0.5), [COL.or, '#D6F3FF'], 14, 0.6, 0, true); }
      } else if (t.c === '_') {
        if (t.x < x1 && t.x + 1 > x0 && p.y <= t.L + 0.35 && p.vy <= 0.01) { p.vy = PAD; p.ground = false; p.y = Math.max(p.y, t.L + 0.01); k.sfx('power'); }
      } else if (t.c === 'p' && !t.used) {
        if (Math.hypot(p.x + 0.5 - (t.x + 0.5), p.y + 0.5 - (t.L + 0.5)) < 0.9) { t.used = true; p.pearls++; k.sfx('coin'); k.popup(sx(t.x + 0.5), sy(t.L + 1), '+5', COL.or, 18); }
      }
    }
    // saut
    if (p.ground && (k.held || k.time - k.pressT < 0.12)) { p.vy = V0; p.ground = false; k.pressT = -9; k.sfx('jump'); }
  }
  function land(k) { st.ground = true; st.vy = 0; st.rot = Math.round(st.rot / (Math.PI / 2)) * (Math.PI / 2); }
  function die(k) {
    st.dead = true;
    k.burst(sx(st.x + 0.5), sy(st.y + 0.5), [COL.lagon, COL.ocre, COL.or, '#F4FAFD'], 34, 1.3, 400, true);
    k.over('Boum !'); stopMusic();
  }
  const sx = tx => (tx - (st.x - PXT)) * B;
  const sy = ty => GY - ty * B;

  /* ---- musique sonar (WebAudio) ---- */
  function startMusic(k) {
    stopMusic();
    const a = k.audio(); if (!a) return;
    const stepDur = 60 / 126 / 2, pat = [1, 0, 3, 0, 2, 0, 3, 1, 1, 0, 3, 0, 2, 3, 3, 0];
    let next = a.currentTime + 0.05, i = 0;
    const drum = (t, f0, f1, d, v) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02); };
    mus = setInterval(() => {
      while (next < a.currentTime + 0.12) {
        const v = pat[i % 16];
        if (v === 1) drum(next, 150, 55, 0.3, 0.32); else if (v === 2) drum(next, 220, 120, 0.22, 0.22); else if (v === 3) drum(next, 330, 220, 0.12, 0.12);
        else k.noise(0.04, 0.04, 6000, 'highpass', next - a.currentTime);
        next += stepDur; i++;
      }
    }, 25);
  }
  function stopMusic() { if (mus) { clearInterval(mus); mus = null; } }

  const def = {
    name: 'Abysse Dash',
    hint: 'Touche pour sauter · maintiens pour enchaîner',
    resize(k) { B = Math.min(k.W, k.H * 0.7) / 11; GY = k.H * 0.66; },
    init(k) { reset(); while (st.genX < 40) addChunk(); },
    begin(k) { startMusic(k); st.beat0 = k.time; },
    stop() { stopMusic(); },
    mute() { stopMusic(); },
    down(k) { },
    update(dt, k) {
      if (k.phase !== 'play') return;
      stepPhys(dt / 2, k); if (st.dead) return; stepPhys(dt / 2, k); if (st.dead) return;
      while (st.genX < st.x + 30) addChunk();
      st.tiles = st.tiles.filter(t => t.x > st.x - 6);
      const lvl = 1 + Math.floor(st.x / 60);
      if (lvl > st.level) {
        st.level = lvl; st.V = Math.min(11.5, 8.4 + (lvl - 1) * 0.55); st.pal = pick(PALS.filter(p => p !== st.pal));
        k.sfx('level'); k.popup(k.W / 2, k.H * 0.25, 'NIVEAU ' + lvl, '#FFFFFF', 34);
      }
      st.trail.unshift({ x: st.x, y: st.y, rot: st.rot }); if (st.trail.length > 7) st.trail.length = 7;
    },
    draw(g, k) {
      const W = k.W, Hh = k.H, P = st.pal, camX = st.x - PXT;
      const beat = 60 / 126, pulse = Math.max(0, 1 - (((k.time - st.beat0) % beat) / beat) * 3);
      let gr = g.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, P.bg1); gr.addColorStop(1, P.bg2);
      g.fillStyle = gr; g.fillRect(0, 0, W, GY);
      g.fillStyle = 'rgba(255,255,255,' + (0.05 * pulse) + ')'; g.fillRect(0, 0, W, GY);
      // montagnes marines (parallaxe)
      [[0.15, 9, 0.55, P.mount], [0.4, 5, 0.32, 'rgba(0,0,0,.25)']].forEach(([par, tw, hm, c]) => {
        const off = camX * B * par, tile = tw * B;
        for (let i = Math.floor(off / tile) - 1; i < Math.floor(off / tile) + W / tile + 2; i++) {
          const r = mulberry(i * 977 + tw), x = i * tile - off, h = (0.4 + r() * 0.6) * GY * hm;
          g.fillStyle = c; g.beginPath(); g.moveTo(x, GY); g.lineTo(x + tile / 2, GY - h); g.lineTo(x + tile, GY); g.fill();
          if (par < 0.2) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + tile * 0.25, GY - h * 0.5); g.lineTo(x + tile * 0.375, GY - h * 0.62); g.lineTo(x + tile * 0.5, GY - h * 0.5); g.lineTo(x + tile * 0.625, GY - h * 0.62); g.lineTo(x + tile * 0.75, GY - h * 0.5); g.stroke(); }
        }
      });
      // sol
      g.fillStyle = P.ground; g.fillRect(0, GY, W, Hh - GY);
      g.fillStyle = P.line; g.fillRect(0, GY, W, 3);
      g.globalAlpha = 0.25 + 0.2 * pulse;
      const zw = B * 0.6, zo = (camX * B) % (zw * 2);
      g.strokeStyle = P.line; g.lineWidth = 2; g.beginPath();
      for (let x = -zo - zw * 2; x < W + zw * 2; x += zw) g.lineTo(x, GY + B * 0.6 + ((Math.round((x + zo) / zw) % 2) ? -B * 0.25 : B * 0.25));
      g.stroke(); g.globalAlpha = 1;
      // tuiles
      st.tiles.forEach(t => {
        const x = sx(t.x), y = sy(t.L + 1);
        if (x < -B * 2 || x > W + B) return;
        if (t.c === '#') {
          g.fillStyle = COL.ocre; g.fillRect(x, y, B, B);
          g.strokeStyle = '#062A44'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, B - 2, B - 2);
          g.strokeStyle = 'rgba(246,235,221,.75)'; g.lineWidth = Math.max(1.5, B * 0.06); g.beginPath();
          for (let i = 0; i <= 4; i++) g.lineTo(x + B * (0.15 + i * 0.175), y + B * (i % 2 ? 0.38 : 0.62)); g.stroke();
        } else if (t.c === '^') {
          g.fillStyle = '#F4FAFD'; g.strokeStyle = P.line; g.lineWidth = 2;
          g.beginPath(); g.moveTo(x + B * 0.08, y + B); g.lineTo(x + B / 2, y + B * 0.12); g.lineTo(x + B * 0.92, y + B); g.closePath(); g.fill(); g.stroke();
          g.fillStyle = COL.ocre; g.beginPath(); g.moveTo(x + B * 0.32, y + B); g.lineTo(x + B / 2, y + B * 0.6); g.lineTo(x + B * 0.68, y + B); g.closePath(); g.fill();
        } else if (t.c === 'o' && !t.used) {
          const r = B * (0.3 + 0.05 * pulse);
          const gg = g.createRadialGradient(x + B / 2, y + B / 2, 0, x + B / 2, y + B / 2, B * 0.8); gg.addColorStop(0, 'rgba(255,220,120,.6)'); gg.addColorStop(1, 'rgba(255,220,120,0)');
          g.fillStyle = gg; g.fillRect(x - B * 0.3, y - B * 0.3, B * 1.6, B * 1.6);
          g.strokeStyle = COL.or; g.lineWidth = B * 0.12; g.beginPath(); g.arc(x + B / 2, y + B / 2, r, 0, TAU); g.stroke();
        } else if (t.c === '_') {
          g.fillStyle = COL.lagon; g.beginPath(); g.ellipse(x + B / 2, y + B, B * 0.45, B * 0.22, 0, Math.PI, TAU); g.fill();
          g.fillStyle = 'rgba(126,220,226,' + (0.3 + 0.3 * pulse) + ')'; g.beginPath(); g.moveTo(x + B * 0.2, y + B * 0.8); g.lineTo(x + B / 2, y + B * 0.35); g.lineTo(x + B * 0.8, y + B * 0.8); g.fill();
        } else if (t.c === 'p' && !t.used) {
          pearl(g, x + B / 2, y + B / 2 + Math.sin(k.time * 4 + t.x) * B * 0.08, B * 0.09, 0.5);
        }
      });
      // trainée + joueur
      if (!st.dead) {
        st.trail.forEach((tr, i) => { if (!i) return; g.globalAlpha = 0.25 * (1 - i / st.trail.length); g.fillStyle = COL.lagon; const s = B * (1 - i * 0.08); g.fillRect(sx(tr.x + 0.5) - s / 2, sy(tr.y + 0.5) - s / 2, s, s); });
        g.globalAlpha = 1;
        drawPlayer(g, sx(st.x + 0.5), sy(st.y + 0.5), st.rot);
      }
    },
    hud(g, k) {
      const dist = Math.max(0, Math.floor(st.x));
      k.scoreHUD(dist + st.pearls * 5, 'POINTS', 'Niveau ' + st.level + ' · ' + dist + ' blocs');
    },
    summary() {
      const d = Math.max(0, Math.floor(st.x));
      return { score: d + st.pearls * 5, dist: d, pearls: st.pearls, lines: ['🔺 ' + d + ' blocs parcourus', '🐚 ' + st.pearls + ' perle' + (st.pearls > 1 ? 's' : '') + ' (+5 chacune)', '🔥 Niveau ' + st.level + ' atteint'] };
    }
  };

  function drawPlayer(g, x, y, rot) {
    g.save(); g.translate(x, y); g.rotate(rot);
    const s = B;
    g.fillStyle = COL.lagon; rrect(g, -s / 2, -s / 2, s, s, s * 0.12); g.fill();
    g.strokeStyle = '#063F44'; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = COL.ocre; g.fillRect(-s / 2 + 2, -s / 2 + 2, s - 4, s * 0.18);
    g.fillStyle = '#fff'; g.fillRect(-s * 0.3, -s * 0.12, s * 0.2, s * 0.2); g.fillRect(s * 0.1, -s * 0.12, s * 0.2, s * 0.2);
    g.fillStyle = '#0B1D2A'; g.fillRect(-s * 0.22, -s * 0.06, s * 0.1, s * 0.12); g.fillRect(s * 0.18, -s * 0.06, s * 0.1, s * 0.12);
    g.strokeStyle = '#0B1D2A'; g.lineWidth = 2; g.beginPath();
    for (let i = 0; i <= 4; i++) g.lineTo(-s * 0.26 + i * s * 0.13, s * (0.22 + (i % 2 ? -0.06 : 0.04))); g.stroke();
    g.restore();
  }

  (window.GOON_GAMES = window.GOON_GAMES || {}).dash = {
    id: 'dash', name: 'Abysse Dash', icon: '🔺', color: '#E0553A', color2: '#3A8FC4',
    tagline: 'Saute en rythme sur le sonar.', unit: 'points',
    perles: s => Math.min(100, Math.round(s / 2)),
    botScore: r => Math.round(20 + Math.pow(r, 1.7) * 220),
    tutorial: [['👆', 'Le cube avance tout seul : <b>touche</b> pour sauter'], ['✊', '<b>Maintiens</b> pour enchaîner les sauts'], ['🔺', 'Évite les pics et ne te prends pas un bloc de face'], ['⭕', '<b>Anneau doré</b> : touche en plein vol pour rebondir · <b>plaque bleue</b> : super saut']],
    badges: res => res.dist >= 100 ? ['dasher'] : [],
    controller: E.make(def)
  };
})();
