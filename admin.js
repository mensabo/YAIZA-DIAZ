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

    // --- ELEMENTOS DEL DOM (actualizados) ---
    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const navGalleries = document.getElementById('nav-galleries');
    const navEvents = document.getElementById('nav-events');
    const galleryPanel = document.getElementById('gallery-panel');
    const eventsPanel = document.getElementById('events-panel');
    const galleryListEl = document.getElementById('gallery-list');
    const saveButton = document.getElementById('save-button');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const gallerySelector = document.getElementById('gallery-selector');
    const currentGalleryTitle = document.getElementById('current-gallery-title');
    const videoUrlInput = document.getElementById('video-url-input');
    const thumbnailUrlInput = document.getElementById('thumbnail-url-input');
    const videoDescriptionInput = document.getElementById('video-description-input');
    const addVideoButton = document.getElementById('add-video-button');
    const eventFormTitle = document.getElementById('event-form-title');
    const eventIdInput = document.getElementById('event-id-input');
    const eventButtonTextInput = document.getElementById('event-button-text-input');
    const eventTitleInput = document.getElementById('event-title-input');
    const eventTextInput = document.getElementById('event-text-input');
    const eventOrderInput = document.getElementById('event-order-input');
    const saveEventButton = document.getElementById('save-event-button');
    const cancelEditEventButton = document.getElementById('cancel-edit-event-button');
    const eventsListEl = document.getElementById('events-list');
    const saveEventOrderButton = document.getElementById('save-event-order-button');
    const eventImageUploader = document.getElementById('event-image-uploader');
    const uploadEventImagesButton = document.getElementById('upload-event-images-button');
    const eventImageLoader = document.getElementById('event-image-loader');
    const eventImagesPreviewList = document.getElementById('event-images-preview-list');
    const eventImagesDropZone = document.getElementById('event-images-drop-zone');
    const eventVideoUrlInput = document.getElementById('event-video-url-input');
    const eventThumbnailUrlInput = document.getElementById('event-thumbnail-url-input');
    const addEventVideoButton = document.getElementById('add-event-video-button');


    let gallerySortable = null;
    let eventsSortable = null;
    let eventImagesSortable = null;
    let currentCollection = 'gallery';
    let currentStoragePath = 'gallery/';

    const galleryTitles = {
        gallery: "Galería del Libro", modeling_gallery: "Galería de Modelaje",
        television_gallery: "Galería de Televisión", radio_gallery: "Galería de Radio",
        habecu_gallery: "Galería de HABECU"
    };

    // --- LÓGICA DE AUTENTICACIÓN Y NAVEGACIÓN ---
    onAuthStateChanged(auth, user => {
        if (user) {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            loadGalleries();
            loadEvents();
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
    
    navGalleries.addEventListener('click', () => switchPanel('galleries'));
    navEvents.addEventListener('click', () => switchPanel('events'));
    
    function switchPanel(panelName) {
        galleryPanel.classList.toggle('active', panelName === 'galleries');
        eventsPanel.classList.toggle('active', panelName === 'events');
        navGalleries.classList.toggle('active', panelName === 'galleries');
        navEvents.classList.toggle('active', panelName === 'events');
    }

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE GALERÍAS ---
    // ===========================================
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
                <textarea class="description-input" placeholder="Descripción...">${item.descripcion}</textarea>
                <button class="delete-button">Eliminar</button>`;
            galleryListEl.appendChild(div);
        });
        if (gallerySortable) gallerySortable.destroy();
        gallerySortable = new Sortable(galleryListEl, { animation: 150, ghostClass: 'sortable-ghost' });
    }

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', e => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    async function handleFiles(files) {
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
        if (!videoUrl || !thumbUrl || !desc) {
            alert("Por favor, completa todos los campos del vídeo.");
            return;
        }
        const currentCount = galleryListEl.querySelectorAll('.gallery-item').length;
        await addDoc(collection(db, currentCollection), {
            type: 'video', videoSrc: videoUrl,
            thumbnailSrc: thumbUrl, descripcion: desc,
            order: currentCount
        });
        videoUrlInput.value = thumbnailUrlInput.value = videoDescriptionInput.value = '';
        loadGalleries();
    });

    saveButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        const items = galleryListEl.querySelectorAll('.gallery-item');
        items.forEach((item, index) => {
            const docId = item.dataset.id;
            const newDesc = item.querySelector('.description-input').value;
            const docRef = doc(db, currentCollection, docId);
            batch.update(docRef, { order: index, descripcion: newDesc });
        });
        await batch.commit();
        alert('¡Galería guardada con éxito!');
        loadGalleries();
    });

    galleryListEl.addEventListener('click', async e => {
        if (e.target.classList.contains('delete-button')) {
            const item = e.target.closest('.gallery-item');
            const docId = item.dataset.id;
            if (confirm('¿Seguro que quieres eliminar este elemento?')) {
                await deleteDoc(doc(db, currentCollection, docId));
                loadGalleries();
            }
        }
    });

    // ===========================================
    // --- SECCIÓN DE GESTIÓN DE EVENTOS (MODIFICADA)---
    // ===========================================

    // ***** FUNCIÓN CORREGIDA *****
    function renderEventGalleryPreview(items = []) {
        if (eventImagesSortable) {
            eventImagesSortable.destroy();
            eventImagesSortable = null;
        }

        eventImagesPreviewList.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'event-image-preview-item';
            div.dataset.type = item.type;
            if (item.type === 'image') {
                div.dataset.src = item.src;
            } else {
                div.dataset.videoSrc = item.videoSrc;
                div.dataset.thumbnailSrc = item.thumbnailSrc;
            }
            
            div.innerHTML = `
                <img src="${item.type === 'image' ? item.src : item.thumbnailSrc}" alt="Previsualización">
                <span class="item-type-badge">${item.type === 'video' ? 'VÍDEO' : ''}</span>
                <button type="button" class="delete-preview-btn">&times;</button>
            `;
            eventImagesPreviewList.appendChild(div);
        });

        if (items.length > 0) {
            eventImagesSortable = new Sortable(eventImagesPreviewList, { animation: 150, ghostClass: 'sortable-ghost' });
        }
    }

    function getItemsFromPreview() {
        const items = [];
        eventImagesPreviewList.querySelectorAll('.event-image-preview-item').forEach(el => {
            const itemData = { type: el.dataset.type };
            if (itemData.type === 'image') {
                itemData.src = el.dataset.src;
            } else {
                itemData.videoSrc = el.dataset.videoSrc;
                itemData.thumbnailSrc = el.dataset.thumbnailSrc;
            }
            items.push(itemData);
        });
        return items;
    }
    
    eventImagesPreviewList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-preview-btn')) {
            e.target.parentElement.remove();
        }
    });

    async function handleEventImageUpload(files) {
        if (files.length === 0) return;
        eventImageLoader.style.display = 'block';
        uploadEventImagesButton.disabled = true;
        
        const currentItems = getItemsFromPreview();
        const newImageItems = [];

        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                const storageRef = ref(storage, `events/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                newImageItems.push({ type: 'image', src: url });
            }
            renderEventGalleryPreview([...currentItems, ...newImageItems]);
            alert(`${newImageItems.length} imagen(es) subida(s) y añadida(s) con éxito.`);
        } catch (error) {
            console.error("Error al subir imágenes:", error);
            alert("Hubo un error al subir una o más imágenes.");
        } finally {
            eventImageLoader.style.display = 'none';
            uploadEventImagesButton.disabled = false;
            eventImageUploader.value = '';
        }
    }

    addEventVideoButton.addEventListener('click', () => {
        const videoUrl = eventVideoUrlInput.value.trim();
        const thumbUrl = eventThumbnailUrlInput.value.trim();
        if (!videoUrl || !thumbUrl) {
            alert("Por favor, introduce la URL del vídeo y de su miniatura.");
            return;
        }
        
        const currentItems = getItemsFromPreview();
        const newVideoItem = {
            type: 'video',
            videoSrc: videoUrl,
            thumbnailSrc: thumbUrl
        };
        
        renderEventGalleryPreview([...currentItems, newVideoItem]);
        eventVideoUrlInput.value = '';
        eventThumbnailUrlInput.value = '';
    });


    uploadEventImagesButton.addEventListener('click', () => eventImageUploader.click());
    eventImagesDropZone.addEventListener('click', () => eventImageUploader.click());
    eventImageUploader.addEventListener('change', (e) => handleEventImageUpload(e.target.files));
    const dropZoneEvents = document.getElementById('event-images-preview-container');
    dropZoneEvents.addEventListener('dragover', (e) => { e.preventDefault(); dropZoneEvents.classList.add('drag-over'); });
    dropZoneEvents.addEventListener('dragleave', () => dropZoneEvents.classList.remove('drag-over'));
    dropZoneEvents.addEventListener('drop', (e) => { e.preventDefault(); dropZoneEvents.classList.remove('drag-over'); handleEventImageUpload(e.dataTransfer.files); });

    async function loadEvents() {
        eventsListEl.innerHTML = '<p>Cargando eventos...</p>';
        const q = query(collection(db, 'events'), orderBy('order'));
        const snapshot = await getDocs(q);
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents(events);
    }

    function renderEvents(events) {
        eventsListEl.innerHTML = '';
        if (events.length === 0) {
            eventsListEl.innerHTML = '<p>No hay eventos creados.</p>';
            return;
        }
        events.forEach(event => {
            const div = document.createElement('div');
            div.className = 'event-item';
            div.dataset.id = event.id;
            div.innerHTML = `
                <h4>${event.mainButtonText} (Orden: ${event.order})</h4>
                <div class="event-controls">
                    <button class="event-edit-button">Editar</button>
                    <button class="delete-button">Eliminar</button>
                </div>`;
            eventsListEl.appendChild(div);
        });
        if (eventsSortable) eventsSortable.destroy();
        eventsSortable = new Sortable(eventsListEl, { animation: 150, ghostClass: 'sortable-ghost' });
    }

    // ***** FUNCIÓN CORREGIDA *****
    function resetEventForm() {
        eventFormTitle.textContent = 'Crear Nuevo Evento';
        eventIdInput.value = '';
        eventButtonTextInput.value = '';
        eventTitleInput.value = '';
        eventTextInput.value = '';
        eventOrderInput.value = '';
        renderEventGalleryPreview([]); // Esto ya se encarga de destruir si es necesario
        eventVideoUrlInput.value = '';
        eventThumbnailUrlInput.value = '';
        cancelEditEventButton.style.display = 'none';
    }

    cancelEditEventButton.addEventListener('click', resetEventForm);

    saveEventButton.addEventListener('click', async () => {
        const eventId = eventIdInput.value;
        const galleryItems = getItemsFromPreview();
        
        let order = parseInt(eventOrderInput.value, 10);
        if (isNaN(order)) {
            order = eventsListEl.querySelectorAll('.event-item').length;
        }
        if (!eventButtonTextInput.value || !eventTitleInput.value || !eventTextInput.value) {
            return alert('Por favor, completa los campos de texto principales.');
        }
        const eventData = {
            mainButtonText: eventButtonTextInput.value,
            title: eventTitleInput.value,
            text: eventTextInput.value,
            galleryItems: galleryItems,
            order: order,
        };

        if (eventData.images) {
            delete eventData.images;
        }

        try {
            if (eventId) {
                await updateDoc(doc(db, 'events', eventId), eventData);
                alert('¡Evento actualizado!');
            } else {
                await addDoc(collection(db, 'events'), eventData);
                alert('¡Evento creado!');
            }
            resetEventForm();
            loadEvents();
        } catch (error) {
            console.error("Error guardando el evento:", error);
            alert('Hubo un error al guardar el evento.');
        }
    });

    eventsListEl.addEventListener('click', async e => {
        const target = e.target;
        const eventItem = target.closest('.event-item');
        if (!eventItem) return;
        const docId = eventItem.dataset.id;

        if (target.classList.contains('delete-button')) {
            if (confirm('¿Seguro que quieres eliminar este evento?')) {
                await deleteDoc(doc(db, 'events', docId));
                alert('Evento eliminado.');
                loadEvents();
            }
        } else if (target.classList.contains('event-edit-button')) {
            const docSnap = await getDoc(doc(db, 'events', docId));
            if (docSnap.exists()) {
                const data = docSnap.data();
                eventFormTitle.textContent = 'Editando Evento';
                eventIdInput.value = docId;
                eventButtonTextInput.value = data.mainButtonText;
                eventTitleInput.value = data.title;
                eventTextInput.value = data.text;
                eventOrderInput.value = data.order;
                const itemsToRender = data.galleryItems || (data.images || []).map(url => ({ type: 'image', src: url }));
                renderEventGalleryPreview(itemsToRender);
                cancelEditEventButton.style.display = 'inline-block';
                window.scrollTo({ top: eventsPanel.offsetTop, behavior: 'smooth' });
            }
        }
    });
    
    saveEventOrderButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        const items = eventsListEl.querySelectorAll('.event-item');
        items.forEach((item, index) => {
            const docRef = doc(db, 'events', item.dataset.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
        alert('¡Orden de eventos guardado!');
        loadEvents();
    });
});