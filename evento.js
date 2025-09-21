document.addEventListener('DOMContentLoaded', async () => {
    if (!window.firebaseServices) {
        console.error("Firebase no está inicializado.");
        return;
    }
    const { db, doc, getDoc } = window.firebaseServices;

    const eventTitleEl = document.getElementById('event-title');
    const eventTextEl = document.getElementById('event-text');
    const eventGalleryEl = document.getElementById('event-gallery');

    // 1. Obtener el ID del evento desde la URL
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
        eventTitleEl.textContent = "Evento no encontrado";
        eventTextEl.innerHTML = "<p>No se ha especificado un evento para mostrar. Por favor, vuelve a la página de inicio y selecciona uno.</p>";
        return;
    }

    // 2. Buscar los datos de ese evento en Firebase
    try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const eventData = docSnap.data();
            renderEventDetails(eventData);
        } else {
            eventTitleEl.textContent = "Evento no encontrado";
            eventTextEl.innerHTML = "<p>El evento que buscas no existe o ha sido eliminado.</p>";
        }
    } catch (error) {
        console.error("Error al cargar el evento:", error);
        eventTitleEl.textContent = "Error al cargar";
        eventTextEl.innerHTML = "<p>Ocurrió un error al intentar cargar los detalles del evento.</p>";
    }

    // 3. Rellenar la página con los datos (LÓGICA SIMPLIFICADA)
    function renderEventDetails(data) {
        document.title = `${data.title} - Yaiza Díaz`;
        eventTitleEl.textContent = data.title;
        eventTextEl.innerHTML = `<p>${data.text.replace(/\n/g, '</p><p>')}</p>`;

        eventGalleryEl.innerHTML = '';
        if (data.galleryItems && data.galleryItems.length > 0) {
            const galleryItems = data.galleryItems;

            // --- ¡CAMBIO CLAVE AQUÍ! Se usa siempre la cuadrícula simple ---
            eventGalleryEl.className = 'simple-photo-grid';

            galleryItems.forEach(item => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'simple-photo-item';

                if (item.type === 'video') {
                    galleryItem.innerHTML = `
                        <img src="${item.thumbnailSrc}" alt="${item.description || 'Miniatura de vídeo'}">
                        <div class="gallery-item-overlay" style="opacity: 1; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);">
                            <p>${item.description || 'Ver vídeo'}</p>
                            <i class="fas fa-play" style="font-size: 2rem; margin-top: 1rem;"></i>
                        </div>
                    `;
                    galleryItem.style.cursor = 'pointer';
                    galleryItem.addEventListener('click', () => openVideoModal(item.videoSrc));
                } else {
                    galleryItem.innerHTML = `
                        <a href="${item.src}" class="expandable-image">
                            <img src="${item.src}" alt="${item.description || 'Imagen del evento'}">
                        </a>
                        <div class="gallery-item-overlay">
                            <p>${item.description || ''}</p>
                        </div>
                    `;
                }
                eventGalleryEl.appendChild(galleryItem);
            });
        }
    }
    
    function openVideoModal(videoSrc) {
        const videoModal = document.getElementById('video-modal');
        const videoPlayer = document.getElementById('modal-video-player');
        if (videoModal && videoPlayer) {
            videoPlayer.src = videoSrc;
            videoModal.classList.add('visible');
        }
    }
});