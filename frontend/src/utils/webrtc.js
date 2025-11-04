import { io } from 'socket.io-client'

export function connectWebrtc({ roomId, userId, sessionId }) {
  const url = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000') + '/webrtc'
  const socket = io(url, {
    transports: ['websocket'],
    auth: { token: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined },
    query: { roomId, userId, sessionId },
  })
  return socket
}




