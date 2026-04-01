const CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions'
const TTS_URL = 'https://api.openai.com/v1/audio/speech'

export async function transcribeVoiceFromTelegramFile(fileUrl, apiKey) {
  const voiceRes = await fetch(fileUrl)
  if (!voiceRes.ok) throw new Error('Failed to download Telegram voice file')
  const voiceBlob = await voiceRes.blob()

  const form = new FormData()
  form.append('file', voiceBlob, 'voice.ogg')
  form.append('model', 'gpt-4o-mini-transcribe')

  const res = await fetch(TRANSCRIBE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) throw new Error('Transcription failed')
  const json = await res.json()
  return String(json.text || '').trim()
}

export async function planTaskActions({ apiKey, model, userText, existingTasks }) {
  const system = [
    'You are a task manager assistant for ADHD users inside Telegram.',
    'Return strict JSON with keys: replyText, actions.',
    'actions is an array where each item is one of:',
    '{"type":"add","title":"...","deadline":"YYYY-MM-DD or null","reminderAt":"ISO datetime or null"}',
    '{"type":"complete","titleContains":"..."}',
    '{"type":"none"}',
    'Keep replyText short and practical.',
  ].join(' ')

  const user = JSON.stringify({ userText, existingTasks }, null, 2)

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) throw new Error('Planner request failed')
  const payload = await res.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('No planner output')
  const json = JSON.parse(content)

  return {
    replyText: typeof json.replyText === 'string' ? json.replyText : 'Done.',
    actions: Array.isArray(json.actions) ? json.actions : [{ type: 'none' }],
  }
}

export async function generateRealisticDemoTasks({ apiKey, model }) {
  const system = [
    'Generate realistic ADHD daily tasks across life domains.',
    'Return strict JSON: {"tasks":[{"title":"...","deadline":"YYYY-MM-DD or null","reminderAt":"ISO datetime or null"}]}.',
    'Create 8 tasks that include finances, education, food, activity, home, admin, social/rest.',
  ].join(' ')

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: 'Create realistic tasks for a stressed student/young professional today.' },
      ],
    }),
  })

  if (!res.ok) throw new Error('Demo generation failed')
  const payload = await res.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content) return []
  const json = JSON.parse(content)
  if (!Array.isArray(json.tasks)) return []

  return json.tasks
    .map((t) => ({
      title: typeof t.title === 'string' ? t.title.trim() : '',
      deadline: typeof t.deadline === 'string' ? t.deadline : null,
      reminderAt: typeof t.reminderAt === 'string' ? t.reminderAt : null,
    }))
    .filter((t) => t.title)
}

export async function textToSpeech({ apiKey, text }) {
  const res = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: text,
      format: 'mp3',
    }),
  })

  if (!res.ok) throw new Error('TTS failed')
  const arr = await res.arrayBuffer()
  return Buffer.from(arr)
}
