const express = require('express');
const cors = require('cors');
const app = express();

// IMPORTANTE: Configuración de seguridad (CORS)
// Esto permite que SOLO tu página de GitHub pueda usar este servidor.
// Cambia esto si tu dominio es diferente en el futuro.
const allowedOrigins = [
    'https://d4niel-api.github.io',
    'http://localhost:3000' // Para pruebas locales
];

app.use(cors({
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como curl o postman) o si está en la lista blanca
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por CORS: Origen no permitido'));
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
            return res.status(response.status).json(data);
        }

        // Devolvemos la respuesta limpia al frontend
        res.json(data);

    } catch (error) {
        console.error('Error en el servidor:', error);
        res.status(500).json({ error: 'Error interno del servidor procesando la solicitud' });
    }
});

// Ruta de prueba para ver si el servidor está vivo
app.get('/', (req, res) => {
    res.send('El servidor proxy para la Calculadora Legal está activo.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});