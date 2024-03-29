import { html, LitElement, css } from 'https://cdn.skypack.dev/lit-element@2.4.0';
import AudioStreamMeterVertecal from './AudioMeterVertical.js';
import LabelMap from '../mixer/LabelMap.mjs';
import FluidInput from './FluidInput.js';

export default class AudioTrackChannel extends LitElement {

    static get styles() {
        console.log(arguments);
        return css`
            :host {
                background: rgb(64 64 64);
                border: 1px solid rgb(64 64 64);
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
                background: rgb(78 78 78);
                user-select: none;
            }
            .container {
                display: grid;
                grid-template-rows: auto auto auto 1fr auto;
            }
            .return-send {
                padding: 4px;
            }
            .level-meter {
                display: grid;
                grid-template-columns: 1fr auto auto 1fr;
                gap: 20px;
                margin: 15px 0 20px 0;
            }
            .level-meter vertical-slider {
                grid-column: 2;
            }
            .level-meter audio-meter-vertical {
                grid-column: 3;
                width: 12px;
            }
            .gain {
                margin-top: 2px;
                display: flex;
                justify-content: center;
            }
            .gain gyro-knob {
                transform: scale(0.9);
            }

            gyro-fluid-input2 {
                font-size: 12px;
            }

            level-slider {
                height: 100%;
                grid-column: 2;
            }

            .header {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
                margin-top: 5px;
                padding: 8px 0px;
                background: rgb(78 78 78);
            }

            button {
                padding: 8px;
                border: 1px solid #929292;
                background: grey;
                border-radius: 4px;
                cursor: pointer;
            }
            button:hover {
                filter: brightness(1.2);
            }
            button[active] {
                background: hsl(0deg 50% 44%);
                border-color: hsl(0deg 55% 50%);
            }
            button:active {
                filter: brightness(0.9);
            }

            .delay {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 8px 0;
                background: rgb(53 53 53);
            }

            .color {
                width: 100%;
                height: 4px;
                background: var(--color);
                grid-row: 6;
            }
        `;
    }

    constructor(audioTrack) {
        super();

        this.color = `hsl(${Math.random() * 360}, 55%, 50%)`;
        this.style.setProperty('--color', this.color);

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

        this.muteBtn = document.createElement('button');
        this.muteBtn.innerHTML = "Mute";
        this.muteBtn.addEventListener('click', e => {
            if(channel.muted) {
                this.muteBtn.removeAttribute('active');
                channel.unmute();
            } else {
                this.muteBtn.setAttribute('active', '');
                channel.mute();
            }
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
                <div class="gain">
                    ${this.knob}
                </div>
                <div class="header">
                    ${this.muteBtn}
                </div>
                <div class="level-meter" style="grid-row: 4;">
                    ${this.slider}
                    ${this.meter}
                </div>
                <div class="delay" style="grid-row: 5;">
                    ${this.delayInput}
                </div>
                <div class="color"></div>
            </div>
        `;
    }

}

customElements.define('audio-channel', AudioTrackChannel);
