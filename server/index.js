import 'dotenv/config'
import express from 'express'
import { Bot, InputFile } from 'grammy'
import {
  addTask,
  completeTaskByTitle,
  listDueReminders,
  listTasks,
  markReminded,
} from './taskStore.js'
import {
  generateRealisticDemoTasks,
  planTaskActions,
  textToSpeech,
  transcribeVoiceFromTelegramFile,
} from './openaiTools.js'
import { loadSharedState, saveSharedState } from './stateStore.js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview'
const PORT = Number(process.env.PORT || process.env.BOT_PORT || 8787)

if (!OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY in environment.')
}

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

let bot = null

app.post('/api/realtime/session', async (req, res) => {
  try {
    const model = typeof req.body?.model === 'string' && req.body.model.trim()
      ? req.body.model.trim()
      : OPENAI_REALTIME_MODEL
    const voice = typeof req.body?.voice === 'string' && req.body.voice.trim()
      ? req.body.voice.trim()
      : 'alloy'
    const instructions = typeof req.body?.instructions === 'string' && req.body.instructions.trim()
      ? req.body.instructions.trim()
      : 'You are a concise ADHD-friendly voice task coach. Keep replies short and actionable.'

    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1',
      },
      body: JSON.stringify({
        model,
        voice,
        instructions,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      res.status(response.status).json(payload)
      return
    }

    res.json(payload)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create realtime session', detail: String(error) })
  }
})

async function openAiJsonCompletion(systemPrompt, userPrompt, model = OPENAI_MODEL) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(typeof payload?.error?.message === 'string' ? payload.error.message : 'OpenAI request failed')
  }

  const content = payload?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('No JSON content returned from OpenAI')
  }

  return JSON.parse(content)
}

app.post('/api/llm/analyze', async (req, res) => {
  try {
    const rawText = String(req.body?.rawText || '').trim()
    if (!rawText) {
      res.status(400).json({ error: 'Missing rawText' })
      return
    }

    const result = await openAiJsonCompletion(
      'You classify short todo items for an ADHD-friendly dashboard. Return valid JSON only with keys: title, category, deadline, urgency, effort, stress, nextStep, subtasks, confidence. Categories: finances, education, food, activity, home, admin, socialRest. deadline must be YYYY-MM-DD or null. urgency/effort/stress are integers 1-5.',
      rawText,
      typeof req.body?.model === 'string' && req.body.model.trim() ? req.body.model.trim() : OPENAI_MODEL,
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Analyze failed', detail: String(error) })
  }
})

app.post('/api/llm/demo', async (req, res) => {
  try {
    const result = await openAiJsonCompletion(
      'Create realistic ADHD-friendly todo data across different life areas. Return JSON object with key todos as an array of 8 todos. For each todo include: rawText, title, category, deadline, urgency, effort, stress, nextStep, subtasks, confidence, status. Categories: finances, education, food, activity, home, admin, socialRest. status is open or done. deadline must be YYYY-MM-DD or null.',
      'Generate a balanced set with mixed urgency and at least one item for each major life domain.',
      typeof req.body?.model === 'string' && req.body.model.trim() ? req.body.model.trim() : OPENAI_MODEL,
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Demo generation failed', detail: String(error) })
  }
})

app.post('/api/llm/adjust', async (req, res) => {
  try {
    const todo = req.body?.todo
    const instruction = String(req.body?.instruction || '').trim()
    if (!todo || !instruction) {
      res.status(400).json({ error: 'Missing todo or instruction' })
      return
    }

    const result = await openAiJsonCompletion(
      'You are a todo adjustment assistant. Return JSON with only keys you want to update from: title, deadline, category, urgency, effort, stress, nextStep, subtasks, status. category must be one of finances, education, food, activity, home, admin, socialRest. deadline must be YYYY-MM-DD or null. urgency/effort/stress integers 1-5. status open or done.',
      `Current todo:\n${JSON.stringify(todo)}\n\nUser request:\n${instruction}`,
      typeof req.body?.model === 'string' && req.body.model.trim() ? req.body.model.trim() : OPENAI_MODEL,
    )

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Todo adjust failed', detail: String(error) })
  }
})

app.get('/api/state/load', async (req, res) => {
  try {
    const syncKey = String(req.query.key || '').trim()
    if (!syncKey) {
      res.status(400).json({ error: 'Missing key query parameter' })
      return
    }
    const state = await loadSharedState(syncKey)
    res.json({ ok: true, state })
  } catch (error) {
    res.status(500).json({ error: 'Failed to load shared state', detail: String(error) })
  }
})

app.post('/api/state/save', async (req, res) => {
  try {
    const syncKey = String(req.body?.key || '').trim()
    if (!syncKey) {
      res.status(400).json({ error: 'Missing key in request body' })
      return
    }
    const todos = Array.isArray(req.body?.todos) ? req.body.todos : []
    const saved = await saveSharedState(syncKey, todos)
    res.json({ ok: true, state: saved })
  } catch (error) {
    res.status(500).json({ error: 'Failed to save shared state', detail: String(error) })
  }
})

if (BOT_TOKEN) {
  bot = new Bot(BOT_TOKEN)
}

async function sendVoiceReply(ctx, text) {
  try {
    const audio = await textToSpeech({ apiKey: OPENAI_API_KEY, text })
    await ctx.replyWithAudio(new InputFile(audio, 'reply.mp3'))
  } catch {
    await ctx.reply(text)
  }
}

async function handleUserIntent(ctx, text) {
  const chatId = String(ctx.chat.id)
  const tasks = await listTasks(chatId)

  const plan = await planTaskActions({
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
    userText: text,
    existingTasks: tasks,
  })

  for (const action of plan.actions) {
    if (action?.type === 'add' && typeof action.title === 'string') {
      await addTask(chatId, {
        title: action.title,
        deadline: typeof action.deadline === 'string' ? action.deadline : null,
        reminderAt: typeof action.reminderAt === 'string' ? action.reminderAt : null,
      })
    }

    if (action?.type === 'complete' && typeof action.titleContains === 'string') {
      await completeTaskByTitle(chatId, action.titleContains)
    }
  }

  await ctx.reply(plan.replyText)
  await sendVoiceReply(ctx, plan.replyText)
}

bot?.command('start', async (ctx) => {
  await ctx.reply('Voice Task Copilot online. Send voice or text and I will manage tasks/reminders for you.')
})

bot?.command('tasks', async (ctx) => {
  const chatId = String(ctx.chat.id)
  const tasks = await listTasks(chatId)
  if (tasks.length === 0) {
    await ctx.reply('No tasks yet.')
    return
  }

  const lines = tasks
    .slice(0, 20)
    .map((t, i) => `${i + 1}. ${t.completed ? '✅' : '⬜'} ${t.title}${t.deadline ? ` (due ${t.deadline})` : ''}`)
    .join('\n')

  await ctx.reply(lines)
})

bot?.command('demo', async (ctx) => {
  const chatId = String(ctx.chat.id)
  const generated = await generateRealisticDemoTasks({
    apiKey: OPENAI_API_KEY,
    model: OPENAI_MODEL,
  })

  for (const task of generated) {
    await addTask(chatId, task)
  }

  const msg = generated.length > 0
    ? `Added ${generated.length} realistic GPT demo tasks.`
    : 'Could not generate demo tasks right now.'

  await ctx.reply(msg)
})

bot?.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim()
  if (!text) return
  await handleUserIntent(ctx, text)
})

bot?.on('message:voice', async (ctx) => {
  const file = await ctx.getFile()
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`
  const transcript = await transcribeVoiceFromTelegramFile(fileUrl, OPENAI_API_KEY)

  if (!transcript) {
    await ctx.reply('I could not hear that clearly. Try again?')
    return
  }

  await ctx.reply(`Heard: "${transcript}"`)
  await handleUserIntent(ctx, transcript)
})

setInterval(async () => {
  if (!bot) return
  const due = await listDueReminders(new Date().toISOString())
  for (const task of due) {
    try {
      await bot.api.sendMessage(task.chatId, `Reminder: ${task.title}${task.deadline ? ` (due ${task.deadline})` : ''}`)
      await markReminded(task.id)
    } catch {
      // ignore failed delivery, next interval can retry
    }
  }
}, 60_000)

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`Bot health endpoint on http://localhost:${PORT}/healthz`)
})

if (bot) {
  bot.start()
  console.log('Telegram bot started')
} else {
  console.log('Telegram bot not started (missing TELEGRAM_BOT_TOKEN). Realtime API is available.')
}
