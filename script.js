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
        let touchStartX = 0;
        let touchEndX = 0;
        heroSection.addEventListener('touchstart', (event) => touchStartX = event.changedTouches[0].screenX, false);
        heroSection.addEventListener('touchend', (event) => {
            touchEndX = event.changedTouches[0].screenX;
            const swipeThreshold = 50;
            if (touchStartX - touchEndX > swipeThreshold) nextTab();
            if (touchEndX - touchStartX > swipeThreshold) prevTab();
            startCarousel();
        }, false);
        
        showTab(0);
        startCarousel();
    }

    // --- LÓGICA DE GALERÍA INTERACTIVA REUTILIZABLE ---
    function initInteractiveGallery(containerId, firestoreCollection) {
        const galleryContainer = document.getElementById(containerId);
        if (!galleryContainer) return;

        const mainImage = galleryContainer.querySelector('.imagen-principal');
        const bgBlur = galleryContainer.querySelector('.galeria-bg-desenfocado');
        const descriptionContainer = galleryContainer.querySelector('.descripcion-principal');
        const descriptionParagraph = descriptionContainer.querySelector('p');
        const thumbnailsContainer = galleryContainer.querySelector('.galeria-lista-miniaturas');
        let visibilityTimer;

        // --- INICIO: LÓGICA PARA AMPLIAR IMAGEN PRINCIPAL ---
        const lightboxModal = document.getElementById('lightbox-modal');
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCloseBtn = lightboxModal ? lightboxModal.querySelector('.lightbox-close') : null;
        const lightboxPrevBtn = lightboxModal ? lightboxModal.querySelector('.lightbox-prev') : null;
        const lightboxNextBtn = lightboxModal ? lightboxModal.querySelector('.lightbox-next') : null;

        if (mainImage && lightboxModal) {
            mainImage.style.cursor = 'zoom-in';

            mainImage.addEventListener('click', () => {
                if (!mainImage.src || mainImage.src.endsWith('#')) return; // No abrir si no hay imagen

                lightboxImage.src = mainImage.src;
                
                if (lightboxPrevBtn) lightboxPrevBtn.style.display = 'none';
                if (lightboxNextBtn) lightboxNextBtn.style.display = 'none';

                lightboxModal.classList.add('visible');
                document.body.style.overflow = 'hidden';
            });

            const closeModal = () => {
                lightboxModal.classList.remove('visible');
                document.body.style.overflow = 'auto';
            };

            if (lightboxCloseBtn) {
                lightboxCloseBtn.addEventListener('click', closeModal);
            }
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal) {
                    closeModal();
                }
            });
        }
        // --- FIN: LÓGICA PARA AMPLIAR IMAGEN PRINCIPAL ---

        const updateViewer = (activeThumbnail) => {
            if (!activeThumbnail) return;
            const imgSrc = activeThumbnail.dataset.imgSrc;
            const description = activeThumbnail.dataset.description;
            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = imgSrc;
                bgBlur.style.backgroundImage = `url('${imgSrc}')`;
                descriptionParagraph.textContent = description;
                mainImage.style.opacity = '1';
                clearTimeout(visibilityTimer);
                descriptionContainer.classList.add('visible-temporarily');
                visibilityTimer = setTimeout(() => {
                    descriptionContainer.classList.remove('visible-temporarily');
                }, 2500);
            }, 300);
            thumbnailsContainer.querySelectorAll('.miniatura-item').forEach(thumb => thumb.classList.remove('active'));
            activeThumbnail.classList.add('active');
        };

        const setupEventListeners = () => {
            const thumbnails = thumbnailsContainer.querySelectorAll('.miniatura-item');
            if (thumbnails.length > 0) {
                thumbnails.forEach(thumb => thumb.addEventListener('click', () => updateViewer(thumb)));
                updateViewer(thumbnails[0]);
            } else if (!firestoreCollection) {
                descriptionParagraph.textContent = "La galería está vacía.";
                if(mainImage) mainImage.style.display = 'none';
            }
        };

        if (firestoreCollection) {
            const loadFirebaseGallery = async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!window.firebaseServices) {
                    console.error("Firebase no está listo.");
                    descriptionParagraph.textContent = "Error de conexión.";
                    return;
                }
                const { db, collection, getDocs, orderBy, query } = window.firebaseServices;
                try {
                    const q = query(collection(db, firestoreCollection), orderBy('order'));
                    const snapshot = await getDocs(q);
                    const photos = snapshot.docs.map(doc => doc.data());
                    thumbnailsContainer.innerHTML = '';
                    if (photos.length > 0) {
                        photos.forEach(photo => {
                            const thumb = document.createElement('div');
                            thumb.className = 'miniatura-item';
                            thumb.dataset.imgSrc = photo.src;
                            thumb.dataset.description = photo.descripcion;
                            thumb.innerHTML = `<img src="${photo.src}" alt="Miniatura de ${photo.descripcion}"><div class="miniatura-overlay"><p class="miniatura-descripcion">${photo.descripcion}</p></div>`;
                            thumbnailsContainer.appendChild(thumb);
                        });
                    }
                    setupEventListeners();
                } catch (error) {
                    console.error(`Error al cargar la galería ${firestoreCollection}:`, error);
                    descriptionParagraph.textContent = "No se pudo cargar la galería.";
                }
            };
            loadFirebaseGallery();
        } else {
            setupEventListeners();
        }
    }
    
    // --- LÓGICA PARA GALERÍAS ESTÁTICAS CON LIGHTBOX ---
    let activePhotos = [];
    let currentImageIndex = -1;

    function prepararGaleriasSimples() {
        const galleries = document.querySelectorAll('.comunicacion-gallery');
        galleries.forEach(gallery => {
            if (gallery.id.startsWith('galeria-interactiva')) return;
            gallery.querySelectorAll('img').forEach((img, index) => {
                if (img.parentElement.classList.contains('gallery-grid-item')) return;
                const wrapper = document.createElement('div');
                wrapper.className = 'gallery-grid-item';
                wrapper.dataset.index = index;
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
            });
        });
    }

    function initLightbox() {
        const modal = document.getElementById('lightbox-modal');
        if (!modal) return;
        const closeBtn = modal.querySelector('.lightbox-close');
        const prevBtn = modal.querySelector('.lightbox-prev');
        const nextBtn = modal.querySelector('.lightbox-next');
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCaption = document.getElementById('lightbox-caption');
        
        const openModal = (index) => {
            currentImageIndex = parseInt(index);
            updateLightboxImage();
            modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
            if (prevBtn) prevBtn.style.display = 'block';
            if (nextBtn) nextBtn.style.display = 'block';
        };

        const closeModal = () => {
            modal.classList.remove('visible');
            document.body.style.overflow = 'auto';
        };

        const updateLightboxImage = () => {
            if (currentImageIndex < 0 || currentImageIndex >= activePhotos.length) return;
            const photo = activePhotos[currentImageIndex];
            lightboxImage.src = photo.src;
            if (lightboxCaption) lightboxCaption.textContent = photo.descripcion || '';
        };

        const showNext = () => {
            currentImageIndex = (currentImageIndex + 1) % activePhotos.length;
            updateLightboxImage();
        };

        const showPrev = () => {
            currentImageIndex = (currentImageIndex - 1 + activePhotos.length) % activePhotos.length;
            updateLightboxImage();
        };

        document.body.addEventListener('click', e => {
            const item = e.target.closest('.gallery-grid-item');
            if (item && item.parentElement.classList.contains('comunicacion-gallery')) {
                const galleryItems = item.parentElement.querySelectorAll('.gallery-grid-item img');
                activePhotos = Array.from(galleryItems).map(img => ({ src: img.src, descripcion: img.alt }));
                openModal(item.dataset.index);
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (nextBtn) nextBtn.addEventListener('click', showNext);
        if (prevBtn) prevBtn.addEventListener('click', showPrev);
        
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
        
        document.addEventListener('keydown', e => {
            if (!modal.classList.contains('visible')) return;
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowRight' && nextBtn && nextBtn.style.display !== 'none') showNext();
            if (e.key === 'ArrowLeft' && prevBtn && prevBtn.style.display !== 'none') showPrev();
        });
    }

    // --- INICIO: LÓGICA DE MODALES (SOLO EN LIBRO.HTML) ---
    const videoTrigger = document.getElementById('alberto-leon-video-trigger');
    const videoModal = document.getElementById('video-modal');
    if (videoTrigger && videoModal) {
        const closeVideoModalBtn = document.getElementById('modal-close-btn');
        const openModal = () => videoModal.classList.add('visible');
        const closeModal = () => videoModal.classList.remove('visible');
        videoTrigger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openModal(); });
        closeVideoModalBtn.addEventListener('click', closeModal);
        videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeModal(); });
    }

    const letterTrigger = document.getElementById('open-letter-modal');
    const letterModal = document.getElementById('letter-modal');
    if (letterTrigger && letterModal) {
        const closeLetterModalBtn = document.getElementById('letter-modal-close-btn');
        const openModal = () => letterModal.classList.add('visible');
        const closeModal = () => letterModal.classList.remove('visible');
        letterTrigger.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
        closeLetterModalBtn.addEventListener('click', closeModal);
        letterModal.addEventListener('click', (e) => { if (e.target === letterModal) closeModal(); });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (videoModal && videoModal.classList.contains('visible')) videoModal.classList.remove('visible');
            if (letterModal && letterModal.classList.contains('visible')) letterModal.classList.remove('visible');
        }
    });
    
    // --- LÓGICA PARA EL BOTÓN DE VOLVER ARRIBA ---
    const backToTopButton = document.getElementById('volver-arriba-btn');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('visible');
            } else {
                backToTopButton.classList.remove('visible');
            }
        });
        backToTopButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- LLAMADAS FINALES A LAS FUNCIONES ---
    prepararGaleriasSimples();
    initLightbox();
    initInteractiveGallery('galeria-interactiva', 'gallery');
    initInteractiveGallery('galeria-interactiva-radio', 'radio_gallery');
    initInteractiveGallery('galeria-interactiva-modelo', 'modeling_gallery');
    initInteractiveGallery('galeria-interactiva-television', 'television_gallery');
    initInteractiveGallery('galeria-interactiva-calendario', null); // Galería estática
    initInteractiveGallery('galeria-interactiva-habecu', 'habecu_gallery'); // ¡NUEVA LÍNEA AÑADIDA!
});