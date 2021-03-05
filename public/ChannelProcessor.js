export default class ChannelProcessor {

    constructor(context, optns = {}) {
        this.context = context;
        this.stream = optns.stream;

        this.gain = this.context.createGain();

        if(this.stream) {
            const audioSource = this.context.createMediaStreamSource(this.stream);
            this.setInput(audioSource);
        }
    }

    setInput(audioSource) {
        audioSource.connect(this.gain);
    }

    getOutput() {
        return this.gain;
    }

    setVolume(volume = 0) {
        this.gain.gain.setValueAtTime(volume, this.context.currentTime);
    }

    getVolume() {
        return this.gain.gain.value;
    }

}
