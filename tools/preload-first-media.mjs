// Precalienta la primera imagen de los tres listados que dependen de
// Firestore (Eventos, Entrevistas, Televisión): sin esto, esa imagen no
// empieza a descargarse hasta que termina toda la cadena HTML -> script.js
// -> SDK de Firebase -> consulta a Firestore -> URL de Storage, lo que
// hunde el LCP de esas tres páginas a 68-72 en Lighthouse (auditoría
// UX/SEO/CRO 24/07/2026). Al escribir un <link rel="preload"> con la URL
// real en el propio HTML (lecturas de Firestore públicas, sin necesitar
// credenciales), el navegador empieza a descargarla en paralelo desde el
// primer instante, sin esperar a que se ejecute nada.
//
// Se ejecuta en cada despliegue (antes de "npm run build"), así que la URL
// precalentada nunca queda más desactualizada que el último deploy — igual
// de fresca que cualquier otro dato ya cacheado del sitio.

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
    return (data[0] && data[0].document && data[0].document.fields) || null;
}

function texto(campo) {
    return (campo && campo.stringValue) || '';
}

function cachedImg(url) {
    if (!url || !url.startsWith('https://firebasestorage.googleapis.com/')) return url;
    return `https://yaiza-diaz.web.app/img-cache?u=${encodeURIComponent(url)}`;
}

async function urlPrimerEvento() {
    const doc = await primerDocumento('events');
    const items = doc && doc.galleryItems && doc.galleryItems.arrayValue && doc.galleryItems.arrayValue.values;
    if (!items || !items.length) return null;
    const primero = items[0].mapValue.fields;
    return texto(primero.thumbnailSrc) || texto(primero.src) || null;
}

async function urlPrimeraEntrevista() {
    const doc = await primerDocumento('interviews');
    return doc ? (texto(doc.thumbnailUrl) || null) : null;
}

async function urlPrimerPrograma() {
    const doc = await primerDocumento('tv_programs');
    return doc ? (texto(doc.thumbnailUrl) || null) : null;
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

async function main() {
    console.log('Precalentando la primera imagen de Eventos / Entrevistas / Televisión...');

    try {
        await inyectarPreload('eventos.html', cachedImg(await urlPrimerEvento()));
    } catch (e) {
        console.error('  Aviso: no se pudo precalentar Eventos —', e.message);
    }

    try {
        await inyectarPreload('entrevistas.html', cachedImg(await urlPrimeraEntrevista()));
    } catch (e) {
        console.error('  Aviso: no se pudo precalentar Entrevistas —', e.message);
    }

    try {
        await inyectarPreload('television.html', cachedImg(await urlPrimerPrograma()));
    } catch (e) {
        console.error('  Aviso: no se pudo precalentar Televisión —', e.message);
    }
}

main();
