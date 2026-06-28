import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAVQcizGD4EmcCsIQ52iONzR87wskvgLOI",
  authDomain: "dtq-coupe-du-monde-2026.firebaseapp.com",
  projectId: "dtq-coupe-du-monde-2026",
  storageBucket: "dtq-coupe-du-monde-2026.firebasestorage.app",
  messagingSenderId: "944672750520",
  appId: "1:944672750520:web:42a817af4260007814ad4d"
};

const ROUNDS = [
  { id: 'r16', label: '1/16e', points: 10 },
  { id: 'r8', label: '1/8e', points: 10 },
  { id: 'qf', label: '1/4', points: 10 },
  { id: 'sf', label: '1/2', points: 10 },
  { id: 'final', label: 'Finale', points: 10 }
];

const TEAMS = ['ARG','BRA','FRA','ESP','POR','ENG','GER','ITA','NED','BEL','CRO','URU','USA','MEX','MAR','JPN','KOR','SEN','DEN','SUI','POL','AUT','COL','ECU','CAN','CHI','SRB','TUR','SWE','NOR','CIV','NGA'];
const TEAM_LABELS = { ARG:'Argentine', BRA:'Brésil', FRA:'France', ESP:'Espagne', POR:'Portugal', ENG:'Angleterre', GER:'Allemagne', ITA:'Italie', NED:'Pays-Bas', BEL:'Belgique', CRO:'Croatie', URU:'Uruguay', USA:'États-Unis', MEX:'Mexique', MAR:'Maroc', JPN:'Japon', KOR:'Corée du Sud', SEN:'Sénégal', DEN:'Danemark', SUI:'Suisse', POL:'Pologne', AUT:'Autriche', COL:'Colombie', ECU:'Équateur', CAN:'Canada', CHI:'Chili', SRB:'Serbie', TUR:'Turquie', SWE:'Suède', NOR:'Norvège', CIV:'Côte d'Ivoire', NGA:'Nigeria' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  authUser: null,
  profile: null,
  users: [],
  matches: [],
  predictions: [],
  winnerPredictions: [],
  winnerSettings: { deadline: '', activeRound: 'r16', actualWinner: '', teamsByRound: {} },
  unsubscribers: [],
  filter: 'all'
};

const els = {
  authPanel: document.getElementById('auth-panel'),
  app: document.getElementById('app'),
  authForm: document.getElementById('auth-form'),
  email: document.getElementById('auth-email'),
  password: document.getElementById('auth-password'),
  registerBtn: document.getElementById('register-btn'),
  authFeedback: document.getElementById('auth-feedback'),
  signOutBtn: document.getElementById('sign-out-btn'),
  currentUserName: document.getElementById('current-user-name'),
  currentUserRole: document.getElementById('current-user-role'),
  participantsCount: document.getElementById('participantsCount'),
  completedMatchesCount: document.getElementById('completedMatchesCount'),
  userBadge: document.getElementById('userBadge'),
  rankingBody: document.getElementById('ranking-body'),
  rankingParticipants: document.getElementById('rankingParticipants'),
  rankingEvolutionChart: document.getElementById('ranking-evolution-chart'),
  mySummary: document.getElementById('my-summary'),
  matchesList: document.getElementById('matches-list'),
  profileForm: document.getElementById('profile-form'),
  displayName: document.getElementById('display-name'),
  roleSelect: document.getElementById('role-select'),
  profileFeedback: document.getElementById('profile-feedback'),
  matchForm: document.getElementById('match-form'),
  homeTeam: document.getElementById('home-team'),
  awayTeam: document.getElementById('away-team'),
  kickoff: document.getElementById('kickoff'),
  homeScore: document.getElementById('home-score'),
  awayScore: document.getElementById('away-score'),
  matchFeedback: document.getElementById('match-feedback'),
  themeToggle: document.getElementById('themeToggle'),
  winnerPhaseLabel: document.getElementById('winnerPhaseLabel'),
  winnerPhasePoints: document.getElementById('winnerPhasePoints'),
  winnerDeadlineLabel: document.getElementById('winnerDeadlineLabel'),
  winnerTournament: document.getElementById('winnerTournament'),
  winnerUserStatus: document.getElementById('winnerUserStatus'),
  winnerRoundSelect: document.getElementById('winnerRoundSelect'),
  winnerTeamSelect: document.getElementById('winnerTeamSelect'),
  winnerOnlyAliveTeams: document.getElementById('winnerOnlyAliveTeams'),
  winnerPredictionForm: document.getElementById('winnerPredictionForm'),
  winnerClearBtn: document.getElementById('winnerClearBtn'),
  winnerRoundInfo: document.getElementById('winnerRoundInfo'),
  winnerHistoryBody: document.getElementById('winnerHistoryBody'),
  winnerLeaderboardBody: document.getElementById('winnerLeaderboardBody'),
  winnerAdminForm: document.getElementById('winnerAdminForm'),
  winnerDeadline: document.getElementById('winnerDeadline'),
  winnerActiveRound: document.getElementById('winnerActiveRound'),
  winnerActualWinner: document.getElementById('winnerActualWinner'),
  seedDemoBtn: document.getElementById('seedDemoBtn'),
  adminResults: document.getElementById('admin-results'),
  adminResultsCard: document.getElementById('admin-results-card'),
  adminSettingsCard: document.getElementById('admin-settings-card')
};

bindUI();
applyTheme();
watchAuth();

function bindUI() {
  document.querySelectorAll('[data-view],[data-tab-target]').forEach(btn => btn.addEventListener('click', () => {
    const targetName = btn.dataset.view || btn.dataset.tabTarget;
    document.querySelectorAll('.nav button,.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view,.tab-panel').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    const target = document.querySelector(`[data-view-target="${targetName}"]`) || document.querySelector(`[data-tab-panel="${targetName}"]`) || document.getElementById(`view-${targetName}`);
    if (target) target.classList.add('active');
    if (targetName === 'ranking') renderRankingEvolution();
  }));

  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    renderMatches();
  }));

  els.authForm?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, els.email.value.trim(), els.password.value.trim());
      setFeedback(els.authFeedback, 'Connexion réussie.', 'success');
    } catch (error) {
      setFeedback(els.authFeedback, mapAuthError(error), 'danger');
    }
  });

  els.registerBtn?.addEventListener('click', async () => {
    try {
      await createUserWithEmailAndPassword(auth, els.email.value.trim(), els.password.value.trim());
      setFeedback(els.authFeedback, 'Compte créé.', 'success');
    } catch (error) {
      setFeedback(els.authFeedback, mapAuthError(error), 'danger');
    }
  });

  els.signOutBtn?.addEventListener('click', () => signOut(auth));

  els.profileForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.authUser) return;
    await setDoc(doc(db, 'users', state.authUser.uid), {
      uid: state.authUser.uid,
      email: state.authUser.email,
      displayName: els.displayName.value.trim(),
      role: els.roleSelect.value,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setFeedback(els.profileFeedback, 'Profil enregistré.', 'success');
  });

  els.matchForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isAdmin()) return;
    await addDoc(collection(db, 'matches'), {
      home: els.homeTeam.value.trim(),
      away: els.awayTeam.value.trim(),
      kickoff: new Date(els.kickoff.value || Date.now()).toISOString(),
      homeScore: Number(els.homeScore.value || 0),
      awayScore: Number(els.awayScore.value || 0),
      createdAt: serverTimestamp()
    });
    els.matchForm.reset();
    setFeedback(els.matchFeedback, 'Match ajouté.', 'success');
  });

  els.themeToggle?.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    els.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  els.winnerOnlyAliveTeams?.addEventListener('change', refreshWinnerTeamOptions);
  els.winnerRoundSelect?.addEventListener('change', refreshWinnerUi);
  els.winnerActiveRound?.addEventListener('change', renderWinnerTournament);

  els.winnerPredictionForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.authUser) return;
    if (state.winnerSettings.deadline && Date.now() > new Date(state.winnerSettings.deadline).getTime()) {
      setFeedback(els.authFeedback, 'Pronostics fermés.', 'danger');
      return;
    }
    const roundId = els.winnerRoundSelect.value;
    const team = els.winnerTeamSelect.value;
    if (!roundId || !team) return;
    await setDoc(doc(db, 'winnerPredictions', `${state.authUser.uid}_${roundId}`), {
      userId: state.authUser.uid,
      roundId,
      team,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  els.winnerClearBtn?.addEventListener('click', async () => {
    if (!state.authUser) return;
    const roundId = els.winnerRoundSelect.value;
    await deleteDoc(doc(db, 'winnerPredictions', `${state.authUser.uid}_${roundId}`));
  });

  els.winnerAdminForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isAdmin()) return;
    const deadline = els.winnerDeadline?.value ? new Date(els.winnerDeadline.value).toISOString() : '';
    const activeRound = els.winnerActiveRound.value || 'r16';
    const actualWinner = els.winnerActualWinner.value || '';
    const teamsByRound = buildTeamsByRoundFromUI();
    await setDoc(doc(db, 'settings', 'winnerTournament'), {
      deadline,
      activeRound,
      actualWinner,
      teamsByRound,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setFeedback(els.authFeedback, 'Paramètres du tournoi enregistrés.', 'success');
  });

  els.seedDemoBtn?.addEventListener('click', seedDemoData);
}

function applyTheme() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (els.themeToggle) els.themeToggle.textContent = dark ? '☀️' : '🌙';
}

function watchAuth() {
  onAuthStateChanged(auth, async user => {
    cleanupListeners();
    state.authUser = user;
    state.profile = null;
    if (!user) {
      if (els.authPanel) els.authPanel.hidden = false;
      if (els.app) els.app.hidden = true;
      if (els.signOutBtn) els.signOutBtn.hidden = true;
      return;
    }
    if (els.authPanel) els.authPanel.hidden = true;
    if (els.app) els.app.hidden = false;
    if (els.signOutBtn) els.signOutBtn.hidden = false;
    subscribeData(user.uid);
  });
}

function subscribeData(uid) {
  const unsubUsers = onSnapshot(query(collection(db, 'users')), snap => {
    state.users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.profile = state.users.find(u => u.uid === uid) || null;
    render();
  });
  const unsubMatches = onSnapshot(query(collection(db, 'matches'), orderBy('kickoff')), snap => {
    state.matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
  const unsubPredictions = onSnapshot(query(collection(db, 'predictions')), snap => {
    state.predictions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
  const unsubWinnerPredictions = onSnapshot(query(collection(db, 'winnerPredictions')), snap => {
    state.winnerPredictions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  });
  const unsubSettings = onSnapshot(doc(db, 'settings', 'winnerTournament'), snap => {
    if (snap.exists()) state.winnerSettings = { ...state.winnerSettings, ...snap.data() };
    render();
  });
  state.unsubscribers = [unsubUsers, unsubMatches, unsubPredictions, unsubWinnerPredictions, unsubSettings];
}

function cleanupListeners() {
  state.unsubscribers.forEach(unsub => unsub && unsub());
  state.unsubscribers = [];
}

function render() {
  if (!state.authUser) return;
  if (els.currentUserName) els.currentUserName.textContent = state.profile?.displayName || state.authUser.email || 'Profil à compléter';
  if (els.currentUserRole) els.currentUserRole.textContent = state.profile?.role || 'Aucun rôle';
  if (els.userBadge) els.userBadge.textContent = state.profile?.displayName || state.authUser.email || 'Connecté';
  if (els.participantsCount) els.participantsCount.textContent = String(state.users.filter(u => u.role === 'participant').length);
  if (els.completedMatchesCount) els.completedMatchesCount.textContent = String(state.matches.filter(isFinished).length);
  if (els.adminResultsCard) els.adminResultsCard.hidden = !isAdmin();
  if (els.adminSettingsCard) els.adminSettingsCard.hidden = !isAdmin();
  renderDashboard();
  renderMatches();
  renderRanking();
  populateRankingParticipantsSelect();
  renderRankingEvolution();
  renderAdminResults();
  renderWinnerTournament();
  renderWinnerUi();
  renderWinnerHistory();
  renderWinnerLeaderboard();
}

function renderDashboard() {
  const myStats = getStatsForUser(state.authUser?.uid);
  const rank = getRanking().findIndex(u => u.uid === state.authUser?.uid) + 1;
  if (els.mySummary) {
    els.mySummary.innerHTML = `
      <div class="summary-item"><strong>Mon rang</strong><div>${rank || '—'}</div></div>
      <div class="summary-item"><strong>Mes points</strong><div>${myStats.points}</div></div>
      <div class="summary-item"><strong>Scores exacts</strong><div>${myStats.exact}</div></div>
      <div class="summary-item"><strong>Bons résultats</strong><div>${myStats.outcome}</div></div>
      <div class="summary-item"><strong>Pronostics saisis</strong><div>${myStats.predictions}</div></div>
    `;
  }
}

function renderMatches() {
  if (!els.matchesList) return;
  const list = state.matches.filter(match => {
    if (state.filter === 'open') return !isFinished(match) && !isLocked(match);
    if (state.filter === 'finished') return isFinished(match);
    return true;
  });
  els.matchesList.innerHTML = '';
  list.forEach(match => els.matchesList.appendChild(buildMatchCard(match)));
}

function buildMatchCard(match) {
  const wrap = document.createElement('div');
  wrap.className = 'card match-card';
  const pred = getPrediction(state.authUser?.uid, match.id);
  wrap.innerHTML = `
    <div class="match-top"><div><strong>${match.home} vs ${match.away}</strong><div class="muted">${formatDate(match.kickoff)}</div></div><div><span class="pill">${matchStatus(match)}</span></div></div>
    <div class="match-grid">
      <div class="team-col"><span>${match.home}</span><input class="score-input home-score" type="number" min="0" max="20" value="${pred?.home ?? ''}" ${isLocked(match) ? 'disabled' : ''} /></div>
      <div class="team-col"><span>${match.away}</span><input class="score-input away-score" type="number" min="0" max="20" value="${pred?.away ?? ''}" ${isLocked(match) ? 'disabled' : ''} /></div>
      <div><button class="btn btn-primary save-btn" ${isLocked(match) ? 'disabled' : ''}>Enregistrer</button></div>
    </div>
    ${isFinished(match) ? `<div class="muted">Résultat officiel : ${match.homeScore} - ${match.awayScore}</div>` : ''}
  `;
  wrap.querySelector('.save-btn')?.addEventListener('click', async () => {
    const home = wrap.querySelector('.home-score').value;
    const away = wrap.querySelector('.away-score').value;
    if (home === '' || away === '' || !state.authUser) return;
    await setDoc(doc(db, 'predictions', `${state.authUser.uid}_${match.id}`), {
      userId: state.authUser.uid,
      matchId: match.id,
      home: Number(home),
      away: Number(away),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  return wrap;
}

function renderRanking() {
  if (!els.rankingBody) return;
  const rows = getRanking();
  els.rankingBody.innerHTML = rows.length ? rows.map((u, i) => `<tr><td>${i + 1}</td><td>${u.displayName || u.email}</td><td>${u.points}</td><td>${u.exact}</td><td>${u.outcome}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-cell">Aucun participant pour le moment.</td></tr>';
}

function populateRankingParticipantsSelect() {
  if (!els.rankingParticipants) return;
  const selected = [...els.rankingParticipants.selectedOptions].map(o => o.value);
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  els.rankingParticipants.innerHTML = `<option value="all">Tous les participants</option>` + participants.map(u => `<option value="${u.uid}">${u.displayName || u.email}</option>`).join('');
  if (selected.length) [...els.rankingParticipants.options].forEach(opt => opt.selected = selected.includes(opt.value) || (selected.includes('all') && opt.value === 'all'));
}

function renderRankingEvolution() {
  if (!els.rankingEvolutionChart || !window.Plotly) return;
  const { matchLabels, series } = buildEvolutionByMatch();
  if (!matchLabels.length || !series.length) {
    els.rankingEvolutionChart.innerHTML = '<div class="muted">Aucun match terminé pour le moment.</div>';
    return;
  }
  Plotly.newPlot(els.rankingEvolutionChart, series.map(s => ({ x: matchLabels, y: s.values, mode: 'lines+markers', name: s.name, line: { width: 2 }, marker: { size: 6 } })), { margin: { l: 50, r: 20, t: 20, b: 40 }, xaxis: { title: { text: 'Matchs' } }, yaxis: { title: { text: 'Points' } }, legend: { orientation: 'h' }, hovermode: 'x unified' }, { responsive: true, displayModeBar: false });
}

function buildEvolutionByMatch() {
  const finishedMatches = state.matches.filter(isFinished).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  const selectedIds = els.rankingParticipants ? [...els.rankingParticipants.selectedOptions].map(o => o.value) : ['all'];
  const visible = selectedIds.includes('all') || !selectedIds.length ? participants : participants.filter(u => selectedIds.includes(u.uid));
  const cumulative = new Map(visible.map(u => [u.uid, 0]));
  const matchLabels = finishedMatches.map((_, i) => `M${i + 1}`);
  const series = visible.map(u => ({ uid: u.uid, name: u.displayName || u.email, values: [] }));
  finishedMatches.forEach(match => {
    visible.forEach(u => {
      const pred = state.predictions.find(p => p.userId === u.uid && p.matchId === match.id);
      if (pred) cumulative.set(u.uid, (cumulative.get(u.uid) || 0) + scorePrediction(pred, match));
    });
    series.forEach(s => s.values.push(cumulative.get(s.uid) || 0));
  });
  return { matchLabels, series };
}

function renderAdminResults() {
  if (!els.adminResults || !isAdmin()) return;
  els.adminResults.innerHTML = '';
  state.matches.forEach(match => {
    const card = document.createElement('div');
    card.className = 'card result-card';
    card.innerHTML = `<div class="row wrap section-gap"><div><strong>${match.home} vs ${match.away}</strong><div class="muted">${formatDate(match.kickoff)}</div></div><div><span class="pill">${matchStatus(match)}</span></div></div><div class="admin-result-grid"><input class="score-input admin-home" type="number" min="0" max="20" value="${match.homeScore ?? ''}" /><input class="score-input admin-away" type="number" min="0" max="20" value="${match.awayScore ?? ''}" /><button class="btn btn-primary">Publier</button></div>`;
    card.querySelector('button').addEventListener('click', async () => {
      const homeScore = card.querySelector('.admin-home').value;
      const awayScore = card.querySelector('.admin-away').value;
      if (homeScore === '' || awayScore === '') return;
      await updateDoc(doc(db, 'matches', match.id), { homeScore: Number(homeScore), awayScore: Number(awayScore), updatedAt: serverTimestamp() });
    });
    els.adminResults.appendChild(card);
  });
}

function renderWinnerTournament() {
  if (!els.winnerTournament) return;
  const roundTeams = state.winnerSettings.teamsByRound || {};
  els.winnerTournament.innerHTML = ROUNDS.map((round, idx) => {
    const teams = roundTeams[round.id] || [];
    const nextTeams = idx < ROUNDS.length - 1 ? (roundTeams[ROUNDS[idx + 1].id] || []) : [];
    const cards = teams.map(team => {
      const alive = nextTeams.includes(team) || idx === ROUNDS.length - 1;
      return `<div class="tournament-team ${alive ? 'alive' : 'out'}"><span>${TEAM_LABELS[team] || team}</span><strong>${alive ? 'En course' : 'Éliminé'}</strong></div>`;
    }).join('') || '<div class="muted">Aucune équipe saisie pour ce tour.</div>';
    return `<article class="tournament-round card"><div class="section-head"><div><p class="eyebrow">Tour</p><h3>${round.label}</h3></div><span class="pill">${round.points} pts</span></div><div class="tournament-list">${cards}</div></article>`;
  }).join('');
}

function refreshWinnerUi() {
  const round = ROUNDS.find(r => r.id === els.winnerRoundSelect?.value) || ROUNDS[0];
  if (els.winnerPhaseLabel) els.winnerPhaseLabel.textContent = round.label;
  if (els.winnerPhasePoints) els.winnerPhasePoints.textContent = String(round.points);
  if (els.winnerDeadlineLabel) els.winnerDeadlineLabel.textContent = state.winnerSettings.deadline ? new Date(state.winnerSettings.deadline).toLocaleString('fr-FR') : 'Non définie';
  if (els.winnerUserStatus) els.winnerUserStatus.textContent = state.authUser ? `Connecté · ${state.authUser.uid.slice(0, 8)}` : 'Hors ligne';
  if (els.winnerDeadline && state.winnerSettings.deadline) els.winnerDeadline.value = toLocalInputValue(new Date(state.winnerSettings.deadline));
  if (els.winnerActiveRound) els.winnerActiveRound.value = state.winnerSettings.activeRound || 'r16';
  if (els.winnerActualWinner) els.winnerActualWinner.value = state.winnerSettings.actualWinner || '';
  refreshWinnerTeamOptions();
  if (els.winnerRoundInfo) els.winnerRoundInfo.textContent = `Tour actif : ${round.label}. Date de clôture : ${state.winnerSettings.deadline ? new Date(state.winnerSettings.deadline).toLocaleString('fr-FR') : 'non définie'}.`;
}

function refreshWinnerTeamOptions() {
  if (!els.winnerTeamSelect || !els.winnerRoundSelect) return;
  const roundId = els.winnerRoundSelect.value || 'r16';
  const selected = els.winnerTeamSelect.value;
  const teams = state.winnerSettings.teamsByRound?.[roundId] && state.winnerSettings.teamsByRound[roundId].length ? state.winnerSettings.teamsByRound[roundId] : (els.winnerOnlyAliveTeams?.checked ? getAliveTeamsForRound(roundId) : TEAMS);
  els.winnerTeamSelect.innerHTML = `<option value="">Choisir une équipe</option>` + teams.map(code => `<option value="${code}">${TEAM_LABELS[code] || code}</option>`).join('');
  if (teams.includes(selected)) els.winnerTeamSelect.value = selected;
}

function getAliveTeamsForRound(roundId) {
  const idx = ROUNDS.findIndex(r => r.id === roundId);
  if (idx < 0) return TEAMS;
  if (idx === 0) return state.winnerSettings.teamsByRound?.r16?.length ? state.winnerSettings.teamsByRound.r16 : TEAMS;
  const prev = ROUNDS[idx - 1].id;
  return state.winnerSettings.teamsByRound?.[prev] || TEAMS;
}

function renderWinnerHistory() {
  if (!els.winnerHistoryBody) return;
  if (!state.authUser) {
    els.winnerHistoryBody.innerHTML = '<tr><td colspan="4" class="empty-cell">Connectez-vous pour voir vos choix.</td></tr>';
    return;
  }
  const mine = state.winnerPredictions.filter(p => p.userId === state.authUser.uid);
  const byRound = new Map(mine.map(p => [p.roundId, p]));
  const aliveNow = new Set(getAliveTeamsForRound(state.winnerSettings.activeRound || 'r16'));
  els.winnerHistoryBody.innerHTML = ROUNDS.map(round => {
    const pred = byRound.get(round.id);
    const team = pred?.team;
    const status = team ? (aliveNow.has(team) ? '<span class="result-open">En course</span>' : '<span class="result-ko">Éliminé</span>') : '<span class="result-open">En attente</span>';
    return `<tr><td>${round.label}</td><td>${round.points}</td><td>${team ? (TEAM_LABELS[team] || team) : '—'}</td><td>${status}</td></tr>`;
  }).join('');
}

function renderWinnerLeaderboard() {
  if (!els.winnerLeaderboardBody) return;
  const rows = buildWinnerLeaderboardRows();
  els.winnerLeaderboardBody.innerHTML = rows.length ? rows.map(r => `<tr><td>${r.label}</td><td>${r.points}</td><td>${r.choice}</td><td>${r.round}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-cell">Aucun point pour le moment.</td></tr>';
}

function buildWinnerLeaderboardRows() {
  const grouped = new Map();
  state.winnerPredictions.forEach(p => {
    if (!grouped.has(p.userId)) grouped.set(p.userId, []);
    grouped.get(p.userId).push(p);
  });
  return state.users.filter(u => u.role === 'participant' || u.role === 'admin').map(u => {
    const score = computeWinnerScore(grouped.get(u.uid) || []);
    return { label: u.displayName || u.email || u.uid, points: score.points, choice: score.choice, round: score.round };
  }).sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
}

function computeWinnerScore(rows) {
  const activeRound = state.winnerSettings.activeRound || 'r16';
  const teamsByRound = state.winnerSettings.teamsByRound || {};
  let points = 0;
  let choice = '—';
  let roundLabel = '—';
  for (const round of ROUNDS) {
    const pred = rows.find(r => r.roundId === round.id);
    if (!pred) continue;
    const roundTeams = teamsByRound[round.id] || [];
    const nextTeams = nextRoundTeams(round.id);
    const alive = round.id === 'final' ? true : nextTeams.includes(pred.team);
    if (alive) {
      points += round.points;
      choice = TEAM_LABELS[pred.team] || pred.team;
      roundLabel = round.label;
    } else {
      choice = TEAM_LABELS[pred.team] || pred.team;
      roundLabel = round.label;
    }
    if (round.id === activeRound) break;
  }
  return { points, choice, round: roundLabel };
}

function nextRoundTeams(roundId) {
  const idx = ROUNDS.findIndex(r => r.id === roundId);
  if (idx < 0 || idx === ROUNDS.length - 1) return state.winnerSettings.teamsByRound?.final || [];
  return state.winnerSettings.teamsByRound?.[ROUNDS[idx + 1].id] || [];
}

function getPrediction(userId, matchId) {
  return state.predictions.find(p => p.userId === userId && p.matchId === matchId) || null;
}

function getRanking() {
  return state.users.filter(u => u.role === 'participant' || u.role === 'admin').map(u => {
    const points = state.matches.filter(isFinished).reduce((sum, match) => {
      const pred = getPrediction(u.uid, match.id);
      return sum + (pred ? scorePrediction(pred, match) : 0);
    }, 0);
    return { ...u, points, exact: 0, outcome: 0 };
  }).sort((a, b) => b.points - a.points || (a.displayName || '').localeCompare(b.displayName || ''));
}

function getStatsForUser(uid) {
  const userPredictions = state.predictions.filter(p => p.userId === uid);
  let points = 0, exact = 0, outcome = 0;
  state.matches.filter(isFinished).forEach(match => {
    const pred = userPredictions.find(p => p.matchId === match.id);
    if (!pred) return;
    const score = scorePrediction(pred, match);
    points += score;
    if (score === 5) exact++;
    if (score === 3) outcome++;
  });
  return { points, exact, outcome, predictions: userPredictions.length };
}

function scorePrediction(pred, match) {
  if (pred.home === match.homeScore && pred.away === match.awayScore) return 5;
  return getOutcome(pred.home, pred.away) === getOutcome(match.homeScore, match.awayScore) ? 3 : 0;
}

function getOutcome(home, away) { if (home > away) return 'home'; if (home < away) return 'away'; return 'draw'; }
function isFinished(match) { return Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore); }
function isLocked(match) { return new Date(match.kickoff).getTime() <= Date.now() || isFinished(match); }
function matchStatus(match) { if (isFinished(match)) return `Terminé ${match.homeScore}-${match.awayScore}`; if (isLocked(match)) return 'Verrouillé'; return 'Ouvert'; }
function isAdmin() { return state.profile?.role === 'admin'; }
function formatDate(iso) { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); }
function setFeedback(el, message, type) { if (!el) return; el.textContent = message; el.className = `helper ${type}`; }
function mapAuthError(error) { const code = error?.code || ''; if (code.includes('invalid-credential')) return 'Email ou mot de passe incorrect.'; if (code.includes('email-already-in-use')) return 'Cet email est déjà utilisé.'; if (code.includes('weak-password')) return 'Mot de passe trop faible. 6 caractères minimum.'; return error.message || 'Une erreur est survenue.'; }
function toLocalInputValue(date) { const p=n=>String(n).padStart(2,'0'); return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`; }
function slugify(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function buildTeamsByRoundFromUI() { return ROUNDS.reduce((acc, round) => { const box = document.querySelector(`[data-round="${round.id}"]`); acc[round.id] = box ? Array.from(box.querySelectorAll('input:checked')).map(i => i.value) : (state.winnerSettings.teamsByRound?.[round.id] || []); return acc; }, {}); }
async function seedDemoData() {
  if (!state.authUser) return;
  await setDoc(doc(db, 'settings', 'winnerTournament'), {
    deadline: new Date(Date.now() + 86400000).toISOString(),
    activeRound: 'r16',
    actualWinner: '',
    teamsByRound: { r16: ['ARG','BRA','FRA','ESP','POR','ENG','GER','MAR'], r8: ['ARG','FRA','ESP','BRA'], qf: ['ARG','FRA'], sf: ['ARG'], final: ['ARG'] },
    updatedAt: serverTimestamp()
  }, { merge: true });
}
