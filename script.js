// Espera a que el DOM esté completamente cargado para ejecutar el código
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
        const prevBtn = document.getElementById('prev-tab-btn');
        const nextBtn = document.getElementById('next-tab-btn');
        let currentIndex = 0;
        let slideInterval;

        function updateMobileDisplay(index) {
            if (!mobileTabTitle) return;
            
            mobileTabTitle.classList.remove('visible');
            setTimeout(() => {
                const currentTab = heroTabs[index];
                mobileTabTitle.textContent = currentTab.querySelector('h2').textContent;
                
                // Mostrar u ocultar el logo del libro
                if (currentTab.id === 'escritora-tab') {
                    mobileBookLink.classList.add('visible');
                } else {
                    mobileBookLink.classList.remove('visible');
                }
                
                mobileTabTitle.classList.add('visible');
            }, 200);
        }
        
        function showTab(index) {
            if (!heroTabs[index] || !backgroundContainer) return;

            const newBgImage = heroTabs[index].dataset.bgImage;
            const newBgPosition = heroTabs[index].dataset.bgPosition || 'center center';
            backgroundContainer.style.opacity = 0;

            setTimeout(() => {
                backgroundContainer.style.backgroundImage = `url('${newBgImage}')`;
                backgroundContainer.style.backgroundPosition = newBgPosition;
                backgroundContainer.style.opacity = 1;
            }, 300);

            const currentActiveTab = document.querySelector('.hero-tab.active');
            if (currentActiveTab) {
                currentActiveTab.classList.remove('active');
            }
            heroTabs[index].classList.add('active');
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

        // Eventos para la vista de escritorio
        heroTabs.forEach((tab, index) => {
            tab.addEventListener('click', function(event) {
                if (event.target.closest('.book-link')) {
                    return; 
                }
                event.preventDefault();
                showTab(index);
                startCarousel();
            });
        });

        // Eventos para la nueva vista móvil
        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                prevTab();
                startCarousel();
            });
            nextBtn.addEventListener('click', () => {
                nextTab();
                startCarousel();
            });
        }

        // Inicia el carrusel
        showTab(0);
        startCarousel();
    }

    // --- LÓGICA DE LA GALERÍA DINÁMICA (SOLO SE EJECUTA SI ENCUENTRA LOS ELEMENTOS EN LIBRO.HTML) ---
    async function construirGaleriaPublica() {
        const galeriaContainer = document.getElementById('galeria-interactiva');
        if (!galeriaContainer) return; // Si no encuentra la galería, no hace nada más.

        // Espera un poco para dar tiempo a que los servicios de Firebase se carguen desde el HTML
        await new Promise(resolve => setTimeout(resolve, 100)); 

        if (!window.firebaseServices) {
            console.error("Firebase no está listo en esta página.");
            return;
        }
        const { db, collection, getDocs, orderBy, query } = window.firebaseServices;

        const imagenPrincipal = document.getElementById('imagen-principal');
        const bgDesenfocado = document.getElementById('galeria-bg-desenfocado');
        const descripcionContainer = document.getElementById('descripcion-principal'); // Obtenemos el contenedor
        const descripcionParrafo = descripcionContainer.querySelector('p'); // Obtenemos el párrafo
        const miniaturasContainer = document.getElementById('galeria-lista-miniaturas');
        let visibilityTimer; // Para controlar el temporizador

        try {
            const q = query(collection(db, 'gallery'), orderBy('order'));
            const snapshot = await getDocs(q);
            const galeriaFotos = snapshot.docs.map(doc => doc.data());

            miniaturasContainer.innerHTML = ''; // Limpiamos las miniaturas
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

                    // === INICIO DE LA MODIFICACIÓN ===
                    // Limpiamos cualquier temporizador anterior
                    clearTimeout(visibilityTimer);

                    // Forzamos la visibilidad de la descripción
                    descripcionContainer.classList.add('visible-temporarily');

                    // Creamos un nuevo temporizador para ocultarla después de 2.5 segundos
                    visibilityTimer = setTimeout(() => {
                        descripcionContainer.classList.remove('visible-temporarily');
                    }, 2500);
                    // === FIN DE LA MODIFICACIÓN ===

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
                actualizarVisor(todasLasMiniaturas[0]); // Mostramos la primera imagen
            } else {
                if(descripcionParrafo) descripcionParrafo.textContent = "La galería de momentos está vacía.";
            }
        } catch (error) {
            console.error("Error al cargar la galería desde Firestore:", error);
            if(descripcionParrafo) descripcionParrafo.textContent = "No se pudo cargar la galería.";
        }
    }
    
    // Intenta construir la galería
    construirGaleriaPublica();

});
// ===============================================
//  LÓGICA PARA EL BOTÓN DE VOLVER ARRIBA
// ===============================================
document.addEventListener('DOMContentLoaded', function() {
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
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});