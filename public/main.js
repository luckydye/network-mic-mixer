import AudioStreamMeter from './AudioStreamMeter.js';

let reciever = false;
let streams = [];
let audioContext = null;
let devices = [];
let currentOutputDevice = null;
let currentAudioDestination = null;

let outputMeter = null;

function getDeviceByLabel(label) {
    return devices.find(dev => dev.label == label);
}

async function getMediaDevies(deviceType = "audiooutput") {
    const devices = [];
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
        return navigator.mediaDevices.enumerateDevices().then(d => {
            for(let device of d) {
                if(device.kind == deviceType) {
                    devices.push(device);
                }
            }
            return devices;
        }).catch(console.error);
    }).catch(console.error);    
}

function handleRemoteStream(stream) {
    const vid = document.createElement('video');
    vid.srcObject = stream;
    const audioMeter = new AudioStreamMeter("Remote Microphone");
    audioMeter.setSourceStream(stream);
    document.body.appendChild(audioMeter);
    streams.push(stream);

    updateOutputStream();
}

async function updateOutputStream() {
    devices = await getMediaDevies();
    
    for(let stream of streams) {
        const audioSource = audioContext.createMediaStreamSource(stream);
        console.log('Source', audioSource);
        console.log('Dest', currentAudioDestination);
        audioSource.connect(currentAudioDestination);
    }
}

function createOutputDeviceSelect(devices) {
    const select = document.createElement('select');
    for(let device of devices) {
        const opt = document.createElement('option');
        opt.innerHTML = device.label;
        select.appendChild(opt);
    }
    return select;
}

const audio = new Audio();

function handleOutputChange(device) {
    if(!device) {
        console.error('No device selected');
        return;
    }

    currentOutputDevice = device;
    currentAudioDestination = audioContext.createMediaStreamDestination(device);
    audio.srcObject = currentAudioDestination.stream;
    audio.play();
    audio.setSinkId(device.deviceId);

    outputMeter.setSourceStream(currentAudioDestination.stream);

    console.log('Device selected', device);

    updateOutputStream();
}

async function init() {
    audioContext = new AudioContext();

    outputMeter = new AudioStreamMeter("Output");
    document.body.appendChild(outputMeter);

    devices = await getMediaDevies();
    handleOutputChange(devices[0]);

    const select = createOutputDeviceSelect(devices);
    document.body.appendChild(select);
    select.onchange = e => {
        const device = getDeviceByLabel(select.value);
        handleOutputChange(device);
    }
}

async function createWirelessMicClient() {
    return new Promise(async (resolve, reject) => {
        const mic = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleSize: 24,
                sampleRate: 48000,
                noiseSuppression: false,
                autoGainControl: false,
                echoCancellation: false
            }
        });

        console.log('Input Stream', mic);

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
            handleRemoteStream(e.stream);
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
    console.log('Trying to connect...');
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

const btn = document.createElement('button');
btn.innerHTML = "Connect";
btn.onclick = () => {
    btn.remove();

    init();

    if(location.search == "?reciever") {
        reciever = true;
        connectSocket();
    } else if(location.search == "?sender") {
        reciever = false;
        connectSocket(false);
    }
}
document.body.append(btn);
