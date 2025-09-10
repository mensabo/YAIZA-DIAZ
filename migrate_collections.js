// ==================================================================
// SCRIPT DE MIGRACIÓN DE COLECCIONES - USAR UNA SOLA VEZ
// ==================================================================
const runCollectionMigration = async () => {
    // 1. Asegurarse de que Firebase está listo
    if (!window.firebaseServices) {
        alert("Error: Los servicios de Firebase no están disponibles. Asegúrate de que config.js está bien.");
        return;
    }
    // ¡¡AQUÍ ESTÁ LA CORRECCIÓN!! -> Se añadió , addDoc
    const { db, collection, addDoc } = window.firebaseServices;

    // 2. Preguntar al usuario qué quiere migrar
    const pageToMigrate = prompt("¿Qué sección deseas migrar?\nEscribe 'entrevistas' o 'premios' y pulsa Aceptar.").toLowerCase();

    if (pageToMigrate !== 'entrevistas' && pageToMigrate !== 'premios') {
        alert("Opción no válida. Recarga la página y escribe 'entrevistas' o 'premios'.");
        return;
    }

    // 3. Confirmación final para evitar accidentes
    const confirmation = confirm(`¡ATENCIÓN!\n\nVas a migrar todo el contenido de la sección "${pageToMigrate}" a la base de datos.\n\nESTA ACCIÓN SOLO DEBE REALIZARSE UNA VEZ.\n\n¿Estás seguro de que quieres continuar?`);

    if (!confirmation) {
        alert("Migración cancelada por el usuario.");
        return;
    }

    try {
        if (pageToMigrate === 'entrevistas') {
            // --- LÓGICA PARA MIGRAR ENTREVISTAS ---
            console.log("Iniciando migración de Entrevistas...");
            const interviewCards = document.querySelectorAll('#entrevistas-main .media-card');
            if (interviewCards.length === 0) {
                throw new Error("No se encontraron tarjetas de entrevista para migrar en el HTML.");
            }

            for (let i = 0; i < interviewCards.length; i++) {
                const card = interviewCards[i];
                const interviewData = {
                    mainTitle: card.querySelector('h4').textContent.trim(),
                    subtitle: card.querySelector('p').textContent.trim(),
                    url: card.href,
                    thumbnailUrl: card.querySelector('img').src,
                    order: i
                };
                
                console.log(`Migrando: ${interviewData.mainTitle}`);
                await addDoc(collection(db, 'interviews'), interviewData);
            }
            alert(`¡ÉXITO! Se han migrado ${interviewCards.length} entrevistas.\n\nAHORA ELIMINA LA ETIQUETA <script src="migrate_collections.js"> de entrevistas.html.`);

        } else if (pageToMigrate === 'premios') {
            // --- LÓGICA PARA MIGRAR PREMIOS ---
            console.log("Iniciando migración de Premios...");
            const awardSections = document.querySelectorAll('#premios-main .comunicacion-section');
            if (awardSections.length === 0) {
                throw new Error("No se encontraron secciones de premios para migrar en el HTML.");
            }

            for (let i = 0; i < awardSections.length; i++) {
                const section = awardSections[i];
                const paragraphs = Array.from(section.querySelectorAll('.sinopsis-text p, p[data-content-id]')).map(p => p.outerHTML).join('');
                
                const galleryItems = [];
                const mainImage = section.querySelector('.sinopsis-img img, img[alt*="Top Artistas"]');
                if (mainImage) {
                    galleryItems.push({ type: 'image', src: mainImage.src, description: mainImage.alt || '' });
                }

                const awardData = {
                    title: section.querySelector('h3').textContent.trim(),
                    text: paragraphs,
                    galleryItems: galleryItems,
                    order: i
                };
                console.log(`Migrando: ${awardData.title}`);
                await addDoc(collection(db, 'awards'), awardData);
            }
            alert(`¡ÉXITO! Se han migrado ${awardSections.length} premios.\n\nAHORA ELIMINA la etiqueta <script src="migrate_collections.js"> de premios.html.`);
        }
    } catch (error) {
        console.error("¡ERROR DURANTE LA MIGRACIÓN!", error);
        alert(`Ocurrió un error: ${error.message}\nRevisa la consola (F12) para ver los detalles.`);
    }
};

// Iniciar el proceso al cargar la página
runCollectionMigration();