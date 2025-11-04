import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../utils/api.js'

export default function SessionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/api/sessions/${id}`)
      setSession(data)
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const updateStatus = async (status) => {
    setUpdating(true)
    try {
      await api.patch(`/api/sessions/${id}/status`, { status })
      await load()
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="flex justify-center"><span className="loading loading-spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>
  if (!session) return null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Session</h1>
      <div className="card bg-base-200">
        <div className="card-body space-y-2">
          <div><span className="opacity-70">Time:</span> {new Date(session.scheduledTime).toLocaleString()} ({session.duration} min)</div>
          <div><span className="opacity-70">Participants:</span> {session.teacher?.user?.name} ↔ {session.learner?.user?.name}</div>
          <div><span className="opacity-70">Status:</span> <span className="badge">{session.status}</span></div>
          {session.notes && <div><span className="opacity-70">Notes:</span> {session.notes}</div>}
          <div className="card-actions justify-between">
            <button className={`btn btn-sm ${updating?'loading':''}`} onClick={()=>updateStatus('cancelled')}>Cancel</button>
            <CreateVideoButton sessionId={session._id} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateVideoButton({ sessionId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const createRoom = async () => {
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/api/video', { sessionId })
      navigate(`/video/${data.roomId}?session=${sessionId}`)
    } catch (e) {
      setError(e?.response?.data?.error || 'Unable to start video')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-error">{error}</span>}
      <button className={`btn btn-primary btn-sm ${loading?'loading':''}`} onClick={createRoom} disabled={loading}>
        Start Video
      </button>
    </div>
  )
}


