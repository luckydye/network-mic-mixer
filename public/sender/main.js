import AudioSource from "../audio/AudioSource.js";
import AudioChannel from "../audio/AudioChannel.js";
import AudioStreamMeterVertecal from "../components/AudioMeterVertical.js";

window.addEventListener('load', e => {
    init();
});

function uuid() {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

function getClientId() {
    let id = localStorage.getItem('client-id');
    if (!id) {
        id = uuid();
        localStorage.setItem('client-id', id);
    }
    return id;
}

let lastOffer = null;

const audioBandwidth = 128;
const videoBandwidth = 1048;
function setBandwidth(sdp) {
    sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n');
    sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n');
    return sdp;
}

async function createRTCOffer(stream) {
    return new Promise((resolve, reject) => {
        const lc = new RTCPeerConnection();
        const dc = lc.createDataChannel("channel");

        if(lastOffer) {
            lastOffer.close();
        }
        lastOffer = lc;

        lc.addStream(stream);

        dc.onmessage = e => {
            console.log(e.data);
        }
        dc.onopen = e => {
            console.log('Connected to peer');
        }

        let lastIce = null;
        lc.onicecandidate = e => {
            // console.log('New Ice Candidate:', JSON.stringify(lc.localDescription));
            if(lc.localDescription == lastIce) {
                resolve(lc);
            }
            lc.localDescription.sdp = setBandwidth(lc.localDescription.sdp);
            lc.localDescription.sdp.replace("maxaveragebitrate=510000");
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

const offers = {};

function connectToSocket(stream) {
    const socket = io(location.href);
    socket.send('boradcast', { test: true });

    socket.on('message', async (type, msg) => {
        switch(type) {
            case 'answer': 
                offers[msg.id].acceptClient(msg.description);
                console.log(msg);
                break;
            case 'createOffer': 
                const offer = await createRTCOffer(stream);
                const data = {
                    id: msg.id,
                    description: offer.localDescription
                }
                offers[msg.id] = offer;
                socket.send('offer', data);
                break;
        }
    })
}

async function init() {

    console.log('loading...');

    const infoEle = document.querySelector('.info');
    const monitorEle = document.querySelector('.monitor');
    const muteBtn = document.querySelector('#muteButton');
    const connectBtn = document.querySelector('#connectButton');

    const clientId = getClientId();

    infoEle.innerHTML = `${clientId}`;

    // audio setup
    const audioContext = new AudioContext();

    window.addEventListener('click', e => {
        audioContext.resume();
    });

    const audioSource = new AudioSource(audioContext);
    audioSource.getMedia();

    const channel = new AudioChannel(audioContext);
    channel.setInput(audioSource);
    const outputStream = channel.getOutputStream();

    const meter = new AudioStreamMeterVertecal(audioContext);
    meter.setAudioSourceNode(channel.getOutputNode());

    monitorEle.append(meter);

    // actions
    muteBtn.addEventListener('click', e => {
        if(channel.muted) {
            muteBtn.removeAttribute('active');
            channel.unmute();
        } else {
            muteBtn.setAttribute('active', '');
            channel.mute();
        }
    })
    connectBtn.addEventListener('click', e => {
        connectToSocket(outputStream);
    })
}
