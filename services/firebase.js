// services/firebase.js
// ─────────────────────────────────────────────
// Replace every value below with the ones from
// your Firebase project → Project Settings → Your apps
// ─────────────────────────────────────────────
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDjuJ2iMMe4raJYzVsPsuaD0_1zNYL2rMk",
  authDomain: "safecharge-3a98b.firebaseapp.com",
  projectId: "safecharge-3a98b",
  storageBucket: "safecharge-3a98b.firebasestorage.app",
  messagingSenderId: "892570929280",
  appId: "1:892570929280:web:c50c88ce0e0a3a4cc23e65",
  measurementId: "G-02N921GQTH",
};

// Prevent re-initialising on hot-reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Realtime Database – ESP32 writes sensor data here
export const db = getDatabase(app);

export default app;
