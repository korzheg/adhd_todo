import type { LifeAreaScore } from '../types/domain'
import { HealthBar } from './HealthBar'

interface DashboardProps {
  scores: LifeAreaScore[]
  overallHealth: number
}

function overallCopy(health: number) {
  if (health >= 75) {
    return {
      status: 'System stable',
      copy: 'Life areas look balanced. Keep momentum, don\'t overpack the day.',
    }
  }
  if (health >= 45) {
    return {
      status: 'Pressure rising',
      copy: 'Some bars are draining. Focus on the smallest high-impact action first.',
    }
  }
  return {
    status: 'Critical overload',
    copy: 'Multiple life areas are bleeding. Protect the next 1–3 actions only. Everything else can wait.',
  }
}

export function Dashboard({ scores, overallHealth }: DashboardProps) {
  const state = overallHealth >= 75 ? 'healthy' : overallHealth >= 45 ? 'warning' : 'critical'
  const info = overallCopy(overallHealth)

  return (
    <div className="dashboard-view">
      <div className={`overall-hero is-${state}`}>
        <p className="overall-hero__label">Overall health</p>
        <p className="overall-hero__pct">{overallHealth}%</p>
        <p className="overall-hero__status">{info.status}</p>
        <p className="overall-hero__copy">{info.copy}</p>
      </div>
      <div className="health-grid">
        {scores.map((score) => (
          <HealthBar key={score.category} score={score} />
        ))}
      </div>
    </div>
  )
}
