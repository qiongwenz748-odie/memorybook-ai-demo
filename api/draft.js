const MAX_TEXT_CHARS = 8000;

function parseModelJson(content) {
  const text = String(content || '').trim().replace(/^```json\s*/i, '').replace(/```$/i, '');
  return JSON.parse(text);
}

function normaliseFacts(rawFacts) {
  if (!Array.isArray(rawFacts)) return [];
  const eventNumbers = new Map();
  let nextEventNumber = 1;
  // A personal timeline can contain several facts per scene. Keep enough
  // evidence for later events instead of cutting the last scene down to a
  // single date after the first twelve facts.
  return rawFacts.slice(0, 30).map((fact, index) => {
    // eventId is supplied by the model. Keeping a map makes the displayed
    // labels consecutive even if the model returns 1, 3, 7, for example.
    const sourceEventId = String(fact?.eventId ?? fact?.event_id ?? fact?.eventNumber ?? `fact-${index + 1}`).trim() || `fact-${index + 1}`;
    if (!eventNumbers.has(sourceEventId)) eventNumbers.set(sourceEventId, `E${nextEventNumber++}`);
    return {
      id: eventNumbers.get(sourceEventId),
      kind: String(fact?.kind || 'OTHER').toUpperCase().slice(0, 20),
      value: String(fact?.value || '').slice(0, 500),
      excerpt: String(fact?.excerpt || '').slice(0, 700),
    };
  }).filter(fact => fact.value && fact.excerpt);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI service is not configured yet.' });
  }
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
  if (!transcript) return res.status(400).json({ error: 'A transcript is required.' });
  if (transcript.length > MAX_TEXT_CHARS) return res.status(413).json({ error: 'Transcript is too long.' });

  const system = `You are MemoryBook AI, an evidence-grounded autobiography drafting assistant. Extract only facts explicitly stated in the transcript. Never infer, embellish, diagnose, or invent details. Return valid JSON only, with this schema: {"draft":"string or empty","preface":"string","facts":[{"eventId":"1","kind":"NAME|PERSON|DATE|LOCATION|EVENT|OTHER","value":"verbatim or concise stated fact","excerpt":"exact supporting quote"}],"question":"one clarification question or empty"}. Use NAME only when the speaker explicitly states their own name, such as “My name is…”, and keep it separate from every event. Use the same eventId for every fact about the same described event or scene, including its people, date, and location. For every described scene, return its EVENT fact as well as any stated date, person, and location; never return a date as the only fact for a scene when the same sentence says what happened. Start a new eventId only when the narration moves to a different event, time, or scene; do not group separate events merely because they mention the same person or place. Create a gentle first-person-neutral biographical paragraph only when an event is explicitly stated. Also write a warm one- or two-sentence preface in the transcript's language. When explicitly available, say the narrator's name and the earliest-to-latest stated years, then warmly invite the reader into my story or my life. Write this welcome in first person; never use the phrase “your story”. Omit a name or year range that is not explicitly stated; never invent either. If a key detail is missing, leave draft empty and ask one clarification question. Every factual claim in draft and preface must be supported by one fact excerpt.`;
  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://memorybook-ai-demo.vercel.app',
        'X-OpenRouter-Title': 'MemoryBook AI Demo',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: transcript }],
      }),
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      console.error('OpenRouter draft error', upstream.status, payload?.error?.message);
      return res.status(upstream.status).json({ error: 'Draft generation failed. Please try again shortly.' });
    }
    const result = parseModelJson(payload?.choices?.[0]?.message?.content);
    const facts = normaliseFacts(result.facts);
    return res.status(200).json({ draft: String(result.draft || '').slice(0, 2000), preface: String(result.preface || '').slice(0, 700), facts, question: String(result.question || '').slice(0, 500) });
  } catch (error) {
    console.error('Draft request failed', error);
    return res.status(502).json({ error: 'Could not reach the drafting service.' });
  }
}
