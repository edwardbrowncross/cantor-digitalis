/**
 * UI utilities for the Cantor Digitalis example application.
 * This module handles DOM creation, sliders, checkboxes, and spectrum visualization.
 */

export interface SliderConfig {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  formatValue: (v: number) => string;
  onChange: (v: number) => void;
}

export interface CheckboxConfig {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownConfig {
  id: string;
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
}

export interface UICallbacks {
  onStart: () => Promise<void>;
  onStop: () => void;
}

export interface VowelButtonConfig {
  ipa: string;
  h: number; // backness
  v: number; // height
  tooltip: string;
}

export function midiToNoteName(midi: number): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = notes[midi % 12];
  return `${note}${octave}`;
}

export function createSlider(container: HTMLElement, config: SliderConfig): HTMLInputElement {
  const { label, min, max, step, value, formatValue, onChange } = config;

  const row = document.createElement("div");
  row.className = "slider-row";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  const valueEl = document.createElement("span");
  valueEl.className = "value";
  valueEl.textContent = formatValue(value);

  slider.addEventListener("input", () => {
    const v = parseFloat(slider.value);
    valueEl.textContent = formatValue(v);
    onChange(v);
  });

  row.appendChild(labelEl);
  row.appendChild(slider);
  row.appendChild(valueEl);
  container.appendChild(row);

  return slider;
}

export function createCheckbox(container: HTMLElement, config: CheckboxConfig): HTMLInputElement {
  const { id, label, checked, onChange } = config;

  const row = document.createElement("div");
  row.className = "checkbox-row";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = id;
  checkbox.checked = checked;
  checkbox.addEventListener("change", () => {
    onChange(checkbox.checked);
  });

  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  row.appendChild(checkbox);
  row.appendChild(labelEl);
  container.appendChild(row);

  return checkbox;
}

export function createDropdown(container: HTMLElement, config: DropdownConfig): HTMLSelectElement {
  const { id, label, options, value, onChange } = config;

  const row = document.createElement("div");
  row.className = "dropdown-row";

  const labelEl = document.createElement("label");
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const select = document.createElement("select");
  select.id = id;

  for (const option of options) {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    if (option.value === value) {
      optionEl.selected = true;
    }
    select.appendChild(optionEl);
  }

  select.addEventListener("change", () => {
    onChange(select.value);
  });

  row.appendChild(labelEl);
  row.appendChild(select);
  container.appendChild(row);

  return select;
}

export type FrequencyResponseGetter = (
  frequencies: number[],
  sampleRate: number
) => number[] | null;

export class SpectrumAnalyzer {
  private canvas: HTMLCanvasElement;
  private analyser: AnalyserNode;
  private animationId: number | null = null;
  private getFrequencyResponse: FrequencyResponseGetter | null;

  constructor(
    canvas: HTMLCanvasElement,
    analyser: AnalyserNode,
    getFrequencyResponse?: FrequencyResponseGetter
  ) {
    this.canvas = canvas;
    this.analyser = analyser;
    this.getFrequencyResponse = getFrequencyResponse ?? null;
  }

  start(): void {
    this.draw();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private draw = (): void => {
    const ctx = this.canvas.getContext("2d")!;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const freqData = new Float32Array(this.analyser.frequencyBinCount);
    this.analyser.getFloatFrequencyData(freqData);

    const sampleRate = this.analyser.context.sampleRate;
    const binFreq = sampleRate / this.analyser.fftSize;

    const minFreq = 100;
    const maxFreq = 5000;
    const minDb = -100;
    const maxDb = 0;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);

    // Draw frequency grid lines
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (const freq of [100, 500, 1000, 2000, 3000, 4000, 5000]) {
      const x = ((freq - minFreq) / (maxFreq - minFreq)) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw dB grid lines
    for (const db of [-80, -60, -40, -20]) {
      const y = height - ((db - minDb) / (maxDb - minDb)) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw spectrum
    ctx.strokeStyle = "#4a9";
    ctx.lineWidth = 2;
    ctx.beginPath();

    let started = false;
    for (let x = 0; x < width; x++) {
      const freq = minFreq + (x / width) * (maxFreq - minFreq);
      const bin = Math.round(freq / binFreq);

      if (bin >= 0 && bin < freqData.length) {
        const db = freqData[bin];
        const normalizedDb = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
        const y = height - normalizedDb * height;

        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Draw frequency response envelope
    if (this.getFrequencyResponse) {
      // Generate frequency points for the response curve
      const numPoints = width;
      const frequencies: number[] = [];
      for (let x = 0; x < numPoints; x++) {
        frequencies.push(minFreq + (x / width) * (maxFreq - minFreq));
      }

      const response = this.getFrequencyResponse(frequencies, sampleRate);
      if (response) {
        // Convert to dB
        const responseDb = response.map((a) =>
          a <= 0 ? -Infinity : 20 * Math.log10(a)
        );

        // Draw the response curve
        ctx.strokeStyle = "#f80";
        ctx.lineWidth = 2;
        ctx.beginPath();

        let envelopeStarted = false;
        for (let x = 0; x < numPoints; x++) {
          const db = responseDb[x] - 60; // Offset to align with spectrum
          if (!isFinite(db)) continue;

          const normalizedDb = Math.max(
            0,
            Math.min(1, (db - minDb) / (maxDb - minDb))
          );
          const y = height - normalizedDb * height;

          if (!envelopeStarted) {
            ctx.moveTo(x, y);
            envelopeStarted = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }

    // Draw axis labels
    ctx.fillStyle = "#888";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    for (const freq of [100, 1000, 2000, 3000, 4000, 5000]) {
      const x = ((freq - minFreq) / (maxFreq - minFreq)) * width;
      ctx.fillText(freq >= 1000 ? `${freq / 1000}k` : String(freq), x, height - 4);
    }

    ctx.textAlign = "left";
    for (const db of [-80, -60, -40, -20, 0]) {
      const y = height - ((db - minDb) / (maxDb - minDb)) * height;
      ctx.fillText(`${db}dB`, 4, y - 2);
    }

    this.animationId = requestAnimationFrame(this.draw);
  };
}

export interface SliderRefs {
  vowelHeight: HTMLInputElement;
  vowelBackness: HTMLInputElement;
}

export function createControlPanel(
  paramSliders: SliderConfig[],
  featureCheckboxes: CheckboxConfig[],
  falsettoCheckbox: CheckboxConfig,
  callbacks: UICallbacks,
  vowelButtons?: VowelButtonConfig[],
  onVowelSelect?: (h: number, v: number) => void,
  vowelTableDropdown?: DropdownConfig
): {
  container: HTMLElement;
  spectrumCanvas: HTMLCanvasElement;
  sliderRefs: SliderRefs;
  updateVowelButtons: (buttons: VowelButtonConfig[]) => void;
} {
  const controls = document.createElement("div");
  controls.className = "controls";

  // Track slider references for vowel button updates
  const sliderRefs: Partial<SliderRefs> = {};

  // Create parameter sliders
  for (const config of paramSliders) {
    const slider = createSlider(controls, config);
    if (config.label.includes("Height")) {
      sliderRefs.vowelHeight = slider;
    } else if (config.label.includes("Backness")) {
      sliderRefs.vowelBackness = slider;
    }
  }

  // Falsetto checkbox
  createCheckbox(controls, falsettoCheckbox);

  // Vowel buttons section
  let vowelContainer: HTMLElement | null = null;
  let currentOnVowelSelect = onVowelSelect;

  const createVowelButtons = (buttons: VowelButtonConfig[]) => {
    if (!vowelContainer || !currentOnVowelSelect) return;
    vowelContainer.innerHTML = "";

    for (const vowel of buttons) {
      const btn = document.createElement("button");
      btn.className = "vowel-btn";
      btn.textContent = vowel.ipa;
      btn.title = vowel.tooltip;
      btn.addEventListener("click", () => {
        // Update slider values
        if (sliderRefs.vowelHeight) {
          sliderRefs.vowelHeight.value = String(vowel.v);
          sliderRefs.vowelHeight.dispatchEvent(new Event("input"));
        }
        if (sliderRefs.vowelBackness) {
          sliderRefs.vowelBackness.value = String(vowel.h);
          sliderRefs.vowelBackness.dispatchEvent(new Event("input"));
        }
        currentOnVowelSelect!(vowel.h, vowel.v);
      });
      vowelContainer.appendChild(btn);
    }
  };

  if (vowelButtons && onVowelSelect) {
    const vowelSection = document.createElement("div");
    vowelSection.className = "vowel-section";
    const vowelHeader = document.createElement("h3");
    vowelHeader.textContent = "Vowels";
    vowelSection.appendChild(vowelHeader);

    // Add vowel table dropdown if provided
    if (vowelTableDropdown) {
      createDropdown(vowelSection, vowelTableDropdown);
    }

    vowelContainer = document.createElement("div");
    vowelContainer.className = "vowel-buttons";

    createVowelButtons(vowelButtons);

    vowelSection.appendChild(vowelContainer);
    controls.appendChild(vowelSection);
  }

  // Feature flags section
  const featuresSection = document.createElement("div");
  featuresSection.className = "features-section";
  const featuresHeader = document.createElement("h3");
  featuresHeader.textContent = "Features";
  featuresSection.appendChild(featuresHeader);

  for (const config of featureCheckboxes) {
    createCheckbox(featuresSection, config);
  }

  controls.appendChild(featuresSection);

  // Buttons
  const buttons = document.createElement("div");
  buttons.className = "buttons";

  const startBtn = document.createElement("button");
  startBtn.id = "startBtn";
  startBtn.textContent = "Start";

  const stopBtn = document.createElement("button");
  stopBtn.id = "stopBtn";
  stopBtn.textContent = "Stop";
  stopBtn.disabled = true;

  startBtn.addEventListener("click", async () => {
    await callbacks.onStart();
    startBtn.disabled = true;
    stopBtn.disabled = false;
  });

  stopBtn.addEventListener("click", () => {
    callbacks.onStop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  buttons.appendChild(startBtn);
  buttons.appendChild(stopBtn);
  controls.appendChild(buttons);

  // Spectrum analyzer canvas
  const spectrumCanvas = document.createElement("canvas");
  spectrumCanvas.id = "spectrum";
  spectrumCanvas.width = 560;
  spectrumCanvas.height = 200;
  controls.appendChild(spectrumCanvas);

  return {
    container: controls,
    spectrumCanvas,
    sliderRefs: sliderRefs as SliderRefs,
    updateVowelButtons: createVowelButtons,
  };
}
