#!/usr/bin/env node
// Sube el sitio (ya generado con `npm run build`) al espacio web de IONOS
// por SFTP. Pensado para ejecutarse desde GitHub Actions
// (.github/workflows/deploy-ionos.yml), usando las credenciales de la
// cuenta SFTP dedicada (ver FTP_SERVER/FTP_USERNAME/FTP_PASSWORD).
//
// La cuenta SFTP de IONOS ya esta limitada a la carpeta /YAIZADIAZ, asi
// que el remoto "/" de esta conexion YA ES esa carpeta - no hace falta
// (ni se debe) anadir /YAIZADIAZ a las rutas remotas de aqui.

import SftpClient from 'ssh2-sftp-client';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Carpetas/archivos que no le sirven de nada a IONOS (codigo fuente,
// herramientas de build, configuracion especifica de Firebase/GitHub...).
const EXCLUDE_DIRS = new Set([
    '.git', '.github', 'node_modules', 'src', 'tools', 'tests', 'functions', '.vscode',
]);
const EXCLUDE_FILES = new Set([
    'CLAUDE.md', 'package.json', 'package-lock.json', 'firebase.json',
    '.firebaserc', 'firestore.rules', 'storage.rules', 'cors.json', '.gitignore',
]);

function collectFiles(dir, base = dir) {
    const out = [];
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const rel = relative(base, fullPath);
        const st = statSync(fullPath);
        if (st.isDirectory()) {
            if (EXCLUDE_DIRS.has(entry)) continue;
            out.push(...collectFiles(fullPath, base));
        } else {
            if (EXCLUDE_FILES.has(rel)) continue;
            out.push({ fullPath, rel });
        }
    }
    return out;
}

async function ensureRemoteDir(sftp, remoteDir, cache) {
    if (remoteDir === '.' || remoteDir === '' || cache.has(remoteDir)) return;
    const parent = remoteDir.includes('/') ? remoteDir.slice(0, remoteDir.lastIndexOf('/')) : '.';
    await ensureRemoteDir(sftp, parent, cache);
    const exists = await sftp.exists(remoteDir);
    if (!exists) await sftp.mkdir(remoteDir, true);
    cache.add(remoteDir);
}

async function main() {
    const files = collectFiles(root);
    console.log(`Subiendo ${files.length} archivos a IONOS por SFTP...`);

    const sftp = new SftpClient();
    await sftp.connect({
        host: process.env.FTP_SERVER,
        port: 22,
        username: process.env.FTP_USERNAME,
        password: process.env.FTP_PASSWORD,
    });

    const dirCache = new Set();
    let uploaded = 0;
    for (const { fullPath, rel } of files) {
        const remotePath = rel.split(sep).join('/');
        const remoteDir = remotePath.includes('/') ? remotePath.slice(0, remotePath.lastIndexOf('/')) : '.';
        await ensureRemoteDir(sftp, remoteDir, dirCache);
        await sftp.put(fullPath, remotePath);
        uploaded++;
        if (uploaded % 25 === 0) console.log(`  ${uploaded}/${files.length}...`);
    }

    await sftp.end();
    console.log(`Listo: ${uploaded} archivos subidos.`);
}

main().catch((err) => {
    console.error('Error subiendo a IONOS:', err);
    process.exit(1);
});
