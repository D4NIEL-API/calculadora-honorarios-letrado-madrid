const express = require('express');
const cors = require('cors');
const app = express();
// SOLUCIÓN: Cambiamos la importación para obtener 'fetch' de las propiedades del módulo.
const fetch = require('node-fetch').default; 

// IMPORTANTE: Configuración de seguridad (CORS)
// Esta lista SÓLO permite que tu dominio de GitHub Pages use este servidor.
const allowedOrigins = [
    // Dominio base de GitHub Pages
    'https://d4niel-api.github.io', 
    // Dominio COMPLETO del proyecto (a veces necesario)
    'https://d4niel-api.github.io/calculadora-honorarios-letrado-madrid',
    // Para pruebas locales
    'http://localhost:3000' 
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como curl o postman) o si está en la lista blanca
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // Si el origen no está permitido, lo registramos para diagnóstico
            console.log(`CORS Error: Origen no permitido - ${origin}`);
            callback(new Error('Bloqueado por CORS: Origen no permitido'), false);
        }
    }
}));

app.use(express.json());

// Ruta principal para el chat
app.post('/api/chat', async (req, res) => {
    try {
        const { contents } = req.body;
        
        // La API KEY se lee de las variables de entorno de Render
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            // Este error ya lo resolviste, pero lo dejamos por si acaso.
            console.error('Error: API Key no configurada');
            return res.status(500).json({ error: 'Configuración del servidor incompleta' });
        }

        // Llamada a Google Gemini desde el servidor (Backend)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();

        // Si Google devuelve error, lo enviamos al frontend
        if (!response.ok) {
            console.error('Error de Google Gemini:', data);
            return res.status(response.status).json(data);
        }

        // Devolvemos la respuesta limpia al frontend
        res.json(data);

    } catch (error) {
        console.error('Error interno del servidor en /api/chat:', error);
        res.status(500).json({ error: 'Error interno del servidor procesando la solicitud' });
    }
});

// Ruta de prueba para ver si el servidor está vivo
app.get('/', (req, res) => {
    res.send('El servidor proxy para la Calculadora Legal está activo.');
});

// Cambiamos el puerto para usar la variable de entorno de Render si está disponible, sino 10000.
const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});