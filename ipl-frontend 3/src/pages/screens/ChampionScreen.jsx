// src/pages/screens/ChampionScreen.jsx
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './ChampionScreen.css'

const COLORS = ['#f5a623','#00d4ff','#ff4757','#2ed573','#ffffff','#ffd166','#e73c92']

export default function ChampionScreen({ champion, myTeamId, teams }) {
  const confRef = useRef(null)
  const nav     = useNavigate()

  const champ     = champion || teams?.[0] || {}
  const isHuman   = champ.id === myTeamId || champ.user_id != null

  useEffect(() => {
    const container = confRef.current
    if (!container) return
    const pieces = []
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div')
      el.className = 'conf-piece'
      el.style.cssText = `
        left:${Math.random()*100}%;
        background:${COLORS[i % COLORS.length]};
        animation-delay:${Math.random()*3}s;
        animation-duration:${3+Math.random()*2.5}s;
        width:${5+Math.random()*10}px;
        height:${5+Math.random()*10}px;
        border-radius:${Math.random()>.5?'50%':'2px'};
      `
      container.appendChild(el)
      pieces.push(el)
    }
    return () => pieces.forEach(p => p.remove())
  }, [])

  return (
    <div className="champion-screen fade-in">
      <div className="conf-container" ref={confRef} />

      <div className="champ-content">
        <div className="champ-trophy">🏆</div>
        <p className="champ-label heading">IPL 2024 CHAMPIONS</p>
        <h1 className="champ-name display">{champ.name || '—'}</h1>
        <p className="champ-emoji" style={{ fontSize: '3.5rem' }}>{champ.emoji || '🏆'}</p>
        <p className="champ-message text-muted">
          {isHuman
            ? '🎉 Incredible! You built the perfect squad and conquered the IPL!'
            : `A brilliant campaign — ${champ.name} dominated from auction to final!`
          }
        </p>
        <div className="champ-actions">
          <button className="btn btn-gold" onClick={() => nav('/')}>
            ↺ PLAY AGAIN
          </button>
        </div>
      </div>

      {/* Firework rings */}
      <div className="fw fw1" /><div className="fw fw2" /><div className="fw fw3" />
    </div>
  )
}
