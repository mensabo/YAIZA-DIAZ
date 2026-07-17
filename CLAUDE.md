# YAIZA-DIAZ

Sitio web personal/portfolio de Yaiza Díaz (periodista/modelo/presentadora). Sitio estático (HTML/CSS/JS vanilla) con backend en Firebase.

## Palabra clave: "Jarvis"

Cuando el usuario escriba **"Jarvis"** en un chat nuevo, significa que hay que actualizar este archivo `CLAUDE.md` con lo aprendido o cambiado en esa sesión (nuevas convenciones, decisiones, problemas resueltos, estructura nueva, etc.). Mantenlo conciso y en español.

## Stack

- Frontend: HTML/CSS/JS estático, sin framework ni build step. Cada página es un `.html` independiente (`index.html`, `contacto.html`, `eventos.html`, `admin.html`, etc.) con `script.js`/`style.css` compartidos.
- Backend: Firebase (Firestore, Auth, Hosting, Cloud Functions en `functions/`).
- `admin.html`/`admin.js`: panel de administración protegido con Firebase Auth.
- `config.js`: contiene el `firebaseConfig` (apiKey, etc.) que `index.html` necesita en tiempo de ejecución para inicializar Firebase. **Debe estar trackeado en git** — no es un secreto (las claves web de Firebase son públicas por diseño), y si se excluye del repo el sitio se rompe en producción (`firebaseConfig is not defined`).
- `functions/index.js`: Cloud Function `sendContactEmail`, envía email vía Gmail/nodemailer cuando se crea un documento en `contactMessages`.

## Seguridad — cosas a vigilar

- **Nunca hardcodear credenciales reales** (contraseñas de aplicación, API keys de servicios de terceros) en `functions/index.js` ni en ningún archivo trackeado. Usar Firebase Secret Manager (`firebase functions:secrets:set`) y leerlas con `defineSecret`.
- `config.js` (Firebase client config) es la excepción: es pública por diseño, sí debe subirse.
- Antes de commitear, revisar que no queden marcadores de conflicto de merge (`<<<<<<<`, `=======`, `>>>>>>>`) en ningún archivo, especialmente `cors.json`.
- La contraseña de aplicación de Gmail (`GMAIL_APP_PASSWORD`) usada en `sendContactEmail` está en Firebase Secret Manager, no en el código. `functions/index.js` la lee con `defineSecret("GMAIL_APP_PASSWORD")` y `.value()` dentro del handler; hay que pasar `secrets: [GMAIL_APP_PASSWORD]` en las opciones de `onDocumentCreated`. Para rotarla: `firebase functions:secrets:set GMAIL_APP_PASSWORD` y luego `firebase deploy --only functions`.

## Verificación del flujo de contacto

- Formulario en `contacto.html` (`#contact-form`) → crea documento en Firestore (`contactMessages`) → dispara `sendContactEmail` → email a `yaizadiaztv@gmail.com`. Verificado end-to-end (17/07/2026): funciona correctamente tras mover la contraseña a Secret Manager.
- Para depurar la Cloud Function: `firebase functions:log --only sendContactEmail`.

## Flujo de trabajo del usuario

- El usuario trabaja localmente en VS Code, en Windows. **Terminal real: cmd.exe (símbolo del sistema), no PowerShell** — comandos tipo `Get-Item`/`Get-ChildItem` fallan con "no se reconoce como un comando interno o externo"; usar equivalentes de cmd (`dir`, etc.) al darle instrucciones de terminal.
- Repo: `mensabo/YAIZA-DIAZ`, rama principal `master`.
- Hay un script de auto-pull configurado en `.vscode/autopull.ps1` + `.vscode/tasks.json`, que se lanza solo al abrir la carpeta en VS Code (`runOn: folderOpen`) y ejecuta `git pull origin master --ff-only` cada 2 minutos en segundo plano, para mantener la carpeta local sincronizada con lo que se cambie desde sesiones de Claude en la nube.
- Cuidado: un `git push --force` desde local puede sobreescribir cambios hechos en sesiones remotas de Claude (y viceversa) si las ramas han divergido. Antes de forzar, comprobar con `git log origin/master..master --oneline` qué se perdería. Ya pasó una vez (17/07/2026): un force-push local reintrodujo `config.js` al tracking y borró `.vscode/`; se resolvió trayendo el contenido bueno y reaplicando los fixes encima.
- Las sesiones de Claude en la nube no tienen acceso de red a `www.yaizadiaz.com` ni a otros dominios externos (solo a un allowlist técnico tipo npm/GitHub), así que no se puede probar el sitio en vivo desde aquí con Playwright — hay que pedirle al usuario que pruebe manualmente o revisar logs de Firebase.

## Despliegue

- Firebase Hosting (`firebase.json`, `.firebaserc` → proyecto `yaiza-diaz`). El sitio aún no está publicado en `yaizadiaz.com`; mientras tanto el usuario lo revisa vía **GitHub Pages** en `mensabo.github.io/YAIZA-DIAZ/`, sirviendo desde `master` (por eso las URLs no tienen dominio propio y las rutas deben funcionar igual en un subpath que en la raíz — ver más abajo).
- Cloud Functions en carpeta `functions/` (Node 22).
- **`firebase.json` no traía bloque `hosting`** hasta la auditoría de 2026-07-17 (solo `functions`). Se añadió `hosting.public: "."`, `cleanUrls: true` y `headers` con cache-control (imágenes/audio/vídeo 7 días, css/js 1 año ya que usan `?v=` para cache-busting, HTML sin cache).

## Auditoría de rendimiento y SEO (2026-07-17)

Se hizo una auditoría completa a petición del usuario; quedó todo en `tests/audit.test.js` (`node tests/audit.test.js`, sin dependencias) para evitar regresiones. Puntos importantes para futuras sesiones:

- **Rutas absolutas rompen en GitHub Pages**: `href="/site.webmanifest"` y `href="/favicon.ico"` (con `/` inicial) solo funcionan si el sitio vive en la raíz del dominio. Como la preview está en `mensabo.github.io/YAIZA-DIAZ/` (subpath), esas rutas absolutas devolvían 404. **Usar siempre rutas relativas** (`site.webmanifest`, `images/favicon.ico`) para que funcione tanto en la preview como en producción (dominio raíz).
- `images/favicon.ico` existe pero vivía sin referenciar correctamente (el HTML apuntaba a `/favicon.ico` en la raíz, que no existe; el archivo real está en `images/favicon.ico`).
- Imágenes: se recomprimieron in-place con `sharp` (mismo nombre/formato, sin tocar el HTML) las que sí se usan, ~10.4MB→~4MB, redimensionando a máx. 1920px de lado. Hay muchas imágenes en `images/` y `recursos/` que no se referencian desde ningún `.html/.js/.css` — no se borraron (podrían ser para uso futuro vía admin panel), pero si el repo pesa mucho, ahí hay margen.
- SEO: se añadió `robots.txt`, `sitemap.xml`, `rel="canonical"` autoreferenciado en las 17 páginas públicas (usando URLs limpias sin `.html`, acorde a `cleanUrls: true`), `meta robots noindex,nofollow` en `admin.html`, y JSON-LD `Person` en `index.html`.
- **El hero de `index.html` se cargaba 100% por JS** (esperar SDK Firebase desde gstatic → consultar Firestore `pages/homepage` → elegir imagen de Firebase Storage), sin ningún fondo por defecto → se veía en blanco unos segundos en carga. Fix: `.hero-background-container` tiene ahora un `background-image` CSS estático de respaldo + `background-color`, con `rel=preload fetchpriority=high` en `index.html` (es el elemento LCP). Además, en `script.js`, `switchTab()` usa `HERO_FALLBACK_IMAGES` (un fondo local temático por cada pestaña: Presentadora/TV, Eventos, Escritora) en vez de un placeholder genérico cuando Firestore aún no ha respondido — importante: esto se implementó en JS y no en CSS, porque `switchTab()` siempre fija `backgroundImage` como estilo inline, que tiene más especificidad que cualquier regla CSS.
- El PR de esta auditoría (#3) se fusionó por squash; para el follow-up (#4, fix del hero) hubo que reencauzar la rama de trabajo (`git reset --hard origin/master` + reaplicar cambios) porque el squash-merge deja el historial de la rama vieja divergente del nuevo commit en `master`.

## Auditoría de seguridad y accesibilidad (2026-07-18)

PR #6 (rama `claude/page-deep-audit-q4jg7r`). Hallazgo crítico: las reglas de Firestore/Storage en la consola de Firebase usaban `allow write: if request.auth != null` — es decir, **cualquier usuario autenticado** (no solo la admin) podía escribir/borrar todo el contenido del sitio y leer los mensajes de contacto. `admin.js` tenía el mismo problema: el panel se concedía a cualquier cuenta autenticada, no solo a la de Yaiza.

- **`firestore.rules` y `storage.rules` ahora viven versionadas en el repo** (antes no existían como archivos, solo se gestionaban a mano en la consola) y están referenciadas en `firebase.json` (`"firestore": {"rules": "firestore.rules"}`, `"storage": {"rules": "storage.rules"}`). Reflejan las colecciones reales del proyecto (`pages`, `events`, `interviews`, `awards`, `tv_programs`, `gallery`, `modeling_gallery`, `television_gallery`, `radio_gallery`, `habecu_gallery`, `contactMessages`), pero restringen escritura a una función `isAdmin()` que comprueba `request.auth.token.email == 'mensabo78@gmail.com'` (el email real de la cuenta admin), en vez de `request.auth != null`. Los adjuntos del formulario (`contact-attachments/`) permiten `create` público (con límite de 10MB) pero no lectura pública.
- Para desplegar cambios en las reglas: `firebase deploy --only firestore:rules` y `firebase deploy --only storage` **por separado** — desplegar ambos juntos (`--only firestore:rules,storage:rules`) dio el error "Could not find rules for the following storage targets: rules" en el CLI del usuario aunque los archivos existían y estaban bien referenciados en `firebase.json`; por separado funcionó sin problema.
- `admin.js`: `onAuthStateChanged` ahora comprueba `user.email === ADMIN_EMAIL` (`mensabo78@gmail.com`) y hace `signOut()` automático si alguien más se autentica.
- `functions/index.js`: los campos del formulario de contacto (`name`, `email`, `subject`, `message`, `attachmentName`) se escapan con una función `escapeHtml()` antes de interpolarlos en el HTML del email, para evitar inyección HTML.
- Se añadió skip-link (`.skip-link` en `style.css`, target `id="main-content"` en el primer elemento tras `</header>`) en las 17 páginas públicas para accesibilidad por teclado.
- Se unificó `og:url` con la URL canónica (sin `.html`) en todas las páginas.
- Pendiente de revisar por el usuario en la consola de Firebase Auth: que el alta pública de cuentas (email/password sign-up) no esté abierta, aunque ya no sirva para escribir contenido gracias a las reglas nuevas.
