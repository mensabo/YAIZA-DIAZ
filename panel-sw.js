// Service worker mínimo, solo para que Chrome/Android considere el panel
// "instalable" (uno de los requisitos técnicos, junto al manifest, para
// que aparezca el aviso de "Añadir a pantalla de inicio"). No cachea nada
// a propósito: el panel siempre debe pedir datos frescos a Firebase.
self.addEventListener('fetch', () => {});
