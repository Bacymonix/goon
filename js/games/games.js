/* Goon — catalogue des jeux de l'Arène (ordre d'affichage + Épreuve du Harpon) */
(function () {
  'use strict';
  const G = window.GOON_GAMES = window.GOON_GAMES || {};
  G.archer = {
    id: 'archer', name: 'L\'Épreuve du Harpon', icon: '🔱', color: '#0E5A8A', color2: '#FF7A59',
    tagline: '5 flèches, du courant, des cibles qui bougent.', unit: 'points',
    perles: s => Math.min(100, s),
    botScore: r => Math.floor(8 + r * r * 88),
    tutorial: [['👆', '<b>Maintiens</b> le doigt n\'importe où pour armer le harpon'], ['↔️', '<b>Glisse</b> pour viser, <b>relâche</b> pour tirer'], ['🌬️', 'Le <b>courant</b> pousse ta flèche : vise à contre-courant'], ['💪', 'Relâche avant que tes <b>bras tremblent</b>'], ['🐚', 'Une <b>perle dorée</b> passe ? Touche-la : +15']],
    badges: res => {
      const b = ['premiere-fleche'];
      if (res.maxCombo >= 3) b.push('oeil-faucon');
      if (res.bulls >= 5) b.push('main-parfaite');
      if (res.score >= 70) b.push('elite');
      if (res.pearls >= 1) b.push('perle-doree');
      return b;
    },
    controller: window.ArcheryGame
  };
  // Ordre d'affichage dans l'Arène
  window.GOON_GAME_ORDER = ['archer', 'runner', 'dash', 'poisson', 'stack'].filter(id => G[id]);
})();
