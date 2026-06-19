import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAVQcizGD4EmcCsIQ52iONzR87wskvgLOI",
  authDomain: "dtq-coupe-du-monde-2026.firebaseapp.com",
  projectId: "dtq-coupe-du-monde-2026",
  storageBucket: "dtq-coupe-du-monde-2026.firebasestorage.app",
  messagingSenderId: "944672750520",
  appId: "1:944672750520:web:42a817af4260007814ad4d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const state = {
  authUser: null,
  profile: null,
  users: [],
  matches: [],
  predictions: [],
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
  adminResults: document.getElementById('admin-results'),
  adminSettingsCard: document.getElementById('admin-settings-card'),
  adminResultsCard: document.getElementById('admin-results-card'),
  themeToggle: document.getElementById('theme-toggle')
};

bindUI();
applyTheme();
watchAuth();

function bindUI() {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav button').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
      if (btn.dataset.view === 'ranking') renderRankingEvolution();
    });
  });

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      renderMatches();
    });
  });

  els.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, els.email.value.trim(), els.password.value.trim());
      setFeedback(els.authFeedback, 'Connexion réussie.', 'success');
    } catch (error) {
      setFeedback(els.authFeedback, mapAuthError(error), 'danger');
    }
  });

  els.registerBtn.addEventListener('click', async () => {
    try {
      await createUserWithEmailAndPassword(auth, els.email.value.trim(), els.password.value.trim());
      setFeedback(els.authFeedback, 'Compte créé. Enregistrez maintenant votre profil.', 'success');
    } catch (error) {
      setFeedback(els.authFeedback, mapAuthError(error), 'danger');
    }
  });

  els.signOutBtn.addEventListener('click', () => signOut(auth));

  els.profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.authUser) return;

    try {
      await setDoc(doc(db, 'users', state.authUser.uid), {
        uid: state.authUser.uid,
        email: state.authUser.email,
        displayName: els.displayName.value.trim(),
        role: els.roleSelect.value,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setFeedback(els.profileFeedback, 'Profil enregistré.', 'success');
    } catch (error) {
      setFeedback(els.profileFeedback, error.message, 'danger');
    }
  });

  els.matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isAdmin()) return;

    try {
      await addDoc(collection(db, 'matches'), {
        home: els.homeTeam.value.trim(),
        away: els.awayTeam.value.trim(),
        kickoff: new Date(els.kickoff.value).toISOString(),
        homeScore: null,
        awayScore: null,
        createdAt: serverTimestamp()
      });

      els.matchForm.reset();
      setFeedback(els.matchFeedback, 'Match ajouté.', 'success');
    } catch (error) {
      setFeedback(els.matchFeedback, error.message, 'danger');
    }
  });

  els.themeToggle.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    els.themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  });
}

function applyTheme() {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  els.themeToggle.textContent = dark ? '☀️' : '🌙';
}

function watchAuth() {
  onAuthStateChanged(auth, async (user) => {
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
  const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
    state.users = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    state.profile = state.users.find((u) => u.uid === uid) || null;
    render();
  });

  const unsubMatches = onSnapshot(query(collection(db, 'matches'), orderBy('kickoff')), (snapshot) => {
    state.matches = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    render();
  });

  const unsubPredictions = onSnapshot(query(collection(db, 'predictions')), (snapshot) => {
    state.predictions = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    render();
  });

  state.unsubscribers = [unsubUsers, unsubMatches, unsubPredictions];
}

function cleanupListeners() {
  state.unsubscribers.forEach((unsub) => unsub && unsub());
  state.unsubscribers = [];
}

function render() {
  if (!state.authUser) return;

  els.currentUserName.textContent = state.profile?.displayName || state.authUser?.email || 'Profil à compléter';
  els.currentUserRole.textContent = state.profile?.role || 'Aucun rôle';
  els.adminSettingsCard.hidden = !isAdmin();
  els.adminResultsCard.hidden = !isAdmin();

  renderKpis();
  renderDashboard();
  renderMatches();
  renderRanking();
  renderRankingEvolution();
  renderAdminResults();
}

function renderKpis() {
  const participants = state.users.filter((u) => u.role === 'participant').length;
  const finished = state.matches.filter(isFinished).length;
  const leader = getRanking()[0];
  const cards = [
    ['Participants', participants, 'Profils Firestore'],
    ['Matches', state.matches.length, `${finished} terminés`],
    ['Pronostics', state.predictions.length, 'Temps réel'],
    ['Leader', leader?.displayName || '—', leader ? `${leader.points} points` : '']
  ];

  els.kpis.innerHTML = cards.map(([label, value, meta]) => `
    <article class="card">
      <div class="muted">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="helper">${meta}</div>
    </article>
  `).join('');
}

function renderDashboard() {
  const openMatches = state.matches.filter((m) => !isLocked(m)).slice(0, 5);
  els.dashboardMatches.innerHTML = '';
  openMatches.forEach((match) => els.dashboardMatches.appendChild(buildMatchCard(match)));

  const myStats = getStatsForUser(state.authUser?.uid);
  const rank = getRanking().findIndex((u) => u.uid === state.authUser?.uid) + 1;

  els.mySummary.innerHTML = [
    ['Mon rang', rank ? rank : '—'],
    ['Mes points', myStats.points],
    ['Scores exacts', myStats.exact],
    ['Bons résultats', myStats.outcome],
    ['Pronostics saisis', myStats.predictions]
  ].map(([label, value]) => `
    <div class="summary-item">
      <strong>${label}</strong>
      <div>${value}</div>
    </div>
  `).join('');
}

function renderMatches() {
  const matches = state.matches.filter((match) => {
    if (state.filter === 'open') return !isFinished(match) && !isLocked(match);
    if (state.filter === 'finished') return isFinished(match);
    return true;
  });

  els.matchesList.innerHTML = '';
  matches.forEach((match) => els.matchesList.appendChild(buildMatchCard(match)));
}

function buildMatchCard(match) {
  const wrapper = document.createElement('div');
  wrapper.className = 'match-card';
  const pred = getPrediction(state.authUser?.uid, match.id);

  wrapper.innerHTML = `
    <div class="match-top">
      <div>
        <strong>${match.home} vs ${match.away}</strong>
        <div class="muted">${formatDate(match.kickoff)}</div>
      </div>
      <div>
        <span class="pill">${matchStatus(match)}</span>
      </div>
    </div>
    <div class="match-grid">
      <div class="team-col">
        <span>${match.home}</span>
        <input class="score-input home-score" type="number" min="0" max="20" value="${pred?.home ?? ''}" ${isLocked(match) ? 'disabled' : ''}>
      </div>
      <div></div>
      <div class="team-col">
        <span>${match.away}</span>
        <input class="score-input away-score" type="number" min="0" max="20" value="${pred?.away ?? ''}" ${isLocked(match) ? 'disabled' : ''}>
      </div>
      <button class="btn btn-primary save-btn" ${isLocked(match) ? 'disabled' : ''}>Enregistrer</button>
    </div>
    ${isFinished(match) ? `<div class="helper">Résultat officiel : ${match.homeScore} - ${match.awayScore}</div>` : ''}
  `;

  wrapper.querySelector('.save-btn')?.addEventListener('click', async () => {
    const home = wrapper.querySelector('.home-score').value;
    const away = wrapper.querySelector('.away-score').value;
    if (home === '' || away === '' || !state.authUser) return;

    const predictionId = `${state.authUser.uid}_${match.id}`;
    await setDoc(doc(db, 'predictions', predictionId), {
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
  const ranking = getRanking();
  els.rankingBody.innerHTML = ranking.map((user, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${user.displayName || user.email}</td>
      <td>${user.points}</td>
      <td>${user.exact}</td>
      <td>${user.outcome}</td>
    </tr>
  `).join('');
}

function buildEvolutionByMatch() {
  const finishedMatches = state.matches
    .filter(isFinished)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  const participants = state.users.filter((u) => u.role === 'participant' || u.role === 'admin');
  const cumulativeByUser = new Map(participants.map((u) => [u.uid, 0]));
  const matchLabels = finishedMatches.map((match, index) => `M${index + 1}`);

  const series = participants.map((user) => ({
    name: user.displayName || user.email,
    uid: user.uid,
    values: []
  }));

  finishedMatches.forEach((match) => {
    participants.forEach((user) => {
      const userPredictions = state.predictions.filter((p) => p.userId === user.uid);
      const pred = userPredictions.find((p) => p.matchId === match.id);
      if (pred) {
        cumulativeByUser.set(user.uid, (cumulativeByUser.get(user.uid) || 0) + scorePrediction(pred, match));
      }
    });

    series.forEach((item) => item.values.push(cumulativeByUser.get(item.uid) || 0));
  });

  return { matchLabels, series };
}

function renderRankingEvolution() {
  if (!els.rankingEvolutionChart || !window.Plotly) return;

  const { matchLabels, series } = buildEvolutionByMatch();

  if (!matchLabels.length || !series.length) {
    els.rankingEvolutionChart.innerHTML = '<div class="helper">Aucun match terminé pour le moment.</div>';
    return;
  }

  const traces = series.map((item) => ({
    x: matchLabels,
    y: item.values,
    mode: 'lines+markers',
    name: item.name,
    line: { width: 2 },
    marker: { size: 6 },
    hovertemplate: '%{fullData.name}<br>%{x}: %{y} pts<extra></extra>'
  }));

  Plotly.newPlot(els.rankingEvolutionChart, traces, {
    margin: { l: 50, r: 20, t: 20, b: 40 },
    xaxis: {
      title: { text: 'Matchs' },
      tickmode: 'array',
      tickvals: matchLabels,
      ticktext: matchLabels
    },
    yaxis: { title: { text: 'Points' } },
    legend: { orientation: 'h' },
    hovermode: 'x unified'
  }, {
    responsive: true,
    displayModeBar: false
  });
}

function renderAdminResults() {
  els.adminResults.innerHTML = '';
  if (!isAdmin()) return;

  state.matches.forEach((match) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="row wrap section-gap">
        <div>
          <strong>${match.home} vs ${match.away}</strong>
          <div class="muted">${formatDate(match.kickoff)}</div>
        </div>
        <div>
          <span class="pill">${matchStatus(match)}</span>
        </div>
      </div>
      <div class="admin-result-grid">
        <input class="score-input admin-home" type="number" min="0" max="20" value="${match.homeScore ?? ''}">
        <div></div>
        <input class="score-input admin-away" type="number" min="0" max="20" value="${match.awayScore ?? ''}">
        <button class="btn btn-primary">Publier</button>
      </div>
    `;

    card.querySelector('button').addEventListener('click', async () => {
      const homeScore = card.querySelector('.admin-home').value;
      const awayScore = card.querySelector('.admin-away').value;
      if (homeScore === '' || awayScore === '') return;

      await updateDoc(doc(db, 'matches', match.id), {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        updatedAt: serverTimestamp()
      });
    });

    els.adminResults.appendChild(card);
  });
}

function getPrediction(userId, matchId) {
  return state.predictions.find((p) => p.userId === userId && p.matchId === matchId) || null;
}

function getRanking() {
  return state.users
    .filter((user) => user.role === 'participant' || user.role === 'admin')
    .map((user) => ({
      ...user,
      ...getStatsForUser(user.uid)
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      b.outcome - a.outcome ||
      (a.displayName || a.email).localeCompare(b.displayName || b.email)
    );
}

function getStatsForUser(uid) {
  const userPredictions = state.predictions.filter((p) => p.userId === uid);
  let points = 0;
  let exact = 0;
  let outcome = 0;

  state.matches.filter(isFinished).forEach((match) => {
    const pred = userPredictions.find((p) => p.matchId === match.id);
    if (!pred) return;
    const score = scorePrediction(pred, match);
    points += score;
    if (score === 5) exact += 1;
    if (score === 3) outcome += 1;
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
  el.textContent = message;
  el.className = `helper ${type}`;
}

function mapAuthError(error) {
  const code = error?.code || '';
  if (code.includes('invalid-credential')) return 'Email ou mot de passe incorrect.';
  if (code.includes('email-already-in-use')) return 'Cet email est déjà utilisé.';
  if (code.includes('weak-password')) return 'Mot de passe trop faible (6 caractères minimum).';
  return error.message || 'Une erreur est survenue.';
}
