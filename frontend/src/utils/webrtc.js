import { io } from 'socket.io-client'
import { Device } from 'mediasoup-client'

export function connectWebrtc({ roomId, userId, sessionId }) {
  const url = (import.meta.env.VITE_API_BASE_URL || window.location.origin) + '/webrtc'
  const socket = io(url, {
    transports: ['websocket'],
    auth: { token: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined },
    query: { roomId, userId, sessionId },
  })
  return socket
}

export async function setupMediasoup({ socket }) {
  // Ensure socket is connected before requesting
  if (!socket.connected) {
    await new Promise((resolve) => socket.once('connect', resolve))
  }
  // 1) Load router RTP capabilities into a Device with retries
  const getCapsOnce = () => new Promise((resolve, reject) => {
    let done = false
    const timer = setTimeout(() => { if (!done) reject(new Error('Timeout getting RTP capabilities')) }, 3000)
    socket.emit('getRouterRtpCapabilities', (caps) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (!caps) return reject(new Error('No RTP capabilities received'))
      if (caps.error) return reject(new Error(caps.error))
      resolve(caps)
    })
  })
  let routerRtpCapabilities
  let lastErr
  for (let i = 0; i < 3; i++) {
    try {
      routerRtpCapabilities = await getCapsOnce()
      break
    } catch (e) {
      lastErr = e
    }
  }
  if (!routerRtpCapabilities) throw lastErr || new Error('Failed to get RTP capabilities')
  const device = new Device()
  await device.load({ routerRtpCapabilities })
  return device
}

export async function createSendTransport({ socket, device }) {
  const params = await new Promise((resolve, reject) => {
    socket.emit('createWebRtcTransport', (res) => res?.error ? reject(new Error(res.error)) : resolve(res))
  })
  const transport = device.createSendTransport(params)
  transport.on('connect', ({ dtlsParameters }, callback, errback) => {
    socket.emit('connectWebRtcTransport', { transportId: params.id, dtlsParameters }, (res) => {
      if (res?.error) return errback(new Error(res.error))
      callback()
    })
  })
  transport.on('produce', ({ kind, rtpParameters }, callback, errback) => {
    socket.emit('produce', { kind, rtpParameters, transportId: params.id }, (res) => {
      if (res?.error) return errback(new Error(res.error))
      callback({ id: res.id })
    })
  })
  return transport
}

export async function startCamera({ device, sendTransport }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  const videoTrack = stream.getVideoTracks()[0]
  const audioTrack = stream.getAudioTracks()[0]
  const producers = {}
  if (videoTrack) {
    producers.video = await sendTransport.produce({ track: videoTrack })
  }
  if (audioTrack) {
    producers.audio = await sendTransport.produce({ track: audioTrack })
  }
  return { stream, producers }
}

export function listenForRemoteProducers({ socket, device, onTrack }) {
  // When a new producer is announced, create a recv transport and consume
  const handler = async ({ producerId, kind }) => {
    try {
      // We reuse createWebRtcTransport for recv as well
      const params = await new Promise((resolve, reject) => {
        socket.emit('createWebRtcTransport', (res) => res?.error ? reject(new Error(res.error)) : resolve(res))
      })
      const recvTransport = device.createRecvTransport(params)
      await new Promise((resolve, reject) => {
        recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socket.emit('connectWebRtcTransport', { transportId: params.id, dtlsParameters }, (res) => {
            if (res?.error) return errback(new Error(res.error))
            resolve(callback())
          })
        })
      })
      const consumerParams = await new Promise((resolve, reject) => {
        socket.emit('consume', { producerId, rtpParameters: device.rtpCapabilities }, (res) => res?.error ? reject(new Error(res.error)) : resolve(res))
      })
      const consumer = await recvTransport.consume({
        id: consumerParams.id,
        producerId: consumerParams.producerId,
        kind: consumerParams.kind,
        rtpParameters: consumerParams.rtpParameters,
      })
      const mediaStream = new MediaStream([consumer.track])
      onTrack({ kind: consumer.kind, stream: mediaStream })
    } catch (e) {
      console.error('consume error', e)
    }
  }
  socket.on('newProducer', handler)
  return () => socket.off('newProducer', handler)
}

export function toggleMute({ producers, mute }) {
  if (!producers?.audio) return
  try {
    if (mute) producers.audio.pause()
    else producers.audio.resume()
  } catch {}
}

export async function toggleCamera({ producers, currentStream, onStreamChange }) {
  if (!producers) return
  const videoProducer = producers.video
  if (videoProducer && !videoProducer.closed && videoProducer.track) {
    // turn off
    try {
      videoProducer.pause()
      videoProducer.track.stop()
    } catch {}
    if (currentStream) {
      currentStream.getVideoTracks().forEach(t => t.stop())
      const rem = new MediaStream(currentStream.getAudioTracks())
      onStreamChange(rem)
    }
    return { on: false }
  }
  // turn on
  const cam = await navigator.mediaDevices.getUserMedia({ video: true })
  const track = cam.getVideoTracks()[0]
  if (producers.video && !producers.video.closed) {
    await producers.video.replaceTrack({ track })
    producers.video.resume()
  }
  const newStream = new MediaStream([
    ...(currentStream ? currentStream.getAudioTracks() : []),
    track,
  ])
  onStreamChange(newStream)
  return { on: true }
}

export function hangUp({ producers, stream }) {
  try {
    if (producers?.audio && !producers.audio.closed) producers.audio.close()
    if (producers?.video && !producers.video.closed) producers.video.close()
  } catch {}
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
  }
}






