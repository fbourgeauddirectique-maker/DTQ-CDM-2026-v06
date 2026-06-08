# Prono Cup 2026 — Version Firebase multi-utilisateur

Cette version transforme l'application en vraie application collaborative avec :

- Firebase Authentication pour la connexion des collaborateurs,
- Cloud Firestore pour partager utilisateurs, matches et pronostics,
- mises à jour temps réel via les écouteurs Firestore,
- règles de sécurité pour limiter les écritures selon le rôle.

## Fichiers inclus

- `index.html` : structure de l'application
- `style.css` : interface
- `app.js` : logique Firebase Auth + Firestore
- `firebase.rules` : règles de sécurité Firestore
- `firebase.json` : configuration Firebase Hosting
- `README.md` : guide de configuration

## Étapes de mise en place

### 1. Créer le projet Firebase

- Ouvrir la console Firebase.
- Créer un projet.
- Ajouter une application Web.
- Activer **Authentication** avec le mode **Email / Password**.
- Activer **Cloud Firestore** en mode production.
- Copier la configuration Web Firebase.

Firebase Hosting permet de déployer des fichiers statiques via la CLI, tandis que Cloud Firestore permet d'ajouter des données et de recevoir des mises à jour temps réel avec des écouteurs comme `onSnapshot`. [cite:74][cite:75][cite:82][cite:85]

### 2. Remplacer la configuration dans `app.js`

Dans `app.js`, remplacer :

- `REMPLACEZ_API_KEY`
- `REMPLACEZ_PROJECT.firebaseapp.com`
- `REMPLACEZ_PROJECT_ID`
- `REMPLACEZ_PROJECT.firebasestorage.app`
- `REMPLACEZ_SENDER_ID`
- `REMPLACEZ_APP_ID`

par les vraies valeurs données par Firebase.

### 3. Déployer les règles Firestore

Dans Firebase Console > Firestore > Rules, coller le contenu du fichier `firebase.rules`.

### 4. Héberger l'application

Installer la CLI Firebase, initialiser Hosting avec `firebase init hosting`, puis déployer avec `firebase deploy --only hosting`. Firebase Hosting sert les actifs statiques depuis un dossier public et publie ensuite le site sur les sous-domaines `web.app` et `firebaseapp.com`. [cite:74][cite:75][cite:81]

### 5. Créer le premier admin

- Créer un premier compte via l'écran d'inscription.
- Enregistrer le profil avec le rôle `admin`.
- Ensuite, cet admin pourra créer les matches et publier les résultats.

## Modèle de données

### Collection `users`

- `uid`
- `email`
- `displayName`
- `role` (`admin` ou `participant`)
- `updatedAt`

### Collection `matches`

- `home`
- `away`
- `kickoff`
- `homeScore`
- `awayScore`
- `createdAt`
- `updatedAt`

### Collection `predictions`

- `userId`
- `matchId`
- `home`
- `away`
- `updatedAt`

## Important

Firebase Hosting protège l'hébergement du front, mais la vraie sécurité des données dépend des règles Firestore et de l'authentification Firebase, car les fichiers statiques du site restent publics. Les données sensibles doivent donc être sécurisées côté Firestore par les règles. [cite:78][cite:82]
