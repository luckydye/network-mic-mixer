import AudioStreamMeter from './AudioStreamMeter.js';

let reciever = false;

async function createWirelessMicClient() {
    return new Promise(async (resolve, reject) => {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });

        const lc = new RTCPeerConnection();
        const dc = lc.createDataChannel("channel");

        lc.addStream(mic);

        dc.onmessage = e => {
            console.log(e.data);
        }
        dc.onopen = e => {
            console.log('Connected to peer');
        }

        const micMeter = new AudioStreamMeter("Microphone");
        micMeter.setSourceStream(mic);
        const vid = document.createElement('video');
        vid.srcObject = mic;
        document.body.appendChild(micMeter);

        let lastIce = null;
        lc.onicecandidate = e => {
            console.log('New Ice Candidate:', JSON.stringify(lc.localDescription));
            if(lc.localDescription == lastIce) {
                resolve(lc);
            }
            lastIce = lc.localDescription;
        }

        lc.createOffer().then(offer => {
            lc.setLocalDescription(offer);
        })

        lc.acceptClient = answer => {
            lc.setRemoteDescription(answer);
        }
    })
}

function createRecieverClient(remoteOffer) {
    return new Promise((resolve, reject) => {
        const rc = new RTCPeerConnection();
        let lastIce = null;
        rc.onicecandidate = e => {
            if(lastIce == rc.localDescription) {
                resolve(rc);
            }
            lastIce = rc.localDescription;
            console.log('New Ice Candidate:', JSON.stringify(rc.localDescription));
        }
        rc.ondatachannel = e => {
            rc.dc = e.channel;
            rc.dc.onmessage = e => {
                console.log('Remote msg:', e.data);
            }
            rc.dc.onopen = e => {
                console.log('Data Channel open');
            }
        }
        rc.onaddstream = e => {
            console.log('Stream', e.stream);
            const vid = document.createElement('video');
            vid.srcObject = e.stream;
            const audioMeter = new AudioStreamMeter("Remote Microphone");
            audioMeter.setSourceStream(e.stream);
            document.body.appendChild(audioMeter);
        }
        rc.setRemoteDescription(remoteOffer).then(e => {
            console.log('Offset accetped.');
        });
        rc.createAnswer().then(anser => {
            rc.setLocalDescription(anser).then(e => {
                console.log('Anser created.');
            })
        })
    })
}

function registerSocket(socket, type) {
    socket.send(JSON.stringify({
        type: 'register',
        data: {
            clientType: type
        }
    }));
}

function sendICE(socket, iceSdp) {
    socket.send(JSON.stringify({
        type: 'ice',
        data: {
            ice: iceSdp
        }
    }));
}

function connectToIce(socket, ice, answer) {
    socket.send(JSON.stringify({
        type: 'peerConnect',
        data: {
            ice: ice,
            answer: answer
        }
    }));
}

function getSocketProtocol() {
    return location.protocol[4] == "s" ? "wss:" : "ws:";
}

function connectSocket(reciever = true) {
    if(reciever) {
        const socket = new WebSocket(getSocketProtocol() + location.host);
        socket.onerror = e => {
            console.log('Socket Error');
        }
        socket.onopen = e => {
            console.log('Reciever Socket opened');
            registerSocket(socket, "reciever");
        }
        socket.onmessage = msg => {
            const message = JSON.parse(msg.data);

            if(message.type == "senders") {
                const snedersIces = message.data;
                for(let ice of snedersIces) {
                    createRecieverClient(ice).then(rc => {
                        console.log('Reciever created');
                        connectToIce(socket, ice, rc.localDescription);
                    })
                }
            }
        }

        return socket;
    } else {
        const socket = new WebSocket(getSocketProtocol() + location.host);
        let client = null;
        socket.onerror = e => {
            console.log('Socket Error');
        }
        socket.onopen = e => {
            console.log('Sender Socket opened');
            registerSocket(socket, "sender");
            createWirelessMicClient().then(lc => {
                sendICE(socket, lc.localDescription);
                client = lc;
            });
        }
        socket.onmessage = msg => {
            const message = JSON.parse(msg.data);

            if(message.type == "connectToReciever") {
                const answer = message.data.answer;
                client.acceptClient(answer);
            }
        }

        return socket;
    }
}

if(location.search == "?reciever") {
    reciever = true;
    connectSocket();
} else {
    reciever = false;
    connectSocket(false);
}
