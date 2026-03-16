const fs = require('fs');
const path = require('path');

// 1. Genera una nueva y única versión usando la fecha y hora actual.
const newVersion = Date.now();

// 2. Lista de todos los archivos HTML que necesitan ser actualizados.
const htmlFiles = [
    'index.html',
    'admin.html',
    'television.html',
    'eventos.html',
    'evento-detalle.html',
    'radio.html',
    'publicidad.html',
    'comunicacion.html',
    'investigacion.html',
    'proyectos.html',
    'premios.html',
    'entrevistas.html',
    'libro.html',
    'modelaje.html',
    'contacto.html',
    'aviso-legal.html',
    'politica-privacidad.html',
    'politica-cookies.html'
];

console.log('🚀 Iniciando proceso de actualización de versiones...');
console.log(`Nueva versión generada: ${newVersion}`);
console.log('-------------------------------------------');

// 3. Procesa cada archivo HTML de la lista.
htmlFiles.forEach(fileName => {
    try {
        const filePath = path.join(__dirname, fileName);

        // Verifica si el archivo existe antes de intentar leerlo.
        if (fs.existsSync(filePath)) {
            // Lee el contenido del archivo.
            let fileContent = fs.readFileSync(filePath, 'utf8');

            // Expresión regular para encontrar los archivos CSS y JS con el parámetro de versión.
            // Busca 'style.css?v=...', 'script.js?v=...' y 'evento.js?v=...'
            const regex = /(style\.css|script\.js|evento\.js)\?v=\d+/g;
            
            // Reemplaza todas las coincidencias con la nueva versión.
            const updatedContent = fileContent.replace(regex, `$1?v=${newVersion}`);

            // Sobrescribe el archivo con el contenido actualizado.
            fs.writeFileSync(filePath, updatedContent, 'utf8');

            console.log(`✅ Archivo actualizado: ${fileName}`);
        } else {
            console.log(`⚠️  Advertencia: No se encontró el archivo ${fileName}. Se omitió.`);
        }
    } catch (error) {
        console.error(`❌ Error al procesar el archivo ${fileName}:`, error);
    }
});

console.log('-------------------------------------------');
console.log('🎉 ¡Actualización completada con éxito!');
console.log('Ya puedes subir los archivos a tu servidor.');