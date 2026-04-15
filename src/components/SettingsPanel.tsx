import type { AppSettings } from '../types/domain'

interface SettingsPanelProps {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
  syncStatus: string
  syncBusy: boolean
  onPullSync: () => Promise<void>
  onPushSync: () => Promise<void>
}

export function SettingsPanel({ settings, onChange, syncStatus, syncBusy, onPullSync, onPushSync }: SettingsPanelProps) {
  function patch<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    onChange({
      ...settings,
      [key]: value,
    })
  }

  return (
    <section className="settings-view">
      <div className="settings-section">
        <h2>LLM Connection</h2>
        <p className="settings-note">API key stays in local browser storage, but it is optional if Backend API URL points to your deployed backend with OPENAI_API_KEY in env.</p>
        <div className="settings-grid">
          <label>
            <span>API endpoint</span>
            <input
              onChange={(event) => patch('endpoint', event.target.value)}
              value={settings.endpoint}
            />
          </label>
          <label>
            <span>Model</span>
            <input onChange={(event) => patch('model', event.target.value)} value={settings.model} />
          </label>
          <label>
            <span>Backend API URL</span>
            <input
              onChange={(event) => patch('backendUrl', event.target.value)}
              placeholder="/api or https://your-backend.example.com/api"
              value={settings.backendUrl}
            />
          </label>
          <label className="settings-grid__wide">
            <span>API key</span>
            <input
              onChange={(event) => patch('apiKey', event.target.value)}
              placeholder="sk-..."
              type="password"
              value={settings.apiKey}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Behavior</h2>
        <div className="settings-grid">
          <label>
            <span>Theme</span>
            <select
              onChange={(event) => patch('theme', event.target.value as AppSettings['theme'])}
              value={settings.theme}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="toggle-row">
            <input
              checked={settings.llmEnabled}
              onChange={(event) => patch('llmEnabled', event.target.checked)}
              type="checkbox"
            />
            <span>Enable live LLM analysis</span>
          </label>
          <label className="toggle-row">
            <input
              checked={settings.reduceMotion}
              onChange={(event) => patch('reduceMotion', event.target.checked)}
              type="checkbox"
            />
            <span>Reduce motion</span>
          </label>
          <label>
            <span>Visual intensity</span>
            <select
              onChange={(event) => patch('intensity', event.target.value as AppSettings['intensity'])}
              value={settings.intensity}
            >
              <option value="calm">Calm</option>
              <option value="dramatic">Dramatic</option>
            </select>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>Device Sync</h2>
        <p className="settings-note">Use the same sync key on desktop and iPhone to share the same task list.</p>
        <div className="settings-grid">
          <label className="toggle-row settings-grid__wide">
            <input
              checked={settings.syncEnabled}
              onChange={(event) => patch('syncEnabled', event.target.checked)}
              type="checkbox"
            />
            <span>Enable sync</span>
          </label>
          <label className="settings-grid__wide">
            <span>Sync key</span>
            <input
              onChange={(event) => patch('syncKey', event.target.value)}
              placeholder="my-team-demo-key"
              value={settings.syncKey}
            />
          </label>
        </div>
        <div className="sync-controls">
          <button disabled={syncBusy || !settings.syncEnabled || !settings.syncKey.trim()} onClick={() => void onPullSync()} type="button">
            Pull from cloud
          </button>
          <button disabled={syncBusy || !settings.syncEnabled || !settings.syncKey.trim()} onClick={() => void onPushSync()} type="button">
            Push to cloud
          </button>
        </div>
        {syncStatus && <p className="settings-note">{syncStatus}</p>}
      </div>
    </section>
  )
}
