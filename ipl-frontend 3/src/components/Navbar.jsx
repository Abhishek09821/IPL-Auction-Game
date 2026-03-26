// src/components/Navbar.jsx
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Navbar.css'

export default function Navbar({ connected }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <nav className="navbar">
      <div className="nb-brand" onClick={() => nav('/')}>
        <span className="nb-logo">🏏</span>
        <span className="nb-title display">IPL AUCTION</span>
        <span className="nb-year pill pill-gold">2024</span>
      </div>

      <div className="nb-right">
        {user && (
          <>
            <div className="nb-conn">
              <span className={`conn-dot ${connected ? 'live' : ''}`} />
              <span className="conn-lbl">{connected ? 'Live' : 'Offline'}</span>
            </div>
            <span className="nb-user">👤 {user.username}</span>
            <button className="btn btn-ghost" onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  )
}
