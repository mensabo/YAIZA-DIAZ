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

    async function initializeInteractiveGallery(containerId, collectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnailsContainer = container.querySelector('.galeria-lista-miniaturas');
        if (!mainImage || !mainDesc || !bgImage || !thumbnailsContainer) return;

        let activeItem = null;
        mainImage.addEventListener('click', () => {
            if (activeItem && activeItem.type !== 'video') {
                const lightboxModal = document.getElementById('lightbox-modal');
                const lightboxImage = document.getElementById('lightbox-image');
                const lightboxCaption = document.getElementById('lightbox-caption');
                if (lightboxModal && lightboxImage && lightboxCaption) {
                    lightboxImage.src = activeItem.src;
                    lightboxCaption.textContent = activeItem.descripcion || '';
                    lightboxModal.classList.add('visible');
                }
            }
        });
        
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
                    thumbDiv.innerHTML = `<img src="${item.thumbnailSrc || item.src}" alt="${item.descripcion || 'Miniatura'}" loading="lazy">`;
                    thumbDiv.addEventListener('click', () => setActiveItem(item, thumbDiv));
                    thumbnailsContainer.appendChild(thumbDiv);
                });
                setActiveItem(items[0], thumbnailsContainer.querySelector('.miniatura-item'));
            } else {
                mainDesc.textContent = 'No hay elementos en esta galería.';
            }

            function setActiveItem(item, thumbElement) {
                activeItem = item;
                mainImage.style.cursor = item.type !== 'video' ? 'zoom-in' : 'default';
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
        
        mainImage.addEventListener('click', () => {
            if (mainImage.src) { 
                const lightboxModal = document.getElementById('lightbox-modal');
                const lightboxImage = document.getElementById('lightbox-image');
                const lightboxCaption = document.getElementById('lightbox-caption');
                if (lightboxModal && lightboxImage && lightboxCaption) {
                    lightboxImage.src = mainImage.src;
                    lightboxCaption.textContent = mainDesc.textContent || '';
                    lightboxModal.classList.add('visible');
                }
            }
        });
    
        function setActiveItem(thumbElement) {
            const imgSrc = thumbElement.dataset.imgSrc;
            const description = thumbElement.dataset.description;
            if (!imgSrc) return;
            mainImage.style.cursor = 'zoom-in';
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
        thumbnails.forEach(thumb => thumb.addEventListener('click', () => setActiveItem(thumb)));
        if (thumbnails.length > 0) setActiveItem(thumbnails[0]);
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
            const closeModal = () => { if (iframePlayer) iframePlayer.src = ''; iframeModal.classList.remove('visible'); };
            closeModalButtons.forEach(button => button.addEventListener('click', closeModal));
            iframeModal.addEventListener('click', (e) => { if (e.target === iframeModal) closeModal(); });
        }
    }

    function initializeStandaloneLightbox() {
        const lightboxModal = document.getElementById('lightbox-modal');
        if (!lightboxModal) return;
        const lightboxImage = document.getElementById('lightbox-image');
        const lightboxCaption = document.getElementById('lightbox-caption');
        const closeButton = lightboxModal.querySelector('.lightbox-close');
        
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('.expandable-image');
            const isInsideInteractive = link && link.closest('.galeria-interactiva-container, .image-sidenote-viewer');
            if (link && !isInsideInteractive) {
                e.preventDefault();
                const captionEl = link.nextElementSibling;
                lightboxImage.src = link.href;
                lightboxCaption.textContent = (captionEl && captionEl.tagName === 'FIGCAPTION') ? captionEl.textContent : '';
                lightboxModal.classList.add('visible');
            }
        });

        const closeModal = () => lightboxModal.classList.remove('visible');
        closeButton.addEventListener('click', closeModal);
        lightboxModal.addEventListener('click', (e) => { if (e.target === lightboxModal) closeModal(); });
    }

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
            const closeModal = () => modal.classList.remove('visible');
            openBtn.addEventListener('click', (e) => { e.preventDefault(); modal.classList.add('visible'); });
            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
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
            const closeModal = () => modal.classList.remove('visible');
            closeBtn.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        }
    }

    function initializeSmoothScroll() {
        const headerOffset = document.querySelector('header')?.offsetHeight + 20 || 90;
        const performScroll = (target) => {
            if (target) {
                const offsetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        };
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            if (anchor.id === 'contact-modal-trigger') return;
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                const target = href.length > 1 ? document.querySelector(href) : null;
                if (target) {
                    e.preventDefault();
                    if (navLinks && navLinks.classList.contains('nav-open')) navLinks.classList.remove('nav-open');
                    setTimeout(() => performScroll(target), 50);
                }
            });
        });
        window.addEventListener('load', () => {
            if (window.location.hash) performScroll(document.querySelector(window.location.hash));
        });
    }

    function initializeScrollIndicator() {
        const scrollIndicator = document.getElementById('scroll-indicator');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        if (!navLinks || !scrollIndicator || !mobileMenuToggle) return;

        const checkScroll = () => {
            const isScrollable = navLinks.scrollHeight > navLinks.clientHeight;
            const isAtBottom = navLinks.scrollTop + navLinks.clientHeight >= navLinks.scrollHeight - 10;
            scrollIndicator.classList.toggle('is-hidden', !isScrollable || isAtBottom);
        };
        navLinks.addEventListener('scroll', checkScroll);
        mobileMenuToggle.addEventListener('click', () => {
            setTimeout(() => {
                scrollIndicator.classList.toggle('is-hidden', !navLinks.classList.contains('nav-open'));
                if (navLinks.classList.contains('nav-open')) checkScroll();
            }, 50); 
        });
        scrollIndicator.addEventListener('click', () => navLinks.scrollTo({ top: navLinks.scrollHeight, behavior: 'smooth' }));
    }
    
    function initializeEscapeKeyForModals() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const visibleModals = document.querySelectorAll('.modal-overlay.visible, .lightbox.visible');
                if (visibleModals.length > 0) {
                    const topModal = visibleModals[visibleModals.length - 1];
                    topModal.querySelector('.modal-close, .lightbox-close')?.click();
                }
            }
        });
    }
});