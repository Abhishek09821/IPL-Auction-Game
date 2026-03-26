// src/pages/screens/TradingWindow.jsx
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { ROLE_PILL, ROLE_EMOJI, fmtCr } from '../../utils/helpers'
import './TradingWindow.css'

const STATUS_COLOR = {
  pending:   'var(--gold)',
  accepted:  'var(--green)',
  rejected:  'var(--red)',
  cancelled: 'var(--muted)',
}

export default function TradingWindow({ roomId, socket, teams, myTeamId, room, onContinue }) {
  const [mySquad,      setMySquad]      = useState([])
  const [targetTeam,   setTargetTeam]   = useState(null)
  const [targetSquad,  setTargetSquad]  = useState([])
  const [offerPlayer,  setOfferPlayer]  = useState(null)
  const [wantPlayer,   setWantPlayer]   = useState(null)
  const [message,      setMessage]      = useState('')
  const [trades,       setTrades]       = useState([])
  const [sending,      setSending]      = useState(false)
  const [notification, setNotification] = useState(null)
  const [tab,          setTab]          = useState('propose') // propose | history
  const isHost = room?.host_id != null

  const myTeam = teams.find(t => t.id === myTeamId)

  // Load squads + trades
  const loadMySquad = useCallback(() => {
    if (!myTeamId) return
    axios.get(`/api/rooms/${roomId}/squad/${myTeamId}`).then(r => setMySquad(r.data))
  }, [roomId, myTeamId])

  const loadTargetSquad = useCallback((tid) => {
    if (!tid) return setTargetSquad([])
    axios.get(`/api/rooms/${roomId}/squad/${tid}`).then(r => setTargetSquad(r.data))
  }, [roomId])

  const loadTrades = useCallback(() => {
    axios.get(`/api/trades/${roomId}`).then(r => setTrades(r.data))
  }, [roomId])

  useEffect(() => {
    loadMySquad()
    loadTrades()
  }, [loadMySquad, loadTrades])

  useEffect(() => {
    if (targetTeam) loadTargetSquad(targetTeam)
    else setTargetSquad([])
  }, [targetTeam, loadTargetSquad])

  // Socket listeners
  useEffect(() => {
    if (!socket) return
    socket.on('trades:update', (updated) => setTrades(updated))
    socket.on('trade:incoming', ({ fromTeamId }) => {
      const team = teams.find(t => t.id === fromTeamId)
      setNotification(`📩 Trade offer from ${team?.name || 'a team'}!`)
      setTimeout(() => setNotification(null), 4000)
      loadTrades()
    })
    socket.on('trade:completed', () => {
      loadMySquad()
      if (targetTeam) loadTargetSquad(targetTeam)
    })
    socket.on('trade:window_closed', () => onContinue())
    return () => {
      socket.off('trades:update')
      socket.off('trade:incoming')
      socket.off('trade:completed')
      socket.off('trade:window_closed')
    }
  }, [socket, teams, targetTeam, loadMySquad, loadTargetSquad, loadTrades, onContinue])

  const propose = () => {
    if (!offerPlayer || !wantPlayer || !targetTeam) return
    setSending(true)
    socket.emit('trade:propose', {
      roomId,
      toTeamId:      targetTeam,
      offerPlayerId: offerPlayer.id,
      wantPlayerId:  wantPlayer.id,
      message,
    }, (res) => {
      setSending(false)
      if (res?.error) return alert(res.error)
      setOfferPlayer(null); setWantPlayer(null); setMessage('')
      setTab('history')
    })
  }

  const respond = (tradeId, action) => {
    socket.emit(`trade:${action}`, { roomId, tradeId }, (res) => {
      if (res?.error) alert(res.error)
      else loadTrades()
    })
  }

  const closeWindow = () => {
    socket.emit('trade:close', { roomId }, (res) => {
      if (res?.error) alert(res.error)
    })
  }

  const otherTeams = teams.filter(t => t.id !== myTeamId && !t.is_ai)

  // ─── Pending incoming for my team
  const incoming = trades.filter(t => t.to_team_id === myTeamId && t.status === 'pending')
  const outgoing = trades.filter(t => t.from_team_id === myTeamId && t.status === 'pending')

  return (
    <div className="trading-window fade-in">

      {/* Toast notification */}
      {notification && (
        <div className="trade-notif">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="tw-header">
        <div>
          <h2 className="display" style={{ fontSize: '2rem', color: 'var(--gold)' }}>
            🔄 TRADING WINDOW
          </h2>
          <p className="text-muted">Swap players with other teams before the season begins</p>
        </div>
        <div className="tw-header-right">
          {incoming.length > 0 && (
            <div className="incoming-badge pill pill-gold">
              📩 {incoming.length} incoming offer{incoming.length > 1 ? 's' : ''}
            </div>
          )}
          {isHost && (
            <button className="btn btn-cyan" onClick={closeWindow}>
              Close Window & Play Season →
            </button>
          )}
          {!isHost && (
            <button className="btn btn-ghost" onClick={onContinue}>
              Skip to Season →
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tw-tabs">
        <button className={`tw-tab ${tab === 'propose' ? 'active' : ''}`} onClick={() => setTab('propose')}>
          ➕ Propose Trade
        </button>
        <button className={`tw-tab ${tab === 'incoming' ? 'active' : ''}`} onClick={() => setTab('incoming')}>
          📩 Incoming {incoming.length > 0 && <span className="tab-badge">{incoming.length}</span>}
        </button>
        <button className={`tw-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          📋 All Trades
        </button>
      </div>

      {/* ── PROPOSE TAB ─────────────────────────── */}
      {tab === 'propose' && (
        <div className="tw-propose-grid fade-in">

          {/* My squad */}
          <div className="tw-squad-panel card">
            <p className="section-title">
              {myTeam?.emoji} YOUR SQUAD — OFFER A PLAYER
            </p>
            <div className="squad-scroll">
              {mySquad.length === 0
                ? <p className="text-muted" style={{ padding: '1rem', fontSize: '.85rem' }}>No players in your squad</p>
                : mySquad.map(p => (
                  <div
                    key={p.id}
                    className={`trade-player-row ${offerPlayer?.id === p.id ? 'selected' : ''}`}
                    onClick={() => setOfferPlayer(offerPlayer?.id === p.id ? null : p)}
                  >
                    <span className="tpr-emoji">{ROLE_EMOJI[p.role]}</span>
                    <div className="tpr-info">
                      <span className="tpr-name heading">{p.name}</span>
                      <span className={`pill ${ROLE_PILL[p.role]}`} style={{ fontSize: '.6rem', padding: '.1rem .5rem' }}>{p.role}</span>
                    </div>
                    <div className="tpr-right">
                      <span className="tpr-rating text-muted">⭐ {p.rating}</span>
                      <span className="tpr-price display text-gold" style={{ fontSize: '.82rem' }}>{fmtCr(p.sold_price)}</span>
                    </div>
                    {offerPlayer?.id === p.id && <span className="tpr-check">✓</span>}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Center: target + compose */}
          <div className="tw-center-panel">
            <div className="card" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
              <p className="section-title">SELECT TARGET TEAM</p>
              {otherTeams.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '.85rem' }}>
                  No other human-controlled teams in this room
                </p>
              ) : (
                <div className="target-team-list">
                  {otherTeams.map(t => (
                    <button
                      key={t.id}
                      className={`target-team-btn ${targetTeam === t.id ? 'active' : ''}`}
                      style={{ '--tc': t.color }}
                      onClick={() => {
                        setTargetTeam(targetTeam === t.id ? null : t.id)
                        setWantPlayer(null)
                      }}
                    >
                      <span>{t.emoji}</span>
                      <span className="heading" style={{ color: targetTeam === t.id ? t.color : undefined }}>
                        {t.short_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trade summary */}
            <div className="trade-summary card">
              <p className="section-title">TRADE PROPOSAL</p>
              <div className="ts-row">
                <div className="ts-side">
                  <div className="ts-label text-muted">YOU GIVE</div>
                  {offerPlayer
                    ? <div className="ts-player selected-pill">
                        {ROLE_EMOJI[offerPlayer.role]} <strong>{offerPlayer.name}</strong>
                        <span className="text-muted"> ⭐{offerPlayer.rating}</span>
                      </div>
                    : <div className="ts-empty text-muted">← Select from your squad</div>
                  }
                </div>
                <div className="ts-arrow">⇄</div>
                <div className="ts-side">
                  <div className="ts-label text-muted">YOU GET</div>
                  {wantPlayer
                    ? <div className="ts-player selected-pill">
                        {ROLE_EMOJI[wantPlayer.role]} <strong>{wantPlayer.name}</strong>
                        <span className="text-muted"> ⭐{wantPlayer.rating}</span>
                      </div>
                    : <div className="ts-empty text-muted">Select from target →</div>
                  }
                </div>
              </div>

              <input
                className="input"
                placeholder="Optional message to the other team…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                style={{ marginTop: '.8rem', fontSize: '.88rem' }}
              />

              <button
                className="btn btn-gold propose-btn"
                onClick={propose}
                disabled={!offerPlayer || !wantPlayer || !targetTeam || sending}
              >
                {sending ? '⏳ Sending…' : '📤 SEND TRADE OFFER'}
              </button>
            </div>
          </div>

          {/* Target squad */}
          <div className="tw-squad-panel card">
            <p className="section-title">
              {targetTeam ? (teams.find(t=>t.id===targetTeam)?.emoji + ' TARGET SQUAD — WANT A PLAYER') : 'TARGET SQUAD'}
            </p>
            <div className="squad-scroll">
              {!targetTeam
                ? <p className="text-muted" style={{ padding: '1rem', fontSize: '.85rem' }}>Select a target team first</p>
                : targetSquad.length === 0
                  ? <p className="text-muted" style={{ padding: '1rem', fontSize: '.85rem' }}>No players</p>
                  : targetSquad.map(p => (
                    <div
                      key={p.id}
                      className={`trade-player-row ${wantPlayer?.id === p.id ? 'selected' : ''}`}
                      onClick={() => setWantPlayer(wantPlayer?.id === p.id ? null : p)}
                    >
                      <span className="tpr-emoji">{ROLE_EMOJI[p.role]}</span>
                      <div className="tpr-info">
                        <span className="tpr-name heading">{p.name}</span>
                        <span className={`pill ${ROLE_PILL[p.role]}`} style={{ fontSize: '.6rem', padding: '.1rem .5rem' }}>{p.role}</span>
                      </div>
                      <div className="tpr-right">
                        <span className="tpr-rating text-muted">⭐ {p.rating}</span>
                        <span className="tpr-price display text-gold" style={{ fontSize: '.82rem' }}>{fmtCr(p.sold_price)}</span>
                      </div>
                      {wantPlayer?.id === p.id && <span className="tpr-check">✓</span>}
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      )}

      {/* ── INCOMING TAB ─────────────────────────── */}
      {tab === 'incoming' && (
        <div className="tw-incoming fade-in">
          {incoming.length === 0 ? (
            <div className="no-trades card">
              <p className="text-muted" style={{ textAlign: 'center', padding: '2.5rem', fontSize: '1rem' }}>
                📭 No pending incoming offers
              </p>
            </div>
          ) : incoming.map(tr => (
            <TradeCard
              key={tr.id}
              trade={tr}
              myTeamId={myTeamId}
              showActions
              onAccept={() => respond(tr.id, 'accept')}
              onReject={() => respond(tr.id, 'reject')}
            />
          ))}
        </div>
      )}

      {/* ── HISTORY TAB ─────────────────────────── */}
      {tab === 'history' && (
        <div className="tw-history fade-in">
          {trades.length === 0 ? (
            <div className="no-trades card">
              <p className="text-muted" style={{ textAlign: 'center', padding: '2.5rem', fontSize: '1rem' }}>
                No trades yet — propose one!
              </p>
            </div>
          ) : trades.map(tr => (
            <TradeCard
              key={tr.id}
              trade={tr}
              myTeamId={myTeamId}
              showActions={tr.to_team_id === myTeamId && tr.status === 'pending'}
              showCancel={tr.from_team_id === myTeamId && tr.status === 'pending'}
              onAccept={() => respond(tr.id, 'accept')}
              onReject={() => respond(tr.id, 'reject')}
              onCancel={() => respond(tr.id, 'cancel')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── TradeCard sub-component ─────────────── */
function TradeCard({ trade: tr, myTeamId, showActions, showCancel, onAccept, onReject, onCancel }) {
  return (
    <div className="trade-card card fade-in">
      <div className="tc-header">
        <div className="tc-teams">
          <span className="heading" style={{ color: tr.from_color }}>{tr.from_emoji} {tr.from_short}</span>
          <span className="tc-arrow text-muted">⇄</span>
          <span className="heading" style={{ color: tr.to_color }}>{tr.to_emoji} {tr.to_short}</span>
        </div>
        <div className="tc-status" style={{ color: STATUS_COLOR[tr.status] }}>
          {tr.status.toUpperCase()}
        </div>
      </div>

      <div className="tc-players">
        <div className="tc-player">
          <span className="tcp-label text-muted">{tr.from_short} SENDS</span>
          <div className="tcp-card">
            <span>{ROLE_EMOJI[tr.offer_role]}</span>
            <span className="tcp-name heading">{tr.offer_player_name}</span>
            <span className="text-muted">⭐{tr.offer_rating}</span>
          </div>
        </div>
        <div className="tc-vs display text-muted">FOR</div>
        <div className="tc-player">
          <span className="tcp-label text-muted">{tr.to_short} SENDS</span>
          <div className="tcp-card">
            <span>{ROLE_EMOJI[tr.want_role]}</span>
            <span className="tcp-name heading">{tr.want_player_name}</span>
            <span className="text-muted">⭐{tr.want_rating}</span>
          </div>
        </div>
      </div>

      {tr.message && (
        <p className="tc-msg text-muted">💬 "{tr.message}"</p>
      )}

      {(showActions || showCancel) && (
        <div className="tc-actions">
          {showActions && <>
            <button className="btn btn-green" onClick={onAccept} style={{ padding: '.5rem 1.3rem' }}>✅ ACCEPT</button>
            <button className="btn btn-danger" onClick={onReject} style={{ padding: '.5rem 1.3rem' }}>❌ REJECT</button>
          </>}
          {showCancel && (
            <button className="btn btn-ghost" onClick={onCancel} style={{ padding: '.5rem 1.3rem', fontSize: '.82rem' }}>↩ Cancel Offer</button>
          )}
        </div>
      )}
    </div>
  )
}
