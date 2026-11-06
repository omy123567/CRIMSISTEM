import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Initialize Gemini SDK with User-Agent header as required
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // AI Endpoint: Generate Labor Criminalística from Síntesis del Hecho
  app.post('/api/gemini/generate-labor', async (req, res) => {
    try {
      const { sintesisHecho, hecho, tipoIntervencion, inspeccionLugar } = req.body;

      if (!sintesisHecho || typeof sintesisHecho !== 'string') {
        res.status(400).json({ error: 'La síntesis del hecho es requerida.' });
        return;
      }

      const prompt = `Actúa como un Perito en Criminalística y Accidentología de la Dirección de Policía Científica (DPC).
Tu labor es redactar de forma profesional, técnica, concisa y procesal el campo "LABOR CRIMINALÍSTICA" correspondiente a un acta oficial de intervención policial, a partir de la siguiente síntesis del hecho:

- TIPO DE INTERVENCIÓN: ${tipoIntervencion || 'Criminalística'}
- HECHO: ${hecho || 'INTERVENCIÓN'}
- LUGAR: ${inspeccionLugar || 'Lugar del hecho'}
- SÍNTESIS DEL HECHO: "${sintesisHecho}"

INSTRUCCIONES OBLIGATORIAS:
Debes estructurar el texto numerado, redactado en lenguaje técnico pericial policial formal argentino, asegurando SIEMPRE los siguientes puntos clave según corresponda al caso:
1. Fijación fotográfica panorámica y de detalle (especificando tomas de conjunto, aproximación y detalle métrico).
2. Relevamiento planimétrico del lugar (a escala con determinación de puntos fijos y referencias).
3. Levantamiento de rastros con cadena de custodia (levantamiento papiloscópico, hisopados, vainas, secuestros, o revenido químico según aplique).
4. Pruebas periciales técnicas específicas según el hecho (si hay armas: secuestro con cadena de custodia y prueba de dermotest; si es siniestro vial: relevamiento de huellas de frenada/derrape, zonas de deformación y visibilidad; si es robo: cotejo de signos de fuerza y efracción).

No agregues introducciones ni despedidas de chat. Devuelve ÚNICAMENTE los puntos numerados de la LABOR CRIMINALÍSTICA listos para insertar en el acta policial.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const generatedText = response.text || '';
      res.json({ laborCriminalistica: generatedText.trim() });
    } catch (error: any) {
      console.error('Error al generar labor criminalística con Gemini:', error);
      res.status(500).json({
        error: error.message || 'Error al comunicarse con la API de Gemini.',
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Sis.Pol. Server' });
  });

  // Production vs Development
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite Dev Server middleware mode
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sis.Pol.] Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Sis.Pol.] Error al iniciar servidor:', err);
});
