import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../utils/api.js'
import { getSocket } from '../utils/socket.js'

export default function ChatRoom() {
  const { id } = useParams()
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [typing, setTyping] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const typingTimeout = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/api/chat/messages/${id}`, { params: { page: 1, limit: 50 } })
        setMessages(data)
      } catch (e) {
        setError(e?.response?.data?.error || 'Failed to load messages')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const socket = getSocket()
    // message receive
    const onReceive = ({ message, roomId }) => {
      if (roomId !== id) return
      setMessages(prev => [...prev, message])
    }
    const onTypingStart = ({ roomId }) => { if (roomId === id) setTyping(true) }
    const onTypingStop = ({ roomId }) => { if (roomId === id) setTyping(false) }

    socket.on('message:receive', onReceive)
    socket.on('typing:start', onTypingStart)
    socket.on('typing:stop', onTypingStop)
    return () => {
      socket.off('message:receive', onReceive)
      socket.off('typing:start', onTypingStart)
      socket.off('typing:stop', onTypingStop)
    }
  }, [id])

  const send = () => {
    const text = content.trim()
    if (!text) return
    const socket = getSocket()
    socket.emit('message:send', { roomId: id, content: text })
    setContent('')
  }

  const handleTyping = (v) => {
    setContent(v)
    const socket = getSocket()
    socket.emit('typing:start', { roomId: id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { roomId: id })
    }, 800)
  }

  if (loading) return <div className="flex justify-center"><span className="loading loading-spinner" /></div>
  if (error) return <div className="alert alert-error">{error}</div>

  return (
    <div className="flex flex-col gap-3 max-w-3xl mx-auto">
      <div className="card bg-base-200">
        <div className="card-body gap-3">
          <div className="min-h-64 max-h-[60vh] overflow-y-auto space-y-2">
            {messages.map(m => (
              <div key={m._id} className="chat">
                <div className={`chat-bubble ${m.type==='system'?'chat-bubble-info':''}`}>{m.content}</div>
                <div className="chat-footer opacity-70 text-xs">{new Date(m.createdAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          {typing && <div className="text-xs opacity-70">Typing...</div>}
          <div className="join w-full">
            <input className="input input-bordered join-item w-full" placeholder="Type a message" value={content} onChange={(e)=>handleTyping(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') send() }} />
            <button className="btn btn-primary join-item" onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}


