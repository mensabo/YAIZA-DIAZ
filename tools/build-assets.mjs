#!/usr/bin/env node
// Minifica src/style.css y src/script.js a style.css/script.js (en la raiz,
// que es lo que sirve GitHub Pages/Firebase Hosting) y sube el numero ?v= de
// cache-busting en todas las paginas .html automaticamente.
//
// Uso: npm run build
//
// El sitio no tiene paso de build en produccion (GitHub Pages/Firebase
// Hosting sirven los archivos del repo tal cual), asi que los archivos
// minificados SI se comitean - este script no corre en un CI, lo ejecutas
// tu (o Claude) en local antes de hacer commit cada vez que cambies
// src/style.css o src/script.js.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

async function build() {
    const cssSrcPath = join(root, 'src', 'style.css');
    const jsSrcPath = join(root, 'src', 'script.js');
    const cssOutPath = join(root, 'style.css');
    const jsOutPath = join(root, 'script.js');

    const cssSrc = readFileSync(cssSrcPath, 'utf-8');
    const jsSrc = readFileSync(jsSrcPath, 'utf-8');

    const cssResult = new CleanCSS({ level: 1 }).minify(cssSrc);
    if (cssResult.errors.length) {
        console.error('Errores minificando CSS:', cssResult.errors);
        process.exit(1);
    }
    const cssOut = cssResult.styles;

    // mangle desactivado del todo (no solo a nivel superior): casi todo el
    // fichero vive dentro de un IIFE, asi que "toplevel: false" no protege
    // los nombres de función usados dentro de ese scope - y tests/audit.test.js
    // los busca por nombre (initializeShareButtons, etc.) en el script ya
    // servido. quote_style:3 conserva las comillas originales por la misma
    // razon (el test de Consent Mode busca comillas simples concretas).
    // inline:false evita que terser "en linea" funciones llamadas una sola
    // vez (initializeShareButtons, initializeLazyAutoplayVideos...),
    // borrando su nombre del bundle - tests/audit.test.js las busca por
    // nombre en el script.js ya servido.
    const jsResult = await minifyJs(jsSrc, {
        compress: { defaults: true, inline: false, unused: false },
        mangle: false,
        format: { comments: false, quote_style: 3 },
    });
    if (!jsResult.code) {
        console.error('Error minificando JS:', jsResult);
        process.exit(1);
    }
    const jsOut = jsResult.code;

    writeFileSync(cssOutPath, cssOut);
    writeFileSync(jsOutPath, jsOut);

    const version = Date.now().toString();
    const htmlFiles = readdirSync(root).filter(f => f.endsWith('.html'));
    let touched = 0;
    for (const file of htmlFiles) {
        const path = join(root, file);
        const content = readFileSync(path, 'utf-8');
        const updated = content
            .replace(/style\.css\?v=\d+/g, `style.css?v=${version}`)
            .replace(/script\.js\?v=\d+/g, `script.js?v=${version}`);
        if (updated !== content) {
            writeFileSync(path, updated);
            touched++;
        }
    }

    const fmt = (n) => `${(n / 1024).toFixed(1)}KB`;
    console.log(`style.css: ${fmt(cssSrc.length)} -> ${fmt(cssOut.length)}`);
    console.log(`script.js: ${fmt(jsSrc.length)} -> ${fmt(jsOut.length)}`);
    console.log(`?v= actualizado a ${version} en ${touched} paginas .html`);
}

build();
