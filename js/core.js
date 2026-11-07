/* Goon — cœur de l'appli : utilitaires, sauvegarde du joueur, classement (démo) */
(function () {
  'use strict';
  const C = window.GOON_CONFIG;
  const SALT = C.salt || 'goon';

  /* ---------- SHA-256 synchrone (pas de dépendance, marche aussi hors https) ---------- */
  function sha256(ascii) {
    function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
    const maxWord = Math.pow(2, 32);
    let result = '', i, j;
    const words = [];
    const bitLen = ascii.length * 8;
    let hash = sha256.h = sha256.h || [];
    const k = sha256.k = sha256.k || [];
    let primeCounter = k.length;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
      }
    }
    ascii += '\x80';
    while (ascii.length % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii.length; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return '';
      words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((bitLen / maxWord) | 0);
    words[words.length] = bitLen;
    for (j = 0; j < words.length;) {
      const w = words.slice(j, j += 16);
      const oldHash = hash;
      hash = hash.slice(0, 8);
      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
          (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
        const temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }
      for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }

  const normCode = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
  const codeHash = code => sha256(SALT + ':' + normCode(code));
  const pinHash = pin => sha256(SALT + '-pin:' + String(pin || '').trim());

  /* ---------- Dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const dayStr = d => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dayStr(d); };
  function eventDate(ev, which) {
    const hm = (which === 'end' && ev.end) ? ev.end : ev.start;
    const [h, mi] = hm.split(':').map(Number);
    const d = parseDay(ev.day); d.setHours(h, mi, 0, 0);
    if (which === 'end') {
      if (!ev.end) d.setHours(d.getHours() + 2);
      else if (ev.end < ev.start) d.setDate(d.getDate() + 1);
    }
    return d;
  }
  const parseDT = s => { if (!s) return NaN; const [d, t] = s.split('T'); const x = parseDay(d); if (t) { const [h, m] = t.split(':').map(Number); x.setHours(h, m || 0, 0, 0); } return x.getTime(); };

  /* ---------- Aléatoire déterministe ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n || 0).toLocaleString('fr-FR');
  const clanById = id => C.clans.find(c => c.id === id) || { id: '', name: 'Sans clan', short: '—', emoji: '🏕️', color: '#6A8494', motto: '' };

  /* ---------- Rangs & badges ---------- */
  const RANKS = [
    { min: 0, name: 'Moussaillon', icon: '⚓' },
    { min: 150, name: 'Plongeur', icon: '🤿' },
    { min: 400, name: 'Explorateur', icon: '🧭' },
    { min: 800, name: 'Chasseur d’épaves', icon: '⚔️' },
    { min: 1400, name: 'Gardien du Récif', icon: '🪸' },
    { min: 2200, name: 'Triton', icon: '🔱' },
    { min: 3500, name: 'Roi des Abysses', icon: '👑' }
  ];
  function rankOf(season) {
    let i = 0;
    RANKS.forEach((r, j) => { if (season >= r.min) i = j; });
    const r = RANKS[i], next = RANKS[i + 1];
    return Object.assign({}, r, { index: i, next, progress: next ? (season - r.min) / (next.min - r.min) : 1 });
  }

  const BADGES = [
    { id: 'premiere-fleche', icon: '🔱', name: 'Première flèche', desc: 'Termine ta première manche', bonus: 10 },
    { id: 'elite', icon: '🎯', name: "Harpon d'élite", desc: 'Fais 70 points ou plus en une manche', bonus: 40 },
    { id: 'oeil-faucon', icon: '🐠', name: 'Œil de Lynx', desc: "3 pleins centres d'affilée", bonus: 30 },
    { id: 'main-parfaite', icon: '✨', name: 'Main parfaite', desc: '5 pleins centres dans une manche', bonus: 100 },
    { id: 'perle-doree', icon: '🐚', name: 'Perle dorée', desc: 'Touche une perle dorée en plein vol', bonus: 20 },
    { id: 'explorateur', icon: '👣', name: 'Explorateur', desc: 'Trouve 3 trésors cachés', bonus: 40 },
    { id: 'gardien-trésors', icon: '🛡️', name: 'Gardien des Trésors', desc: 'Trouve tous les trésors cachés', bonus: 150 },
    { id: 'danseur', icon: '💃', name: 'Danseur des Vagues', desc: 'Valide ta présence à 3 événements', bonus: 50 },
    { id: 'sage', icon: '📜', name: 'Sage', desc: 'Accomplis 3 quêtes', bonus: 50 },
    { id: 'feu-eternel', icon: '🔥', name: 'Phare éternel', desc: '5 jours de suite au port', bonus: 60 },
    { id: 'reveur', icon: '🌀', name: 'Rêveur', desc: 'Fais tourner la Roue des Marées', bonus: 10 },
    { id: 'beni', icon: '🌟', name: 'Béni des Marées', desc: 'Décroche le jackpot de la Roue', bonus: 30 },
    { id: 'marchand', icon: '🎁', name: 'Marchand', desc: 'Échange tes perles au Comptoir', bonus: 15 },
    { id: 'coureur', icon: '🦀', name: 'Infatigable', desc: 'Course du Crabe : 1 000 points', bonus: 40 },
    { id: 'dasher', icon: '🔺', name: 'Rythme dans la peau', desc: 'Abysse Dash : 100 blocs parcourus', bonus: 40 },
    { id: 'poisson-volant', icon: '🐠', name: 'Poisson volant', desc: 'Nage du Poisson-Lune : 20 coraux franchis', bonus: 40 },
    { id: 'batisseur', icon: '🧱', name: 'Bâtisseur', desc: 'Tour de Corail : 25 étages', bonus: 40 },
    { id: 'touche-a-tout', icon: '🎮', name: 'Touche-à-tout', desc: 'Joue aux 5 jeux de l\'Arène', bonus: 50 },
    { id: 'sos', icon: '🛵', name: 'Client fidèle', desc: 'Passe ta première commande SOS', bonus: 15 }
  ];

  const AVATARS = ['🐠', '🐙', '🦈', '🐬', '🐢', '🦀', '🐳', '🦑', '🐡', '🦞', '🐚', '🐟', '🦭', '🐧', '🐋', '🦦'];

  /* ---------- Sauvegarde du joueur (localStorage) ---------- */
  const KEY = 'goon.v1';
  function rc(n) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const a = new Uint32Array(n); crypto.getRandomValues(a);
    let s = ''; for (let i = 0; i < n; i++) s += A[a[i] % A.length]; return s;
  }
  function fresh() {
    return {
      v: 1, id: 'p' + rc(8).toLowerCase(), createdAt: Date.now(),
      name: '', avatar: '🐠', clan: null,
      season: 0, wallet: 0, best: {}, bonusTries: 0, boost: 0, sound: true,
      daily: { date: '', best: {}, rounds: {} }, tries: { date: '', used: 0 }, played: {}, tuto: {},
      cart: [], orders: [], address: { place: '', room: '', details: '' }, sosRated: '',
      streak: { last: '', count: 0 }, wheel: { date: '', spins: 0 },
      codes: [], badges: [], vouchers: [], history: [], wrong: { count: 0, until: 0 },
      stats: { rounds: 0, arrows: 0, bulls: 0, pearls: 0, spins: 0 }
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw); const f = fresh();
        // migration des anciennes sauvegardes (un seul jeu)
        if (typeof d.best === 'number') d.best = { archer: d.best };
        if (d.daily && typeof d.daily.best === 'number') d.daily = { date: d.daily.date, best: { archer: d.daily.best }, rounds: { archer: d.daily.rounds || 0 } };
        if (d.stats && d.stats.rounds && !d.played) d.played = { archer: d.stats.rounds };
        return Object.assign(f, d, { stats: Object.assign(f.stats, d.stats || {}), address: Object.assign(f.address, d.address || {}) });
      }
    } catch (e) { /* stockage indisponible */ }
    return fresh();
  }

  const Store = {
    s: load(),
    onEvent: null,
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { } Net.syncProfile(); },
    emit(ev) { if (this.onEvent) this.onEvent(ev); },
    log(n, label, icon) { this.s.history.unshift({ t: Date.now(), n, label, icon: icon || '🐚' }); if (this.s.history.length > 60) this.s.history.length = 60; },
    earn(n, label, icon, opt) {
      opt = opt || {}; n = Math.round(n); if (!n) return 0;
      const before = rankOf(this.s.season).index;
      this.s.wallet += n;
      if (opt.season !== false) { this.s.season += n; Net.addClanPoints(this.s.clan, n); }
      this.log(n, label, icon);
      const after = rankOf(this.s.season);
      if (after.index > before) this.emit({ type: 'rank', rank: after });
      return n;
    },
    spend(n, label, icon) { if (this.s.wallet < n) return false; this.s.wallet -= n; this.log(-n, label, icon); return true; },
    rollDay() {
      const t = dayStr();
      if (this.s.tries.date !== t) this.s.tries = { date: t, used: 0 };
      if (this.s.wheel.date !== t) this.s.wheel = { date: t, spins: 0 };
    },
    freeLeft() { this.rollDay(); return Math.max(0, (C.dailyTries || 3) - this.s.tries.used); },
    triesLeft() { return this.freeLeft() + this.s.bonusTries; },
    useTry() {
      if (this.freeLeft() > 0) { this.s.tries.used++; return true; }
      if (this.s.bonusTries > 0) { this.s.bonusTries--; return true; }
      return false;
    },
    wheelLeft() { this.rollDay(); return Math.max(0, (C.wheel.maxPerDay || 3) - this.s.wheel.spins); },
    award(id) {
      if (this.s.badges.includes(id)) return false;
      const b = BADGES.find(x => x.id === id); if (!b) return false;
      this.s.badges.push(id);
      this.emit({ type: 'badge', badge: b });
      if (b.bonus) this.earn(b.bonus, 'Badge : ' + b.name, b.icon);
      return true;
    },
    addVoucher(o) {
      const v = { id: 'v' + Date.now().toString(36) + rc(3), code: 'GOON-' + rc(4) + '-' + rc(4), title: o.title, icon: o.icon || '🎁', desc: o.desc || '', source: o.source || '', rewardId: o.rewardId || '', at: Date.now(), used: false, usedAt: 0 };
      this.s.vouchers.unshift(v);
      return v;
    },
    checkStreak() {
      const t = dayStr(), st = this.s.streak;
      if (st.last === t) return null;
      st.count = (st.last === addDays(t, -1)) ? st.count + 1 : 1;
      st.last = t;
      const R = C.streakRewards || [10, 15, 20, 25, 40, 50, 75];
      const reward = R[Math.min(st.count, R.length) - 1];
      const next = R[Math.min(st.count + 1, R.length) - 1];
      this.earn(reward, 'Feu de port — jour ' + st.count, '🔥');
      if (st.count >= 5) this.award('feu-eternel');
      this.save();
      return { count: st.count, reward, next };
    },
    rollDaily() { const t = dayStr(); if (this.s.daily.date !== t) this.s.daily = { date: t, best: {}, rounds: {} }; return this.s.daily; },
    featured() { const o = window.GOON_GAME_ORDER || []; return o.length ? o[hashStr('jeu' + dayStr()) % o.length] : null; },
    countKind(kind) { return this.s.codes.filter(id => { const x = C.codes.find(y => y.id === id); return x && x.kind === kind; }).length; },
    redeem(raw) {
      const s = this.s, now = Date.now();
      if (now < s.wrong.until) return { err: 'Trop de codes faux. Réessaie dans ' + Math.ceil((s.wrong.until - now) / 1000) + ' s.' };
      const n = normCode(raw);
      if (n.length < 3) return { err: 'Entre un code valide.' };
      const h = codeHash(n);
      const c = (C.codes || []).find(x => x.hash === h);
      if (!c) {
        s.wrong.count++;
        if (s.wrong.count >= 5) { s.wrong.count = 0; s.wrong.until = now + 60000; }
        this.save();
        return { err: 'Code inconnu… les marées ne le reconnaissent pas.' };
      }
      s.wrong.count = 0;
      if (s.codes.includes(c.id)) { this.save(); return { err: 'Tu as déjà utilisé ce code.', code: c }; }
      if (c.from && now < parseDT(c.from)) return { err: "Ce code n'est pas encore actif. Patience !" };
      if (c.until && now > parseDT(c.until)) return { err: 'Ce code a expiré.' };
      s.codes.push(c.id);
      const icon = { event: '🎉', quete: '📜', trésor: '✨', bonus: '🎁' }[c.kind] || '🔑';
      this.earn(c.perles || 0, c.title || 'Code secret', icon);
      if (c.tries) s.bonusTries += c.tries;
      const totalTrésors = C.codes.filter(x => x.kind === 'trésor').length;
      const trésors = this.countKind('trésor');
      if (c.kind === 'trésor') { if (trésors >= 3) this.award('explorateur'); if (trésors >= totalTrésors) this.award('gardien-trésors'); }
      if (c.kind === 'event' && this.countKind('event') >= 3) this.award('danseur');
      if (c.kind === 'quete' && this.countKind('quete') >= 3) this.award('sage');
      this.save();
      return { ok: true, code: c, trésors, totalTrésors };
    },
    reset() { try { localStorage.removeItem(KEY); } catch (e) { } }
  };

  /* ---------- Classement : mode DÉMO (joueurs simulés) ----------
     firebase.js remplace ces fonctions quand le mode en ligne est activé. */
  const BOT_NAMES = ['Léa', 'Hugo', 'Inès', 'Théo', 'Camille', 'Lucas', 'Manon', 'Nathan', 'Chloé', 'Enzo', 'Jade', 'Louis',
    'Sarah', 'Maxime', 'Clara', 'Tom', 'Zoé', 'Antoine', 'Emma', 'Jules', 'Lina', 'Paul', 'Margaux', 'Yanis',
    'Alice', 'Romain', 'Lou', 'Adam', 'Juliette', 'Mathis', 'Anaïs', 'Gabin', 'Elsa', 'Noah', 'Rose', 'Sacha'];

  const Net = {
    mode: 'demo',
    _l: new Set(),
    on(f) { this._l.add(f); },
    emit() { this._l.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },
    _bots() {
      const s = Store.s, t = dayStr();
      const origin = (s.createdAt || Date.now()) - 30 * 36e5;
      const hours = Math.min(240, Math.max(0, (Date.now() - origin) / 36e5));
      return BOT_NAMES.map((nm, i) => {
        const r = mulberry32(hashStr('bot' + nm + i));
        const base = 20 + Math.floor(r() * 140), rate = 1.5 + r() * 7.5;
        const ini = String.fromCharCode(65 + Math.floor(r() * 26));
        const avatar = AVATARS[Math.floor(r() * AVATARS.length)];
        return { id: 'b' + i, name: nm + ' ' + ini + '.', avatar, clan: C.clans[i % C.clans.length].id, season: Math.floor(base + rate * hours) };
      });
    },
    me() { const s = Store.s; return { id: 'me', name: s.name, avatar: s.avatar, clan: s.clan, season: s.season, me: true }; },
    players() {
      const list = this._bots();
      if (Store.s.clan) list.push(this.me());
      return list.sort((a, b) => b.season - a.season);
    },
    clanTotals() {
      const out = {}; C.clans.forEach(c => { out[c.id] = { total: 0, members: 0 }; });
      this.players().forEach(p => { if (out[p.clan]) { out[p.clan].total += p.season; out[p.clan].members++; } });
      return out;
    },
    daily(game) {
      const s = Store.s, t = dayStr(), meta = (window.GOON_GAMES || {})[game];
      const list = this._bots().map((b, i) => {
        const rd = mulberry32(hashStr(t + game + b.name));
        const played = rd() < 0.55;
        return played && meta ? Object.assign(b, { score: meta.botScore(rd()) }) : null;
      }).filter(Boolean);
      if (s.clan && s.daily.date === t && (s.daily.rounds[game] || 0) > 0) list.push(Object.assign(this.me(), { score: s.daily.best[game] || 0 }));
      return list.sort((a, b) => b.score - a.score);
    },
    syncProfile() { }, addClanPoints() { }, pushDaily() { }, joinClan() { },
    claimStock() { return Promise.resolve(true); },
    stockLeft() { return null; }
  };

  window.GOON = { C, sha256, normCode, codeHash, pinHash, pad, dayStr, parseDay, addDays, eventDate, parseDT, mulberry32, hashStr, esc, fmt, clanById, RANKS, rankOf, BADGES, AVATARS, Store, Net, rc };
})();
