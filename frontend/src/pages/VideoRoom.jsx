import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { connectWebrtc, setupMediasoup, createSendTransport, startCamera, listenForRemoteProducers, toggleMute, toggleCamera, hangUp } from '../utils/webrtc.js'
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
  const [localStream, setLocalStream] = useState(null)
  const [remoteStreams, setRemoteStreams] = useState([])
  const [socketRef, setSocketRef] = useState(null)
  const [deviceRef, setDeviceRef] = useState(null)
  const [sendTransportRef, setSendTransportRef] = useState(null)
  const [producersRef, setProducersRef] = useState(null)
  const [muted, setMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [layout, setLayout] = useState('grid') // grid | spotlight

  useEffect(() => {
    const run = async () => {
      try {
        const me = user || await fetchMe()
        if (!me || !me._id) throw new Error('Please log in to join the video room')
        const socket = connectWebrtc({ roomId, userId: me._id, sessionId })
        setSocketRef(socket)
        socket.on('connect', () => setStatus('connected'))
        socket.on('disconnect', () => setStatus('disconnected'))
        socket.on('error', (e) => { setError(e?.message || 'Error'); setStatus('error') })

        const device = await setupMediasoup({ socket })
        setDeviceRef(device)
        setRtpCaps(device.rtpCapabilities)
      } catch (e) {
        setError(e?.message || 'Failed to join room')
        setStatus('error')
      }
    }
    run()
  }, [roomId, sessionId])

  useEffect(() => {
    if (!socketRef || !deviceRef) return
    const off = listenForRemoteProducers({
      socket: socketRef,
      device: deviceRef,
      onTrack: ({ kind, stream }) => {
        setRemoteStreams(prev => [...prev, { kind, stream, id: Math.random().toString(36).slice(2) }])
      }
    })
    return () => off && off()
  }, [socketRef, deviceRef])

  const onStartCamera = async () => {
    try {
      if (!socketRef || !deviceRef) return
      const sendTransport = await createSendTransport({ socket: socketRef, device: deviceRef })
      setSendTransportRef(sendTransport)
      const { stream, producers } = await startCamera({ device: deviceRef, sendTransport })
      setLocalStream(stream)
      setProducersRef(producers)
      setMuted(false)
      setCameraOn(true)
    } catch (e) {
      setError(e.message || 'Failed to start camera')
    }
  }

  const onToggleMute = () => {
    if (!producersRef) return
    const next = !muted
    toggleMute({ producers: producersRef, mute: next })
    setMuted(next)
  }

  const onToggleCamera = async () => {
    if (!producersRef) return
    const res = await toggleCamera({ producers: producersRef, currentStream: localStream, onStreamChange: setLocalStream })
    if (typeof res?.on === 'boolean') setCameraOn(res.on)
  }

  const onHangUp = () => {
    hangUp({ producers: producersRef, stream: localStream })
    setLocalStream(null)
    setProducersRef(null)
  }

  if (error) return <div className="alert alert-error">{error}</div>

  const remoteContainer = layout === 'grid'
    ? (
      <div className="grid grid-cols-2 gap-2">
        {remoteStreams.map(s => (
          <video key={s.id}
            className="w-full bg-black rounded"
            autoPlay
            playsInline
            ref={el => { if (el) el.srcObject = s.stream }}
          />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {remoteStreams[0] && (
          <video
            className="w-full bg-black rounded"
            autoPlay
            playsInline
            ref={el => { if (el) el.srcObject = remoteStreams[0].stream }}
          />
        )}
        <div className="grid grid-cols-4 gap-2">
          {remoteStreams.slice(1).map(s => (
            <video key={s.id}
              className="w-full bg-black rounded"
              autoPlay
              playsInline
              ref={el => { if (el) el.srcObject = s.stream }}
            />
          ))}
        </div>
      </div>
    )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Video Room</h1>
      <div className="badge">{status}</div>
      <div className="card bg-base-200">
        <div className="card-body space-y-4">
          <div className="opacity-70 text-sm">Router RTP Capabilities:</div>
          <pre className="text-xs whitespace-pre-wrap break-all">{rtpCaps ? JSON.stringify(rtpCaps, null, 2) : 'Fetching...'}</pre>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="opacity-70 text-sm mb-1">Local</div>
              <video
                className="w-full bg-black rounded"
                autoPlay
                muted
                playsInline
                ref={el => { if (el && localStream) el.srcObject = localStream }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="opacity-70 text-sm">Remote</div>
                <div className="join">
                  <button className={`btn btn-xs join-item ${layout==='grid'?'btn-primary':''}`} onClick={()=>setLayout('grid')}>Grid</button>
                  <button className={`btn btn-xs join-item ${layout==='spotlight'?'btn-primary':''}`} onClick={()=>setLayout('spotlight')}>Spotlight</button>
                </div>
              </div>
              {remoteContainer}
            </div>
          </div>
          <div className="card-actions">
            <button className="btn btn-sm btn-primary" onClick={onStartCamera} disabled={!socketRef || !deviceRef || !!producersRef}>Start Camera</button>
            <button className="btn btn-sm" onClick={onToggleMute} disabled={!producersRef}>{muted ? 'Unmute' : 'Mute'}</button>
            <button className="btn btn-sm" onClick={onToggleCamera} disabled={!producersRef}>{cameraOn ? 'Camera Off' : 'Camera On'}</button>
            <button className="btn btn-sm btn-error" onClick={onHangUp} disabled={!producersRef}>Hang Up</button>
          </div>
        </div>
      </div>
    </div>
  )
}






