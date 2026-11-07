/* =====================================================================
   GOON — FICHIER DE CONFIGURATION (version de travail, thème sous-marin)
   ---------------------------------------------------------------------
   Généré par outils/fabriquer-goon.js — modifie plutôt outils/goon/config.js
   Les codes secrets ne sont jamais écrits en clair ici : seulement leur empreinte.
   ===================================================================== */
window.GOON_CONFIG = {
  appName: 'Goon',
  school: 'Liste BDS · Campagne 2026',
  tagline: 'Monte à bord. Pêche des perles. Remonte le trésor.',

  campaignStart: '2026-11-16T08:00',
  voteDate: '2026-11-20T09:00',
  voteEnd: '2026-11-20T18:00',
  voteText: 'Le 20 novembre, vote Goon 🐚',

  appUrl: '',
  salt: 'goon',
  staffPinHash: 'e860c7d30ae402917674d1c49c6f24db3bda99e42ff04f45898b2ad3e187f1c5',

  dailyTries: 5,
  featuredBoost: 1.5,
  welcomeBonus: 50,
  randomClanBonus: 25,
  streakRewards: [10, 15, 20, 25, 40, 50, 75],
  dailyPrize: "Chaque jour, le n°1 de chaque jeu gagne une boisson offerte à la prochaine soirée.",
  clanPrize: 'le brunch de la victoire offert par Goon',
  trésorHint: "6 trésors sont cachés sur le campus. Chacun porte un QR code : scanne-le avec l'appareil photo de ton téléphone.",

  clans: [
    { id: 'requin',  name: 'Clan du Requin',    short: 'Requin',  emoji: '🦈', color: '#5B7C99', motto: 'Toujours en mouvement' },
    { id: 'pieuvre', name: 'Clan de la Pieuvre', short: 'Pieuvre', emoji: '🐙', color: '#C2477A', motto: 'Huit bras, zéro limite' },
    { id: 'dauphin', name: 'Clan du Dauphin',   short: 'Dauphin', emoji: '🐬', color: '#2E86C1', motto: 'Le sourire et la vitesse' },
    { id: 'tortue',  name: 'Clan de la Tortue',  short: 'Tortue',  emoji: '🐢', color: '#2E9E6B', motto: 'Carapace et sang-froid' }
  ],

  wheel: {
    cost: 50,
    maxPerDay: 3,
    segments: [
      { label: '+20',     icon: '🐚', type: 'perles', value: 20,  weight: 22, color: '#0E5A8A' },
      { label: 'Rien…',   icon: '💤', type: 'rien',               weight: 16, color: '#EAF4F8', text: '#0B1D2A' },
      { label: '+1 tir',  icon: '🎮', type: 'essai',  value: 1,   weight: 14, color: '#FF7A59' },
      { label: '+60',     icon: '🐚', type: 'perles', value: 60,  weight: 14, color: '#0A3F63' },
      { label: '×2',      icon: '⚡', type: 'boost',              weight: 12, color: '#E0553A' },
      { label: 'Sticker', icon: '🏷️', type: 'bon', reward: 'Sticker Goon', desc: 'À récupérer au stand de Goon', weight: 10, color: '#F2C14E', text: '#0B1D2A' },
      { label: '+150',    icon: '🌟', type: 'perles', value: 150, weight: 5, jackpot: true, color: '#0B1D2A' },
      { label: 'Crêpe',   icon: '🥞', type: 'bon', reward: 'Crêpe offerte', desc: 'Au Goûter de Goon', weight: 7, color: '#3A8FC4' }
    ]
  },

  eventTypes: {
    campagne: { label: 'Campagne', icon: '🐚', color: '#0B1D2A' },
    sport:    { label: 'Sport',    icon: '⚽', color: '#FF7A59' },
    defi:     { label: 'Défi',     icon: '🔱', color: '#0E5A8A' },
    food:     { label: 'Miam',     icon: '🥞', color: '#F2C14E' },
    soiree:   { label: 'Soirée',   icon: '🌙', color: '#0A3F63' }
  },

  planning: [
    { id: 'e1',  day: '2026-11-16', start: '08:00', end: '10:00', type: 'food',     title: 'Le Café du Matelot', place: 'Entrée du campus', desc: 'Petit-déj offert pour lancer la semaine : viennoiseries, jus, café.', code: 'ev-reveil' },
    { id: 'e2',  day: '2026-11-16', start: '12:30', end: '13:30', type: 'campagne', title: 'La Grande Plongée', place: 'Amphi A', desc: 'Présentation de la liste, des clans et du programme. Les premiers arrivés repartent avec un goodie.', code: 'ev-plongee' },
    { id: 'e3',  day: '2026-11-16', start: '18:00', end: '21:00', type: 'sport',    title: 'La Chasse au Requin', place: 'Gymnase', desc: 'Tournoi de foot à 5, clan contre clan. Inscription sur place.', code: 'ev-requin' },
    { id: 'e4',  day: '2026-11-17', start: '12:00', end: '14:00', type: 'defi',     title: 'Le Défi du Harpon', place: 'Pelouse centrale', desc: "Viens battre ton score de l'appli… en vrai.", code: 'ev-harpon' },
    { id: 'e5',  day: '2026-11-17', start: '16:30', end: '18:00', type: 'food',     title: 'Le Goûter de Goon', place: 'Foyer', desc: 'Crêpes, chocolat chaud et bonne humeur.', code: 'ev-crepes' },
    { id: 'e6',  day: '2026-11-17', start: '19:00', end: '22:00', type: 'sport',    title: 'Lagon Cup', place: 'Terrain de sable', desc: 'Tournoi de beach-volley 3 contre 3. Ambiance plage garantie.', code: 'ev-lagon' },
    { id: 'e7',  day: '2026-11-18', start: '13:30', end: '16:30', type: 'defi',     title: "La Chasse à l'Épave", place: 'Départ : parvis', desc: "Course d'orientation géante à travers le campus. Indices, énigmes et perles à la clé.", code: 'ev-epave' },
    { id: 'e8',  day: '2026-11-18', start: '18:30', end: '21:00', type: 'soiree',   title: "L'Escale", place: 'Bar partenaire', desc: "Happy hour prolongé pour tout l'équipage.", code: 'ev-escale' },
    { id: 'e9',  day: '2026-11-19', start: '12:00', end: '14:00', type: 'food',     title: 'Barbecue sur le pont', place: 'Pelouse centrale', desc: 'Barbecue géant, musique et jeux.', code: 'ev-bbq' },
    { id: 'e10', day: '2026-11-19', start: '22:00', end: '04:00', type: 'soiree',   title: 'La Nuit des Abysses', place: 'Salle des fêtes', desc: 'LA soirée de la campagne. Dress code : bleu océan & corail.', code: 'ev-nuit' },
    { id: 'e11', day: '2026-11-20', start: '09:00', end: '18:00', type: 'campagne', title: 'Jour du vote', place: 'Hall principal', desc: 'Le moment de vérité. Vote Goon !' },
    { id: 'e12', day: '2026-11-20', start: '18:30', end: '20:00', type: 'campagne', title: 'Le Conseil des Abysses', place: 'Amphi A', desc: 'Résultats, remise des prix des jeux et du clan vainqueur.', code: 'ev-conseil' }
  ],

  codes: [
    { id: 'bonus-bienvenue', kind: 'bonus', title: 'Code de bienvenue', perles: 25, hash: '630fc4186138b51a0463709c60ceab742c9c76ad62d399f779ab8f89eb445e3d' },

    { id: 'ev-reveil',  kind: 'event', title: 'Le Café du Matelot', perles: 40, hash: 'd9fe04aed764bf5d1e597f6556d2652c7663924680a29d5f214561311e013c80' },
    { id: 'ev-plongee', kind: 'event', title: 'La Grande Plongée', perles: 50, tries: 1, hash: '4d05bd2cf33362a454f9fcc3fa1bc9a88fe85cdfc64bc94bc9698676fc2ea243' },
    { id: 'ev-requin',  kind: 'event', title: 'La Chasse au Requin', perles: 50, hash: 'f6be716aa2f893ba71b8e8c96c13f5f6c0060e62b5298965c3bed4646651fe45' },
    { id: 'ev-harpon',  kind: 'event', title: 'Le Défi du Harpon', perles: 50, tries: 1, hash: '5906916bdca1c38fc2986110d38f2de980293d073b2a28fc0f2c0449f3871b92' },
    { id: 'ev-crepes',  kind: 'event', title: 'Le Goûter de Goon', perles: 40, hash: 'b4854be6f677c802a1edfab2d6ffd4ba2a8c427f93c6eb975d94e167ee940bef' },
    { id: 'ev-lagon',   kind: 'event', title: 'Lagon Cup', perles: 50, hash: 'd16cbba7a71ab8f8d61b106a6ecb70a323c2a19b88a87fab8d00d16fdb37ad1b' },
    { id: 'ev-epave',   kind: 'event', title: "La Chasse à l'Épave", perles: 60, tries: 1, hash: 'ad7eca10aa22a4a1918db4c30fea2c8f5f6260fee4b1c335ed0e9e1eae1249d7' },
    { id: 'ev-escale',  kind: 'event', title: "L'Escale", perles: 40, hash: '77e21c80f8c77efe1b00c66a05172febcd5845aa2cc0801911576fe319d60619' },
    { id: 'ev-bbq',     kind: 'event', title: 'Barbecue sur le pont', perles: 40, hash: 'dd5c7a3c6765204c44a47a54df809d8403584b330793b09a49f403834d5c2aa2' },
    { id: 'ev-nuit',    kind: 'event', title: 'La Nuit des Abysses', perles: 80, tries: 1, hash: 'dbe3b05bf4927d2c6e1849ce2025cc9c547320080d78dfe4859b7d32d9a446aa' },
    { id: 'ev-conseil', kind: 'event', title: 'Le Conseil des Abysses', perles: 50, hash: '33e8de45dcae874fc39f2f0a900d15d0d1c5c1c8853664c33c3bc25c09883fe3' },

    { id: 'q-photo',    kind: 'quete', title: "Photo d'équipage", desc: 'Prends un selfie avec 3 membres de Goon.', perles: 40, hash: 'e26618f21280a230eb41247c34820813e660055d78f0c62ac8ff738475a0643a' },
    { id: 'q-story',    kind: 'quete', title: 'Le Sonar', desc: 'Partage la story de Goon et montre-la à un membre.', perles: 30, hash: 'ed6459cded5d187f47251b8a74025f9f30d7dcac96332784fa80913b4106983c' },
    { id: 'q-chanson',  kind: 'quete', title: 'Le Chant des Marins', desc: "Chante l'hymne de Goon devant un membre de la liste.", perles: 60, hash: '961c0a5956bebe3fe0da78f41b323100749e901c92a81a56362ce3f9be22e167' },
    { id: 'q-couleurs', kind: 'quete', title: 'Aux couleurs de Goon', desc: 'Viens en cours habillé·e en bleu océan et corail.', perles: 50, hash: '63a3baf196ee22b3942a7c6e4e95a087f96140db93e6c345f82ee06ca9626960' },
    { id: 'q-recrue',   kind: 'quete', title: 'Recruteur', desc: 'Ramène 2 potes à la Grande Plongée.', perles: 70, hash: '2586582ce43973f78392e728f6c400e1b4604f5d086393025dba0c161d3f81fd' },

    { id: 't-savoir',   kind: 'trésor', title: 'Le Trésor du Savoir',     perles: 75, tries: 1, hash: '797e9c95e4bfb2cfaff279d08eaf8772473ead99d879acd242f75f1e4351cceb' },
    { id: 't-sueur',    kind: 'trésor', title: 'Le Trésor de la Sueur',   perles: 75, tries: 1, hash: '768619faf4733b59166cf9d8097301e618646a4b0c0ec5780172731b981951a1' },
    { id: 't-gourmand', kind: 'trésor', title: 'Le Trésor Gourmand',      perles: 75, tries: 1, hash: '6266c57b115f6f06722301765b09db5f3c7e4e506cd3e10e7f15118c49833ac7' },
    { id: 't-murmures', kind: 'trésor', title: 'Le Trésor des Murmures',  perles: 75, tries: 1, hash: '73ac7ab35837fec12248e5c2f46ec0afd3d8667ea1294c8afe797abdb545afd0' },
    { id: 't-passage',  kind: 'trésor', title: 'Le Trésor du Passage',    perles: 75, tries: 1, hash: 'b22e2ab69283971931057ffd904451c5bff15ff9b1282b4454f788b84fb049da' },
    { id: 't-oublie',   kind: 'trésor', title: 'Le Trésor Oublié',        perles: 75, tries: 1, hash: 'fd259d03596da1ab862e1cd01413b39a743c3c653c6cb6817c0de67957ba66e6' }
  ],

  rewards: [
    { id: 'crepe',      icon: '🥞', title: 'Crêpe offerte',          desc: 'Au Goûter de Goon',                  cost: 120,  stock: 60 },
    { id: 'boisson',    icon: '🥤', title: 'Boisson offerte',        desc: 'À la Nuit des Abysses',              cost: 180,  stock: 80 },
    { id: 'reduc-bar',  icon: '🍻', title: '-20 % au bar partenaire', desc: 'Valable toute la semaine',          cost: 200,  stock: 100 },
    { id: 'reduc-sport',icon: '👟', title: '-15 % magasin de sport',  desc: 'Chez notre partenaire',             cost: 300,  stock: 40 },
    { id: 'coupe-file', icon: '⚡', title: 'Coupe-file soirée',      desc: 'Entre sans faire la queue',          cost: 350,  stock: 30 },
    { id: 'bonnet',     icon: '🧢', title: 'Bonnet Goon',            desc: 'Le goodie officiel de l’équipage',   cost: 450,  stock: 40 },
    { id: 'gourde',     icon: '🧴', title: 'Gourde Goon',            desc: 'Pour tous les sportifs de l’équipage', cost: 600, stock: 25 },
    { id: 'sweat',      icon: '🧥', title: 'Sweat Goon',             desc: 'Édition collector, numérotée',       cost: 1500, stock: 10 }
  ],

  prizes: [
    { icon: '🎮', title: 'Champions du jour',   text: 'Chaque jour, le n°1 de chacun des 5 jeux de l’Arène gagne une boisson offerte.' },
    { icon: '🏆', title: 'Top 3 de l’équipage', text: 'En fin de campagne : sweat collector, place VIP à la soirée de fin et bonnet.' },
    { icon: '🌊', title: 'Clan vainqueur',      text: 'Tout le clan gagnant est invité au brunch de la victoire.' },
    { icon: '✨', title: 'Chasseur de trésors', text: 'Les 10 premiers à trouver les 6 trésors gagnent un goodie surprise.' }
  ],

  sos: {
    title: 'SOS Goon',
    subtitle: 'On te livre partout sur le campus',
    hours: 'Tous les soirs de 19h à 2h pendant la campagne',
    eta: [12, 25],
    maxPerItem: 5,
    couriers: [
      { name: 'Hugo', emoji: '🦊', ride: 'à trottinette 🛴' }, { name: 'Inès', emoji: '🐬', ride: 'à vélo 🚲' },
      { name: 'Théo', emoji: '🦈', ride: 'en courant 🏃' }, { name: 'Léa', emoji: '🐙', ride: 'en rollers 🛼' },
      { name: 'Sacha', emoji: '🐳', ride: 'à trottinette 🛴' }, { name: 'Jade', emoji: '🐢', ride: 'à vélo 🚲' }
    ],
    places: ['Résidence A', 'Résidence B', 'Résidence C', 'Bâtiment principal', 'BU', 'Foyer', 'Gymnase', 'Ailleurs sur le campus'],
    slots: ['Dès que possible', '20h – 20h30', '21h – 21h30', '22h – 22h30', '23h – 23h30', 'Minuit – 0h30', 'Demain matin 7h30 – 8h'],
    payments: ['Espèces à la livraison', 'Lydia à la livraison'],
    categories: [
      { id: 'miam', label: 'Miam', icon: '🥞' },
      { id: 'boire', label: 'À boire', icon: '🥤' },
      { id: 'nuit', label: 'Spécial nuit', icon: '🌙' },
      { id: 'services', label: 'Services', icon: '🧹' }
    ],
    items: [
      { id: 'crepe', cat: 'miam', icon: '🥞', name: 'SOS Crêpe', desc: 'Crêpe maison, livrée bien chaude.', price: 1, popular: true,
        options: [{ name: 'Garniture', choices: [{ label: 'Sucre', price: 0 }, { label: 'Nutella', price: 0.5 }, { label: 'Confiture', price: 0 }, { label: 'Caramel beurre salé', price: 0.5 }] }] },
      { id: 'croque', cat: 'miam', icon: '🥪', name: 'SOS Croque', desc: 'Croque-monsieur doré au four.', price: 1.5,
        options: [{ name: 'Version', choices: [{ label: 'Classique', price: 0 }, { label: 'Végé (double fromage)', price: 0 }] }] },
      { id: 'petitdej', cat: 'miam', icon: '🥐', name: 'SOS Petit-déj au lit', desc: 'Viennoiserie + jus + boisson chaude, livrés au réveil.', price: 2, popular: true,
        options: [{ name: 'Boisson chaude', choices: [{ label: 'Café', price: 0 }, { label: 'Thé', price: 0 }, { label: 'Chocolat chaud', price: 0 }] }] },
      { id: 'pates', cat: 'nuit', icon: '🍝', name: 'SOS Pâtes de minuit', desc: 'Une assiette fumante pour les fringales nocturnes.', price: 2,
        options: [{ name: 'Sauce', choices: [{ label: 'Carbonara', price: 0 }, { label: 'Pesto', price: 0 }, { label: 'Bolognaise', price: 0.5 }] }] },
      { id: 'raccompagne', cat: 'nuit', icon: '🌙', name: 'SOS Raccompagnement', desc: 'Un membre de Goon te raccompagne après la soirée.', price: 0 },
      { id: 'choco', cat: 'boire', icon: '☕', name: 'SOS Chocolat chaud', desc: 'Avec chantilly si tu es sage.', price: 0.5 },
      { id: 'soft', cat: 'boire', icon: '🥤', name: 'SOS Boisson fraîche', desc: 'Pour survivre aux révisions.', price: 1,
        options: [{ name: 'Boisson', choices: [{ label: 'Cola', price: 0 }, { label: 'Thé glacé', price: 0 }, { label: 'Jus d\'orange', price: 0 }] }] },
      { id: 'reveil', cat: 'services', icon: '⏰', name: 'SOS Réveil', desc: 'On vient te réveiller en chanson (ou à la corne de brume).', price: 0, popular: true,
        options: [{ name: 'Style', choices: [{ label: 'Doux et câlin', price: 0 }, { label: 'Corne de brume et fanfare', price: 0 }] }] },
      { id: 'vaisselle', cat: 'services', icon: '🧽', name: 'SOS Vaisselle', desc: 'On fait ta vaisselle pendant que tu révises.', price: 0 },
      { id: 'serenade', cat: 'services', icon: '🎸', name: 'SOS Sérénade', desc: 'Une chanson sous la fenêtre de la personne de ton choix.', price: 0,
        options: [{ name: 'Ambiance', choices: [{ label: 'Romantique', price: 0 }, { label: 'Gênante à souhait', price: 0 }] }] },
      { id: 'mascotte', cat: 'services', icon: '🐙', name: 'SOS Mascotte', desc: 'La pieuvre de Goon débarque pour un câlin (ou une photo).', price: 0 }
    ]
  },

  news: [
    { date: '2026-11-07', title: "L'appli de Goon est en ligne !", text: "Choisis ton clan, entraîne-toi dans l'Arène et prépare-toi : la campagne commence lundi 16 novembre." },
    { date: '2026-11-07', title: '6 trésors cachés sur le campus', text: 'Chaque trésor porte un QR code. Scanne-le pour gagner 75 perles et une manche bonus. Les premiers chasseurs seront récompensés.' },
    { date: '2026-11-06', title: 'Le Comptoir est ouvert', text: 'Crêpes, boissons, réducs chez nos partenaires, goodies… Échange tes perles contre de vrais cadeaux.' }
  ],

  firebase: null
};
