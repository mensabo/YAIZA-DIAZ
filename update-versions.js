// update-versions.js

const fs = require('fs');
const path = require('path');

// --- CÓMO FUNCIONA ---
// 1. Genera un número de versión único basado en la fecha y hora actual (timestamp).
// 2. Busca todos los archivos .html en la carpeta principal del proyecto.
// 3. En cada archivo, reemplaza 'style.css' y 'script.js' (con o sin versión antigua) por la nueva versión.
//    Ejemplo: 'style.css?v=123' se convierte en 'style.css?v=456'
//             'style.css'       se convierte en 'style.css?v=456'

try {
    console.log("Iniciando actualización de versiones de cache...");

    const newVersion = Date.now(); // Crea un número único (ej: 1678886400000)
    const projectRoot = '.'; // La carpeta actual

    // Leer todos los archivos en el directorio
    const files = fs.readdirSync(projectRoot);

    // Filtrar para obtener solo los archivos HTML
    const htmlFiles = files.filter(file => file.endsWith('.html'));

    if (htmlFiles.length === 0) {
        console.warn("No se encontraron archivos .html en el directorio principal.");
        return;
    }

    console.log(`Archivos HTML encontrados: ${htmlFiles.join(', ')}`);

    // Procesar cada archivo HTML
    htmlFiles.forEach(fileName => {
        const filePath = path.join(projectRoot, fileName);
        let content = fs.readFileSync(filePath, 'utf8');

        // Esta expresión regular busca 'style.css' o 'script.js',
        // opcionalmente seguidos por una versión antigua (?v=...).
        const regex = /(style\.css|script\.js)(\?v=\d*)?/g;

        if (regex.test(content)) {
            // Reemplaza todas las ocurrencias con la nueva versión
            const updatedContent = content.replace(regex, `$1?v=${newVersion}`);

            // Escribe el contenido actualizado de vuelta en el archivo
            fs.writeFileSync(filePath, updatedContent, 'utf8');
            console.log(`✅ Versiones actualizadas en: ${fileName}`);
        }
    });

    console.log("\n¡Proceso completado! La nueva versión es: " + newVersion);
    console.log("Sube los archivos HTML actualizados a tu servidor.");

} catch (error) {
    console.error("❌ Ocurrió un error durante el proceso:", error);
}