import Gyro from 'https://dev.luckydye.de/gyro.js';
import { Action } from './Actions.js';
import Preferences from './app/Preferences.js';
import AudioChannel from './audio/AudioChannel.js';
import { AudioClip } from './audio/AudioClip.js';
import { AudioRecorder } from './audio/AudioRecorder.js';
import AudioSource from './audio/AudioSource.js';
import { AudioTrack } from './audio/AudioTrack.js';
import { AudioTrackMixer } from './audio/AudioTrackMixer.js';
import AudioUtils from './audio/AudioUtils.js';
import AudioStreamMeter from './components/AudioMeter.js';
import './components/AudioMeterVertical.js';
import AudioTrackChannel from './components/AudioTrackChannel.js';
import AudioTrackElement from './components/AudioTrackElement.js';
import DropdownButton from './components/DropdownButton.js';
import PlaybackControls from './components/PlaybackControls.js';
import Timeline from './components/Timeline.js';
import Timer from './Timer.js';

Action.register({
    name: 'playPause',
    description: 'playPause',
    shortcut: 'space',
    onAction(args, event, aciton) {
        if(Timer.playing) {
            Timer.pause();
        } else {
            Timer.play();
        }
    }
});

const audioContext = new AudioContext();

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

const tracks = [
    {
        name: 'Track 1',
        inputDevice: 'f4e4dffa447be44f7557a78785415c2061d06c99472a1a1dfe8b128faed078d3',
        armed: true,
    },
    {
        name: 'Track 2',
        inputDevice: '157bb2c4c2fa454a88354d046bfc2808b573f57733f94df7352b371d3b91fa87',
        armed: true,
    },
    {
        name: 'Track 3',
        inputDevice: '157bb2c4c2fa454a88354d046bfc2808b573f57733f94df7352b371d3b91fa87',
        armed: false,
    }
]

function loadMixerTracks(audioContext, mixer, jsonTracks) {
    for(let jsonTrack of jsonTracks) {
        const track1 = new AudioTrack(audioContext);
        track1.name = jsonTrack.name;
        track1.armed = jsonTrack.armed;
        mixer.addTrack(track1);
    
        const track = new AudioTrackElement(audioContext, track1);
        track.id = "tracksElement";
        track.inputDeviceId = jsonTrack.inputDevice;
        tracksEle.appendChild(track);
    
        const mixerTrack = new AudioTrackChannel(track1);
        mixerContainer.appendChild(mixerTrack);
    }
}

async function main() {
    // setup audiocontext
    await audioContext.audioWorklet.addModule('./audio/audio-proxy.js');
    await audioContext.audioWorklet.addModule('./audio/audio-db-meter.js');
    await audioContext.audioWorklet.addModule('./audio/audio-composer.js');

    //new routing
    const mixer = new AudioTrackMixer(audioContext);

    loadMixerTracks(audioContext, mixer, tracks);

    const mixOutNode = mixer.getOutputNode(audioContext);

    // init routing
    const masterChannel = new AudioChannel(audioContext);
    masterChannel.setInput(mixOutNode);

    const knob = createControlKnob(masterChannel);
    headerElement.appendChild(knob);

    const ui = makeUi();
    ui.onStart = () => {
        const armedTracks = mixer.getTracks().filter(track => track.armed);
        for(let track of armedTracks) {
            track.recorder.startRecord();
        }
    }
    ui.onStop = () => {
        const armedTracks = mixer.getTracks().filter(track => track.armed);
        for(let track of armedTracks) {
            track.recorder.stopRecord();
        }
    }

    // monitor

    const masterStream = masterChannel.getOutputStream();
    const masterNode = masterChannel.getOutputNode();
    monitorStream(masterStream, "Output", headerElement);

    const audio = new Audio();
    audio.srcObject = masterStream;
    audio.play();

    // devices / output device selector
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

function makeUi() {
    const controls = new PlaybackControls();

    const callbacks = {
        onStart() { },
        onStop() { },
        onPlay() { },
        onPause() { },
    }

    controlsElement.appendChild(controls);

    controls.addEventListener('play', e => {
        Timer.play();
        callbacks.onPlay();
    })
    controls.addEventListener('pause', e => {
        Timer.pause();
        callbacks.onPause();
    })
    controls.addEventListener('startrecord', e => {
        Timer.play();
        callbacks.onStart();
    })
    controls.addEventListener('stoprecord', e => {
        Timer.pause();
        callbacks.onStop();
    })

    return callbacks;
}

main();

// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('./sw.js', {
//         sopce: '/images/'
//     }).then(registration => {
//         // Registration was successful
//         console.log('ServiceWorker registration successful with scope: ', registration.scope);
//     }, function (err) {
//         // registration failed :(
//         console.log('ServiceWorker registration failed: ', err);
//     });
// }
