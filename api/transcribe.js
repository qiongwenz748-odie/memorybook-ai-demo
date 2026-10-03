const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

function audioFormat(format) {
  const permitted = new Set(['webm', 'wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac']);
  return permitted.has(format) ? format : 'webm';
}

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI service is not configured yet.' });
  }

  const { audioBase64, format, language } = req.body || {};
  if (typeof audioBase64 !== 'string' || !audioBase64) {
    return res.status(400).json({ error: 'An audio recording is required.' });
  }
  if (Buffer.byteLength(audioBase64, 'base64') > MAX_AUDIO_BYTES) {
    return res.status(413).json({ error: 'Recording is too large. Please keep it under about 2 minutes.' });
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://memorybook-ai-demo.vercel.app',
        'X-OpenRouter-Title': 'MemoryBook AI Demo',
      },
      body: JSON.stringify({
        model: 'openai/whisper-1',
        input_audio: { data: audioBase64, format: audioFormat(format) },
        ...(typeof language === 'string' && language ? { language } : {}),
      }),
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      console.error('OpenRouter transcription error', upstream.status, payload?.error?.message);
      return res.status(upstream.status).json({ error: 'Transcription failed. Please try again shortly.' });
    }
    return res.status(200).json({ text: String(payload.text || '').trim() });
  } catch (error) {
    console.error('Transcription request failed', error);
    return res.status(502).json({ error: 'Could not reach the transcription service.' });
  }
}
