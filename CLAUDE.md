# YAIZA-DIAZ — CLAUDE.md (versión exportable)

Sitio web personal/portfolio de Yaiza Díaz (periodista/presentadora/modelo). Estático (HTML/CSS/JS vanilla) con backend Firebase. Publicado en **www.yaizadiaz.com** (hosting IONOS/Apache).

## Palabra clave: "Jarvis"

Cuando el usuario escriba **"Jarvis"** en un chat nuevo, hay que actualizar el `CLAUDE.md` del repo con lo aprendido o cambiado en esa sesión. Mantenerlo conciso y en español.

## Stack y estructura

- Cada página pública es un `.html` independiente en la raíz (19 páginas: `index`, `television`, `eventos`, `radio`, `publicidad`, `comunicacion`, `investigacion`, `proyectos`, `premios`, `entrevistas`, `libro`, `modelaje`, `contacto`, `evento-detalle`, `404`, `aviso-legal`, `politica-cookies`, `politica-privacidad`, + panel admin).
- **Código fuente editable: `src/style.css` y `src/script.js`**. Los `style.css`/`script.js` de la raíz son build output minificado (comiteado, no hay CI de build) — **nunca editarlos directamente**.
- `npm run build` (`tools/build-assets.mjs`): minifica con `clean-css` (level 1) + `terser` y **sube automáticamente el `?v=` de cache-busting en todas las páginas públicas**. Ejecutarlo antes de cada commit que toque CSS/JS.
  - Config de terser no negociable: `mangle: false`, `compress.unused: false`, `compress.inline: false`, `format.quote_style: 3` — si no, borra/renombra funciones que `tests/audit.test.js` verifica por nombre.
- El panel de administración (protegido con Firebase Auth + `.htaccess`) **no pasa por el build** — se queda legible sin minificar. Es PWA instalable (manifest + service worker propios). Vive en `panel-yz28da.html`/`.css`/`.js` (URL no adivinable, renombrado desde `admin.*`), protegido además con `.htpasswd-panel`.
- `config.js` (firebaseConfig del cliente): **público por diseño, debe estar trackeado en git** — si se excluye, producción rompe con `firebaseConfig is not defined`.
- Firebase: Firestore + Auth + Storage + Cloud Functions (`functions/`, Node 22). Firebase Hosting configurado en `firebase.json` pero **ya no es el mecanismo de publicación** (queda de reserva).
- `functions/index.js`: Cloud Function `sendContactEmail` — al crearse un doc en `contactMessages` envía email vía Gmail/nodemailer a `yaizadiaztv@gmail.com`. Depurar con `firebase functions:log --only sendContactEmail`.
- Tests sin dependencias: `node tests/audit.test.js` (SEO, un solo H1 por página, jerarquía de encabezados, cadenas concretas en el `script.js` servido, etc.). Correrlo antes de subir.

## Despliegue (IONOS)

- Cada push a `master` dispara `.github/workflows/deploy-ionos.yml`: `npm ci && npm run build` → `tools/deploy-ionos-sftp.mjs` (script propio con `ssh2-sftp-client`; la action `SamKirkland/FTP-Deploy-Action` NO soporta SFTP real) → sube a la subcarpeta `/YAIZADIAZ` del webspace IONOS (puerto 22; credenciales en GitHub Secrets `FTP_SERVER`/`FTP_USERNAME`/`FTP_PASSWORD`).
- `.htaccess` en la raíz replica lo que hacía `firebase.json` : redirección HTTPS+www, URLs limpias (mod_rewrite), cache headers, 404 personalizada, cabeceras de seguridad.
- El repo GitHub (`mensabo/YAIZA-DIAZ`) es **privado**; el sitio publicado es público.
- Rutas siempre **relativas** (herencia de la época de GitHub Pages en subpath; no hay motivo para revertirlas).

## Seguridad

- **Nunca hardcodear credenciales reales** en archivos trackeados. La contraseña de aplicación de Gmail vive en Firebase Secret Manager (`defineSecret("GMAIL_APP_PASSWORD")` + `secrets: [...]` en las opciones del trigger). Rotar: `firebase functions:secrets:set GMAIL_APP_PASSWORD` + `firebase deploy --only functions`.
- `firestore.rules` y `storage.rules` versionadas en el repo y referenciadas en `firebase.json`. Escritura restringida a `isAdmin()` (email exacto de la cuenta admin), **no** `request.auth != null`. Desplegar reglas **por separado**: `firebase deploy --only firestore:rules` y `firebase deploy --only storage` (juntos falla en el CLI del usuario).
- El JS del admin comprueba `user.email === ADMIN_EMAIL` y hace `signOut()` a cualquier otra cuenta.
- Todo campo de Firestore que sea texto plano se escapa con `escapeHtml()` antes de `innerHTML` (duplicada en los JS — no hay módulos compartidos). El único contenido que admite HTML (texto enriquecido del admin) se sanea con **DOMPurify** (CDN, con fallback a `escapeHtml()`).
- En `functions/index.js`: `stripNewlines()` en cabeceras de email (anti inyección SMTP), `escapeHtml()` en el cuerpo.
- Antes de commitear: revisar que no queden marcadores de conflicto (`<<<<<<<`, `=======`, `>>>>>>>`).

## Contenido dinámico (Firestore) — reglas de oro

- Colecciones: `pages`, `events`, `interviews`, `awards`, `tv_programs`, `gallery`, `modeling_gallery`, `television_gallery`, `radio_gallery`, `habecu_gallery`, `contactMessages`.
- **El admin panel guarda HTML y nombres de archivo de imagen dentro de campos de texto en Firestore** — un grep estático del repo NO detecta esos usos. **Nunca borrar ni renombrar imágenes "sin referencias" sin cotejar contra un export real de Firestore** (`tools/export-firestore-content.mjs`, o REST directo si la sesión tiene red: `curl https://firestore.googleapis.com/v1/projects/yaiza-diaz/databases/(default)/documents/<coleccion>`). Flujo seguro: mover primero a `_sin-usar/` (excluida del deploy), confirmar, borrar después.
- Redimensionar imágenes **manteniendo nombre y extensión** es siempre seguro (la URL no cambia); convertir formato solo si la referencia está en HTML estático y se actualiza en el mismo commit.
- `tools/compress-storage-images.mjs`: comprime imágenes ya subidas a Storage in-place preservando `firebaseStorageDownloadTokens` (las URLs de Firestore siguen valiendo). Por defecto simula; `--apply` escribe con backup en `_originals_backup/`. Requiere `tools/serviceAccountKey.json` (en `.gitignore`, el usuario lo genera y borra).
- Con `firebase-admin` desde `.mjs`: usar la API modular (`import { initializeApp, cert } from "firebase-admin/app"`), el namespace `admin.credential` falla bajo interop CJS/ESM.
- El sitio usa **`firebase-firestore-lite`** (no el SDK completo): solo CRUD, sin `onSnapshot`. Si algún día hace falta tiempo real, volver al SDK completo en esa página.
- Páginas con contenido de Firestore llevan **fallbacks estáticos** (H1, párrafos, primera imagen de galería) con el texto real exportado — no inventado. Excepción: no precargar imágenes de galerías que están muy por debajo del pliegue (empeora el LCP al robar ancho de banda al candidato real).

## Workflow git

- Rama principal `master`. **Desde 2026-07-22, a petición del usuario: sin PR intermedio.** No hay `gh`/token de GitHub disponible en las sesiones para automatizar el clic de "Merge", así que en vez de abrir rama + PR y pedirle que lo fusione a mano, se trabaja en rama `claude/...`, se hace `git checkout master && git merge --squash <rama> && git commit && git push origin master` directamente, y se borra la rama (local y remota). El usuario no quiere tener que fusionar nada manualmente.
- **Primer paso de CADA ronda de cambios**: `git fetch origin master && git checkout -B <rama> origin/master`. Trabajar siempre sobre `origin/master` actualizado evita diffs sucios y pushes rechazados.
- Ante un rechazo non-fast-forward inesperado al pushear a `master`: antes de `--force-with-lease`, confirmar con `git merge-base --is-ancestor <sha-remoto> origin/master` que lo que se va a sobrescribir ya está integrado en master.
- **Nunca force-push a `master`** bajo ninguna circunstancia (regla dura). Si el usuario quiere reescribir un merge commit ("Unverified" cosmético de la API de GitHub), darle los comandos para que lo haga él en local.
- Tras el push a master, el redeploy tarda ~30-60s: comprobar con `curl -sI URL | grep etag` en bucle antes de re-medir en vivo.

## Lecciones de CSS/layout (bugs reales encontrados)

- `<img>` con atributos HTML `width`/`height` + regla CSS que fija `width` ⇒ **fijar también `height: auto`** (o `aspect-ratio` explícito), si no la imagen se estira verticalmente.
- `aspect-ratio` puesto directamente en un `<img>` con atributos width/height **se ignora** — ponerlo en el `<div>` contenedor y rellenar con `object-fit: cover`. Si hay un `<a>` envolviendo, darle `display:block; height:100%`.
- Imagen responsive que no debe pixelarse: `max-width:100%; height:auto` **sin fijar `width`** — con `width:auto; height:auto` ambos, la caja colapsa a 0 antes de cargar (CLS); con `width:100%`, una foto pequeña se estira y pixela.
- Flex apilado en móvil (`flex-direction: column`): **nunca `flex-basis: 0`** en los hijos (colapsan a altura 0); usar `auto` o px/%.
- Contraste: calcular contra el **color de fondo compuesto real** (ojo con fondos `rgba()` translúcidos), no contra la variable CSS nominal.
- Cursor/lupa sobre imágenes: revisar TODOS los sitios donde la imagen aparece (miniatura y visor son nodos distintos) y la especificidad de reglas `cursor` en conflicto (`a.expandable-image` gana a una clase sola).
- Fuentes usadas solo en contenido oculto por defecto (modales, pestañas): el navegador no las descarga hasta pintarlas ⇒ `<link rel="preload" as="font">` explícito, solo en las páginas que las usan.
- LCP: Chrome no cuenta `background-image` CSS, ni elementos con `opacity:0`, ni los que ocupan el 100% exacto del viewport. El candidato de LCP del hero es un `<img>` con `opacity:0.01` y `width/height:99%`.
- No tocar el hero de la home (solo-fotos, rotación infinita cada 5s) ni el timing del banner de cookies — decisiones de diseño confirmadas; el Speed Index malo es un techo asumido.

## Rendimiento

- Auto-alojadas las fuentes de Google (`fonts/`, solo subset latin). Font Awesome no-bloqueante (preload as=style) con solo `fontawesome`+`solid`+`brands` 6.5.2.
- GA4 (`G-GPTS82X18T`) con Consent Mode v2, gtag.js diferido a primera interacción o idle. Banner de cookies propio (sin CookieYes). No cargar GA en el admin.
- Máximo 3-4 `preconnect`.
- `pngquant` para PNG que no admiten conversión a JPEG; compresión agresiva vale para fondos con `blur()` CSS.

## Depuración en sesiones cloud

- **Acceso de red variable por sesión** — comprobar con `curl` antes de asumir. Cuando hay red completa: Lighthouse real con `CHROME_PATH=/opt/pw-browsers/chromium npx lighthouse <URL> --chrome-flags="--headless=new --no-sandbox --disable-gpu --ignore-certificate-errors --ssl-version-max=tls1.2 --disable-features=EncryptedClientHello,PostQuantumKyber,UseDnsHttpsSvcbAlpn"` (sin `--ssl-version-max=tls1.2` el proxy resetea el TLS 1.3 de Chrome).
- Playwright local: Chromium en `/opt/pw-browsers/chromium`; para localhost lanzar con `args: ['--no-proxy-server', '--proxy-bypass-list=*']`. Servidor y script **en la misma llamada Bash** (los procesos en background no sobreviven entre llamadas). Medir con `getBoundingClientRect()`/`getComputedStyle`, no a ojo sobre capturas.
- Ese Chromium **no decodifica H.264** — no sirve para generar posters de vídeo.
- "No veo el cambio" del usuario casi siempre es caché: pedirle que abra la URL directa del `.css`/`.js` y busque una cadena nueva — si está ahí, es caché del navegador en la página contenedora (cerrar pestaña y reabrir), no el deploy.
- "Funciona en unas páginas y en otras no" ⇒ sospechar markup que falta en algunas páginas (los HTML son independientes), no un bug de JS.
- Performance de Lighthouse varía entre pruebas por naturaleza (mide tiempos reales); Accessibility/SEO/Best Practices no.

## Trato con el usuario

- El usuario **no edita en local**: todas las ediciones van por Claude Code. Fusiona PRs casi inmediatamente.
- Proyecto hermano en la misma cuenta: `mensabo/RenacerCanarias`. **Si llega una captura o bug visual sin especificar el sitio, confirmar a cuál pertenece antes de tocar código** — ya ha habido confusiones en ambos sentidos.
- Cambios de diseño no pedidos explícitamente: proponer antes de fusionar; varios "arreglos" estéticos bienintencionados se han tenido que revertir.
