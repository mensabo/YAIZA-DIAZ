// =======================================================
// 0. FOOTER COMPARTIDO
// Se inyecta aquí en vez de repetirse en las 17 páginas públicas,
// para que un cambio (redes sociales, año, etc.) se aplique a todas
// a la vez. Requiere <footer id="site-footer"></footer> vacío en el HTML.
// =======================================================
const SITE_FOOTER_HTML = `
    <div class="container">
        <div class="footer-social-icons">
            <a href="https://www.instagram.com/yaizadiaztv/?hl=es" target="_blank" rel="noopener noreferrer" aria-label="Instagram de Yaiza Díaz"><i class="fab fa-instagram"></i></a>
            <a href="https://es.linkedin.com/in/yaiza-d%C3%ADaz-51005412b" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn de Yaiza Díaz"><i class="fab fa-linkedin"></i></a>
            <a href="https://x.com/yaizadiaztv?lang=es" target="_blank" rel="noopener noreferrer" aria-label="Twitter de Yaiza Díaz"><i class="fab fa-twitter"></i></a>
        </div>
        <p class="footer-legal-links">
            <a href="aviso-legal.html">Aviso legal</a> •
            <a href="politica-privacidad.html">Política de privacidad</a> •
            <a href="politica-cookies.html">Política de cookies</a> •
            <button type="button" id="cookie-settings-trigger" class="footer-link-button">Configurar cookies</button>
        </p>
        <p>© 2024 Yaiza Díaz. Todos los derechos reservados.</p>
        <p class="developer-credit">
            Developed by
            <a href="images/chacho-creations-logo.png" class="developer-logo-link expandable-image">
                <img src="images/chacho-creations-logo.png" alt="ChachoCreations Logo" loading="lazy" width="1014" height="905">
            </a>
        </p>
    </div>
`;

// =======================================================
// 0.1 BANNER DE COOKIES PROPIO (sin CookieYes ni terceros)
// Guarda la decision del usuario en localStorage y actualiza el Google
// Consent Mode (gtag('consent','update',...)) definido inline en el
// <head> de cada pagina, que arranca en "denied" hasta que el usuario
// decide. No se inyecta en admin.html (no carga script.js).
// =======================================================
const COOKIE_CONSENT_KEY = 'cookieConsent';

const COOKIE_BANNER_HTML = `
    <div class="cookie-banner-content">
        <p>Usamos cookies propias necesarias para el funcionamiento de la web y, si lo aceptas, cookies analíticas (Google Analytics) para entender cómo se usa el sitio. Algunas páginas incrustan vídeos de YouTube que pueden instalar sus propias cookies al reproducirse. Más información en la <a href="politica-cookies.html">Política de Cookies</a>.</p>
        <div class="cookie-banner-settings" id="cookie-banner-settings" hidden>
            <label class="cookie-toggle">
                <input type="checkbox" checked disabled> Cookies necesarias (siempre activas)
            </label>
            <label class="cookie-toggle">
                <input type="checkbox" id="cookie-analytics-toggle"> Cookies analíticas (Google Analytics)
            </label>
        </div>
    </div>
    <div class="cookie-banner-actions">
        <button type="button" id="cookie-reject-all" class="cookie-btn cookie-btn-secondary">Rechazar</button>
        <button type="button" id="cookie-open-settings" class="cookie-btn cookie-btn-secondary">Configurar</button>
        <button type="button" id="cookie-save-settings" class="cookie-btn cookie-btn-secondary" hidden>Guardar preferencias</button>
        <button type="button" id="cookie-accept-all" class="cookie-btn cookie-btn-primary">Aceptar todas</button>
    </div>
`;

function getCookieConsent() {
    try {
        return JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY));
    } catch (err) {
        return null;
    }
}

function applyCookieConsent(analyticsGranted) {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        necessary: true,
        analytics: analyticsGranted,
        timestamp: Date.now()
    }));
    if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
            analytics_storage: analyticsGranted ? 'granted' : 'denied'
        });
    }
}

function initializeCookieConsent() {
    if (document.getElementById('cookie-consent-banner')) return; // ya inyectado (no debería pasar)

    const banner = document.createElement('div');
    banner.id = 'cookie-consent-banner';
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Configuración de cookies');
    banner.innerHTML = COOKIE_BANNER_HTML;
    document.body.appendChild(banner);

    const settingsPanel = document.getElementById('cookie-banner-settings');
    const analyticsToggle = document.getElementById('cookie-analytics-toggle');
    const openSettingsBtn = document.getElementById('cookie-open-settings');
    const saveSettingsBtn = document.getElementById('cookie-save-settings');
    const acceptAllBtn = document.getElementById('cookie-accept-all');
    const rejectAllBtn = document.getElementById('cookie-reject-all');

    const showBanner = (existingConsent) => {
        analyticsToggle.checked = existingConsent ? existingConsent.analytics : false;
        banner.classList.add('visible');
    };

    const hideBanner = () => banner.classList.remove('visible');

    openSettingsBtn.addEventListener('click', () => {
        settingsPanel.hidden = false;
        openSettingsBtn.hidden = true;
        saveSettingsBtn.hidden = false;
    });

    saveSettingsBtn.addEventListener('click', () => {
        applyCookieConsent(analyticsToggle.checked);
        hideBanner();
    });

    acceptAllBtn.addEventListener('click', () => {
        applyCookieConsent(true);
        hideBanner();
    });

    rejectAllBtn.addEventListener('click', () => {
        applyCookieConsent(false);
        hideBanner();
    });

    const trigger = document.getElementById('cookie-settings-trigger');
    if (trigger) {
        trigger.addEventListener('click', () => {
            settingsPanel.hidden = false;
            openSettingsBtn.hidden = true;
            saveSettingsBtn.hidden = false;
            showBanner(getCookieConsent());
        });
    }

    const stored = getCookieConsent();
    if (stored) {
        applyCookieConsent(stored.analytics); // reafirma el consent update por si gtag tardo en cargar
    } else {
        showBanner(null);
    }
}

document.addEventListener('DOMContentLoaded', () => {

    const siteFooter = document.getElementById('site-footer');
    if (siteFooter) siteFooter.innerHTML = SITE_FOOTER_HTML;

    // =======================================================
    // 1. VARIABLES GLOBALES DE LA PÁGINA
    // =======================================================
    const pageId = document.body.id || '';
    let homepageData = {};
    let lightboxItems = [];
    let currentLightboxIndex = 0;

    initializeCookieConsent();


    // =======================================================
    // 2. EL "CRISTAL PROTECTOR" DEL MENÚ MÓVIL (LA SOLUCIÓN QUE FUNCIONÓ)
    // Cubrimos el texto con una caja transparente para que el
    // móvil no intente seleccionar las líneas y anule el clic.
    // =======================================================
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navLinks = document.getElementById('nav-links');
    const body = document.body;
    let clickShield;

    if (mobileMenuToggle && navLinks) {
        
        // Restauramos el texto original
        mobileMenuToggle.innerHTML = '☰';
        mobileMenuToggle.style.position = 'relative';
        
        // Creamos el cristal protector invisible que sobresale del botón
        clickShield = document.createElement('div');
        clickShield.style.position = 'absolute';
        clickShield.style.top = '-20px';
        clickShield.style.left = '-20px';
        clickShield.style.right = '-20px';
        clickShield.style.bottom = '-20px';
        clickShield.style.zIndex = '999999';
        clickShield.style.background = 'rgba(0,0,0,0)'; // Transparente total
        clickShield.style.webkitTapHighlightColor = 'transparent'; // Mata el cuadrado azul
        clickShield.style.cursor = 'pointer';
        
        mobileMenuToggle.appendChild(clickShield);

        const toggleMenu = () => {
            const isClosed = !navLinks.classList.contains('nav-open');
            if (isClosed) {
                navLinks.classList.add('nav-open');
                body.classList.add('scroll-locked');
                
                // Mostrar la flecha indicadora
                setTimeout(() => {
                    const scrollIndicator = document.getElementById('scroll-indicator');
                    if (scrollIndicator) {
                        const isScrollable = navLinks.scrollHeight > navLinks.clientHeight;
                        const isAtBottom = navLinks.scrollTop + navLinks.clientHeight >= navLinks.scrollHeight - 10;
                        scrollIndicator.classList.toggle('is-hidden', !isScrollable || isAtBottom);
                    }
                }, 50);
            } else {
                navLinks.classList.remove('nav-open');
                body.classList.remove('scroll-locked');
            }
        };

        // Aplicamos el evento EXCLUSIVAMENTE al cristal invisible.
        const triggerMenuEvent = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            toggleMenu();
        };

        clickShield.addEventListener('touchstart', triggerMenuEvent, { passive: false });
        clickShield.addEventListener('click', triggerMenuEvent);

        window.addEventListener('resize', () => {
             if (window.innerWidth > 850 && navLinks.classList.contains('nav-open')) {
                 navLinks.classList.remove('nav-open');
                 body.classList.remove('scroll-locked');
             }
        });
        
        window.addEventListener('pageshow', () => {
            navLinks.classList.remove('nav-open');
            body.classList.remove('scroll-locked');
        });
    }

    // =======================================================
    // 3. DELEGACIÓN CENTRAL DE CLICS (VÍDEOS, LIGHTBOX, FUERA DEL MENÚ)
    // =======================================================
    document.addEventListener('click', (e) => {
        
        // A. CERRAR MENÚ AL TOCAR FUERA
        if (navLinks && navLinks.classList.contains('nav-open')) {
            if (!navLinks.contains(e.target) && e.target !== clickShield && !mobileMenuToggle.contains(e.target)) {
                navLinks.classList.remove('nav-open');
                body.classList.remove('scroll-locked');
            }
        }

        // B. VÍDEOS EN VENTANA EMERGENTE (MODAL OSCURO RESTAURADO)
        const videoTrigger = e.target.closest('.js-video-modal-trigger');
        if (videoTrigger) {
            e.preventDefault();
            e.stopPropagation();
            const url = videoTrigger.dataset.videoSrc || videoTrigger.href;
            
            if (url) {
                const iframeModal = document.getElementById('iframe-modal');
                const iframePlayer = document.getElementById('modal-iframe-player');
                
                if (iframeModal && iframePlayer) {
                    let finalUrl = url;
                    // Adaptamos YouTube para incrustar correctamente
                    if (finalUrl.includes('youtube.com/watch?v=')) {
                        finalUrl = finalUrl.replace('watch?v=', 'embed/').split('&')[0];
                    } else if (finalUrl.includes('youtu.be/')) {
                        finalUrl = finalUrl.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
                    }
                    iframePlayer.src = finalUrl;
                    iframeModal.classList.add('visible');
                } else {
                    // Respaldo por si falla el modal
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            }
            return;
        }

        // C. VISOR DE IMÁGENES SUELTAS (LIGHTBOX)
        const linkExpandable = e.target.closest('.expandable-image');
        if (linkExpandable && !linkExpandable.closest('.galeria-interactiva-container')) {
            e.preventDefault();
            const parent = linkExpandable.closest('section') || document.body;
            const siblings = Array.from(parent.querySelectorAll('.expandable-image'));
            const items = siblings.map(s => ({
                src: s.href || (s.querySelector('img') ? s.querySelector('img').src : ''),
                descripcion: s.nextElementSibling?.tagName === 'FIGCAPTION' ? s.nextElementSibling.textContent : ''
            }));
            const idx = siblings.indexOf(linkExpandable);
            openLightboxWithNavigation(idx, items);
            return;
        }

        // D. SCROLL SUAVE (ENLACES INTERNOS)
        const anchor = e.target.closest('a[href^="#"]');
        if (anchor && anchor.id !== 'contact-modal-trigger' && !anchor.classList.contains('letter-button')) {
            const href = anchor.getAttribute('href');
            const target = href.length > 1 ? document.querySelector(href) : null;
            if (target) {
                e.preventDefault();
                if (navLinks && navLinks.classList.contains('nav-open')) {
                    navLinks.classList.remove('nav-open');
                    body.classList.remove('scroll-locked');
                }
                const headerOffset = document.querySelector('header')?.offsetHeight + 20 || 90;
                const offsetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: "smooth" });
            }
        }
    });

    // =======================================================
    // 4. INICIALIZACIÓN DE INTERFAZ GENERAL
    // =======================================================
    const backToTopButton = document.getElementById('volver-arriba-btn');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) backToTopButton.classList.add('visible');
            else backToTopButton.classList.remove('visible');
        }, { passive: true });
    }

    initializeContactModal();
    initializeEscapeKeyForModals();
    initializeSidenotes();
    initializeLogoPopups();
    initializeScrollIndicator();
    initializeStandaloneLightboxSetup();
    setupVideoModalClose(); // Inicia la lógica de cierre del modal de vídeo
    initializeLazyAutoplayVideos();
    initializeShareButtons();

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


    // =======================================================
    // 5. CARGA DE BASE DE DATOS FIREBASE (AISLADA Y SEGURA)
    // =======================================================
    let db, collection, getDocs, orderBy, query, doc, getDoc, addDoc, serverTimestamp, storage, ref, uploadBytes, getDownloadURL;

    if (window.firebaseServices) {
        db = window.firebaseServices.db;
        collection = window.firebaseServices.collection;
        getDocs = window.firebaseServices.getDocs;
        orderBy = window.firebaseServices.orderBy;
        query = window.firebaseServices.query;
        doc = window.firebaseServices.doc;
        getDoc = window.firebaseServices.getDoc;
        addDoc = window.firebaseServices.addDoc;
        serverTimestamp = window.firebaseServices.serverTimestamp;
        storage = window.firebaseServices.storage;
        ref = window.firebaseServices.ref;
        uploadBytes = window.firebaseServices.uploadBytes;
        getDownloadURL = window.firebaseServices.getDownloadURL;
        
        // Ejecutamos Firebase en bloque protegido
        (async function runFirebase() {
            try {
                await loadDynamicText();

                if (pageId === 'homepage') initializeHeroSlider();
                if (pageId === 'eventosPage') loadAndRenderEventsGridPage();
                if (pageId === 'entrevistasPage') loadAndRenderInterviews();
                if (pageId === 'televisionPage') loadAndRenderTVPrograms();

                if (document.getElementById('galeria-interactiva')) initializeInteractiveGallery('galeria-interactiva', 'gallery');
                if (document.getElementById('galeria-interactiva-modelo')) initializeInteractiveGallery('galeria-interactiva-modelo', 'modeling_gallery');
                if (document.getElementById('galeria-interactiva-television')) initializeInteractiveGallery('galeria-interactiva-television', 'television_gallery');
                if (document.getElementById('galeria-interactiva-radio')) initializeInteractiveGallery('galeria-interactiva-radio', 'radio_gallery');
                if (document.getElementById('galeria-interactiva-habecu')) initializeInteractiveGallery('galeria-interactiva-habecu', 'habecu_gallery');
            } catch (err) {
                console.error("Error cargando base de datos:", err);
            }
        })();
    } else {
        console.warn("Aviso: Firebase no detectado. El menú y la interfaz funcionan correctamente.");
    }


    // =======================================================
    // 6. FUNCIONES DE FIREBASE
    // =======================================================

    async function loadDynamicText() {
        if (!pageId || !doc) return;
        try {
            const docRef = doc(db, 'pages', pageId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (pageId === 'homepage') {
                    homepageData = data;
                    const skillsContainer = document.getElementById('dynamic-skills-list');
                    if (skillsContainer) {
                        skillsContainer.innerHTML = ''; 
                        const skillsString = data.skillsList || "Presentación de programas y eventos, Locución, Guionización, Edición de vídeo, Dirección de documentales, Manejo de redes sociales, Representación de marcas / spots, Radio y TV, Gabinete de prensa, Prensa escrita";
                        const skillsArray = skillsString.split(',').map(s => s.trim()).filter(s => s !== '');
                        skillsArray.forEach(skill => {
                            const span = document.createElement('span');
                            span.textContent = skill;
                            skillsContainer.appendChild(span);
                        });
                    }
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
        const bgLayers = bgContainer.querySelectorAll('.hero-bg-layer');
        let activeLayerIndex = 0;

        // Fondos locales de respaldo por pestaña, usados mientras aun no ha
        // llegado la respuesta de Firestore/Storage con las fotos reales.
        // Se eligen tematicamente en vez de un placeholder generico.
        const HERO_FALLBACK_IMAGES = {
            '1': 'images/presentadora-bg.jpg',
            '2': 'images/eventos.jpeg',
            '3': 'images/escritora-bg.jpg'
        };

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

        let heroBgRequestId = 0;

        function setHeroBackground(imageUrl, posY) {
            // Precarga la imagen antes de iniciar el crossfade: si se activa
            // la capa nueva antes de que la imagen haya llegado, se ve el
            // fondo negro del contenedor hasta que termina de descargar.
            const requestId = ++heroBgRequestId;
            const preloader = new Image();
            const applyBackground = () => {
                if (requestId !== heroBgRequestId) return; // llegó una pestaña más nueva mientras cargaba
                const nextLayer = bgLayers[1 - activeLayerIndex];
                const currentLayer = bgLayers[activeLayerIndex];
                nextLayer.style.backgroundImage = `url('${imageUrl}')`;
                nextLayer.style.backgroundPosition = `center ${posY}`;
                nextLayer.classList.add('active');
                currentLayer.classList.remove('active');
                activeLayerIndex = 1 - activeLayerIndex;
            };
            preloader.onload = applyBackground;
            preloader.onerror = applyBackground;
            preloader.src = imageUrl;
            if (preloader.complete) applyBackground();
        }

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
                    const isMobile = window.innerWidth < 768;
                    const posY = isMobile ? (randomImageObject.posYMobile || 50) : (randomImageObject.posYDesktop || 50);
                    setHeroBackground(randomImageObject.src, `${posY}%`);
                }
            } else {
                const fallbackSrc = HERO_FALLBACK_IMAGES[heroId] || 'images/placeholder.png';
                setHeroBackground(fallbackSrc, '20%');
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
            heroDynamicSection.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
            heroDynamicSection.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, {passive: true});
        }
        
        if (Object.keys(homepageData).length > 0) {
            switchTab(0);
            resetInterval();
        } else {
            setTimeout(() => { if (Object.keys(homepageData).length > 0) { switchTab(0); resetInterval(); } }, 500);
        }
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
        } catch (error) { console.error("Error cargando eventos:", error); }
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
                card.innerHTML = `<div class="image-container"><img src="${interview.thumbnailUrl}" alt="${interview.mainTitle}" loading="lazy">${isVideo ? '<div class="video-overlay-icon"><i class="fas fa-play"></i></div>' : ''}</div><div class="media-card-text"><h4>${interview.mainTitle}</h4><p>${interview.subtitle}</p></div><button type="button" class="share-btn" data-share-title="${interview.mainTitle}" data-share-url="${interview.url}" aria-label="Compartir esta entrevista"><i class="fas fa-share-alt"></i></button>`;
                grid.appendChild(card);
            });
        } catch (error) { console.error("Error cargando entrevistas:", error); }
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
                    <a href="${program.url}" class="video-fallback js-video-modal-trigger" data-video-src="${program.url}">
                        <img src="${program.thumbnailUrl}" alt="Miniatura ${program.title}" loading="lazy">
                        <div class="play-button-overlay"><i class="fas fa-play"></i></div>
                    </a>
                `;
                container.appendChild(programDiv);
            });
        } catch (error) { console.error("Error cargando programas TV:", error); }
    }

    async function initializeInteractiveGallery(containerId, collectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const mainImage = container.querySelector('.imagen-principal');
        const mainDesc = container.querySelector('.descripcion-principal p');
        const bgImage = container.querySelector('.galeria-bg-desenfocado');
        const thumbnailsContainer = container.querySelector('.galeria-lista-miniaturas');
        if (!mainImage || !mainDesc || !bgImage || !thumbnailsContainer) return;

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

        thumbnailsContainer.addEventListener('scroll', updateThumbArrows, { passive: true });
        window.addEventListener('resize', updateThumbArrows);

        let activeItem = null;
        let galleryData = [];

        let playIcon = container.querySelector('.interactive-play-icon');
        if (!playIcon) {
            playIcon = document.createElement('div');
            playIcon.className = 'play-button-overlay interactive-play-icon js-video-modal-trigger';
            playIcon.innerHTML = '<i class="fas fa-play"></i>';
            playIcon.style.zIndex = '10';
            playIcon.style.cursor = 'pointer';
            playIcon.style.display = 'none'; 
            mainImage.parentNode.insertBefore(playIcon, mainImage.nextSibling);
        }

        const handleMediaClick = () => {
            if (!activeItem) return;
            
            if (activeItem.type === 'video') {
                const url = activeItem.videoSrc || activeItem.src;
                const iframeModal = document.getElementById('iframe-modal');
                const iframePlayer = document.getElementById('modal-iframe-player');
                
                if (iframeModal && iframePlayer && url) {
                    let finalUrl = url;
                    if (finalUrl.includes('youtube.com/watch?v=')) {
                        finalUrl = finalUrl.replace('watch?v=', 'embed/').split('&')[0];
                    } else if (finalUrl.includes('youtu.be/')) {
                        finalUrl = finalUrl.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
                    }
                    iframePlayer.src = finalUrl;
                    iframeModal.classList.add('visible');
                } else {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            } else {
                const imagesOnly = galleryData.filter(i => i.type !== 'video');
                const idx = imagesOnly.findIndex(i => i.id === activeItem.id);
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
                    const playBadge = item.type === 'video' ? '<div style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.7); color:white; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:12px; border: 1px solid rgba(255,255,255,0.5);"><i class="fas fa-play"></i></div>' : '';
                    thumbDiv.innerHTML = `<img src="${item.thumbnailSrc || item.src}" alt="Miniatura" loading="lazy">${playBadge}`;
                    thumbDiv.addEventListener('click', () => setActiveItem(item, thumbDiv));
                    thumbnailsContainer.appendChild(thumbDiv);
                });
                setActiveItem(galleryData[0], thumbnailsContainer.querySelector('.miniatura-item'));
                setTimeout(updateThumbArrows, 800);
            } else {
                mainDesc.textContent = 'No hay elementos en esta galería.';
            }

            function setActiveItem(item, thumbElement) {
                activeItem = item;
                mainImage.style.opacity = '0';
                
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


    // =======================================================
    // 7. FUNCIONES GENERALES UI (MODALES, LIGHTBOX)
    // =======================================================

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

    function updateLightboxContent() {
        const img = document.getElementById('lightbox-image');
        const caption = document.getElementById('lightbox-caption');
        
        if (!img || !lightboxItems || !lightboxItems[currentLightboxIndex]) return;

        const currentItem = lightboxItems[currentLightboxIndex];
        img.style.opacity = '0';
        
        setTimeout(() => {
            const nuevaRuta = currentItem.src || currentItem.thumbnailSrc || currentItem.videoSrc;
            const nuevoTexto = currentItem.descripcion || currentItem.description || '';
            
            img.src = nuevaRuta;
            caption.textContent = nuevoTexto;
            img.style.opacity = '1';
        }, 150);
    }

    function openLightboxWithNavigation(index, items) {
        const modal = document.getElementById('lightbox-modal');
        if (!modal || !items || items.length === 0) return;
        
        lightboxItems = items;
        currentLightboxIndex = index;
        updateLightboxContent();
        modal.classList.add('visible');
    }

    function initializeStandaloneLightboxSetup() {
        const modal = document.getElementById('lightbox-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.lightbox-close');
        const prevBtn = modal.querySelector('.lightbox-prev');
        const nextBtn = modal.querySelector('.lightbox-next');

        const changeImage = (step) => {
            if (!lightboxItems || lightboxItems.length <= 1) return;
            currentLightboxIndex = (currentLightboxIndex + step + lightboxItems.length) % lightboxItems.length;
            updateLightboxContent();
        };

        if (prevBtn) { prevBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); changeImage(-1); }; }
        if (nextBtn) { nextBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); changeImage(1); }; }
        if (closeBtn) { closeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); modal.classList.remove('visible'); }; }
        
        modal.onclick = (e) => {
            if (e.target === modal || e.target.classList.contains('lightbox-content')) {
                modal.classList.remove('visible');
            }
        };
    }

    function setupVideoModalClose() {
        const iframeModal = document.getElementById('iframe-modal');
        if (iframeModal) {
            const iframePlayer = document.getElementById('modal-iframe-player');
            const closeButtons = iframeModal.querySelectorAll('.modal-close');
            const closeModal = () => { 
                if (iframePlayer) iframePlayer.src = ''; 
                iframeModal.classList.remove('visible'); 
            };
            closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
            iframeModal.addEventListener('click', (e) => { 
                if (e.target === iframeModal) closeModal(); 
            });
        }
    }

    function initializeShareButtons() {
        document.addEventListener('click', async (e) => {
            const btn = e.target.closest('.share-btn');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();

            const url = btn.dataset.shareUrl || location.href;
            const title = btn.dataset.shareTitle
                || btn.closest('.comunicacion-section, .media-card')?.querySelector('h3, h4')?.textContent?.trim()
                || document.title;

            const fallbackShare = async () => {
                try {
                    await navigator.clipboard.writeText(url);
                    const original = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => { btn.innerHTML = original; }, 1500);
                } catch (err) {
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
                }
            };

            if (navigator.share) {
                try {
                    await navigator.share({ title, url });
                } catch (err) {
                    // AbortError: el usuario cerro el panel nativo el mismo, no es un fallo.
                    // Cualquier otro error (p.ej. API bloqueada en un iframe de preview) cae al fallback.
                    if (err && err.name !== 'AbortError') await fallbackShare();
                }
                return;
            }
            await fallbackShare();
        });
    }

    function initializeLazyAutoplayVideos() {
        // Vídeos de fondo (autoplay/loop/muted) con <source data-src="...">:
        // no se descargan hasta que entran en el viewport, para no lanzar
        // varias descargas de MP4 en paralelo al cargar la pagina (ej.
        // investigacion.html tenia 11 videos autoplay simultaneos).
        const lazyVideos = document.querySelectorAll('video > source[data-src]');
        if (!lazyVideos.length) return;

        const loadVideo = (video) => {
            video.querySelectorAll('source[data-src]').forEach(source => {
                source.src = source.dataset.src;
                source.removeAttribute('data-src');
            });
            video.load();
            video.play().catch(() => {}); // el navegador puede bloquear el autoplay; no es un error a reportar
        };

        const videos = new Set([...lazyVideos].map(source => source.closest('video')).filter(Boolean));

        if (!('IntersectionObserver' in window)) {
            videos.forEach(loadVideo);
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadVideo(entry.target);
                    obs.unobserve(entry.target);
                }
            });
        }, { rootMargin: '200px' });

        videos.forEach(video => observer.observe(video));
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
            if (!window.firebaseServices) {
                showStatus('Error de conexión a la base de datos.', 'error'); return;
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
        
        function showStatus(msg, type) {
            statusMessage.textContent = msg;
            statusMessage.className = type;
        }
    }

    function initializeContactModal() {
        const modal = document.getElementById('contact-modal');
        const openTriggers = document.querySelectorAll('#contact-modal-trigger');
        const closeButton = document.getElementById('contact-modal-close');
        if (!modal || !closeButton) return;
        const navLinks = document.getElementById('nav-links');
        const openModal = (e) => { 
            if (e) e.preventDefault(); 
            if (navLinks && navLinks.classList.contains('nav-open')) {
                navLinks.classList.remove('nav-open');
                document.body.classList.remove('scroll-locked');
            }
            modal.classList.add('visible'); 
        };
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
        if (!modal || !closeBtn) return;
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'alberto-leon-video-trigger') {
                modal.classList.add('visible');
            }
        });
        closeBtn.addEventListener('click', () => modal.classList.remove('visible'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('visible'); });
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

    function initializeSidenotes() {
        document.querySelectorAll('.sidenote-trigger').forEach(trigger => {
            const container = trigger.closest('.sidenote-container');
            if (!container) return;
            const closeBtn = container.querySelector('.sidenote-close-btn');
            trigger.addEventListener('click', (e) => { e.stopPropagation(); container.classList.add('is-sidenote-visible'); });
            if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); container.classList.remove('is-sidenote-visible'); });
        });
    }

    function initializeScrollIndicator() {
        const scrollIndicator = document.getElementById('scroll-indicator');
        const navLinks = document.getElementById('nav-links');
        if (!navLinks || !scrollIndicator) return;

        const checkScroll = () => {
            const isScrollable = navLinks.scrollHeight > navLinks.clientHeight;
            const isAtBottom = navLinks.scrollTop + navLinks.clientHeight >= navLinks.scrollHeight - 10;
            scrollIndicator.classList.toggle('is-hidden', !isScrollable || isAtBottom);
        };
        
        navLinks.addEventListener('scroll', checkScroll, { passive: true });
        scrollIndicator.addEventListener('click', () => navLinks.scrollTo({ top: navLinks.scrollHeight, behavior: 'smooth' }));
    }

    function initializeEscapeKeyForModals() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.visible, .lightbox.visible').forEach(m => {
                    m.classList.remove('visible');
                    const iframe = m.querySelector('iframe');
                    if (iframe) iframe.src = '';
                    const video = m.querySelector('video');
                    if (video) video.pause();
                });
            }
        });
    }

}); 