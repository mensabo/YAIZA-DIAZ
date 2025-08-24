// Espera a que los servicios de Firebase estén listos en la ventana
document.addEventListener('DOMContentLoaded', () => {
    const services = window.firebaseServices;
    if (!services) {
        console.error("Los servicios de Firebase no se han cargado.");
        return;
    }

    // --- DESESTRUCTURAMOS LOS SERVICIOS ---
    const { auth, signInWithEmailAndPassword, onAuthStateChanged, signOut } = services;
    const { db, collection, getDocs, orderBy, query, addDoc, writeBatch, doc, deleteDoc } = services;
    const { storage, ref, uploadBytes, getDownloadURL, deleteObject } = services;

    // --- ELEMENTOS DEL DOM ---
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

    let sortableInstance = null;

    // --- AUTENTICACIÓN ---
    onAuthStateChanged(auth, user => {
        if (user) {
            loginContainer.style.display = 'none';
            adminPanel.style.display = 'block';
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

    // --- LÓGICA DE LA GALERÍA ---
    async function loadGallery() {
        const q = query(collection(db, 'gallery'), orderBy('order'));
        const snapshot = await getDocs(q);
        const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGallery(photos);
    }

    function renderGallery(photos) {
        galleryList.innerHTML = '';
        photos.forEach(photo => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.dataset.id = photo.id;
            
            div.innerHTML = `
                <img src="${photo.src}" alt="${photo.descripcion}">
                <textarea class="description-input" placeholder="Descripción...">${photo.descripcion}</textarea>
                <button class="delete-button">Eliminar</button>
            `;
            galleryList.appendChild(div);
        });
        
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(galleryList, { animation: 150 });
    }

    // --- ACCIONES (SUBIR, GUARDAR, BORRAR) ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => e.preventDefault());
    dropZone.addEventListener('drop', e => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    async function handleFiles(files) {
        const currentCount = galleryList.querySelectorAll('.gallery-item').length;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
            
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            
            await addDoc(collection(db, 'gallery'), {
                src: url,
                descripcion: "Nueva imagen",
                order: currentCount + i
            });
        }
        loadGallery();
    }

    saveButton.addEventListener('click', async () => {
        const batch = writeBatch(db);
        const items = galleryList.querySelectorAll('.gallery-item');
        
        items.forEach((item, index) => {
            const docRef = doc(db, 'gallery', item.dataset.id);
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
            if (!confirm('¿Seguro que quieres eliminar esta imagen?')) return;
            
            const item = e.target.closest('.gallery-item');
            const docId = item.dataset.id;
            const imgSrc = item.querySelector('img').src;

            await deleteDoc(doc(db, 'gallery', docId));
            const storageRef = ref(storage, imgSrc);
            await deleteObject(storageRef);

            item.remove();
            alert('Imagen eliminada.');
        }
    });
});