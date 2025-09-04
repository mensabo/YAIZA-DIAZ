document.addEventListener('DOMContentLoaded', function() {

    // --- LÓGICA COMÚN PARA EL MENÚ (SE EJECUTA EN TODAS LAS PÁGINAS) ---
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('nav-open');
        });
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('nav-open');
            });
        });
    }

    // --- LÓGICA DEL HERO DINÁMICO ---
    const heroTabs = document.querySelectorAll('.hero-tab');
    if (heroTabs.length > 0) {
        const backgroundContainer = document.querySelector('.hero-background-container');
        const mobileTabTitle = document.getElementById('mobile-tab-title');
        const mobileBookLink = document.getElementById('mobile-book-link');
        const dotsNavContainer = document.getElementById('hero-dots-nav');
        let currentIndex = 0;
        let slideInterval;

        function createDots() {
            if (!dotsNavContainer) return;
            dotsNavContainer.innerHTML = '';
            heroTabs.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.classList.add('hero-dot');
                dot.dataset.index = index;
                dot.setAttribute('aria-label', `Ir a la sección ${index + 1}`);
                dot.addEventListener('click', () => {
                    showTab(index);
                    startCarousel();
                });
                dotsNavContainer.appendChild(dot);
            });
        }
        
        function updateMobileDisplay(index) {
            if (!mobileTabTitle) return;
            const mobileAnnotation = document.querySelector('.click-annotation-mobile');
            mobileTabTitle.classList.remove('visible');
            setTimeout(() => {
                const currentTab = heroTabs[index];
                mobileTabTitle.textContent = currentTab.querySelector('h2').textContent;
                if (currentTab.id === 'escritora-tab') {
                    mobileBookLink.classList.add('visible');
                    if (mobileAnnotation) mobileAnnotation.classList.add('visible');
                } else {
                    mobileBookLink.classList.remove('visible');
                    if (mobileAnnotation) mobileAnnotation.classList.remove('visible');
                }
                mobileTabTitle.classList.add('visible');
            }, 200);
        }
        
        function showTab(index) {
            if (!heroTabs[index] || !backgroundContainer) return;
            const newBgImage = heroTabs[index].dataset.bgImage;
            const newBgPosition = heroTabs[index].dataset.bgPosition || 'center center';
            document.body.classList.remove('slide-0', 'slide-1', 'slide-2');
            document.body.classList.add('slide-' + index);
            backgroundContainer.style.opacity = 0;
            setTimeout(() => {
                backgroundContainer.style.backgroundImage = `url('${newBgImage}')`;
                if (index === 0 && window.innerWidth <= 768) {
                    backgroundContainer.style.backgroundPosition = 'center 100%';
                } else {
                    backgroundContainer.style.backgroundPosition = newBgPosition;
                }
                backgroundContainer.style.opacity = 1;
            }, 300);
            const currentActiveTab = document.querySelector('.hero-tab.active');
            if (currentActiveTab) {
                currentActiveTab.classList.remove('active');
            }
            heroTabs[index].classList.add('active');
            if (dotsNavContainer) {
                const currentActiveDot = dotsNavContainer.querySelector('.hero-dot.active');
                if (currentActiveDot) {
                    currentActiveDot.classList.remove('active');
                }
                const newActiveDot = dotsNavContainer.querySelector(`.hero-dot[data-index="${index}"]`);
                if (newActiveDot) {
                    newActiveDot.classList.add('active');
                }
            }
            currentIndex = index;
            updateMobileDisplay(index);
        }

        function nextTab() {
            const nextIndex = (currentIndex + 1) % heroTabs.length;
            showTab(nextIndex);
        }
        
        function prevTab() {
            const prevIndex = (currentIndex - 1 + heroTabs.length) % heroTabs.length;
            showTab(prevIndex);
        }
        
        function startCarousel() {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextTab, 5000);
        }

        document.querySelectorAll('.hero-tabs-desktop .hero-tab').forEach((tab, index) => {
            tab.addEventListener('click', function(event) {
                if (event.target.closest('.book-link')) return;
                event.preventDefault();
                showTab(index);
                startCarousel();
            });
        });
        
        createDots();
        const heroSection = document.querySelector('.hero-dynamic');
        if (heroSection) {
            let touchStartX = 0;
            let touchEndX = 0;
            heroSection.addEventListener('touchstart', (event) => touchStartX = event.changedTouches[0].screenX, false);
            heroSection.addEventListener('touchend', (event) => {
                touchEndX = event.changedTouches[0].screenX;
                const swipeThreshold = 50;
                if (touchStartX - touchEndX > swipeThreshold) nextTab();
                if (touchEndX - startStartX > swipeThreshold) prevTab();
                startCarousel();
            }, false);
        }
        
        showTab(0);
        startCarousel();
    }
    
    // --- INICIO: LÓGICA DE MODALES (VÍDEO Y LIGHTBOX) ---
    const videoModal = document.getElementById('video-modal');
    const videoPlayer = document.getElementById('modal-video-player');
    const videoModalCloseBtn = videoModal ? videoModal.querySelector('.modal-close') : null;

    function openVideoModal(videoSrc) {
        if (!videoModal || !videoPlayer) return;
        videoPlayer.src = videoSrc;
        videoModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        videoPlayer.play().catch(e => console.error("Error al reproducir vídeo:", e));
    }

    function closeVideoModal() {
        if (!videoModal || !videoPlayer) return;
        videoModal.classList.remove('visible');
        document.body.style.overflow = 'auto';
        videoPlayer.pause();
        videoPlayer.src = "";
    }

    if (videoModal && videoModalCloseBtn) {
        videoModalCloseBtn.addEventListener('click', closeVideoModal);
        videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeVideoModal(); });
    }

    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCloseBtn = lightboxModal ? lightboxModal.querySelector('.lightbox-close') : null;
    const lightboxPrevBtn = lightboxModal ? lightboxModal.querySelector('.lightbox-prev') : null;
    const lightboxNextBtn = lightboxModal ? lightboxModal.querySelector('.lightbox-next') : null;
    let activeGalleryItems = [];
    let currentLightboxIndex = -1;

    function openImageLightbox(items, startIndex) {
        if (!lightboxModal || !lightboxImage) return;
        activeGalleryItems = items.filter(item => item.type === 'image'); // Solo mostramos imágenes en el lightbox
        currentLightboxIndex = activeGalleryItems.findIndex(item => item.src === items[startIndex].src);

        if (currentLightboxIndex === -1) return; // Si el item inicial no es una imagen

        updateLightboxContent();
        lightboxModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function updateLightboxContent() {
        const item = activeGalleryItems[currentLightboxIndex];
        lightboxImage.src = item.src;
        if(lightboxCaption) lightboxCaption.textContent = item.description;

        if (lightboxPrevBtn) lightboxPrevBtn.style.display = activeGalleryItems.length > 1 ? 'block' : 'none';
        if (lightboxNextBtn) lightboxNextBtn.style.display = activeGalleryItems.length > 1 ? 'block' : 'none';
    }

    function showNextLightboxImage() {
        currentLightboxIndex = (currentLightboxIndex + 1) % activeGalleryItems.length;
        updateLightboxContent();
    }

    function showPrevLightboxImage() {
        currentLightboxIndex = (currentLightboxIndex - 1 + activeGalleryItems.length) % activeGalleryItems.length;
        updateLightboxContent();
    }

    if (lightboxModal) {
        if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', () => {
            lightboxModal.classList.remove('visible');
            document.body.style.overflow = 'auto';
        });
        if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', showNextLightboxImage);
        if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', showPrevLightboxImage);
        lightboxModal.addEventListener('click', e => { if (e.target === lightboxModal) {
            lightboxModal.classList.remove('visible');
            document.body.style.overflow = 'auto';
        }});
    }
    // --- FIN: LÓGICA DE MODALES ---

    // --- LÓGICA DE GALERÍA INTERACTIVA REUTILIZABLE (ACTUALIZADA) ---
    function initInteractiveGallery(containerId, firestoreCollection) {
        const galleryContainer = document.getElementById(containerId);
        if (!galleryContainer) return;

        const mainImage = galleryContainer.querySelector('.imagen-principal');
        const bgBlur = galleryContainer.querySelector('.galeria-bg-desenfocado');
        const descriptionContainer = galleryContainer.querySelector('.descripcion-principal p');
        const thumbnailsContainer = galleryContainer.querySelector('.galeria-lista-miniaturas');
        let allItems = []; // Almacenará tanto imágenes como vídeos

        if (mainImage) {
            mainImage.addEventListener('click', () => {
                const type = mainImage.dataset.type || 'image';
                const index = parseInt(mainImage.dataset.index, 10);

                if (type === 'video') {
                    openVideoModal(mainImage.dataset.videoSrc);
                } else if (mainImage.src && !mainImage.src.endsWith('#')) {
                    openImageLightbox(allItems, index);
                }
            });
        }
        
        const updateViewer = (activeThumbnail) => {
            if (!activeThumbnail || !mainImage) return;
            const item = allItems[activeThumbnail.dataset.index];

            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = item.imgSrc;
                if (bgBlur) bgBlur.style.backgroundImage = `url('${item.imgSrc}')`;
                if (descriptionContainer) descriptionContainer.textContent = item.description;
                mainImage.style.opacity = '1';
                
                mainImage.dataset.type = item.type;
                mainImage.dataset.index = activeThumbnail.dataset.index;
                mainImage.dataset.videoSrc = item.videoSrc || '';
                mainImage.style.cursor = item.type === 'video' ? 'pointer' : 'zoom-in';
            }, 300);

            thumbnailsContainer.querySelectorAll('.miniatura-item').forEach(thumb => thumb.classList.remove('active'));
            activeThumbnail.classList.add('active');
        };

        const setupEventListeners = () => {
            const thumbnails = thumbnailsContainer.querySelectorAll('.miniatura-item');
            if (thumbnails.length > 0) {
                thumbnails.forEach(thumb => thumb.addEventListener('click', () => updateViewer(thumb)));
                updateViewer(thumbnails[0]);
            } else if (firestoreCollection && descriptionContainer) {
                descriptionContainer.textContent = "La galería está vacía.";
            }
        };

        if (firestoreCollection) {
            const loadFirebaseGallery = async () => {
                if (!window.firebaseServices) { console.error("Firebase no está listo."); return; }
                const { db, collection, getDocs, orderBy, query } = window.firebaseServices;
                try {
                    const q = query(collection(db, firestoreCollection), orderBy('order'));
                    const snapshot = await getDocs(q);
                    
                    allItems = [];
                    thumbnailsContainer.innerHTML = '';
                    snapshot.docs.forEach((doc, index) => {
                        const itemData = doc.data();
                        const thumb = document.createElement('div');
                        thumb.className = 'miniatura-item';
                        thumb.dataset.index = index;
                        thumb.dataset.description = itemData.descripcion;

                        let itemForGallery;

                        if (itemData.type === 'video') {
                            itemForGallery = {
                                type: 'video',
                                imgSrc: itemData.thumbnailSrc,
                                videoSrc: itemData.videoSrc,
                                description: itemData.descripcion
                            };
                            thumb.innerHTML = `<img src="${itemData.thumbnailSrc}" alt="Miniatura de ${itemData.descripcion}"><div class="miniatura-overlay video-play-icon"><i class="fas fa-play"></i></div>`;
                        } else {
                            itemForGallery = {
                                type: 'image',
                                imgSrc: itemData.src,
                                src: itemData.src,
                                description: itemData.descripcion
                            };
                            thumb.innerHTML = `<img src="${itemData.src}" alt="Miniatura de ${itemData.descripcion}"><div class="miniatura-overlay"><p class="miniatura-descripcion">${itemData.descripcion}</p></div>`;
                        }
                        
                        allItems.push(itemForGallery);
                        thumb.dataset.imgSrc = itemForGallery.imgSrc;
                        thumb.dataset.type = itemForGallery.type;
                        if(itemForGallery.videoSrc) thumb.dataset.videoSrc = itemForGallery.videoSrc;

                        thumbnailsContainer.appendChild(thumb);
                    });
                    setupEventListeners();
                } catch (error) {
                    console.error("Error al cargar la galería:", error);
                    if (descriptionContainer) descriptionContainer.textContent = "No se pudo cargar la galería.";
                }
            };
            loadFirebaseGallery();
        } else { // Para galerías estáticas como la del calendario
            const thumbnails = thumbnailsContainer.querySelectorAll('.miniatura-item');
            thumbnails.forEach((thumb, index) => {
                thumb.dataset.index = index;
                allItems.push({
                    type: 'image',
                    imgSrc: thumb.dataset.imgSrc,
                    src: thumb.dataset.imgSrc,
                    description: thumb.dataset.description
                });
            });
            setupEventListeners();
        }
    }

    // --- LÓGICA DE MODALES DEL LIBRO (se mantiene igual) ---
    const bookVideoTrigger = document.getElementById('alberto-leon-video-trigger');
    const bookVideoModal = document.getElementById('video-modal'); // Reutiliza el ID, cuidado si hay conflictos
    if (bookVideoTrigger && bookVideoModal) {
        // ... (código del modal del libro)
    }

    const letterTrigger = document.getElementById('open-letter-modal');
    const letterModal = document.getElementById('letter-modal');
    if (letterTrigger && letterModal) {
       // ... (código del modal de la carta)
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (videoModal && videoModal.classList.contains('visible')) closeVideoModal();
            if (lightboxModal && lightboxModal.classList.contains('visible')) closeImageLightbox();
            // ... (cierre de otros modales si es necesario)
        }
    });
    
    // --- LÓGICA PARA EL BOTÓN DE VOLVER ARRIBA ---
    const backToTopButton = document.getElementById('volver-arriba-btn');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            backToTopButton.classList.toggle('visible', window.scrollY > 300);
        });
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- LLAMADAS FINALES A LAS FUNCIONES ---
    initInteractiveGallery('galeria-interactiva', 'gallery');
    initInteractiveGallery('galeria-interactiva-radio', 'radio_gallery');
    initInteractiveGallery('galeria-interactiva-modelo', 'modeling_gallery');
    initInteractiveGallery('galeria-interactiva-television', 'television_gallery');
    initInteractiveGallery('galeria-interactiva-calendario', null);
    initInteractiveGallery('galeria-interactiva-habecu', 'habecu_gallery');

    // --- LÓGICA MODAL PARA IFRAME (YOUTUBE) ---
    const iframeModal = document.getElementById('video-modal');
    const iframePlayer = iframeModal ? document.getElementById('modal-video-iframe') : null;
    const iframeModalCloseBtn = iframeModal ? iframeModal.querySelector('.modal-close') : null;

    function openIframeModal(videoSrc) {
        if (!iframeModal || !iframePlayer) return;
        // Añade autoplay para una mejor experiencia de usuario
        const videoUrl = new URL(videoSrc);
        videoUrl.searchParams.set('autoplay', '1');
        iframePlayer.src = videoUrl.href;
        iframeModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeIframeModal() {
        if (!iframeModal || !iframePlayer) return;
        iframeModal.classList.remove('visible');
        document.body.style.overflow = 'auto';
        iframePlayer.src = ""; // Detiene la reproducción del vídeo al cerrar
    }

    if (iframeModal && iframeModalCloseBtn) {
        iframeModalCloseBtn.addEventListener('click', closeIframeModal);
        iframeModal.addEventListener('click', (e) => {
            if (e.target === iframeModal) closeIframeModal();
        });
    }

    // Event listener genérico para todos los enlaces que deban abrir el modal de vídeo
    document.body.addEventListener('click', function(e) {
        const trigger = e.target.closest('.js-video-modal-trigger');
        if (trigger) {
            e.preventDefault();
            const videoSrc = trigger.dataset.videoSrc;
            if (videoSrc) {
                openIframeModal(videoSrc);
            }
        }
    });
});