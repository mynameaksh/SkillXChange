const mediasoup = require('mediasoup');
const VideoRoom = require('../models/VideoRoom');
const Session = require('../models/Session');

class WebRTCManager {
    constructor(io) {
        this.io = io;
        this.workers = [];
        this.rooms = new Map(); // roomId -> room state
        this.initialize();
    }

    async initialize() {
        try {
            // Create mediasoup workers
            const numWorkers = Math.min(8, require('os').cpus().length);
            for (let i = 0; i < numWorkers; i++) {
                const worker = await mediasoup.createWorker({
                    logLevel: 'warn',
                    logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
                });
                this.workers.push(worker);
            }
            console.log(`Created ${this.workers.length} mediasoup workers`);
        } catch (error) {
            console.error('Error initializing WebRTC manager:', error);
        }
    }

    async createRoom(roomId) {
        try {
            // Select least loaded worker
            const worker = this.workers[Math.floor(Math.random() * this.workers.length)];
            
            // Create mediasoup router
            const router = await worker.createRouter({
                mediaCodecs: [
                    {
                        kind: 'audio',
                        mimeType: 'audio/opus',
                        clockRate: 48000,
                        channels: 2
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/VP8',
                        clockRate: 90000,
                        parameters: {
                            'x-google-start-bitrate': 1000
                        }
                    }
                ]
            });

            this.rooms.set(roomId, {
                router,
                peers: new Map(), // peerId -> peer state
                transports: new Map() // transportId -> transport state
            });

            return router;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    async handleConnection(socket) {
        try {
            const { roomId, userId, sessionId } = socket.handshake.query;

            // Verify session and permissions
            const session = await Session.findById(sessionId);
            if (!session) {
                socket.emit('error', { message: 'Session not found' });
                return socket.disconnect();
            }

            const videoRoom = await VideoRoom.findOne({ sessionId });
            if (!videoRoom || !videoRoom.canUserJoin(userId)) {
                socket.emit('error', { message: 'Not authorized to join this room' });
                return socket.disconnect();
            }

            // Join room
            socket.join(roomId);
            
            // Get or create router for this room
            let router;
            if (!this.rooms.has(roomId)) {
                router = await this.createRoom(roomId);
            } else {
                router = this.rooms.get(roomId).router;
            }

            // Handle WebRTC events
            socket.on('getRouterRtpCapabilities', (callback) => {
                callback(router.rtpCapabilities);
            });

            socket.on('createWebRtcTransport', async (callback) => {
                try {
                    const transport = await this.createWebRtcTransport(router);
                    this.rooms.get(roomId).transports.set(transport.id, transport);
                    
                    callback({
                        id: transport.id,
                        iceParameters: transport.iceParameters,
                        iceCandidates: transport.iceCandidates,
                        dtlsParameters: transport.dtlsParameters
                    });
                } catch (error) {
                    callback({ error: error.message });
                }
            });

            socket.on('connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
                try {
                    const transport = this.rooms.get(roomId).transports.get(transportId);
                    await transport.connect({ dtlsParameters });
                    callback({ success: true });
                } catch (error) {
                    callback({ error: error.message });
                }
            });

            socket.on('produce', async ({ kind, rtpParameters, transportId }, callback) => {
                try {
                    const transport = this.rooms.get(roomId).transports.get(transportId);
                    const producer = await transport.produce({ kind, rtpParameters });
                    
                    // Inform other participants about new producer
                    socket.to(roomId).emit('newProducer', {
                        producerId: producer.id,
                        kind
                    });
                    
                    callback({ id: producer.id });
                } catch (error) {
                    callback({ error: error.message });
                }
            });

            socket.on('consume', async ({ producerId, rtpCapabilities }, callback) => {
                try {
                    const router = this.rooms.get(roomId).router;
                    if (!router.canConsume({ producerId, rtpCapabilities })) {
                        return callback({ error: 'Cannot consume' });
                    }

                    // Create consumer
                    const transport = Array.from(this.rooms.get(roomId).transports.values())
                        .find(t => t.appData.peerId === socket.id);
                    
                    const consumer = await transport.consume({
                        producerId,
                        rtpCapabilities,
                        paused: true
                    });

                    callback({
                        id: consumer.id,
                        producerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters
                    });
                } catch (error) {
                    callback({ error: error.message });
                }
            });

            // Handle screen sharing
            socket.on('startScreenShare', async () => {
                try {
                    await videoRoom.toggleScreenSharing(userId, true);
                    this.io.to(roomId).emit('screenShareStarted', { userId });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('stopScreenShare', async () => {
                try {
                    await videoRoom.toggleScreenSharing(userId, false);
                    this.io.to(roomId).emit('screenShareStopped', { userId });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle disconnection
            socket.on('disconnect', async () => {
                try {
                    // Update video room participant status
                    await videoRoom.removeParticipant(userId);
                    
                    // Check if room is empty
                    if (videoRoom.isEmpty()) {
                        videoRoom.status = 'ended';
                        videoRoom.endTime = new Date();
                        await videoRoom.save();

                        // Clean up room resources
                        const roomState = this.rooms.get(roomId);
                        if (roomState) {
                            roomState.transports.forEach(transport => transport.close());
                            roomState.router.close();
                            this.rooms.delete(roomId);
                        }
                    }

                    this.io.to(roomId).emit('participantLeft', { userId });
                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            });

        } catch (error) {
            console.error('Error in handleConnection:', error);
            socket.disconnect();
        }
    }

    async createWebRtcTransport(router) {
        return await router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1'
                }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            initialAvailableOutgoingBitrate: 1000000,
            minimumAvailableOutgoingBitrate: 600000,
            maxSctpMessageSize: 262144,
            maxIncomingBitrate: 1500000
        });
    }
}

module.exports = WebRTCManager;