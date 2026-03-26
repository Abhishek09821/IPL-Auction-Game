// src/pages/RoomPage.jsx  (v2 – full with WaitingRoom + TradingWindow)
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { useAuth }   from '../context/AuthContext'
import WaitingRoom    from './screens/WaitingRoom'
import AuctionScreen  from './screens/AuctionScreen'
import SquadScreen    from './screens/SquadScreen'
import TradingWindow  from './screens/TradingWindow'
import SeasonScreen   from './screens/SeasonScreen'
import PlayoffsScreen from './screens/PlayoffsScreen'
import ChampionScreen from './screens/ChampionScreen'
import './RoomPage.css'

export default function RoomPage() {
  const { roomId }  = useParams()
  const { socket }  = useSocket()
  const { user }    = useAuth()

  // ── screen: waiting | auction | squad | trading | season | playoffs | champion
  const [screen,      setScreen]      = useState('loading')
  const [room,        setRoom]        = useState(null)
  const [teams,       setTeams]       = useState([])
  const [players,     setPlayers]     = useState([])
  const [members,     setMembers]     = useState([])
  const [myTeamId,    setMyTeamId]    = useState(null)
  const [roomCode,    setRoomCode]    = useState('')
  const [champion,    setChampion]    = useState(null)
  const [playoffsData,setPO]          = useState(null)
  const [error,       setError]       = useState('')
  const joined = useRef(false)

  // Map room DB status → screen
  const statusToScreen = (status) => {
    switch (status) {
      case 'waiting':  return 'waiting'
      case 'auction':  return 'auction'
      case 'season':   return 'trading'  // trading window opens after auction
      case 'playoffs': return 'season'
      case 'finished': return 'champion'
      default:         return 'waiting'
    }
  }

  useEffect(() => {
    if (!socket || joined.current) return
    joined.current = true

    socket.emit('room:join', { roomId }, (res) => {
      if (res.error) { setError(res.error); return }
      setRoom(res.room)
      setTeams(res.teams || [])
      setPlayers(res.players || [])
      setMembers(res.members || [])
      setMyTeamId(res.yourTeamId)
      setRoomCode(res.code || '')
      setScreen(statusToScreen(res.room.status))
    })

    // Lobby live updates
    socket.on('lobby:state', ({ members, teams }) => {
      setMembers(members)
      setTeams(teams)
    })

    // Auction started by host → all clients jump to auction screen
    socket.on('auction:started', () => setScreen('auction'))

    // After all players auctioned
    socket.on('auction:complete', ({ teams: t }) => {
      if (t) setTeams(t)
      setScreen('squad')
    })

    // Trade window opened after squad review
    socket.on('trade:window_open', () => setScreen('trading'))

    // Trading window closed → season
    socket.on('trade:window_closed', () => setScreen('season'))

    // Season done → playoffs
    socket.on('season:complete', () => {
      // stay on season screen so user can see results, then they click Playoffs
    })

    // Playoffs done
    socket.on('playoffs:complete', (data) => {
      setPO(data)
      setScreen('playoffs')
    })

    return () => {
      socket.off('lobby:state')
      socket.off('auction:started')
      socket.off('auction:complete')
      socket.off('trade:window_open')
      socket.off('trade:window_closed')
      socket.off('season:complete')
      socket.off('playoffs:complete')
    }
  }, [socket, roomId])

  // ── Screen navigation callbacks
  const startAuction = useCallback(() => {
    socket.emit('auction:start', { roomId }, (res) => {
      if (res?.error) alert(res.error)
      else setScreen('auction')
    })
  }, [socket, roomId])

  const goToTrading   = useCallback(() => setScreen('trading'),   [])
  const goToSeason    = useCallback(() => setScreen('season'),    [])
  const goToPlayoffs  = useCallback(() => setScreen('playoffs'),  [])
  const goToChampion  = useCallback((champ) => {
    setChampion(champ)
    setScreen('champion')
  }, [])

  // ── Error / loading
  if (error) return (
    <div className="page-loader">
      <p className="text-red" style={{ fontSize: '1.1rem' }}>❌ {error}</p>
    </div>
  )
  if (screen === 'loading') return (
    <div className="page-loader">
      <div className="spinner" />
      <p className="text-muted">Connecting to room…</p>
    </div>
  )

  const commonProps = { roomId, room, teams, players, myTeamId, socket, members }

  return (
    <div className="room-page">

      {/* ── Screen router ── */}
      {screen === 'waiting' && (
        <WaitingRoom
          {...commonProps}
          code={roomCode}
          userId={user?.id}
          onStart={startAuction}
        />
      )}

      {screen === 'auction' && (
        <AuctionScreen {...commonProps} />
      )}

      {screen === 'squad' && (
        <SquadScreen
          {...commonProps}
          onContinue={goToTrading}
          continueLabel="OPEN TRADING WINDOW →"
        />
      )}

      {screen === 'trading' && (
        <TradingWindow
          {...commonProps}
          onContinue={goToSeason}
        />
      )}

      {screen === 'season' && (
        <SeasonScreen
          {...commonProps}
          onPlayoffs={goToPlayoffs}
        />
      )}

      {screen === 'playoffs' && (
        <PlayoffsScreen
          {...commonProps}
          data={playoffsData}
          onChampion={goToChampion}
        />
      )}

      {screen === 'champion' && (
        <ChampionScreen
          {...commonProps}
          champion={champion}
        />
      )}
    </div>
  )
}
