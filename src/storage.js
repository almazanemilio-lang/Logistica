// Este archivo reemplaza el "window.storage" que solo existe dentro de Claude.
// Aquí usamos Firebase Firestore (gratis) para que los datos se guarden de verdad
// en internet y todos los que abran el sitio vean lo mismo.
//
// PASOS PARA CONECTARLO A TU PROPIO FIREBASE (te los explico también por chat):
// 1. Crea un proyecto gratis en https://console.firebase.google.com
// 2. Dentro del proyecto, agrega una "Web app" (ícono </>)
// 3. Copia el objeto "firebaseConfig" que te da y pégalo abajo, reemplazando el de ejemplo
// 4. En el menú del proyecto, entra a "Firestore Database" y créala en "modo de prueba"

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI_TU_PROYECTO.firebaseapp.com",
  projectId: "PEGA_AQUI_TU_PROYECTO",
  storageBucket: "PEGA_AQUI_TU_PROYECTO.appspot.com",
  messagingSenderId: "PEGA_AQUI",
  appId: "PEGA_AQUI",
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
