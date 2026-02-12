import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ATENÇÃO: Verifique se as Regras de Segurança no Console do Firebase estão como 'allow read, write: if true;' para testes.

const firebaseConfig = {
  apiKey: "AIzaSyBgegBtCKXKYKfreTntdVdWJTG3d2oGpn8",
  authDomain: "capital-golden-circle.firebaseapp.com",
  projectId: "capital-golden-circle",
  storageBucket: "capital-golden-circle.firebasestorage.app",
  messagingSenderId: "13600967549",
  appId: "1:13600967549:web:ce55b8162557b60aafda14",
  measurementId: "G-RHJ6HN7QDR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Auth and Firestore services
export const auth = getAuth(app);

// Voltando para o padrão (sem parâmetros extras), que busca o banco "(default)"
export const db = getFirestore(app);