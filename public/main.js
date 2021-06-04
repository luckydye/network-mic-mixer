import AudioSource from "./audio/AudioSource.js";
import AudioChannel from "./audio/AudioChannel.js";
import AudioStreamMeterVertecal from "./components/AudioMeterVertical.js";

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

    const meter = new AudioStreamMeterVertecal(audioContext);
    meter.setAudioSourceNode(channel.getOutputNode());

    monitorEle.append(meter);
    console.log(channel);
}
