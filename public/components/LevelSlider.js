import { render, html } from 'https://unpkg.com/lit-html?module';

function map(value, in_min, in_max, out_min, out_max) {
	return (value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

export default class LevelSlider extends HTMLElement {

	template() {
		return html`
			<style>
				:host {
                    display: inline-block;
                    width: 8px;
                    height: 200px;

                    --color-input-background: #313131;
                    --color-input-hover-background: #333;
                    --color-input-active-background: #222;
				}

                .input-container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: 6px;
                    position: relative;
                }

                .slider {
                    position: relative;
                    height: 100%;
                    width: 100%;
                    box-sizing: border-box;
                    padding-bottom: 15px;
                    padding-top: 15px;
                    background: var(--color-input-background);
                    border-radius: 6px;
                    border: 1px solid rgb(56 56 56);
                }
                .slider:before {
                    content: "";
                    position: absolute;
                    left: 0;
                    bottom: 0;
                    width: 100%;
                    height: calc(100% * var(--value));
                    pointer-events: none;
                    background: hsl(0deg 0% 54%);
                    opacity: 0.33;
                    border-radius: inherit;
                }
                .slider[active]:before {
                    opacity: 0.5;
                }

                .slider:hover {
                    background: var(--color-input-hover-background);
                }
                
                .slider[active] {
                    background: var(--color-input-active-background);
                }

                .thumb {
                    content: "";
                    position: absolute;
                    left: 50%;
                    border-radius: 6px;
                    width: 20px;
                    height: 34px;
                    bottom: calc(100% * var(--value));
                    border: 0px solid hsl(227deg 53% 59%);
                    transform: translate(-50%, 50%);
                    box-shadow: 1px 3px 8px rgb(0 0 0 / 25%);
                    overflow: hidden;
                }
                .thumb svg {
                    width: 100%;
                    display: block;
                }
                .thumb:hover {
                    filter: brightness(1.1);
                }
                .slider[active] .thumb {
                    filter: brightness(1.2);
                }

                .value-container {
                    white-space: nowrap;
                    height: 100%;
                    width: 100%;
                }

                .input-value {
                    height: 100%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    background: transparent;
                    width: 100%;
                    padding: 0;
                    color: inherit;
                    font-family: inherit;
                    font-size: 11px;
                    text-align: center;
                    display: none;
                }

                .input-value:focus {
                    cursor: text;
                }

                .value-suffix {
                    opacity: 0.5;
                    pointer-events: none;
                    margin-left: 2px;
                }

                .input-value:focus {
                    outline: none;
                    cursor: text;
                }
                
			</style>
            <div class="slider">
                <div class="input-container">
                    <span class="thumb">
                        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="22" height="34px" viewBox="0 0 22 42">
                            <defs>
                                <linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
                                    <stop offset="0" stop-color="#3d3d3d"/>
                                    <stop offset="0.356" stop-color="#757575"/>
                                    <stop offset="0.82" stop-color="#3b3b3b"/>
                                    <stop offset="1" stop-color="#333"/>
                                </linearGradient>
                            </defs>
                            <g id="Group_1" data-name="Group 1" transform="translate(-120 -325)">
                                <rect id="Rectangle_1" data-name="Rectangle 1" width="22" height="42" rx="0" transform="translate(120 325)" fill="#3d3d3d"/>
                                <rect id="Rectangle_2" data-name="Rectangle 2" width="22" height="16" rx="0" transform="translate(120 351)" fill="url(#linear-gradient)"/>
                                <line id="Line_1" data-name="Line 1" x2="22" transform="translate(120 346)" fill="none" stroke="#222" stroke-width="1"/>
                                <rect id="Rectangle_3" data-name="Rectangle 3" width="22" height="17" rx="0" transform="translate(142 342) rotate(180)" fill="url(#linear-gradient)"/>
                            </g>
                        </svg>
                    </span>
                    <span class="value-container">
                        <input class="input-value"></input>
                        ${this.suffix ? html`
                            <span class="value-suffix">${this.suffix}</span>
                        ` : "" }
                    </span>
                </div>
            </div>
		`;
	}

	static get observedAttributes() {
		return ['value', 'min', 'max', 'steps'];
	}

	get value() { return this._value; }
	set value(val) { 
		this._value = +val;
		this.update();
	}

	get min() { return this._min; }
	set min(val) {
		this._min = +val;
		this.update();
	}

	get max() { return this._max; }
	set max(val) {
		this._max = +val;
		this.update();
	}

	get steps() { return this._steps; }
	set steps(val) {
		this._steps = +val;
		this.update();
    }

	get suffix() { return this.getAttribute('suffix'); }
	set suffix(val) {
		this.setAttribute('suffix', val);
		this.render();
    }
    
    get isRange() {
        return this.max || this.min;
    }

	constructor() {
		super();

		this._value = .2;
		this._min = 0;
		this._max = 0;
		this._steps = 0.1;

		this.attachShadow({ mode: 'open' });
		this.render();

		this.slider = this.shadowRoot.querySelector('.slider');
		this.input = this.shadowRoot.querySelector('.input-container');
        this.inputValue = this.shadowRoot.querySelector('.input-value');
        
		this.registerHandlers();
		this.update();
	}

	registerHandlers() {
		let startPos = null;
		let startMovePos = null;
        let startValue = this.value;
        let focused = false;

		const cancel = () => {
            startPos = null;
            startMovePos = null;
            this.slider.removeAttribute('active');
		}

        this.inputValue.addEventListener('click', e => {
            this.inputValue.disabled = false;
            focused = true;

            this.inputValue.focus();
        });

		const up = e => {
			cancel();
		}
		const start = e => {
            if(e.x == undefined) {
                e.x = e.touches[0].clientX;
                e.y = e.touches[0].clientY;
            }

			if(!focused) {
                startPos = [e.x, e.y];
                startValue = this.value;
                this.slider.setAttribute('active', ''); 
                e.preventDefault();
            }
		}
		const move = e => {
            if(e.x == undefined) {
                e.x = e.touches[0].clientX;
                e.y = e.touches[0].clientY;
            }

			if(startPos) {
                if(Math.abs(e.y - startPos[1]) > 10) {
                    startMovePos = [e.x, e.y];
                }
            }
			if(startMovePos && startPos) {
				// apply shift key scaler
				let scale = e.shiftKey ? 0.0005 : (
                    (window.innerHeight / this.input.clientHeight) *
                    (this.max - this.min) / 600
                );
                // scale to min max range
                // if(this.max - this.min > 0) {
                //     scale /= (this.max - this.min);
                // }

				// set value by absolute delta movement * scale
				let absolute = startValue + ((e.y - startPos[1]) * -scale);
				// apply steps
				absolute = absolute - (absolute % this.steps);

				this.setValue(absolute);
				e.preventDefault();
			}
        }

        const submit = () => {
            if(isNaN(this.inputValue.value)) {

                try {
                    const evalValue = math.evaluate(this.inputValue.value);
                    this.setValue(evalValue);
                } catch(err) {
                    console.log(err);
                }
                
                cancelInput();

            } else {
                this.setValue(parseFloat(this.inputValue.value));
                this.inputValue.disabled = true;
                focused = false;
            }
        }

        const cancelInput = () => {
            this.setValue(this.value);
            this.inputValue.disabled = true;
            focused = false;
        }

        const input = e => {
            if(e.key == "Enter") {
                submit();
            } else if(e.key == "Escape") {
                cancelInput();
            }
        }
        
        this.inputValue.addEventListener('blur', submit);
        this.inputValue.addEventListener('keydown', input);

        // mouse
		this.input.addEventListener('mousedown', start);
		window.addEventListener('mousemove', move);

        // touch
		this.input.addEventListener('touchstart', start);
		window.addEventListener('touchmove', move);

        // touch
		window.addEventListener('touchend', up);
		window.addEventListener('touchcancel', up);

        // mouse
		window.addEventListener('mouseup', up);
		window.addEventListener('mousecancel', up);
		window.addEventListener('mouseleave', up);

        // touch
        this.addEventListener('touchstart', e => {
            if(!startPos && !focused) {
                e.preventDefault();
            }
        });

        // mouse
        this.addEventListener('mousedown', e => {
            if(!startPos && !focused) {
                e.preventDefault();
            }
        });
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if(name == "value") {
			this.setValue(newValue);
		}
		if(name == "min") {
			this.min = +newValue;
		}
		if(name == "max") {
			this.max = +newValue;
		}
		if(name == "steps") {
			this.steps = +newValue;
		}
	}

	update() {
        if(this.isRange) {
            this.slider.style.setProperty('--value', map(this.value, this.min, this.max, 0, 1));
        }

        const getPrecision = (n) => {
            const precParts = n.toString().split(".");
            const size = precParts[1] ? precParts[1].length : 0;

            // return 0 if precision is smaller then .000
            if(precParts[1] && precParts[1].substring(0, 3) == "000") {
                return 0;
            }

            return size;
        }

        const valuePrecision = getPrecision(this.value);
        const stepsPrecision = getPrecision(this.steps);

        const precision = valuePrecision > stepsPrecision ? stepsPrecision : valuePrecision;

        this.inputValue.value = this.value.toFixed(precision);
        this.inputValue.size = this.inputValue.value.length;
	}

	setValue(value) {
        const latValue = this.value;

        if(this.isRange) {
            this.value = Math.min(Math.max(value, this.min), this.max);
        } else {
            this.value = value;
        }

        this.dispatchEvent(new InputChangeEvent(this.value - latValue));
	}

	render() {
		render(this.template(), this.shadowRoot);
	}

}

class InputChangeEvent extends Event {
    constructor(delta) {
        super('change');
        this.delta = delta;
    }
}

customElements.define("level-slider", LevelSlider);
