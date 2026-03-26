// src/pages/screens/WaitingRoom.jsx
import { useState, useEffect } from 'react'
import './WaitingRoom.css'

export default function WaitingRoom({ roomId, room, socket, teams, members, myTeamId, code, userId, onStart }) {
  const [localTeams,   setLocalTeams]   = useState(teams || [])
  const [localMembers, setLocalMembers] = useState(members || [])
  const [isReady,      setIsReady]      = useState(false)
  const [claiming,     setClaiming]     = useState(false)

  const isHost = room?.host_id === userId
  const me     = localMembers.find(m => m.user_id === userId)
  const myTeam = localTeams.find(t => t.id === (me?.team_id || myTeamId))

  const allHaveTeam = localMembers.length > 0 &&
    localMembers.every(m => m.team_id != null)
  const allReady    = localMembers.length > 0 &&
    localMembers.every(m => m.is_ready)

  useEffect(() => {
    if (!socket) return
    socket.on('lobby:state', ({ members, teams }) => {
      setLocalMembers(members)
      setLocalTeams(teams)
    })
    return () => socket.off('lobby:state')
  }, [socket])

  const claimTeam = async (teamId) => {
    setClaiming(teamId)
    socket.emit('lobby:claim_team', { roomId, teamId }, (res) => {
      setClaiming(false)
      if (res?.error) alert(res.error)
    })
  }

  const toggleReady = () => {
    const next = !isReady
    setIsReady(next)
    socket.emit('lobby:ready', { roomId, ready: next }, () => {})
  }

  const copyCode = () => {
    navigator.clipboard?.writeText(code)
  }

  return (
    <div className="waiting-room fade-in">
      <div className="wr-bg-ring wr-ring1" />
      <div className="wr-bg-ring wr-ring2" />

      <div className="wr-content">

        {/* Header */}
        <div className="wr-header">
          <h2 className="display" style={{ fontSize: '2.5rem', color: 'var(--gold)' }}>
            🏟️ WAITING ROOM
          </h2>
          <p className="text-muted">Share the code · Claim a team · Get ready</p>

          {/* Room code chip */}
          <div className="room-code-chip" onClick={copyCode} title="Click to copy">
            <span className="rcc-label text-muted">ROOM CODE</span>
            <span className="rcc-code display text-gold">{code || '……'}</span>
            <span className="rcc-copy text-muted">📋 Copy</span>
          </div>
        </div>

        <div className="wr-grid">

          {/* LEFT: Team grid */}
          <div className="wr-left">
            <p className="section-title">CLAIM YOUR TEAM</p>
            <div className="wr-team-grid">
              {localTeams.map(t => {
                const owner = localMembers.find(m => m.team_id === t.id)
                const isMine = !t.is_ai && t.user_id === userId
                const claimed = !t.is_ai && t.user_id != null
                return (
                  <div
                    key={t.id}
                    className={`wr-team-card ${isMine ? 'mine' : ''} ${claimed && !isMine ? 'taken' : ''}`}
                    style={{ '--tc': t.color }}
                  >
                    <div className="wrtc-emoji">{t.emoji}</div>
                    <div className="wrtc-name heading" style={{ color: t.color }}>{t.short_name}</div>
                    <div className="wrtc-fullname text-muted">{t.name}</div>

                    {isMine ? (
                      <div className="wrtc-you">👤 YOU</div>
                    ) : claimed ? (
                      <div className="wrtc-owner text-cyan">
                        👤 {owner?.username || 'Player'}
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost wrtc-claim-btn"
                        onClick={() => claimTeam(t.id)}
                        disabled={claiming === t.id}
                        style={{ fontSize: '.72rem', padding: '.3rem .8rem' }}
                      >
                        {claiming === t.id ? '…' : '+ CLAIM'}
                      </button>
                    )}

                    {t.is_ai && <div className="wrtc-ai text-muted">🤖 AI</div>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT: Members + Actions */}
          <div className="wr-right">
            <p className="section-title">PLAYERS ({localMembers.length}/8)</p>

            <div className="wr-members">
              {localMembers.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '.88rem', textAlign: 'center', padding: '1rem' }}>
                  Waiting for players…
                </p>
              ) : localMembers.map(m => {
                const mTeam = localTeams.find(t => t.id === m.team_id)
                return (
                  <div key={m.user_id} className={`member-row ${m.user_id === userId ? 'me' : ''}`}>
                    <div className="mr-avatar" style={{ background: mTeam?.color || 'var(--border)' }}>
                      {m.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="mr-info">
                      <span className="mr-name heading">
                        {m.username}
                        {m.user_id === userId && <span className="you-badge" style={{ marginLeft: '.4rem' }}>YOU</span>}
                        {m.user_id === room?.host_id && <span className="host-badge">HOST</span>}
                      </span>
                      <span className="mr-team text-muted">
                        {mTeam
                          ? <span style={{ color: mTeam.color }}>{mTeam.emoji} {mTeam.name}</span>
                          : 'No team yet'
                        }
                      </span>
                    </div>
                    <div className={`mr-ready ${m.is_ready ? 'yes' : ''}`}>
                      {m.is_ready ? '✅' : '⏳'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Action area */}
            <div className="wr-actions">
              {myTeam && (
                <button
                  className={`btn ready-btn ${isReady ? 'btn-danger' : 'btn-green'}`}
                  onClick={toggleReady}
                >
                  {isReady ? '❌ NOT READY' : '✅ READY'}
                </button>
              )}

              {isHost && (
                <button
                  className="btn btn-gold start-btn"
                  onClick={onStart}
                  disabled={!allReady && localMembers.length > 1}
                  title={!allReady ? 'Wait for all players to ready up' : ''}
                >
                  ⚡ START AUCTION
                </button>
              )}

              {!isHost && (
                <p className="text-muted" style={{ fontSize: '.82rem', textAlign: 'center' }}>
                  Waiting for host to start the auction…
                </p>
              )}
            </div>

            <div className="wr-hint card" style={{ marginTop: '.8rem', padding: '.8rem 1rem' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                💡 Unclaimed teams will be controlled by AI. You can start with any number of players — unclaimed teams are managed automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
