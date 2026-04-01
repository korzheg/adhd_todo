import type { ReminderItem } from '../types/domain'

interface ReminderPanelProps {
  reminders: ReminderItem[]
}

export function ReminderPanel({ reminders }: ReminderPanelProps) {
  if (reminders.length === 0) return null

  return (
    <section className="alerts-section">
      <div className="alerts-header">
        <span className="alert-dot" />
        <span>Urgent — needs action</span>
      </div>
      {reminders.map((r, i) => (
        <article className="alert-card" key={r.todoId}>
          <span className="alert-card__idx">0{i + 1}</span>
          <div className="alert-card__body">
            <h3>{r.title}</h3>
            <p>{r.reason}</p>
          </div>
          <div className="alert-card__meta">
            <span>{r.category}</span>
          </div>
        </article>
      ))}
    </section>
  )
}
