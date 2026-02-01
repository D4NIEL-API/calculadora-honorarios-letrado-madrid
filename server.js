const express = require('express');
const cors = require('cors');
const app = express();
// Importación compatible para node-fetch v3 en CommonJS
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const config = require('./config.js');

// Configuración CORS
const allowedOrigins = [
    'https://d4niel-api.github.io', 
    'https://d4niel-api.github.io/calculadora-honorarios-letrado-madrid',
    'http://localhost:3000',
    'http://127.0.0.1:5500' // Por si pruebas en local con LiveServer
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`Bloqueo CORS: ${origin}`);
            callback(null, true); // Permitimos temporalmente para evitar bloqueos en pruebas, idealmente restringir en prod.
        }
    }
}));

app.use(express.json());

// --- CEREBRO JURÍDICO: BASE DE CONOCIMIENTO OPTIMIZADA ---
const CONTEXTO_PDF = `
ERES EL AUDITOR DE HONORARIOS DEL ICAM (MADRID). TU MISIÓN ES GUIAR AL USUARIO PARA USAR LA CALCULADORA.
IMPORTANTE: EL USUARIO VE "ETIQUETAS", NO "IDs". AL RECOMENDAR, DALE EL NOMBRE DE LA ETIQUETA EXACTA.

1. ANÁLISIS JURISDICCIÓN CIVIL:
   - JUICIO ORDINARIO:
     * Etiqueta: "Juicio Ordinario (Criterio 4)" (ID: c4_ordinario).
     * Slider: 100%.
   - JUICIO VERBAL:
     * Etiqueta: "Juicio Verbal (Criterio 5)" (ID: c5_verbal).
     * Slider: 100%.
   - DESAHUCIOS (Vivienda/Local):
     * Sin Oposición (paga/desaloja): Etiqueta "Desahucio (Sin Oposición)" (ID: c5_desahucio_no_op). Slider 50%.
     * Con Oposición (Vista): Etiqueta "Desahucio (Con Vista)" (ID: c5_desahucio_op). Slider 100%.
     * CUANTÍA: SIEMPRE 1 anualidad de renta (Renta x 12).
   - MONITORIOS:
     * Etiqueta: "Monitorio (Sin Oposición)" (ID: c23_monitorio). Slider 25%.
   - FAMILIA (Divorcios/Medidas):
     * Etiqueta: "Familia (Contencioso)" (ID: c18_familia).
     * Cuantía: Si hay pensión compensatoria/alimentos > 9.000€/año, poner la diferencia anual. Si no, poner 0.
   - EJECUCIONES:
     * Dineraria con Oposición: Etiqueta "Ejec. Dineraria (Con Oposición)" (ID: c15_ejec_din_op). Slider 50%.
     * Dineraria Vía Apremio: Etiqueta "Ejec. Vía Apremio (Completa)" (ID: c15_ejec_din_integra). Slider 75%.
     * Hipotecaria: Etiqueta "Ejecución Hipotecaria" (ID: c15_hipotecario). Slider 75%.
   - INCIDENTES / TASACIÓN DE COSTAS:
     * Etiqueta: "Incidente / Tasación Costas" (ID: c2_incidente). Slider 20%.

2. RECURSOS:
   - APELACIÓN: Etiqueta "Apelación (Audiencia Provincial)" (ID: c7_apelacion). Slider 50%.
   - CASACIÓN: Etiqueta "Casación / Extraordinario" (ID: c9_casacion). Slider 85%.

3. JURISDICCIÓN PENAL:
   - INSTRUCCIÓN: Etiqueta "Instrucción / Escritos Acusación" (ID: c35_instruccion).
   - JUICIO ORAL: Etiqueta "Asistencia Juicio Oral (Penal)" (ID: c37_juicio_oral).
   - RESPONSABILIDAD CIVIL: Etiqueta "Resp. Civil en Sentencia" (ID: c85_rc_instancia). Slider 70% sobre la indemnización.

4. JURISDICCIÓN SOCIAL (LABORAL):
   - CANTIDAD: Etiqueta "Reclamación de Cantidad" (ID: c99_cantidad). Slider 100%.
   - DESPIDO: Etiqueta "Despido" (ID: c101_despido). Cuantía = Indemnización + Salarios trámite.
   - SUPLICACIÓN: Etiqueta "Recurso de Suplicación" (ID: c109_suplicacion). Slider 50%.

5. CONTENCIOSO-ADMINISTRATIVO:
   - ORDINARIO: Etiqueta "Procedimiento Ordinario" (ID: c89_ordinario). Slider 100%.
   - ABREVIADO: Etiqueta "Procedimiento Abreviado" (ID: c90_abreviado). Slider 100%.

REGLAS ESPECIALES (TOGGLES):
A) TOGGLE "Aplicar límite legal (Art 394.3 LEC)": 
   - SI ES "JURA DE CUENTAS":
     >>> INSTRUCCIÓN: Dile IMPERATIVAMENTE que lo DESACTIVE. (Razón: En la relación abogado-cliente rige la libertad de precios y no aplica el límite de costas procesales).
   
   - SI ES "TASACIÓN DE COSTAS" (Paga el contrario):
     >>> REGLA GENERAL: Dile que lo ACTIVE (Límite 1/3 de la cuantía).
     >>> EXCEPCIÓN CRÍTICA 1 (TEMERIDAD): Si el usuario menciona "Temeridad", "Mala Fe" o "se declaró la temeridad", el límite legal DESAPARECE. Dile explícitamente que DESACTIVE el checkbox para cobrar el 100%.
     >>> EXCEPCIÓN CRÍTICA 2 (CONTENCIOSO-ADMINISTRATIVO): Advierte que si la sentencia fija una cifra tope (ej. "máximo 2.000€"), ese es el límite real (Art. 139 LJCA), independientemente de la escala.

B) TOGGLE "IVA":
   - SI ES "JURA DE CUENTAS":
     >>> INSTRUCCIÓN: Dile que lo ACTIVE SIEMPRE. (El abogado siempre factura IVA a su propio cliente por sus servicios).

   - SI ES "TASACIÓN DE COSTAS" (Paga el contrario):
     >>> REGLA PARTICULAR: Si el cliente (beneficiario) es PARTICULAR/CONSUMIDOR, dile que lo ACTIVE.
     >>> REGLA EMPRESA: Si el cliente es EMPRESA/S.L./S.A., dile que lo DESACTIVE. (Razón: Evitar enriquecimiento injusto por deducción del impuesto).

     REGLAS DE CUANTÍA:
- Indeterminada: Dile que ponga 18.000€ (Criterio 1).
- Desahucio: 1 Anualidad de Renta.
`;

const SYSTEM_PROMPT = `
${CONTEXTO_PDF}

INSTRUCCIONES DE RESPUESTA:
1. Analiza el caso del usuario.
2. Responde SIEMPRE con este formato estructurado:
   
   **Análisis:** [Breve explicación jurídica citando el Criterio ICAM]
   
   **Configuración Recomendada:**
   1. **Jurisdicción:** [CIVIL / PENAL / SOCIAL / CONTENCIOSO]
   2. **Procedimiento:** [NOMBRE EXACTO DEL ID DE LA LISTA ARRIBA]
   3. **Cuantía:** [Indica la cifra o regla de cálculo]
   4. **Escala (Slider):** [Indica el % exacto]

   **Nota:** [Alguna advertencia breve, ej: "Recuerda sumar el IVA al final"]

SI NO ENTIENDES LA PREGUNTA: Pide al usuario que aclare si es Civil, Penal, etc.
`;

app.post('/api/chat', async (req, res) => {
    try {
        const { contents } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) return res.status(500).json({ error: 'API Key no configurada' });

        // Extraemos el mensaje del usuario
        const userMessage = contents[contents.length - 1].parts[0].text;

        // Construimos el historial para Gemini
        // Inyectamos el System Prompt como "user" message al principio o merged con el último
        // Para asegurar que Gemini 1.5/2.5 preste atención, lo enviamos junto al último mensaje.
        
        const enhancedContents = [...contents];
        // Reemplazamos el último mensaje combinando el contexto + la duda
        enhancedContents[enhancedContents.length - 1].parts[0].text = `
        INSTRUCCIONES DEL SISTEMA:
        ${SYSTEM_PROMPT}
        
        ---------------------------------------------------
        
        CONSULTA DEL USUARIO:
        "${userMessage}"
        `;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL}:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: enhancedContents })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(response.status).json(data);
        }

        res.json(data);

    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => {
    console.log(`Servidor Jurídico activo en puerto ${PORT}`);
});