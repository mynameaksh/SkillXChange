import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ProfileEditor from './pages/ProfileEditor.jsx'
import Matches from './pages/Matches.jsx'
import MatchDetail from './pages/MatchDetail.jsx'
import Sessions from './pages/Sessions.jsx'
import ScheduleSession from './pages/ScheduleSession.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import ChatRooms from './pages/ChatRooms.jsx'
import ChatRoom from './pages/ChatRoom.jsx'
import VideoRoom from './pages/VideoRoom.jsx'
import Reviews from './pages/Reviews.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { useAuthStore } from './store/auth.js'

function App() {
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="navbar bg-base-200/60 backdrop-blur border-b border-base-300">
        <div className="flex-1">
          <Link to="/" className="btn btn-ghost text-xl">SkillXchange</Link>
        </div>
        <div className="flex-none gap-2">
          <ThemeToggle />
          {!token ? (
            <>
              <Link to="/login" className="btn btn-sm">Login</Link>
              <Link to="/register" className="btn btn-sm btn-primary">Sign up</Link>
            </>
          ) : (
            <>
              <Link to="/dashboard" className="btn btn-sm">Dashboard</Link>
              <Link to="/matches" className="btn btn-sm">Matches</Link>
              <Link to="/sessions" className="btn btn-sm">Sessions</Link>
              <Link to="/chat" className="btn btn-sm">Chat</Link>
              <Link to="/reviews" className="btn btn-sm">Reviews</Link>
              <Link to="/profile" className="btn btn-sm">Profile</Link>
              <button className="btn btn-sm btn-outline" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </div>
      <main className="container mx-auto px-4 py-10">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/register" element={!token ? <Register /> : <Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/matches" element={token ? <Matches /> : <Navigate to="/login" replace />} />
          <Route path="/matches/:id" element={token ? <MatchDetail /> : <Navigate to="/login" replace />} />
          <Route path="/sessions" element={token ? <Sessions /> : <Navigate to="/login" replace />} />
          <Route path="/sessions/new" element={token ? <ScheduleSession /> : <Navigate to="/login" replace />} />
          <Route path="/sessions/:id" element={token ? <SessionDetail /> : <Navigate to="/login" replace />} />
          <Route path="/chat" element={token ? <ChatRooms /> : <Navigate to="/login" replace />} />
          <Route path="/chat/:id" element={token ? <ChatRoom /> : <Navigate to="/login" replace />} />
          <Route path="/video/:roomId" element={token ? <VideoRoom /> : <Navigate to="/login" replace />} />
          <Route path="/reviews" element={token ? <Reviews /> : <Navigate to="/login" replace />} />
          <Route path="/profile" element={token ? <ProfileEditor /> : <Navigate to="/login" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function Landing() {
  return (
    <div className="hero rounded-box bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold">Welcome to SkillXchange</h1>
          <p className="py-6 text-base-content/80">
            Learn and teach skills with smart matching, chat, sessions, and video calls.
          </p>
          <div className="join">
            <Link to="/register" className="btn btn-primary join-item">Get Started</Link>
            <Link to="/login" className="btn btn-outline join-item">Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
