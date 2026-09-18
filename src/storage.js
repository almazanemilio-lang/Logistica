// Este archivo reemplaza el "window.storage" que solo existe dentro de Claude.
// Aquí usamos Firebase Firestore (gratis) para que los datos se guarden de verdad
// en internet y todos los que abran el sitio vean lo mismo.

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDjp4RrUML1BrYv-LeGt5j_lPqyy4wo1K8",
  authDomain: "logistica-lfm-comites.firebaseapp.com",
  projectId: "logistica-lfm-comites",
  storageBucket: "logistica-lfm-comites.firebasestorage.app",
  messagingSenderId: "813457889255",
  appId: "1:813457889255:web:c260703f2bdbbbc8f24f42",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Imita la misma forma en que el código ya sabe usar window.storage,
// para no tener que tocar nada más de App.jsx.
window.storage = {
  async get(key) {
    const ref = doc(db, 'logistica', key);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('no existe');
    return { key, value: snap.data().value };
  },
  async set(key, value) {
    const ref = doc(db, 'logistica', key);
    await setDoc(ref, { value });
    return { key, value };
  },
  async delete(key) {
    const ref = doc(db, 'logistica', key);
    await deleteDoc(ref);
    return { key, deleted: true };
  },
};
