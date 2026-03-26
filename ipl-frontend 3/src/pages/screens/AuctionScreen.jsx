// src/pages/screens/AuctionScreen.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { ROLE_PILL, ROLE_EMOJI, stars, fmtCr, calcNextBid } from '../../utils/helpers'
import './AuctionScreen.css'

const TIMER_TOTAL = 15

export default function AuctionScreen({ roomId, socket, teams, players, myTeamId, room }) {
  const [currentPlayer, setCurrentPlayer]   = useState(null)
  const [playerIdx,     setPlayerIdx]       = useState(0)
  const [playerTotal,   setPlayerTotal]     = useState(players?.length || 0)
  const [timerVal,      setTimerVal]        = useState(TIMER_TOTAL)
  const [currentBid,    setCurrentBid]      = useState(0)
  const [leader,        setLeader]          = useState(null)   // { teamId, teamName }
  const [bidLog,        setBidLog]          = useState([])
  const [teamBudgets,   setTeamBudgets]     = useState({})
  const [flash,         setFlash]           = useState(null)   // { type:'sold'|'unsold', data }
  const [auctionStarted,setAuctionStarted]  = useState(false)
  const [bidError,      setBidError]        = useState('')
  const isHost = room?.host_id != null
  const logRef = useRef(null)

  // Init budgets from teams prop
  useEffect(() => {
    const b = {}
    teams.forEach(t => { b[t.id] = t.budget })
    setTeamBudgets(b)
  }, [teams])

  // Socket events
  useEffect(() => {
    if (!socket) return

    socket.on('auction:player', ({ player, index, total }) => {
      setCurrentPlayer(player)
      setPlayerIdx(index)
      setPlayerTotal(total)
      setCurrentBid(player.base_price)
      setLeader(null)
      setBidLog([])
      setFlash(null)
      setBidError('')
      setAuctionStarted(true)
    })

    socket.on('auction:timer', ({ remaining }) => setTimerVal(remaining))

    socket.on('auction:bid', ({ teamId, teamName, amount }) => {
      setCurrentBid(amount)
      setLeader({ teamId, teamName })
      setBidLog(l => [{ teamId, teamName, amount, id: Date.now() }, ...l].slice(0, 12))
    })

    socket.on('auction:sold', ({ player, teamId, teamName, price, budgets }) => {
      setFlash({ type: 'sold', player, teamId, teamName, price })
      if (budgets) {
        const b = {}
        budgets.forEach(({ id, budget }) => { b[id] = budget })
        setTeamBudgets(b)
      }
    })

    socket.on('auction:unsold', ({ player }) => {
      setFlash({ type: 'unsold', player })
    })

    return () => {
      socket.off('auction:player')
      socket.off('auction:timer')
      socket.off('auction:bid')
      socket.off('auction:sold')
      socket.off('auction:unsold')
    }
  }, [socket])

  const startAuction = () => {
    socket.emit('auction:start', { roomId }, (res) => {
      if (res?.error) alert(res.error)
    })
  }

  const placeBid = useCallback(() => {
    setBidError('')
    socket.emit('auction:bid', { roomId }, (res) => {
      if (res?.error) { setBidError(res.error); setTimeout(() => setBidError(''), 2500) }
    })
  }, [socket, roomId])

  // Timer ring
  const progress    = timerVal / TIMER_TOTAL
  const circumference = 2 * Math.PI * 54
  const offset      = circumference * (1 - progress)
  const timerColor  = timerVal <= 4 ? '#ff4757' : timerVal <= 8 ? '#f5a623' : '#2ed573'

  const myTeam     = teams.find(t => t.id === myTeamId)
  const myBudget   = myTeam ? (teamBudgets[myTeamId] ?? myTeam.budget) : 100
  const nextBid    = currentPlayer ? calcNextBid(currentBid) : 0
  const canBid     = currentPlayer && nextBid <= myBudget && leader?.teamId !== myTeamId

  const isBowler   = currentPlayer?.role === 'Bowler'

  return (
    <div className="auction-screen">
      {/* ── Header ── */}
      <div className="auc-header">
        <div className="auc-h-left">
          <span className="display text-gold" style={{ fontSize: '1.5rem' }}>🔨 LIVE AUCTION</span>
          {auctionStarted && (
            <span className="auc-progress text-muted">
              Player {playerIdx + 1} / {playerTotal}
            </span>
          )}
        </div>
        <div className="auc-h-right">
          {myTeam && (
            <div className="my-budget-chip">
              <span className="text-muted" style={{ fontSize: '.78rem' }}>YOUR BUDGET</span>
              <span className="display text-gold" style={{ fontSize: '1.2rem' }}>{fmtCr(myBudget)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="auc-main">

        {/* LEFT: Player card */}
        <div className="auc-player-col">
          {!auctionStarted ? (
            <div className="auc-waiting fade-in">
              <div style={{ fontSize: '4rem' }}>🏏</div>
              <h2 className="display" style={{ fontSize: '2.5rem', color: 'var(--gold)' }}>READY?</h2>
              <p className="text-muted">All 8 teams are set — time to build your squad</p>
              <button className="btn btn-gold" onClick={startAuction} style={{ marginTop: '1rem' }}>
                ⚡ START AUCTION
              </button>
            </div>
          ) : currentPlayer ? (
            <div className="pc-wrapper fade-in" key={currentPlayer.id}>
              <div className="player-big-card card card-glow">
                <div className="pbc-stripe" />
                <div className="pbc-avatar">{ROLE_EMOJI[currentPlayer.role]}</div>
                <h2 className="pbc-name display">{currentPlayer.name}</h2>
                <p className="pbc-country text-muted">🌍 {currentPlayer.country}</p>
                <span className={`pill ${ROLE_PILL[currentPlayer.role]}`}>{currentPlayer.role}</span>

                <div className="pbc-stats">
                  <div className="stat-box">
                    <span className="stat-val display text-gold">{currentPlayer.rating}</span>
                    <span className="stat-lbl">Rating</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val display">{currentPlayer.matches}</span>
                    <span className="stat-lbl">Matches</span>
                  </div>
                  {isBowler ? (<>
                    <div className="stat-box">
                      <span className="stat-val display">{currentPlayer.economy ?? '—'}</span>
                      <span className="stat-lbl">Economy</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-val display">{currentPlayer.wickets ?? '—'}</span>
                      <span className="stat-lbl">Wickets</span>
                    </div>
                  </>) : (<>
                    <div className="stat-box">
                      <span className="stat-val display">{currentPlayer.batting_avg ?? '—'}</span>
                      <span className="stat-lbl">Average</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-val display">{currentPlayer.strike_rate ?? '—'}</span>
                      <span className="stat-lbl">SR</span>
                    </div>
                  </>)}
                </div>
                <div className="pbc-stars">{stars(currentPlayer.rating)}</div>
                <p className="text-muted" style={{ fontSize: '.85rem' }}>
                  Base: <strong className="text-gold">{fmtCr(currentPlayer.base_price)}</strong>
                </p>
              </div>
            </div>
          ) : (
            <div className="page-loader"><div className="spinner" /></div>
          )}
        </div>

        {/* CENTER: Timer + Bid controls */}
        <div className="auc-center-col">
          {auctionStarted && currentPlayer && (
            <>
              {/* Timer ring */}
              <div className="timer-ring">
                <svg width="128" height="128" viewBox="0 0 128 128">
                  <circle cx="64" cy="64" r="54" fill="none" stroke="var(--border)" strokeWidth="7" />
                  <circle
                    cx="64" cy="64" r="54" fill="none"
                    stroke={timerColor} strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px', transition: 'stroke-dashoffset 1s linear, stroke .3s' }}
                  />
                </svg>
                <span className="timer-num display" style={{ color: timerColor }}>{timerVal}</span>
              </div>

              {/* Current bid */}
              <div className="bid-display">
                <p className="bd-label text-muted">CURRENT BID</p>
                <p className="bd-value display text-gold">{fmtCr(currentBid)}</p>
                {leader
                  ? <div className="bd-leader" style={{ background: 'rgba(46,213,115,.1)', color: 'var(--green)', border: '1px solid rgba(46,213,115,.3)', borderRadius: '50px', padding: '.25rem .9rem', fontSize: '.82rem', fontWeight: 700 }}>
                      🏆 {leader.teamName}
                    </div>
                  : <div className="bd-leader text-muted" style={{ fontSize: '.82rem' }}>No bids yet</div>
                }
              </div>

              {/* Bid button */}
              {myTeamId && (
                <div className="bid-actions">
                  <button
                    className="btn btn-green bid-main-btn"
                    onClick={placeBid}
                    disabled={!canBid}
                  >
                    {leader?.teamId === myTeamId
                      ? '✓ YOU LEAD'
                      : canBid
                        ? `BID ${fmtCr(nextBid)} ↑`
                        : 'PASS'
                    }
                  </button>
                  {bidError && <p className="bid-err text-red">{bidError}</p>}
                  {canBid && (
                    <p className="text-muted" style={{ fontSize: '.78rem', textAlign: 'center' }}>
                      Next: {fmtCr(nextBid)}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT: Teams panel */}
        <div className="auc-teams-col">
          <p className="section-title">TEAMS & BUDGET</p>
          <div className="teams-list">
            {teams.map(t => (
              <div
                key={t.id}
                className={`team-row ${leader?.teamId === t.id ? 'bidding' : ''} ${t.id === myTeamId ? 'mine' : ''}`}
              >
                <span className="tr-dot" style={{ background: t.color }} />
                <span className="tr-name heading">
                  {t.short_name}
                  {t.id === myTeamId && ' 👤'}
                </span>
                <span className="tr-budget text-gold display">
                  {fmtCr(teamBudgets[t.id] ?? t.budget)}
                </span>
              </div>
            ))}
          </div>

          {/* Bid log */}
          {bidLog.length > 0 && (
            <div className="bid-log" ref={logRef}>
              <p className="section-title" style={{ fontSize: '.7rem', marginTop: '.8rem' }}>BID LOG</p>
              {bidLog.map(entry => (
                <div key={entry.id} className="log-entry fade-in">
                  <strong style={{ color: 'var(--text)' }}>{entry.teamName}</strong>
                  <span className="text-gold"> {fmtCr(entry.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Flash overlays ── */}
      {flash && (
        <div className="auc-flash" key={flash.type + (flash.player?.id || '')}>
          {flash.type === 'sold' ? (
            <>
              <div style={{ fontSize: '3rem' }}>🔨</div>
              <h2 className="display" style={{ fontSize: '4.5rem', color: 'var(--gold)' }}>SOLD!</h2>
              <p style={{ fontSize: '1.2rem', color: 'var(--text2)' }}>{flash.player?.name}</p>
              <p style={{ fontSize: '1rem', color: 'var(--text2)' }}>To <strong>{flash.teamName}</strong></p>
              <p className="display" style={{ fontSize: '3rem', color: 'var(--green)' }}>{fmtCr(flash.price)}</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem' }}>❌</div>
              <h2 className="display" style={{ fontSize: '4.5rem', color: 'var(--muted)' }}>UNSOLD</h2>
              <p className="text-muted">{flash.player?.name} — no bids received</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
