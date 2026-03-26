// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider, useSocket } from './context/SocketContext'
import Navbar from './components/Navbar'
import Toast from './components/Toast'
import { useToast } from './hooks/useToast'

import AuthPage     from './pages/AuthPage'
import LobbyPage    from './pages/LobbyPage'
import RoomPage     from './pages/RoomPage'

function Protected({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/auth" replace />
}

function Layout() {
  const { connected } = useSocket()
  const { toasts }    = useToast()

  return (
    <>
      <Navbar connected={connected} />
      <Toast toasts={toasts} />
    </>
  )
}

function AppInner() {
  const { user } = useAuth()
  const { connected } = useSocket()
  const { toasts } = useToast()

  return (
    <>
      <Navbar connected={connected} />
      <Toast toasts={toasts} />
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/" element={<Protected><LobbyPage /></Protected>} />
        <Route path="/room/:roomId" element={<Protected><RoomPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppInner />
      </SocketProvider>
    </AuthProvider>
  )
}
