import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import {
  getDatabase,
  saveDatabase,
  saveItem,
  deleteItem,
  wipeOperationalData,
  getDatabaseStatus,
} from './server/dbManager';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Central Database Persistence API
  app.get('/api/data', (req, res) => {
    try {
      const data = getDatabase();
      res.json(data);
    } catch (err: any) {
      console.error('[API GET /api/data] Error:', err);
      res.status(500).json({ error: 'Error al obtener base de datos central.' });
    }
  });

  app.get('/api/data/status', (req, res) => {
    try {
      const status = getDatabaseStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener estado de la base de datos.' });
    }
  });

  app.post('/api/data/item', (req, res) => {
    try {
      const { collection, item } = req.body;
      if (!collection || !item) {
        res.status(400).json({ error: 'Colección e item son requeridos.' });
        return;
      }
      saveItem(collection, item);
      res.json({ success: true, item });
    } catch (err: any) {
      console.error('[API POST /api/data/item] Error:', err);
      res.status(500).json({ error: 'Error al guardar item en la base de datos.' });
    }
  });

  app.delete('/api/data/item/:collection/:id', (req, res) => {
    try {
      const { collection, id } = req.params;
      deleteItem(collection as any, id);
      res.json({ success: true });
    } catch (err: any) {
      console.error('[API DELETE /api/data/item] Error:', err);
      res.status(500).json({ error: 'Error al eliminar item de la base de datos.' });
    }
  });

  app.post('/api/data/wipe', (req, res) => {
    try {
      wipeOperationalData();
      res.json({ success: true, message: 'Todos los datos operativos fueron eliminados correctamente del servidor.' });
    } catch (err: any) {
      console.error('[API POST /api/data/wipe] Error:', err);
      res.status(500).json({ error: 'Error al vaciar datos operativos del servidor.' });
    }
  });

  app.post('/api/data/sync', (req, res) => {
    try {
      const { fullDatabase } = req.body;
      if (fullDatabase && typeof fullDatabase === 'object') {
        saveDatabase(fullDatabase);
        res.json({ success: true, timestamp: fullDatabase.lastUpdated || new Date().toISOString() });
        return;
      }
      res.status(400).json({ error: 'Objeto de base de datos no proporcionado.' });
    } catch (err: any) {
      console.error('[API POST /api/data/sync] Error:', err);
      res.status(500).json({ error: 'Error al sincronizar base de datos central.' });
    }
  });

  app.post('/api/data/restore', (req, res) => {
    try {
      const { data } = req.body;
      if (!data || typeof data !== 'object') {
        res.status(400).json({ error: 'Datos de restauración inválidos.' });
        return;
      }
      saveDatabase(data);
      res.json({ success: true, message: 'Base de datos central restaurada con éxito.' });
    } catch (err: any) {
      console.error('[API POST /api/data/restore] Error:', err);
      res.status(500).json({ error: 'Error al restaurar base de datos central.' });
    }
  });

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
