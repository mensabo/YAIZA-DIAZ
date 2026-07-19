// Script de un solo uso para comprimir en firme las fotos que YA están en
// Firebase Storage (subidas antes de que admin.js empezara a comprimir en
// el navegador). Redimensiona/recomprime cada imagen y la SOBRESCRIBE en
// la misma ruta, conservando el token de descarga -> las URLs guardadas en
// Firestore (hero-slider, eventos, galerías...) siguen funcionando igual,
// sin tocar ni un documento de Firestore.
//
// SEGURIDAD: hace falta una clave de cuenta de servicio (secreto real, a
// diferencia de config.js). Para conseguirla:
//   Firebase Console -> Configuración del proyecto (el engranaje) ->
//   Cuentas de servicio -> Generar nueva clave privada -> se descarga un
//   .json. Guárdalo como tools/serviceAccountKey.json (NUNCA lo subas a
//   git - ya está en .gitignore, pero comprueba con "git status" antes de
//   hacer commit de nada) y BÓRRALO en cuanto termines de usar el script.
//
// Uso (en tu ordenador, con Node 18+, desde la raíz del repo):
//   npm install firebase-admin sharp
//   node tools/compress-storage-images.mjs            (solo simula, no toca nada)
//   node tools/compress-storage-images.mjs --apply     (aplica los cambios de verdad)
//
// Antes de sobrescribir cada imagen, guarda una copia del original en
// _originals_backup/<misma ruta> dentro del mismo bucket, por si hay que
// deshacer algo. Bórralas manualmente desde la consola de Storage cuando
// confirmes que todo está bien.

import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const KEY_PATH = new URL("./serviceAccountKey.json", import.meta.url);

if (!existsSync(KEY_PATH)) {
  console.error(
    "Falta tools/serviceAccountKey.json. Descárgalo desde Firebase Console " +
    "(Configuración del proyecto -> Cuentas de servicio -> Generar nueva clave privada)."
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(KEY_PATH, "utf8"));

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "yaiza-diaz.firebasestorage.app",
});

const bucket = getStorage(app).bucket();

// Mismas carpetas donde admin.js sube imágenes (ver uploadBytes en admin.js).
// events/videos/ queda fuera a propósito: ahí solo hay vídeos.
const IMAGE_FOLDERS = [
  "hero-slider/",
  "events/",
  "events/thumbnails/",
  "interviews/",
  "awards/",
  "tv_programs/",
  "gallery/",
  "modeling_gallery/",
  "television_gallery/",
  "radio_gallery/",
  "habecu_gallery/",
];

// Mismos parámetros que compressImage() en admin.js, para que el resultado
// sea consistente con lo que ya se sube desde el navegador.
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 82;
const SKIP_UNDER_BYTES = 400 * 1024;

function shouldProcess(path) {
  if (path.startsWith("events/videos/")) return false;
  if (path.startsWith("_originals_backup/")) return false;
  if (!IMAGE_FOLDERS.some((folder) => path.startsWith(folder))) return false;
  return /\.(jpe?g|png)$/i.test(path);
}

async function main() {
  console.log(APPLY ? "Modo APLICAR: se van a sobrescribir imágenes de verdad.\n" : "Modo SIMULACIÓN (por defecto): no se toca nada, solo se muestra qué haría.\n");

  const [files] = await bucket.getFiles();
  const targets = files.filter((f) => shouldProcess(f.name));
  console.log(`${targets.length} imágenes candidatas en las carpetas gestionadas por el admin.\n`);

  let compressed = 0;
  let skipped = 0;
  let totalSavedBytes = 0;

  for (const file of targets) {
    const path = file.name;
    const [buffer] = await file.download();
    const originalSize = buffer.length;

    let metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch (err) {
      console.log(`  omitida (no se pudo leer como imagen): ${path}`);
      skipped++;
      continue;
    }

    const needsResize = metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;
    if (!needsResize && originalSize < SKIP_UNDER_BYTES) {
      skipped++;
      continue;
    }

    const isPng = /\.png$/i.test(path);
    let pipeline = sharp(buffer).resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });
    pipeline = isPng ? pipeline.png() : pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    const output = await pipeline.toBuffer();

    if (output.length >= originalSize) {
      skipped++;
      continue; // no mejora, se deja tal cual
    }

    const savedKB = ((originalSize - output.length) / 1024).toFixed(0);
    console.log(`  ${path}: ${(originalSize / 1024).toFixed(0)}KB -> ${(output.length / 1024).toFixed(0)}KB (-${savedKB}KB)`);
    compressed++;
    totalSavedBytes += originalSize - output.length;

    if (!APPLY) continue;

    const [existingMetadata] = await file.getMetadata();

    // Copia de seguridad del original antes de sobrescribir.
    await bucket.file(`_originals_backup/${path}`).save(buffer, {
      contentType: existingMetadata.contentType,
    });

    // Sobrescribe en la misma ruta, conservando el token de descarga
    // (va dentro de metadata.metadata) para que la URL guardada en
    // Firestore no cambie.
    await file.save(output, {
      metadata: {
        contentType: existingMetadata.contentType,
        metadata: existingMetadata.metadata,
      },
    });
  }

  console.log(`\n${compressed} comprimidas, ${skipped} ya estaban bien.`);
  console.log(`Ahorro total: ${(totalSavedBytes / 1024 / 1024).toFixed(2)}MB`);
  if (!APPLY) {
    console.log("\nEsto ha sido una simulación. Para aplicarlo de verdad:");
    console.log("  node tools/compress-storage-images.mjs --apply");
  } else {
    console.log("\nOriginales guardados en _originals_backup/ dentro del mismo bucket, por si hay que deshacer algo.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
