import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { connectWebrtc } from '../utils/webrtc.js'
import { useAuthStore } from '../store/auth.js'

export default function VideoRoom() {
  const { roomId } = useParams()
  const [sp] = useSearchParams()
  const sessionId = sp.get('session')
  const user = useAuthStore(s => s.user)
  const fetchMe = useAuthStore(s => s.fetchMe)
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState('')
  const [rtpCaps, setRtpCaps] = useState(null)

  useEffect(() => {
    const run = async () => {
      try {
        const me = user || await fetchMe()
        const socket = connectWebrtc({ roomId, userId: me._id, sessionId })
        socket.on('connect', () => setStatus('connected'))
        socket.on('disconnect', () => setStatus('disconnected'))
        socket.on('error', (e) => { setError(e?.message || 'Error'); setStatus('error') })

        socket.emit('getRouterRtpCapabilities', (caps) => {
          setRtpCaps(caps)
        })
      } catch (e) {
        setError('Failed to join room')
        setStatus('error')
      }
    }
    run()
  }, [roomId, sessionId])

  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Video Room</h1>
      <div className="badge">{status}</div>
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="opacity-70 text-sm">Router RTP Capabilities:</div>
          <pre className="text-xs whitespace-pre-wrap break-all">{rtpCaps ? JSON.stringify(rtpCaps, null, 2) : 'Fetching...'}</pre>
          <div className="card-actions">
            <button className="btn btn-sm" disabled>Start Camera (coming soon)</button>
            <button className="btn btn-sm" disabled>Share Screen (coming soon)</button>
          </div>
        </div>
      </div>
    </div>
  )
}




