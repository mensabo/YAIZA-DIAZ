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
            
            mobileTabTitle.classList.remove('visible');
            setTimeout(() => {
                const currentTab = heroTabs[index];
                mobileTabTitle.textContent = currentTab.querySelector('h2').textContent;
                
                if (currentTab.id === 'escritora-tab') {
                    mobileBookLink.classList.add('visible');
                } else {
                    mobileBookLink.classList.remove('visible');
                }
                
                mobileTabTitle.classList.add('visible');
            }, 200);
        }
        
        // ==================================================================
        // FUNCIÓN 'showTab' CORREGIDA, LIMPIA Y FUNCIONAL
        // ==================================================================
        function showTab(index) {
            if (!heroTabs[index] || !backgroundContainer) return;

            const newBgImage = heroTabs[index].dataset.bgImage;
            const newBgPosition = heroTabs[index].dataset.bgPosition || 'center center';
            
            document.body.classList.remove('slide-0', 'slide-1', 'slide-2');
            document.body.classList.add('slide-' + index);

            backgroundContainer.style.opacity = 0;

            setTimeout(() => {
                backgroundContainer.style.backgroundImage = `url('${newBgImage}')`;

                // --- INICIO DE LA CORRECCIÓN ---
                // Si es la primera pestaña (índice 0) Y la pantalla es de móvil (<= 768px)...
                if (index === 0 && window.innerWidth <= 768) {
                    // ...forzamos la imagen a bajar al 100% (borde inferior).
                    backgroundContainer.style.backgroundPosition = 'center 100%';
                } else {
                    // Para el resto de casos (otras pestañas o vista de escritorio), usamos el valor del HTML.
                    backgroundContainer.style.backgroundPosition = newBgPosition;
                }
                // --- FIN DE LA CORRECCIÓN ---

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
        
        // --- AÑADIMOS LA FUNCIÓN PARA IR HACIA ATRÁS ---
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

        // --- INICIO: LÓGICA DE SWIPE AÑADIDA ---
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
            // Un swipe necesita un mínimo de movimiento, por ejemplo 50px
            const swipeThreshold = 50;
            // Deslizar a la izquierda (siguiente)
            if (touchStartX - touchEndX > swipeThreshold) {
                nextTab();
                startCarousel(); // Reinicia el temporizador
            }
            
            // Deslizar a la derecha (anterior)
            if (touchEndX - touchStartX > swipeThreshold) {
                prevTab();
                startCarousel(); // Reinicia el temporizador
            }
        }
        // --- FIN: LÓGICA DE SWIPE ---
        
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
    
    construirGaleriaPublica();

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
    // === FIN: LÓGICA DE MODALES ===
    
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