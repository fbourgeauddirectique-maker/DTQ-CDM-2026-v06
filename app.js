import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, addDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'A_REMPLACER',
  authDomain: 'A_REMPLACER',
  projectId: 'A_REMPLACER',
  storageBucket: 'A_REMPLACER',
  messagingSenderId: 'A_REMPLACER',
  appId: 'A_REMPLACER'
};

const OLD_PHASES = [
  { id: 'before_r16', label: 'Avant les 1/16e', points: 50 },
  { id: 'before_r8', label: 'Avant les 1/8e', points: 40 },
  { id: 'before_qf', label: 'Avant les quarts', points: 30 },
  { id: 'before_sf', label: 'Avant les demies', points: 20 },
  { id: 'before_final', label: 'Avant la finale', points: 10 }
];

const TEAMS = ['ARG','BRA','FRA','ESP','POR','ENG','GER','ITA','NED','BEL','CRO','URU','USA','MEX','MAR','JPN','KOR','SEN','DEN','SUI','POL','AUT','COL','ECU','CAN','CHI','SRB','TUR','SWE','NOR','CIV','NGA'];
const TEAM_LABELS = {
  ARG:'Argentine', BRA:'Brésil', FRA:'France', ESP:'Espagne', POR:'Portugal', ENG:'Angleterre', GER:'Allemagne', ITA:'Italie',
  NED:'Pays-Bas', BEL:'Belgique', CRO:'Croatie', URU:'Uruguay', USA:'États-Unis', MEX:'Mexique', MAR:'Maroc', JPN:'Japon',
  KOR:'Corée du Sud', SEN:'Sénégal', DEN:'Danemark', SUI:'Suisse', POL:'Pologne', AUT:'Autriche', COL:'Colombie', ECU:'Équateur',
  CAN:'Canada', CHI:'Chili', SRB:'Serbie', TUR:'Turquie', SWE:'Suède', NOR:'Norvège', CIV:'Côte d\'Ivoire', NGA:'Nigeria'
};

const state = {
  app: null, auth: null, db: null, user: null,
  settings: { currentPhase: 'before_r16', actualWinner: '', aliveTeams: [...TEAMS], winnerDeadline: '' },
  participants: [],
  matches: [],
  predictions: [],
  winnerPredictions: [],
  selectedRankingUsers: [],
  unsubscribes: []
};

const els = {
  themeToggle: document.getElementById('themeToggle'),
  authBtn: document.getElementById('authBtn'),
  userBadge: document.getElementById('userBadge'),
  participantsCount: document.getElementById('participantsCount'),
  completedMatchesCount: document.getElementById('completedMatchesCount'),
  leaderboardBody: document.getElementById('leaderboardBody'),
  rankingParticipants: document.getElementById('rankingParticipants'),
  rankingChart: document.getElementById('rankingChart'),
  winnerPhaseLabel: document.getElementById('winnerPhaseLabel'),
  winnerPhasePoints: document.getElementById('winnerPhasePoints'),
  winnerActualLabel: document.getElementById('winnerActualLabel'),
  winnerUserStatus: document.getElementById('winnerUserStatus'),
  winnerDeadline: document.getElementById('winnerDeadline'),
  winnerDeadlineInfo: document.getElementById('winnerDeadlineInfo'),
  winnerPhaseSelect: document.getElementById('winnerPhaseSelect'),
  winnerTeamSelect: document.getElementById('winnerTeamSelect'),
  winnerOnlyAliveTeams: document.getElementById('winnerOnlyAliveTeams'),
  winnerPredictionForm: document.getElementById('winnerPredictionForm'),
  winnerClearBtn: document.getElementById('winnerClearBtn'),
  winnerPhaseInfo: document.getElementById('winnerPhaseInfo'),
  winnerHistoryBody: document.getElementById('winnerHistoryBody'),
  winnerLeaderboardBody: document.getElementById('winnerLeaderboardBody'),
  participantForm: document.getElementById('participantForm'),
  participantName: document.getElementById('participantName'),
  winnerAdminForm: document.getElementById('winnerAdminForm'),
  adminWinnerPhase: document.getElementById('adminWinnerPhase'),
  adminActualWinner: document.getElementById('adminActualWinner'),
  winnerTeamsChecklist: document.getElementById('winnerTeamsChecklist'),
  seedDemoBtn: document.getElementById('seedDemoBtn'),
  matchForm: document.getElementById('matchForm'),
  matchHome: document.getElementById('matchHome'),
  matchAway: document.getElementById('matchAway'),
  matchHomeScore: document.getElementById('matchHomeScore'),
  matchAwayScore: document.getElementById('matchAwayScore')
};

initTheme();
populateStaticOptions();
setupTabs();
attachEvents();
setupFirebase();

function initTheme() {
  const pref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', pref);
  els.themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`[data-tab-panel="${btn.dataset.tabTarget}"]`)?.classList.add('active');
    if (btn.dataset.tabTarget === 'dashboard') setTimeout(renderRankingChart, 80);
  }));
}

function populateStaticOptions() {
  const phaseHtml = OLD_PHASES.map(p => `<option value="${p.id}">${p.label} · ${p.points} pts</option>`).join('');
  els.winnerPhaseSelect.innerHTML = phaseHtml;
  els.adminWinnerPhase.innerHTML = phaseHtml;
  const teamOptions = TEAMS.map(c => `<option value="${c}">${TEAM_LABELS[c]}</option>`).join('');
  els.winnerTeamSelect.innerHTML = `<option value="">Choisir une équipe</option>${teamOptions}`;
  els.adminActualWinner.innerHTML = `<option value="">Non défini</option>${teamOptions}`;
  els.matchHome.innerHTML = `<option value="">Choisir</option>${teamOptions}`;
  els.matchAway.innerHTML = `<option value="">Choisir</option>${teamOptions}`;
  renderWinnerTeamsChecklist(state.settings.aliveTeams);
  refreshWinnerUi();
}

function setupFirebase() {
  const needsConfig = Object.values(firebaseConfig).some(v => v === 'A_REMPLACER');
  if (needsConfig) {
    els.userBadge.textContent = 'Configurer Firebase';
    els.winnerUserStatus.textContent = 'Configurer Firebase';
    els.authBtn.textContent = 'Firebase non configuré';
    els.authBtn.disabled = true;
    return;
  }
  state.app = initializeApp(firebaseConfig);
  state.auth = getAuth(state.app);
  state.db = getFirestore(state.app);
  onAuthStateChanged(state.auth, async user => {
    state.user = user;
    if (user) {
      els.authBtn.textContent = 'Se déconnecter';
      els.userBadge.textContent = user.uid.slice(0, 10);
      els.winnerUserStatus.textContent = `Connecté · ${user.uid.slice(0, 8)}`;
      await ensureParticipant(user.uid);
      subscribeData();
    } else {
      els.authBtn.textContent = 'Connexion anonyme';
      els.userBadge.textContent = 'Hors ligne';
      els.winnerUserStatus.textContent = 'Hors ligne';
      cleanupSubs();
      state.participants = [];
      state.matches = [];
      state.predictions = [];
      state.winnerPredictions = [];
      renderAll();
    }
  });
}

function attachEvents() {
  els.authBtn.addEventListener('click', async () => {
    if (!state.auth) return;
    if (state.user) await signOut(state.auth);
    else await signInAnonymously(state.auth);
  });

  els.winnerOnlyAliveTeams.addEventListener('change', refreshWinnerTeamOptions);
  els.winnerPhaseSelect.addEventListener('change', refreshWinnerUi);
  els.rankingParticipants.addEventListener('change', () => {
    renderRankingChart();
  });

  els.winnerPredictionForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.user || !state.db) return alert('Connectez-vous d’abord.');
    if (state.settings.winnerDeadline && Date.now() > new Date(state.settings.winnerDeadline).getTime()) return alert('La date limite de saisie est dépassée.');
    const phaseId = els.winnerPhaseSelect.value;
    const team = els.winnerTeamSelect.value;
    if (!phaseId || !team) return alert('Choisissez une phase et une équipe.');
    await setDoc(doc(state.db, 'winnerPredictions', `${state.user.uid}_${phaseId}`), {
      userId: state.user.uid,
      userLabel: participantLabel(state.user.uid),
      phaseId,
      team,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  els.winnerClearBtn.addEventListener('click', async () => {
    if (!state.user || !state.db) return;
    const phaseId = els.winnerPhaseSelect.value;
    await setDoc(doc(state.db, 'winnerPredictions', `${state.user.uid}_${phaseId}`), {
      userId: state.user.uid,
      userLabel: participantLabel(state.user.uid),
      phaseId,
      team: '',
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  els.participantForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.db) return;
    const name = els.participantName.value.trim();
    if (!name) return;
    const id = `manual_${slugify(name)}_${Date.now().toString(36)}`;
    await setDoc(doc(state.db, 'users', id), { uid: id, displayName: name, createdAt: serverTimestamp() });
    els.participantName.value = '';
  });

  els.winnerAdminForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.db) return;
    const aliveTeams = Array.from(els.winnerTeamsChecklist.querySelectorAll('input:checked')).map(i => i.value);
    await setDoc(doc(state.db, 'settings', 'winnerGame'), {
      currentPhase: els.adminWinnerPhase.value,
      actualWinner: els.adminActualWinner.value,
      aliveTeams,
      winnerDeadline: els.winnerDeadline?.value ? new Date(els.winnerDeadline.value).toISOString() : '',
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  els.matchForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.db) return;
    const home = els.matchHome.value;
    const away = els.matchAway.value;
    if (!home || !away || home === away) return alert('Choisissez deux équipes différentes.');
    await addDoc(collection(state.db, 'matches'), {
      home, away,
      homeScore: Number(els.matchHomeScore.value || 0),
      awayScore: Number(els.matchAwayScore.value || 0),
      status: 'FINISHED',
      createdAt: serverTimestamp()
    });
    els.matchForm.reset();
    els.matchHomeScore.value = 0; els.matchAwayScore.value = 0;
  });

  els.seedDemoBtn.addEventListener('click', seedDemoData);
}

async function ensureParticipant(uid) {
  const ref = doc(state.db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { uid, displayName: `Participant ${uid.slice(0, 6)}`, createdAt: serverTimestamp() });
  }
}

function subscribeData() {
  cleanupSubs();
  state.unsubscribes.push(onSnapshot(collection(state.db, 'users'), snap => {
    state.participants = snap.docs.map(d => d.data());
    renderAll();
  }));
  state.unsubscribes.push(onSnapshot(query(collection(state.db, 'matches'), orderBy('createdAt', 'asc')), snap => {
    state.matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  }));
  state.unsubscribes.push(onSnapshot(collection(state.db, 'predictions'), snap => {
    state.predictions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAll();
  }));
  state.unsubscribes.push(onSnapshot(collection(state.db, 'winnerPredictions'), snap => {
    state.winnerPredictions = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.team);
    renderAll();
  }));
  state.unsubscribes.push(onSnapshot(doc(state.db, 'settings', 'winnerGame'), snap => {
    state.settings = snap.exists() ? { ...state.settings, ...snap.data() } : state.settings;
    renderWinnerTeamsChecklist(state.settings.aliveTeams || []);
    refreshWinnerUi();
    renderAll();
  }));
}

function cleanupSubs() {
  state.unsubscribes.forEach(fn => fn());
  state.unsubscribes = [];
}

function renderAll() {
  els.participantsCount.textContent = String(state.participants.length);
  els.completedMatchesCount.textContent = String(state.matches.length);
  refreshWinnerUi();
  renderLeaderboard();
  renderWinnerHistory();
  renderWinnerLeaderboard();
  renderRankingSelect();
  renderRankingChart();
}

function refreshWinnerUi() {
  const phase = OLD_PHASES.find(p => p.id === (state.settings.currentPhase || els.winnerPhaseSelect.value)) || OLD_PHASES[0];
  els.winnerPhaseLabel.textContent = phase.label;
  els.winnerPhasePoints.textContent = String(phase.points);
  els.winnerActualLabel.textContent = state.settings.actualWinner ? TEAM_LABELS[state.settings.actualWinner] : 'Non défini';
  els.winnerPhaseSelect.value = state.settings.currentPhase || phase.id;
  els.adminWinnerPhase.value = state.settings.currentPhase || phase.id;
  els.adminActualWinner.value = state.settings.actualWinner || '';
  els.winnerPhaseInfo.textContent = `Si vous trouvez le champion réel à cette phase, vous marquez ${phase.points} points.`;
  if (state.settings.winnerDeadline) {
    const d = new Date(state.settings.winnerDeadline);
    els.winnerDeadline.value = toLocalInputValue(d);
    els.winnerDeadlineInfo.textContent = `Clôture des pronostics : ${d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}.`;
  } else if (els.winnerDeadline) {
    els.winnerDeadline.value = '';
    els.winnerDeadlineInfo.textContent = 'Les participants ne peuvent plus saisir de vainqueur après cette date.';
  }
  refreshWinnerTeamOptions();
}

function refreshWinnerTeamOptions() {
  const selected = els.winnerTeamSelect.value;
  const pool = els.winnerOnlyAliveTeams.checked ? (state.settings.aliveTeams || TEAMS) : TEAMS;
  els.winnerTeamSelect.innerHTML = `<option value="">Choisir une équipe</option>` + pool.map(c => `<option value="${c}">${TEAM_LABELS[c]}</option>`).join('');
  if (pool.includes(selected)) els.winnerTeamSelect.value = selected;
}

function renderWinnerTeamsChecklist(aliveTeams) {
  els.winnerTeamsChecklist.innerHTML = TEAMS.map(code => `<label class="team-check"><input type="checkbox" value="${code}" ${aliveTeams.includes(code) ? 'checked' : ''}><span>${TEAM_LABELS[code]}</span></label>`).join('');
}

function renderLeaderboard() {
  const rows = buildLeaderboardRows();
  els.leaderboardBody.innerHTML = rows.length ? rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.label}</td><td>${r.totalPoints}</td><td>${r.matchPoints}</td><td>${r.winnerBonus}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-cell">Aucun participant pour le moment.</td></tr>';
}

function renderWinnerHistory() {
  if (!state.user) {
    els.winnerHistoryBody.innerHTML = '<tr><td colspan="4" class="empty-cell">Connectez-vous pour voir vos choix.</td></tr>';
    return;
  }
  const mine = state.winnerPredictions.filter(r => r.userId === state.user.uid);
  const byPhase = new Map(mine.map(r => [r.phaseId, r]));
  const actualWinner = state.settings.actualWinner;
  els.winnerHistoryBody.innerHTML = OLD_PHASES.map(phase => {
    const pred = byPhase.get(phase.id);
    const team = pred?.team;
    const isCorrect = actualWinner && team === actualWinner;
    const isElim = team && !state.settings.aliveTeams.includes(team) && !isCorrect;
    const status = isCorrect ? '<span class="result-ok">Champion trouvé</span>' : isElim ? '<span class="result-ko">Éliminé</span>' : team ? '<span class="result-open">Toujours en course</span>' : '<span class="result-open">En attente</span>';
    return `<tr><td>${phase.label}</td><td>${phase.points}</td><td>${team ? TEAM_LABELS[team] : '—'}</td><td>${status}</td></tr>`;
  }).join('');
}

function renderWinnerLeaderboard() {
  const rows = buildWinnerLeaderboardRows();
  els.winnerLeaderboardBody.innerHTML = rows.length ? rows.map(r => `<tr><td>${r.label}</td><td>${r.score}</td><td>${r.teamLabel || '—'}</td><td>${r.phaseLabel || '—'}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-cell">Aucun bonus pour le moment.</td></tr>';
}

function renderRankingSelect() {
  const current = new Set(Array.from(els.rankingParticipants.selectedOptions).map(o => o.value));
  els.rankingParticipants.innerHTML = state.participants.map(p => `<option value="${p.uid}" ${current.has(p.uid) ? 'selected' : ''}>${p.displayName || participantLabel(p.uid)}</option>`).join('');
}

function renderRankingChart() {
  if (!window.Plotly) return;
  const selected = Array.from(els.rankingParticipants.selectedOptions).map(o => o.value);
  const rows = buildRankingSeries(selected.length ? selected : null);
  const data = rows.series.map(s => ({ x: rows.matchLabels, y: s.values, type: 'scatter', mode: 'lines+markers', name: s.label, line: { width: 3 }, marker: { size: 6 } }));
  if (!data.length) {
    Plotly.newPlot(els.rankingChart, [], { paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', annotations: [{ text: 'Aucune donnée à afficher', showarrow: false }], margin: { t: 20, r: 20, b: 30, l: 30 } }, { responsive: true, displayModeBar: false });
    return;
  }
  Plotly.newPlot(els.rankingChart, data, {
    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
    margin: { t: 20, r: 20, b: 45, l: 50 },
    xaxis: { title: { text: 'Matches terminés' } },
    yaxis: { title: { text: 'Points' } },
    legend: { orientation: 'h' },
    hovermode: 'x unified'
  }, { responsive: true, displayModeBar: false });
}

function buildRankingSeries(selectedUids) {
  const labels = state.matches.map((_, i) => `M${i + 1}`);
  const users = (selectedUids ? state.participants.filter(p => selectedUids.includes(p.uid)) : state.participants).map(p => ({ uid: p.uid, label: p.displayName || participantLabel(p.uid), values: [] }));
  const cumulative = new Map(users.map(u => [u.uid, 0]));
  state.matches.forEach(match => {
    users.forEach(u => {
      const pred = state.predictions.find(p => p.matchId === match.id && p.userId === u.uid);
      const gained = pred ? computeMatchPoints(pred, match) : 0;
      cumulative.set(u.uid, (cumulative.get(u.uid) || 0) + gained);
      u.values.push(cumulative.get(u.uid));
    });
  });
  return { matchLabels: labels, series: users };
}

function buildLeaderboardRows() {
  const winnerMap = buildWinnerScoresMap();
  return state.participants.map(p => {
    const matchPoints = state.matches.reduce((sum, match) => {
      const pred = state.predictions.find(x => x.matchId === match.id && x.userId === p.uid);
      return sum + (pred ? computeMatchPoints(pred, match) : 0);
    }, 0);
    const winner = winnerMap.get(p.uid) || { score: 0, teamLabel: '', phaseLabel: '' };
    const totalPoints = matchPoints + winner.score;
    return { label: p.displayName || participantLabel(p.uid), matchPoints, winnerBonus: winner.score, winnerTeamLabel: winner.teamLabel, winnerPhaseLabel: winner.phaseLabel, totalPoints };
  }).sort((a, b) => b.totalPoints - a.totalPoints || b.matchPoints - a.matchPoints || a.label.localeCompare(b.label));
}

function buildWinnerScoresMap() {
  const grouped = new Map();
  state.winnerPredictions.forEach(row => {
    if (!grouped.has(row.userId)) grouped.set(row.userId, []);
    grouped.get(row.userId).push(row);
  });
  const map = new Map();
  grouped.forEach((rows, uid) => map.set(uid, computeWinnerScore(rows, state.settings.actualWinner)));
  return map;
}

function computeWinnerScore(rows, actualWinner) {
  if (!actualWinner) return { score: 0, teamLabel: '', phaseLabel: '' };
  const sorted = [...rows].sort((a, b) => OLD_PHASES.findIndex(p => p.id === a.phaseId) - OLD_PHASES.findIndex(p => p.id === b.phaseId));
  const found = sorted.find(r => r.team === actualWinner);
  if (!found) return { score: 0, teamLabel: '', phaseLabel: '' };
  const phase = OLD_PHASES.find(p => p.id === found.phaseId);
  return { score: phase?.points || 0, teamLabel: TEAM_LABELS[found.team], phaseLabel: phase?.label || '' };
}

function buildWinnerLeaderboardRows() {
  const winnerMap = buildWinnerScoresMap();
  return state.participants.map(p => {
    const score = winnerMap.get(p.uid) || { score: 0, teamLabel: '', phaseLabel: '' };
    return { label: p.displayName || participantLabel(p.uid), score: score.score, teamLabel: score.teamLabel, phaseLabel: score.phaseLabel };
  }).filter(r => r.score > 0 || r.teamLabel).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function computeMatchPoints(prediction, match) {
  const exact = Number(prediction.homeScore) === Number(match.homeScore) && Number(prediction.awayScore) === Number(match.awayScore);
  if (exact) return 3;
  const pred = Math.sign(Number(prediction.homeScore) - Number(prediction.awayScore));
  const actual = Math.sign(Number(match.homeScore) - Number(match.awayScore));
  return pred === actual ? 1 : 0;
}

function participantLabel(uid) {
  const user = state.participants.find(p => p.uid === uid);
  return user?.displayName || `Participant ${uid.slice(0, 6)}`;
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toLocalInputValue(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function seedDemoData() {
  if (!state.db) return;
  const participants = [
    { uid: 'demo_alice', displayName: 'Alice' },
    { uid: 'demo_bob', displayName: 'Bob' },
    { uid: 'demo_chloe', displayName: 'Chloé' },
    { uid: 'demo_david', displayName: 'David' }
  ];
  await Promise.all(participants.map(u => setDoc(doc(state.db, 'users', u.uid), { ...u, createdAt: serverTimestamp() }, { merge: true })));
  await setDoc(doc(state.db, 'settings', 'winnerGame'), { currentPhase: 'before_r8', actualWinner: 'ARG', aliveTeams: ['ARG','ESP','FRA','ENG','BRA','POR','GER','MAR'], winnerDeadline: new Date(Date.now()+86400000).toISOString(), updatedAt: serverTimestamp() }, { merge: true });
  await Promise.all([
    setDoc(doc(state.db, 'winnerPredictions', 'demo_alice_before_r16'), { userId: 'demo_alice', userLabel: 'Alice', phaseId: 'before_r16', team: 'BRA', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(state.db, 'winnerPredictions', 'demo_alice_before_r8'), { userId: 'demo_alice', userLabel: 'Alice', phaseId: 'before_r8', team: 'ARG', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(state.db, 'winnerPredictions', 'demo_bob_before_r16'), { userId: 'demo_bob', userLabel: 'Bob', phaseId: 'before_r16', team: 'ARG', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(state.db, 'winnerPredictions', 'demo_chloe_before_qf'), { userId: 'demo_chloe', userLabel: 'Chloé', phaseId: 'before_qf', team: 'ARG', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(state.db, 'winnerPredictions', 'demo_david_before_sf'), { userId: 'demo_david', userLabel: 'David', phaseId: 'before_sf', team: 'ARG', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true })
  ]);
}
