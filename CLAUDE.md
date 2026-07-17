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

- El usuario trabaja localmente en VS Code, en Windows (terminal por defecto: PowerShell, no bash).
- Repo: `mensabo/YAIZA-DIAZ`, rama principal `master`.
- Hay un script de auto-pull configurado en `.vscode/autopull.ps1` + `.vscode/tasks.json`, que se lanza solo al abrir la carpeta en VS Code (`runOn: folderOpen`) y ejecuta `git pull origin master --ff-only` cada 2 minutos en segundo plano, para mantener la carpeta local sincronizada con lo que se cambie desde sesiones de Claude en la nube.
- Cuidado: un `git push --force` desde local puede sobreescribir cambios hechos en sesiones remotas de Claude (y viceversa) si las ramas han divergido. Antes de forzar, comprobar con `git log origin/master..master --oneline` qué se perdería. Ya pasó una vez (17/07/2026): un force-push local reintrodujo `config.js` al tracking y borró `.vscode/`; se resolvió trayendo el contenido bueno y reaplicando los fixes encima.
- Las sesiones de Claude en la nube no tienen acceso de red a `www.yaizadiaz.com` ni a otros dominios externos (solo a un allowlist técnico tipo npm/GitHub), así que no se puede probar el sitio en vivo desde aquí con Playwright — hay que pedirle al usuario que pruebe manualmente o revisar logs de Firebase.

## Despliegue

- Firebase Hosting (`firebase.json`, `.firebaserc` → proyecto `yaiza-diaz`).
- Cloud Functions en carpeta `functions/` (Node 22).
