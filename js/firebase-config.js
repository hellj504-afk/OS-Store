// ==========================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
// Ye file Firebase ko initialize karti hai aur
// Firestore (database) aur Analytics ko globally expose karti hai.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";

// Aapki Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMxN23JizRH7Y8LqSxl-F2NEnWDI1ZJJE",
  authDomain: "os-store-cc0e7.firebaseapp.com",
  projectId: "os-store-cc0e7",
  storageBucket: "os-store-cc0e7.firebasestorage.app",
  messagingSenderId: "977968189710",
  appId: "1:977968189710:web:bd3861fa4294d4549a075f",
  measurementId: "G-0SG82RE3Z2"
};

// Firebase initialize
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Global expose — taake baaki JS files use kar sakein
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAnalytics = analytics;

console.log("✅ Firebase initialized:", firebaseConfig.projectId);
