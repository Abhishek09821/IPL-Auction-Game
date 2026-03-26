// src/components/PlayerCard.jsx
import { ROLE_PILL, ROLE_EMOJI, stars, fmtCr } from '../utils/helpers'

export default function PlayerCard({ player, soldPrice, compact = false }) {
  if (!player) return null

  const isBowler = player.role === 'Bowler'

  return (
    <div className={`player-card card card-glow${compact ? ' compact' : ''}`}>
      <div className="pc-top-bar" />
      <div className="pc-avatar">{ROLE_EMOJI[player.role] || '🏏'}</div>
      <h2 className="pc-name display">{player.name}</h2>
      <p className="pc-country text-muted">🌍 {player.country}</p>
      <span className={`pill ${ROLE_PILL[player.role]}`}>{player.role}</span>

      {!compact && (
        <div className="pc-stats">
          <div className="stat-box">
            <span className="stat-val display text-gold">{player.rating}</span>
            <span className="stat-lbl">Rating</span>
          </div>
          <div className="stat-box">
            <span className="stat-val display">{player.matches}</span>
            <span className="stat-lbl">Matches</span>
          </div>
          {isBowler ? (
            <>
              <div className="stat-box">
                <span className="stat-val display">{player.economy ?? '—'}</span>
                <span className="stat-lbl">Economy</span>
              </div>
              <div className="stat-box">
                <span className="stat-val display">{player.wickets ?? '—'}</span>
                <span className="stat-lbl">Wickets</span>
              </div>
            </>
          ) : (
            <>
              <div className="stat-box">
                <span className="stat-val display">{player.batting_avg ?? '—'}</span>
                <span className="stat-lbl">Average</span>
              </div>
              <div className="stat-box">
                <span className="stat-val display">{player.strike_rate ?? '—'}</span>
                <span className="stat-lbl">SR</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="pc-stars">{stars(player.rating)}</div>
      {soldPrice !== undefined
        ? <p className="pc-price text-green">Sold: <strong>{fmtCr(soldPrice)}</strong></p>
        : <p className="pc-price text-muted">Base: <strong className="text-gold">{fmtCr(player.base_price)}</strong></p>
      }
    </div>
  )
}
