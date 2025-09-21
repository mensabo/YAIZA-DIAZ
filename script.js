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

    // --- FUNCIÓN PARA INICIALIZAR POP-UPS DE LOGOS ---
    function initializeLogoPopups() {
        const linksWithPopups = document.querySelectorAll('.link-with-logo-popup');
        linksWithPopups.forEach(linkContainer => {
            const popup = linkContainer.querySelector('.logo-popup');
            if (popup) {
                linkContainer.addEventListener('mouseenter', () => {
                    popup.classList.add('visible');
                });
                linkContainer.addEventListener('mouseleave', () => {
                    popup.classList.remove('visible');
                });
            }
        });
    }

    // =======================================================
    // --- EJECUCIÓN ORDENADA DE SCRIPTS ---
    // =======================================================
    await loadDynamicText(pageId); 
    initializeLogoPopups();      
    initializeSidenotes();

    if (pageId === 'homepage') {
        initializeHeroSlider();
        loadAndRenderEvents();
        handleAnchorScroll(); // <-- SE AÑADE LA LLAMADA A LA NUEVA FUNCIÓN
    }
    if (pageId === 'entrevistasPage') {
        loadAndRenderInterviews();
    }
    if (pageId === 'libroPage') {
        initializeLetterModal();
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

        heroDynamicSection.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
        heroDynamicSection.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); });
        
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
            
            container.innerHTML = '';
            events.forEach(event => {
                const button = document.createElement('button');
                button.className = 'event-tag-button';
                button.textContent = event.mainButtonText;
                
                button.addEventListener('click', () => {
                    window.location.href = `evento-detalle.html?id=${event.id}`;
                });
                
                container.appendChild(button);
            });
        } catch (error) {
            console.error("Error cargando eventos:", error);
            container.innerHTML = '<p>No se pudieron cargar los eventos.</p>';
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

    // --- NUEVA FUNCIÓN PARA EL SCROLL PRECISO ---
    function handleAnchorScroll() {
        // Usamos un pequeño retraso para asegurar que la página se haya renderizado completamente
        setTimeout(() => {
            if (window.location.hash === '#eventos-anchor') {
                const anchorElement = document.getElementById('eventos-anchor');
                if (anchorElement) {
                    const headerOffset = document.querySelector('header')?.offsetHeight || 70;
                    const elementPosition = anchorElement.getBoundingClientRect().top;
                    const offsetPosition = window.pageYOffset + elementPosition - headerOffset - 20; // 20px de margen extra
      
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        }, 100); // 100ms de retraso
    }
});