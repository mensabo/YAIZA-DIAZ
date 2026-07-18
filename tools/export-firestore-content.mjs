// Script de un solo uso para volcar el contenido de Firestore a un JSON local.
// Uso (en tu ordenador, con Node 18+):
//   npm install firebase
//   node tools/export-firestore-content.mjs
// Genera "firestore-export.json" en la raíz del repo con todo el contenido
// de las colecciones públicas. Pégame el contenido de ese archivo (o solo
// los campos que contengan nombres/rutas de imagen) para que pueda cotejarlo.

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { writeFileSync } from "node:fs";

// Copiado de config.js (config pública, no es un secreto).
const firebaseConfig = {
  apiKey: "AIzaSyD8m41DIZSXeQDkicjan-cSwlPfC99dmaw",
  authDomain: "yaiza-diaz.firebaseapp.com",
  projectId: "yaiza-diaz",
  storageBucket: "yaiza-diaz.firebasestorage.app",
  messagingSenderId: "874170479144",
  appId: "1:874170479144:web:eab4eee2940a65393efb1d",
  measurementId: "G-GPTS82X18T",
};

const COLLECTIONS = [
  "pages",
  "events",
  "interviews",
  "awards",
  "tv_programs",
  "gallery",
  "modeling_gallery",
  "television_gallery",
  "radio_gallery",
  "habecu_gallery",
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const result = {};
for (const name of COLLECTIONS) {
  const snap = await getDocs(collection(db, name));
  result[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

writeFileSync("firestore-export.json", JSON.stringify(result, null, 2), "utf8");
console.log("Exportado a firestore-export.json");
