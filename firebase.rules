rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    function userDoc() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function userDocExists() {
      return signedIn() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid));
    }

    function isAdmin() {
      return userDocExists() &&
        userDoc().data.role == 'admin';
    }

    function winnerDocExists() {
      return exists(/databases/$(database)/documents/winners/current);
    }

    function winnerDoc() {
      return get(/databases/$(database)/documents/winners/current);
    }

    function winnerDeadlineOpen() {
      return winnerDocExists() &&
        winnerDoc().data.deadlineTimestamp is timestamp &&
        request.time < winnerDoc().data.deadlineTimestamp;
    }

    function winnerNotDeclared() {
      return !winnerDocExists() ||
        winnerDoc().data.winningTeam == null;
    }

    match /users/{userId} {
      allow read: if signedIn();

      allow create: if isOwner(userId) &&
        request.resource.data.uid == request.auth.uid &&
        request.resource.data.email == request.auth.token.email;

      allow update: if (isOwner(userId) || isAdmin()) &&
        request.resource.data.uid == resource.data.uid;

      allow delete: if isAdmin();
    }

    match /matches/{matchId} {
      allow read: if signedIn();
      allow create, update, delete: if isAdmin();
    }

    match /predictions/{predictionId} {
      allow read: if signedIn();

      allow create, update: if signedIn() &&
        request.resource.data.userId == request.auth.uid;

      allow delete: if (signedIn() && resource.data.userId == request.auth.uid) || isAdmin();
    }

    match /winners/{docId} {
      allow read: if signedIn();

      allow create: if isAdmin() &&
        docId == 'current';

      allow update: if isAdmin() &&
        docId == 'current';

      allow delete: if isAdmin();
    }

    match /winnerChoices/{userId} {
      allow read: if signedIn();

      allow create, update: if isOwner(userId) &&
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.teamCode is string &&
        winnerDeadlineOpen() &&
        winnerNotDeclared();

      allow delete: if isOwner(userId) || isAdmin();
    }
  }
}
