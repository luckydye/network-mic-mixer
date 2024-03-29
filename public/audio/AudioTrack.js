import Timer from "./Timer.js";
import AudioChannel from "./AudioChannel.js";
import { AudioRecorder } from "./AudioRecorder.js";
import AudioSource from "./AudioSource.js";

let tempTrackCount = 0;

export class AudioTrack {

    get id() {
        return this.name.toLocaleLowerCase().replace(" ", "");
    }

    constructor(audioContext) {
        this.name = "Track " + tempTrackCount;

        this.context = audioContext;

        this.audioSource = new AudioSource(this.context);
        this.channel = new AudioChannel(this.context);
        this.channel.setInput(this.audioSource);

        this.armed = false;
        this.recorder = new AudioRecorder(this.context);
        this.recorder.setInput(this.audioSource);

        this.clips = [];
        this.recorder.onClipCreated = clip => {
            this.clips.push(clip);

            clip.startTime = Timer.time;

            const timeline = document.querySelector('audio-timeline');
            clip.canvas.slot = this.id;
            timeline.appendChild(clip.canvas);
        }

        this.outputChannel = new AudioChannel(this.context);

        tempTrackCount++;

        const outputBuffer = this.context.createBuffer(2, 128, this.context.sampleRate);

        let elapsedTime = 0;
        let lastTick = 0;

        Timer.on('play', e => {
            elapsedTime = 0;
            lastTick = performance.now();
        });

        Timer.on('pause', e => {
            console.log(this.name, elapsedTime);
        });

        let updateAge = 1;

        Timer.on('update', e => {
            if (!lastTick)
                return;

            const deltaTime = (performance.now() - lastTick) / 1000;

            updateAge += deltaTime;

            const packetPerSecond = this.context.sampleRate / 128;
            const packetsPerUpdate = 20;

            // make timing as accurate as possible
            // send the next packets exactly after the last ended / or buffer the old ones or somthing idk
            if(updateAge >= (packetsPerUpdate / packetPerSecond)) {
                updateAge = 0;

                const buffers = this.getBuffersAt(Timer.time, packetsPerUpdate);
                const buffer = buffers.buffers;
                const index = buffers.index;
                    
                // stream the realtime audio to the worklet
                if(Timer.playing) {
                    this.audioComposer.port.postMessage(buffer);
                } else {
                    this.audioComposer.port.postMessage(null);
                } 
            }

            elapsedTime += deltaTime;
            lastTick = performance.now();
        })

        this.audioComposer = new AudioWorkletNode(this.context, 'audio-composer');
        // this.outputChannel.setInput(this.audioComposer);

        // bypass composer for live playback
        this.outputChannel.setInput(this.channel.getOutputNode());

        this.audioComposer.port.onmessage = msg => {
            window.portmsg = msg.data;
        }
    }

    playBuffer(chunkBuffer) {
        if (chunkBuffer) {
            const sampleRate = this.context.sampleRate;
            const bufferLength = (chunkBuffer.length * 128) / sampleRate;
            const audioBuffer = this.context.createBuffer(2, sampleRate * bufferLength, sampleRate);

            for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
                const channelBuffer = audioBuffer.getChannelData(channel);
                for (let i = 0; i < audioBuffer.length; i++) {

                    const bufferIndex = Math.floor(i / 128);
                    const sampleIndex = i - (bufferIndex * 128);

                    channelBuffer[i] = chunkBuffer[bufferIndex][channel][sampleIndex];
                }
            }

            const sourceNode = this.context.createBufferSource();
            sourceNode.buffer = audioBuffer;
            this.outputChannel.setInput(sourceNode);
            sourceNode.start();
            sourceNode.onended = () => {
                sourceNode.disconnect();
            }
        }
    }

    getClipAt(second) {
        let currentClip = null;
        for (let clip of this.clips) {
            if (clip.startTime < second &&
                clip.startTime + clip.length >= second) {
                currentClip = clip;
            }
        }
        return currentClip;
    }

    getBuffersAt(second, size = 1, offset = 0) {
        let currentClip = this.getClipAt(second);
        if (currentClip) {
            const timeOffset = second - currentClip.startTime;
            const dataIndex = Math.floor((timeOffset / currentClip.length) * currentClip.data.length);
            const dataBlock = currentClip.data.slice(
                (dataIndex + offset), 
                (dataIndex + offset) + size
            );

            return {
                index: (dataIndex + offset),
                buffers: dataBlock,
            };
        }
        return {};
    }

    async loadInputSource() {
        return this.audioSource.setInputDevice('default');
    }

    setInputDevice(deviceId) {
        return this.audioSource.setInputDevice(deviceId);
    }
    getInputDevice() {
        return this.audioSource.deviceId;
    }

    getInputNode() {
        return this.channel.getOutputNode();
    }

    getOutputNode() {
        return this.outputChannel.getOutputNode();
    }

}