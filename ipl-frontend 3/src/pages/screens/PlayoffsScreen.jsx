// src/pages/screens/PlayoffsScreen.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import './PlayoffsScreen.css'

export default function PlayoffsScreen({ roomId, socket, myTeamId, teams, data, onChampion }) {
  const [po,      setPo]      = useState(data || null)
  const [simming, setSimming] = useState(false)
  const [done,    setDone]    = useState(!!data)

  useEffect(() => {
    if (!socket) return
    socket.on('playoffs:complete', (d) => { setPo(d); setDone(true); setSimming(false) })
    return () => socket.off('playoffs:complete')
  }, [socket])

  const simulate = () => {
    setSimming(true)
    socket.emit('playoffs:simulate', { roomId }, (res) => {
      if (res?.error) { alert(res.error); setSimming(false) }
    })
  }

  const getTeam = (id) => teams.find(t => t.id === id) || {}

  const MatchBox = ({ label, match, showWinner = true }) => {
    if (!match) return null
    const t1 = getTeam(match.i1 || match.team1_id)
    const t2 = getTeam(match.i2 || match.team2_id)
    const w  = match.winner
    return (
      <div className="po-match card">
        <p className="po-match-label heading">{label}</p>
        <div className={`po-team ${w === (match.i1 || match.team1_id) ? 'winner' : ''}`} style={{ '--tc': t1.color }}>
          <span className="pot-name heading">{t1.emoji} {t1.short_name}</span>
          <span className="pot-score display">{match.score1 ?? match.sc1}</span>
        </div>
        <div className="po-vs text-muted">vs</div>
        <div className={`po-team ${w === (match.i2 || match.team2_id) ? 'winner' : ''}`} style={{ '--tc': t2.color }}>
          <span className="pot-name heading">{t2.emoji} {t2.short_name}</span>
          <span className="pot-score display">{match.score2 ?? match.sc2}</span>
        </div>
        {showWinner && w && (
          <p className="po-wl text-green">✅ {getTeam(w).name} advance</p>
        )}
      </div>
    )
  }

  return (
    <div className="playoffs-screen fade-in">
      <div className="po-header">
        <div>
          <h2 className="display" style={{ fontSize: '2rem', color: 'var(--gold)' }}>
            🏆 IPL 2024 PLAYOFFS
          </h2>
          <p className="text-muted">Top 4 teams battle for the ultimate prize</p>
        </div>
        <div>
          {!done && (
            <button className="btn btn-gold" onClick={simulate} disabled={simming}>
              {simming ? '⏳ SIMULATING…' : '⚡ SIMULATE PLAYOFFS'}
            </button>
          )}
          {done && po && (
            <button className="btn btn-cyan" onClick={() => onChampion(getTeam(po.final?.winner || po.champion))}>
              👑 CROWN THE CHAMPION
            </button>
          )}
        </div>
      </div>

      {!po ? (
        <div className="po-empty card">
          <p className="text-muted" style={{ textAlign:'center', padding:'3rem' }}>
            Hit Simulate Playoffs to run the bracket!
          </p>
        </div>
      ) : (
        <div className="po-bracket">
          <div className="po-col">
            <MatchBox label="QUALIFIER 1 · 1st vs 2nd" match={po.q1} />
            <MatchBox label="ELIMINATOR · 3rd vs 4th"  match={po.eliminator || po.el} />
          </div>
          <div className="po-col">
            <MatchBox label="QUALIFIER 2" match={po.q2} />
            <div className="po-final-card card card-glow">
              <div style={{ textAlign:'center', padding:'.5rem 0' }}>
                <div style={{ fontSize:'2.5rem', animation:'bounce 1.5s ease infinite' }}>🏆</div>
                <p className="heading text-gold" style={{ letterSpacing:'.15em', marginTop:'.4rem' }}>THE FINAL</p>
              </div>
              <MatchBox label="" match={po.final} showWinner={false} />
              {po.final?.winner || po.champion ? (
                <p className="display text-gold" style={{ textAlign:'center', fontSize:'1.1rem', marginTop:'.6rem' }}>
                  🏆 {getTeam(po.final?.winner || po.champion).name} — CHAMPIONS!
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
