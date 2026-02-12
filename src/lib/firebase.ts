// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let isFirebaseConfigured = false;

// Safely initialize Firebase
if (firebaseConfig.apiKey) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseConfigured = true;
  } catch (e) {
    console.error("Erreur lors de l'initialisation de Firebase. Veuillez vérifier votre configuration.", e);
  }
} else {
  // This warning will be shown in the server/browser console.
  // The UI will also show a banner.
  console.warn(
    "Clé API Firebase manquante. L'application s'exécutera sans connexion à la base de données. Veuillez créer un fichier .env.local avec vos identifiants Firebase pour activer la persistance des données."
  );
}

export { app, db, auth, isFirebaseConfigured };