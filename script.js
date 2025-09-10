document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que los servicios de Firebase estén disponibles
    if (!window.firebaseServices) {
        console.error("Firebase no está inicializado.");
        return;
    }
    const { db, collection, getDocs, orderBy, query, doc, getDoc } = window.firebaseServices;

    // --- MANEJO DEL MENÚ MÓVIL ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('nav-open');
        });
    }

    // --- BOTÓN "VOLVER ARRIBA" ---
    const backToTopButton = document.getElementById('volver-arriba-btn');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            window.scrollY > 300 ? backToTopButton.classList.add('visible') : backToTopButton.classList.remove('visible');
        });
    }

    // --- CARGA DE TEXTOS DINÁMICOS DESDE FIREBASE ---
    const pageId = document.body.id;
    if (pageId) {
        loadDynamicText(pageId);
    }

    async function loadDynamicText(pageName) {
        try {
            const docRef = doc(db, 'pages', pageName);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.querySelectorAll('[data-content-id]').forEach(element => {
                    const contentId = element.dataset.contentId;
                    if (data[contentId] !== undefined) {
                        element.innerHTML = data[contentId];
                    }
                });
            } else {
                console.warn(`No se encontró documento de textos para la página: ${pageName}`);
            }
        } catch (error) {
            console.error("Error al cargar textos dinámicos:", error);
        }
    }

    // =======================================================
    // --- LÓGICA ESPECÍFICA PARA LA PÁGINA DE INICIO ---
    // =======================================================
    if (pageId === 'homepage') {
        initializeHeroSlider();
        loadAndRenderEvents();
    }

    function initializeHeroSlider() {
        const tabs = document.querySelectorAll('.hero-tab');
        const bgContainer = document.querySelector('.hero-background-container');
        const mobileTitle = document.getElementById('mobile-tab-title');
        const mobileBookLink = document.getElementById('mobile-book-link');
        const dotsContainer = document.getElementById('hero-dots-nav');
        
        if (!tabs.length || !bgContainer) return;

        let currentIndex = 0;
        let intervalId = null;

        // Crear puntos para móvil
        tabs.forEach((tab, index) => {
            const dot = document.createElement('div');
            dot.classList.add('hero-dot');
            dot.dataset.index = index;
            dotsContainer.appendChild(dot);
            dot.addEventListener('click', () => {
                switchTab(index);
                resetInterval();
            });
        });
        const dots = document.querySelectorAll('.hero-dot');

        function switchTab(index) {
            currentIndex = index;
            const activeTab = tabs[index];

            // Actualizar fondo
            bgContainer.style.backgroundImage = `url(${activeTab.dataset.bgImage})`;
            bgContainer.style.backgroundPosition = activeTab.dataset.bgPosition || 'center center';

            // Actualizar tabs de escritorio
            tabs.forEach(t => t.classList.remove('active'));
            activeTab.classList.add('active');

            // Actualizar UI móvil
            if (mobileTitle) {
                const titleElement = activeTab.querySelector('h2');
                mobileTitle.textContent = titleElement ? titleElement.textContent : '';
            }
             mobileBookLink.classList.toggle('visible', activeTab.id === 'escritora-tab');
            
            dots.forEach(d => d.classList.remove('active'));
            if (dots[index]) {
                dots[index].classList.add('active');
            }
        }

        function nextTab() {
            const nextIndex = (currentIndex + 1) % tabs.length;
            switchTab(nextIndex);
        }

        function resetInterval() {
            clearInterval(intervalId);
            intervalId = setInterval(nextTab, 5000);
        }
        
        // Carga inicial
        switchTab(0);
        resetInterval();
    }

    async function loadAndRenderEvents() {
        const container = document.getElementById('dynamic-event-tags');
        if (!container) return;

        try {
            const q = query(collection(db, 'events'), orderBy('order'));
            const snapshot = await getDocs(q);
            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            container.innerHTML = ''; // Limpiar "cargando"
            events.forEach(event => {
                const button = document.createElement('button');
                button.className = 'event-tag-button';
                button.textContent = event.mainButtonText;
                button.addEventListener('click', () => openEventModal(event));
                container.appendChild(button);
            });
        } catch (error) {
            container.innerHTML = '<p>No se pudieron cargar los eventos.</p>';
            console.error("Error cargando eventos:", error);
        }
    }

    function openEventModal(eventData) {
        const modalOverlay = document.getElementById('eventos-modal-overlay');
        const modalTitle = document.getElementById('eventos-modal-title');
        const modalText = document.getElementById('eventos-modal-text');
        const galleryThumbnails = document.getElementById('event-gallery-thumbnails');
        const mainImage = document.getElementById('event-gallery-main-image');
        const mainVideoContainer = document.getElementById('event-gallery-main-video-container');
        const mainVideo = document.getElementById('event-gallery-main-video');
        const closeButton = document.getElementById('eventos-modal-close');

        if (!modalOverlay) return;

        modalTitle.textContent = eventData.title || '';
        modalText.textContent = eventData.text || '';
        galleryThumbnails.innerHTML = '';

        const galleryItems = eventData.galleryItems || [];

        if (galleryItems.length > 0) {
            document.getElementById('event-gallery-interactive').style.display = 'flex';
            
            const setActiveMedia = (item) => {
                if (item.type === 'video') {
                    mainImage.style.display = 'none';
                    mainVideoContainer.style.display = 'block';
                    mainVideo.src = item.videoSrc;
                } else {
                    mainVideoContainer.style.display = 'none';
                    mainVideo.src = '';
                    mainImage.style.display = 'block';
                    mainImage.src = item.src;
                }
            };

            galleryItems.forEach(item => {
                const thumb = document.createElement('div');
                thumb.className = 'miniatura-item';
                thumb.innerHTML = `<img src="${item.thumbnailSrc || item.src}" alt="miniatura">`;
                thumb.addEventListener('click', () => setActiveMedia(item));
                galleryThumbnails.appendChild(thumb);
            });
            
            // Mostrar el primer elemento por defecto
            setActiveMedia(galleryItems[0]);

        } else {
            document.getElementById('event-gallery-interactive').style.display = 'none';
        }

        modalOverlay.classList.add('visible');

        const closeModal = () => {
            modalOverlay.classList.remove('visible');
            mainVideo.pause();
            mainVideo.src = '';
        };

        closeButton.onclick = closeModal;
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        };
    }
    
    // =======================================================
    // --- LÓGICA PARA OTRAS PÁGINAS (GALERÍAS, ETC.) ---
    // =======================================================

    async function initializeInteractiveGallery(containerId, collectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnailsContainer = container.querySelector('.galeria-lista-miniaturas');
        
        mainImage.style.opacity = '0';
        mainDesc.textContent = 'Cargando galería...';

        try {
            const q = query(collection(db, collectionName), orderBy('order'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (items.length > 0) {
                thumbnailsContainer.innerHTML = '';
                items.forEach((item) => {
                    const thumbDiv = document.createElement('div');
                    thumbDiv.className = 'miniatura-item';
                    thumbDiv.innerHTML = `<img src="${item.thumbnailSrc || item.src}" alt="${item.descripcion || 'Miniatura'}">`;
                    thumbDiv.addEventListener('click', () => setActiveItem(item, thumbDiv));
                    thumbnailsContainer.appendChild(thumbDiv);
                });
                
                setActiveItem(items[0], thumbnailsContainer.querySelector('.miniatura-item'));
            } else {
                mainDesc.textContent = 'No hay elementos en esta galería.';
            }

            function setActiveItem(item, thumbElement) {
                mainImage.style.opacity = '0';
                setTimeout(() => {
                    mainImage.src = item.src || item.thumbnailSrc;
                    bgImage.style.backgroundImage = `url(${item.src || item.thumbnailSrc})`;
                    mainDesc.textContent = item.descripcion || '';
                    mainImage.style.opacity = '1';
                }, 200);

                container.querySelectorAll('.miniatura-item').forEach(el => el.classList.remove('active'));
                thumbElement.classList.add('active');
            }

        } catch (error) {
            console.error(`Error al cargar la galería ${collectionName}:`, error);
            mainDesc.textContent = 'Error al cargar la galería.';
        }
    }

    // --- INICIALIZAR GALERÍAS EN LAS PÁGINAS CORRESPONDIENTES ---
    if (document.getElementById('galeria-interactiva')) {
        initializeInteractiveGallery('galeria-interactiva', 'gallery');
    }
    if (document.getElementById('galeria-interactiva-modelo')) {
        initializeInteractiveGallery('galeria-interactiva-modelo', 'modeling_gallery');
    }
    if (document.getElementById('galeria-interactiva-television')) {
        initializeInteractiveGallery('galeria-interactiva-television', 'television_gallery');
    }
    if (document.getElementById('galeria-interactiva-radio')) {
        initializeInteractiveGallery('galeria-interactiva-radio', 'radio_gallery');
    }
    if (document.getElementById('galeria-interactiva-habecu')) {
        initializeInteractiveGallery('galeria-interactiva-habecu', 'habecu_gallery');
    }

});