// src/pages/screens/SquadScreen.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import { ROLE_PILL, ROLE_EMOJI, fmtCr } from '../../utils/helpers'
import './SquadScreen.css'

const ROLES = ['Batsman', 'Wicket-Keeper', 'All-Rounder', 'Bowler']
const ROLE_COL = {
  Batsman: 'var(--cyan)', Bowler: 'var(--red)',
  'All-Rounder': 'var(--green)', 'Wicket-Keeper': 'var(--gold)',
}

export default function SquadScreen({ roomId, teams, myTeamId, onContinue, continueLabel = 'PLAY SEASON →' }) {
  const [squad,    setSquad]    = useState([])
  const [viewTeam, setViewTeam] = useState(myTeamId)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!viewTeam) return
    setLoading(true)
    axios.get(`/api/rooms/${roomId}/squad/${viewTeam}`)
      .then(r => setSquad(r.data))
      .finally(() => setLoading(false))
  }, [viewTeam, roomId])

  const currentTeam = teams.find(t => t.id === viewTeam) || teams[0]
  const spent       = squad.reduce((s, p) => s + Number(p.sold_price || 0), 0)
  const budgetLeft  = Number(currentTeam?.budget ?? 0)

  return (
    <div className="squad-screen fade-in">
      <div className="sq-header">
        <div>
          <h2 className="display" style={{ fontSize: '2.2rem', color: 'var(--gold)' }}>
            AUCTION COMPLETE
          </h2>
          <p className="text-muted">Review your squad before the season begins</p>
        </div>
        <button className="btn btn-cyan" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>

      {/* Team tabs */}
      <div className="sq-tabs">
        {teams.map(t => (
          <button
            key={t.id}
            className={`sq-tab ${viewTeam === t.id ? 'active' : ''}`}
            onClick={() => setViewTeam(t.id)}
            style={{ '--tc': t.color }}
          >
            <span>{t.emoji}</span>
            <span className="heading" style={{ color: viewTeam === t.id ? t.color : undefined }}>
              {t.short_name}
            </span>
            {t.id === myTeamId && <span className="you-badge">YOU</span>}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="sq-stats-bar card">
        <div className="stat-chip">
          <span className="sc-lbl">Team</span>
          <span className="sc-val heading">{currentTeam?.name}</span>
        </div>
        <div className="stat-chip">
          <span className="sc-lbl">Players</span>
          <span className="sc-val display text-gold">{squad.length}</span>
        </div>
        <div className="stat-chip">
          <span className="sc-lbl">Spent</span>
          <span className="sc-val display text-red">{fmtCr(spent)}</span>
        </div>
        <div className="stat-chip">
          <span className="sc-lbl">Budget Left</span>
          <span className="sc-val display text-green">{fmtCr(budgetLeft)}</span>
        </div>
      </div>

      {/* Roles grid */}
      {loading ? (
        <div className="page-loader" style={{ flex: 1 }}><div className="spinner" /></div>
      ) : (
        <div className="sq-roles-grid">
          {ROLES.map(role => {
            const ps = squad.filter(p => p.role === role)
            return (
              <div key={role} className="role-section card">
                <h4 className="heading" style={{ color: ROLE_COL[role], fontSize: '1rem', marginBottom: '.8rem', letterSpacing: '.05em' }}>
                  {ROLE_EMOJI[role]} {role}s ({ps.length})
                </h4>
                {ps.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '.84rem' }}>None acquired</p>
                ) : (
                  ps.map(p => (
                    <div key={p.id} className="sq-player">
                      <div className="sqp-info">
                        <span className="sqp-name heading">{p.name}</span>
                        <span className="sqp-country text-muted">{p.country}</span>
                      </div>
                      <div className="sqp-right">
                        <span className="sqp-rating text-muted">⭐ {p.rating}</span>
                        <span className="sqp-price display text-gold">{fmtCr(p.sold_price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
