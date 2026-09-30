import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || 'AIzaSyPlaceholderKeyForBuildSafety';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

interface FileInput {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  createdTime?: string;
  size?: string;
  isFolder: boolean;
}

// AI Cleanup Suggestions Endpoint
app.post('/api/ai/cleanup-suggestions', async (req, res) => {
  try {
    const { files, sensitivity = 'balanced' } = req.body as {
      files: FileInput[];
      sensitivity?: 'cautious' | 'balanced' | 'aggressive';
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Nessun file fornito per l\'analisi.' });
    }

    // Limit files payload to reasonable batch for prompt
    const candidateFiles = files.slice(0, 100).map((f) => ({
      id: f.id,
      name: f.name,
      type: f.isFolder ? 'folder' : f.mimeType,
      modifiedTime: f.modifiedTime || 'sconosciuta',
      createdTime: f.createdTime || 'sconosciuta',
      sizeBytes: f.size || '0',
    }));

    const systemInstruction = `Sei un esperto Senior di organizzazione dati e pulizia file su Google Drive (Drive Cleaner & Hygiene Specialist).
Il tuo obiettivo è analizzare i file forniti (nomi, tipi/estensioni, date di ultima modifica e dimensione) e fornire DUE tipi di azioni consigliate:
1. "recommendations": File candidati per lo spostamento nella cartella di sicurezza "_Da Cancellare" (file temporanei, bozze obsolete, duplicati, screenshot).
2. "folderStructureSuggestions": Strutture di cartelle tematiche basate sui pattern di denominazione dei file (es. prefissi "Fattura_", "Ricevuta_", estensioni grafiche, marchi d'anno "2024_", codici di progetto o estensioni di codice). Proponi lo spostamento organizzativo per i file che non si adattano all'attuale categorizzazione della radice.

Regole per identificare i candidati per Quarantena ("recommendations"):
- File temporanei, screenshot, installer, crash log (.tmp, .crdownload, .log, screenshot).
- Bozze obsolete, file con "copia di", "bozza", "draft", "test", "old", "_v1".
- Duplicati con numerazioni tra parentesi tipo "doc (1).pdf".

Regole per suggerire strutture di cartelle ("folderStructureSuggestions"):
- Raggruppa i file in base a prefissi o pattern comuni nei nomi (es. "Fatture & Amministrazione" per file contabili, "Media & Grafica" per .png/.jpg/.psd, "Archivio 2024" per file con anno, "Codice & Script" per file dev).
- Includi spiegazioni chiare e in italiano per ciascun gruppo di cartella suggerito ("description") e il pattern di denominazione identificato ("patternMatched").`;

    const promptText = `Analizza questi ${candidateFiles.length} file con livello di sensibilità "${sensitivity}". Rileva sia i file da quarantenare sia la struttura di cartelle consigliata basata sui pattern dei nomi dei file.
Elenco dei file:
${JSON.stringify(candidateFiles, null, 2)}`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendations: {
              type: Type.ARRAY,
              description: 'Elenco dei file consigliati per lo spostamento in quarantena',
              items: {
                type: Type.OBJECT,
                properties: {
                  fileId: { type: Type.STRING, description: 'ID univoco del file corrispondente' },
                  fileName: { type: Type.STRING, description: 'Nome attuale del file' },
                  confidence: {
                    type: Type.STRING,
                    description: 'Livello di sicurezza del suggerimento: high, medium, low',
                  },
                  category: {
                    type: Type.STRING,
                    description: 'Categoria del problema: bozza_obsoleta, duplicato, temporaneo_screenshot, file_stale_vecchio, disordine',
                  },
                  reason: {
                    type: Type.STRING,
                    description: 'Spiegazione chiara e convincente in italiano sul motivo del suggerimento',
                  },
                },
                required: ['fileId', 'fileName', 'confidence', 'category', 'reason'],
              },
            },
            folderStructureSuggestions: {
              type: Type.ARRAY,
              description: 'Suggerimenti di organizzazione in sotto-cartelle tematiche basati su pattern dei nomi',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  targetFolderName: { type: Type.STRING, description: 'Nome consigliato della cartella' },
                  description: { type: Type.STRING, description: 'Spiegazione del motivo e del pattern identificato' },
                  suggestedFiles: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        fileId: { type: Type.STRING },
                        fileName: { type: Type.STRING },
                        patternMatched: { type: Type.STRING, description: 'Pattern di denominazione riconosciuto' },
                      },
                      required: ['fileId', 'fileName', 'patternMatched'],
                    },
                  },
                },
                required: ['id', 'targetFolderName', 'description', 'suggestedFiles'],
              },
            },
            summary: {
              type: Type.OBJECT,
              properties: {
                totalEvaluated: { type: Type.INTEGER },
                recommendedCount: { type: Type.INTEGER },
                highConfidenceCount: { type: Type.INTEGER },
                folderSuggestionsCount: { type: Type.INTEGER },
                insights: {
                  type: Type.STRING,
                  description: 'Sintesi in 1-2 frasi sullo stato generale di pulizia e struttura della cartella',
                },
              },
              required: ['totalEvaluated', 'recommendedCount', 'highConfidenceCount', 'insights'],
            },
          },
          required: ['recommendations', 'summary'],
        },
      },
    });

    const jsonText = response.text?.trim() || '{}';
    const parsedData = JSON.parse(jsonText);

    return res.json(parsedData);
  } catch (error: any) {
    console.error('AI Cleanup Error:', error);
    return res.status(500).json({
      error: error.message || 'Errore durante la generazione dei suggerimenti AI.',
    });
  }
});

// Mount Vite or static dist
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Drive Organizer server running on port ${PORT}`);
});
