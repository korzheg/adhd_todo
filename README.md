# Pulseboard ADHD Dashboard

Pulseboard is a mobile-friendly, local-first todo app prototype for ADHD task management. You enter tasks in a single line, the app classifies them into life areas, and a dashboard shows the health of each area based on backlog, deadlines, and completion momentum.

## What is implemented

- Single-line task capture with local date parsing.
- Optional live LLM interpretation using a user-provided API key and endpoint.
- Literal OpenAI Realtime API voice mode (WebRTC) with tool-calling to list/add/update/complete tasks.
- GPT-powered demo generation (falls back to local templates if LLM is unavailable).
- Task Copilot panel to adjust an existing todo with natural language (reschedule, set deadline, split tasks, lower effort).
- Deterministic fallback classification when the LLM is disabled or fails.
- Visual life-area health bars for finances, education, food, activity, home, admin, and social/rest.
- Prioritized focus queue and reminder panel.
- Dark and light theme modes (configurable in Settings).
- Local browser persistence.
- Manifest and service worker registration for basic PWA support.

## Run locally

```bash
npm install
npm run dev
```

Default port is `5180` and Vite will auto-pick another free port if needed.

## LLM setup

1. Open `Settings`.
2. Enable `Enable live LLM analysis`.
3. Enter your API key, endpoint, and model.

The API key is remembered in local browser storage (`localStorage`) on that device/browser.

## Realtime voice setup (OpenAI Realtime guide)

1. Create `.env` in project root with:

```bash
OPENAI_API_KEY=your_openai_key
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview
# optional telegram bot mode
TELEGRAM_BOT_TOKEN=
BOT_PORT=8787
```

2. Install backend dependencies:

```bash
npm install
```

3. Start backend and frontend in separate terminals:

```bash
npm run server
npm run dev
```

4. Open Settings view and use **Realtime Voice Copilot**.

Notes:
- This uses an ephemeral session token from `POST /api/realtime/session`.
- Browser sends audio via WebRTC directly to OpenAI Realtime API.
- Model can call task tools (`list_tasks`, `add_task`, `update_task`, `complete_task`).
- iPhone Safari microphone access requires HTTPS. Realtime voice will not start from a plain `http://192.168.x.x` dev URL.
- For iPhone testing, deploy frontend and backend to public HTTPS domains. Local Wi-Fi dev URLs are not enough for Realtime voice.

Messenger note:
- Telegram bots do not support true voice calls like phone calls.
- Telegram voice messages are supported by the backend bot flow.
- For actual phone-like calls, use Twilio/LiveKit/RTC provider and bridge to Realtime API.

## Cross-device sync (desktop + iPhone)

1. Start backend (`npm run server`) and frontend (`npm run dev`).
2. On both devices open Settings:
3. Set `Backend API URL`:
	- Local dev: `/api` (when frontend is proxied to local backend)
	- Public demo: `https://your-backend-domain/api`
4. Enable sync and set the same `Sync key` on both devices.
5. The app now auto-pushes and auto-pulls in the background.
6. Manual `Push to cloud` / `Pull from cloud` buttons are still available when you want to force it.

Without this, tasks are only local to each device/browser.

## Public demo hosting (iPhone from anywhere)

The simplest path is Vercel:

1. Push this project to GitHub.
2. Go to Vercel and import the repository.
3. Framework preset: `Vite`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

You will get a public HTTPS URL that works on iPhone without being on your home Wi-Fi.

## Fast free backend HTTPS deploy

Fastest free option for the backend is Render.

1. Push this repo to GitHub.
2. Go to Render and create a new `Blueprint` or `Web Service` from the repo.
3. It will pick up [render.yaml](/Users/egorkorzun/Desktop/todo_adhd_copilot/render.yaml).
4. Set env vars:
	- `OPENAI_API_KEY`
	- `OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview`
	- `OPENAI_MODEL=gpt-4.1-mini`
	- `TELEGRAM_BOT_TOKEN` only if you want Telegram bot mode
5. Deploy and copy the HTTPS backend URL.
6. In app Settings set `Backend API URL` to `https://your-render-domain.onrender.com/api`.

Important:
- This is enough for HTTPS Realtime voice on iPhone.
- Current sync storage uses JSON files on the server filesystem, which is fine for a demo but not durable long-term on free hosting. For durable sync, move shared state to a real database.

## Notes

- This MVP stores the API key in local browser storage because there is no backend yet.
- The prioritization formula is deterministic even when the LLM is enabled.
- `Load demo` appends generated tasks to your current list (it does not replace existing todos).

## Next implementation steps

- Replace localStorage with IndexedDB for more resilient local persistence.
- Add an explicit review/edit step before saving the LLM interpretation.
- Add browser notifications and scheduled reminders.
- Add tests around scoring, prioritization, and fallback parsing.
