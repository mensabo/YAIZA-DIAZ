document.addEventListener('DOMContentLoaded', async () => {
    // Asegurarse de que los servicios de Firebase estén disponibles
    if (!window.firebaseServices) {
        console.error("Firebase no está inicializado. Revisa la etiqueta <script> en tu HTML.");
        return;
    }
    const { db, doc, getDoc } = window.firebaseServices;

    // Elementos del DOM donde se mostrará el contenido
    const eventTitleEl = document.getElementById('event-title');
    const eventTextEl = document.getElementById('event-text');
    const eventGalleryEl = document.getElementById('event-gallery');
    
    // Obtener el ID del evento desde la URL (ej: evento-detalle.html?id=DOCUMENTO_ID)
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');

    if (!eventId) {
        eventTitleEl.textContent = 'Evento no encontrado';
        eventTextEl.textContent = 'No se ha especificado un ID de evento en la URL.';
        return;
    }

    try {
        // Cargar los datos del documento del evento desde Firestore
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const eventData = docSnap.data();

            // 1. Rellenar el título y el texto del evento
            document.title = `${eventData.title} - Yaiza Díaz`; // Actualiza el título de la pestaña del navegador
            eventTitleEl.textContent = eventData.title;
            eventTextEl.innerHTML = eventData.text; // Usamos innerHTML para permitir párrafos guardados desde el admin

            // 2. Renderizar la galería de imágenes y vídeos
            eventGalleryEl.innerHTML = '';
            if (eventData.galleryItems && eventData.galleryItems.length > 0) {
                eventData.galleryItems.forEach(item => {
                    const galleryItem = document.createElement('a');
                    galleryItem.className = 'gallery-grid-item';

                    if (item.type === 'video') {
                        // Es un vídeo
                        galleryItem.href = '#';
                        galleryItem.classList.add('js-video-modal-trigger');
                        galleryItem.dataset.videoSrc = item.videoSrc;
                        galleryItem.innerHTML = `
                            <img src="${item.thumbnailSrc}" alt="${item.description || eventData.title}" loading="lazy">
                            <div class="video-overlay-icon"><i class="fas fa-play"></i></div>
                        `;
                    } else {
                        // Es una imagen
                        galleryItem.href = item.src;
                        galleryItem.classList.add('expandable-image');
                        galleryItem.innerHTML = `<img src="${item.src}" alt="${item.description || eventData.title}" loading="lazy">`;
                    }
                    
                    // Aplicar el object-position si está definido
                    if (item.position && galleryItem.querySelector('img')) {
                         galleryItem.querySelector('img').style.objectPosition = `center ${item.position}`;
                    }

                    eventGalleryEl.appendChild(galleryItem);
                });
            } else {
                eventGalleryEl.innerHTML = '<p>Este evento no tiene una galería de imágenes o vídeos.</p>';
            }

        } else {
            eventTitleEl.textContent = 'Evento no encontrado';
            eventTextEl.textContent = 'El ID del evento especificado no existe en la base de datos.';
        }
    } catch (error) {
        console.error("Error al cargar los detalles del evento:", error);
        eventTitleEl.textContent = 'Error al cargar';
        eventTextEl.textContent = 'Ocurrió un error al intentar obtener los datos del evento. Revisa la consola para más detalles.';
    }

    // Inicializar los modales de vídeo después de que la galería se haya renderizado
    initializeVideoModalsForDetailsPage();
});

// Función específica para los modales en esta página
function initializeVideoModalsForDetailsPage() {
    const videoModal = document.getElementById('video-modal');
    if (!videoModal) return;
    
    const videoPlayer = document.getElementById('modal-video-player');
    const closeModalButtons = videoModal.querySelectorAll('.modal-close');

    const openModal = (videoSrc) => {
        if (videoPlayer) {
            videoPlayer.src = videoSrc;
            videoModal.classList.add('visible');
        }
    };

    const closeModal = () => {
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = '';
        }
        videoModal.classList.remove('visible');
    };

    document.getElementById('event-gallery').addEventListener('click', (e) => {
        const trigger = e.target.closest('.js-video-modal-trigger');
        if (trigger) {
            e.preventDefault();
            const videoSrc = trigger.dataset.videoSrc;
            if (videoSrc) {
                openModal(videoSrc);
            }
        }
    });

    closeModalButtons.forEach(button => button.addEventListener('click', closeModal));
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) closeModal();
    });
}