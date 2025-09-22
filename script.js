document.addEventListener('DOMContentLoaded', async () => {
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

    // --- DEFINICIÓN DE LA VARIABLE pageId ---
    const pageId = document.body.id;

    // --- FUNCIÓN DE CARGA DE TEXTOS DINÁMICOS ---
    async function loadDynamicText(pageId) {
        if (!pageId) return;
        try {
            const docRef = doc(db, 'pages', pageId);
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
                console.warn(`No se encontró documento de textos para la página: ${pageId}`);
            }
        } catch (error) {
            console.error("Error al cargar textos dinámicos:", error);
        }
    }
    
    // =======================================================
    // --- EJECUCIÓN ORDENADA DE SCRIPTS ---
    // =======================================================
    
    if (pageId !== 'eventoDetallePage') {
        await loadDynamicText(pageId);
    }
    
    initializeContactModal();
    initializeSidenotes();
    initializeSmoothScroll();

    if (pageId === 'homepage') {
        initializeHeroSlider();
    }
    if (pageId === 'eventosPage') {
        loadAndRenderEventsGridPage();
    }
    if (pageId === 'entrevistasPage') {
        loadAndRenderInterviews();
    }
    if (pageId === 'libroPage') {
        initializeLetterModal();
        initializeAlbertoLeonModal();
    }
    if (pageId === 'modelajePage') {
        initializeStaticGallery('galeria-interactiva-calendario');
    }

    // --- INICIALIZAR GALERÍAS DINÁMICAS ---
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
    
    initializeStandaloneLightbox();
    initializeVideoModals();

    // =======================================================
    // --- DEFINICIONES DE FUNCIONES ---
    // =======================================================

    function initializeContactModal() {
        const modal = document.getElementById('contact-modal');
        // El trigger ahora puede ser cualquier enlace con ese ID
        const openTriggers = document.querySelectorAll('#contact-modal-trigger'); 
        const closeButton = document.getElementById('contact-modal-close');

        if (!modal || openTriggers.length === 0 || !closeButton) {
            return;
        }

        const openModal = (e) => {
            e.preventDefault();
            // Si el menú móvil está abierto, cerrarlo
            if (navLinks && navLinks.classList.contains('nav-open')) {
                navLinks.classList.remove('nav-open');
            }
            modal.classList.add('visible');
        };

        const closeModal = () => modal.classList.remove('visible');

        openTriggers.forEach(trigger => {
            trigger.addEventListener('click', openModal);
        });

        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            // Se cierra si se hace clic en el fondo oscuro
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    function initializeHeroSlider() {
        const heroDynamicSection = document.querySelector('.hero-dynamic');
        const tabs = document.querySelectorAll('.hero-tab');
        const bgContainer = document.querySelector('.hero-background-container');
        const mobileTitle = document.getElementById('mobile-tab-title');
        const mobileBookLink = document.getElementById('mobile-book-link');
        const dotsContainer = document.getElementById('hero-dots-nav');
        
        if (!tabs.length || !bgContainer) return;

        let currentIndex = 0;
        let intervalId = null;
        let touchStartX = 0;
        let touchEndX = 0;

        tabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                if (e.target.closest('a')) { return; }
                if (!tab.classList.contains('active')) {
                    switchTab(index);
                    resetInterval();
                }
            });
        });

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
            const mobileClickAnnotation = document.querySelector('.click-annotation-mobile');
            if (mobileClickAnnotation) {
                mobileClickAnnotation.classList.toggle('visible', activeTab.id === 'escritora-tab');
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

        function prevTab() {
            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            switchTab(prevIndex);
        }

        function resetInterval() {
            clearInterval(intervalId);
            intervalId = setInterval(nextTab, 5000);
        }

        function handleSwipe() {
            const swipeThreshold = 50; 
            if (touchStartX - touchEndX > swipeThreshold) {
                nextTab();
                resetInterval();
            } else if (touchEndX - touchStartX > swipeThreshold) {
                prevTab();
                resetInterval();
            }
        }

        if (heroDynamicSection) {
            heroDynamicSection.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
            heroDynamicSection.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); });
        }
        
        switchTab(0);
        resetInterval();
    }

    async function loadAndRenderEventsGridPage() {
        const grid = document.getElementById('dynamic-events-grid');
        if (!grid) return;
        try {
            const q = query(collection(db, 'events'), orderBy('order'));
            const snapshot = await getDocs(q);
            const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            grid.innerHTML = '';
            if (events.length === 0) {
                grid.innerHTML = '<p>Próximamente se anunciarán nuevos eventos.</p>';
                return;
            }

            events.forEach(event => {
                const firstItem = event.galleryItems && event.galleryItems.length > 0 
                    ? event.galleryItems[0] 
                    : { type: 'image', src: 'images/placeholder.png' }; 

                let mediaElementHtml = '';
                if (firstItem.type === 'video' && firstItem.videoSrc) {
                    mediaElementHtml = `
                        <video autoplay loop muted playsinline poster="${firstItem.thumbnailSrc || ''}">
                            <source src="${firstItem.videoSrc}" type="video/mp4">
                            Tu navegador no soporta vídeos.
                        </video>
                    `;
                } else {
                    mediaElementHtml = `<img src="${firstItem.thumbnailSrc || firstItem.src}" alt="${event.title}">`;
                }
                
                const card = document.createElement('a');
                card.href = `evento-detalle.html?id=${event.id}`;
                card.className = 'event-card-link';
                card.innerHTML = `
                    <div class="event-card-image">
                        ${mediaElementHtml}
                    </div>
                    <div class="event-card-content">
                        <h4>${event.title}</h4>
                    </div>`;
                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error cargando la galería de eventos:", error);
            grid.innerHTML = '<p>Ocurrió un error al cargar los eventos.</p>';
        }
    }
    
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

    function initializeStaticGallery(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
    
        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnails = container.querySelectorAll('.miniatura-item');
    
        if (!mainImage || !mainDesc || !bgImage || thumbnails.length === 0) return;
    
        function setActiveItem(thumbElement) {
            const imgSrc = thumbElement.dataset.imgSrc;
            const description = thumbElement.dataset.description;
    
            if (!imgSrc) return;
    
            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = imgSrc;
                bgImage.style.backgroundImage = `url(${imgSrc})`;
                mainDesc.textContent = description || '';
                mainImage.style.opacity = '1';
            }, 200);
    
            thumbnails.forEach(el => el.classList.remove('active'));
            thumbElement.classList.add('active');
        }
    
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => setActiveItem(thumb));
        });
    
        setActiveItem(thumbnails[0]);
    }
    
    function initializeVideoModals() {
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
    }

    function initializeStandaloneLightbox() {
        const lightboxModal = document.getElementById('lightbox-modal');
        if (!lightboxModal) return;

        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const closeButton = lightboxModal.querySelector('.lightbox-close');
        
        const prevButton = lightboxModal.querySelector('.lightbox-prev');
        const nextButton = lightboxModal.querySelector('.lightbox-next');

        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.expandable-image');
            if (link) {
                e.preventDefault();
                const img = link.querySelector('img');
                const captionElement = link.nextElementSibling;
                
                lightboxImage.src = link.href;
                if (captionElement && captionElement.tagName === 'FIGCAPTION') {
                    lightboxCaption.textContent = captionElement.textContent;
                } else {
                    lightboxCaption.textContent = img.alt || '';
                }

                if(prevButton) prevButton.style.display = 'none';
                if(nextButton) nextButton.style.display = 'none';

                lightboxModal.classList.add('visible');
            }
        });

        const closeModal = () => {
            lightboxModal.classList.remove('visible');
        };

        closeButton.addEventListener('click', closeModal);
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) { closeModal(); }
        });
    }

    function initializeSidenotes() {
        const triggers = document.querySelectorAll('.sidenote-trigger');
        
        triggers.forEach(trigger => {
            const container = trigger.closest('.sidenote-container');
            if (!container) return; 

            const closeBtn = container.querySelector('.sidenote-close-btn');

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                container.classList.add('is-sidenote-visible');
            });

            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    container.classList.remove('is-sidenote-visible');
                });
            }
        });
    }

    function initializeLetterModal() {
        const openLetterButton = document.getElementById('open-letter-modal');
        const letterModal = document.getElementById('letter-modal');
        const closeLetterButton = document.getElementById('letter-modal-close-btn');

        if (openLetterButton && letterModal && closeLetterButton) {
            const closeModal = () => {
                letterModal.classList.remove('visible');
            };

            openLetterButton.addEventListener('click', (e) => {
                e.preventDefault();
                letterModal.classList.add('visible');
            });

            closeLetterButton.addEventListener('click', closeModal);

            letterModal.addEventListener('click', (e) => {
                if (e.target === letterModal) { closeModal(); }
            });
        }
    }

    function initializeAlbertoLeonModal() {
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'alberto-leon-video-trigger') {
                const videoModal = document.getElementById('video-modal');
                if (videoModal) {
                    videoModal.classList.add('visible');
                }
            }
        });

        const videoModal = document.getElementById('video-modal');
        const closeModalButton = document.getElementById('modal-close-btn');

        if (videoModal && closeModalButton) {
            const closeModal = () => {
                videoModal.classList.remove('visible');
            };
            closeModalButton.addEventListener('click', closeModal);
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) {
                    closeModal();
                }
            });
        }
    }

    function initializeSmoothScroll() {
        const header = document.querySelector('header');
        const headerOffset = header ? header.offsetHeight + 20 : 90;

        const performScroll = (targetElement) => {
            if (targetElement) {
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                });
            }
        };

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            // Excluir el trigger del modal de contacto de esta lógica
            if (anchor.id === 'contact-modal-trigger') return;

            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href.length > 1 && document.querySelector(href)) {
                    e.preventDefault();
                    if (navLinks && navLinks.classList.contains('nav-open')) {
                        navLinks.classList.remove('nav-open');
                    }
                    const targetElement = document.querySelector(href);
                    setTimeout(() => performScroll(targetElement), 50);
                }
            });
        });

        window.addEventListener('load', () => {
            if (window.location.hash) {
                const targetElement = document.querySelector(window.location.hash);
                performScroll(targetElement);
            }
        });
    }
});