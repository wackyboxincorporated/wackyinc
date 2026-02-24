const Multiplayer = {
    isHost: false,
    isClient: false,
    isConnected: false,
    peerConnection: null,
    dataChannel: null,
    roomId: null,
    dbUnsubscribe: null,

    // Weervers
    rtcConfig: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    },

    initHost: async function () {
        this.isHost = true;
        this.isClient = false;
        this.roomId = Math.floor(1000 + Math.random() * 9000).toString(); // random room ID

        console.log("Hosting game. Room ID:", this.roomId);

        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        // Host
        this.dataChannel = this.peerConnection.createDataChannel('gameData', {
            ordered: false,
            maxRetransmits: 0
        });
        this.setupDataChannel();

        // Collect
        const roomRef = db.collection('rooms').doc(this.roomId);
        const callerCandidatesCollection = roomRef.collection('callerCandidates');

        this.peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            callerCandidatesCollection.add(event.candidate.toJSON());
        });

        // Create
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        const roomWithOffer = {
            offer: {
                type: offer.type,
                sdp: offer.sdp,
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // optional: for cleanup
        };
        await roomRef.set(roomWithOffer);

        // Listen for remote        
        this.dbUnsubscribe = roomRef.onSnapshot(async snapshot => {
            const data = snapshot.data();
            if (!this.peerConnection.currentRemoteDescription && data && data.answer) {
                console.log('Got remote description: ', data.answer);
                const rtcSessionDescription = new RTCSessionDescription(data.answer);
                await this.peerConnection.setRemoteDescription(rtcSessionDescription);
            }
        });

        // Listen for remote
        roomRef.collection('calleeCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log('Got new remote ICE candidate: ', data);
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });

        return this.roomId;
    },

    initClient: async function (roomId) {
        this.isHost = false;
        this.isClient = true;
        this.roomId = roomId;

        console.log("Joining game. Room ID:", this.roomId);

        const roomRef = db.collection('rooms').doc(this.roomId);
        const roomSnapshot = await roomRef.get();
        if (!roomSnapshot.exists) {
            console.error('Room not found');
            return false;
        }

        this.peerConnection = new RTCPeerConnection(this.rtcConfig);

        // Client
        this.peerConnection.addEventListener('datachannel', event => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        });

        // Col
        const calleeCandidatesCollection = roomRef.collection('calleeCandidates');
        this.peerConnection.addEventListener('icecandidate', event => {
            if (!event.candidate) {
                console.log('Got final candidate!');
                return;
            }
            console.log('Got candidate: ', event.candidate);
            calleeCandidatesCollection.add(event.candidate.toJSON());
        });

        // Get
        const offer = roomSnapshot.data().offer;
        console.log('Got offer:', offer);
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        // s
        const answer = await this.peerConnection.createAnswer();
        console.log('Created answer:', answer);
        await this.peerConnection.setLocalDescription(answer);

        const roomWithAnswer = {
            answer: {
                type: answer.type,
                sdp: answer.sdp,
            }
        };
        await roomRef.update(roomWithAnswer);

        // Lididates
        roomRef.collection('callerCandidates').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(async change => {
                if (change.type === 'added') {
                    let data = change.doc.data();
                    console.log('Got new remote ICE candidate: ', data);
                    await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });

        return true;
    },

    setupDataChannel: function () {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            this.isConnected = true;
            if (this.dbUnsubscribe) this.dbUnsubscribe(); // Stoprestore

            // Notady
            if (typeof onMultiplayerConnected === 'function') {
                onMultiplayerConnected();
            }
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.isConnected = false;
            // Notonnect
            if (typeof onMultiplayerDisconnected === 'function') {
                onMultiplayerDisconnected();
            }
        };

        this.dataChannel.onmessage = (event) => {
            // Proputs
            const data = JSON.parse(event.data);
            if (this.isClient) {
                if (typeof onGameStateReceived === 'function') {
                    onGameStateReceived(data);
                }
            } else if (this.isHost) {
                if (typeof onClientInputReceived === 'function') {
                    onClientInputReceived(data);
                }
            }
        };
    },

    sendData: function (dataObj) {
        if (this.isConnected && this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(dataObj));
        }
    }
};
