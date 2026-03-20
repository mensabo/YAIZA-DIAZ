document.addEventListener('DOMContentLoaded', async () => {
    // Asegurarse de que los servicios de Firebase estén disponibles
    if (!window.firebaseServices) {
        console.error("Firebase no está inicializado. Revisa la etiqueta <script> en tu HTML.");
        return;
    }
    const { 
        db, collection, getDocs, orderBy, query, doc, getDoc, 
        addDoc, serverTimestamp, storage, ref, uploadBytes, getDownloadURL 
    } = window.firebaseServices;

    // --- DEFINICIÓN DE VARIABLES GLOBALES ---
    const pageId = document.body.id;
    let homepageData = {};
    
    // Variables para el control de navegación del Lightbox
    let lightboxItems = []; 
    let currentLightboxIndex = 0;

    // --- LÓGICA DEL MENÚ DE NAVEGACIÓN (MÓVIL) ---
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const body = document.body;

    if (mobileMenuToggle && navLinks) {
        const toggleMenu = (open) => {
            if (open === undefined) {
                open = !navLinks.classList.contains('nav-open');
            }
            navLinks.classList.toggle('nav-open', open);
            body.classList.toggle('scroll-locked', open);
        };
        mobileMenuToggle.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleMenu();
        });
        document.addEventListener('click', (event) => {
            const isMenuOpen = navLinks.classList.contains('nav-open');
            const clickedInsideMenu = navLinks.contains(event.target);
            const clickedOnToggleButton = mobileMenuToggle.contains(event.target);
            if (isMenuOpen && !clickedInsideMenu && !clickedOnToggleButton) {
                toggleMenu(false);
            }
        });
        window.addEventListener('resize', () => {
             if (window.innerWidth > 768 && navLinks.classList.contains('nav-open')) {
                 toggleMenu(false);
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

    // --- FUNCIÓN DE CARGA DE TEXTOS DINÁMICOS ---
    async function loadDynamicText() {
        if (!pageId || !doc) return;
        try {
            const docRef = doc(db, 'pages', pageId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (pageId === 'homepage') {
                    homepageData = data;
                }
                document.querySelectorAll('[data-content-id]').forEach(element => {
                    const contentId = element.dataset.contentId;
                    if (data[contentId] !== undefined) {
                        element.innerHTML = data[contentId];
                    }
                });
            }
        } catch (error) {
            console.error("Error al cargar textos dinámicos:", error);
        }
    }
    
    // =======================================================
    // --- EJECUCIÓN ORDENADA DE SCRIPTS ---
    // =======================================================
    
    if (pageId) {
        await loadDynamicText();
    }
    
    initializeContactModal();
    initializeEscapeKeyForModals();
    initializeSidenotes();
    initializeSmoothScroll();
    initializeLogoPopups();
    initializeScrollIndicator();

    if (pageId === 'homepage') {
        initializeHeroSlider();
    }
    if (pageId === 'eventosPage') {
        loadAndRenderEventsGridPage();
    }
    if (pageId === 'entrevistasPage') {
        loadAndRenderInterviews();
    }
    if (pageId === 'televisionPage') {
        loadAndRenderTVPrograms();
    }
    if (pageId === 'libroPage') {
        initializeLetterModal();
        initializeAlbertoLeonModal();
        initializePurchaseModal();
    }
    if (pageId === 'modelajePage') {
        initializeStaticGallery('galeria-interactiva-calendario');
    }
    if (pageId === 'contactPage') {
        initializeContactForm();
    }

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
    // --- DEFINICIÓN DE TODAS LAS FUNCIONES ---
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
                if (e.target.closest('a')) return;
                if (!tab.classList.contains('active')) {
                    switchTab(index);
                    resetInterval();
                }
            });
        });

        if (dotsContainer) {
            tabs.forEach((_, index) => {
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
            const heroId = activeTab.dataset.heroId;
            const imageArrayKey = `heroSlider${heroId}`;
            const imageUrls = homepageData[imageArrayKey];

            if (imageUrls && imageUrls.length > 0) {
                const randomIndex = Math.floor(Math.random() * imageUrls.length);
                const randomImageObject = imageUrls[randomIndex];
                if (randomImageObject && randomImageObject.src) {
                    bgContainer.style.backgroundImage = `url(${randomImageObject.src})`;
                    const isMobile = window.innerWidth < 768;
                    const posY = isMobile ? (randomImageObject.posYMobile || 50) : (randomImageObject.posYDesktop || 50);
                    bgContainer.style.backgroundPosition = `center ${posY}%`;
                }
            } else {
                bgContainer.style.backgroundImage = `url('images/placeholder.png')`;
                bgContainer.style.backgroundPosition = 'center center';
            }

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

        const nextTab = () => switchTab((currentIndex + 1) % tabs.length);
        const prevTab = () => switchTab((currentIndex - 1 + tabs.length) % tabs.length);
        const resetInterval = () => { clearInterval(intervalId); intervalId = setInterval(nextTab, 5000); };
        const handleSwipe = () => {
            if (touchStartX - touchEndX > 50) { nextTab(); resetInterval(); } 
            else if (touchEndX - touchStartX > 50) { prevTab(); resetInterval(); }
        };

        if (heroDynamicSection) {
            heroDynamicSection.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
            heroDynamicSection.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); });
        }
        
        if (Object.keys(homepageData).length > 0) {
            switchTab(0);
            resetInterval();
        } else {
            setTimeout(() => { if (Object.keys(homepageData).length > 0) { switchTab(0); resetInterval(); } }, 500);
        }
    }

    function initializeContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;
        const submitButton = document.getElementById('submit-button');
        const statusMessage = document.getElementById('form-status');
        const fileInput = document.getElementById('attachment');
        const fileNameSpan = document.getElementById('file-name');
        if (fileInput && fileNameSpan) {
            fileInput.addEventListener('change', () => {
                fileNameSpan.textContent = fileInput.files.length > 0 ? fileInput.files[0].name : 'Adjuntar un archivo (opcional)';
            });
        }
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { name, email, subject, message, privacy } = form;
            if (!name.value.trim() || !email.value.trim() || !subject.value.trim() || !message.value.trim()) {
                showStatus('Por favor, completa todos los campos requeridos.', 'error'); return;
            }
            if (!privacy.checked) {
                showStatus('Debes aceptar la política de privacidad.', 'error'); return;
            }
            submitButton.disabled = true;
            showStatus('Enviando...', 'pending');
            try {
                let fileUrl = null, fileName = null;
                const file = fileInput.files[0];
                if (file) {
                    const storageRef = ref(storage, `contact-attachments/${Date.now()}_${file.name}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    fileUrl = await getDownloadURL(snapshot.ref);
                    fileName = file.name;
                }
                await addDoc(collection(db, 'contactMessages'), { name: name.value, email: email.value, subject: subject.value, message: message.value, createdAt: serverTimestamp(), attachment: fileUrl, attachmentName: fileName });
                showStatus('¡Mensaje enviado con éxito! Gracias.', 'success');
                form.reset();
                if (fileNameSpan) fileNameSpan.textContent = 'Adjuntar un archivo (opcional)';
            } catch (error) {
                console.error("Error al enviar el formulario:", error);
                showStatus('Hubo un error al enviar el mensaje. Inténtalo de nuevo.', 'error');
            } finally {
                submitButton.disabled = false;
            }
        });
        function showStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = type;
        }
    }

    function initializeContactModal() {
        const modal = document.getElementById('contact-modal');
        const openTriggers = document.querySelectorAll('#contact-modal-trigger');
        const closeButton = document.getElementById('contact-modal-close');
        if (!modal || !closeButton) return;
        const openModal = (e) => { if (e) e.preventDefault(); if (navLinks && navLinks.classList.contains('nav-open')) navLinks.classList.remove('nav-open'); modal.classList.add('visible'); };
        const closeModal = () => modal.classList.remove('visible');
        openTriggers.forEach(trigger => trigger.addEventListener('click', openModal));
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    function initializePurchaseModal() {
        const modal = document.getElementById('purchase-modal');
        const openTrigger = document.getElementById('open-purchase-modal');
        const closeButton = document.getElementById('purchase-modal-close');
        if (!modal || !openTrigger || !closeButton) return;
        const openModal = (e) => { e.preventDefault(); modal.classList.add('visible'); };
        const closeModal = () => modal.classList.remove('visible');
        openTrigger.addEventListener('click', openModal);
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }

    function initializeLogoPopups() {
        document.querySelectorAll('.link-with-logo-popup').forEach(wrapper => {
            const popup = wrapper.querySelector('.logo-popup');
            if (popup) {
                wrapper.addEventListener('mouseenter', () => popup.classList.add('visible'));
                wrapper.addEventListener('mouseleave', () => popup.classList.remove('visible'));
            }
        });
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
                const firstItem = event.galleryItems && event.galleryItems.length > 0 ? event.galleryItems[0] : { type: 'image', src: 'images/placeholder.png' }; 
                const mediaHtml = firstItem.type === 'video' && firstItem.videoSrc ? `<video autoplay loop muted playsinline poster="${firstItem.thumbnailSrc || ''}"><source src="${firstItem.videoSrc}" type="video/mp4"></video>` : `<img src="${firstItem.thumbnailSrc || firstItem.src}" alt="${event.title}" loading="lazy">`;
                const card = document.createElement('a');
                card.href = `evento-detalle.html?id=${event.id}`;
                card.className = 'event-card-link';
                card.innerHTML = `<div class="event-card-image">${mediaHtml}</div><div class="event-card-content"><h4>${event.title}</h4></div>`;
                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error cargando eventos:", error);
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
                card.innerHTML = `<div class="image-container"><img src="${interview.thumbnailUrl}" alt="${interview.mainTitle}" loading="lazy">${isVideo ? '<div class="video-overlay-icon"><i class="fas fa-play"></i></div>' : ''}</div><div class="media-card-text"><h4>${interview.mainTitle}</h4><p>${interview.subtitle}</p></div>`;
                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error cargando entrevistas:", error);
            grid.innerHTML = '<p>Error al cargar las entrevistas.</p>';
        }
    }

    async function loadAndRenderTVPrograms() {
        const container = document.getElementById('dynamic-tv-programs-container');
        if (!container) return;
        try {
            const q = query(collection(db, 'tv_programs'), orderBy('order'));
            const snapshot = await getDocs(q);
            const programs = snapshot.docs.map(doc => doc.data());
            container.innerHTML = '';
            
            if (programs.length === 0) {
                container.innerHTML = '<p style="text-align: center;">No hay programas disponibles.</p>';
                return;
            }
            
            programs.forEach(program => {
                const programDiv = document.createElement('div');
                programDiv.className = 'comunicacion-section';
                
                const textHtml = program.text ? `<p>${program.text}</p>` : '';
                
                programDiv.innerHTML = `
                    <h3>${program.title}</h3>
                    ${textHtml}
                    <a href="${program.url}" target="_blank" rel="noopener noreferrer" class="video-fallback js-video-modal-trigger" data-video-src="${program.url}">
                        <img src="${program.thumbnailUrl}" alt="Miniatura ${program.title}" loading="lazy">
                        <div class="play-button-overlay"><i class="fas fa-play"></i></div>
                    </a>
                `;
                container.appendChild(programDiv);
            });

            // Re-inicializar modales tras render dinámico
            initializeVideoModals();

        } catch (error) {
            console.error("Error cargando programas TV:", error);
            container.innerHTML = '<p style="text-align: center;">Error al cargar los programas.</p>';
        }
    }

    // ==================================================================
    // === GALERÍA INTERACTIVA (CORREGIDA PARA VÍDEOS Y NAVEGACIÓN) ===
    // ==================================================================
   async function initializeInteractiveGallery(containerId, collectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnailsContainer = container.querySelector('.galeria-lista-miniaturas');
        if (!mainImage || !mainDesc || !bgImage || !thumbnailsContainer) return;

        // --- ESTRUCTURA DE FLECHAS ---
        const wrapper = document.createElement('div');
        wrapper.className = 'thumbnails-wrapper';
        const arrowPrev = document.createElement('div');
        arrowPrev.className = 'thumb-nav-arrow thumb-prev disabled';
        arrowPrev.innerHTML = '<i class="fas fa-chevron-up"></i>';
        const arrowNext = document.createElement('div');
        arrowNext.className = 'thumb-nav-arrow thumb-next';
        arrowNext.innerHTML = '<i class="fas fa-chevron-down"></i>';

        thumbnailsContainer.parentNode.insertBefore(wrapper, thumbnailsContainer);
        wrapper.appendChild(arrowPrev);
        wrapper.appendChild(thumbnailsContainer);
        wrapper.appendChild(arrowNext);

        const scrollAmount = 250;
        const handleScrollArrows = (direction) => {
            const isMobile = window.innerWidth <= 900;
            thumbnailsContainer.scrollBy({
                behavior: 'smooth',
                [isMobile ? 'left' : 'top']: direction * scrollAmount
            });
        };

        arrowPrev.addEventListener('click', () => handleScrollArrows(-1));
        arrowNext.addEventListener('click', () => handleScrollArrows(1));

        const updateThumbArrows = () => {
            const isMobile = window.innerWidth <= 900;
            const start = isMobile ? thumbnailsContainer.scrollLeft : thumbnailsContainer.scrollTop;
            const max = isMobile ? (thumbnailsContainer.scrollWidth - thumbnailsContainer.clientWidth) : (thumbnailsContainer.scrollHeight - thumbnailsContainer.clientHeight);
            arrowPrev.classList.toggle('disabled', start <= 5);
            arrowNext.classList.toggle('disabled', start >= max - 5);
            arrowPrev.innerHTML = isMobile ? '<i class="fas fa-chevron-left"></i>' : '<i class="fas fa-chevron-up"></i>';
            arrowNext.innerHTML = isMobile ? '<i class="fas fa-chevron-right"></i>' : '<i class="fas fa-chevron-down"></i>';
        };

        thumbnailsContainer.addEventListener('scroll', updateThumbArrows);
        window.addEventListener('resize', updateThumbArrows);

        let activeItem = null;
        let galleryData = [];

        // Crear botón Play central
        let playIcon = container.querySelector('.interactive-play-icon');
        if (!playIcon) {
            playIcon = document.createElement('div');
            playIcon.className = 'play-button-overlay interactive-play-icon';
            playIcon.innerHTML = '<i class="fas fa-play"></i>';
            playIcon.style.zIndex = '10'; // Subido el z-index para asegurar que sea clickable
            playIcon.style.display = 'none';
            mainImage.parentNode.insertBefore(playIcon, mainImage.nextSibling);
        }

        // --- CORRECCIÓN DEL CLIC EN MEDIA ---
        const handleMediaClick = () => {
            if (!activeItem) return;
            
            if (activeItem.type === 'video') {
                // Si es video, abre en YouTube (esto ya te funcionaba)
                const videoUrl = activeItem.videoSrc || activeItem.src;
                window.open(videoUrl, '_blank', 'noopener,noreferrer');
            } else {
                // SI ES IMAGEN: Filtramos SOLO las imágenes de la galería actual 
                // para que las flechas no intenten abrir vídeos
                const imagesOnly = galleryData.filter(i => i.type !== 'video');
                
                // Buscamos la posición de la foto actual en esa lista de imágenes
                const idx = imagesOnly.findIndex(i => i.id === activeItem.id);
                
                // Abrimos el Lightbox con la lista filtrada
                openLightboxWithNavigation(idx, imagesOnly);
            }
        };
        mainImage.addEventListener('click', handleMediaClick);
        playIcon.addEventListener('click', handleMediaClick);

        try {
            const q = query(collection(db, collectionName), orderBy('order'));
            const snapshot = await getDocs(q);
            galleryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (galleryData.length > 0) {
                thumbnailsContainer.innerHTML = '';
                galleryData.forEach((item) => {
                    const thumbDiv = document.createElement('div');
                    thumbDiv.className = 'miniatura-item';
                    const playBadge = item.type === 'video' ? '<div class="thumb-video-badge"><i class="fas fa-play"></i></div>' : '';
                    thumbDiv.innerHTML = `<img src="${item.thumbnailSrc || item.src}" alt="Miniatura" loading="lazy">${playBadge}`;
                    thumbDiv.addEventListener('click', () => setActiveItem(item, thumbDiv));
                    thumbnailsContainer.appendChild(thumbDiv);
                });
                setActiveItem(galleryData[0], thumbnailsContainer.querySelector('.miniatura-item'));
                setTimeout(updateThumbArrows, 800);
            }

            function setActiveItem(item, thumbElement) {
                activeItem = item;
                mainImage.style.opacity = '0';
                
                // Mostrar botón play si es video, ocultar si es imagen
                playIcon.style.display = item.type === 'video' ? 'flex' : 'none';
                mainImage.style.cursor = item.type === 'video' ? 'pointer' : 'zoom-in';

                setTimeout(() => {
                    mainImage.src = item.thumbnailSrc || item.src;
                    bgImage.style.backgroundImage = `url(${item.thumbnailSrc || item.src})`;
                    mainDesc.textContent = item.descripcion || '';
                    mainImage.style.opacity = '1';
                }, 200);
                
                container.querySelectorAll('.miniatura-item').forEach(el => el.classList.remove('active'));
                thumbElement.classList.add('active');
            }
        } catch (e) { console.error("Error en la galería interactiva:", e); }
    }
    function initializeStaticGallery(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnails = Array.from(container.querySelectorAll('.miniatura-item'));
        if (!mainImage || thumbnails.length === 0) return;
        
        const staticData = thumbnails.map((t, idx) => ({
            src: t.dataset.imgSrc,
            descripcion: t.dataset.description,
            el: t
        }));

        mainImage.addEventListener('click', () => {
            const activeIdx = staticData.findIndex(d => d.el.classList.contains('active'));
            openLightboxWithNavigation(activeIdx, staticData);
        });
    
        function setActiveItem(dataObj) {
            mainImage.style.opacity = '0';
            setTimeout(() => {
                mainImage.src = dataObj.src;
                bgImage.style.backgroundImage = `url(${dataObj.src})`;
                mainDesc.textContent = dataObj.descripcion || '';
                mainImage.style.opacity = '1';
            }, 200);
            staticData.forEach(d => d.el.classList.remove('active'));
            dataObj.el.classList.add('active');
        }
        staticData.forEach(d => d.el.addEventListener('click', () => setActiveItem(d)));
        setActiveItem(staticData[0]);
    }

    // ==================================================================
    // === SISTEMA DE LIGHTBOX CON NAVEGACIÓN (FLECHAS) ===
    // ==================================================================
    function openLightboxWithNavigation(index, items) {
        const modal = document.getElementById('lightbox-modal');
        if (!modal || !items || items.length === 0) return;
        
        // Guardamos la lista de imágenes actual y la posición
        lightboxItems = items;
        currentLightboxIndex = index;
        
        updateLightboxContent();
        modal.classList.add('visible');
    }
function updateLightboxContent() {
        const img = document.getElementById('lightbox-image');
        const caption = document.getElementById('lightbox-caption');
        
        // Verificamos que existan los elementos y que el índice sea válido
        if (!img || !lightboxItems || !lightboxItems[currentLightboxIndex]) {
            console.error("Error: No se pudo cargar la imagen en el índice", currentLightboxIndex);
            return;
        }

        const currentItem = lightboxItems[currentLightboxIndex];

        // Transición de salida
        img.style.opacity = '0';
        
        setTimeout(() => {
            // Buscamos la URL de la imagen en cualquier propiedad posible
            const nuevaRuta = currentItem.src || currentItem.thumbnailSrc || currentItem.videoSrc;
            const nuevoTexto = currentItem.descripcion || currentItem.description || 'Imagen de galería';
            
            img.src = nuevaRuta;
            caption.textContent = nuevoTexto;
            
            // Transición de entrada
            img.style.opacity = '1';
        }, 150);
    }

   // ==================================================================
    // === SISTEMA DE LIGHTBOX CON NAVEGACIÓN (FLECHAS) - CORREGIDO ===
    // ==================================================================
    function initializeStandaloneLightbox() {
        const modal = document.getElementById('lightbox-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.lightbox-close');
        const prevBtn = modal.querySelector('.lightbox-prev');
        const nextBtn = modal.querySelector('.lightbox-next');

        // Función interna para cambiar de imagen
        const changeImage = (step) => {
            if (!lightboxItems || lightboxItems.length <= 1) return;
            currentLightboxIndex = (currentLightboxIndex + step + lightboxItems.length) % lightboxItems.length;
            updateLightboxContent();
        };

        // Evento Flecha Anterior (Mejorado para móvil)
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Fuerza la detención del evento en móviles
                changeImage(-1);
            };
        }
        
        // Evento Flecha Siguiente (Mejorado para móvil)
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation(); // Fuerza la detención del evento en móviles
                changeImage(1);
            };
        }
        
        // Evento Botón Cerrar (X)
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.classList.remove('visible');
            };
        }
        
        // Cerrar al hacer clic en el fondo negro (pero no en la foto ni en las flechas)
        modal.onclick = (e) => {
            if (e.target === modal || e.target.classList.contains('lightbox-content')) {
                modal.classList.remove('visible');
            }
        };

        // SOPORTE PARA IMÁGENES SUELTAS
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.expandable-image');
            
            if (link && !link.closest('.galeria-interactiva-container')) {
                e.preventDefault();
                
                const parent = link.closest('section') || document.body;
                const siblings = Array.from(parent.querySelectorAll('.expandable-image'));
                
                const items = siblings.map(s => ({
                    src: s.href || (s.querySelector('img') ? s.querySelector('img').src : ''),
                    descripcion: s.nextElementSibling?.tagName === 'FIGCAPTION' ? s.nextElementSibling.textContent : ''
                }));
                
                const idx = siblings.indexOf(link);
                openLightboxWithNavigation(idx, items);
            }
        });
    }

    // ==================================================================
    // === SISTEMA DE VÍDEOS (ACTUALIZADO PARA APERTURA EXTERNA) ===
    // ==================================================================
    function initializeVideoModals() {
        const iframeModal = document.getElementById('iframe-modal');
        const iframePlayer = document.getElementById('modal-iframe-player');

        document.body.addEventListener('click', (e) => {
            const trigger = e.target.closest('.js-video-modal-trigger');
            if (trigger) {
                e.preventDefault();
                const url = trigger.dataset.videoSrc || trigger.href;
                openVideoInModal(url);
            }
        });

        if (iframeModal) {
            const closeButtons = iframeModal.querySelectorAll('.modal-close');
            const closeModal = () => { 
                if (iframePlayer) iframePlayer.src = ''; 
                iframeModal.classList.remove('visible'); 
            };
            closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
            iframeModal.addEventListener('click', (e) => { if (e.target === iframeModal) closeModal(); });
        }
    }

    function openVideoInModal(url) {
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
        const iframeModal = document.getElementById('iframe-modal');
        if (iframeModal) {
            iframeModal.classList.remove('visible');
        }
    }

    // =======================================================
    // --- OTRAS UTILIDADES ---
    // =======================================================

    function initializeSidenotes() {
        document.querySelectorAll('.sidenote-trigger').forEach(trigger => {
            const container = trigger.closest('.sidenote-container');
            if (!container) return;
            const closeBtn = container.querySelector('.sidenote-close-btn');
            trigger.addEventListener('click', (e) => { e.stopPropagation(); container.classList.add('is-sidenote-visible'); });
            if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); container.classList.remove('is-sidenote-visible'); });
        });
    }

    function initializeLetterModal() {
        const openBtn = document.getElementById('open-letter-modal');
        const modal = document.getElementById('letter-modal');
        const closeBtn = document.getElementById('letter-modal-close-btn');
        if (openBtn && modal && closeBtn) {
            openBtn.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('visible'); });
            closeBtn.addEventListener('click', () => modal.classList.remove('visible'));
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
        }
    }

    function initializeAlbertoLeonModal() {
        const modal = document.getElementById('video-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'alberto-leon-video-trigger' && modal) {
                modal.classList.add('visible');
            }
        });
        if (modal && closeBtn) {
            closeBtn.addEventListener('click', () => modal.classList.remove('visible'));
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
        }
    }

    function initializeSmoothScroll() {
        const headerOffset = document.querySelector('header')?.offsetHeight + 20 || 90;
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            if (anchor.id === 'contact-modal-trigger' || anchor.classList.contains('letter-button')) return;
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                const target = href.length > 1 ? document.querySelector(href) : null;
                if (target) {
                    e.preventDefault();
                    if (navLinks && navLinks.classList.contains('nav-open')) navLinks.classList.remove('nav-open');
                    const offsetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                    window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                }
            });
        });
    }

    function initializeScrollIndicator() {
        const scrollIndicator = document.getElementById('scroll-indicator');
        if (!navLinks || !scrollIndicator) return;
        const checkScroll = () => {
            const isAtBottom = navLinks.scrollTop + navLinks.clientHeight >= navLinks.scrollHeight - 10;
            scrollIndicator.classList.toggle('is-hidden', isAtBottom);
        };
        navLinks.addEventListener('scroll', checkScroll);
        scrollIndicator.addEventListener('click', () => navLinks.scrollTo({ top: navLinks.scrollHeight, behavior: 'smooth' }));
    }
    
    function initializeEscapeKeyForModals() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.visible, .lightbox.visible').forEach(m => {
                    m.classList.remove('visible');
                    const video = m.querySelector('video');
                    if (video) video.pause();
                    const iframe = m.querySelector('iframe');
                    if (iframe) iframe.src = '';
                });
            }
        });
    }
});