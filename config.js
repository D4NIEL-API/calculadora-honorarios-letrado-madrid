var APP_CONFIG = {
    // Configuración del Servidor (Backend)
    GEMINI_MODEL: "gemini-3-flash-preview",
    
    // Configuración del Cliente (Frontend)
    ACCESS_PASSWORD: "DBS26"
};

// Esto permite que el archivo funcione tanto en el navegador como en el servidor Node.js
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = APP_CONFIG;
}