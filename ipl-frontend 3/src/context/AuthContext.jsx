// src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react'
import axios from 'axios'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('ipl_user')) } catch { return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('ipl_token') || null)

  axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post('/api/auth/login', { email, password })
    localStorage.setItem('ipl_token', data.token)
    localStorage.setItem('ipl_user',  JSON.stringify(data.user))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (username, email, password) => {
    const { data } = await axios.post('/api/auth/register', { username, email, password })
    localStorage.setItem('ipl_token', data.token)
    localStorage.setItem('ipl_user',  JSON.stringify(data.user))
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
    setToken(data.token)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('ipl_token')
    localStorage.removeItem('ipl_user')
    delete axios.defaults.headers.common['Authorization']
    setToken(null)
    setUser(null)
  }, [])

  return (
    <Ctx.Provider value={{ user, token, login, register, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
