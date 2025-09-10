import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";

const runTextMigration = async () => {
    // 1. Preguntar por el ID de la página para que sea reutilizable
    const pageId = prompt("Por favor, introduce un ID único para esta página (ej: homePage, libroPage, comunicacionPage). Este será el nombre del documento en Firestore.");

    if (!pageId) {
        console.log("Migración cancelada: no se introdujo un ID de página.");
        return;
    }

    // 2. Confirmación final
    if (!confirm(`¿Deseas migrar los textos de esta página a Firestore con el ID '${pageId}'? Esta acción solo debe realizarse UNA VEZ por página.`)) {
        console.log("Migración cancelada por el usuario.");
        return;
    }

    console.log(`Iniciando migración para la página: ${pageId}...`);

    // 3. Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    // 4. Recolectar datos de la página actual
    const contentData = {};
    const elementsToMigrate = document.querySelectorAll('[data-content-id]');
    
    elementsToMigrate.forEach(element => {
        const id = element.dataset.contentId;
        const text = element.innerHTML.trim();
        if (id && text) {
            contentData[id] = text;
        }
    });

    if (Object.keys(contentData).length === 0) {
        alert("Error: No se encontraron elementos con el atributo 'data-content-id' en esta página.");
        return;
    }

    console.log("Datos a migrar:", contentData);

    // 5. Subir los datos a Firestore
    try {
        const docRef = doc(db, 'pages', pageId);
        await setDoc(docRef, contentData);
        
        alert(`¡Migración para '${pageId}' completada con éxito! Revisa Firestore. IMPORTANTE: Ahora elimina la línea del script 'migration.js' de este archivo HTML.`);
        console.log("Migración completada.");

    } catch (error) {
        console.error("¡ERROR DURANTE LA MIGRACIÓN!", error);
        alert("Ocurrió un error durante la migración. Revisa la consola para más detalles.");
    }
};

window.addEventListener('load', runTextMigration);