import { html, LitElement } from 'https://cdn.pika.dev/lit-element';

const audioContext = new AudioContext();

export default class AudioStreamMeter extends LitElement {

    constructor(name) {
        super();
        
        this.name = name;
        
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.maxDecibels = 6;
        this.analyser.minDecibels = -60;
        this.analyser.smoothingTimeConstant = 0;
        this.dbRange = this.analyser.maxDecibels - this.analyser.minDecibels;
        this.dataArray = new Float32Array(this.analyser.frequencyBinCount);

        this.canvas = document.createElement('canvas');
        this.canvas.width = 150;
        this.canvas.height = 4;
        this.context = this.canvas.getContext("2d");
        this.value = 0;
        this.target = 0;
        this.peak = 0;
        this.history = [];

        const updateAudioMeter = () => {
            this.evaluate();
            this.renderAudioMeter();
            requestAnimationFrame(updateAudioMeter);
        }
        updateAudioMeter();
    }

    setSourceStream(stream) {
        const audioSource = audioContext.createMediaStreamSource(stream);
        this.setAudioSourceNode(audioSource);
    }

    setAudioSourceNode(audioSourceNode) {
        this.audioSource = audioSourceNode;
        this.audioSource.connect(this.analyser);
        this.evaluate();
    }

    setAudioSourceFromTrack(audioTrack) {
        const stream = new MediaStream();
        stream.addTrack(audioTrack);
        this.setSourceStream(stream);
    }

    evaluate() {
        this.analyser.getFloatFrequencyData(this.dataArray);

        let avrg = 0;
        for(let value of this.dataArray) {
            avrg += value;
        }
        avrg = avrg / this.dataArray.length;

        this.target = avrg;

        if(Number.isFinite(this.target)) {
            this.value += (this.target - this.value) * 0.1;
        }

        this.history.push(this.target);
        if(this.history.length > 50) {
            this.history.shift();
        }

        this.peak = Math.max(...this.history);
    }

    renderAudioMeter() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const factor = this.dbRange;
        const value = (this.dbRange - Math.abs(this.value + this.dbRange)) / factor;
        const target = (this.dbRange - Math.abs(this.target + this.dbRange)) / factor;
        const peak = (this.dbRange - Math.abs(this.peak + this.dbRange)) / factor;

        this.context.fillStyle = "#1a8e1a";
        this.context.fillRect(0, 0, target * this.canvas.width, this.canvas.height);

        this.context.fillStyle = "#00ff00";
        this.context.fillRect(0, 0, value * this.canvas.width, this.canvas.height);

        if(peak < 1) {
            this.context.fillStyle = "#00ff00";
        } else {
            this.context.fillStyle = "red";
        }
        this.context.fillRect(peak * this.canvas.width, 0, 1, this.canvas.height);

        this.update();
    }

    render() {
        return html`
            <style>
                canvas {
                    background: #191919;
                    image-rendering: pixelated;
                }
            </style>
            <div>${this.name}</div>
            <div>${this.canvas}</div>
        `;
    }

}

customElements.define('audio-stream-meter', AudioStreamMeter);
