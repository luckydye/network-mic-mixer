import { html, LitElement, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import AudioStreamMeterVertecal from './AudioMeterVertical.js';
import LabelMap from '../mixer/LabelMap.mjs';
import FluidInput from './FluidInput.js';

export default class AudioTrackChannel extends LitElement {

    static get styles() {
        return css`
            :host {
                background: rgb(39, 39, 39);
                border: 1px solid #2d2d2d;
                min-width: 80px;
                display: grid;
                grid-template-rows: auto 1fr;
            }
            .label {
                font-size: 12px;
                width: 100%;
                text-align: center;
                padding: 6px 6px;
                box-sizing: border-box;
                background: #333333;
                user-select: none;
            }
            .container {
                grid-gap: 15px;
                padding: 0 5px 10px 5px;
                display: grid;
                grid-template-rows: 10px 1fr 70px;
            }
            .return-send {
                padding: 4px;
            }
            .level-meter {
                display: grid;
                grid-template-columns: 1fr auto auto 1fr;
                grid-gap: 20px;
            }
            .level-meter vertical-slider {
                grid-column: 2;
            }
            .level-meter audio-meter-vertical {
                grid-column: 3;
                width: 10px;
                background: #1b1b1b;
            }
            .pan {
                display: flex;
                justify-content: center;
            }
            .pan gyro-knob {
                transform: scale(0.9);
            }

            gyro-fluid-input2 {
                font-size: 12px;
            }

            level-slider {
                height: 100%;
                grid-column: 2;
            }
        `;
    }

    constructor(audioTrack) {
        super();

        this.track = audioTrack;
        this.meter = new AudioStreamMeterVertecal(this.track.context);
        this.meter.setAudioSourceNode(this.track.getInputNode());

        const channel = this.track.channel;
        this.knob = document.createElement('gyro-knob');
        this.knob.value = channel.getGain();
        this.knob.steps = 0.01;
        this.knob.min = 0;
        this.knob.max = 10;

        this.knob.addEventListener('change', e => {
            channel.setGain(this.knob.value);
        })

        this.slider = document.createElement('level-slider');
        this.slider.value = channel.getGain();
        this.slider.steps = 0.01;
        this.slider.min = 0;
        this.slider.max = 10;

        this.slider.addEventListener('change', e => {
            this.knob.setValue(channel.getGain());
            channel.setGain(this.slider.value);
        })
        
        this.delayInput = new FluidInput();
        this.delayInput.min = 0;
        this.delayInput.max = 500;
        this.delayInput.steps = 1;
        this.delayInput.value = channel.getDelay();
        this.delayInput.suffix = "ms";

        this.delayInput.addEventListener('change', e => {
            channel.setDelay(this.delayInput.value);
        })
    }

    render() {
        const clientId = this.track.name;
        let label = LabelMap.getLabel(clientId);
        if(!label) {
            label = "Untitled Input";
            LabelMap.setLabel(clientId, label);
        }

        const changeName = () => {
            const newLabel = prompt('New Name:');
            LabelMap.setLabel(clientId, newLabel);
            this.update();
        }
        
        return html`
            <div class="label" @dblclick="${e => { changeName() }}">
                <span>${label}</span>
            </div>
            <div class="container">
                <div class="header">
                </div>
                <div class="level-meter">
                    ${this.slider}
                    ${this.meter}
                </div>
                <div class="pan">
                    ${this.knob}
                </div>
                ${this.delayInput}
            </div>
        `;
    }

}

customElements.define('audio-channel', AudioTrackChannel);
