import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = { apiKey: "AIzaSyAVQcizGD4EmcCsIQ52iONzR87wskvgLOI", authDomain: "dtq-coupe-du-monde-2026.firebaseapp.com", projectId: "dtq-coupe-du-monde-2026", storageBucket: "dtq-coupe-du-monde-2026.firebasestorage.app", messagingSenderId: "944672750520", appId: "1:944672750520:web:42a817af4260007814ad4d" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PHASES = [
  { id: 'before_r16', label: 'Avant les 1/16e', points: 50 },
  { id: 'before_r8', label: 'Avant les 1/8e', points: 40 },
  { id: 'before_qf', label: 'Avant les quarts', points: 30 },
  { id: 'before_sf', label: 'Avant les demies', points: 20 },
  { id: 'before_final', label: 'Avant la finale', points: 10 }
];

const TEAMS = ['ARG','BRA','FRA','ESP','POR','ENG','GER','ITA','NED','BEL','CRO','URU','USA','MEX','MAR','JPN','KOR','SEN','DEN','SUI','POL','AUT','COL','ECU','CAN','CHI','SRB','TUR','SWE','NOR','CIV','NGA'];
const TEAM_LABELS = { ARG:'Argentine', BRA:'Brésil', FRA:'France', ESP:'Espagne', POR:'Portugal', ENG:'Angleterre', GER:'Allemagne', ITA:'Italie', NED:'Pays-Bas', BEL:'Belgique', CRO:'Croatie', URU:'Uruguay', USA:'États-Unis', MEX:'Mexique', MAR:'Maroc', JPN:'Japon', KOR:'Corée du Sud', SEN:'Sénégal', DEN:'Danemark', SUI:'Suisse', POL:'Pologne', AUT:'Autriche', COL:'Colombie', ECU:'Équateur', CAN:'Canada', CHI:'Chili', SRB:'Serbie', TUR:'Turquie', SWE:'Suède', NOR:'Norvège', CIV:'Côte d'Ivoire', NGA:'Nigeria' };

const state = { authUser:null, profile:null, users:[], matches:[], predictions:[], winnerPredictions:[], settings:{ currentPhase:'before_r16', actualWinner:'', aliveTeams:[...TEAMS], qualifiedTeamsByPhase:{}, winnerDeadline:'' }, filter:'all', unsubscribers:[] };

const els = {
  authBtn: document.getElementById('authBtn'),
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
  leaderboardBody: document.getElementById('leaderboardBody'),
  rankingParticipants: document.getElementById('rankingParticipants'),
  rankingChart: document.getElementById('rankingChart'),
  mySummary: document.getElementById('my-summary'),
  matchesList: document.getElementById('matches-list'),
  profileForm: document.getElementById('profile-form'),
  displayName: document.getElementById('display-name'),
  roleSelect: document.getElementById('role-select'),
  profileFeedback: document.getElementById('profile-feedback'),
  matchForm: document.getElementById('match-form'),
  matchHome: document.getElementById('matchHome'),
  matchAway: document.getElementById('matchAway'),
  matchHomeScore: document.getElementById('matchHomeScore'),
  matchAwayScore: document.getElementById('matchAwayScore'),
  matchFeedback: document.getElementById('match-feedback'),
  adminResults: document.getElementById('admin-results'),
  adminSettingsCard: document.getElementById('admin-settings-card'),
  adminResultsCard: document.getElementById('admin-results-card'),
  themeToggle: document.getElementById('themeToggle'),
  winnerPhaseLabel: document.getElementById('winnerPhaseLabel'),
  winnerPhasePoints: document.getElementById('winnerPhasePoints'),
  winnerActualLabel: document.getElementById('winnerActualLabel'),
  winnerUserStatus: document.getElementById('winnerUserStatus'),
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
  winnerDeadline: document.getElementById('winnerDeadline'),
  winnerDeadlineInfo: document.getElementById('winnerDeadlineInfo'),
  winnerTeamsChecklist: document.getElementById('winnerTeamsChecklist'),
  seedDemoBtn: document.getElementById('seedDemoBtn')
};

bindUI();
applyTheme();
watchAuth();

function bindUI() {
  document.querySelectorAll('[data-tab-target]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`[data-tab-panel="${btn.dataset.tabTarget}"]`)?.classList.add('active');
    if (btn.dataset.tabTarget === 'dashboard') renderRankingEvolution();
  }));

  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    state.filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    renderMatches();
  }));

  els.rankingParticipants?.addEventListener('change', renderRankingEvolution);

  els.authBtn?.addEventListener('click', () => document.getElementById('auth-form')?.scrollIntoView({ behavior:'smooth' }));
  els.authForm?.addEventListener('submit', async e => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, els.email.value.trim(), els.password.value.trim()); setFeedback(els.authFeedback, 'Connexion réussie.', 'success'); }
    catch (error) { setFeedback(els.authFeedback, mapAuthError(error), 'danger'); }
  });
  els.registerBtn?.addEventListener('click', async () => {
    try { await createUserWithEmailAndPassword(auth, els.email.value.trim(), els.password.value.trim()); setFeedback(els.authFeedback, 'Compte créé. Enregistrez maintenant votre profil.', 'success'); }
    catch (error) { setFeedback(els.authFeedback, mapAuthError(error), 'danger'); }
  });
  els.signOutBtn?.addEventListener('click', () => signOut(auth));

  els.profileForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.authUser) return;
    try {
      await setDoc(doc(db, 'users', state.authUser.uid), { uid: state.authUser.uid, email: state.authUser.email, displayName: els.displayName.value.trim(), role: els.roleSelect.value, updatedAt: serverTimestamp() }, { merge:true });
      setFeedback(els.profileFeedback, 'Profil enregistré.', 'success');
    } catch (error) { setFeedback(els.profileFeedback, error.message, 'danger'); }
  });

  els.matchForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isAdmin()) return;
    try {
      await addDoc(collection(db, 'matches'), { home: els.matchHome.value.trim(), away: els.matchAway.value.trim(), kickoff: new Date().toISOString(), homeScore: Number(els.matchHomeScore.value || 0), awayScore: Number(els.matchAwayScore.value || 0), createdAt: serverTimestamp() });
      els.matchForm.reset();
      setFeedback(els.matchFeedback, 'Match ajouté.', 'success');
    } catch (error) { setFeedback(els.matchFeedback, error.message, 'danger'); }
  });

  els.themeToggle?.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    els.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });

  els.winnerOnlyAliveTeams?.addEventListener('change', refreshWinnerTeamOptions);
  els.winnerPhaseSelect?.addEventListener('change', refreshWinnerUi);
  els.adminWinnerPhase?.addEventListener('change', renderQualifiedTeamsChecks);

  els.winnerPredictionForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.authUser) return;
    if (state.settings.winnerDeadline && Date.now() > new Date(state.settings.winnerDeadline).getTime()) { setFeedback(els.authFeedback, 'La date limite de pronostic est dépassée.', 'danger'); return; }
    const phaseId = els.winnerPhaseSelect.value;
    const team = els.winnerTeamSelect.value;
    if (!phaseId || !team) return;
    await setDoc(doc(db, 'winnerPredictions', `${state.authUser.uid}_${phaseId}`), { userId: state.authUser.uid, userLabel: participantLabel(state.authUser.uid), phaseId, team, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge:true });
  });

  els.winnerClearBtn?.addEventListener('click', async () => {
    if (!state.authUser) return;
    const phaseId = els.winnerPhaseSelect.value;
    await setDoc(doc(db, 'winnerPredictions', `${state.authUser.uid}_${phaseId}`), { userId: state.authUser.uid, phaseId, team: '', updatedAt: serverTimestamp() }, { merge:true });
  });

  els.participantForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!state.authUser) return;
    const name = els.participantName.value.trim(); if (!name) return;
    const id = `manual_${slugify(name)}_${Date.now().toString(36)}`;
    await setDoc(doc(db, 'users', id), { uid:id, displayName:name, createdAt: serverTimestamp() });
    els.participantName.value = '';
  });

  els.winnerAdminForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!isAdmin()) return;
    const currentPhase = els.adminWinnerPhase.value;
    const aliveTeams = getCheckedTeamsForPhase(currentPhase);
    const qualifiedTeamsByPhase = { ...(state.settings.qualifiedTeamsByPhase || {}) };
    qualifiedTeamsByPhase[currentPhase] = aliveTeams;
    await setDoc(doc(db, 'settings', 'winnerGame'), {
      currentPhase,
      actualWinner: els.adminActualWinner.value,
      winnerDeadline: els.winnerDeadline?.value ? new Date(els.winnerDeadline.value).toISOString() : '',
      aliveTeams,
      qualifiedTeamsByPhase,
      updatedAt: serverTimestamp()
    }, { merge:true });
  });

  els.seedDemoBtn?.addEventListener('click', seedDemoData);
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
      if (els.app) els.app.hidden = true;
      if (els.signOutBtn) els.signOutBtn.hidden = true;
      return;
    }
    if (els.app) els.app.hidden = false;
    if (els.signOutBtn) els.signOutBtn.hidden = false;
    subscribeData(user.uid);
  });
}

function subscribeData(uid) {
  const unsubUsers = onSnapshot(query(collection(db, 'users')), snapshot => { state.users = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); state.profile = state.users.find(u => u.uid === uid) || null; render(); });
  const unsubMatches = onSnapshot(query(collection(db, 'matches'), orderBy('kickoff')), snapshot => { state.matches = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
  const unsubPredictions = onSnapshot(query(collection(db, 'predictions')), snapshot => { state.predictions = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
  const unsubWinnerPredictions = onSnapshot(query(collection(db, 'winnerPredictions')), snapshot => { state.winnerPredictions = snapshot.docs.map(d => ({ id: d.id, ...d.data() })); render(); });
  const unsubSettings = onSnapshot(doc(db, 'settings', 'winnerGame'), snapshot => { if (snapshot.exists()) state.settings = { ...state.settings, ...snapshot.data() }; render(); });
  state.unsubscribers = [unsubUsers,unsubMatches,unsubPredictions,unsubWinnerPredictions,unsubSettings];
}

function cleanupListeners() { state.unsubscribers.forEach(unsub => unsub && unsub()); state.unsubscribers = []; }

function render() {
  if (!state.authUser) return;
  if (els.currentUserName) els.currentUserName.textContent = state.profile?.displayName || state.authUser?.email || 'Profil à compléter';
  if (els.currentUserRole) els.currentUserRole.textContent = state.profile?.role || 'Aucun rôle';
  if (els.userBadge) els.userBadge.textContent = state.profile?.displayName || state.authUser?.email || 'Connecté';
  if (els.adminSettingsCard) els.adminSettingsCard.hidden = !isAdmin();
  if (els.adminResultsCard) els.adminResultsCard.hidden = !isAdmin();
  renderKpis(); renderDashboard(); renderMatches(); renderRanking(); populateRankingParticipantsSelect(); renderRankingEvolution(); renderAdminResults(); renderWinnerUi(); renderWinnerHistory(); renderWinnerLeaderboard();
}

function renderKpis() {
  if (els.participantsCount) els.participantsCount.textContent = String(state.users.filter(u => u.role === 'participant').length);
  if (els.completedMatchesCount) els.completedMatchesCount.textContent = String(state.matches.filter(isFinished).length);
}

function renderDashboard() {
  const openMatches = state.matches.filter(m => !isLocked(m)).slice(0, 5);
  if (els.dashboardMatches) {
    els.dashboardMatches.innerHTML = '';
    openMatches.forEach(match => els.dashboardMatches.appendChild(buildMatchCard(match)));
  }
  const myStats = getStatsForUser(state.authUser?.uid);
  const rank = getRanking().findIndex(u => u.uid === state.authUser?.uid) + 1;
  if (els.mySummary) {
    els.mySummary.innerHTML = `<div class="summary-item"><strong>Mon rang</strong><div>${rank || '—'}</div></div><div class="summary-item"><strong>Mes points</strong><div>${myStats.points}</div></div><div class="summary-item"><strong>Scores exacts</strong><div>${myStats.exact}</div></div><div class="summary-item"><strong>Bons résultats</strong><div>${myStats.outcome}</div></div><div class="summary-item"><strong>Pronostics saisis</strong><div>${myStats.predictions}</div></div>`;
  }
}

function renderMatches() {
  const matches = state.matches.filter(match => { if (state.filter === 'open') return !isFinished(match) && !isLocked(match); if (state.filter === 'finished') return isFinished(match); return true; });
  if (!els.matchesList) return;
  els.matchesList.innerHTML = '';
  matches.forEach(match => els.matchesList.appendChild(buildMatchCard(match)));
}

function buildMatchCard(match) {
  const wrapper = document.createElement('div');
  wrapper.className = 'card match-card';
  const pred = getPrediction(state.authUser?.uid, match.id);
  wrapper.innerHTML = `<div class="match-top"><div><strong>${match.home} vs ${match.away}</strong><div class="muted">${formatDate(match.kickoff)}</div></div><div><span class="pill">${matchStatus(match)}</span></div></div><div class="match-grid"><div class="team-col"><span>${match.home}</span><input class="score-input home-score" type="number" min="0" max="20" value="${pred?.home ?? ''}" ${isLocked(match) ? 'disabled' : ''} /></div><div class="team-col"><span>${match.away}</span><input class="score-input away-score" type="number" min="0" max="20" value="${pred?.away ?? ''}" ${isLocked(match) ? 'disabled' : ''} /></div><div><button class="btn btn-primary save-btn" ${isLocked(match) ? 'disabled' : ''}>Enregistrer</button></div></div>${isFinished(match) ? `<div class="muted">Résultat officiel : ${match.homeScore} - ${match.awayScore}</div>` : ''}`;
  wrapper.querySelector('.save-btn')?.addEventListener('click', async () => {
    const home = wrapper.querySelector('.home-score').value;
    const away = wrapper.querySelector('.away-score').value;
    if (home === '' || away === '' || !state.authUser) return;
    const predictionId = `${state.authUser.uid}_${match.id}`;
    await setDoc(doc(db, 'predictions', predictionId), { userId: state.authUser.uid, matchId: match.id, home: Number(home), away: Number(away), updatedAt: serverTimestamp() }, { merge:true });
  });
  return wrapper;
}

function renderRanking() {
  const ranking = getRanking();
  if (!els.leaderboardBody) return;
  els.leaderboardBody.innerHTML = ranking.map((user, index) => `<tr><td>${index + 1}</td><td>${user.displayName || user.email}</td><td>${user.points}</td><td>${user.matchPoints}</td><td>${user.winnerBonus || 0}</td></tr>`).join('') || '<tr><td colspan="5" class="empty-cell">Aucun participant pour le moment.</td></tr>';
}

function populateRankingParticipantsSelect() {
  if (!els.rankingParticipants) return;
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  const selected = [...els.rankingParticipants.selectedOptions].map(o => o.value);
  els.rankingParticipants.innerHTML = `<option value="all">Tous les participants</option>` + participants.map(u => `<option value="${u.uid}">${u.displayName || u.email}</option>`).join('');
  if (selected.length) [...els.rankingParticipants.options].forEach(opt => opt.selected = selected.includes(opt.value) || (selected.includes('all') && opt.value === 'all')); else if (els.rankingParticipants.options[0]) els.rankingParticipants.options[0].selected = true;
}

function renderRankingEvolution() {
  if (!els.rankingChart || !window.Plotly) return;
  const { matchLabels, series } = buildEvolutionByMatch();
  if (!matchLabels.length || !series.length) { els.rankingChart.innerHTML = '<div class="muted">Aucun match terminé pour le moment.</div>'; return; }
  Plotly.newPlot(els.rankingChart, series.map(item => ({ x: matchLabels, y: item.values, mode: 'lines+markers', name: item.name, line: { width: 2 }, marker: { size: 6 } })), { margin: { l: 50, r: 20, t: 20, b: 40 }, xaxis: { title: { text: 'Matchs' } }, yaxis: { title: { text: 'Points' } }, legend: { orientation: 'h' }, hovermode: 'x unified' }, { responsive: true, displayModeBar: false });
}

function buildEvolutionByMatch() {
  const finishedMatches = state.matches.filter(isFinished).sort((a,b) => new Date(a.kickoff) - new Date(b.kickoff));
  const participants = state.users.filter(u => u.role === 'participant' || u.role === 'admin');
  const selectedIds = els.rankingParticipants ? [...els.rankingParticipants.selectedOptions].map(o => o.value) : ['all'];
  const visibleParticipants = selectedIds.includes('all') || !selectedIds.length ? participants : participants.filter(u => selectedIds.includes(u.uid));
  const cumulativeByUser = new Map(visibleParticipants.map(u => [u.uid, 0]));
  const matchLabels = finishedMatches.map((_, i) => `M${i + 1}`);
  const series = visibleParticipants.map(user => ({ name: user.displayName || user.email, uid: user.uid, values: [] }));
  finishedMatches.forEach(match => { visibleParticipants.forEach(user => { const pred = state.predictions.find(p => p.userId === user.uid && p.matchId === match.id); if (pred) cumulativeByUser.set(user.uid, (cumulativeByUser.get(user.uid) || 0) + scorePrediction(pred, match)); }); series.forEach(item => item.values.push(cumulativeByUser.get(item.uid) || 0)); });
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

function renderWinnerUi() {
  const phase = PHASES.find(p => p.id === state.settings.currentPhase) || PHASES[0];
  if (els.winnerPhaseLabel) els.winnerPhaseLabel.textContent = phase.label;
  if (els.winnerPhasePoints) els.winnerPhasePoints.textContent = String(phase.points);
  if (els.winnerActualLabel) els.winnerActualLabel.textContent = state.settings.actualWinner ? (TEAM_LABELS[state.settings.actualWinner] || state.settings.actualWinner) : 'Non défini';
  if (els.winnerUserStatus) els.winnerUserStatus.textContent = state.authUser ? `Connecté · ${state.authUser.uid.slice(0, 8)}` : 'Hors ligne';
  if (els.winnerPhaseSelect) els.winnerPhaseSelect.value = state.settings.currentPhase || phase.id;
  if (els.adminWinnerPhase) els.adminWinnerPhase.value = state.settings.currentPhase || phase.id;
  if (els.adminActualWinner) els.adminActualWinner.value = state.settings.actualWinner || '';
  if (els.winnerDeadline && state.settings.winnerDeadline) els.winnerDeadline.value = toLocalInputValue(new Date(state.settings.winnerDeadline));
  if (els.winnerDeadlineInfo) els.winnerDeadlineInfo.textContent = state.settings.winnerDeadline ? `Clôture des pronostics : ${new Date(state.settings.winnerDeadline).toLocaleString('fr-FR', { dateStyle:'medium', timeStyle:'short' })}.` : 'Les participants ne peuvent plus saisir de vainqueur après cette date.';
  refreshWinnerTeamOptions();
  renderQualifiedTeamsChecks();
}

function refreshWinnerTeamOptions() {
  if (!els.winnerTeamSelect) return;
  const selected = els.winnerTeamSelect.value;
  const currentPhase = els.winnerPhaseSelect?.value || state.settings.currentPhase || 'before_r16';
  const phaseTeams = state.settings.qualifiedTeamsByPhase?.[currentPhase] && state.settings.qualifiedTeamsByPhase[currentPhase].length ? state.settings.qualifiedTeamsByPhase[currentPhase] : (els.winnerOnlyAliveTeams?.checked ? (state.settings.aliveTeams || TEAMS) : TEAMS);
  els.winnerTeamSelect.innerHTML = `<option value="">Choisir une équipe</option>` + phaseTeams.map(c => `<option value="${c}">${TEAM_LABELS[c]}</option>`).join('');
  if (phaseTeams.includes(selected)) els.winnerTeamSelect.value = selected;
}

function renderQualifiedTeamsChecks() {
  if (!els.winnerTeamsChecklist) return;
  const currentPhase = els.adminWinnerPhase?.value || state.settings.currentPhase || 'before_r16';
  const selected = new Set((state.settings.qualifiedTeamsByPhase?.[currentPhase] || state.settings.aliveTeams || TEAMS));
  els.winnerTeamsChecklist.innerHTML = PHASES.map(ph => `<div class="phase-block" data-phase-wrap="${ph.id}"><strong>${ph.label}</strong><div class="teams-checklist">${TEAMS.map(t => `<label class="team-check"><input type="checkbox" value="${t}" ${ph.id === currentPhase && selected.has(t) ? 'checked' : ''} ${ph.id !== currentPhase ? 'disabled' : ''} /><span>${TEAM_LABELS[t]}</span></label>`).join('')}</div></div>`).join('');
}

function getCheckedTeamsForPhase(phaseId) {
  const wrap = document.querySelector(`[data-phase-wrap="${phaseId}"]`);
  return wrap ? Array.from(wrap.querySelectorAll('input:checked')).map(i => i.value) : [];
}

function renderWinnerHistory() {
  if (!els.winnerHistoryBody) return;
  if (!state.authUser) { els.winnerHistoryBody.innerHTML = '<tr><td colspan="4" class="empty-cell">Connectez-vous pour voir vos choix.</td></tr>'; return; }
  const mine = state.winnerPredictions.filter(r => r.userId === state.authUser.uid);
  const byPhase = new Map(mine.map(r => [r.phaseId, r]));
  const actualWinner = state.settings.actualWinner;
  els.winnerHistoryBody.innerHTML = PHASES.map(phase => {
    const pred = byPhase.get(phase.id);
    const team = pred?.team;
    const isCorrect = actualWinner && team === actualWinner;
    const isElim = team && !((state.settings.qualifiedTeamsByPhase?.[phase.id] || state.settings.aliveTeams || TEAMS).includes(team)) && !isCorrect;
    const status = isCorrect ? '<span class="result-ok">Champion trouvé</span>' : isElim ? '<span class="result-ko">Éliminé</span>' : team ? '<span class="result-open">Toujours en course</span>' : '<span class="result-open">En attente</span>';
    return `<tr><td>${phase.label}</td><td>${phase.points}</td><td>${team ? (TEAM_LABELS[team] || team) : '—'}</td><td>${status}</td></tr>`;
  }).join('');
}

function renderWinnerLeaderboard() {
  if (!els.winnerLeaderboardBody) return;
  const rows = buildWinnerLeaderboardRows();
  els.winnerLeaderboardBody.innerHTML = rows.length ? rows.map(r => `<tr><td>${r.label}</td><td>${r.score}</td><td>${r.teamLabel || '—'}</td><td>${r.phaseLabel || '—'}</td></tr>`).join('') : '<tr><td colspan="4" class="empty-cell">Aucun bonus pour le moment.</td></tr>';
}

function buildWinnerLeaderboardRows() {
  const winnerMap = buildWinnerScoresMap();
  return state.users.map(p => { const score = winnerMap.get(p.uid) || { score:0, teamLabel:'', phaseLabel:'' }; return { label: p.displayName || p.email || p.uid, score: score.score, teamLabel: score.teamLabel, phaseLabel: score.phaseLabel }; }).filter(r => r.score > 0 || r.teamLabel).sort((a,b) => b.score - a.score || a.label.localeCompare(b.label));
}

function buildWinnerScoresMap() {
  const grouped = new Map();
  state.winnerPredictions.forEach(row => { if (!grouped.has(row.userId)) grouped.set(row.userId, []); grouped.get(row.userId).push(row); });
  const map = new Map();
  grouped.forEach((rows, uid) => map.set(uid, computeWinnerScore(rows, state.settings.actualWinner)));
  return map;
}

function computeWinnerScore(rows, actualWinner) {
  if (!actualWinner) return { score: 0, teamLabel: '', phaseLabel: '' };
  const sorted = [...rows].sort((a,b) => PHASES.findIndex(p => p.id === a.phaseId) - PHASES.findIndex(p => p.id === b.phaseId));
  const found = sorted.find(r => r.team === actualWinner);
  if (!found) return { score:0, teamLabel:'', phaseLabel:'' };
  const phase = PHASES.find(p => p.id === found.phaseId);
  return { score: phase?.points || 0, teamLabel: TEAM_LABELS[found.team], phaseLabel: phase?.label || '' };
}

function getPrediction(userId, matchId) { return state.predictions.find(p => p.userId === userId && p.matchId === matchId) || null; }

function getRanking() {
  const winnerMap = buildWinnerScoresMap();
  return state.users.filter(user => user.role === 'participant' || user.role === 'admin').map(user => {
    const points = state.matches.filter(isFinished).reduce((sum, match) => {
      const pred = getPrediction(user.uid, match.id);
      return sum + (pred ? scorePrediction(pred, match) : 0);
    }, 0);
    const winnerBonus = winnerMap.get(user.uid)?.score || 0;
    return { ...user, points: points + winnerBonus, matchPoints: points, winnerBonus, exact: 0, outcome: 0 };
  }).sort((a,b) => b.points - a.points || (a.displayName || '').localeCompare(b.displayName || ''));
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
  const winnerBonus = buildWinnerScoresMap().get(uid)?.score || 0;
  return { points: points + winnerBonus, exact, outcome, predictions: userPredictions.length };
}

function scorePrediction(pred, match) { if (pred.home === match.homeScore && pred.away === match.awayScore) return 5; return getOutcome(pred.home, pred.away) === getOutcome(match.homeScore, match.awayScore) ? 3 : 0; }
function getOutcome(home, away) { if (home > away) return 'home'; if (home < away) return 'away'; return 'draw'; }
function isFinished(match) { return Number.isInteger(match.homeScore) && Number.isInteger(match.awayScore); }
function isLocked(match) { return new Date(match.kickoff).getTime() <= Date.now() || isFinished(match); }
function matchStatus(match) { if (isFinished(match)) return `Terminé ${match.homeScore}-${match.awayScore}`; if (isLocked(match)) return 'Verrouillé'; return 'Ouvert'; }
function isAdmin() { return state.profile?.role === 'admin'; }
function formatDate(iso) { return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }); }
function setFeedback(el, message, type) { if (!el) return; el.textContent = message; el.className = `helper ${type}`; }
function mapAuthError(error) { const code = error?.code || ''; if (code.includes('invalid-credential')) return 'Email ou mot de passe incorrect.'; if (code.includes('email-already-in-use')) return 'Cet email est déjà utilisé.'; if (code.includes('weak-password')) return 'Mot de passe trop faible. 6 caractères minimum.'; return error.message || 'Une erreur est survenue.'; }
function slugify(text) { return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function toLocalInputValue(date) { const pad = n => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function participantLabel(uid) { return state.users.find(u => u.uid === uid)?.displayName || uid; }
async function seedDemoData() { if (!state.authUser) return; await setDoc(doc(db, 'settings', 'winnerGame'), { currentPhase: 'before_r8', actualWinner: 'ARG', aliveTeams: ['ARG','BRA','FRA','ESP','POR','ENG','GER','MAR'], qualifiedTeamsByPhase: { before_r16: ['ARG','BRA','FRA','ESP','POR','ENG','GER','MAR'], before_r8: ['ARG','BRA','FRA','ESP'], before_qf: ['ARG','FRA'], before_sf: ['ARG'], before_final: ['ARG'] }, winnerDeadline: new Date(Date.now()+86400000).toISOString(), updatedAt: serverTimestamp() }, { merge:true }); }
