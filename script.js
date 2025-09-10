document.addEventListener('DOMContentLoaded', () => {
    // Asegurarse de que los servicios de Firebase estén disponibles
    if (!window.firebaseServices) {
        console.error("Firebase no está inicializado. Revisa la etiqueta <script> en tu HTML.");
        return;
    }
    const { db, collection, getDocs, orderBy, query, doc, getDoc } = window.firebaseServices;

    // =======================================================
    // --- LÓGICA DEL MENÚ DE NAVEGACIÓN (MÓVIL) ---
    // =======================================================
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            navLinks.classList.toggle('nav-open');
        });
        document.addEventListener('click', (event) => {
            const isMenuOpen = navLinks.classList.contains('nav-open');
            const clickedInsideMenu = navLinks.contains(event.target);
            const clickedOnToggleButton = mobileMenuToggle.contains(event.target);

            if (isMenuOpen && !clickedInsideMenu && !clickedOnToggleButton) {
                navLinks.classList.remove('nav-open');
            }
        });
    }

    // --- BOTÓN "VOLVER ARRIBA" ---
    const backToTopButton = document.getElementById('volver-arriba-btn');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });
    }

    // --- LÓGICA INTELIGENTE DEL MODAL DEL CV ---
    const openCvModalBtn = document.getElementById('open-cv-modal');
    const cvModal = document.getElementById('cv-modal');
    if (openCvModalBtn && cvModal) {
        const cvIframe = document.getElementById('cv-iframe');
        const cvModalCloseBtn = cvModal.querySelector('.modal-close');
        const pdfPath = "CV-Yaiza-Diaz.pdf"; 

        openCvModalBtn.addEventListener('click', (e) => {
            // Si la pantalla es ancha (escritorio), abre el modal.
            if (window.innerWidth > 768) {
                e.preventDefault(); // Evita que el enlace se abra en una nueva pestaña
                
                cvModal.classList.add('visible');
                setTimeout(() => {
                    if (cvIframe) cvIframe.src = pdfPath;
                }, 50);
            }
            // Si la pantalla es estrecha (móvil), no hace nada y deja que el enlace se abra en una nueva pestaña (gracias a target="_blank").
        });

        const closeCvModal = () => {
            cvModal.classList.remove('visible');
            if (cvIframe) cvIframe.src = '';
        };

        cvModalCloseBtn.addEventListener('click', closeCvModal);
        cvModal.addEventListener('click', (e) => {
            if (e.target === cvModal) {
                closeCvModal();
            }
        });
    }

    // --- CARGA DE TEXTOS DINÁMICOS ---
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

    // --- LÓGICA ESPECÍFICA POR PÁGINA ---
    if (pageId === 'homepage') {
        initializeHeroSlider();
        loadAndRenderEvents();
    }
    if (pageId === 'entrevistasPage') {
        loadAndRenderInterviews();
    }

    // --- INICIALIZAR GALERÍAS ---
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

    // --- HERO SLIDER (PÁGINA DE INICIO) ---
    function initializeHeroSlider() {
        const tabs = document.querySelectorAll('.hero-tab');
        const bgContainer = document.querySelector('.hero-background-container');
        const mobileTitle = document.getElementById('mobile-tab-title');
        const mobileBookLink = document.getElementById('mobile-book-link');
        const dotsContainer = document.getElementById('hero-dots-nav');
        
        if (!tabs.length || !bgContainer) return;

        let currentIndex = 0;
        let intervalId = null;

        if (dotsContainer) {
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
        }
        const dots = document.querySelectorAll('.hero-dot');

        function switchTab(index) {
            currentIndex = index;
            const activeTab = tabs[index];

            bgContainer.style.backgroundImage = `url(${activeTab.dataset.bgImage})`;
            bgContainer.style.backgroundPosition = activeTab.dataset.bgPosition || 'center center';

            tabs.forEach(t => t.classList.remove('active'));
            activeTab.classList.add('active');

            if (mobileTitle) {
                const titleElement = activeTab.querySelector('h2[data-content-id]');
                mobileTitle.innerHTML = titleElement ? titleElement.innerHTML : '';
            }
            if (mobileBookLink) {
                 mobileBookLink.classList.toggle('visible', activeTab.id === 'escritora-tab');
            }
            
            if (dots.length > 0) {
                dots.forEach(d => d.classList.remove('active'));
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
        
        switchTab(0);
        resetInterval();
    }

    // --- CARGA DE EVENTOS (PÁGINA DE INICIO) ---
    async function loadAndRenderEvents() {
        const container = document.getElementById('dynamic-event-tags');
        if (!container) return;
        
        try {
            const q = query(collection(db, 'events'), orderBy('order'));
            const snapshot = await getDocs(q);
            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            container.innerHTML = '';
            events.forEach(event => {
                const button = document.createElement('button');
                button.className = 'event-tag-button';
                button.textContent = event.mainButtonText;
                button.addEventListener('click', () => openEventModal(event));
                container.appendChild(button);
            });
        } catch (error) {
            console.error("Error cargando eventos:", error);
            container.innerHTML = '<p>No se pudieron cargar los eventos.</p>';
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

        if (!modalOverlay || !modalTitle || !modalText) return;

        modalTitle.textContent = eventData.title || '';
        modalText.textContent = eventData.text || '';
        if (galleryThumbnails) galleryThumbnails.innerHTML = '';

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
    
    // --- CARGA DE ENTREVISTAS (PÁGINA DE ENTREVISTAS) ---
    async function loadAndRenderInterviews() {
        const grid = document.getElementById('dynamic-interviews-grid');
        if (!grid) return;
        try {
            const q = query(collection(db, 'interviews'), orderBy('order'));
            const snapshot = await getDocs(q);
            const interviews = snapshot.docs.map(doc => doc.data());
            
            grid.innerHTML = ''; 
            if (interviews.length === 0) {
                grid.innerHTML = '<p>No hay entrevistas disponibles.</p>';
                return;
            }

            interviews.forEach(interview => {
                const isVideo = interview.url.includes('youtube.com') || interview.url.includes('youtu.be');
                const card = document.createElement('a');
                card.href = interview.url;
                card.className = 'media-card';
                card.target = '_blank';
                card.rel = 'noopener noreferrer';
                card.innerHTML = `
                    <div class="image-container">
                        <img src="${interview.thumbnailUrl}" alt="${interview.mainTitle}" style="width: 100%; height: 200px; object-fit: cover;">
                        ${isVideo ? '<div class="video-overlay-icon"><i class="fas fa-play"></i></div>' : ''}
                    </div>
                    <div class="media-card-text">
                        <h4>${interview.mainTitle}</h4>
                        <p>${interview.subtitle}</p>
                    </div>`;
                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error cargando entrevistas:", error);
            grid.innerHTML = '<p>Error al cargar las entrevistas.</p>';
        }
    }

    // --- GALERÍA INTERACTIVA (REUTILIZABLE) ---
    async function initializeInteractiveGallery(containerId, collectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnailsContainer = container.querySelector('.galeria-lista-miniaturas');
        
        if (!mainImage || !mainDesc || !bgImage || !thumbnailsContainer) return;
        
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
    
    // --- LÓGICA PARA ABRIR MODALES DE VIDEO/IFRAME ---
    const iframeModal = document.getElementById('iframe-modal');
    if (iframeModal) {
        const iframePlayer = document.getElementById('modal-iframe-player');
        const closeModalButtons = iframeModal.querySelectorAll('.modal-close');
        document.querySelectorAll('.js-video-modal-trigger').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                const videoSrc = trigger.dataset.videoSrc;
                if (videoSrc && iframePlayer) {
                    iframePlayer.src = videoSrc;
                    iframeModal.classList.add('visible');
                }
            });
        });
        const closeModal = () => {
            if (iframePlayer) iframePlayer.src = '';
            iframeModal.classList.remove('visible');
        };
        closeModalButtons.forEach(button => button.addEventListener('click', closeModal));
        iframeModal.addEventListener('click', (e) => {
             if (e.target === iframeModal) closeModal();
        });
    }
});