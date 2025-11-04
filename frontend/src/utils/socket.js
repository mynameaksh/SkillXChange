import { io } from 'socket.io-client'

let socket = null

export function getSocket() {
  if (socket && socket.connected) return socket
  const token = localStorage.getItem('token')
  socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000', {
    autoConnect: false,
    transports: ['websocket'],
    auth: { token: token ? `Bearer ${token}` : undefined },
  })
  socket.connect()
  return socket
}

export function disconnectSocket() {
  if (socket) socket.disconnect()
}


