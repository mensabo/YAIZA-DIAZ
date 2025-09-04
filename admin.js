document.addEventListener('DOMContentLoaded', () => {
    const services = window.firebaseServices;
    if (!services) {
        console.error("Los servicios de Firebase no se han cargado.");
        return;
    }

    const { auth, db, storage, signInWithEmailAndPassword, onAuthStateChanged, signOut, collection, getDocs, orderBy, query, addDoc, writeBatch, doc, deleteDoc, getDoc, ref, uploadBytes, getDownloadURL, deleteObject } = services;

    const loginContainer = document.getElementById('login-container');
    const adminPanel = document.getElementById('admin-panel');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const galleryList = document.getElementById('gallery-list');
    const saveButton = document.getElementById('save-button');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const gallerySelector = document.getElementById('gallery-selector');
    const currentGalleryTitle = document.getElementById('current-gallery-title');
    const videoUrlInput = document.getElementById('video-url-input');
    const thumbnailUrlInput = document.getElementById('thumbnail-url-input');
    const videoDescriptionInput = document.getElementById('video-description-input');
    const addVideoButton = document.getElementById('add-video-button');

    let sortableInstance = null;
    let currentCollection = 'gallery';
    let currentStoragePath = 'gallery/';

    const galleryTitles = {
        gallery: "Galería del Libro",
        modeling_gallery: "Galería de Modelaje",
        television_gallery: "Galería de Televisión",
        radio_gallery: "Galería de Radio",
        habecu_gallery: "Galería de HABECU"
    };

    gallerySelector.addEventListener('change', (e) => {
        currentCollection = e.target.value;
        currentStoragePath = `${currentCollection}/`;
        updateAdminUI();
        loadGallery();
    });

    function updateAdminUI() {
        currentGalleryTitle.textContent = `Editando: ${galleryTitles[currentCollection]}`;
    }

    onAuthStateChanged(auth, user => {
        if (user) {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
            updateAdminUI();
            loadGallery();
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

    async function loadGallery() {
        galleryList.innerHTML = '<p>Cargando...</p>';
        const q = query(collection(db, currentCollection), orderBy('order'));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGallery(items);
    }

    function renderGallery(items) {
        galleryList.innerHTML = '';
        if (items.length === 0) {
            galleryList.innerHTML = '<p>No hay elementos. ¡Sube imágenes o añade vídeos!</p>';
        }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.dataset.id = item.id;

            if (item.type === 'video') {
                div.innerHTML = `
                    <div class="item-preview video-preview">
                        <img src="${item.thumbnailSrc}" alt="Miniatura">
                        <span>VÍDEO</span>
                    </div>
                    <textarea class="description-input" placeholder="Descripción...">${item.descripcion}</textarea>
                    <button class="delete-button">Eliminar</button>`;
            } else {
                div.innerHTML = `
                    <div class="item-preview">
                        <img src="${item.src}" alt="${item.descripcion}">
                    </div>
                    <textarea class="description-input" placeholder="Descripción...">${item.descripcion}</textarea>
                    <button class="delete-button">Eliminar</button>`;
            }
            galleryList.appendChild(div);
        });
        
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(galleryList, { animation: 150 });
    }

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', e => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    async function handleFiles(files) {
        const currentCount = galleryList.querySelectorAll('.gallery-item').length;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageRef = ref(storage, `${currentStoragePath}${Date.now()}_${file.name}`);
            
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            await addDoc(collection(db, currentCollection), {
                type: 'image',
                src: url,
                descripcion: "Nueva imagen",
                order: currentCount + i
            });
        }
        loadGallery();
    }

    addVideoButton.addEventListener('click', async () => {
        const videoSrc = videoUrlInput.value.trim();
        const thumbnailSrc = thumbnailUrlInput.value.trim();
        const descripcion = videoDescriptionInput.value.trim();

        if (!videoSrc || !thumbnailSrc || !descripcion) {
            return alert('Por favor, completa todos los campos para el vídeo.');
        }
        const currentCount = galleryList.querySelectorAll('.gallery-item').length;
        
        await addDoc(collection(db, currentCollection), {
            type: 'video',
            videoSrc,
            thumbnailSrc,
            descripcion,
            order: currentCount
        });
        
        videoUrlInput.value = '';
        thumbnailUrlInput.value = '';
        videoDescriptionInput.value = '';
        loadGallery();
        alert('¡Vídeo añadido!');
    });

    saveButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        galleryList.querySelectorAll('.gallery-item').forEach((item, index) => {
            const docRef = doc(db, currentCollection, item.dataset.id);
            batch.update(docRef, {
                descripcion: item.querySelector('.description-input').value,
                order: index
            });
        });
        
        await batch.commit();
        alert('¡Cambios guardados!');
    });

    galleryList.addEventListener('click', async e => {
        if (e.target.classList.contains('delete-button')) {
            if (!confirm('¿Seguro que quieres eliminar este elemento?')) return;
            
            const itemElement = e.target.closest('.gallery-item');
            const docId = itemElement.dataset.id;
            const docRef = doc(db, currentCollection, docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const itemData = docSnap.data();
                // Si es una imagen (no un vídeo), intenta borrarla del Storage
                if (itemData.type !== 'video' && itemData.src) {
                    try {
                        const storageRef = ref(storage, itemData.src);
                        await deleteObject(storageRef);
                    } catch (error) {
                        console.warn("No se pudo eliminar el archivo de Storage (puede que sea un enlace externo o ya no exista):", error);
                    }
                }
            }

            await deleteDoc(docRef);
            itemElement.remove();
            alert('Elemento eliminado.');
        }
    });
});