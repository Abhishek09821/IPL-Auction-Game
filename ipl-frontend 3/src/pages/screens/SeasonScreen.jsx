// src/pages/screens/SeasonScreen.jsx
import { useState, useEffect } from 'react'
import axios from 'axios'
import './SeasonScreen.css'
import { fmtCr } from '../../utils/helpers'

export default function SeasonScreen({ roomId, socket, room, myTeamId, teams, onPlayoffs }) {
  const [points,  setPoints]  = useState([])
  const [matches, setMatches] = useState([])
  const [simming, setSimming] = useState(false)
  const [done,    setDone]    = useState(false)
  const isHost = true // for demo everyone can sim

  const loadData = () => {
    axios.get(`/api/points/${roomId}`).then(r => setPoints(r.data)).catch(() => {})
    axios.get(`/api/matches/${roomId}`).then(r => setMatches(r.data)).catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (!socket) return
    socket.on('season:complete', () => { setSimming(false); setDone(true); loadData() })
    return () => socket.off('season:complete')
  }, [socket, roomId])

  const simulate = () => {
    setSimming(true)
    socket.emit('season:simulate', { roomId }, (res) => {
      if (res?.error) { alert(res.error); setSimming(false) }
    })
  }

  return (
    <div className="season-screen fade-in">
      <div className="ss-header">
        <div>
          <h2 className="display" style={{ fontSize: '2rem', color: 'var(--gold)' }}>
            🏏 IPL 2024 — LEAGUE STAGE
          </h2>
          <p className="text-muted">All 8 teams play each other once · Top 4 advance</p>
        </div>
        <div className="ss-actions">
          {!done && (
            <button className="btn btn-gold" onClick={simulate} disabled={simming}>
              {simming ? <><span className="spinner" style={{ width: 18, height: 18 }} /> SIMULATING…</> : '⚡ SIMULATE SEASON'}
            </button>
          )}
          {done && (
            <button className="btn btn-cyan" onClick={onPlayoffs}>
              🏆 GO TO PLAYOFFS →
            </button>
          )}
        </div>
      </div>

      <div className="ss-grid">
        {/* Points table */}
        <div className="ss-left">
          <p className="section-title">POINTS TABLE</p>
          <div className="pts-table-wrap card">
            <table className="pts-table">
              <thead>
                <tr>
                  <th>#</th><th>Team</th><th>M</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th>
                </tr>
              </thead>
              <tbody>
                {points.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--muted)', padding:'2rem' }}>
                    Simulate the season to see standings
                  </td></tr>
                ) : points.map((row, i) => (
                  <tr
                    key={row.team_id}
                    className={`${i < 4 ? 'qualify' : ''} ${row.team_id === myTeamId ? 'myrow' : ''}`}
                  >
                    <td className="heading">{i + 1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
                        <span style={{ color: row.color }}>{row.emoji}</span>
                        <span className="heading">{row.short_name}</span>
                        {row.team_id === myTeamId && <span className="you-badge" style={{ background:'var(--cyan)', color:'#000', fontSize:'.6rem', padding:'.1rem .35rem', borderRadius:'50px', fontFamily:'var(--ff-head)' }}>YOU</span>}
                      </div>
                    </td>
                    <td>{row.matches}</td>
                    <td className="text-green">{row.wins}</td>
                    <td className="text-red">{row.losses}</td>
                    <td><strong className="display" style={{ color:'var(--gold)', fontSize:'1.15rem' }}>{row.points}</strong></td>
                    <td className="text-muted" style={{ fontSize:'.82rem' }}>
                      {Number(row.nrr) >= 0 ? '+' : ''}{Number(row.nrr).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {done && <p className="pts-note text-muted">✅ Top 4 teams highlighted advance to playoffs</p>}
          </div>
        </div>

        {/* Match feed */}
        <div className="ss-right">
          <p className="section-title">MATCH RESULTS</p>
          {matches.length === 0 ? (
            <div className="no-matches card">
              <p className="text-muted" style={{ textAlign:'center', padding:'2rem' }}>
                No matches yet. Hit Simulate Season!
              </p>
            </div>
          ) : (
            <div className="match-feed">
              {matches.map(m => (
                <div key={m.id} className="match-card card fade-in">
                  <div className="mc-teams">
                    <span className="mc-team heading" style={{ color: m.t1_color }}>
                      {m.emoji1} {m.t1_short}
                    </span>
                    <div className="mc-scores">
                      <span className={`mc-score display ${m.winner_id === m.team1_id ? 'text-gold' : 'text-muted'}`}>
                        {m.score1}
                      </span>
                      <span className="mc-vs text-muted">vs</span>
                      <span className={`mc-score display ${m.winner_id === m.team2_id ? 'text-gold' : 'text-muted'}`}>
                        {m.score2}
                      </span>
                    </div>
                    <span className="mc-team heading" style={{ color: m.t2_color, textAlign:'right' }}>
                      {m.t2_short}
                    </span>
                  </div>
                  <p className="mc-result text-green">🏆 {m.winner_name} won</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
