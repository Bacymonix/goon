/* Goon — SOS : prise de commande façon appli de livraison (SIMULATION)
   Catalogue, options, panier, adresse, créneau, paiement à la livraison, suivi en direct
   avec carte du campus et livreur. Rien n'est envoyé : tout reste sur le téléphone. */
window.GOON_SOS = function (ui) {
  'use strict';
  const { C, Store, dayStr } = window.GOON;
  const S = C.sos;
  const { $, $$, esc, fmt, plural, render, openModal, closeAllModals, toast, confetti, actions } = ui;
  let cat = 'all';

  const eur = n => n === 0 ? 'Gratuit' : (Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')) + ' €';
  const item = id => S.items.find(i => i.id === id);
  const unitPrice = (it, choices) => it.price + (it.options || []).reduce((a, o, i) => a + (o.choices[choices[i] || 0].price || 0), 0);
  const cartCount = () => Store.s.cart.reduce((a, l) => a + l.qty, 0);
  const cartTotal = () => Store.s.cart.reduce((a, l) => a + l.unit * l.qty, 0);
  const pad = n => String(n).padStart(2, '0');
  const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  /* ---------- statut d'une commande (simulation accélérée) ---------- */
  function status(o, now) {
    now = now || Date.now();
    if (o.cancelled) return 'annulee';
    if (now < o.t.prep) return 'recue';
    if (now < o.t.route) return 'prep';
    if (now < o.t.done) return 'route';
    return 'livree';
  }
  const STEPS = [['recue', '📝', 'Reçue'], ['prep', '👩‍🍳', 'En préparation'], ['route', '🛵', 'En route'], ['livree', '🎉', 'Livrée']];
  function etaMin(o, now) { const tot = o.t.done - o.created, rem = Math.max(0, o.t.done - (now || Date.now())); return Math.max(rem > 0 ? 1 : 0, Math.ceil(rem / tot * o.eta)); }
  function headline(o) {
    const st = status(o), c = o.courier;
    if (st === 'annulee') return ['Commande annulée', 'Pas de souci, à la prochaine !'];
    if (st === 'recue') return [o.slot === S.slots[0] ? 'Commande reçue' : 'Commande programmée', o.slot === S.slots[0] ? 'Goon a bien reçu ta commande.' : 'Prévue pour ' + o.slot + '.'];
    if (st === 'prep') return ['En préparation', c.name + ' prépare ta commande avec amour.'];
    if (st === 'route') return [c.name + ' est en route', 'Arrivée dans ' + etaMin(o) + ' min · vers ' + hm(Date.now() + etaMin(o) * 60000)];
    return ['Livrée&nbsp;! 🎉', 'Bon appétit (ou bon réveil) de la part de Goon.'];
  }
  const active = () => Store.s.orders.find(o => { const st = status(o); return st !== 'livree' && st !== 'annulee'; });

  /* ---------- vue principale ---------- */
  function itemRow(it) {
    const inCart = Store.s.cart.filter(l => l.id === it.id).reduce((a, l) => a + l.qty, 0);
    return '<button class="sos-item" data-action="sos-item" data-id="' + it.id + '"><span class="si-txt"><b>' + esc(it.name) + (it.popular ? ' <em>Populaire</em>' : '') + '</b><small>' + esc(it.desc) + '</small><span class="si-price">' + eur(it.price) + (it.options && it.options.some(o => o.choices.some(c => c.price)) ? ' <i>+ options</i>' : '') + '</span></span>' +
      '<span class="si-ico">' + it.icon + (inCart ? '<i class="si-n">' + inCart + '</i>' : '<i class="si-plus">+</i>') + '</span></button>';
  }
  function view() {
    const s = Store.s, a = s.address, n = cartCount(), act = active();
    const addr = a.place ? esc(a.place) + (a.room ? ' · ' + esc(a.room) : '') : 'Choisis ton adresse';
    const cats = S.categories.filter(c => cat === 'all' || c.id === cat);
    const hist = s.orders.slice(0, 5);
    return '<div class="sos-hero"><div class="sos-top"><div><p class="eyebrow">🛵 Livraison campus</p><h1>' + esc(S.title) + '</h1><p>' + esc(S.subtitle) + '</p></div><span class="sos-bell" aria-hidden="true">🛎️</span></div>' +
      '<button class="sos-addr" data-action="sos-addr"><span>📍</span><span class="sa-t">Livrer à <b>' + addr + '</b></span><i>Modifier</i></button>' +
      '<div class="sos-info"><span>⏱ ' + S.eta[0] + '–' + S.eta[1] + ' min</span><span>🛵 Livraison offerte</span><span>💸 Paiement à la livraison</span></div></div>' +
      (act ? trackCard(act) : '') +
      '<p class="sos-sim">⚡ Simulation : aucune commande n\'est vraiment envoyée. ' + esc(S.hours) + '.</p>' +
      '<h2 class="h2">Les plus demandés</h2><div class="sos-pop">' + S.items.filter(i => i.popular).map(i => '<button class="sp-card" data-action="sos-item" data-id="' + i.id + '"><span>' + i.icon + '</span><b>' + esc(i.name) + '</b><small>' + eur(i.price) + '</small></button>').join('') + '</div>' +
      '<div class="filters sos-cats">' + [['all', 'Tout', '🍽️']].concat(S.categories.map(c => [c.id, c.label, c.icon])).map(([id, l, ic]) => '<button class="chip ' + (cat === id ? 'on' : '') + '" data-action="sos-cat" data-cat="' + id + '">' + ic + ' ' + esc(l) + '</button>').join('') + '</div>' +
      cats.map(c => '<h2 class="h2">' + c.icon + ' ' + esc(c.label) + '</h2><div class="sos-list">' + S.items.filter(i => i.cat === c.id).map(itemRow).join('') + '</div>').join('') +
      (hist.length ? '<h2 class="h2">Mes commandes</h2><div class="sos-hist">' + hist.map(o => {
        const st = status(o), lab = { recue: 'Reçue', prep: 'En préparation', route: 'En route', livree: 'Livrée', annulee: 'Annulée' }[st];
        return '<div class="sh-row"><button class="sh-main" data-action="sos-track" data-id="' + o.id + '"><b>#' + o.num + ' · ' + o.lines.map(l => l.qty + '× ' + esc(l.name.replace(/^SOS /, ''))).join(', ') + '</b><small>' + new Date(o.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' + hm(o.created) + ' · ' + eur(o.total) + '</small></button><span class="sh-st ' + st + '">' + lab + '</span>' +
          (st === 'livree' || st === 'annulee' ? '<button class="link-btn" data-action="sos-reorder" data-id="' + o.id + '">Recommander</button>' : '') + '</div>';
      }).join('') + '</div>' : '') +
      (n ? '<button class="sos-cartbar" data-action="sos-cart"><span class="cb-n">' + n + '</span><span>Voir le panier</span><b>' + eur(cartTotal()) + '</b></button>' : '');
  }
  function trackCard(o) {
    const [t, sub] = headline(o), st = status(o), idx = STEPS.findIndex(x => x[0] === st);
    return '<button class="sos-track" data-action="sos-track" data-id="' + o.id + '"><span class="st-ico">' + STEPS[Math.max(0, idx)][1] + '</span><span class="st-txt"><b data-sos-title="' + o.id + '">' + t + '</b><small data-sos-sub="' + o.id + '">' + sub + '</small>' +
      '<span class="st-bar"><i data-sos-bar="' + o.id + '" style="width:' + progress(o) + '%"></i></span></span><span class="st-go">Suivre</span></button>';
  }
  function progress(o) { const now = Date.now(); return Math.round(Math.min(1, Math.max(0, (now - o.created) / (o.t.done - o.created))) * 100); }
  function homeBanner() { const o = active(); return o ? trackCard(o) : ''; }

  /* ---------- fiche produit ---------- */
  function openItem(id, preset) {
    const it = item(id); if (!it) return;
    const sel = (preset && preset.choices) ? preset.choices.slice() : (it.options || []).map(() => 0);
    let qty = 1;
    const html = '<div class="sos-sheet"><div class="ss-ico">' + it.icon + '</div><h2>' + esc(it.name) + '</h2><p class="muted">' + esc(it.desc) + '</p><p class="ss-price">' + eur(it.price) + '</p>' +
      (it.options || []).map((o, oi) => '<fieldset class="sos-opt"><legend>' + esc(o.name) + ' <small>Obligatoire</small></legend>' + o.choices.map((c, ci) =>
        '<label><input type="radio" name="opt' + oi + '" value="' + ci + '"' + (sel[oi] === ci ? ' checked' : '') + '><span>' + esc(c.label) + '</span>' + (c.price ? '<i>+' + eur(c.price) + '</i>' : '') + '</label>').join('') + '</fieldset>').join('') +
      '<label class="sos-note">Une précision&nbsp;?<textarea maxlength="120" rows="2" placeholder="Allergies, sans chantilly, sonne deux fois…"></textarea></label>' +
      '<div class="ss-foot"><div class="qty"><button type="button" data-q="-1" aria-label="Moins">−</button><b>1</b><button type="button" data-q="1" aria-label="Plus">+</button></div><button class="btn big" data-add>Ajouter · <span data-p></span></button></div></div>';
    openModal(html, {
      onMount(m, close) {
        const upd = () => { $('[data-p]', m).textContent = eur(unitPrice(it, sel) * qty); $('.qty b', m).textContent = qty; };
        $$('input[type=radio]', m).forEach(r => r.onchange = () => { sel[+r.name.slice(3)] = +r.value; upd(); });
        $$('[data-q]', m).forEach(b => b.onclick = () => { qty = Math.max(1, Math.min(S.maxPerItem || 5, qty + +b.dataset.q)); upd(); });
        $('[data-add]', m).onclick = () => {
          const note = $('textarea', m).value.trim();
          const key = it.id + '|' + sel.join('-') + '|' + note;
          const ex = Store.s.cart.find(l => l.key === key);
          if (ex) ex.qty = Math.min(S.maxPerItem || 5, ex.qty + qty);
          else Store.s.cart.push({ key, id: it.id, qty, choices: sel.slice(), note, unit: unitPrice(it, sel) });
          Store.save(); close(); render();
          toast('<span class="t-ico">' + it.icon + '</span><div><b>Ajouté au panier</b><small>' + esc(it.name) + ' ×' + qty + '</small></div>', 'lagon', 1800);
        };
        upd();
      }
    });
  }
  const choiceText = l => { const it = item(l.id); return (it.options || []).map((o, i) => o.choices[l.choices[i] || 0].label).join(', '); };

  /* ---------- panier & validation ---------- */
  function openCart() {
    const s = Store.s;
    if (!s.cart.length) { render(); return; }
    const a = s.address;
    const body = () => {
      const total = cartTotal();
      return '<h2 class="h2c">Ton panier</h2><div class="cart-lines">' + s.cart.map((l, i) => { const it = item(l.id); return '<div class="cl"><span class="cl-ico">' + it.icon + '</span><div class="cl-t"><b>' + esc(it.name) + '</b>' + (choiceText(l) ? '<small>' + esc(choiceText(l)) + '</small>' : '') + (l.note ? '<small>« ' + esc(l.note) + ' »</small>' : '') + '</div><div class="qty sm"><button data-cq="' + i + '" data-d="-1" aria-label="Moins">−</button><b>' + l.qty + '</b><button data-cq="' + i + '" data-d="1" aria-label="Plus">+</button></div><span class="cl-p">' + eur(l.unit * l.qty) + '</span></div>'; }).join('') + '</div>' +
        '<div class="sos-sum"><span>Sous-total</span><b>' + eur(total) + '</b><span>Livraison</span><b class="free">Offerte</b><span class="tot">Total</span><b class="tot">' + eur(total) + '</b></div>' +
        '<h3 class="h3">📍 Où on te livre&nbsp;?</h3><div class="sos-form"><select data-f="place"><option value="">Choisis un lieu…</option>' + S.places.map(p => '<option' + (a.place === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select>' +
        '<input data-f="room" maxlength="24" placeholder="Chambre / salle (ex : B214)" value="' + esc(a.room) + '">' +
        '<input data-f="details" maxlength="80" placeholder="Précisions : étage, code, tenue…" value="' + esc(a.details) + '"></div>' +
        '<h3 class="h3">⏱ Quand&nbsp;?</h3><div class="sos-slots">' + S.slots.map((sl, i) => '<label><input type="radio" name="slot" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(sl) + '</span></label>').join('') + '</div>' +
        (total > 0 ? '<h3 class="h3">💸 Paiement</h3><div class="sos-slots">' + S.payments.map((p, i) => '<label><input type="radio" name="pay" value="' + i + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(p) + '</span></label>').join('') + '</div>'
          : '<p class="sos-free">🎁 Rien à payer : c\'est offert par Goon&nbsp;!</p>') +
        '<p class="code-msg err" data-err></p><button class="btn block big" data-order>Commander · ' + eur(total) + '</button>' +
        '<p class="muted small center">Simulation : aucune commande n\'est réellement envoyée.</p>';
    };
    openModal(body(), {
      cls: 'tall',
      onMount(m, close) {
        const bind = () => {
          $$('[data-cq]', m).forEach(b => b.onclick = () => {
            const l = s.cart[+b.dataset.cq]; l.qty += +b.dataset.d;
            if (l.qty <= 0) s.cart.splice(+b.dataset.cq, 1); else l.qty = Math.min(S.maxPerItem || 5, l.qty);
            Store.save(); render();
            if (!s.cart.length) { close(); return; }
            keepForm(); $('.sheet-body', m).innerHTML = body(); bind();
          });
          $('[data-order]', m).onclick = () => submit(m, close);
        };
        const keepForm = () => { a.place = $('[data-f=place]', m).value; a.room = $('[data-f=room]', m).value.trim(); a.details = $('[data-f=details]', m).value.trim(); };
        bind();
      }
    });
  }
  function submit(m, close) {
    const s = Store.s, a = s.address;
    a.place = $('[data-f=place]', m).value; a.room = $('[data-f=room]', m).value.trim(); a.details = $('[data-f=details]', m).value.trim();
    const err = $('[data-err]', m);
    if (!a.place) { err.textContent = 'Indique où on doit te livrer.'; ui.shake($('[data-f=place]', m)); return; }
    if (!a.room) { err.textContent = 'Indique ta chambre ou ta salle.'; ui.shake($('[data-f=room]', m)); return; }
    const slot = S.slots[+(($('input[name=slot]:checked', m) || {}).value || 0)];
    const payEl = $('input[name=pay]:checked', m), total = cartTotal();
    const now = Date.now(), prep = now + rint(6, 10) * 1000, route = prep + rint(10, 16) * 1000, done = route + rint(22, 32) * 1000;
    const o = {
      id: 'o' + now.toString(36), num: rint(1000, 9999), created: now, t: { prep, route, done },
      lines: s.cart.map(l => ({ id: l.id, name: item(l.id).name, icon: item(l.id).icon, qty: l.qty, opts: choiceText(l), note: l.note, total: l.unit * l.qty })),
      total, place: a.place, room: a.room, details: a.details, slot, payment: total > 0 ? S.payments[payEl ? +payEl.value : 0] : 'Offert',
      courier: S.couriers[Math.floor(Math.random() * S.couriers.length)], rating: (4.6 + Math.random() * 0.4).toFixed(1).replace('.', ','),
      eta: rint(S.eta[0], S.eta[1]), rated: 0, cancelled: false, notified: false
    };
    s.orders.unshift(o); if (s.orders.length > 20) s.orders.length = 20;
    s.cart = [];
    Store.award('sos');
    Store.save(); close(); render();
    setTimeout(() => { openTracking(o.id); confetti(60); }, 230);
  }

  /* ---------- suivi ---------- */
  const SPOTS = { 'Résidence A': [252, 38], 'Résidence B': [282, 98], 'Résidence C': [196, 152], 'Bâtiment principal': [150, 50], 'BU': [84, 40], 'Foyer': [96, 108], 'Gymnase': [270, 152], 'Ailleurs sur le campus': [168, 104] };
  const QG = [36, 150];
  function routePath(place) {
    const [dx, dy] = SPOTS[place] || SPOTS['Ailleurs sur le campus'], vx = dx < 170 ? 120 : 232;
    return 'M' + QG[0] + ' ' + QG[1] + ' V128 H' + vx + ' V' + dy + ' H' + dx;
  }
  function mapSVG(o) {
    const blds = Object.keys(SPOTS).filter(p => p !== 'Ailleurs sur le campus');
    return '<svg viewBox="0 0 320 180" class="trk-svg" role="img" aria-label="Carte du campus">' +
      '<rect width="320" height="180" rx="14" fill="#EFE2CF"/>' +
      '<path d="M0 128 H320 M0 74 H320 M120 0 V180 M232 0 V180" stroke="#F7FBFD" stroke-width="10" fill="none"/>' +
      '<path d="M0 128 H320 M0 74 H320 M120 0 V180 M232 0 V180" stroke="#E2CDB1" stroke-width="1" stroke-dasharray="4 5" fill="none"/>' +
      '<circle cx="292" cy="22" r="10" fill="#9ED9C0"/><circle cx="20" cy="30" r="13" fill="#9ED9C0"/><circle cx="34" cy="20" r="9" fill="#8CCFB3"/>' +
      blds.map(p => { const [x, y] = SPOTS[p], dest = p === o.place; return '<rect x="' + (x - 18) + '" y="' + (y - 11) + '" width="36" height="22" rx="4" fill="' + (dest ? '#0E5A8A' : '#D9C4A6') + '"/><text x="' + x + '" y="' + (y + 21) + '" text-anchor="middle" font-size="7.5" font-weight="800" fill="#2E4A5E">' + esc(p.replace('Bâtiment principal', 'Bât. principal')) + '</text>'; }).join('') +
      '<rect x="' + (QG[0] - 20) + '" y="' + (QG[1] - 12) + '" width="40" height="24" rx="5" fill="#FF7A59"/><text x="' + QG[0] + '" y="' + (QG[1] + 4) + '" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">QG</text>' +
      '<path d="' + routePath(o.place) + '" stroke="#0E5A8A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 7" data-route/>' +
      '<g data-pin><circle r="9" fill="#0B1D2A"/><text text-anchor="middle" dy="4" font-size="11">📍</text></g>' +
      '<g data-courier><circle r="12" fill="#fff" stroke="#FF7A59" stroke-width="3"/><text text-anchor="middle" dy="4.5" font-size="13">' + o.courier.emoji + '</text></g></svg>';
  }
  function placeOnMap(m, o) {
    const path = $('[data-route]', m); if (!path || !path.getTotalLength) return;
    const len = path.getTotalLength(), st = status(o), now = Date.now();
    let p = 0; if (st === 'route') p = (now - o.t.route) / (o.t.done - o.t.route); else if (st === 'livree') p = 1;
    const pt = path.getPointAtLength(len * Math.min(1, Math.max(0, p))), end = path.getPointAtLength(len);
    $('[data-courier]', m).setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
    $('[data-pin]', m).setAttribute('transform', 'translate(' + end.x + ' ' + (end.y - 16) + ')');
  }
  function trackingHTML(o) {
    const [t, sub] = headline(o), st = status(o), idx = STEPS.findIndex(x => x[0] === st);
    return '<div class="trk"><p class="eyebrow">Commande #' + o.num + ' · ' + hm(o.created) + '</p><h2>' + t + '</h2><p class="trk-sub">' + sub + '</p>' +
      (st !== 'annulee' ? '<div class="trk-steps">' + STEPS.map((x, i) => '<div class="ts ' + (i < idx ? 'done' : i === idx ? 'now' : '') + '"><span>' + x[1] + '</span><small>' + x[2] + '</small></div>').join('') + '</div>' +
        '<div class="trk-bar"><i style="width:' + progress(o) + '%"></i></div>' : '') +
      '<div class="trk-map">' + mapSVG(o) + '</div>' +
      '<div class="trk-courier"><span class="tc-av">' + o.courier.emoji + '</span><div><b>' + esc(o.courier.name) + ' de Goon</b><small>' + esc(o.courier.ride) + ' · ⭐ ' + o.rating + '</small></div>' +
      '<button class="tc-btn" data-call aria-label="Appeler">📞</button><button class="tc-btn" data-msg aria-label="Message">💬</button></div>' +
      (st === 'livree' ? '<div class="trk-rate"><b>Comment c\'était&nbsp;?</b><div class="stars">' + [1, 2, 3, 4, 5].map(n => '<button data-star="' + n + '" class="' + (o.rated >= n ? 'on' : '') + '" aria-label="' + n + ' étoile' + (n > 1 ? 's' : '') + '">★</button>').join('') + '</div>' + (o.rated ? '<small>Merci pour ta note&nbsp;!</small>' : '<small>Ta première note du jour rapporte 10 perles.</small>') + '</div>' : '') +
      '<div class="trk-sum"><h3 class="h3">Récapitulatif</h3>' + o.lines.map(l => '<div class="ts-l"><span>' + l.icon + ' ' + l.qty + '× ' + esc(l.name) + (l.opts ? '<small>' + esc(l.opts) + '</small>' : '') + (l.note ? '<small>« ' + esc(l.note) + ' »</small>' : '') + '</span><b>' + eur(l.total) + '</b></div>').join('') +
      '<div class="ts-l tot"><span>Total</span><b>' + eur(o.total) + '</b></div>' +
      '<p class="muted small">📍 ' + esc(o.place) + ' · ' + esc(o.room) + (o.details ? ' · ' + esc(o.details) : '') + '<br>⏱ ' + esc(o.slot) + ' · 💸 ' + esc(o.payment) + '</p></div>' +
      (st === 'recue' ? '<button class="btn ghost block" data-cancel>Annuler la commande</button>' : '') + '</div>';
  }
  function openTracking(id) {
    const o = Store.s.orders.find(x => x.id === id); if (!o) return;
    let last = '';
    openModal(trackingHTML(o), {
      cls: 'tall',
      onMount(m) {
        const bind = () => {
          placeOnMap(m, o);
          const c = $('[data-cancel]', m); if (c) c.onclick = () => { o.cancelled = true; Store.save(); refresh(true); render(); toast('Commande annulée', 'warn'); };
          const call = $('[data-call]', m); if (call) call.onclick = () => toast('📞 Simulation : ' + esc(o.courier.name) + ' ne peut pas répondre, il est en mission&nbsp;!', '', 2400);
          const msg = $('[data-msg]', m); if (msg) msg.onclick = () => toast('💬 ' + esc(o.courier.name) + ' : « J\'arrive, prépare-toi&nbsp;! »', 'lagon', 2400);
          $$('[data-star]', m).forEach(b => b.onclick = () => rate(o, +b.dataset.star, () => refresh(true)));
        };
        const refresh = force => {
          const key = status(o) + (o.rated || 0);
          if (force || key !== last) { last = key; $('.sheet-body', m).innerHTML = trackingHTML(o); bind(); }
          else {
            placeOnMap(m, o);
            const bar = $('.trk-bar i', m); if (bar) bar.style.width = progress(o) + '%';
            const sub = $('.trk-sub', m); if (sub) sub.innerHTML = headline(o)[1];
          }
        };
        refresh(true);
        const iv = setInterval(() => { if (!document.body.contains(m)) { clearInterval(iv); return; } refresh(false); }, 500);
      }
    });
  }
  function rate(o, n, cb) {
    const first = !o.rated;
    o.rated = n;
    const t = dayStr();
    if (first && Store.s.sosRated !== t) { Store.s.sosRated = t; Store.earn(10, 'Note SOS #' + o.num, '⭐'); toast('Merci&nbsp;! +10 perles pour ta note ⭐', 'gold', 2200); }
    else toast('Merci pour ta note&nbsp;!', 'lagon', 1600);
    Store.save(); cb();
  }

  /* ---------- tic (appelé chaque seconde) ---------- */
  function tick() {
    Store.s.orders.forEach(o => {
      const st = status(o);
      $$('[data-sos-title="' + o.id + '"]').forEach(el => { el.innerHTML = headline(o)[0]; });
      $$('[data-sos-sub="' + o.id + '"]').forEach(el => { el.innerHTML = headline(o)[1]; });
      $$('[data-sos-bar="' + o.id + '"]').forEach(el => { el.style.width = progress(o) + '%'; });
      if (st === 'livree' && !o.notified) {
        o.notified = true; Store.save();
        if (!document.querySelector('.trk')) toast('<span class="t-ico">🎉</span><div><b>Ta commande SOS est arrivée&nbsp;!</b><small>' + esc(o.courier.name) + ' t\'attend devant ta porte.</small></div>', 'lagon', 3600);
        if (ui.current() === 'sos' || ui.current() === 'accueil') render();
      }
    });
  }

  /* ---------- adresse ---------- */
  function openAddress() {
    const a = Store.s.address;
    openModal('<h2 class="h2c">📍 Adresse de livraison</h2><div class="sos-form"><select data-f="place"><option value="">Choisis un lieu…</option>' + S.places.map(p => '<option' + (a.place === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select>' +
      '<input data-f="room" maxlength="24" placeholder="Chambre / salle (ex : B214)" value="' + esc(a.room) + '"><input data-f="details" maxlength="80" placeholder="Précisions : étage, code, tenue…" value="' + esc(a.details) + '"></div>' +
      '<button class="btn block big" data-save>Enregistrer</button>', {
      onMount(m, close) {
        $('[data-save]', m).onclick = () => { a.place = $('[data-f=place]', m).value; a.room = $('[data-f=room]', m).value.trim(); a.details = $('[data-f=details]', m).value.trim(); Store.save(); close(); render(); };
      }
    });
  }

  /* ---------- actions ---------- */
  Object.assign(actions, {
    'sos-item': el => openItem(el.dataset.id),
    'sos-cart': () => openCart(),
    'sos-addr': () => openAddress(),
    'sos-cat': el => { cat = el.dataset.cat; render(); },
    'sos-track': el => openTracking(el.dataset.id),
    'sos-reorder': el => {
      const o = Store.s.orders.find(x => x.id === el.dataset.id); if (!o) return;
      o.lines.forEach(l => { const it = item(l.id); if (!it) return; const choices = (it.options || []).map((op, i) => Math.max(0, op.choices.findIndex(c => (l.opts || '').split(', ')[i] === c.label))); Store.s.cart.push({ key: l.id + '|' + choices.join('-') + '|' + (l.note || '') + '|' + Date.now(), id: l.id, qty: l.qty, choices, note: l.note || '', unit: unitPrice(it, choices) }); });
      Store.save(); render(); openCart();
    }
  });

  return { view, homeBanner, tick };
};
