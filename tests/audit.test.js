#!/usr/bin/env node
/**
 * Auditoria estatica de rendimiento e integridad del sitio.
 * Sin dependencias externas: node tests/audit.test.js
 * Sale con codigo 1 si algun check falla.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML_FILES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const PUBLIC_HTML_FILES = HTML_FILES.filter(f => f !== 'admin.html' && f !== '404.html');

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) {
    passes++;
  } else {
    failures++;
    console.log(`FAIL: ${name}${detail ? ' - ' + detail : ''}`);
  }
}

function readFile(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf-8');
}

// ---------------------------------------------------------------------------
// 1. Peso de imagenes: ninguna imagen referenciada debe superar 400KB
// ---------------------------------------------------------------------------
const MAX_IMAGE_BYTES = 400 * 1024;
const imagesDir = path.join(ROOT, 'images');
const referencedImages = new Set();
for (const f of [...HTML_FILES, 'script.js', 'admin.js', 'evento.js', 'style.css']) {
  const content = readFile(f);
  const matches = content.matchAll(/images\/([a-zA-Z0-9_\-.]+\.(?:png|jpe?g|webp|gif|svg))/g);
  for (const m of matches) referencedImages.add(m[1]);
}
for (const img of referencedImages) {
  const fp = path.join(imagesDir, img);
  if (!fs.existsSync(fp)) continue;
  const size = fs.statSync(fp).size;
  check(`imagen ${img} <= 400KB`, size <= MAX_IMAGE_BYTES, `${(size / 1024).toFixed(0)}KB`);
}

// ---------------------------------------------------------------------------
// 2. Todas las <img> con src local real deben tener loading="lazy"
//    (excepto el logo de navegacion, visible above-the-fold en toda pagina)
// ---------------------------------------------------------------------------
for (const f of PUBLIC_HTML_FILES) {
  const content = readFile(f);
  const imgTags = content.match(/<img\b[^>]*>/g) || [];
  for (const tag of imgTags) {
    if (/src=""/.test(tag)) continue; // lightbox / galeria dinamica, sin src inicial
    if (/logo-personal\.png/.test(tag)) continue; // logo de nav, above-the-fold
    check(
      `${f}: <img> tiene loading="lazy"`,
      /loading="lazy"/.test(tag),
      tag.slice(0, 80)
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Todas las <img> con src local (images/...) deben declarar width/height
//    para reservar espacio y evitar layout shift (CLS)
// ---------------------------------------------------------------------------
for (const f of PUBLIC_HTML_FILES) {
  const content = readFile(f);
  const imgTags = content.match(/<img\b[^>]*src="images\/[^"]+"[^>]*>/g) || [];
  for (const tag of imgTags) {
    check(
      `${f}: <img> local tiene width/height`,
      /width="\d+"/.test(tag) && /height="\d+"/.test(tag),
      tag.slice(0, 80)
    );
  }
}

// ---------------------------------------------------------------------------
// 4. firebase.json valido y con hosting + cache headers configurados
// ---------------------------------------------------------------------------
try {
  const fbJson = JSON.parse(readFile('firebase.json'));
  check('firebase.json: es JSON valido', true);
  check('firebase.json: tiene bloque "hosting"', !!fbJson.hosting);
  check('firebase.json: hosting tiene "headers"', !!(fbJson.hosting && fbJson.hosting.headers && fbJson.hosting.headers.length > 0));
  const headerSources = (fbJson.hosting?.headers || []).map(h => h.source).join(' ');
  check('firebase.json: cache headers cubren imagenes/audio/video', /jpg|png|mp4|mp3/.test(headerSources));
  check('firebase.json: cache headers cubren css/js', /css|js/.test(headerSources));
} catch (e) {
  check('firebase.json: es JSON valido', false, e.message);
}

// ---------------------------------------------------------------------------
// 5. Sin marcadores de conflicto de merge en ningun archivo trackeado relevante
// ---------------------------------------------------------------------------
const TRACKED_EXT = ['.html', '.js', '.css', '.json'];
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (TRACKED_EXT.includes(path.extname(entry.name))) files.push(full);
  }
  return files;
}
// Solo se marca conflicto real si aparecen los marcadores de inicio/fin de
// Git a comienzo de linea (evita falsos positivos con separadores tipo
// "// =======" usados como comentarios decorativos en el codigo).
const conflictStart = /^<{7}(?!=)/m;
const conflictEnd = /^>{7}(?!=)/m;
for (const fp of walk(ROOT)) {
  if (fp === __filename) continue;
  const content = fs.readFileSync(fp, 'utf-8');
  const rel = path.relative(ROOT, fp);
  const hasConflict = conflictStart.test(content) || conflictEnd.test(content);
  check(`${rel}: sin marcadores de conflicto de merge`, !hasConflict);
}

// ---------------------------------------------------------------------------
// 6. Sin credenciales hardcodeadas obvias en functions/index.js
// ---------------------------------------------------------------------------
const functionsIndex = path.join(ROOT, 'functions', 'index.js');
if (fs.existsSync(functionsIndex)) {
  const content = fs.readFileSync(functionsIndex, 'utf-8');
  check(
    'functions/index.js: usa defineSecret para GMAIL_APP_PASSWORD',
    /defineSecret\(["']GMAIL_APP_PASSWORD["']\)/.test(content)
  );
  check(
    'functions/index.js: no contiene contraseñas de aplicacion literales (16 chars sin espacios)',
    !/["'][a-z]{16}["']/.test(content.replace(/defineSecret\([^)]*\)/g, ''))
  );
}

// ---------------------------------------------------------------------------
// 7. Sintaxis valida de los .js del frontend
// ---------------------------------------------------------------------------
const { execSync } = require('child_process');
for (const jsFile of ['script.js', 'admin.js', 'evento.js', 'update.js']) {
  try {
    execSync(`node --check "${path.join(ROOT, jsFile)}"`, { stdio: 'pipe' });
    check(`${jsFile}: sintaxis valida`, true);
  } catch (e) {
    check(`${jsFile}: sintaxis valida`, false, e.message);
  }
}

// ---------------------------------------------------------------------------
// 8. preconnect a fonts/cdnjs presente en todas las paginas publicas
// ---------------------------------------------------------------------------
for (const f of PUBLIC_HTML_FILES) {
  const content = readFile(f);
  check(`${f}: preconnect a fonts.googleapis.com`, content.includes('rel="preconnect" href="https://fonts.googleapis.com"'));
  check(`${f}: link de Google Fonts bien formado`, /<link href="https:\/\/fonts\.googleapis\.com\/css2\?family=/.test(content));
}

// ---------------------------------------------------------------------------
// 9. SEO: robots.txt, sitemap.xml, canonical, admin sin indexar, un h1 por pagina
// ---------------------------------------------------------------------------
check('robots.txt existe', fs.existsSync(path.join(ROOT, 'robots.txt')));
check('sitemap.xml existe', fs.existsSync(path.join(ROOT, 'sitemap.xml')));
if (fs.existsSync(path.join(ROOT, 'robots.txt'))) {
  const robots = readFile('robots.txt');
  check('robots.txt referencia el sitemap', /Sitemap:/.test(robots));
  check('robots.txt bloquea admin.html', /Disallow:\s*\/admin\.html/.test(robots));
}

for (const f of PUBLIC_HTML_FILES) {
  const content = readFile(f);
  check(`${f}: tiene rel="canonical"`, /rel="canonical"/.test(content));
  const h1Count = (content.match(/<h1\b/g) || []).length;
  check(`${f}: tiene exactamente un <h1>`, h1Count === 1, `encontrados: ${h1Count}`);
}

const adminContent = readFile('admin.html');
check('admin.html: tiene meta robots noindex,nofollow', /name="robots"\s+content="noindex,\s*nofollow"/.test(adminContent));

check('404.html existe (pagina de error de GitHub Pages)', fs.existsSync(path.join(ROOT, '404.html')));
const notFoundContent = readFile('404.html');
check('404.html: tiene meta robots noindex,nofollow', /name="robots"\s+content="noindex,\s*nofollow"/.test(notFoundContent));

// ---------------------------------------------------------------------------
// 10. Sin rutas absolutas root-relative para manifest/favicon: rompen en
//     subpaths (p.ej. preview de GitHub Pages en /usuario/repo/) aunque
//     funcionen en produccion (dominio raiz)
// ---------------------------------------------------------------------------
for (const f of HTML_FILES) {
  const content = readFile(f);
  check(`${f}: manifest/favicon usan ruta relativa`, !/href="\/(site\.webmanifest|favicon\.ico)"/.test(content));
}
check('images/favicon.ico existe', fs.existsSync(path.join(imagesDir, 'favicon.ico')));
for (const f of HTML_FILES) {
  const content = readFile(f);
  check(`${f}: tiene link rel="icon" (favicon)`, /rel="icon"/.test(content));
  check(`${f}: tiene link rel="manifest"`, /rel="manifest"/.test(content));
}

// ---------------------------------------------------------------------------
// 11. Hero de la home: fondo estatico como fallback + preload, para que no
//     se quede en blanco mientras se resuelve la imagen dinamica de Firebase
// ---------------------------------------------------------------------------
const styleCss = readFile('style.css');
check(
  '.hero-background-container tiene background-color de fallback',
  /\.hero-background-container\s*\{[^}]*background-color:/s.test(styleCss)
);
check(
  '.hero-bg-layer tiene transition de opacity para el crossfade',
  /\.hero-bg-layer\s*\{[^}]*transition:\s*opacity/s.test(styleCss)
);
const indexContent = readFile('index.html');
check(
  'index.html: la capa de fondo activa del hero trae una imagen estatica de fallback',
  /hero-bg-layer active"[^>]*background-image:\s*url\(/.test(indexContent)
);
check(
  'index.html: precarga la imagen del hero con rel="preload"',
  /<link rel="preload" as="image"/.test(indexContent)
);
for (const f of PUBLIC_HTML_FILES) {
  const content = readFile(f);
  check(`${f}: preconnect a firestore.googleapis.com`, content.includes('https://firestore.googleapis.com'));
  check(`${f}: preconnect a firebasestorage.googleapis.com`, content.includes('https://firebasestorage.googleapis.com'));
}

// ---------------------------------------------------------------------------
// 12. CookieYes no bloquea el render (defer) + videos de fondo autoplay
//     con carga diferida (data-src en vez de src, para no descargar varios
//     MP4 en paralelo al entrar en la pagina)
// ---------------------------------------------------------------------------
for (const f of HTML_FILES) {
  const content = readFile(f);
  if (content.includes('id="cookieyes"')) {
    check(`${f}: CookieYes carga con defer`, /id="cookieyes"[^>]*\bdefer\b/.test(content));
  }
  check(`${f}: no quedan <video autoplay> con <source src> sin lazy-load`, !/<video[^>]*\bautoplay\b[^>]*>(?:(?!<\/video>).)*?<source src=/s.test(content));
}
check('script.js: inicializa el lazy-load de videos autoplay', /initializeLazyAutoplayVideos/.test(readFile('script.js')));

// ---------------------------------------------------------------------------
// 13. CTA de contacto en el menu + botones de compartir
// ---------------------------------------------------------------------------
for (const f of PUBLIC_HTML_FILES) {
  const content = readFile(f);
  check(`${f}: el enlace "Contacto" del menu es un CTA destacado`, /<a href="contacto\.html" class="nav-cta">Contacto<\/a>/.test(content));
}
check('script.js: inicializa los botones de compartir', /initializeShareButtons/.test(readFile('script.js')));
check('script.js: las tarjetas de entrevistas incluyen boton de compartir', /share-btn/.test(readFile('script.js')));
const premiosContent = readFile('premios.html');
check('premios.html: cada premio tiene boton de compartir', (premiosContent.match(/class="share-btn share-btn-inline"/g) || []).length === 4);

// ---------------------------------------------------------------------------
// 14. Google Analytics (GA4) con Consent Mode (denied por defecto, CookieYes
//     lo actualiza al aceptar), en todas las paginas publicas salvo admin
// ---------------------------------------------------------------------------
for (const f of HTML_FILES) {
  if (f === 'admin.html') continue;
  const content = readFile(f);
  check(`${f}: incluye gtag.js de GA4`, /googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/.test(content));
  check(`${f}: fija el consentimiento por defecto en "denied" antes de cargar gtag`, /gtag\('consent',\s*'default'/.test(content));
}
check('admin.html: no carga Google Analytics', !readFile('admin.html').includes('googletagmanager.com/gtag'));

// ---------------------------------------------------------------------------
console.log(`\n${passes} checks OK, ${failures} checks fallidos.`);
process.exit(failures > 0 ? 1 : 0);
