import Gyro from 'https://dev.luckydye.de/gyro.js';
import Preferences from '../app/Preferences.js';
import AudioChannel from "../audio/AudioChannel.js";
import { AudioTrack } from '../audio/AudioTrack.js';
import { AudioTrackMixer } from "../audio/AudioTrackMixer.js";
import AudioUtils from '../audio/AudioUtils.js';
import AudioStreamMeter from '../components/AudioMeter.js';
import AudioStreamMeterVertecal from "../components/AudioMeterVertical.js";
import AudioTrackChannel from '../components/AudioTrackChannel.js';
import DropdownButton from '../components/DropdownButton.js';
import LabelMap from './LabelMap.mjs';

const audioContext = new AudioContext();

window.addEventListener('load', e => {
    init();
});

const audioBandwidth = 128;
const videoBandwidth = 1048;
function setBandwidth(sdp) {
    sdp = sdp.replace(/a=mid:audio\r\n/g, 'a=mid:audio\r\nb=AS:' + audioBandwidth + '\r\n');
    sdp = sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:' + videoBandwidth + '\r\n');
    return sdp;
}

async function createRTCAnswer(remoteOffer, callback) {
    return new Promise((resolve, reject) => {
        const rc = new RTCPeerConnection();
        let lastIce = null;
        rc.onicecandidate = e => {
            if(lastIce == rc.localDescription) {
                resolve(rc);
            }
            
            rc.localDescription.sdp = setBandwidth(rc.localDescription.sdp);
            lastIce = rc.localDescription;
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
            callback(e.stream);
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

function getMedia(callback) {
    const video = document.createElement('video');

    const socket = io(location.host);

    socket.send('requestPreview');

    socket.on('message', async (type, data) => {
        switch(type) {
            case 'previewOffer':
                console.log('sender data', data);
                const description = data.description;
                const answer = await createRTCAnswer(description, stream => {
                    handleRemoteStream(stream, data.clientId);
                });
                const answerData = {
                    id: data.id,
                    description: answer.localDescription
                }
                socket.send('answer', answerData);
                break;
        }
    })

    function handleRemoteStream(stream, clientId) {
        video.srcObject = stream;
        video.muted = true;

        video.oncanplay = () => {
            video.play();
        }

        callback(stream, clientId);
    }

    return video;
}

function monitorStream(stream, name, contianer) {
    const meter = new AudioStreamMeter(audioContext, name);
    meter.setSourceStream(stream);
    contianer.appendChild(meter);
}

function createControlKnob(source) {
    const knob = new Gyro.Knob();

    knob.min = 0;
    knob.max = 20;
    knob.steps = 0.1;

    knob.setValue(source.getGain());

    knob.addEventListener('change', e => {
        source.setGain(knob.value);
    })

    return knob;
}

let inputCounter = 0;

function handleNewInput(mixer, stream, label) {
    const track = new AudioTrack(mixer.context);
    track.audioSource.setInputStream(stream);
    track.name = label;
    mixer.addTrack(track);

    const mixerTrack = new AudioTrackChannel(track);
    mixerContainer.appendChild(mixerTrack);
}

async function init() {

    console.log('loading...');
    
    // audio setup

    // setup audiocontext
    await audioContext.audioWorklet.addModule('../audio/audio-proxy.js');
    await audioContext.audioWorklet.addModule('../audio/audio-db-meter.js');
    await audioContext.audioWorklet.addModule('../audio/audio-composer.js');

    //new routing
    const mixer = new AudioTrackMixer(audioContext);

    getMedia((stream, clientId) => {
        inputCounter++;

        let label = LabelMap.getLabel(clientId);
        if(!label) {
            label = "Input " + inputCounter;
        }

        handleNewInput(mixer, stream, label);
    });

    const mixOutNode = mixer.getOutputNode(audioContext);

    // init routing
    const masterChannel = new AudioChannel(audioContext);
    masterChannel.setInput(mixOutNode);

    const knob = createControlKnob(masterChannel);
    headerElement.appendChild(knob);

    // monitor
    const masterStream = masterChannel.getOutputStream();
    const masterNode = masterChannel.getOutputNode();
    monitorStream(masterStream, "Output", headerElement);

    const audio = new Audio();
    audio.srcObject = masterStream;
    audio.play();

    window.addEventListener('click', e => {
        audio.play();
        audioContext.resume();
    })


    // io routing
    const devices = await AudioUtils.getAudioDevies();
    const audioOutputDevices = devices.audiooutput;

    console.log('Available Input Devices:');
    devices.audioinput.forEach((dev, i) => {
        console.log(i.toString(), '|', dev.label, '-', dev.deviceId);
    });

    console.log('Available Output Devices:');
    devices.audiooutput.forEach((dev, i) => {
        console.log(i.toString(), '|', dev.label, '-', dev.deviceId);
    });

    const device = audioOutputDevices[0];

    const deviceDropdown = new DropdownButton();
    deviceDropdown.options = audioOutputDevices.map(dev => {
        return {
            name: dev.label,
            deviceId: dev.deviceId,
        }
    })
    deviceDropdown.value = {
        name: audioOutputDevices.default.label,
        deviceId: audioOutputDevices.default.deviceId,
    };

    const prefOutputDevice = Preferences.get('output-device');
    if(prefOutputDevice) {
        const dev = audioOutputDevices.find(dev => dev.deviceId == prefOutputDevice.deviceId);
        deviceDropdown.value = {
            name: dev.label,
            deviceId: dev.deviceId,
        };
        audio.setSinkId(dev.deviceId);
    }

    deviceDropdown.addEventListener('change', e => {
        console.log('Output to:', deviceDropdown.value.deviceId);
        audio.setSinkId(deviceDropdown.value.deviceId);
        Preferences.set('output-device', deviceDropdown.value);
    });

    controlsElement.appendChild(deviceDropdown);
}
