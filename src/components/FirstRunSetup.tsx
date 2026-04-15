import { useState } from 'react'

interface FirstRunSetupProps {
  initialValue: string
  onSubmit: (apiKey: string) => void
}

export function FirstRunSetup({ initialValue, onSubmit }: FirstRunSetupProps) {
  const [apiKey, setApiKey] = useState(initialValue)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = apiKey.trim()
    if (!trimmed) {
      return
    }
    onSubmit(trimmed)
  }

  return (
    <div className="first-run-shell">
      <div className="first-run-card">
        <p className="first-run-eyebrow">First launch</p>
        <h1>Connect your key and open Pulseboard</h1>
        <p className="first-run-copy">
          Enter your OpenAI API key once. It stays only in this browser and can be changed later in Settings.
        </p>

        <form className="first-run-form" onSubmit={handleSubmit}>
          <input
            autoComplete="off"
            autoFocus
            className="first-run-input"
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            type="password"
            value={apiKey}
          />
          <button className="first-run-button" disabled={!apiKey.trim()} type="submit">
            Open app
          </button>
        </form>

        <p className="first-run-hint">If you use your deployed backend instead, you can still replace or remove this key later.</p>
      </div>
    </div>
  )
}