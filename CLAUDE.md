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

## Flujo de trabajo del usuario

- El usuario trabaja localmente en VS Code, en Windows (terminal por defecto: PowerShell, no bash).
- Repo: `mensabo/YAIZA-DIAZ`, rama principal `master`.
- Hay un script de auto-pull configurado en `.vscode/autopull.ps1` + `.vscode/tasks.json`, que se lanza solo al abrir la carpeta en VS Code (`runOn: folderOpen`) y ejecuta `git pull origin master --ff-only` cada 2 minutos en segundo plano, para mantener la carpeta local sincronizada con lo que se cambie desde sesiones de Claude en la nube.
- Cuidado: un `git push --force` desde local puede sobreescribir cambios hechos en sesiones remotas de Claude (y viceversa) si las ramas han divergido. Antes de forzar, comprobar con `git log origin/master..master --oneline` qué se perdería.

## Despliegue

- Firebase Hosting (`firebase.json`, `.firebaserc` → proyecto `yaiza-diaz`).
- Cloud Functions en carpeta `functions/` (Node 22).
