import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api.js'

export default function ChatRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/api/chat/rooms')
        setRooms(data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load chat rooms')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center"><span className="loading loading-spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Chats</h1>
      </div>
      <div className="grid gap-3">
        {rooms.map(r => (
          <Link key={r._id} to={`/chat/${r._id}`} className="card bg-base-200 hover:bg-base-300">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.participants.map(p=>p.name).join(' • ')}</div>
                {r.lastMessageTimestamp && <div className="text-xs opacity-70">{new Date(r.lastMessageTimestamp).toLocaleString()}</div>}
              </div>
              {r.lastMessage && <div className="text-sm opacity-80">{r.lastMessage.content}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


