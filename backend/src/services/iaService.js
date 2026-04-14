import { Configuracion } from '../models/index.js';
import { logSystem } from '../config/logger.js';
import fs from 'fs';

/**
 * Obtiene la configuracion de IA desde la BD (o .env como fallback).
 */
const getIAConfig = async () => {
  const config = await Configuracion.findOne({ where: { clave: 'integracion_ia' } });
  const valor = config?.valor || {};

  return {
    ia_principal: valor.ia_principal || 'openai',
    openai_api_key: valor.openai_api_key || process.env.OPENAI_API_KEY || '',
    openai_modelo_transcripcion: valor.openai_modelo_transcripcion || 'whisper-1',
    openai_modelo_resumen: valor.openai_modelo_resumen || 'gpt-4o-mini',
    gemini_api_key: valor.gemini_api_key || process.env.GEMINI_API_KEY || '',
    gemini_modelo: valor.gemini_modelo || 'gemini-2.5-flash',
  };
};

/**
 * Transcribe un archivo de audio usando OpenAI Whisper.
 */
const transcribirConOpenAI = async (audioPath, config) => {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: config.openai_api_key });

  const transcripcion = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model: config.openai_modelo_transcripcion,
    language: 'es',
  });

  return transcripcion.text;
};

/**
 * Genera un resumen del informe usando OpenAI GPT.
 */
const resumirConOpenAI = async (texto, config) => {
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: config.openai_api_key });

  const completion = await openai.chat.completions.create({
    model: config.openai_modelo_resumen,
    messages: [
      {
        role: 'system',
        content: `Sos un asistente que resume informes de arbitros de futbol infantil (Baby Futbol).
Genera un resumen conciso y estructurado del informe del arbitro.
Si hay incidentes disciplinarios, listalos con claridad.
Responde en espanol argentino.`,
      },
      { role: 'user', content: texto },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || '';
};

/**
 * Transcribe y resume usando Google Gemini (todo en una llamada).
 */
const procesarConGemini = async (audioPath, config) => {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(config.gemini_api_key);
  const model = genAI.getGenerativeModel({ model: config.gemini_modelo });

  const audioBuffer = fs.readFileSync(audioPath);
  const audioBase64 = audioBuffer.toString('base64');
  const mimeType = audioPath.endsWith('.webm') ? 'audio/webm'
    : audioPath.endsWith('.mp3') ? 'audio/mp3'
    : audioPath.endsWith('.m4a') ? 'audio/mp4'
    : 'audio/wav';

  const result = await model.generateContent([
    {
      inlineData: { mimeType, data: audioBase64 },
    },
    `Transcribi este audio de un informe de arbitro de Baby Futbol.
Devolvelo en formato JSON con estos campos:
{
  "transcripcion": "texto completo transcrito",
  "resumen": "resumen conciso del informe"
}
Responde SOLO el JSON, sin markdown ni texto adicional.`,
  ]);

  const text = result.response.text();
  try {
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return parsed;
  } catch {
    return { transcripcion: text, resumen: '' };
  }
};

/**
 * Procesa un archivo de audio: transcribe y genera resumen.
 * Usa la IA configurada (OpenAI o Gemini) con fallback.
 *
 * @param {string} audioPath - Ruta al archivo de audio
 * @returns {{ transcripcion: string, resumen: string, modelo: string }}
 */
export const procesarAudioInforme = async (audioPath) => {
  const config = await getIAConfig();

  if (!config.openai_api_key && !config.gemini_api_key) {
    throw new Error('No hay claves de IA configuradas. Configuralas en Configuracion > Integraciones IA.');
  }

  const servicios = config.ia_principal === 'gemini'
    ? ['gemini', 'openai']
    : ['openai', 'gemini'];

  let lastError = null;

  for (const servicio of servicios) {
    try {
      if (servicio === 'openai' && config.openai_api_key) {
        logSystem(`Procesando audio con OpenAI...`, 'info');
        const transcripcion = await transcribirConOpenAI(audioPath, config);
        const resumen = await resumirConOpenAI(transcripcion, config);
        return { transcripcion, resumen, modelo: `openai/${config.openai_modelo_transcripcion}` };
      }

      if (servicio === 'gemini' && config.gemini_api_key) {
        logSystem(`Procesando audio con Gemini...`, 'info');
        const resultado = await procesarConGemini(audioPath, config);
        return { ...resultado, modelo: `gemini/${config.gemini_modelo}` };
      }
    } catch (error) {
      logSystem(`Error con ${servicio}: ${error.message}`, 'warn');
      lastError = error;
    }
  }

  throw lastError || new Error('No se pudo procesar el audio con ninguna IA');
};

/**
 * Genera un resumen de texto (sin audio).
 */
export const resumirTexto = async (texto) => {
  const config = await getIAConfig();

  if (config.openai_api_key) {
    return { resumen: await resumirConOpenAI(texto, config), modelo: `openai/${config.openai_modelo_resumen}` };
  }

  if (config.gemini_api_key) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.gemini_api_key);
    const model = genAI.getGenerativeModel({ model: config.gemini_modelo });
    const result = await model.generateContent(`Resume este informe de arbitro de Baby Futbol de forma concisa:\n\n${texto}`);
    return { resumen: result.response.text(), modelo: `gemini/${config.gemini_modelo}` };
  }

  throw new Error('No hay claves de IA configuradas');
};
