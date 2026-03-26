// src/pages/AuthPage.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './AuthPage.css'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username:'', email:'', password:'' })
  const [err,  setErr]  = useState('')
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuth()
  const nav = useNavigate()

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      if (mode === 'login')    await login(form.email, form.password)
      else                     await register(form.username, form.email, form.password)
      nav('/')
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Background glow orbs */}
      <div className="auth-orb auth-orb1" />
      <div className="auth-orb auth-orb2" />

      <div className="auth-box card fade-in">
        <div className="auth-logo">🏏</div>
        <h1 className="auth-title display">IPL AUCTION</h1>
        <p className="auth-sub text-muted">Simulator 2024</p>

        {/* Tab toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setErr('') }}
          >Login</button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setErr('') }}
          >Register</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <div className="field">
              <label className="label">Username</label>
              <input className="input" name="username" placeholder="e.g. cricket_king"
                value={form.username} onChange={handle} required />
            </div>
          )}
          <div className="field">
            <label className="label">Email</label>
            <input className="input" name="email" type="email" placeholder="you@email.com"
              value={form.email} onChange={handle} required />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input className="input" name="password" type="password" placeholder="••••••••"
              value={form.password} onChange={handle} required />
          </div>

          {err && <p className="auth-err">⚠️ {err}</p>}

          <button className="btn btn-gold auth-submit" type="submit" disabled={busy}>
            {busy ? '⏳ Please wait…' : mode === 'login' ? 'LOGIN →' : 'CREATE ACCOUNT →'}
          </button>
        </form>

        <p className="auth-hint text-muted">
          Demo: email <strong>test@test.com</strong> / pass <strong>password</strong>
        </p>
      </div>
    </div>
  )
}
