import { useEffect, useRef, useState } from 'react'
import type { AppSettings, TodoItem } from '../types/domain'

type ToolResult = Record<string, unknown>
type PanelSize = 'compact' | 'expanded'

interface RealtimeVoicePanelProps {
  settings: AppSettings
  todos: TodoItem[]
  onAddTask: (title: string, deadline: string | null) => Promise<ToolResult>
  onCompleteTask: (taskId: string) => Promise<ToolResult>
  onUpdateTask: (taskId: string, patch: Partial<TodoItem>) => Promise<ToolResult>
}

export function RealtimeVoicePanel({ settings, todos, onAddTask, onCompleteTask, onUpdateTask }: RealtimeVoicePanelProps) {
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [events, setEvents] = useState<string[]>([])
  const [panelSize, setPanelSize] = useState<PanelSize>('expanded')
  const [referencedTaskIds, setReferencedTaskIds] = useState<string[]>([])
  const [secureContextWarning, setSecureContextWarning] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [])

  function pushEvent(line: string) {
    setEvents((current) => [line, ...current].slice(0, 12))
  }

  function listTasksForModel() {
    return todos.slice(0, 40).map((todo) => ({
      id: todo.id,
      title: todo.title,
      deadline: todo.deadline,
      category: todo.category,
      status: todo.status,
      nextStep: todo.nextStep,
    }))
  }

  const referencedTasks = referencedTaskIds
    .map((taskId) => todos.find((todo) => todo.id === taskId))
    .filter((todo): todo is TodoItem => Boolean(todo))

  function updateReferencedTasks(taskIds: string[]) {
    setReferencedTaskIds(Array.from(new Set(taskIds)).slice(0, 6))
  }

  async function connect() {
    if (connected) return
    setStatus('Connecting...')

    try {
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setSecureContextWarning('iPhone/Safari microphone requires HTTPS. Local network HTTP will not work for Realtime voice.')
        throw new Error('iPhone/Safari microphone requires HTTPS. Open the app over HTTPS, not local network HTTP.')
      }

      setSecureContextWarning('')

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone access is unavailable in this browser.')
      }

      const base = settings.backendUrl.replace(/\/$/, '')
      const sessionRes = await fetch(`${base}/realtime/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview',
          voice: 'alloy',
          instructions:
            'You are an ADHD-friendly voice task copilot. Use tools to list/add/update/complete tasks. Keep spoken replies under 2 short sentences and action-focused.',
        }),
      })

      if (!sessionRes.ok) {
        const errorText = await sessionRes.text()
        throw new Error(`Failed to create realtime session: ${errorText || sessionRes.status}`)
      }

      const session = (await sessionRes.json()) as { client_secret?: { value?: string } }
      const ephemeralKey = session.client_secret?.value
      if (!ephemeralKey) {
        throw new Error('Missing ephemeral key')
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      })
      pcRef.current = pc

      const audioEl = audioRef.current
      if (audioEl) {
        audioEl.autoplay = true
        audioEl.setAttribute('playsinline', 'true')
      }

      pc.ontrack = (event) => {
        if (!audioEl) return
        audioEl.srcObject = event.streams[0]
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream)
      }

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onopen = () => {
        pushEvent('Realtime data channel open')
        setStatus('Connected: assistant is on the line')
        setConnected(true)

        dc.send(
          JSON.stringify({
            type: 'session.update',
            session: {
              tools: [
                {
                  type: 'function',
                  name: 'list_tasks',
                  description: 'List current tasks for the user',
                  parameters: {
                    type: 'object',
                    properties: {},
                  },
                },
                {
                  type: 'function',
                  name: 'add_task',
                  description: 'Add a task with optional YYYY-MM-DD deadline',
                  parameters: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      deadline: { type: ['string', 'null'] },
                    },
                    required: ['title'],
                  },
                },
                {
                  type: 'function',
                  name: 'complete_task',
                  description: 'Complete task by id',
                  parameters: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                    },
                    required: ['task_id'],
                  },
                },
                {
                  type: 'function',
                  name: 'update_task',
                  description: 'Update task fields by id',
                  parameters: {
                    type: 'object',
                    properties: {
                      task_id: { type: 'string' },
                      title: { type: 'string' },
                      deadline: { type: ['string', 'null'] },
                      nextStep: { type: 'string' },
                    },
                    required: ['task_id'],
                  },
                },
                {
                  type: 'function',
                  name: 'end_call',
                  description: 'Finish the conversation and hang up when user is done',
                  parameters: {
                    type: 'object',
                    properties: {
                      farewell: { type: 'string' },
                    },
                  },
                },
              ],
              tool_choice: 'auto',
            },
          }),
        )

        dc.send(
          JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text:
                    `Start the call in Russian. Greet the user like a personal secretary calling them, then briefly mention the current task context. ` +
                    `If the user says "пока", "до свидания", or clearly ends the conversation, say a short goodbye in Russian and call end_call. ` +
                    `Current tasks context: ${JSON.stringify(listTasksForModel())}`,
                },
              ],
            },
          }),
        )

        dc.send(JSON.stringify({ type: 'response.create' }))
      }

      dc.onmessage = async (event) => {
        const msg = JSON.parse(event.data) as {
          type?: string
          name?: string
          call_id?: string
          arguments?: string
          transcript?: string
          item?: { call_id?: string; arguments?: string; name?: string }
        }

        if (msg.type === 'conversation.item.input_audio_transcription.completed' && msg.transcript) {
          pushEvent(`You: ${msg.transcript}`)
          if (/(^|\s)(пока|до свидания|bye|goodbye)(\s|$)/i.test(msg.transcript)) {
            setStatus('Finishing call...')
          }
          return
        }

        if (msg.type === 'response.audio_transcript.done' && msg.transcript) {
          pushEvent(`Assistant: ${msg.transcript}`)
          return
        }

        const functionName = msg.name ?? msg.item?.name
        const callId = msg.call_id ?? msg.item?.call_id
        const rawArgs = msg.arguments ?? msg.item?.arguments

        if (msg.type === 'response.function_call_arguments.done' && functionName && callId) {
          const args = rawArgs ? JSON.parse(rawArgs) : {}
          let output: ToolResult = { ok: false }

          if (functionName === 'list_tasks') {
            output = { ok: true, tasks: listTasksForModel() }
            updateReferencedTasks(listTasksForModel().map((task) => task.id))
          }

          if (functionName === 'add_task') {
            output = await onAddTask(String(args.title || ''), typeof args.deadline === 'string' ? args.deadline : null)
            if (typeof output.taskId === 'string') {
              updateReferencedTasks([output.taskId])
            }
          }

          if (functionName === 'complete_task') {
            output = await onCompleteTask(String(args.task_id || ''))
            if (typeof args.task_id === 'string') {
              updateReferencedTasks([args.task_id])
            }
          }

          if (functionName === 'update_task') {
            output = await onUpdateTask(String(args.task_id || ''), {
              title: typeof args.title === 'string' ? args.title : undefined,
              deadline: typeof args.deadline === 'string' || args.deadline === null ? args.deadline : undefined,
              nextStep: typeof args.nextStep === 'string' ? args.nextStep : undefined,
            })
            if (typeof args.task_id === 'string') {
              updateReferencedTasks([args.task_id])
            }
          }

          if (functionName === 'end_call') {
            const farewell = typeof args.farewell === 'string' ? args.farewell : 'Хорошо, до связи.'
            output = { ok: true, closing: true }
            pushEvent(`Assistant: ${farewell}`)
            window.setTimeout(() => {
              disconnect()
            }, 1200)
          }

          dc.send(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(output),
              },
            }),
          )
          dc.send(JSON.stringify({ type: 'response.create' }))
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1',
        },
      })

      if (!sdpRes.ok) {
        const errorText = await sdpRes.text()
        throw new Error(`Realtime SDP negotiation failed: ${errorText || sdpRes.status}`)
      }

      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpRes.text(),
      }
      await pc.setRemoteDescription(answer)
      pushEvent('Call connected')
    } catch (error) {
      const raw = String(error)
      const hint = raw.includes('Failed to fetch') ? ' | backend not reachable: start `npm run server`' : ''
      setStatus(`Error: ${raw}${hint}`)
      disconnect()
    }
  }

  function disconnect() {
    setConnected(false)
    setStatus('Idle')
    dcRef.current?.close()
    dcRef.current = null

    if (pcRef.current) {
      for (const sender of pcRef.current.getSenders()) {
        sender.track?.stop()
      }
      pcRef.current.close()
      pcRef.current = null
    }
  }

  return (
    <section className={`voice-panel voice-panel--${panelSize} card`}>
      <div className="voice-panel__head">
        <div>
          <p className="voice-panel__eyebrow">Incoming call</p>
          <h2>Personal secretary</h2>
          <p>Phone-style voice session. You talk, it suggests, finds tasks, and executes commands.</p>
        </div>
        <div className="voice-panel__size">
          <button className={panelSize === 'compact' ? 'is-active' : ''} onClick={() => setPanelSize('compact')} type="button">S</button>
          <button className={panelSize === 'expanded' ? 'is-active' : ''} onClick={() => setPanelSize('expanded')} type="button">L</button>
        </div>
      </div>
      <div className="voice-panel__controls">
        <button className="voice-btn" onClick={connected ? disconnect : connect} type="button">
          {connected ? 'Hang up' : 'Answer call'}
        </button>
        <span className="voice-status">{status}</span>
      </div>
      <audio ref={audioRef} />
      {secureContextWarning && <p className="voice-log__empty">{secureContextWarning}</p>}
      <div className="voice-context">
        <h3>Tasks in the conversation</h3>
        {referencedTasks.length === 0 ? (
          <p className="voice-log__empty">No task references yet. Ask about a deadline, a task title, or tell it to create one.</p>
        ) : (
          <div className="voice-context__list">
            {referencedTasks.map((task) => (
              <article className={`voice-task${task.status === 'done' ? ' is-done' : ''}`} key={task.id}>
                <strong>{task.title}</strong>
                <span>{task.deadline ? `due ${task.deadline}` : 'no deadline'}</span>
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="voice-log">
        {events.length === 0 && <p className="voice-log__empty">No voice events yet.</p>}
        {events.map((line, idx) => (
          <p key={`${idx}-${line}`}>{line}</p>
        ))}
      </div>
      {!settings.llmEnabled && (
        <p className="voice-log__empty">Enable LLM in Settings first. API key stays local in browser for app features.</p>
      )}
    </section>
  )
}
