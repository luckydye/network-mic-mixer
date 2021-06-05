export default class AudioChannel {

    constructor(audioContext) {
        if(!audioContext)
            throw new Error('Missing audio context.');
        
        this.context = audioContext;

        this.gain = audioContext.createGain();
        this.compressor = audioContext.createDynamicsCompressor();
        this.analyser = audioContext.createAnalyser();
        this.filter = audioContext.createBiquadFilter();
        this.delay = audioContext.createDelay(1);

        this.inputGain = this.gain.gain.value;
        this.input = null;
        this._muted = false;
    }

    setDelay(ms) {
        this.delay.delayTime.setValueAtTime(ms / 1000, this.context.currentTime);
    }

    getDelay() {
        return this.delay.delayTime.value;
    }

    get muted() {
        return this._muted;
    }

    mute() {
        this.gain.gain.setValueAtTime(0, this.context.currentTime);
        this._muted = true;
    }

    unmute() {
        this.gain.gain.setValueAtTime(this.inputGain, this.context.currentTime);
        this._muted = false;
    }

    setGain(val = 0) {
        this.gain.gain.setValueAtTime(val, this.context.currentTime + 0.01);
    }

    getGain() {
        return this.gain.gain.value;
    }

    setInput(source) {
        this.input = source;
        this.input.connect(this.delay);
        this.delay.connect(this.gain);
    }

    clearInput() {
        this.input.disconnect();
        this.delay.disconnect();
        this.input = null;
    }

    getOutputStream() {
        const dest = this.context.createMediaStreamDestination();
        this.gain.connect(dest);
        return dest.stream;
    }

    getOutputNode() {
        return this.gain;
    }

}
