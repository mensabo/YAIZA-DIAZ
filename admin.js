import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query, addDoc, writeBatch, doc, deleteDoc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/9.6.7/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- INICIALIZACIÓN DE FIREBASE ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storage = getStorage(app);

    // --- ELEMENTOS GENERALES DEL DOM ---
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    
    // --- NAVEGACIÓN Y PANELES ---
    const navButtons = document.querySelectorAll('.admin-nav button');
    const panels = document.querySelectorAll('.panel');

    // --- LÓGICA DE AUTENTICACIÓN ---
    onAuthStateChanged(auth, user => {
        if (user) {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            loadGalleries();
            loadEvents();
            loadInterviews();
            loadAwards();
            loadPageTexts();
        } else {
            loginContainer.style.display = 'block';
            adminPanel.style.display = 'none';
        }
    });

    loginButton.addEventListener('click', () => {
        signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
            .catch(error => alert('Error de acceso: ' + error.message));
    });
    
    logoutButton.addEventListener('click', () => signOut(auth));
    
    // --- LÓGICA DE NAVEGACIÓN DE PANELES ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const panelId = button.id.replace('nav-', '') + '-panel';
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            panels.forEach(panel => {
                panel.classList.toggle('active', panel.id === panelId);
            });
        });
    });

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE GALERÍAS ---
    // ===========================================
    const gallerySelector = document.getElementById('gallery-selector');
    const currentGalleryTitle = document.getElementById('current-gallery-title');
    const galleryListEl = document.getElementById('gallery-list');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const videoUrlInput = document.getElementById('video-url-input');
    const thumbnailUrlInput = document.getElementById('thumbnail-url-input');
    const videoDescriptionInput = document.getElementById('video-description-input');
    const addVideoButton = document.getElementById('add-video-button');
    const saveButton = document.getElementById('save-button');
    let gallerySortable = null;
    let currentCollection = 'gallery';
    let currentStoragePath = 'gallery/';
    const galleryTitles = {
        gallery: "Galería del Libro", modeling_gallery: "Galería de Modelaje",
        television_gallery: "Galería de Televisión", radio_gallery: "Galería de Radio",
        habecu_gallery: "Galería de HABECU"
    };

    gallerySelector.addEventListener('change', (e) => {
        currentCollection = e.target.value;
        currentStoragePath = `${currentCollection}/`;
        loadGalleries();
    });

    async function loadGalleries() {
        currentGalleryTitle.textContent = `Editando: ${galleryTitles[currentCollection]}`;
        galleryListEl.innerHTML = '<p>Cargando...</p>';
        const q = query(collection(db, currentCollection), orderBy('order'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGallery(items);
    }

    function renderGallery(items) {
        galleryListEl.innerHTML = '';
        if (items.length === 0) galleryListEl.innerHTML = '<p>No hay elementos.</p>';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.dataset.id = item.id;
            div.innerHTML = `
                <img src="${item.thumbnailSrc || item.src}" alt="miniatura">
                <span class="item-type-badge">${item.type === 'video' ? 'VÍDEO' : 'IMAGEN'}</span>
                <textarea class="description-input" placeholder="Descripción...">${item.descripcion || ''}</textarea>
                <button class="delete-button">Eliminar</button>`;
            galleryListEl.appendChild(div);
        });
        if (gallerySortable) gallerySortable.destroy();
        gallerySortable = new Sortable(galleryListEl, { animation: 150, ghostClass: 'sortable-ghost' });
    }

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', e => { e.preventDefault(); handleGalleryImageUpload(e.dataTransfer.files); });
    fileInput.addEventListener('change', e => handleGalleryImageUpload(e.target.files));

    async function handleGalleryImageUpload(files) {
        const currentCount = galleryListEl.querySelectorAll('.gallery-item').length;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageRef = ref(storage, `${currentStoragePath}${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await addDoc(collection(db, currentCollection), {
                type: 'image', src: url, descripcion: "Nueva imagen", order: currentCount + i
            });
        }
        loadGalleries();
    }
    
    addVideoButton.addEventListener('click', async () => {
        const videoUrl = videoUrlInput.value.trim();
        const thumbUrl = thumbnailUrlInput.value.trim();
        const desc = videoDescriptionInput.value.trim();
        if (!videoUrl || !thumbUrl || !desc) return alert("Por favor, completa todos los campos del vídeo.");
        const currentCount = galleryListEl.querySelectorAll('.gallery-item').length;
        await addDoc(collection(db, currentCollection), {
            type: 'video', videoSrc: videoUrl, thumbnailSrc: thumbUrl, descripcion: desc, order: currentCount
        });
        videoUrlInput.value = thumbnailUrlInput.value = videoDescriptionInput.value = '';
        loadGalleries();
    });

    saveButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        galleryListEl.querySelectorAll('.gallery-item').forEach((item, index) => {
            const docRef = doc(db, currentCollection, item.dataset.id);
            batch.update(docRef, { order: index, descripcion: item.querySelector('.description-input').value });
        });
        await batch.commit();
        alert('¡Galería guardada con éxito!');
        loadGalleries();
    });

    galleryListEl.addEventListener('click', async e => {
        if (e.target.classList.contains('delete-button')) {
            const item = e.target.closest('.gallery-item');
            if (confirm('¿Seguro que quieres eliminar este elemento?')) {
                await deleteDoc(doc(db, currentCollection, item.dataset.id));
                loadGalleries();
            }
        }
    });

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE EVENTOS ---
    // ===========================================
    const eventsListEl = document.getElementById('events-list');
    const eventFormTitle = document.getElementById('event-form-title');
    const eventIdInput = document.getElementById('event-id-input');
    const eventButtonTextInput = document.getElementById('event-button-text-input');
    const eventTitleInput = document.getElementById('event-title-input');
    const eventTextInput = document.getElementById('event-text-input');
    const eventOrderInput = document.getElementById('event-order-input');
    const saveEventButton = document.getElementById('save-event-button');
    const cancelEditEventButton = document.getElementById('cancel-edit-event-button');
    const saveEventOrderButton = document.getElementById('save-event-order-button');
    const eventImagesPreviewList = document.getElementById('event-images-preview-list');
    const eventImagesDropZone = document.getElementById('event-images-drop-zone');
    const eventImageUploader = document.getElementById('event-image-uploader');
    const addEventVideoButton = document.getElementById('add-event-video-button');
    const eventVideoUrlInput = document.getElementById('event-video-url-input');
    const eventThumbnailUrlInput = document.getElementById('event-thumbnail-url-input');
    let eventsSortable = null;
    let eventImagesSortable = null;

    async function loadEvents() { /* ... Lógica de carga ... */ }
    function renderEvents(events) { /* ... Lógica de renderizado ... */ }
    function resetEventForm() { /* ... Lógica de reseteo ... */ }
    // (Incluyo el código completo abajo)

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE ENTREVISTAS ---
    // ===========================================
    const interviewsListEl = document.getElementById('interviews-list');
    const interviewFormTitle = document.getElementById('interview-form-title');
    const interviewIdInput = document.getElementById('interview-id-input');
    const interviewMainTitleInput = document.getElementById('interview-main-title-input');
    const interviewSubtitleInput = document.getElementById('interview-subtitle-input');
    const interviewUrlInput = document.getElementById('interview-url-input');
    const interviewOrderInput = document.getElementById('interview-order-input');
    const interviewImagePreview = document.getElementById('interview-image-preview');
    const interviewImageDropZone = document.getElementById('interview-image-drop-zone');
    const interviewImageUploader = document.getElementById('interview-image-uploader');
    const saveInterviewButton = document.getElementById('save-interview-button');
    const cancelEditInterviewButton = document.getElementById('cancel-edit-interview-button');
    const saveInterviewOrderButton = document.getElementById('save-interview-order-button');
    let interviewsSortable = null;
    let interviewThumbnailUrl = '';

    async function loadInterviews() { /* ... Lógica de carga ... */ }
    function renderInterviews(interviews) { /* ... Lógica de renderizado ... */ }
    function resetInterviewForm() { /* ... Lógica de reseteo ... */ }
    // (Incluyo el código completo abajo)

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE PREMIOS ---
    // ===========================================
    const awardsListEl = document.getElementById('awards-list');
    const awardFormTitle = document.getElementById('award-form-title');
    const awardIdInput = document.getElementById('award-id-input');
    const awardTitleInput = document.getElementById('award-title-input');
    const awardTextInput = document.getElementById('award-text-input');
    const awardOrderInput = document.getElementById('award-order-input');
    const saveAwardButton = document.getElementById('save-award-button');
    const cancelEditAwardButton = document.getElementById('cancel-edit-award-button');
    const saveAwardOrderButton = document.getElementById('save-award-order-button');
    const awardImagesPreviewList = document.getElementById('award-images-preview-list');
    const awardImagesDropZone = document.getElementById('award-images-drop-zone');
    const awardImageUploader = document.getElementById('award-image-uploader');
    const addAwardVideoButton = document.getElementById('add-award-video-button');
    const awardVideoUrlInput = document.getElementById('award-video-url-input');
    const awardThumbnailUrlInput = document.getElementById('award-thumbnail-url-input');
    let awardsSortable = null;
    let awardImagesSortable = null;

    async function loadAwards() { /* ... Lógica de carga ... */ }
    function renderAwards(awards) { /* ... Lógica de renderizado ... */ }
    function resetAwardForm() { /* ... Lógica de reseteo ... */ }
    // (Incluyo el código completo abajo)

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE TEXTOS ---
    // ===========================================
    const pageSelector = document.getElementById('page-selector');
    const textFieldsContainer = document.getElementById('text-fields-container');
    const saveTextsButton = document.getElementById('save-texts-button');

    async function loadPageTexts() {
        const pageId = pageSelector.value;
        if (!pageId) return;
        textFieldsContainer.innerHTML = '<p>Cargando textos...</p>';
        try {
            const docRef = doc(db, 'pages', pageId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                textFieldsContainer.innerHTML = '';
                Object.keys(data).sort().forEach(key => {
                    const value = data[key];
                    const fieldWrapper = document.createElement('div');
                    fieldWrapper.className = 'form-section';
                    const label = document.createElement('label');
                    label.className = 'input-label';
                    label.textContent = key;
                    const isLongText = value.length > 100 || value.includes('<');
                    const inputElement = isLongText ? document.createElement('textarea') : document.createElement('input');
                    inputElement.dataset.key = key;
                    inputElement.value = value;
                    if (isLongText) inputElement.rows = 5;
                    fieldWrapper.appendChild(label);
                    fieldWrapper.appendChild(inputElement);
                    textFieldsContainer.appendChild(fieldWrapper);
                });
            } else {
                textFieldsContainer.innerHTML = `<p>No se encontró el documento '${pageId}'. Puedes crear uno guardando textos.</p>`;
            }
        } catch (error) {
            textFieldsContainer.innerHTML = '<p>Error al cargar los textos.</p>';
        }
    }

    async function savePageTexts() {
        const pageId = pageSelector.value;
        if (!pageId) return;
        const dataToUpdate = {};
        textFieldsContainer.querySelectorAll('input, textarea').forEach(input => {
            dataToUpdate[input.dataset.key] = input.value;
        });
        try {
            await setDoc(doc(db, 'pages', pageId), dataToUpdate, { merge: true });
            alert('¡Textos guardados con éxito!');
        } catch (error) {
            alert("Hubo un error al guardar los textos.");
        }
    }

    pageSelector.addEventListener('change', loadPageTexts);
    saveTextsButton.addEventListener('click', savePageTexts);

    // ===========================================
    // --- IMPLEMENTACIÓN COMPLETA DE EVENTOS ---
    // ===========================================
    
    // Funciones de ayuda para la galería de eventos
    function getItemsFromEventPreview() {
        const items = [];
        eventImagesPreviewList.querySelectorAll('.preview-item').forEach(el => {
            const description = el.querySelector('.description-input').value;
            const itemData = { type: el.dataset.type, description };
            if (itemData.type === 'image') itemData.src = el.dataset.src;
            else {
                itemData.videoSrc = el.dataset.videoSrc;
                itemData.thumbnailSrc = el.dataset.thumbnailSrc;
            }
            items.push(itemData);
        });
        return items;
    }

    function renderEventGalleryPreview(items = []) {
        if (eventImagesSortable) eventImagesSortable.destroy();
        eventImagesPreviewList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.dataset.type = item.type;
            if (item.type === 'image') div.dataset.src = item.src;
            else {
                div.dataset.videoSrc = item.videoSrc;
                div.dataset.thumbnailSrc = item.thumbnailSrc;
            }
            div.innerHTML = `
                <img src="${item.thumbnailSrc || item.src}" alt="Previsualización">
                <span class="item-type-badge">${item.type === 'video' ? 'VÍDEO' : 'IMAGEN'}</span>
                <textarea class="description-input" placeholder="Descripción...">${item.description || ''}</textarea>
                <button type="button" class="delete-button">Eliminar</button>`;
            eventImagesPreviewList.appendChild(div);
        });
        eventImagesSortable = new Sortable(eventImagesPreviewList, { animation: 150, ghostClass: 'sortable-ghost' });
    }

    async function handleEventImageUpload(files) {
        eventImagesDropZone.querySelector('p').textContent = 'Subiendo...';
        const currentItems = getItemsFromEventPreview();
        const newItems = [];
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            const storageRef = ref(storage, `events/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            newItems.push({ type: 'image', src: url, description: '' });
        }
        renderEventGalleryPreview([...currentItems, ...newItems]);
        eventImagesDropZone.querySelector('p').textContent = 'Arrastra imágenes aquí o haz clic para subirlas';
        eventImageUploader.value = '';
    }

    // Lógica principal de Eventos
    loadEvents = async () => {
        eventsListEl.innerHTML = '<p>Cargando eventos...</p>';
        const q = query(collection(db, 'events'), orderBy('order'));
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents(events);
    };

    renderEvents = (events) => {
        eventsListEl.innerHTML = '';
        if (events.length === 0) eventsListEl.innerHTML = '<p>No hay eventos creados.</p>';
        events.forEach(event => {
            const div = document.createElement('div');
            div.className = 'event-item';
            div.dataset.id = event.id;
            div.innerHTML = `<h4>${event.mainButtonText} (Orden: ${event.order})</h4><div class="event-controls"><button class="event-edit-button">Editar</button><button class="delete-button">Eliminar</button></div>`;
            eventsListEl.appendChild(div);
        });
        if (eventsSortable) eventsSortable.destroy();
        eventsSortable = new Sortable(eventsListEl, { animation: 150, ghostClass: 'sortable-ghost' });
    };
    
    resetEventForm = () => {
        eventFormTitle.textContent = 'Crear Nuevo Evento';
        eventIdInput.value = '';
        eventButtonTextInput.value = '';
        eventTitleInput.value = '';
        eventTextInput.value = '';
        eventOrderInput.value = '';
        renderEventGalleryPreview([]);
        eventVideoUrlInput.value = '';
        eventThumbnailUrlInput.value = '';
        cancelEditEventButton.style.display = 'none';
    };
    
    eventImagesDropZone.addEventListener('click', () => eventImageUploader.click());
    eventImageUploader.addEventListener('change', e => handleEventImageUpload(e.target.files));
    eventImagesDropZone.addEventListener('dragover', e => e.preventDefault());
    eventImagesDropZone.addEventListener('drop', e => { e.preventDefault(); handleEventImageUpload(e.dataTransfer.files); });
    addEventVideoButton.addEventListener('click', () => {
        const videoUrl = eventVideoUrlInput.value.trim();
        const thumbUrl = eventThumbnailUrlInput.value.trim();
        if (!videoUrl || !thumbUrl) return alert("Introduce la URL del vídeo y de su miniatura.");
        renderEventGalleryPreview([...getItemsFromEventPreview(), { type: 'video', videoSrc: videoUrl, thumbnailSrc: thumbUrl, description: '' }]);
        eventVideoUrlInput.value = '';
        eventThumbnailUrlInput.value = '';
    });
    eventImagesPreviewList.addEventListener('click', e => { if (e.target.classList.contains('delete-button')) e.target.closest('.preview-item').remove(); });
    cancelEditEventButton.addEventListener('click', resetEventForm);

    saveEventButton.addEventListener('click', async () => {
        const eventId = eventIdInput.value;
        const order = parseInt(eventOrderInput.value) || 0;
        const eventData = {
            mainButtonText: eventButtonTextInput.value,
            title: eventTitleInput.value,
            text: eventTextInput.value,
            galleryItems: getItemsFromEventPreview(),
            order
        };
        if (!eventData.mainButtonText || !eventData.title) return alert('Completa al menos el texto del botón y el título.');
        
        if (eventId) await updateDoc(doc(db, 'events', eventId), eventData);
        else await addDoc(collection(db, 'events'), eventData);
        
        alert('¡Evento guardado!');
        resetEventForm();
        loadEvents();
    });

    eventsListEl.addEventListener('click', async e => {
        const item = e.target.closest('.event-item');
        if (!item) return;
        const docId = item.dataset.id;

        if (e.target.classList.contains('delete-button')) {
            if (confirm('¿Seguro que quieres eliminar este evento?')) {
                await deleteDoc(doc(db, 'events', docId));
                loadEvents();
            }
        } else if (e.target.classList.contains('event-edit-button')) {
            const docSnap = await getDoc(doc(db, 'events', docId));
            const data = docSnap.data();
            eventFormTitle.textContent = 'Editando Evento';
            eventIdInput.value = docId;
            eventButtonTextInput.value = data.mainButtonText;
            eventTitleInput.value = data.title;
            eventTextInput.value = data.text;
            eventOrderInput.value = data.order;
            renderEventGalleryPreview(data.galleryItems || []);
            cancelEditEventButton.style.display = 'inline-block';
            item.scrollIntoView({ behavior: 'smooth' });
        }
    });

    saveEventOrderButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        eventsListEl.querySelectorAll('.event-item').forEach((item, index) => {
            batch.update(doc(db, 'events', item.dataset.id), { order: index });
        });
        await batch.commit();
        alert('¡Orden guardado!');
        loadEvents();
    });

    // ===========================================
    // --- IMPLEMENTACIÓN COMPLETA DE ENTREVISTAS ---
    // ===========================================
    loadInterviews = async () => {
        interviewsListEl.innerHTML = '<p>Cargando entrevistas...</p>';
        const q = query(collection(db, 'interviews'), orderBy('order'));
        const snapshot = await getDocs(q);
        renderInterviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    renderInterviews = (interviews) => {
        interviewsListEl.innerHTML = '';
        if (interviews.length === 0) interviewsListEl.innerHTML = '<p>No hay entrevistas creadas.</p>';
        interviews.forEach(interview => {
            const div = document.createElement('div');
            div.className = 'interview-item';
            div.dataset.id = interview.id;
            div.innerHTML = `<h4>${interview.mainTitle}</h4><div class="interview-controls"><button class="interview-edit-button">Editar</button><button class="delete-button">Eliminar</button></div>`;
            interviewsListEl.appendChild(div);
        });
        if (interviewsSortable) interviewsSortable.destroy();
        interviewsSortable = new Sortable(interviewsListEl, { animation: 150, ghostClass: 'sortable-ghost' });
    };
    
    resetInterviewForm = () => {
        interviewFormTitle.textContent = 'Añadir Nueva Entrevista';
        interviewIdInput.value = '';
        interviewMainTitleInput.value = '';
        interviewSubtitleInput.value = '';
        interviewUrlInput.value = '';
        interviewOrderInput.value = '';
        interviewImagePreview.innerHTML = '';
        interviewThumbnailUrl = '';
        cancelEditInterviewButton.style.display = 'none';
    };
    
    async function handleInterviewImageUpload(file) {
        if (!file) return;
        interviewImageDropZone.querySelector('p').textContent = 'Subiendo...';
        const storageRef = ref(storage, `interviews/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        interviewThumbnailUrl = await getDownloadURL(storageRef);
        interviewImagePreview.innerHTML = `<div class="preview-item"><img src="${interviewThumbnailUrl}" alt="miniatura"><button type="button" class="delete-button">Quitar</button></div>`;
        interviewImageDropZone.querySelector('p').textContent = 'Arrastra una imagen o haz clic';
    }

    interviewImageDropZone.addEventListener('click', () => interviewImageUploader.click());
    interviewImageUploader.addEventListener('change', e => handleInterviewImageUpload(e.target.files[0]));
    interviewImageDropZone.addEventListener('dragover', e => e.preventDefault());
    interviewImageDropZone.addEventListener('drop', e => { e.preventDefault(); handleInterviewImageUpload(e.dataTransfer.files[0]); });
    interviewImagePreview.addEventListener('click', e => { if (e.target.classList.contains('delete-button')) resetInterviewForm(); });
    cancelEditInterviewButton.addEventListener('click', resetInterviewForm);

    saveInterviewButton.addEventListener('click', async () => {
        const interviewId = interviewIdInput.value;
        const order = parseInt(interviewOrderInput.value) || 0;
        const interviewData = {
            mainTitle: interviewMainTitleInput.value,
            subtitle: interviewSubtitleInput.value,
            url: interviewUrlInput.value,
            thumbnailUrl: interviewThumbnailUrl,
            order
        };
        if (!interviewData.mainTitle || !interviewData.url || !interviewData.thumbnailUrl) return alert('Completa todos los campos, incluida la imagen.');
        
        if (interviewId) await updateDoc(doc(db, 'interviews', interviewId), interviewData);
        else await addDoc(collection(db, 'interviews'), interviewData);

        alert('¡Entrevista guardada!');
        resetInterviewForm();
        loadInterviews();
    });

    interviewsListEl.addEventListener('click', async e => {
        const item = e.target.closest('.interview-item');
        if (!item) return;
        const docId = item.dataset.id;

        if (e.target.classList.contains('delete-button')) {
            if (confirm('¿Seguro que quieres eliminar esta entrevista?')) {
                await deleteDoc(doc(db, 'interviews', docId));
                loadInterviews();
            }
        } else if (e.target.classList.contains('interview-edit-button')) {
            const docSnap = await getDoc(doc(db, 'interviews', docId));
            const data = docSnap.data();
            interviewFormTitle.textContent = 'Editando Entrevista';
            interviewIdInput.value = docId;
            interviewMainTitleInput.value = data.mainTitle;
            interviewSubtitleInput.value = data.subtitle;
            interviewUrlInput.value = data.url;
            interviewOrderInput.value = data.order;
            interviewThumbnailUrl = data.thumbnailUrl;
            interviewImagePreview.innerHTML = `<div class="preview-item"><img src="${interviewThumbnailUrl}" alt="miniatura"><button type="button" class="delete-button">Quitar</button></div>`;
            cancelEditInterviewButton.style.display = 'inline-block';
            item.scrollIntoView({ behavior: 'smooth' });
        }
    });

    saveInterviewOrderButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        interviewsListEl.querySelectorAll('.interview-item').forEach((item, index) => {
            batch.update(doc(db, 'interviews', item.dataset.id), { order: index });
        });
        await batch.commit();
        alert('¡Orden guardado!');
        loadInterviews();
    });

    // ===========================================
    // --- IMPLEMENTACIÓN COMPLETA DE PREMIOS ---
    // ===========================================
    const awardLogic = (() => {
        function getItemsFromPreview() {
            const items = [];
            awardImagesPreviewList.querySelectorAll('.preview-item').forEach(el => {
                const description = el.querySelector('.description-input').value;
                const itemData = { type: el.dataset.type, description };
                if (itemData.type === 'image') itemData.src = el.dataset.src;
                else {
                    itemData.videoSrc = el.dataset.videoSrc;
                    itemData.thumbnailSrc = el.dataset.thumbnailSrc;
                }
                items.push(itemData);
            });
            return items;
        }

        function renderPreview(items = []) {
            if (awardImagesSortable) awardImagesSortable.destroy();
            awardImagesPreviewList.innerHTML = '';
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.dataset.type = item.type;
                if (item.type === 'image') div.dataset.src = item.src;
                else {
                    div.dataset.videoSrc = item.videoSrc;
                    div.dataset.thumbnailSrc = item.thumbnailSrc;
                }
                div.innerHTML = `
                    <img src="${item.thumbnailSrc || item.src}" alt="Previsualización">
                    <span class="item-type-badge">${item.type === 'video' ? 'VÍDEO' : 'IMAGEN'}</span>
                    <textarea class="description-input" placeholder="Descripción...">${item.description || ''}</textarea>
                    <button type="button" class="delete-button">Eliminar</button>`;
                awardImagesPreviewList.appendChild(div);
            });
            awardImagesSortable = new Sortable(awardImagesPreviewList, { animation: 150, ghostClass: 'sortable-ghost' });
        }

        async function handleImageUpload(files) {
            awardImagesDropZone.querySelector('p').textContent = 'Subiendo...';
            const currentItems = getItemsFromPreview();
            const newItems = [];
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                const storageRef = ref(storage, `awards/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                newItems.push({ type: 'image', src: url, description: '' });
            }
            renderPreview([...currentItems, ...newItems]);
            awardImagesDropZone.querySelector('p').textContent = 'Arrastra imágenes aquí o haz clic';
            awardImageUploader.value = '';
        }

        return { getItemsFromPreview, renderPreview, handleImageUpload };
    })();

    loadAwards = async () => {
        awardsListEl.innerHTML = '<p>Cargando premios...</p>';
        const q = query(collection(db, 'awards'), orderBy('order'));
        const snapshot = await getDocs(q);
        renderAwards(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    };

    renderAwards = (awards) => {
        awardsListEl.innerHTML = '';
        if (awards.length === 0) awardsListEl.innerHTML = '<p>No hay premios creados.</p>';
        awards.forEach(award => {
            const div = document.createElement('div');
            div.className = 'award-item';
            div.dataset.id = award.id;
            div.innerHTML = `<h4>${award.title} (Orden: ${award.order})</h4><div class="award-controls"><button class="award-edit-button">Editar</button><button class="delete-button">Eliminar</button></div>`;
            awardsListEl.appendChild(div);
        });
        if (awardsSortable) awardsSortable.destroy();
        awardsSortable = new Sortable(awardsListEl, { animation: 150, ghostClass: 'sortable-ghost' });
    };

    resetAwardForm = () => {
        awardFormTitle.textContent = 'Añadir Nuevo Premio';
        awardIdInput.value = '';
        awardTitleInput.value = '';
        awardTextInput.value = '';
        awardOrderInput.value = '';
        awardLogic.renderPreview([]);
        cancelEditAwardButton.style.display = 'none';
    };

    awardImagesDropZone.addEventListener('click', () => awardImageUploader.click());
    awardImageUploader.addEventListener('change', e => awardLogic.handleImageUpload(e.target.files));
    awardImagesDropZone.addEventListener('dragover', e => e.preventDefault());
    awardImagesDropZone.addEventListener('drop', e => { e.preventDefault(); awardLogic.handleImageUpload(e.dataTransfer.files); });
    addAwardVideoButton.addEventListener('click', () => {
        const videoUrl = awardVideoUrlInput.value.trim();
        const thumbUrl = awardThumbnailUrlInput.value.trim();
        if (!videoUrl || !thumbUrl) return alert("Introduce la URL del vídeo y de su miniatura.");
        awardLogic.renderPreview([...awardLogic.getItemsFromPreview(), { type: 'video', videoSrc: videoUrl, thumbnailSrc: thumbUrl, description: '' }]);
        awardVideoUrlInput.value = '';
        awardThumbnailUrlInput.value = '';
    });
    awardImagesPreviewList.addEventListener('click', e => { if (e.target.classList.contains('delete-button')) e.target.closest('.preview-item').remove(); });
    cancelEditAwardButton.addEventListener('click', resetAwardForm);

    saveAwardButton.addEventListener('click', async () => {
        const awardId = awardIdInput.value;
        const order = parseInt(awardOrderInput.value) || 0;
        const awardData = {
            title: awardTitleInput.value,
            text: awardTextInput.value,
            galleryItems: awardLogic.getItemsFromPreview(),
            order
        };
        if (!awardData.title) return alert('El premio debe tener un título.');
        
        if (awardId) await updateDoc(doc(db, 'awards', awardId), awardData);
        else await addDoc(collection(db, 'awards'), awardData);

        alert('¡Premio guardado!');
        resetAwardForm();
        loadAwards();
    });

    awardsListEl.addEventListener('click', async e => {
        const item = e.target.closest('.award-item');
        if (!item) return;
        const docId = item.dataset.id;

        if (e.target.classList.contains('delete-button')) {
            if (confirm('¿Seguro que quieres eliminar este premio?')) {
                await deleteDoc(doc(db, 'awards', docId));
                loadAwards();
            }
        } else if (e.target.classList.contains('award-edit-button')) {
            const docSnap = await getDoc(doc(db, 'awards', docId));
            const data = docSnap.data();
            awardFormTitle.textContent = 'Editando Premio';
            awardIdInput.value = docId;
            awardTitleInput.value = data.title;
            awardTextInput.value = data.text;
            awardOrderInput.value = data.order;
            awardLogic.renderPreview(data.galleryItems || []);
            cancelEditAwardButton.style.display = 'inline-block';
            item.scrollIntoView({ behavior: 'smooth' });
        }
    });

    saveAwardOrderButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        awardsListEl.querySelectorAll('.award-item').forEach((item, index) => {
            batch.update(doc(db, 'awards', item.dataset.id), { order: index });
        });
        await batch.commit();
        alert('¡Orden guardado!');
        loadAwards();
    });
});