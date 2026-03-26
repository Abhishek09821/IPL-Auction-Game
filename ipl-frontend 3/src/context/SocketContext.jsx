// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const Ctx = createContext(null)

export function SocketProvider({ children }) {
  const { token } = useAuth()
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setConnected(false)
      return
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current.on('connect',    () => setConnected(true))
    socketRef.current.on('disconnect', () => setConnected(false))

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [token])

  return (
    <Ctx.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSocket = () => useContext(Ctx)
