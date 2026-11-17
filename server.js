import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

if (!API_KEY) {
  console.error('Missing GEMINI_API_KEY. Add it to your private .env file or hosting secrets.');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
app.use(express.json({ limit: '48kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000, limit: 20, standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Request limit reached. Please wait a moment, Sir.' },
}));
app.use(express.static(path.join(__dirname, 'public')));

const systemInstruction = `
You are J.A.R.V.I.S., a calm, capable, friendly personal AI assistant.
Use clear, concise language suitable for spoken replies. Address the user as
"Sir" occasionally, not in every message. Be honest about uncertainty.
Never claim to control the phone, access contacts, read private files, or
perform actions you cannot actually perform. Ask before any consequential action.
`.trim();

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  const items = history.slice(-12).filter(x =>
    x && (x.role === 'user' || x.role === 'assistant') &&
    typeof x.content === 'string' && x.content.trim()
  );
  // Gemini chat contents must start with a user message and alternate roles.
  const result = [];
  for (const item of items) {
    const role = item.role === 'assistant' ? 'model' : 'user';
    if (!result.length && role !== 'user') continue;
    if (result.length && result[result.length - 1].role === role) continue;
    result.push({ role, parts: [{ text: item.content.trim().slice(0, 2500) }] });
  }
  return result;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ONLINE', system: 'J.A.R.V.I.S.', model: MODEL });
});

app.post('/api/chat', async (req, res) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ error: 'Please enter a message, Sir.' });
    if (message.length > 3000) return res.status(413).json({ error: 'Please keep messages under 3,000 characters.' });

    const contents = [
      ...cleanHistory(req.body?.history),
      { role: 'user', parts: [{ text: message }] },
    ];
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction, temperature: 0.7, maxOutputTokens: 900 },
    });
    const reply = response.text?.trim();
    if (!reply) throw new Error('The model returned an empty response.');
    res.json({ reply });
  } catch (error) {
    console.error('Gemini request failed:', error?.message || error);
    res.status(502).json({
      error: 'I could not reach the AI core just now. Please check the server setup and try again.',
    });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`J.A.R.V.I.S. server listening on port ${PORT}`));
