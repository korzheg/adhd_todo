import type { LifeAreaScore } from '../types/domain'

const SEGMENTS = 10

export function HealthBar({ score }: { score: LifeAreaScore }) {
  const filledCount = Math.round((score.score / 100) * SEGMENTS)

  const heartChar =
    score.state === 'healthy' ? '❤️' : score.state === 'warning' ? '🧡' : '🖤'

  return (
    <div className={`hbar is-${score.state}`}>
      <div className="hbar__head">
        <span className={`hbar__heart is-${score.state}`} aria-hidden="true">
          {heartChar}
        </span>
        <span className="hbar__label">{score.label}</span>
        <span className="hbar__pct">{score.score}%</span>
      </div>
      <div className="hbar__track">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div key={i} className={`hbar__seg${i < filledCount ? ' filled' : ''}`} />
        ))}
      </div>
      <div className="hbar__info">
        <span>{score.openCount} open</span>
        <span>{score.overdueCount} overdue</span>
        <span>{score.dueSoonCount} due soon</span>
      </div>
      <p className="hbar__msg">{score.message}</p>
    </div>
  )
}
