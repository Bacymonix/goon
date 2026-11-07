/* Goon — interface de l'appli */
(function () {
  'use strict';
  const T = window.GOON;
  const { C, Store, Net, rankOf, BADGES, AVATARS, dayStr, parseDay, eventDate, parseDT, pinHash, esc, fmt, clanById, pad } = T;
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const PEARL = '<svg class="ico-perle" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="currentColor"/><circle cx="9" cy="9" r="2.6" fill="#fff" opacity=".65"/></svg>';
  const WD = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const MO = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const TRESOR_COLORS = ['#0E5A8A', '#FF7A59', '#2E86C1', '#56709C', '#0A3F63', '#E86A4C'];

  let current = 'accueil';
  const ui = { planningDay: null, planningFilter: 'all', boardTab: 'équipage', dailyGame: null };
  let deferredPrompt = null;
  let wheelRot = 0;

  const fmtDay = d => { const x = parseDay(d); return WD[x.getDay()] + '. ' + x.getDate() + ' ' + MO[x.getMonth()]; };
  const fmtTime = ts => { const d = new Date(ts); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' à ' + pad(d.getHours()) + 'h' + pad(d.getMinutes()); };
  const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');

  /* =========================== NAVIGATION =========================== */
  const GAMES = window.GOON_GAMES, ORDER = window.GOON_GAME_ORDER;
  const VIEWS = { accueil: viewHome, planning: viewPlanning, arene: viewArene, classement: viewClassement, sos: viewSOS, comptoir: viewComptoir };
  let SOS = null;
  function viewSOS() { return SOS ? SOS.view() : ''; }

  function go(name) {
    if (!VIEWS[name]) name = 'accueil';
    current = name;
    if (location.hash !== '#' + name) history.replaceState(null, '', location.pathname + location.search + '#' + name);
    render();
    window.scrollTo(0, 0); const ap = document.getElementById("app"); if (ap) ap.scrollTop = 0;
  }
  function render() {
    const tab = current === 'classement' ? 'arene' : current;
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.go === tab));
    $('#view').innerHTML = '<section class="view" data-view="' + current + '">' + VIEWS[current]() + '</section>';
    renderHeader();
  }
  let lastWallet = null;
  function renderHeader() {
    const s = Store.s, w = $('#hdr-wallet');
    if (lastWallet !== null && lastWallet !== s.wallet) {
      const pill = w.closest('.wallet-pill'); pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump');
    }
    w.textContent = fmt(s.wallet); lastWallet = s.wallet;
    $('#hdr-avatar').textContent = s.avatar || '🦊';
  }

  /* ============================== ACCUEIL ============================== */
  function hello() { const h = new Date().getHours(); return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Salut' : 'Bonsoir'; }
  function myPos() { return Net.players().findIndex(p => p.me) + 1; }

  function countdownInfo() {
    const now = Date.now(), start = parseDT(C.campaignStart), vote = parseDT(C.voteDate), end = parseDT(C.voteEnd || C.voteDate);
    if (now < start) return { label: 'La campagne commence dans', t: start };
    if (now < vote) return { label: 'Le vote ouvre dans', t: vote };
    if (now < end) return { label: 'Le vote est ouvert ! Il ferme dans', t: end, live: true };
    return { label: 'Merci l’équipage ❤️', t: 0 };
  }
  function cdHTML(t) {
    const d = Math.max(0, t - Date.now());
    const v = [[Math.floor(d / 864e5), 'jours'], [Math.floor(d / 36e5) % 24, 'h'], [Math.floor(d / 6e4) % 60, 'min'], [Math.floor(d / 1e3) % 60, 's']];
    return v.map(([n, l]) => '<span><b>' + pad(n) + '</b><i>' + l + '</i></span>').join('');
  }
  function countdownCard() {
    const c = countdownInfo();
    return '<div class="countdown ' + (c.live ? 'live' : '') + '"><p>' + c.label + '</p>' +
      (c.t ? '<div class="cd" data-cd="' + c.t + '">' + cdHTML(c.t) + '</div>' : '') +
      '<small>' + esc(C.voteText || '') + '</small></div>';
  }

  function nextEvents(n) {
    const now = Date.now();
    return C.planning.filter(e => eventDate(e, 'end').getTime() > now).sort((a, b) => eventDate(a, 'start') - eventDate(b, 'start')).slice(0, n);
  }

  function installCard() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    let dismissed = false; try { dismissed = !!localStorage.getItem('goon.noinstall'); } catch (e) { }
    if (standalone || dismissed) return '';
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (!deferredPrompt && !ios) return '';
    return '<div class="card install"><span class="inst-ico">📲</span><div><b>Installe l\'appli</b><small>' +
      (ios ? 'Touche <b>Partager</b> puis « Sur l\'écran d\'accueil ».' : 'Accès direct depuis ton écran d\'accueil.') + '</small></div>' +
      (deferredPrompt ? '<button class="btn sm" data-action="install">Installer</button>' : '') +
      '<button class="x" data-action="noinstall" aria-label="Masquer">×</button></div>';
  }

  function viewHome() {
    const s = Store.s, cl = clanById(s.clan), rk = rankOf(s.season), pos = myPos(), left = Store.triesLeft();
    const nx = nextEvents(2);
    return '' +
      '<div class="hello"><div><p class="eyebrow">' + hello() + ',</p><h1 class="h1">' + esc(s.name) + '</h1>' +
      '<span class="clan-chip" style="--c:' + cl.color + '">' + cl.emoji + ' ' + esc(cl.name) + '</span></div>' +
      '<button class="big-avatar" data-action="profile" style="--c:' + cl.color + '" aria-label="Mon profil">' + s.avatar + '</button></div>' +
      countdownCard() +
      '<div class="stats3">' +
      '<button class="stat" data-go="comptoir"><b>' + fmt(s.wallet) + '</b><span>perles en poche</span></button>' +
      '<button class="stat" data-go="classement" data-board="équipage"><b>' + (pos ? '#' + pos : '—') + '</b><span>dans l’équipage</span></button>' +
      '<button class="stat" data-action="streak-info"><b>' + s.streak.count + '<small>🔥</small></b><span>' + (s.streak.count > 1 ? 'jours' : 'jour') + ' au port</span></button></div>' +
      '<div class="card rank" data-action="profile"><div class="rank-ico">' + rk.icon + '</div><div class="rank-main">' +
      '<div class="rank-top"><b>' + rk.name + '</b><span>' + fmt(s.season) + ' ' + PEARL + ' gagnées</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(rk.progress * 100) + '%"></i></div>' +
      '<small>' + (rk.next ? 'Encore <b>' + fmt(rk.next.min - s.season) + '</b> perles pour devenir ' + rk.next.icon + ' ' + rk.next.name : 'Rang maximal atteint. Respect.') + '</small></div></div>' +
      '<div class="quick3">' +
      '<button class="quick q-ocre" data-go="arene"><span class="q-ico">🎮</span><b>Jouer</b><small>' + (left ? plural(left, 'manche') : 'Entraînement') + '</small></button>' +
      '<button class="quick q-lagon" data-action="code"><span class="q-ico">🔑</span><b>Code secret</b><small>+ de perles</small></button>' +
      '<button class="quick q-dark" data-go="sos"><span class="q-ico">🛵</span><b>SOS</b><small>Livré chez toi</small></button></div>' +
      (SOS ? SOS.homeBanner() : '') +
      installCard() +
      (nx.length ? '<h2 class="h2">Prochains rendez-vous <a href="#planning" data-go="planning">Planning →</a></h2>' + nx.map(e => eventCard(e, true)).join('') : '') +
      '<h2 class="h2">Guerre des clans <a href="#classement" data-go="classement" data-board="clans">Voir →</a></h2>' + clanBars() +
      '<h2 class="h2">Le Sonar</h2>' +
      C.news.map(n => '<article class="card news"><time>' + fmtDay(n.date) + '</time><h3>' + esc(n.title) + '</h3><p>' + esc(n.text) + '</p></article>').join('');
  }

  function clanBars() {
    const tot = Net.clanTotals();
    const arr = C.clans.map(c => Object.assign({}, c, tot[c.id])).sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...arr.map(c => c.total));
    return '<div class="card clanbars">' + arr.map((c, i) =>
      '<div class="cb ' + (c.id === Store.s.clan ? 'mine' : '') + '"><span class="cb-pos">' + (i + 1) + '</span><span class="cb-e">' + c.emoji + '</span><div class="cb-main">' +
      '<div class="cb-top"><b>' + esc(c.short) + (c.id === Store.s.clan ? ' <em>· ton clan</em>' : '') + '</b><span>' + fmt(c.total) + '</span></div>' +
      '<div class="cb-bar"><i style="width:' + Math.max(4, c.total / max * 100) + '%;background:' + c.color + '"></i></div></div></div>').join('') + '</div>';
  }

  /* ============================== PLANNING ============================== */
  function eventCard(e, compact) {
    const TY = C.eventTypes[e.type] || { label: '', color: '#0E5A8A', icon: '•' };
    const now = Date.now(), st = eventDate(e, 'start').getTime(), en = eventDate(e, 'end').getTime();
    const live = now >= st && now <= en, past = now > en;
    const code = e.code && C.codes.find(c => c.id === e.code);
    const done = code && Store.s.codes.includes(code.id);
    return '<article class="ev ' + (past ? 'past ' : '') + (compact ? 'compact' : '') + '" style="--c:' + TY.color + '"' + (compact ? ' data-go="planning" data-day="' + e.day + '"' : '') + '>' +
      '<div class="ev-time"><b>' + e.start + '</b>' + (e.end ? '<span>' + e.end + '</span>' : '') + '</div>' +
      '<div class="ev-card"><div class="ev-tags"><span class="tag">' + TY.icon + ' ' + TY.label + '</span>' +
      (live ? '<span class="tag live">● En cours</span>' : '') + (compact ? '<span class="tag ghost">' + fmtDay(e.day) + '</span>' : '') + '</div>' +
      '<h3>' + esc(e.title) + '</h3><p class="ev-place">📍 ' + esc(e.place) + '</p>' +
      (!compact && e.desc ? '<p class="ev-desc">' + esc(e.desc) + '</p>' : '') +
      '<div class="ev-foot">' +
      (code ? (done ? '<span class="reward done">✓ Présence validée</span>' : '<span class="reward">+' + code.perles + ' ' + PEARL + ' si tu viens</span>') : '<span></span>') +
      (!compact ? '<button class="link-btn" data-action="ics" data-id="' + e.id + '">📅 Agenda</button>' : '') +
      '</div></div></article>';
  }

  function viewPlanning() {
    const days = Array.from(new Set(C.planning.map(e => e.day))).sort(), today = dayStr();
    if (!ui.planningDay || !days.includes(ui.planningDay)) ui.planningDay = days.includes(today) ? today : (days.find(d => d >= today) || days[0]);
    const types = C.eventTypes;
    const evs = C.planning.filter(e => e.day === ui.planningDay && (ui.planningFilter === 'all' || e.type === ui.planningFilter))
      .sort((a, b) => a.start.localeCompare(b.start));
    return '<h1 class="h1 title">Le Planning</h1>' +
      '<p class="lead">Une semaine de campagne, un max d\'événements. Viens, récupère le code sur place et gagne des perles.</p>' +
      '<div class="days">' + days.map(d => { const dt = parseDay(d); return '<button class="day ' + (d === ui.planningDay ? 'on ' : '') + (d === today ? 'today' : '') + '" data-action="day" data-day="' + d + '"><small>' + WD[dt.getDay()] + '</small><b>' + dt.getDate() + '</b><i>' + MO[dt.getMonth()] + '</i></button>'; }).join('') + '</div>' +
      '<div class="filters">' + ['all'].concat(Object.keys(types)).map(k => '<button class="chip ' + (ui.planningFilter === k ? 'on' : '') + '" data-action="filter" data-f="' + k + '">' + (k === 'all' ? 'Tout' : types[k].icon + ' ' + types[k].label) + '</button>').join('') + '</div>' +
      '<div class="timeline">' + (evs.length ? evs.map(e => eventCard(e, false)).join('') : '<div class="empty">Rien de ce type ce jour-là… repos du guerrier 😴</div>') + '</div>';
  }

  function downloadICS(e) {
    const f = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
    const x = s => String(s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const st = eventDate(e, 'start'), en = eventDate(e, 'end');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Goon//BDS//FR', 'BEGIN:VEVENT', 'UID:' + e.id + '@goon', 'DTSTAMP:' + stamp,
      'DTSTART:' + f(st), 'DTEND:' + f(en), 'SUMMARY:' + x(e.title + ' — Goon'), 'LOCATION:' + x(e.place), 'DESCRIPTION:' + x(e.desc), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = 'goon-' + e.id + '.ics'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* =============================== ARÈNE =============================== */
  function trésorSVG(color) {
    if (!color) return '<svg viewBox="0 0 40 64" class="trésor-svg off"><rect x="4" y="22" width="32" height="28" rx="5" fill="currentColor" opacity=".14"/><text x="20" y="42" text-anchor="middle" font-size="18" font-weight="900" fill="currentColor" opacity=".45">?</text></svg>';
    return '<svg viewBox="0 0 40 64" class="trésor-svg"><rect x="4" y="30" width="32" height="20" rx="3" fill="' + color + '"/><path d="M4 30a16 12 0 0 1 32 0z" fill="' + color + '"/><path d="M4 30h32" stroke="#0B1D2A" stroke-width="2"/><rect x="17" y="26" width="6" height="9" rx="1.5" fill="#F2C14E" stroke="#0B1D2A" stroke-width="1.5"/><circle cx="12" cy="14" r="3" fill="#fff" opacity=".7"/><circle cx="27" cy="9" r="2" fill="#fff" opacity=".6"/><circle cx="20" cy="4" r="1.5" fill="#fff" opacity=".5"/></svg>';
  }

  function codeForm(id) {
    return '<form class="code-form" autocomplete="off"><input name="code" ' + (id ? 'id="' + id + '" ' : '') + 'placeholder="Ex : PLONGEE" autocapitalize="characters" spellcheck="false" maxlength="24" aria-label="Code secret"><button class="btn">Valider</button></form><p class="code-msg" aria-live="polite"></p>';
  }

  function rangeOf(kind) {
    const v = C.codes.filter(c => c.kind === kind).map(c => c.perles);
    if (!v.length) return '';
    const a = Math.min(...v), b = Math.max(...v); return a === b ? String(a) : a + '–' + b;
  }

  const SHORT = { archer: 'Harpon', runner: 'Crabe', dash: 'Dash', poisson: 'Poisson', stack: 'Trésor' };
  function subnav(cur) {
    return '<div class="subnav"><button class="' + (cur === 'arene' ? 'on' : '') + '" data-go="arene">🎮 Jeux</button><button class="' + (cur === 'classement' ? 'on' : '') + '" data-go="classement">🏆 Classement</button></div>';
  }
  function gameArt(m) { return m.art === 'trésor' ? trésorSVG(m.color) : '<span>' + m.icon + '</span>'; }
  function gameCard(id) {
    const m = GAMES[id], s = Store.s, d = Store.rollDaily(), feat = Store.featured() === id;
    const best = s.best[id] || 0, today = d.rounds[id] ? (d.best[id] || 0) : null;
    const rank = today != null ? Net.daily(id).findIndex(p => p.me) + 1 : 0;
    return '<button class="gcard' + (feat ? ' feat' : '') + '" data-action="play" data-game="' + id + '" style="--c:' + m.color + ';--c2:' + m.color2 + '">' +
      '<span class="gc-ico">' + gameArt(m) + '</span><span class="gc-txt">' +
      (feat ? '<em class="gc-feat">⭐ Jeu du jour · perles ×' + String(C.featuredBoost || 1).replace('.', ',') + '</em>' : '') +
      '<b>' + esc(m.name) + '</b><small>' + esc(m.tagline) + '</small>' +
      '<span class="gc-meta">' + (today != null ? 'Auj. <b>' + fmt(today) + '</b>' + (rank ? ' · #' + rank : '') : 'Pas encore joué aujourd\'hui') + (best ? ' · Record <b>' + fmt(best) + '</b>' : '') + '</span></span>' +
      '<span class="gc-play" aria-hidden="true">▶</span></button>';
  }
  function triesCard() {
    const s = Store.s, free = Store.freeLeft(), left = Store.triesLeft(), max = C.dailyTries;
    return '<div class="card tries-card"><div class="row-between"><b>Manches à perles</b><span class="tries-l">' + (left ? plural(left, 'manche') + ' aujourd\'hui' : 'Entraînement libre') + '</span></div>' +
      '<div class="tries">' + Array.from({ length: max }, (_, i) => '<i class="' + (i < free ? 'on' : '') + '"></i>').join('') + (s.bonusTries ? '<span class="bonus">+' + s.bonusTries + ' bonus</span>' : '') + '</div>' +
      '<p class="muted small">' + (left ? 'Chaque partie lancée utilise une manche et rapporte des perles, quel que soit le jeu. Ensuite, entraînement illimité pour battre tes records.' : 'Plus de manches à perles aujourd\'hui : entraîne-toi et grimpe au classement du jour. Les codes et la Roue donnent des manches bonus.') + '</p>' +
      (s.boost ? '<div class="boost">⚡ Ta prochaine manche rapporte ×2</div>' : '') + '</div>';
  }

  function viewArene() {
    const s = Store.s;
    const trésors = C.codes.filter(c => c.kind === 'trésor'), quests = C.codes.filter(c => c.kind === 'quete');
    const found = trésors.filter(c => s.codes.includes(c.id)).length;
    const spins = Store.wheelLeft();
    const st = C.streakRewards || [];
    return subnav('arene') + '<h1 class="h1 title">L\'Arène</h1>' +
      '<p class="lead">' + ORDER.length + ' jeux d\'arcade. Chaque perle gagnée te fait grimper au classement… et fait gagner ton clan.</p>' +
      triesCard() +
      '<div class="games">' + ORDER.map(gameCard).join('') + '</div>' +
      '<div class="card prize-mini">🏆 ' + esc(C.dailyPrize) + '</div>' +

      '<div class="card code-card"><h2 class="h3">🔑 Un code secret&nbsp;?</h2><p>Récupère des codes aux événements, en accomplissant des quêtes ou en trouvant les trésors cachés.</p>' + codeForm() + '</div>' +

      '<div class="card trésors-card"><div class="row-between"><h2 class="h3">La chasse aux Trésors</h2><span class="count">' + found + '/' + trésors.length + '</span></div>' +
      '<p>' + esc(C.trésorHint) + '</p><div class="trésors">' + trésors.map((c, i) => { const f = s.codes.includes(c.id); return '<div class="trésor ' + (f ? 'found' : '') + '">' + trésorSVG(f ? TRESOR_COLORS[i % TRESOR_COLORS.length] : null) + '<small>' + (f ? esc(c.title.replace(/^Le Trésor /, '')) : '???') + '</small></div>'; }).join('') + '</div></div>' +

      '<div class="card quests-card"><h2 class="h3">📜 Les Quêtes</h2><ul class="quests">' + quests.map(q => { const d = s.codes.includes(q.id); return '<li class="' + (d ? 'done' : '') + '"><span class="qk">' + (d ? '✓' : '') + '</span><div><b>' + esc(q.title) + '</b><small>' + esc(q.desc || '') + '</small></div><span class="qp">+' + q.perles + '</span></li>'; }).join('') + '</ul>' +
      '<p class="muted small">Quête faite ? Un membre de Goon te donne le code.</p></div>' +

      '<div class="card wheel-card"><div class="wc-mini">' + wheelSVG(100) + '</div><div><h2 class="h3">La Roue des Marées</h2><p>Perles, manches bonus, boost ×2… et des cadeaux.</p>' +
      '<button class="btn btn-lagon" data-action="wheel">Tourner · ' + C.wheel.cost + ' ' + PEARL + '</button><small class="muted">' + plural(spins, 'tour') + ' ' + (spins > 1 ? 'restants' : 'restant') + ' aujourd\'hui</small></div></div>' +

      '<div class="card how"><h2 class="h3">Comment gagner des perles&nbsp;?</h2><ul class="how-list">' +
      '<li><span>🎮</span>Les jeux de l\'Arène<b>jusqu\'à 100 / manche</b></li>' +
      '<li><span>🎉</span>Venir aux événements<b>' + rangeOf('event') + '</b></li>' +
      '<li><span>✨</span>Trouver un trésor caché<b>' + rangeOf('trésor') + '</b></li>' +
      '<li><span>📜</span>Accomplir une quête<b>' + rangeOf('quete') + '</b></li>' +
      '<li><span>🔥</span>Revenir chaque jour au port<b>' + (st.length ? st[0] + '–' + st[st.length - 1] : '') + '</b></li>' +
      '<li><span>🏅</span>Débloquer des badges<b>10–150</b></li></ul>' +
      '<p class="muted small">Les perles gagnées comptent pour le classement et pour ton clan. Celles que tu dépenses au Comptoir ne te font pas reculer.</p></div>';
  }

  /* ============================ CLASSEMENT ============================ */
  function viewClassement() {
    const tab = ui.boardTab;
    const tabs = [['équipage', 'L’Équipage'], ['clans', 'Les Clans'], ['jeux', 'Jeux du jour']];
    return subnav('classement') + '<h1 class="h1 title">Le Conseil des Abysses</h1>' +
      (Net.mode === 'demo' ? '<button class="demo-note" data-action="demo-info">Mode démo : les autres joueurs sont simulés. <u>En savoir plus</u></button>' : '<p class="live-note"><i></i> Classement en direct</p>') +
      '<div class="seg" role="tablist">' + tabs.map(([k, l]) => '<button role="tab" class="' + (tab === k ? 'on' : '') + '" data-action="board" data-tab="' + k + '">' + l + '</button>').join('') + '</div>' +
      (tab === 'équipage' ? boardTribu() : tab === 'clans' ? boardClans() : boardJeux());
  }

  function row(p, i, val) {
    const cl = clanById(p.clan);
    return '<div class="row ' + (p.me ? 'me' : '') + '"><span class="pos">' + (i + 1) + '</span><span class="av" style="--c:' + cl.color + '">' + esc(p.avatar) + '</span>' +
      '<span class="nm">' + esc(p.name) + (p.me ? ' <em>(toi)</em>' : '') + '<small>' + cl.emoji + ' ' + esc(cl.short) + ' · ' + rankOf(p.season || 0).name + '</small></span><b class="val">' + val + '</b></div>';
  }
  function podium(top, valFn) {
    return '<div class="podium">' + [1, 0, 2].map(i => {
      const p = top[i]; if (!p) return '<div class="pd empty"></div>';
      const cl = clanById(p.clan);
      return '<div class="pd pd' + (i + 1) + (p.me ? ' me' : '') + '"><div class="pd-av" style="--c:' + cl.color + '">' + esc(p.avatar) + (i === 0 ? '<span class="pd-crown">👑</span>' : '') + '</div>' +
        '<b class="pd-n">' + esc(p.name) + '</b><span class="pd-s">' + valFn(p) + '</span><div class="pd-block"><span>' + (i + 1) + '</span></div></div>';
    }).join('') + '</div>';
  }
  function boardTribu() {
    const list = Net.players(), me = list.findIndex(p => p.me);
    const val = p => fmt(p.season) + ' ' + PEARL;
    let out = podium(list.slice(0, 3), val) + '<div class="rows">' + list.slice(3, 50).map((p, i) => row(p, i + 3, val(p))).join('');
    if (me >= 50) out += '<div class="sep">···</div>' + row(list[me], me, val(list[me]));
    out += '</div>';
    out += '<div class="card prize-mini">🏆 ' + esc((C.prizes.find(p => /top/i.test(p.title)) || C.prizes[0] || {}).text || '') + '</div>';
    return out;
  }
  function boardClans() {
    const tot = Net.clanTotals();
    const arr = C.clans.map(c => Object.assign({}, c, tot[c.id])).sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...arr.map(c => c.total));
    const mine = arr.find(c => c.id === Store.s.clan);
    const share = mine && mine.total ? Math.round(Store.s.season / mine.total * 100) : 0;
    return '<div class="poles">' + C.clans.map(c => {
      const v = tot[c.id], rank = arr.findIndex(x => x.id === c.id) + 1;
      return '<div class="pole ' + (c.id === Store.s.clan ? 'mine' : '') + '" style="--c:' + c.color + '"><div class="pole-track"><div class="pole-stack" style="height:' + Math.max(14, v.total / max * 100) + '%"><span class="pole-head">' + c.emoji + (rank === 1 ? '<i class="crown">👑</i>' : '') + '</span></div></div>' +
        '<b>' + fmt(v.total) + '</b><small>' + esc(c.short) + '</small></div>';
    }).join('') + '</div>' +
      '<div class="card clan-list">' + arr.map((c, i) => '<div class="cl-row ' + (c.id === Store.s.clan ? 'mine' : '') + '"><span class="pos">' + (i + 1) + '</span><span class="cl-e" style="--c:' + c.color + '">' + c.emoji + '</span><div><b>' + esc(c.name) + '</b><small>« ' + esc(c.motto) + ' » · ' + plural(c.members, 'membre') + '</small></div><b class="val">' + fmt(c.total) + '</b></div>').join('') + '</div>' +
      (mine ? '<div class="card prize-mini">Ta contribution au ' + esc(mine.name) + ' : <b>' + fmt(Store.s.season) + '</b> ' + PEARL + ' (' + share + ' %). Le clan vainqueur gagne ' + esc(C.clanPrize) + '.</div>' : '');
  }
  function boardJeux() {
    const id = GAMES[ui.dailyGame] ? ui.dailyGame : (Store.featured() || ORDER[0]), m = GAMES[id], s = Store.s;
    const list = Net.daily(id), played = s.daily.date === dayStr() && (s.daily.rounds[id] || 0) > 0;
    const val = p => fmt(p.score) + (m.unit === 'coraux' ? ' coraux' : ' pts');
    let out = '<div class="filters">' + ORDER.map(g => '<button class="chip ' + (g === id ? 'on' : '') + '" data-action="dgame" data-game="' + g + '">' + GAMES[g].icon + ' ' + SHORT[g] + '</button>').join('') + '</div>';
    out += '<div class="card prize-mini">🏆 ' + esc(C.dailyPrize) + ' <small>Remise à zéro chaque nuit à minuit.</small></div>';
    if (!played) out += '<button class="card cta-play" data-action="play" data-game="' + id + '">Tu n\'as pas encore joué à ' + esc(m.name) + ' aujourd\'hui. <b>Prends ta place →</b></button>';
    if (!list.length) return out + '<div class="empty">Personne n\'a encore joué aujourd\'hui. La place de n°1 est libre !</div>';
    out += podium(list.slice(0, 3), val) + '<div class="rows">' + list.slice(3, 50).map((p, i) => row(p, i + 3, val(p))).join('') + '</div>';
    return out;
  }

  /* ============================== COMPTOIR ============================== */
  function viewComptoir() {
    const s = Store.s, active = s.vouchers.filter(v => !v.used), used = s.vouchers.filter(v => v.used);
    return '<h1 class="h1 title">Le Comptoir</h1>' +
      '<div class="wallet-card"><div><small>Dans ta besace</small><b>' + fmt(s.wallet) + ' ' + PEARL + '</b></div><p>Échange tes perles contre de vrais cadeaux. Dépenser ne fait <u>pas</u> baisser ton classement.</p></div>' +
      (s.vouchers.length ? '<h2 class="h2">Mes bons</h2><div class="vouchers">' + active.concat(used).map(v =>
        '<button class="vch ' + (v.used ? 'used' : '') + '" data-action="voucher" data-id="' + v.id + '"><span class="vch-ico">' + v.icon + '</span><span class="vch-t"><b>' + esc(v.title) + '</b><small>' + (v.used ? 'Utilisé le ' + fmtTime(v.usedAt) : 'À montrer à un membre de Goon') + '</small></span><span class="vch-go">' + (v.used ? '✓' : 'Ouvrir') + '</span></button>').join('') + '</div>' : '') +
      '<h2 class="h2">Les récompenses</h2><div class="rewards">' + C.rewards.map(rewardCard).join('') + '</div>' +
      '<h2 class="h2">Les Grands Prix</h2><div class="prizes">' + C.prizes.map(p => '<div class="prize"><span>' + p.icon + '</span><div><b>' + esc(p.title) + '</b><p>' + esc(p.text) + '</p></div></div>').join('') + '</div>';
  }
  function rewardCard(r) {
    const s = Store.s, left = Net.stockLeft(r), can = s.wallet >= r.cost && left !== 0;
    const stock = left != null ? (left > 0 ? 'Plus que ' + left : 'Épuisé') : (r.stock ? 'Stock limité' : '');
    const pct = Math.min(100, s.wallet / r.cost * 100);
    return '<div class="reward-card ' + (can ? '' : 'locked') + '"><div class="rw-ico">' + r.icon + '</div><h3>' + esc(r.title) + '</h3><p>' + esc(r.desc || '') + '</p>' +
      (stock ? '<small class="stock">' + stock + '</small>' : '') +
      (!can && left !== 0 ? '<div class="rw-bar"><i style="width:' + pct + '%"></i></div>' : '') +
      '<button class="btn sm ' + (can ? '' : 'ghost') + '" data-action="buy" data-id="' + r.id + '">' + (left === 0 ? 'Épuisé' : fmt(r.cost) + ' ' + PEARL) + '</button></div>';
  }

  async function buy(id) {
    const r = C.rewards.find(x => x.id === id); if (!r) return;
    const s = Store.s;
    if (Net.stockLeft(r) === 0) { toast('Ce cadeau est épuisé 😢', 'warn'); return; }
    if (s.wallet < r.cost) { toast('Il te manque <b>' + fmt(r.cost - s.wallet) + '</b> perles pour ce cadeau. Va à l\'Arène !', 'warn'); return; }
    openModal('<div class="confirm"><div class="win-ico">' + r.icon + '</div><h2>' + esc(r.title) + '</h2><p>' + esc(r.desc || '') + '</p>' +
      '<p class="confirm-cost">Échanger <b>' + fmt(r.cost) + '</b> ' + PEARL + ' ?</p><p class="muted small">Il te restera ' + fmt(s.wallet - r.cost) + ' perles.</p>' +
      '<div class="btn-row"><button class="btn ghost" data-action="close">Annuler</button><button class="btn" data-confirm>Échanger</button></div></div>', {
      onMount(m, close) {
        $('[data-confirm]', m).onclick = async ev => {
          ev.currentTarget.disabled = true;
          const ok = await Net.claimStock(r);
          if (!ok) { close(); toast('Trop tard, ce cadeau vient d\'être épuisé 😢', 'warn'); render(); return; }
          if (!Store.spend(r.cost, r.title, r.icon)) { close(); return; }
          const v = Store.addVoucher({ title: r.title, icon: r.icon, desc: r.desc, source: 'Comptoir', rewardId: r.id });
          Store.award('marchand'); Store.save(); close(); render();
          setTimeout(() => { openVoucher(v); confetti(90); }, 220);
        };
      }
    });
  }

  function openVoucher(v) {
    const body = () => '<div class="voucher ' + (v.used ? 'used' : '') + '"><div class="v-top"><span class="v-ico">' + v.icon + '</span><h2>' + esc(v.title) + '</h2>' + (v.desc ? '<p>' + esc(v.desc) + '</p>' : '') + '</div>' +
      '<div class="v-code">' + v.code + '</div><div class="v-live"><span class="v-dot"></span><span data-clock></span> · ' + esc(Store.s.name) + '</div>' +
      (v.used ? '<div class="v-stamp">Utilisé le ' + fmtTime(v.usedAt) + '</div>' :
        '<p class="v-help">Montre cet écran à un membre de Goon : il le valide avec son code staff. L\'horloge qui défile prouve que ce n\'est pas une capture d\'écran.</p>' +
        '<form class="pin-form"><input type="password" inputmode="numeric" maxlength="12" placeholder="Code staff" autocomplete="off" aria-label="Code staff"><button class="btn">Valider</button></form><p class="code-msg"></p>') + '</div>';
    openModal(body(), {
      onMount(m) {
        tickClocks();
        const form = $('.pin-form', m); if (!form) return;
        form.onsubmit = ev => {
          ev.preventDefault();
          const inp = $('input', form);
          if (pinHash(inp.value) === C.staffPinHash) {
            v.used = true; v.usedAt = Date.now(); Store.save();
            $('.sheet-body', m).innerHTML = body(); tickClocks(); render(); toast('Bon validé ✓', 'lagon');
          } else {
            inp.value = ''; const msg = form.nextElementSibling; msg.textContent = 'Code staff incorrect.'; msg.className = 'code-msg err'; shake(form);
          }
        };
      }
    });
  }

  /* ================================ CODES ================================ */
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  function handleCode(form) {
    const inp = $('input', form), msg = form.nextElementSibling;
    const res = Store.redeem(inp.value);
    if (res.err) { msg.textContent = res.err; msg.className = 'code-msg err'; shake(form); return; }
    inp.value = ''; msg.textContent = ''; inp.blur();
    closeAllModals(); render(); showCodeWin(res);
  }

  function showCodeWin(res) {
    const c = res.code;
    const trésorIdx = C.codes.filter(x => x.kind === 'trésor').findIndex(x => x.id === c.id);
    const K = {
      event: { t: 'Présence validée&nbsp;!', i: '🎉' },
      quete: { t: 'Quête accomplie&nbsp;!', i: '📜' },
      trésor: { t: 'Trésor trouvé&nbsp;! (' + res.trésors + '/' + res.totalTrésors + ')', i: trésorSVG(TRESOR_COLORS[Math.max(0, trésorIdx) % TRESOR_COLORS.length]) },
      bonus: { t: 'Code bonus&nbsp;!', i: '🎁' }
    }[c.kind] || { t: 'Code validé&nbsp;!', i: '🔑' };
    openModal('<div class="win"><div class="win-ico ' + (c.kind === 'trésor' ? 'trésor-win' : '') + '">' + K.i + '</div><h2>' + K.t + '</h2><p class="win-sub">' + esc(c.title) + '</p>' +
      '<div class="win-perles">+' + fmt(c.perles) + ' ' + PEARL + '</div>' +
      (c.tries ? '<p class="win-extra">+ ' + plural(c.tries, 'essai') + ' bonus au harpon 🔱</p>' : '') +
      (c.kind === 'trésor' && res.trésors < res.totalTrésors ? '<p class="muted">Encore ' + (res.totalTrésors - res.trésors) + ' trésor' + (res.totalTrésors - res.trésors > 1 ? 's' : '') + ' à trouver…</p>' : '') +
      '<button class="btn block big" data-action="close">Trop bien</button></div>');
    confetti(130);
  }

  function openCodeModal() {
    openModal('<h2 class="h2c">🔑 Entrer un code</h2><p class="center muted">Codes d\'événements, de quêtes ou de trésors cachés.</p>' + codeForm('modal-code'), {
      onMount(m) { setTimeout(() => { const i = $('#modal-code', m); if (i) i.focus(); }, 250); }
    });
  }

  /* =============================== ROUE =============================== */
  function wheelSVG(size) {
    const segs = C.wheel.segments, n = segs.length, r = 100, cx = 110, cy = 110, step = 360 / n;
    const pt = (a, rr) => { const t = a * Math.PI / 180; return [(cx + rr * Math.sin(t)).toFixed(2), (cy - rr * Math.cos(t)).toFixed(2)]; };
    let out = '<svg viewBox="0 0 220 220" width="' + size + '" height="' + size + '" class="wheel-svg" aria-hidden="true"><circle cx="110" cy="110" r="109" fill="#0B1D2A"/>';
    segs.forEach((s, i) => {
      const a0 = i * step, a1 = (i + 1) * step, p0 = pt(a0, r), p1 = pt(a1, r), mid = a0 + step / 2;
      out += '<path d="M' + cx + ' ' + cy + 'L' + p0[0] + ' ' + p0[1] + 'A' + r + ' ' + r + ' 0 0 1 ' + p1[0] + ' ' + p1[1] + 'Z" fill="' + s.color + '" stroke="#0B1D2A" stroke-width="1.5"/>';
      out += '<g transform="rotate(' + mid + ' ' + cx + ' ' + cy + ')"><text x="' + cx + '" y="' + (cy - r * 0.72) + '" text-anchor="middle" dominant-baseline="middle" class="wl" fill="' + (s.text || '#fff') + '">' + esc(s.label) + '</text>' +
        '<text x="' + cx + '" y="' + (cy - r * 0.46) + '" text-anchor="middle" dominant-baseline="middle" font-size="17">' + (s.icon || '') + '</text></g>';
    });
    for (let i = 0; i < n * 2; i++) { const p = pt(i * step / 2, 104.5); out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.2" fill="#EAF4F8"/>'; }
    return out + '<circle cx="110" cy="110" r="17" fill="#EAF4F8" stroke="#0B1D2A" stroke-width="3"/><circle cx="110" cy="110" r="6" fill="#0E5A8A"/></svg>';
  }
  function weightedPick(segs) {
    const tot = segs.reduce((a, s) => a + (s.weight || 1), 0);
    let x = Math.random() * tot;
    for (let i = 0; i < segs.length; i++) { x -= segs[i].weight || 1; if (x <= 0) return i; }
    return segs.length - 1;
  }
  function openWheel() {
    const W = C.wheel;
    const info = () => plural(Store.wheelLeft(), 'tour') + ' ' + (Store.wheelLeft() > 1 ? 'restants' : 'restant') + ' aujourd\'hui · ' + fmt(Store.s.wallet) + ' perles en poche';
    openModal('<h2 class="h2c">La Roue des Marées</h2><p class="center muted small" data-winfo>' + info() + '</p>' +
      '<div class="wheel-wrap"><div class="wheel-pointer"></div><div class="wheel-rot" style="transform:rotate(' + wheelRot + 'deg)">' + wheelSVG(300) + '</div></div>' +
      '<div class="wheel-res" aria-live="polite"></div><button class="btn block big" data-spin>Lancer · ' + W.cost + ' ' + PEARL + '</button>' +
      '<p class="center muted small">Les perles gagnées à la Roue vont dans ta besace (pas au classement).</p>', {
      onMount(m) {
        const btn = $('[data-spin]', m), rot = $('.wheel-rot', m), res = $('.wheel-res', m);
        btn.onclick = () => {
          const s = Store.s;
          if (Store.wheelLeft() <= 0) { res.innerHTML = '<p class="wr-msg">Les marées se reposent. Reviens demain !</p>'; return; }
          if (s.wallet < W.cost) { res.innerHTML = '<p class="wr-msg">Il te faut ' + W.cost + ' perles. Va tirer au harpon !</p>'; return; }
          Store.spend(W.cost, 'Roue des Marées', '🌀'); s.wheel.spins++; s.stats.spins++; Store.save(); renderHeader();
          const segs = W.segments, n = segs.length, step = 360 / n, k = weightedPick(segs);
          const jitter = (Math.random() - 0.5) * step * 0.7;
          const desired = ((360 - (k + 0.5) * step + jitter) % 360 + 360) % 360;
          wheelRot = wheelRot - (((wheelRot % 360) + 360) % 360) + 360 * 6 + desired;
          rot.style.transform = 'rotate(' + wheelRot + 'deg)';
          btn.disabled = true; res.innerHTML = '<p class="wr-msg">Les marées délibèrent…</p>';
          setTimeout(() => {
            applyWheel(segs[k], res); btn.disabled = false;
            $('[data-winfo]', m).textContent = info(); render();
          }, 4400);
        };
      }
    });
  }
  function applyWheel(seg, el) {
    const s = Store.s; let html;
    Store.award('reveur');
    if (seg.type === 'perles') {
      Store.earn(seg.value, 'Roue des Marées', '🌀', { season: false });
      html = '<b class="wr-big">+' + seg.value + ' ' + PEARL + '</b>' + (seg.jackpot ? '<p>JACKPOT ! Les marées t\'adorent.</p>' : '<p>Dans ta besace.</p>');
      if (seg.jackpot) { Store.award('beni'); confetti(180); } else confetti(40);
    } else if (seg.type === 'essai') {
      s.bonusTries += seg.value || 1; html = '<b class="wr-big">+1 essai 🔱</b><p>Un tir de plus à l\'Épreuve du Harpon.</p>'; confetti(40);
    } else if (seg.type === 'boost') {
      s.boost += 1; html = '<b class="wr-big">Boost ×2 ⚡</b><p>Ta prochaine manche d\'archer rapporte double.</p>'; confetti(60);
    } else if (seg.type === 'bon') {
      Store.addVoucher({ title: seg.reward, icon: seg.icon, desc: seg.desc, source: 'Roue des Marées' });
      html = '<b class="wr-big">' + seg.icon + ' ' + esc(seg.reward) + '</b><p>Ton bon t\'attend au Comptoir.</p>'; confetti(120);
    } else {
      html = '<b class="wr-big">💤 Rien…</b><p>Les marées dorment. Retente ta chance !</p>';
    }
    Store.save(); renderHeader();
    el.innerHTML = '<div class="wr">' + html + '</div>';
  }

  /* =============================== PROFIL =============================== */
  function openProfile() {
    const s = Store.s, cl = clanById(s.clan), rk = rankOf(s.season);
    const st = s.stats;
    openModal('<div class="prof-head"><div class="prof-av" style="--c:' + cl.color + '">' + s.avatar + '</div><div><h2>' + esc(s.name) + '</h2>' +
      '<p>' + cl.emoji + ' ' + esc(cl.name) + ' · ' + rk.icon + ' ' + rk.name + '</p></div></div>' +
      '<div class="prof-stats">' +
      [[fmt(s.season), 'perles gagnées'], [st.rounds, 'parties jouées'], [ORDER.filter(g => s.played[g] > 0).length + '/' + ORDER.length, 'jeux testés'], [st.bulls, 'pleins centres'], [s.codes.length, 'codes trouvés'], [s.badges.length + '/' + BADGES.length, 'badges']]
        .map(([v, l]) => '<div><b>' + v + '</b><span>' + l + '</span></div>').join('') + '</div>' +
      '<h3 class="h3">Badges</h3><div class="badges">' + BADGES.map(b => { const on = s.badges.includes(b.id); return '<div class="badge ' + (on ? '' : 'off') + '" title="' + esc(b.desc) + '"><span>' + b.icon + '</span><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small></div>'; }).join('') + '</div>' +
      '<h3 class="h3">Ma créature marine</h3><div class="ob-avatars small">' + AVATARS.map(a => '<button class="ob-av ' + (a === s.avatar ? 'on' : '') + '" data-av="' + a + '">' + a + '</button>').join('') + '</div>' +
      '<h3 class="h3">Journal des perles</h3><ul class="journal">' + (s.history.length ? s.history.slice(0, 25).map(h => '<li><span>' + h.icon + '</span><div>' + esc(h.label) + '<small>' + fmtTime(h.t) + '</small></div><b class="' + (h.n < 0 ? 'neg' : '') + '">' + (h.n > 0 ? '+' : '') + fmt(h.n) + '</b></li>').join('') : '<li class="muted">Rien pour l\'instant.</li>') + '</ul>' +
      '<div class="settings"><label class="switch"><input type="checkbox" data-sound ' + (s.sound ? 'checked' : '') + '><span></span> Sons du jeu</label>' +
      '<button class="link-btn danger" data-reset>Réinitialiser mon profil</button></div>', {
      cls: 'tall',
      onMount(m, close) {
        $$('[data-av]', m).forEach(b => b.onclick = () => { s.avatar = b.dataset.av; Store.save(); $$('[data-av]', m).forEach(x => x.classList.toggle('on', x === b)); $('.prof-av', m).textContent = s.avatar; render(); });
        $('[data-sound]', m).onchange = e => { s.sound = e.target.checked; Store.save(); };
        $('[data-reset]', m).onclick = () => { if (confirm('Effacer ton profil, tes perles et tes bons sur ce téléphone ? C\'est définitif.')) { Store.reset(); location.reload(); } };
      }
    });
  }

  /* ============================== LE JEU ============================== */
  let curGame = 'archer', curRanked = false;
  function play(el) {
    const id = (el && el.dataset && GAMES[el.dataset.game]) ? el.dataset.game : (Store.featured() || 'archer');
    const m = GAMES[id], s = Store.s;
    curGame = id; curRanked = Store.useTry();
    Store.save(); closeAllModals();
    const ov = $('#game');
    ov.innerHTML = '<canvas id="game-cv" aria-label="' + esc(m.name) + '"></canvas>' +
      '<div class="g-ui"><button class="g-btn" data-g="quit" aria-label="Quitter">✕</button><button class="g-btn" data-g="sound" aria-label="Son">' + (s.sound ? '🔊' : '🔇') + '</button></div>' +
      (curRanked ? '' : '<div class="g-tag">Entraînement · sans perles</div>') + '<div class="g-modal" hidden></div>';
    ov.hidden = false; document.body.classList.add('no-scroll');
    m.controller.start($('#game-cv'), { sound: s.sound, onEnd: endGame });
    if (!s.tuto[id] && !(s.played[id] > 0)) {
      gModal('<div class="tuto"><div class="tuto-ico" style="--c:' + m.color + '">' + gameArt(m) + '</div><h2>' + esc(m.name) + '</h2><ol>' +
        m.tutorial.map(t => '<li><span>' + t[0] + '</span><div>' + t[1] + '</div></li>').join('') + '</ol>' +
        '<p class="muted small">' + (curRanked ? 'Cette partie utilise une manche à perles.' : 'Entraînement : pas de perles, mais ton score compte au classement du jour.') + '</p>' +
        '<button class="btn btn-lagon block big" data-g="go">C\'est parti&nbsp;!</button></div>');
    } else m.controller.begin();
  }
  function gModal(html) { const m = $('#game .g-modal'); m.innerHTML = html; m.hidden = false; }
  function closeGame() {
    const c = GAMES[curGame] && GAMES[curGame].controller;
    if (c && c.running) c.quit();
    const ov = $('#game'); ov.hidden = true; ov.innerHTML = ''; document.body.classList.remove('no-scroll');
    render();
  }
  function endGame(res, quit) {
    const id = curGame, m = GAMES[id], s = Store.s, d = Store.rollDaily(), ranked = curRanked;
    let mult = 1;
    if (ranked && s.boost > 0) { mult = 2; s.boost--; }
    const feat = ranked && Store.featured() === id ? (C.featuredBoost || 1) : 1;
    const perles = ranked ? Math.round(m.perles(res.score) * mult * feat) : 0;
    s.stats.rounds++; s.played[id] = (s.played[id] || 0) + 1;
    if (id === 'archer') { s.stats.arrows += res.shots || 0; s.stats.bulls += res.bulls || 0; s.stats.pearls += res.pearls || 0; }
    d.rounds[id] = (d.rounds[id] || 0) + 1;
    const newDaily = res.score > (d.best[id] || 0); if (newDaily) d.best[id] = res.score;
    const newRecord = res.score > (s.best[id] || 0); if (newRecord) s.best[id] = res.score;
    const unit = m.unit === 'coraux' ? 'coraux' : 'pts';
    if (perles > 0) Store.earn(perles, m.name + ' · ' + fmt(res.score) + ' ' + unit + (mult > 1 ? ' ×2' : '') + (feat > 1 ? ' ⭐' : ''), m.icon);
    (m.badges(res) || []).filter(b => !(quit && b === 'premiere-fleche')).forEach(b => Store.award(b));
    if (ORDER.every(g => s.played[g] > 0)) Store.award('touche-a-tout');
    Store.save();
    if (newDaily || d.rounds[id] === 1) Net.pushDaily(id, d.best[id] || 0);
    const dRank = Net.daily(id).findIndex(p => p.me) + 1;
    const left = Store.triesLeft(), q = m.perles(res.score);
    const title = q >= 80 ? 'Légendaire&nbsp;!' : q >= 55 ? 'Superbe&nbsp;!' : q >= 30 ? 'Bien joué' : q > 0 ? 'Pas mal' : 'Aïe…';
    const chip = r => '<span class="ra ' + (r.pearl ? 'gold' : r.pts === 10 ? 'gold' : r.pts >= 6 ? 'lagon' : r.pts > 0 ? 'cream' : 'zero') + '">' + (r.pearl ? '🐚' : r.pts + (r.bonus ? '<sup>+' + r.bonus + '</sup>' : '')) + '</span>';
    const detail = res.results ? '<div class="res-arrows">' + res.results.map(chip).join('') + '</div>' : (res.lines ? '<ul class="res-lines">' + res.lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '');
    gModal('<div class="res"><p class="eyebrow">' + esc(m.name) + (quit ? ' · interrompu' : '') + '</p><h2>' + title + '</h2>' +
      '<div class="res-score">' + fmt(res.score) + '<small>' + (m.unit === 'coraux' ? 'coraux' : 'points') + '</small></div>' + detail +
      (ranked ? '<div class="res-gain">+' + fmt(perles) + ' ' + PEARL + (mult > 1 ? '<em>×2</em>' : '') + (feat > 1 ? '<em>⭐ ×' + String(feat).replace('.', ',') + '</em>' : '') + '</div>'
        : '<p class="res-practice">Entraînement : pas de perles, mais ton score compte pour le classement du jour.</p>') +
      (newRecord && res.score > 0 ? '<p class="res-badge">🏆 Nouveau record perso&nbsp;!</p>' : newDaily && res.score > 0 ? '<p class="res-badge">⭐ Meilleur score du jour</p>' : '') +
      (dRank ? '<p class="res-rank">Tu es <b>#' + dRank + '</b> du jour sur ce jeu</p>' : '') +
      '<div class="btn-col"><button class="btn btn-lagon block big" data-g="again">' + (left ? 'Rejouer · ' + plural(left, 'manche') + ' à perles' : 'Rejouer (entraînement)') + '</button>' +
      '<button class="btn ghost-light block" data-g="exit">Retour à l\'Arène</button></div></div>');
    if (q >= 60) confetti(120);
  }
  function onGameClick(e) {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const g = b.dataset.g, c = GAMES[curGame].controller;
    if (g === 'go') { $('#game .g-modal').hidden = true; Store.s.tuto[curGame] = true; Store.save(); c.begin(); }
    else if (g === 'sound') { Store.s.sound = !Store.s.sound; Store.save(); c.setSound(Store.s.sound); b.textContent = Store.s.sound ? '🔊' : '🔇'; }
    else if (g === 'quit') {
      if (!c.running) { closeGame(); return; }
      if (confirm('Quitter la partie ? Ton score actuel est conservé.')) { const r = c.quit(); if (r) endGame(r, true); else closeGame(); }
    }
    else if (g === 'again') { const id = curGame; closeGame(); play({ dataset: { game: id } }); }
    else if (g === 'exit') { closeGame(); go('arene'); }
  }

  /* ========================= MODALES, TOASTS, CONFETTIS ========================= */
  function openModal(html, opt) {
    opt = opt || {};
    const wrap = document.createElement('div');
    wrap.className = 'modal ' + (opt.cls || '');
    wrap.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><button class="sheet-close" aria-label="Fermer">×</button><div class="sheet-body">' + html + '</div></div>';
    $('#modal-root').appendChild(wrap);
    const close = () => { if (wrap.classList.contains('closing')) return; wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 220); };
    wrap._close = close;
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.sheet-close')) close(); });
    if (opt.onMount) opt.onMount(wrap, close);
    return close;
  }
  function closeTopModal() { const m = $$('#modal-root .modal:not(.closing)').pop(); if (m) m._close(); }
  function closeAllModals() { $$('#modal-root .modal').forEach(m => m._close && m._close()); }

  const toastQ = []; let toastBusy = false;
  function toast(html, type, ms) { toastQ.push({ html, type: type || '', ms: ms || 2800 }); pumpToast(); }
  function pumpToast() {
    if (toastBusy || !toastQ.length) return;
    toastBusy = true;
    const t = toastQ.shift(), el = $('#toast');
    el.className = 'toast ' + t.type; el.innerHTML = t.html;
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => { toastBusy = false; pumpToast(); }, 320); }, t.ms);
  }

  const confetti = (function () {
    let cvs, c, parts = [], raf = 0;
    const COLS = ['#0E5A8A', '#FF7A59', '#F2C14E', '#EAF4F8', '#E0553A', '#3A8FC4'];
    function size() { const d = Math.min(window.devicePixelRatio || 1, 2); cvs.width = innerWidth * d; cvs.height = innerHeight * d; c.setTransform(d, 0, 0, d, 0, 0); }
    function loop() {
      c.clearRect(0, 0, innerWidth, innerHeight);
      parts = parts.filter(p => {
        p.vy += p.g; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life * 0.12))); c.restore();
        return p.y < innerHeight + 40 && p.life < 400;
      });
      if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; c.clearRect(0, 0, innerWidth, innerHeight); }
    }
    return function (n) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!cvs) { cvs = document.createElement('canvas'); cvs.className = 'confetti'; document.body.appendChild(cvs); c = cvs.getContext('2d'); size(); addEventListener('resize', size); }
      for (let i = 0; i < (n || 100); i++) {
        parts.push({ x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3, y: innerHeight * 0.38, vx: (Math.random() - 0.5) * 15, vy: -Math.random() * 14 - 4, g: 0.33 + Math.random() * 0.2, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: COLS[i % COLS.length], life: 0 });
      }
      if (!raf) loop();
    };
  })();

  function tickClocks() {
    const d = new Date(), s = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    $$('[data-clock]').forEach(el => { el.textContent = s; });
    $$('[data-cd]').forEach(el => { el.innerHTML = cdHTML(+el.dataset.cd); });
    if (SOS) SOS.tick();
  }

  function onStoreEvent(ev) {
    if (ev.type === 'badge') { toast('<span class="t-ico">' + ev.badge.icon + '</span><div><b>Badge : ' + esc(ev.badge.name) + '</b><small>' + esc(ev.badge.desc) + ' · +' + ev.badge.bonus + ' perles</small></div>', 'gold', 3200); confetti(50); }
    if (ev.type === 'rank') toast('<span class="t-ico">' + ev.rank.icon + '</span><div><b>Nouveau rang : ' + esc(ev.rank.name) + '</b><small>L’équipage reconnaît ta valeur.</small></div>', 'lagon', 3400);
  }

  /* ============================ ONBOARDING ============================ */
  function onboarding() {
    return new Promise(resolve => {
      const el = $('#onboard'); el.hidden = false; document.body.classList.add('no-scroll');
      const d = { name: '', avatar: AVATARS[0] };
      let step = 0;
      const steps = [
        () => '<div class="ob-splash"><img class="ob-logo" src="icons/icon.svg" alt=""><h1 class="ob-title">' + esc(C.appName) + '</h1><p class="ob-tag">' + esc(C.tagline) + '</p>' +
          '<ul class="ob-points"><li><span>🔱</span>Affronte toute l\'école au harpon</li><li><span>✨</span>Traque les trésors cachés sur le campus</li><li><span>🎁</span>Gagne de vrais cadeaux et des réducs</li></ul>' +
          '<button class="btn btn-lagon block big" data-ob="next">Rejoindre l’équipage</button><small class="ob-school">' + esc(C.school) + '</small></div>',
        () => '<div class="ob-step"><p class="ob-k">Étape 1 / 2</p><h2>Comment on t\'appelle&nbsp;?</h2><input class="ob-input" id="ob-name" maxlength="16" placeholder="Prénom ou pseudo" value="' + esc(d.name) + '" autocomplete="nickname">' +
          '<p class="ob-err" aria-live="polite"></p><p class="ob-lab">Choisis ta créature marine</p><div class="ob-avatars">' + AVATARS.map(a => '<button class="ob-av ' + (a === d.avatar ? 'on' : '') + '" data-av="' + a + '">' + a + '</button>').join('') + '</div>' +
          '<button class="btn btn-lagon block big" data-ob="next">Continuer</button></div>',
        () => '<div class="ob-step"><p class="ob-k">Étape 2 / 2</p><h2>Choisis ton clan</h2><p class="ob-sub">Chaque perle que tu gagnes fait grimper ton clan. Le clan vainqueur gagne ' + esc(C.clanPrize) + '. Ce choix est définitif.</p>' +
          '<div class="ob-clans">' + C.clans.map(c => '<button class="ob-clan" data-clan="' + c.id + '" style="--c:' + c.color + '"><span>' + c.emoji + '</span><b>' + esc(c.name) + '</b><small>' + esc(c.motto) + '</small></button>').join('') + '</div>' +
          '<button class="btn ghost-light block" data-clan="random">🔮 Laisse les marées choisir · +' + C.randomClanBonus + ' ' + PEARL + '</button></div>'
      ];
      const draw = () => { el.innerHTML = '<div class="ob-inner">' + steps[step]() + '</div>'; if (step === 1) setTimeout(() => { const i = $('#ob-name'); if (i && !d.name) i.focus(); }, 200); };
      const finish = (clanId, random) => {
        const s = Store.s;
        s.name = d.name; s.avatar = d.avatar; s.clan = clanId;
        Net.joinClan(clanId);
        Store.earn(C.welcomeBonus || 50, 'Bienvenue dans l’équipage', '🎉');
        if (random) Store.earn(C.randomClanBonus || 25, 'Choix des marées', '🔮');
        Store.save();
        el.classList.add('leaving');
        setTimeout(() => { el.hidden = true; el.classList.remove('leaving'); el.innerHTML = ''; document.body.classList.remove('no-scroll'); resolve(); }, 350);
      };
      const reveal = clan => {
        el.innerHTML = '<div class="ob-inner"><div class="ob-reveal"><p class="ob-k">Les marées consultent les étoiles…</p><div class="ob-spin" id="ob-spin">' + C.clans[0].emoji + '</div><h2 id="ob-rname">&nbsp;</h2><p id="ob-rmotto" class="ob-sub"></p><div id="ob-rbtn"></div></div></div>';
        const spin = $('#ob-spin'), n = C.clans.length, target = C.clans.indexOf(clan), total = n * 4 + target;
        let i = 0, delay = 55;
        const stepFn = () => {
          const c = C.clans[i % n];
          spin.textContent = c.emoji; spin.style.setProperty('--c', c.color);
          if (i >= total) {
            spin.classList.add('done');
            $('.ob-reveal .ob-k').textContent = 'Les marées ont parlé';
            $('#ob-rname').textContent = clan.name; $('#ob-rmotto').textContent = '« ' + clan.motto + ' »';
            $('#ob-rbtn').innerHTML = '<button class="btn btn-lagon block big" data-ob="finish">Entrer dans le port</button>';
            confetti(140); return;
          }
          i++; delay *= 1.1; setTimeout(stepFn, delay);
        };
        stepFn();
        el.onclick = e => { if (e.target.closest('[data-ob="finish"]')) finish(clan.id, true); };
      };
      el.onclick = e => {
        const av = e.target.closest('[data-av]');
        if (av) { d.avatar = av.dataset.av; $$('.ob-av', el).forEach(b => b.classList.toggle('on', b === av)); return; }
        if (e.target.closest('[data-ob="next"]')) {
          if (step === 1) {
            const name = $('#ob-name').value.trim().replace(/\s+/g, ' ');
            if (name.length < 2) { $('.ob-err', el).textContent = 'Au moins 2 caractères.'; shake($('#ob-name')); return; }
            d.name = name;
          }
          step++; draw(); return;
        }
        const cb = e.target.closest('[data-clan]');
        if (cb) {
          if (cb.dataset.clan === 'random') {
            const tot = Net.clanTotals();
            const min = Math.min(...C.clans.map(c => tot[c.id].members));
            const pool = C.clans.filter(c => tot[c.id].members === min);
            reveal(pool[Math.floor(Math.random() * pool.length)]);
          } else finish(cb.dataset.clan, false);
        }
      };
      el.onkeydown = e => { if (e.key === 'Enter' && step === 1) { e.preventDefault(); $('[data-ob="next"]', el).click(); } };
      draw();
    });
  }

  function showWelcome() {
    const cl = clanById(Store.s.clan);
    openModal('<div class="win"><div class="win-ico">' + cl.emoji + '</div><h2>Bienvenue, ' + esc(Store.s.name) + '&nbsp;!</h2><p class="win-sub">Tu fais maintenant partie du ' + esc(cl.name) + '.</p>' +
      '<div class="win-perles">+' + fmt(Store.s.wallet) + ' ' + PEARL + '</div>' +
      '<ul class="welcome-list"><li><span>🎮</span>' + ORDER.length + ' jeux d\'arcade, ' + C.dailyTries + ' manches à perles par jour</li><li><span>🛵</span>Des SOS livrés partout sur le campus</li><li><span>🔑</span>Des codes à chaque événement du planning</li><li><span>✨</span>6 trésors cachés sur le campus</li><li><span>🔥</span>Reviens chaque jour : le feu de port rapporte de plus en plus</li><li><span>🎁</span>Échange tes perles au Comptoir</li></ul>' +
      '<button class="btn block big" data-action="close">Allons-y</button></div>');
    confetti(100);
  }
  function showStreak(st) {
    openModal('<div class="win"><div class="win-ico fire">🔥</div><h2>Le feu de port brûle encore</h2><p class="win-sub">Jour ' + st.count + ' d\'affilée au port</p>' +
      '<div class="win-perles">+' + st.reward + ' ' + PEARL + '</div><p class="muted">Reviens demain pour <b>+' + st.next + '</b>. Si tu rates un jour, le phare s\'éteint.</p>' +
      '<button class="btn block big" data-action="close">Merci les marées</button></div>');
  }

  /* =============================== ACTIONS =============================== */
  const ACTIONS = {
    play, code: openCodeModal, wheel: openWheel, profile: openProfile,
    close: () => closeTopModal(),
    day: el => { ui.planningDay = el.dataset.day; render(); },
    filter: el => { ui.planningFilter = el.dataset.f; render(); },
    ics: el => { const e = C.planning.find(x => x.id === el.dataset.id); if (e) downloadICS(e); },
    board: el => { ui.boardTab = el.dataset.tab; render(); },
    dgame: el => { ui.dailyGame = el.dataset.game; render(); },
    buy: el => buy(el.dataset.id),
    voucher: el => { const v = Store.s.vouchers.find(x => x.id === el.dataset.id); if (v) openVoucher(v); },
    install: async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); try { await deferredPrompt.userChoice; } catch (e) { } deferredPrompt = null; render(); },
    noinstall: () => { try { localStorage.setItem('goon.noinstall', '1'); } catch (e) { } render(); },
    'streak-info': () => { const R = C.streakRewards; openModal('<div class="win"><div class="win-ico fire">🔥</div><h2>Le feu de port</h2><p>Ouvre l\'appli chaque jour pour rallumer le phare. Plus la série est longue, plus ça rapporte :</p><div class="streak-row">' + R.map((r, i) => '<span class="' + (i < Store.s.streak.count ? 'on' : '') + '"><b>J' + (i + 1) + '</b>+' + r + '</span>').join('') + '</div><p class="muted small">Si tu rates un jour, la série repart de zéro.</p><button class="btn block" data-action="close">Compris</button></div>'); },
    'demo-info': () => openModal('<h2 class="h2c">Mode démo</h2><p>Pour l\'instant, les autres joueurs du classement sont <b>simulés</b> pour que tu puisses tester l\'appli.</p><p>Pour un vrai classement partagé entre tous les étudiants, il suffit de brancher un projet Firebase gratuit (instructions dans le README) : le reste de l\'appli ne change pas.</p><button class="btn block" data-action="close">OK</button>')
  };

  function bindGlobal() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-go],[data-action]');
      if (!el || el.closest('#onboard')) return;
      if (el.dataset.go) {
        e.preventDefault();
        if (el.dataset.board) ui.boardTab = el.dataset.board;
        if (el.dataset.day) ui.planningDay = el.dataset.day;
        closeAllModals(); go(el.dataset.go); return;
      }
      const fn = ACTIONS[el.dataset.action];
      if (fn) { e.preventDefault(); fn(el, e); }
    });
    document.addEventListener('submit', e => { if (e.target.matches('.code-form')) { e.preventDefault(); handleCode(e.target); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTopModal(); });
    $('#game').addEventListener('click', onGameClick);
    window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== current) go(h); });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (current === 'accueil') render(); });
    setInterval(tickClocks, 1000);
    let rt = 0;
    Net.on(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const a = document.activeElement;
        if (['accueil', 'classement', 'comptoir', 'arene'].includes(current) && !(a && a.matches('input,textarea')) && $('#game').hidden) render();
      }, 400);
    });
  }

  function handleUrlCode() {
    const p = new URLSearchParams(location.search), code = p.get('code');
    if (!code) return;
    history.replaceState(null, '', location.pathname + location.hash);
    const res = Store.redeem(code);
    if (res.ok) { render(); showCodeWin(res); } else toast(esc(res.err), 'warn', 3600);
  }

  async function init() {
    Store.onEvent = onStoreEvent;
    if (window.GOON_SOS) SOS = window.GOON_SOS({ $, $$, esc, fmt, plural, render, go, openModal, closeTopModal, closeAllModals, toast, confetti, tickClocks, shake, PEARL, actions: ACTIONS, current: () => current });
    bindGlobal();
    if (C.firebase && C.firebase.apiKey) {
      const live = import('./firebase.js').then(m => m.connect(T)).then(() => { if (Store.s.clan) render(); })
        .catch(err => { console.error(err); toast('Classement en ligne indisponible pour le moment.', 'warn', 3600); });
      // on attend la connexion (max 4 s) pour que l'inscription compte dans le clan
      await Promise.race([live, new Promise(r => setTimeout(r, 4000))]);
    }
    let isNew = false;
    if (!Store.s.clan) { await onboarding(); isNew = true; }
    go((location.hash || '').slice(1) || 'accueil');
    const st = Store.checkStreak();
    render();
    if (isNew) showWelcome(); else if (st) showStreak(st);
    handleUrlCode();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => { });
  }

  init();
})();
