/* Goon — mode EN LIGNE (classement partagé entre tous les joueurs)
   Activé automatiquement quand `firebase` est renseigné dans config.js.
   Utilise Firebase (gratuit) : Authentication anonyme + Cloud Firestore.
   Voir README.md pour la mise en place (≈ 10 minutes). */
const V = '10.12.2';
const BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';

export async function connect(T) {
  const { C, Store, Net, dayStr } = T;
  const [{ initializeApp }, A, F] = await Promise.all([
    import(BASE + 'firebase-app.js'),
    import(BASE + 'firebase-auth.js'),
    import(BASE + 'firebase-firestore.js')
  ]);
  const app = initializeApp(C.firebase);
  const auth = A.getAuth(app);
  const db = F.getFirestore(app);
  const cred = await A.signInAnonymously(auth);
  const uid = cred.user.uid;

  const cache = { players: [], clans: {}, daily: {}, stock: {} };
  const GAMES = window.GOON_GAME_ORDER || ['archer'];
  const meRef = F.doc(db, 'players', uid);

  // Classement général (top 100) en temps réel
  F.onSnapshot(F.query(F.collection(db, 'players'), F.orderBy('season', 'desc'), F.limit(100)), snap => {
    cache.players = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    Net.emit();
  }, err => console.warn('players', err));

  // Totaux des clans
  F.onSnapshot(F.collection(db, 'clans'), snap => {
    cache.clans = {}; snap.forEach(d => { cache.clans[d.id] = d.data(); });
    Net.emit();
  }, err => console.warn('clans', err));

  // Stocks des récompenses
  F.onSnapshot(F.collection(db, 'stock'), snap => {
    cache.stock = {}; snap.forEach(d => { cache.stock[d.id] = d.data().claimed || 0; });
    Net.emit();
  }, err => console.warn('stock', err));

  // Classements du jour, un par jeu (changent de collection à minuit)
  let dailyDate = '', dailyUnsubs = [];
  function watchDaily() {
    const t = dayStr(); if (t === dailyDate) return;
    dailyDate = t; dailyUnsubs.forEach(f => f()); dailyUnsubs = []; cache.daily = {};
    GAMES.forEach(g => {
      dailyUnsubs.push(F.onSnapshot(F.query(F.collection(db, 'daily', t, g), F.orderBy('score', 'desc'), F.limit(50)), snap => {
        cache.daily[g] = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        Net.emit();
      }, err => console.warn('daily', g, err)));
    });
  }
  watchDaily(); setInterval(watchDaily, 60000);

  let pushT = 0;
  const publicProfile = s => ({ name: s.name, avatar: s.avatar, clan: s.clan, season: s.season, best: s.best, updatedAt: F.serverTimestamp() });
  function push(retry) {
    const s = Store.s; if (!s.clan) return;
    F.setDoc(meRef, publicProfile(s), { merge: true }).catch(err => { console.warn('profil', err); if (!retry) setTimeout(() => push(true), 5000); });
  }

  Object.assign(Net, {
    mode: 'live',
    me() { const s = Store.s; return { id: uid, name: s.name, avatar: s.avatar, clan: s.clan, season: s.season, me: true }; },
    players() {
      const list = cache.players.filter(p => p.id !== uid).map(p => Object.assign({}, p));
      if (Store.s.clan) list.push(this.me());
      return list.sort((a, b) => b.season - a.season);
    },
    clanTotals() {
      const out = {};
      C.clans.forEach(c => { const d = cache.clans[c.id] || {}; out[c.id] = { total: d.total || 0, members: d.members || 0 }; });
      return out;
    },
    daily(game) {
      const s = Store.s, t = dayStr();
      const list = (cache.daily[game] || []).filter(p => p.id !== uid).map(p => Object.assign({}, p));
      if (s.clan && s.daily.date === t && (s.daily.rounds[game] || 0) > 0) list.push(Object.assign(this.me(), { score: s.daily.best[game] || 0 }));
      return list.sort((a, b) => b.score - a.score);
    },
    syncProfile() { clearTimeout(pushT); pushT = setTimeout(() => push(false), 1200); },
    addClanPoints(clan, n) {
      if (!clan || !n) return;
      F.setDoc(F.doc(db, 'clans', clan), { total: F.increment(n) }, { merge: true }).catch(err => console.warn('clan', err));
    },
    joinClan(clan) {
      if (!clan) return;
      F.setDoc(F.doc(db, 'clans', clan), { members: F.increment(1) }, { merge: true }).catch(err => console.warn('clan', err));
    },
    pushDaily(game, score) {
      const s = Store.s;
      F.setDoc(F.doc(db, 'daily', dayStr(), game, uid), { name: s.name, avatar: s.avatar, clan: s.clan, score }, { merge: true }).catch(err => console.warn('daily', err));
    },
    async claimStock(r) {
      if (!r.stock) return true;
      const ref = F.doc(db, 'stock', r.id);
      try {
        return await F.runTransaction(db, async tx => {
          const snap = await tx.get(ref);
          const n = snap.exists() ? (snap.data().claimed || 0) : 0;
          if (n >= r.stock) return false;
          tx.set(ref, { claimed: n + 1 }, { merge: true });
          return true;
        });
      } catch (e) { console.warn('stock', e); return false; }
    },
    stockLeft(r) { if (!r.stock) return null; return Math.max(0, r.stock - (cache.stock[r.id] || 0)); }
  });

  // Joueur déjà inscrit avant l'activation du mode en ligne : on le publie
  if (Store.s.clan) push(false);
  Net.emit();
}
