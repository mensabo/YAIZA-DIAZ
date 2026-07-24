// Precalienta/hornea el primer elemento de los tres listados que dependen
// de Firestore (Eventos, Entrevistas, Televisión): sin esto, ese primer
// elemento no aparece hasta que termina toda la cadena HTML -> script.js ->
// SDK de Firebase -> consulta a Firestore -> URL de Storage, lo que hunde
// el LCP de esas tres páginas a 68-72 en Lighthouse (auditoría UX/SEO/CRO
// 24/07/2026).
//
// Entrevistas ya tiene un fallback estático real en el propio HTML (no
// hace falta hornear nada ahí, solo se le precalienta la imagen por si el
// primer resultado real de Firestore ha cambiado desde que se escribió ese
// fallback a mano). Eventos y Televisión NO tenían ningún fallback real
// (solo un "Cargando..."), así que aquí se hornea el HTML real de su
// primera tarjeta -- exactamente el mismo marcado que generaría
// loadAndRenderEventsGridPage()/loadAndRenderTVPrograms() en src/script.js
// para el índice 0 -- delante del aviso de carga, que se deja para el
// resto de elementos. El cliente sigue haciendo su propio
// getDocs()+innerHTML='' de siempre; si el dato horneado coincide (caso
// normal, ambos leen la misma Firestore), no hay parpadeo perceptible.
//
// Se ejecuta en cada despliegue (antes de "npm run build"), así que nunca
// queda más desactualizado que el último deploy -- igual de fresco que
// cualquier otro dato ya cacheado del sitio.

const PROJECT = 'yaiza-diaz';
const RUN_QUERY_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;

async function primerDocumento(collectionId) {
    const body = {
        structuredQuery: {
            from: [{ collectionId }],
            orderBy: [{ field: { fieldPath: 'order' }, direction: 'ASCENDING' }],
            limit: 1
        }
    };
    const res = await fetch(RUN_QUERY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Firestore respondió ${res.status} para "${collectionId}"`);
    const data = await res.json();
    const doc = data[0] && data[0].document;
    if (!doc) return null;
    return { fields: doc.fields || {}, id: doc.name.split('/').pop() };
}

function texto(campo) {
    return (campo && campo.stringValue) || '';
}

function mapaCampos(campo) {
    return (campo && campo.mapValue && campo.mapValue.fields) || null;
}

function arrayValores(campo) {
    return (campo && campo.arrayValue && campo.arrayValue.values) || [];
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
    }[c]));
}

function cachedImg(url) {
    if (!url || !url.startsWith('https://firebasestorage.googleapis.com/')) return url;
    return `https://yaiza-diaz.web.app/img-cache?u=${encodeURIComponent(url)}`;
}

async function urlPrimerEvento() {
    const doc = await primerDocumento('events');
    const items = arrayValores(doc && doc.fields.galleryItems);
    if (!items.length) return null;
    const primero = mapaCampos(items[0]) || {};
    return texto(primero.thumbnailSrc) || texto(primero.src) || null;
}

async function urlPrimeraEntrevista() {
    const doc = await primerDocumento('interviews');
    return doc ? (texto(doc.fields.thumbnailUrl) || null) : null;
}

async function urlPrimerPrograma() {
    const doc = await primerDocumento('tv_programs');
    return doc ? (texto(doc.fields.thumbnailUrl) || null) : null;
}

async function inyectarPreload(rutaHtml, urlImagen) {
    const fs = await import('fs');
    if (!urlImagen) {
        console.log(`  (sin imagen real todavía, no se toca ${rutaHtml})`);
        return;
    }
    let html = fs.readFileSync(rutaHtml, 'utf8');
    const inicio = '<!-- PRELOAD-PRIMER-MEDIA:INICIO -->';
    const fin = '<!-- PRELOAD-PRIMER-MEDIA:FIN -->';
    const bloque = `${inicio}\n    <link rel="preload" as="image" href="${urlImagen}" fetchpriority="high">\n    ${fin}`;
    const patron = new RegExp(`${inicio}[\\s\\S]*?${fin}`);
    html = patron.test(html) ? html.replace(patron, bloque) : html.replace('</head>', `    ${bloque}\n</head>`);
    fs.writeFileSync(rutaHtml, html);
    console.log(`  ✓ ${rutaHtml} -> ${urlImagen.slice(0, 90)}...`);
}

// Hornea el bloque de marcado real de un primer elemento delante de un
// ancla estable (el propio "Cargando..." que ya existe en el HTML fuente).
// Si ya hay un bloque horneado de una ejecución anterior (marcadores
// INICIO/FIN), lo sustituye en su sitio en vez de duplicarlo.
async function hornearPrimerElemento(rutaHtml, marcadorId, marcadoHtml, anclaRegex) {
    const fs = await import('fs');
    if (!marcadoHtml) {
        console.log(`  (sin datos reales todavía, no se hornea nada en ${rutaHtml})`);
        return;
    }
    let html = fs.readFileSync(rutaHtml, 'utf8');
    const inicio = `<!-- ${marcadorId}:INICIO -->`;
    const fin = `<!-- ${marcadorId}:FIN -->`;
    const bloque = `${inicio}\n                ${marcadoHtml}\n                ${fin}`;
    const patronExistente = new RegExp(`${inicio}[\\s\\S]*?${fin}`);
    if (patronExistente.test(html)) {
        html = html.replace(patronExistente, bloque);
    } else if (anclaRegex.test(html)) {
        html = html.replace(anclaRegex, `${bloque}\n                $&`);
    } else {
        console.error(`  Aviso: no se encontró el ancla esperada en ${rutaHtml}, no se toca.`);
        return;
    }
    fs.writeFileSync(rutaHtml, html);
    console.log(`  ✓ ${rutaHtml}: primer elemento horneado en el HTML.`);
}

async function marcadoPrimerEvento() {
    const doc = await primerDocumento('events');
    if (!doc) return null;
    const title = texto(doc.fields.title);
    const items = arrayValores(doc.fields.galleryItems);
    const primero = items.length ? (mapaCampos(items[0]) || {}) : {};
    const tipo = texto(primero.type) || 'image';
    const position = texto(primero.position);
    const positionStyle = position ? ` style="object-position: ${escapeHtml(position)};"` : '';
    let mediaHtml;
    if (tipo === 'video' && texto(primero.videoSrc)) {
        mediaHtml = `<video autoplay loop muted playsinline poster="${escapeHtml(texto(primero.thumbnailSrc))}"${positionStyle}><source src="${escapeHtml(texto(primero.videoSrc))}" type="video/mp4"></video>`;
    } else {
        const thumb = texto(primero.thumbnailSrc) || texto(primero.src) || 'images/placeholder.png';
        mediaHtml = `<img src="${escapeHtml(cachedImg(thumb))}" alt="${escapeHtml(title)}" fetchpriority="high"${positionStyle}>`;
    }
    return `<a href="evento-detalle.html?id=${encodeURIComponent(doc.id)}" class="event-card-link"><div class="event-card-image">${mediaHtml}</div><div class="event-card-content"><h2>${escapeHtml(title)}</h2></div></a>`;
}

async function marcadoPrimerPrograma() {
    const doc = await primerDocumento('tv_programs');
    if (!doc) return null;
    const title = texto(doc.fields.title);
    const text = texto(doc.fields.text);
    const url = texto(doc.fields.url);
    const thumb = texto(doc.fields.thumbnailUrl);
    const textHtml = text ? `<p>${escapeHtml(text)}</p>` : '';
    return `<div class="comunicacion-section"><h2>${escapeHtml(title)}</h2>${textHtml}<a href="${escapeHtml(url)}" class="video-fallback js-video-modal-trigger" data-video-src="${escapeHtml(url)}"><img src="${escapeHtml(cachedImg(thumb))}" alt="Miniatura ${escapeHtml(title)}" fetchpriority="high"><div class="play-button-overlay"><i class="fas fa-play"></i></div></a></div>`;
}

async function main() {
    console.log('Precalentando/horneando el primer elemento de Eventos / Entrevistas / Televisión...');

    try {
        await hornearPrimerElemento('eventos.html', 'PRIMER-EVENTO', await marcadoPrimerEvento(), /<p class="grid-loading-msg">Cargando eventos\.\.\.<\/p>/);
    } catch (e) {
        console.error('  Aviso: no se pudo hornear el primer evento —', e.message);
    }

    try {
        await inyectarPreload('entrevistas.html', cachedImg(await urlPrimeraEntrevista()));
    } catch (e) {
        console.error('  Aviso: no se pudo precalentar Entrevistas —', e.message);
    }

    try {
        await hornearPrimerElemento('television.html', 'PRIMER-PROGRAMA', await marcadoPrimerPrograma(), /<div class="loader-container"/);
    } catch (e) {
        console.error('  Aviso: no se pudo hornear el primer programa —', e.message);
    }
}

main();
