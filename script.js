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
                if (event.target.closest('.book-link')) {
                    return; 
                }
                event.preventDefault();
                showTab(index);
                startCarousel();
            });
        });
        
        createDots();

        const heroSection = document.querySelector('.hero-dynamic');
        let touchStartX = 0;
        let touchEndX = 0;

        heroSection.addEventListener('touchstart', function(event) {
            touchStartX = event.changedTouches[0].screenX;
        }, false);

        heroSection.addEventListener('touchend', function(event) {
            touchEndX = event.changedTouches[0].screenX;
            handleSwipeGesture();
        }, false); 

        function handleSwipeGesture() {
            const swipeThreshold = 50;
            if (touchStartX - touchEndX > swipeThreshold) {
                nextTab();
                startCarousel();
            }
            if (touchEndX - touchStartX > swipeThreshold) {
                prevTab();
                startCarousel();
            }
        }
        
        showTab(0);
        startCarousel();
    }

    // --- LÓGICA DE LA GALERÍA DINÁMICA (SOLO EN LIBRO.HTML) ---
    async function construirGaleriaPublica() {
        const galeriaContainer = document.getElementById('galeria-interactiva');
        if (!galeriaContainer) return;

        await new Promise(resolve => setTimeout(resolve, 100)); 

        if (!window.firebaseServices) {
            console.error("Firebase no está listo en esta página.");
            return;
        }
        const { db, collection, getDocs, orderBy, query } = window.firebaseServices;

        const imagenPrincipal = document.getElementById('imagen-principal');
        const bgDesenfocado = document.getElementById('galeria-bg-desenfocado');
        const descripcionContainer = document.getElementById('descripcion-principal');
        const descripcionParrafo = descripcionContainer.querySelector('p');
        const miniaturasContainer = document.getElementById('galeria-lista-miniaturas');
        let visibilityTimer;

        try {
            const q = query(collection(db, 'gallery'), orderBy('order'));
            const snapshot = await getDocs(q);
            const galeriaFotos = snapshot.docs.map(doc => doc.data());

            miniaturasContainer.innerHTML = '';
            galeriaFotos.forEach(foto => {
                const miniaturaItem = document.createElement('div');
                miniaturaItem.className = 'miniatura-item';
                miniaturaItem.dataset.imgSrc = foto.src;
                miniaturaItem.dataset.description = foto.descripcion;
                
                miniaturaItem.innerHTML = `
                    <img src="${foto.src}" alt="Miniatura de ${foto.descripcion}">
                    <div class="miniatura-overlay">
                        <p class="miniatura-descripcion">${foto.descripcion}</p>
                    </div>
                `;
                miniaturasContainer.appendChild(miniaturaItem);
            });

            function actualizarVisor(miniaturaActiva) {
                if (!miniaturaActiva) return;
                const imgSrc = miniaturaActiva.dataset.imgSrc;
                const description = miniaturaActiva.dataset.description;

                imagenPrincipal.style.opacity = '0';
                setTimeout(() => {
                    imagenPrincipal.src = imgSrc;
                    bgDesenfocado.style.backgroundImage = `url('${imgSrc}')`;
                    descripcionParrafo.textContent = description;
                    imagenPrincipal.style.opacity = '1';

                    clearTimeout(visibilityTimer);
                    descripcionContainer.classList.add('visible-temporarily');
                    visibilityTimer = setTimeout(() => {
                        descripcionContainer.classList.remove('visible-temporarily');
                    }, 2500);

                }, 300);

                document.querySelectorAll('.miniatura-item').forEach(min => min.classList.remove('active'));
                miniaturaActiva.classList.add('active');
            }

            const todasLasMiniaturas = document.querySelectorAll('.miniatura-item');
            todasLasMiniaturas.forEach(miniatura => {
                miniatura.addEventListener('click', function() {
                    actualizarVisor(this);
                });
            });

            if (todasLasMiniaturas.length > 0) {
                actualizarVisor(todasLasMiniaturas[0]);
            } else {
                if(descripcionParrafo) descripcionParrafo.textContent = "La galería de momentos está vacía.";
            }
        } catch (error) {
            console.error("Error al cargar la galería desde Firestore:", error);
            if(descripcionParrafo) descripcionParrafo.textContent = "No se pudo cargar la galería.";
        }
    }
    
    // Declaraciones de variables para las galerías con lightbox
    let activePhotos = [];
    let currentImageIndex = -1;

    // --- LÓGICA DE LA GALERÍA DE MODELAJE (SOLO EN MODELAJE.HTML) ---
    async function construirGaleriaModelo() {
        const galleryGrid = document.getElementById('gallery-grid-modelo');
        if (!galleryGrid) return;

        await new Promise(resolve => setTimeout(resolve, 100));

        if (!window.firebaseServices) {
            console.error("Firebase no está listo.");
            galleryGrid.innerHTML = "<p>Error al conectar con la base de datos.</p>";
            return;
        }
        const { db, collection, getDocs, orderBy, query } = window.firebaseServices;

        try {
            const q = query(collection(db, 'modeling_gallery'), orderBy('order'));
            const snapshot = await getDocs(q);
            const modeloFotos = snapshot.docs.map(doc => doc.data());
            
            if (modeloFotos.length === 0) {
                galleryGrid.innerHTML = "<p>La galería está vacía en este momento.</p>";
                return;
            }

            galleryGrid.innerHTML = '';
            modeloFotos.forEach((foto, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-grid-item';
                item.dataset.index = index;
                
                item.innerHTML = `
                    <img src="${foto.src}" alt="${foto.descripcion || 'Foto de modelaje'}">
                    <div class="gallery-item-overlay"><p>${foto.descripcion || ''}</p></div>
                `;
                galleryGrid.appendChild(item);
            });
        } catch (error) {
            console.error("Error al cargar la galería de modelaje:", error);
            galleryGrid.innerHTML = "<p>No se pudo cargar la galería.</p>";
        }
    }

    // --- AÑADIDO: LÓGICA PARA LA GALERÍA DE TELEVISIÓN ---
    async function construirGaleriaTelevision() {
        const galleryGrid = document.getElementById('gallery-grid-television');
        if (!galleryGrid) return; // Solo se ejecuta en television.html

        await new Promise(resolve => setTimeout(resolve, 100));

        if (!window.firebaseServices) {
            console.error("Firebase no está listo.");
            galleryGrid.innerHTML = "<p>Error al conectar con la base de datos.</p>";
            return;
        }
        const { db, collection, getDocs, orderBy, query } = window.firebaseServices;

        try {
            const q = query(collection(db, 'television_gallery'), orderBy('order'));
            const snapshot = await getDocs(q);
            const televisionFotos = snapshot.docs.map(doc => doc.data());

            if (televisionFotos.length === 0) {
                galleryGrid.innerHTML = "<p>La galería está vacía en este momento.</p>";
                return;
            }

            galleryGrid.innerHTML = '';
            televisionFotos.forEach((foto, index) => {
                const item = document.createElement('div');
                item.className = 'gallery-grid-item';
                item.dataset.index = index;
                
                item.innerHTML = `
                    <img src="${foto.src}" alt="${foto.descripcion || 'Foto de televisión'}">
                    <div class="gallery-item-overlay"><p>${foto.descripcion || ''}</p></div>
                `;
                galleryGrid.appendChild(item);
            });
        } catch (error) {
            console.error("Error al cargar la galería de televisión:", error);
            galleryGrid.innerHTML = "<p>No se pudo cargar la galería.</p>";
        }
    }

    // --- NUEVO: Prepara galerías simples para el lightbox (HABECU, Calendario, etc.) ---
    function prepararGaleriasSimples() {
        const galleries = document.querySelectorAll('.comunicacion-gallery');
        if (galleries.length === 0) return;

        galleries.forEach(gallery => {
            const images = gallery.querySelectorAll('img');
            images.forEach((img, index) => {
                // Si ya está envuelto, no hacer nada para evitar duplicados
                if (img.parentElement.classList.contains('gallery-grid-item')) return;

                const wrapper = document.createElement('div');
                wrapper.className = 'gallery-grid-item'; // Usa la misma clase para ser compatible
                wrapper.dataset.index = index;
                
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
            });
        });
    }

    // --- LÓGICA DEL LIGHTBOX (AHORA GENÉRICA Y CON SWIPE) ---
    function initLightbox() {
        const modal = document.getElementById('lightbox-modal');
        if (!modal) return;

        const closeBtn = document.querySelector('.lightbox-close');
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const lightboxContent = document.querySelector('.lightbox-content');
        
        let touchStartX = 0;
        let touchEndX = 0;
        let isDragging = false;
        
        function openModal(index) {
            currentImageIndex = parseInt(index);
            updateLightboxImage();
            modal.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            modal.classList.remove('visible');
            document.body.style.overflow = 'auto';
        }

        function updateLightboxImage() {
            if (currentImageIndex < 0 || currentImageIndex >= activePhotos.length) return;
            const photo = activePhotos[currentImageIndex];
            lightboxImage.style.opacity = 0;
            setTimeout(() => {
                lightboxImage.src = photo.src;
                lightboxCaption.textContent = photo.descripcion || '';
                lightboxImage.style.opacity = 1;
            }, 150);
        }

        function showNext() {
            currentImageIndex = (currentImageIndex + 1) % activePhotos.length;
            updateLightboxImage();
        }

        function showPrev() {
            currentImageIndex = (currentImageIndex - 1 + activePhotos.length) % activePhotos.length;
            updateLightboxImage();
        }

        document.body.addEventListener('click', e => {
            const item = e.target.closest('.gallery-grid-item');
            if (!item) return;

            const gallery = item.parentElement;
            
            // Comprueba si el padre es un contenedor de galería reconocido
            if (gallery.id === 'gallery-grid-modelo' || gallery.id === 'gallery-grid-television' || gallery.classList.contains('comunicacion-gallery')) {
                const galleryItems = gallery.querySelectorAll('.gallery-grid-item img');
                
                // Rellena activePhotos al momento con las fotos de la galería correcta
                activePhotos = Array.from(galleryItems).map(img => ({
                    src: img.src,
                    descripcion: img.alt
                }));

                openModal(item.dataset.index);
            }
        });

        closeBtn.addEventListener('click', closeModal);
        nextBtn.addEventListener('click', showNext);
        prevBtn.addEventListener('click', showPrev);
        
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

        document.addEventListener('keydown', e => {
            if (!modal.classList.contains('visible')) return;
            if (e.key === 'Escape') closeModal();
            if (e.key === 'ArrowRight') showNext();
            if (e.key === 'ArrowLeft') showPrev();
        });
        
        // --- INICIO: LÓGICA DE SWIPE ---
        function handleSwipe() {
            const swipeThreshold = 50; // Mínima distancia para considerar un swipe
            if (touchEndX < touchStartX - swipeThreshold) {
                showNext();
            } else if (touchEndX > touchStartX + swipeThreshold) {
                showPrev();
            }
        }

        lightboxContent.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });

        lightboxContent.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        lightboxContent.addEventListener('mousedown', e => {
            e.preventDefault();
            isDragging = true;
            touchStartX = e.screenX;
            lightboxContent.style.cursor = 'grabbing';
        });

        lightboxContent.addEventListener('mouseup', e => {
            if (!isDragging) return;
            isDragging = false;
            touchEndX = e.screenX;
            lightboxContent.style.cursor = 'default';
            handleSwipe();
        });
        
        lightboxContent.addEventListener('mouseleave', () => {
             if (isDragging) {
                isDragging = false;
                lightboxContent.style.cursor = 'default';
             }
        });
        // --- FIN: LÓGICA DE SWIPE ---
    }

    // Llamadas a todas las funciones de construcción
    prepararGaleriasSimples();
    construirGaleriaPublica();
    construirGaleriaModelo();
    construirGaleriaTelevision();
    initLightbox();

    // === INICIO: LÓGICA DE MODALES (SOLO EN LIBRO.HTML) ===
    const videoTrigger = document.getElementById('alberto-leon-video-trigger');
    const videoModal = document.getElementById('video-modal');
    const closeVideoModalBtn = document.getElementById('modal-close-btn');

    const letterTrigger = document.getElementById('open-letter-modal');
    const letterModal = document.getElementById('letter-modal');
    const closeLetterModalBtn = document.getElementById('letter-modal-close-btn');

    if (videoTrigger && videoModal && closeVideoModalBtn) {
        const openModal = () => videoModal.classList.add('visible');
        const closeModal = () => videoModal.classList.remove('visible');

        videoTrigger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openModal(); });
        closeVideoModalBtn.addEventListener('click', closeModal);
        videoModal.addEventListener('click', (e) => { if (e.target === videoModal) closeModal(); });
    }

    if (letterTrigger && letterModal && closeLetterModalBtn) {
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
    
    // ===============================================
    //  LÓGICA PARA EL BOTÓN DE VOLVER ARRIBA
    // ===============================================
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
});