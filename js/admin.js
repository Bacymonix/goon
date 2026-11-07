/* Goon — espace orga : génération des codes, QR et PIN */
(function () {
  'use strict';
  const { C, codeHash, pinHash, normCode, esc, rc } = window.GOON;
  const $ = s => document.querySelector(s);
  const KIND = { event: 'Événement', quete: 'Quête', trésor: 'Trésor caché', bonus: 'Bonus' };
  const PREFIX = { event: 'EV', quete: 'QUETE', trésor: 'TRESOR', bonus: 'BONUS' };

  const appUrl = () => (C.appUrl || (location.origin + location.pathname.replace(/admin\.html$/, ''))).replace(/\/?$/, '/');
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

  if (C.staffPinHash === pinHash('1234')) $('#demo-warn').hidden = false;

  /* ---- Codes existants ---- */
  function renderTable() {
    const rows = C.codes.map(c => '<tr><td><code>' + esc(c.id) + '</code></td><td><span class="kind">' + (KIND[c.kind] || c.kind) + '</span></td><td>' + esc(c.title) + '</td><td>' + c.perles + (c.tries ? ' + ' + c.tries + ' essai' : '') + '</td></tr>').join('');
    $('#codes').innerHTML = '<thead><tr><th>id</th><th>Type</th><th>Titre</th><th>Perles</th></tr></thead><tbody>' + rows + '</tbody>';
  }
  renderTable();

  /* ---- Création ---- */
  const form = $('#f-code');
  $('#gen').onclick = () => { form.code.value = PREFIX[form.kind.value] + '-' + rc(4); };
  form.kind.onchange = () => { if (form.kind.value === 'trésor') { form.perles.value = 75; form.tries.value = 1; } };

  let lastCode = '', lastTitle = '';
  form.onsubmit = e => {
    e.preventDefault();
    const code = normCode(form.code.value);
    if (code.length < 4) { alert('Le code doit faire au moins 4 lettres/chiffres.'); return; }
    const h = codeHash(code);
    const exists = C.codes.find(c => c.hash === h);
    if (exists) { alert('Ce code existe déjà dans la config (' + exists.id + ').'); return; }
    const kind = form.kind.value, title = form.title.value.trim();
    const id = (kind === 'event' ? 'ev' : kind === 'quete' ? 'q' : kind === 'trésor' ? 't' : 'bonus') + '-' + (slug(title) || 'code') + '-' + rc(2).toLowerCase();
    const parts = ['id: ' + q(id), 'kind: ' + q(kind), 'title: ' + q(title)];
    if (form.desc.value.trim()) parts.push('desc: ' + q(form.desc.value.trim()));
    parts.push('perles: ' + (parseInt(form.perles.value, 10) || 0));
    if (parseInt(form.tries.value, 10) > 0) parts.push('tries: ' + parseInt(form.tries.value, 10));
    if (form.from.value) parts.push('from: ' + q(form.from.value));
    if (form.until.value) parts.push('until: ' + q(form.until.value));
    parts.push('hash: ' + q(h));
    $('#snippet').textContent = '{ ' + parts.join(', ') + ' },';
    $('#code-id').textContent = id;
    $('#out-code').classList.add('show');
    lastCode = code; lastTitle = title;
    makeQR(code, title, kind);
  };

  function makeQR(code, title, kind) {
    const url = appUrl() + '?code=' + encodeURIComponent(code);
    $('#qr-url').textContent = url;
    $('#qr').innerHTML = ''; $('#p-qr').innerHTML = '';
    if (!window.QRCode) { $('#qr').textContent = 'QR indisponible (pas de connexion ?)'; return; }
    const opts = { text: url, width: 360, height: 360, colorDark: '#0B1D2A', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M };
    new QRCode($('#qr'), opts);
    new QRCode($('#p-qr'), opts);
    $('#p-title').textContent = kind === 'trésor' ? 'Tu as trouvé un trésor caché !' : title;
    $('#p-sub').textContent = kind === 'trésor' ? 'Scanne-moi vite pour gagner tes perles 🐚' : "Scanne-moi avec l'appareil photo de ton téléphone";
  }

  $('#dl-qr').onclick = () => {
    const c = $('#qr canvas'), img = $('#qr img');
    const href = (img && img.src && img.src.startsWith('data:')) ? img.src : (c ? c.toDataURL('image/png') : '');
    if (!href) return;
    const a = document.createElement('a'); a.href = href; a.download = 'qr-' + slug(lastTitle || lastCode) + '.png'; a.click();
  };
  $('#print').onclick = () => window.print();

  /* ---- PIN ---- */
  $('#f-pin').onsubmit = e => {
    e.preventDefault();
    const pin = e.target.pin.value.trim();
    if (pin.length < 4) { alert('Au moins 4 caractères.'); return; }
    $('#pin-snippet').textContent = "staffPinHash: '" + pinHash(pin) + "',";
    $('#out-pin').classList.add('show');
  };

  /* ---- Test ---- */
  $('#f-test').onsubmit = e => {
    e.preventDefault();
    const h = codeHash(e.target.code.value), c = C.codes.find(x => x.hash === h);
    $('#test-res').innerHTML = c ? '<span class="ok">✓ Reconnu :</span> ' + esc(c.title) + ' (' + (KIND[c.kind] || c.kind) + ', ' + c.perles + ' perles)' : '<span class="ko">✗ Code inconnu dans la config actuelle.</span>';
  };

  /* ---- Copier ---- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const txt = document.getElementById(b.dataset.copy).textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => { b.textContent = 'Copié ✓'; b.classList.add('copied'); setTimeout(() => { b.textContent = 'Copier'; b.classList.remove('copied'); }, 1500); })
      .catch(() => { const r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  });
})();
