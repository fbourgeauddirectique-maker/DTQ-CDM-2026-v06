import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAVQcizGD4EmcCsIQ52iONzR87wskvgLOI',
  authDomain: 'dtq-coupe-du-monde-2026.firebaseapp.com',
  projectId: 'dtq-coupe-du-monde-2026',
  storageBucket: 'dtq-coupe-du-monde-2026.firebasestorage.app',
  messagingSenderId: '944672750520',
  appId: '1:944672750520:web:42a817af4260007814ad4d'
};

const ROUNDS = [
  { id: 'r16', label: '1/16e', points: 10 },
  { id: 'r8', label: '1/8e', points: 10 },
  { id: 'qf', label: '1/4', points: 10 },
  { id: 'sf', label: '1/2', points: 10 },
  { id: 'final', label: 'Finale', points: 10 }
];

const EMPTY_BRACKET = { r16: [], r8: [], qf: [], sf: [], final: [] };

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
  winnerSettings: { deadline: '', activeRound: 'r16', actualWinner: '', teamsByRound: { ...EMPTY_BRACKET } },
  filter: 'all',
  unsubscribers: []
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
  kpis: document.getElementById('kpis'),
  dashboardMatches: document.getElementById('dashboard-matches'),
  mySummary: document.getElementById('my-summary'),
  matchesList: document.getElementById('matches-list'),
  rankingBody: document.getElementById('ranking-body'),
  rankingParticipants: document.getElementById('ranking-participants'),
  rankingEvolutionChart: document.getElementById('ranking-evolution-chart'),
  profileForm: document.getElementById('profile-form'),
  displayName: document.getElementById('display-name'),
  roleSelect: document.getElementById('role-select'),
  profileFeedback: document.getElementById('profile-feedback'),
  matchForm: document.getElementById('match-form'),
  homeTeam: document.getElementById('home-team'),
  awayTeam: document.getElementById('away-team'),
  kickoff: document.getElementById('kickoff'),
  matchFeedback: document.getElementById('match-feedback'),
  themeToggle: document.getElementById('theme-toggle'),
  winnerStatus: document.getElementById('winner-status'),
  winnerTournament: document.getElementById('winner-tournament'),
  winnerForm: document.getElementById('winner-form'),
  winnerRound: document.getElementById('winner-round'),
  winnerTeam: document.getElementById('winner-team'),
  winnerOnlyAlive: document.getElementById('winner-only-alive'),
  winnerClearBtn: document.getElementById('winner-clear-btn'),
  winnerFeedback: document.getElementById('winner-feedback'),
  winnerHistory: document.getElementById('winner-history'),
  winnerRanking: document.getElementById('winner-ranking'),
  winnerDeadline: document.getElementById('winner-deadline'),
  winnerActiveRound: document.getElementById('winner-active-round'),
  winnerFinalTeam: document.getElementById('winner-final-team'),
  winnerAdminForm: document.getElementById('winner-admin-form'),
  adminResults: document.getElementById('admin-results'),
  adminSettingsCard: document.getElementById('admin-settings-card'),
  adminResultsCard: document.getElementById('admin-results-card')
};

bindUI();
applyTheme();
watchAuth();

function bindUI() {
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'ranking') renderRankingEvolution();
  }));

  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    renderMatches();
  }));

  els.rankingParticipants?.addEventListener('change', renderRankingEvolution);

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
      homeScore: null,
      awayScore: null,
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

  els.winnerOnlyAlive?.addEventListener('change', renderWinnerUi);
  els.winnerRound?.addEventListener('change', renderWinnerUi);

  els.winnerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.authUser) return;
    if (state.winnerSettings.deadline && Date.now() > new Date(state.winnerSettings.deadline).getTime()) {
      setFeedback(els.winnerFeedback, 'Pronostics fermés.', 'danger');
      return;
    }
    const roundId = els.winnerRound.value;
    const team = els.winnerTeam.value;
    if (!roundId || !team) return;
    await setDoc(doc(db, 'winnerPredictions', `${state.authUser.uid}_${roundId}`), {
      userId: state.authUser.uid,
      roundId,
      team,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    setFeedback(els.winnerFeedback, 'Choix enregistré.', 'success');
  });

  els.winnerClearBtn?.addEventListener('click', async () => {
    if (!state.authUser) return;
    const roundId = els.winnerRound.value;
    if (!roundId) return;
    await deleteDoc(doc(db, 'winnerPredictions', `${state.authUser.uid}_${roundId}`));
    setFeedback(els.winnerFeedback, 'Choix effacé.', 'success');
  });

  els.winnerAdminForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isAdmin()) return;
    const teamsByRound = buildTeamsByRoundFromUI();
    await setDoc(doc(db, 'settings', 'winnerTournament'), {
      deadline: els.winnerDeadline?.value ? new Date(els.winnerDeadline.value).toISOString() : '',
      activeRound: els.winnerActiveRound?.value || 'r16',
      actualWinner: els.winnerFinalTeam?.value || '',
      teamsByRound,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setFeedback(els.matchFeedback, 'Tournoi enregistré.', 'success');
  });
}

function applyTheme() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (els.themeToggle) els.themeToggle.textContent = dark ? '☀️' : '🌙';
}

function watchAuth() {
  onAuthStateChanged(auth, user => {
    cleanupListeners();
    state.authUser = user;
    state.profile = null;
    if (!user) {
      els.authPanel.hidden = false;
      els.app.hidden = true;
      els.signOutBtn.hidden = true;
      return;
    }
    els.authPanel.hidden = true;
    els.app.hidden = false;
    els.signOutBtn.hidden = false;
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
    if (snap.exists()) state.winnerSettings = { ...state.winnerSettings, ...sanitizeWinnerSettings(snap.data()) };
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
  els.currentUserName.textContent = state.profile?.displayName || state.authUser.email || 'Profil à compléter';
  els.currentUserRole.textContent = state.profile?.role || 'Aucun rôle';
  els.adminSettingsCard.hidden = !isAdmin();
  els.adminResultsCard.hidden = !isAdmin();
  renderKpis();
  renderDashboard();
  renderMatches();
  renderRanking();
  populateRankingParticipantsSelect();
  renderRankingEvolution();
  renderAdminResults();
  renderWinnerTournament();
  renderWinnerUi();
  renderWinnerHistory();
  renderWinnerRanking();
}

function renderKpis() {
  const participants = state.users.filter(u => u.role === 'participant').length;
  const finished = state.matches.filter(isFinished).length;
  const leader = getRanking()[0];
  els.kpis.innerHTML = [
    ['Participants', participants, 'Profils Firestore'],
    ['Matches', state.matches.length, `${finished} terminés`],
    ['Pronostics', state.predictions.length, 'Temps réel'],
    ['Leader', leader?.displayName || '—', leader ? `${leader.points} points` : '']
  ].map(([label, value, meta]) => `<article class="card stat-card"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-help">${meta}</span></article>`).join('');
}

function renderDashboard() {
  const myStats = getStatsForUser(state.authUser.uid);
  const rank = getRanking().findIndex(u => u.uid === state.authUser.uid) + 1;
  els.mySummary.innerHTML = `
    <div class="summary-item"><strong>Mon rang</strong><div>${rank || '—'}</div></div>
    <div class="summary-item"><strong>Mes points</strong><div>${myStats.points}</div></div>
    <div class="summary-item"><strong>Scores exacts</strong><div>${myStats.exact}</div></div>
    <div class="summary-item"><strong>Bons résultats</strong><div>${myStats.outcome}</div></div>
    <div class="summary-item"><strong>Pronostics saisis</strong><div>${myStats.predictions}</div></div>
  `;
  const openMatches = state.matches.filter(m => !isLocked(m)).slice(0, 5);
  els.dashboardMatches.innerHTML = '';
  openMatches.forEach(match => els.dashboardMatches.appendChild(buildMatchCard(match)));
}

function renderMatches() {
  const matches = state.matches.filter(match => state.filter === 'open' ? !isFinished(match) && !isLocked(match) : state.filter === 'finished' ? isFinished(match) : true);
  els.matchesList.innerHTML = '';
  matches.forEach(match => els.matchesList.appendChild(buildMatchCard(match)));
}

function buildMatchCard(match) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card match-card';
  const pred = getPrediction(state.authUser.uid, match.id);
  wrapper.innerHTML = `
    <div class="match-top">
      <div>
        <strong>${match.home} vs ${match.away}</strong>
        <div class="muted">${formatDate(match.kickoff)}</div>
      </div>
      <div><span class="pill">${matchStatus(match)}</span></div>
    </div>
    <div class="match-grid">
      <div class="team-col"><span>${match.home}</span><input class="score-input home-score" type="number" min="0" max="20" value="${pred?.home ?? ''}" ${isLocked(match) ? 'disabled' : ''} /></div>
      <div class="team-col"><span>${match.away}</span><input class="score-input away-score" type="number" min="0" max="20" value="${pred?.away ?? ''}" ${isLocked(match) ? 'disabled' : ''} /></div>
      <div><button class="btn btn-primary save-btn" ${isLocked(match) ? 'disabled' : ''}>Enregistrer</button></div>
    </div>
    ${isFinished(match) ? `<div class="muted">Résultat officiel : ${match.homeScore} - ${match.awayScore}</div>` : ''}
  `;
  wrapper.querySelector('.save-btn')?.addEventListener('click', async () => {
    const home = wrapper.querySelector('.home-score').value;
    const away = wrapper.querySelector('.away-score').value;
    if (home === '' || away === '' || !state.authUser) return;
    await setDoc(doc(db, 'predictions', `${state.authUser.uid}_${match.id}`), {
      userId: state.authUser.uid,
      matchId: match.id,
      home: Number(home),
      away: Number(away),
      updatedAt: serverTimestamp()
    }, { merge: true });
  });
  return wrapper;
}

function renderRanking() {
  const rows = getRanking();
  els.rankingBody.innerHTML = rows.length ? rows.map((u, i) => `<tr><td>${i + 1}</td><td>${u.displayName || u.email}</td><td>${u.points}</td><td>${u.exact}</td><td>${u.outcome}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-cell">Aucun participant pour le moment.</td></tr>';
}

function populateRankingParticipantsSelect() {
  const selected = [...els.rankingParticipants.selectedOptions].map(o => o.value);
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  els.rankingParticipants.innerHTML = `<option value="all">Tous les participants</option>` + participants.map(u => `<option value="${u.uid}">${u.displayName || u.email}</option>`).join('');
  if (selected.length) [...els.rankingParticipants.options].forEach(opt => opt.selected = selected.includes(opt.value) || (selected.includes('all') && opt.value === 'all'));
}

function renderRankingEvolution() {
  if (!window.Plotly) return;
  const { labels, series } = buildEvolutionByMatch();
  if (!labels.length) {
    els.rankingEvolutionChart.innerHTML = '<div class="muted">Aucun match terminé pour le moment.</div>';
    return;
  }
  Plotly.newPlot(els.rankingEvolutionChart, series.map(s => ({ x: labels, y: s.values, mode: 'lines+markers', name: s.name, line: { width: 2 }, marker: { size: 6 } })), { margin: { l: 50, r: 20, t: 20, b: 40 }, xaxis: { title: { text: 'Matchs' } }, yaxis: { title: { text: 'Points' } }, legend: { orientation: 'h' }, hovermode: 'x unified' }, { responsive: true, displayModeBar: false });
}

function buildEvolutionByMatch() {
  const finishedMatches = state.matches.filter(isFinished).sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  const selectedIds = [...els.rankingParticipants.selectedOptions].map(o => o.value);
  const visible = selectedIds.includes('all') || !selectedIds.length ? participants : participants.filter(u => selectedIds.includes(u.uid));
  const cumulative = new Map(visible.map(u => [u.uid, 0]));
  const labels = finishedMatches.map((_, i) => `M${i + 1}`);
  const series = visible.map(u => ({ uid: u.uid, name: u.displayName || u.email, values: [] }));
  finishedMatches.forEach(match => {
    visible.forEach(u => {
      const pred = state.predictions.find(p => p.userId === u.uid && p.matchId === match.id);
      if (pred) cumulative.set(u.uid, (cumulative.get(u.uid) || 0) + scorePrediction(pred, match));
    });
    series.forEach(s => s.values.push(cumulative.get(s.uid) || 0));
  });
  return { labels, series };
}

function renderAdminResults() {
  els.adminResults.innerHTML = '';
  state.matches.forEach(match => {
    const card = document.createElement('div');
    card.className = 'card result-card';
    card.innerHTML = `
      <div class="row wrap section-gap"><div><strong>${match.home} vs ${match.away}</strong><div class="muted">${formatDate(match.kickoff)}</div></div><div><span class="pill">${matchStatus(match)}</span></div></div>
      <div class="admin-result-grid"><input class="score-input admin-home" type="number" min="0" max="20" value="${match.homeScore ?? ''}" /><input class="score-input admin-away" type="number" min="0" max="20" value="${match.awayScore ?? ''}" /><button class="btn btn-primary">Publier</button></div>
    `;
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
  const teamsByRound = state.winnerSettings.teamsByRound || { ...EMPTY_BRACKET };
  els.winnerTournament.innerHTML = ROUNDS.map((round, idx) => {
    const teams = teamsByRound[round.id] || [];
    const nextTeams = idx < ROUNDS.length - 1 ? (teamsByRound[ROUNDS[idx + 1].id] || []) : [];
    const cards = teams.map(team => `<div class="winner-team-row ${idx === ROUNDS.length - 1 ? 'alive' : (nextTeams.includes(team) ? 'alive' : 'out')}"><span>${team}</span><strong>${idx === ROUNDS.length - 1 ? 'Finaliste' : (nextTeams.includes(team) ? 'Qualifié' : 'Éliminé')}</strong></div>`).join('') || '<div class="muted">Aucune équipe saisie pour ce tour.</div>';
    return `<article class="card winner-round-card"><div class="section-head"><div><p class="eyebrow">Tour</p><h3>${round.label}</h3></div><span class="pill">${round.points} pts</span></div><div class="winner-round-grid" data-round="${round.id}">${cards}</div></article>`;
  }).join('');
}

function renderWinnerUi() {
  if (els.winnerStatus) els.winnerStatus.textContent = state.authUser ? 'Connecté' : 'Hors ligne';
  if (els.winnerDeadline) els.winnerDeadline.value = state.winnerSettings.deadline ? toLocalInputValue(new Date(state.winnerSettings.deadline)) : '';
  if (els.winnerActiveRound) els.winnerActiveRound.value = state.winnerSettings.activeRound || 'r16';
  if (els.winnerFinalTeam) els.winnerFinalTeam.value = state.winnerSettings.actualWinner || '';

  if (els.winnerRound.options.length === 0) {
    els.winnerRound.innerHTML = ROUNDS.map(r => `<option value="${r.id}">${r.label}</option>`).join('');
    els.winnerActiveRound.innerHTML = ROUNDS.map(r => `<option value="${r.id}">${r.label}</option>`).join('');
  }
  if (!els.winnerRound.value) els.winnerRound.value = state.winnerSettings.activeRound || 'r16';

  const roundTeams = getSelectableTeamsForRound(els.winnerRound.value, els.winnerOnlyAlive.checked);
  const selected = els.winnerTeam.value;
  els.winnerTeam.innerHTML = `<option value="">Choisir une équipe</option>` + roundTeams.map(team => `<option value="${team}">${team}</option>`).join('');
  if (selected && roundTeams.includes(selected)) els.winnerTeam.value = selected;
}

function renderWinnerHistory() {
  if (!state.authUser) {
    els.winnerHistory.innerHTML = '<tr><td colspan="3" class="empty-cell">Connectez-vous pour voir vos choix.</td></tr>';
    return;
  }
  const mine = state.winnerPredictions.filter(p => p.userId === state.authUser.uid);
  const byRound = new Map(mine.map(p => [p.roundId, p]));
  const activeTeams = getTeamsByRound(state.winnerSettings.activeRound || 'r16');
  els.winnerHistory.innerHTML = ROUNDS.map(round => {
    const pred = byRound.get(round.id);
    const team = pred?.team || '—';
    const status = pred ? (activeTeams.includes(pred.team) ? 'En course' : 'Éliminé') : 'En attente';
    return `<tr><td>${round.label}</td><td>${team}</td><td>${status}</td></tr>`;
  }).join('');
}

function renderWinnerRanking() {
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  const rows = participants.map(u => {
    const score = computeWinnerScore(state.winnerPredictions.filter(p => p.userId === u.uid));
    return { label: u.displayName || u.email, points: score.points, choice: score.choice };
  }).sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
  els.winnerRanking.innerHTML = rows.length ? rows.map(r => `<tr><td>${r.label}</td><td>${r.points}</td><td>${r.choice}</td></tr>`).join('') : '<tr><td colspan="3" class="empty-cell">Aucun point pour le moment.</td></tr>';
}

function computeWinnerScore(rows) {
  const teamsByRound = state.winnerSettings.teamsByRound || { ...EMPTY_BRACKET };
  let points = 0;
  let choice = '—';
  for (const round of ROUNDS) {
    const pred = rows.find(r => r.roundId === round.id);
    if (!pred) continue;
    choice = pred.team;
    if (round.id === 'final') {
      points += round.points;
      continue;
    }
    const nextTeams = getNextRoundTeams(round.id, teamsByRound);
    if (nextTeams.includes(pred.team)) points += round.points;
  }
  return { points, choice };
}

function getSelectableTeamsForRound(roundId, onlyAlive) {
  if (!onlyAlive) return getAllTeamsFromSettings();
  return getTeamsByRound(roundId);
}

function getTeamsByRound(roundId) {
  const teamsByRound = state.winnerSettings.teamsByRound || { ...EMPTY_BRACKET };
  if (roundId === 'r16') return teamsByRound.r16 || [];
  if (roundId === 'r8') return teamsByRound.r8 || [];
  if (roundId === 'qf') return teamsByRound.qf || [];
  if (roundId === 'sf') return teamsByRound.sf || [];
  if (roundId === 'final') return teamsByRound.final || [];
  return [];
}

function getNextRoundTeams(roundId, teamsByRound) {
  if (roundId === 'r16') return teamsByRound.r8 || [];
  if (roundId === 'r8') return teamsByRound.qf || [];
  if (roundId === 'qf') return teamsByRound.sf || [];
  if (roundId === 'sf') return teamsByRound.final || [];
  return teamsByRound.final || [];
}

function getAllTeamsFromSettings() {
  const teamsByRound = state.winnerSettings.teamsByRound || { ...EMPTY_BRACKET };
  return [...new Set(Object.values(teamsByRound).flat())].filter(Boolean);
}

function buildTeamsByRoundFromUI() {
  const data = { ...EMPTY_BRACKET };
  const root = document.getElementById('view-winner');
  [...root.querySelectorAll('.winner-round-card')].forEach((card, idx) => {
    const roundId = ROUNDS[idx].id;
    data[roundId] = [...card.querySelectorAll('.winner-team-row span')].map(el => el.textContent.trim()).filter(Boolean);
  });
  if (!data.final.length) data.final = data.sf.slice();
  return data;
}

function sanitizeWinnerSettings(raw) {
  return {
    deadline: raw?.deadline || '',
    activeRound: raw?.activeRound || 'r16',
    actualWinner: raw?.actualWinner || '',
    teamsByRound: {
      r16: Array.isArray(raw?.teamsByRound?.r16) ? raw.teamsByRound.r16 : [],
      r8: Array.isArray(raw?.teamsByRound?.r8) ? raw.teamsByRound.r8 : [],
      qf: Array.isArray(raw?.teamsByRound?.qf) ? raw.teamsByRound.qf : [],
      sf: Array.isArray(raw?.teamsByRound?.sf) ? raw.teamsByRound.sf : [],
      final: Array.isArray(raw?.teamsByRound?.final) ? raw.teamsByRound.final : []
    }
  };
}

function getPrediction(userId, matchId) {
  return state.predictions.find(p => p.userId === userId && p.matchId === matchId) || null;
}

function getRanking() {
  return state.users
    .filter(u => u.role === 'participant' || u.role === 'admin')
    .map(u => {
      const points = state.matches.filter(isFinished).reduce((sum, match) => {
        const pred = getPrediction(u.uid, match.id);
        return sum + (pred ? scorePrediction(pred, match) : 0);
      }, 0);
      return { ...u, points, exact: 0, outcome: 0 };
    })
    .sort((a, b) => b.points - a.points || (a.displayName || '').localeCompare(b.displayName || ''));
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

function getOutcome(home, away) {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

function isFinished(match) {
  return Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore);
}

function isLocked(match) {
  return new Date(match.kickoff).getTime() <= Date.now() || isFinished(match);
}

function matchStatus(match) {
  if (isFinished(match)) return `Terminé ${match.homeScore}-${match.awayScore}`;
  if (isLocked(match)) return 'Verrouillé';
  return 'Ouvert';
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function setFeedback(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = `helper ${type}`;
}

function mapAuthError(error) {
  const code = error?.code || '';
  if (code.includes('invalid-credential')) return 'Email ou mot de passe incorrect.';
  if (code.includes('email-already-in-use')) return 'Cet email est déjà utilisé.';
  if (code.includes('weak-password')) return 'Mot de passe trop faible. 6 caractères minimum.';
  return error.message || 'Une erreur est survenue.';
}

function toLocalInputValue(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}