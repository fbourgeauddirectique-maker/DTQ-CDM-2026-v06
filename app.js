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
  getDoc,
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

const WORLD_CUP_TEAMS = [
  'Allemagne', 'Angleterre', 'Argentine', 'Australie', 'Belgique', 'Brésil',
  'Canada', 'Croatie', 'Danemark', 'Espagne', 'États-Unis', 'France',
  'Ghana', 'Iran', 'Italie', 'Japon', 'Maroc', 'Mexique', 'Pays-Bas',
  'Portugal', 'Sénégal', 'Suisse', 'Uruguay'
];

const state = {
  authUser: null,
  profile: null,
  users: [],
  matches: [],
  predictions: [],
  filter: 'all',
  winnerInfo: null,
  winnerChoices: [],
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
  dis
