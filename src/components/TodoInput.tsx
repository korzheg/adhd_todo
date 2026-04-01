import { useState } from 'react'
import type { DraftAnalysis } from '../types/domain'

interface TodoInputProps {
  isAnalyzing: boolean
  preview: DraftAnalysis | null
  onSubmit: (rawText: string) => Promise<void>
}

export function TodoInput({ isAnalyzing, preview, onSubmit }: TodoInputProps) {
  const [rawText, setRawText] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = rawText.trim()
    if (!value) return
    await onSubmit(value)
    setRawText('')
  }

  return (
    <section className="capture-section">
      <form className="capture-form" onSubmit={handleSubmit}>
        <input
          aria-label="Add a todo"
          autoComplete="off"
          className="capture-input"
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Type a task… pay rent tomorrow, study for exam in 3 days, buy food"
          value={rawText}
        />
        <button className="capture-btn" disabled={isAnalyzing} type="submit">
          {isAnalyzing ? '...' : '+ Add'}
        </button>
      </form>
      {preview && (
        <div className="analysis-chips">
          <span className="chip">{preview.category}</span>
          <span className="chip">Urgency {preview.urgency}/5</span>
          <span className="chip">{preview.deadline ?? 'No deadline'}</span>
          <span className={`chip${preview.source === 'llm' ? ' is-llm' : ''}`}>
            {preview.source === 'llm' ? '✦ LLM' : 'Rules'}
          </span>
          {preview.nextStep && <span className="chip">{preview.nextStep}</span>}
        </div>
      )}
    </section>
  )
}
