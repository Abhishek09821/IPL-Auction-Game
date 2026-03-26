// src/pages/LobbyPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { IPL_TEAMS } from '../utils/helpers'
import './LobbyPage.css'

export default function LobbyPage() {
  const [tab,      setTab]      = useState('create')  // 'create' | 'join'
  const [selected, setSelected] = useState(-1)
  const [joinCode, setJoinCode] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const nav = useNavigate()

  const create = async () => {
    if (selected < 0) return setErr('Pick a team first!')
    setBusy(true); setErr('')
    try {
      const { data } = await axios.post('/api/rooms', { teamIndex: selected })
      nav(`/room/${data.roomId}`)
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Failed to create room')
      setBusy(false)
    }
  }

  const join = async () => {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) return setErr('Enter a valid room code')
    setBusy(true); setErr('')
    try {
      const { data } = await axios.post('/api/rooms/join', { code })
      nav(`/room/${data.roomId}`)
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Room not found')
      setBusy(false)
    }
  }

  return (
    <div className="lobby-page fade-in">
      <div className="lobby-bg-orb" />

      <div className="lobby-hero">
        <div className="pill pill-gold">🏏 Season 2024</div>
        <h1 className="lobby-h1 display">IPL AUCTION<br/>SIMULATOR</h1>
        <p className="lobby-sub text-muted">
          Build your dream squad · Dominate the auction · Win the trophy
        </p>
      </div>

      <div className="lobby-card card card-glow">

        {/* ── Tabs ── */}
        <div className="lobby-tabs">
          <button className={`ltab ${tab === 'create' ? 'active' : ''}`} onClick={() => { setTab('create'); setErr('') }}>
            ➕ Create Room
          </button>
          <button className={`ltab ${tab === 'join' ? 'active' : ''}`} onClick={() => { setTab('join'); setErr('') }}>
            🔗 Join Room
          </button>
        </div>

        {/* ── CREATE ── */}
        {tab === 'create' && (
          <div className="fade-in">
            <h2 className="section-title">Choose Your Team</h2>
            <div className="team-grid">
              {IPL_TEAMS.map((t, i) => (
                <button
                  key={i}
                  className={`team-tile ${selected === i ? 'sel' : ''}`}
                  onClick={() => setSelected(i)}
                  style={{ '--tc': t.color }}
                >
                  <span className="tt-emoji">{t.emoji}</span>
                  <span className="tt-short heading" style={{ color: t.color }}>{t.short}</span>
                  <span className="tt-name">{t.name}</span>
                  {selected === i && <span className="tt-check">✓</span>}
                </button>
              ))}
            </div>

            {err && <p className="lobby-err">{err}</p>}

            <div className="lobby-actions">
              <button className="btn btn-gold" onClick={create} disabled={selected < 0 || busy}>
                {busy ? '⏳ Creating…' : '🏏 CREATE ROOM'}
              </button>
            </div>

            <div className="lobby-info">
              <div className="info-row"><span>🤖</span><span>7 AI teams fill remaining slots automatically</span></div>
              <div className="info-row"><span>👥</span><span>Share the room code for friends to join</span></div>
              <div className="info-row"><span>💰</span><span>Each team gets ₹100 Cr auction budget</span></div>
            </div>
          </div>
        )}

        {/* ── JOIN ── */}
        {tab === 'join' && (
          <div className="join-panel fade-in">
            <div className="join-hero">
              <span style={{ fontSize: '3.5rem' }}>🔗</span>
              <h3 className="heading" style={{ fontSize: '1.4rem' }}>Got a room code?</h3>
              <p className="text-muted" style={{ fontSize: '.9rem' }}>
                Ask the host for their 6-character room code
              </p>
            </div>

            <div className="code-input-wrap">
              <input
                className="code-input"
                placeholder="e.g. MUM7K2"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={8}
                onKeyDown={e => e.key === 'Enter' && join()}
              />
            </div>

            {err && <p className="lobby-err">{err}</p>}

            <button className="btn btn-cyan join-btn" onClick={join} disabled={!joinCode || busy}>
              {busy ? '⏳ Joining…' : '🚀 JOIN ROOM'}
            </button>

            <div className="lobby-info" style={{ marginTop: '1.5rem' }}>
              <div className="info-row"><span>🏟️</span><span>You can claim any unclaimed team in the waiting room</span></div>
              <div className="info-row"><span>⚡</span><span>Auction starts when the host kicks things off</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
