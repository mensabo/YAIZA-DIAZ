/* firebase-init.js — inicialización diferida de Firebase (App Check + Firestore + Storage).
   Compartido por las 18 páginas públicas (antes cada una duplicaba este bloque
   inline, ligeramente distinto según si necesitaba Storage o no).

   Diferido a requestIdleCallback (con margen de 2s como red de seguridad en
   navegadores sin soporte, ej. Safari) para no competir con el pintado
   inicial: reCAPTCHA v3 (usado por App Check) consume ~2.4s de hilo principal
   por contexto (página + iframe interno), justo la ventana en la que antes se
   decidía el LCP -- auditoría real 04/08/2026, Lighthouse Performance cayó de
   77 a 47-60. Las páginas con contenido de Firestore ya llevan sus propios
   fallbacks estáticos (ver CLAUDE.md) mientras esto termina, así que el
   retraso (bien por debajo de 1s en la práctica) no deja ningún hueco vacío.

   Expone window.firebaseServicesReady (promesa) en vez de solo
   window.firebaseServices (objeto) para que script.js pueda ESPERAR a que
   esté listo en vez de comprobarlo una sola vez de forma síncrona -- con la
   inicialización diferida, esa comprobación síncrona antigua habría fallado
   siempre. window.firebaseServices se sigue dejando puesto igualmente en
   cuanto está listo, por si algún script suelto lo comprueba directamente
   (ej. el guard del formulario de contacto).

   NOTA sobre caché: .htaccess cachea todo .js un año como "immutable" -- si
   se edita este archivo, subir el ?v= en las 18 páginas a mano (el build
   (tools/build-assets.mjs) solo bumpea style.css?v=/script.js?v=, no toca
   este). */
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";

var app = initializeApp(firebaseConfig);

function iniciarServiciosPesados() {
    return Promise.all([
        import("https://www.gstatic.com/firebasejs/9.6.7/firebase-app-check.js"),
        import("https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore-lite.js"),
        import("https://www.gstatic.com/firebasejs/9.6.7/firebase-storage.js"),
    ]).then(function (mods) {
        var appCheckMod = mods[0], firestoreMod = mods[1], storageMod = mods[2];
        // App Check: initializeAppCheck() debe ir ANTES de getFirestore(app)/getStorage(app) --
        // Firestore Lite captura el proveedor de App Check en ese momento, no despues (misma
        // leccion que costo horas en FORMULA). getToken() se espera explicitamente antes de la
        // primera lectura real (en script.js) para evitar el bug conocido de reCAPTCHA
        // "placeholder must be empty" si se dispara una consulta antes de que el widget
        // termine de montarse.
        var appCheck = appCheckMod.initializeAppCheck(app, {
            provider: new appCheckMod.ReCaptchaV3Provider('6LfOsmMtAAAAAIxFDSsA5odYb5rctz1vG6KUhgUy'),
            isTokenAutoRefreshEnabled: true
        });
        var appCheckListo = appCheckMod.getToken(appCheck).catch(function () {});
        var db = firestoreMod.getFirestore(app);
        var storage = storageMod.getStorage(app);
        window.firebaseServices = {
            appCheckListo: appCheckListo,
            db: db,
            storage: storage,
            collection: firestoreMod.collection,
            getDocs: firestoreMod.getDocs,
            orderBy: firestoreMod.orderBy,
            query: firestoreMod.query,
            doc: firestoreMod.doc,
            getDoc: firestoreMod.getDoc,
            setDoc: firestoreMod.setDoc,
            addDoc: firestoreMod.addDoc,
            serverTimestamp: firestoreMod.serverTimestamp,
            ref: storageMod.ref,
            uploadBytes: storageMod.uploadBytes,
            getDownloadURL: storageMod.getDownloadURL,
        };
        return window.firebaseServices;
    });
}

window.firebaseServicesReady = new Promise(function (resolve) {
    function arrancar() { iniciarServiciosPesados().then(resolve); }
    if ('requestIdleCallback' in window) {
        requestIdleCallback(arrancar, { timeout: 2000 });
    } else {
        setTimeout(arrancar, 200);
    }
});
