import { Voice } from "./nodes/voice";
import { convertToVoiceParams, ExternalVoiceParams } from "./parameters";

let audioCtx: AudioContext | null = null;
let voice: Voice | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let spectrumCanvas: HTMLCanvasElement | null = null;
let animationId: number | null = null;

let masterGainValue = 1.0;

const params: ExternalVoiceParams = {
  P: 0,
  P0: 55,
  E: 0.8,
  H: 0.85,
  V: 0.1,
  T: 0.5,
  B: 0.02,
  R: 0.01,
  S: 0.28,
  M: 1,
};

function midiToNoteName(midi: number): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = notes[midi % 12];
  return `${note}${octave}`;
}

function createSlider(
  container: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  formatValue: (v: number) => string,
  onChange: (v: number) => void
): HTMLInputElement {
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

function updateVoice() {
  if (voice) {
    const voiceParams = convertToVoiceParams(params);
    voice.update(voiceParams);
  }
}

function drawSpectrum() {
  if (!analyser || !spectrumCanvas) return;

  const ctx = spectrumCanvas.getContext("2d")!;
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;

  const freqData = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(freqData);

  const sampleRate = audioCtx!.sampleRate;
  const binFreq = sampleRate / analyser.fftSize;

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

  animationId = requestAnimationFrame(drawSpectrum);
}

async function startAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = masterGainValue;
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.8;
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  if (!voice) {
    const voiceParams = convertToVoiceParams(params);
    voice = await Voice.create(audioCtx, voiceParams);
    voice.out.connect(masterGain!);
  }

  voice.start();
  drawSpectrum();
}

function stopAudio() {
  if (voice) {
    voice.stop();
  }
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

function createUI() {
  const app = document.getElementById("app")!;

  const controls = document.createElement("div");
  controls.className = "controls";

  // Master Gain
  createSlider(controls, "Master Gain", 0, 3, 0.01, masterGainValue, (v) => v.toFixed(2), (v) => {
    masterGainValue = v;
    if (masterGain) {
      masterGain.gain.value = v;
    }
  });

  // MIDI note slider (C2=36 to C5=72)
  createSlider(
    controls,
    "MIDI Note",
    36,
    72,
    1,
    params.P0,
    (v) => midiToNoteName(v),
    (v) => {
      params.P0 = v;
      updateVoice();
    }
  );

  // Vocal Effort
  createSlider(controls, "Vocal Effort (E)", 0, 1, 0.01, params.E, (v) => v.toFixed(2), (v) => {
    params.E = v;
    updateVoice();
  });

  // Vowel Height
  createSlider(controls, "Vowel Height (H)", 0, 1, 0.01, params.H, (v) => v.toFixed(2), (v) => {
    params.H = v;
    updateVoice();
  });

  // Vowel Backness
  createSlider(controls, "Vowel Backness (V)", 0, 1, 0.01, params.V, (v) => v.toFixed(2), (v) => {
    params.V = v;
    updateVoice();
  });

  // Tenseness
  createSlider(controls, "Tenseness (T)", 0, 1, 0.01, params.T, (v) => v.toFixed(2), (v) => {
    params.T = v;
    updateVoice();
  });

  // Breathiness
  createSlider(controls, "Breathiness (B)", 0, 1, 0.01, params.B, (v) => v.toFixed(2), (v) => {
    params.B = v;
    updateVoice();
  });

  // Roughness
  createSlider(controls, "Roughness (R)", 0, 1, 0.01, params.R, (v) => v.toFixed(2), (v) => {
    params.R = v;
    updateVoice();
  });

  // Vocal Tract Size
  createSlider(controls, "Tract Size (S)", 0, 1, 0.01, params.S, (v) => v.toFixed(2), (v) => {
    params.S = v;
    updateVoice();
  });

  // Falsetto checkbox
  const checkboxRow = document.createElement("div");
  checkboxRow.className = "checkbox-row";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = "falsetto";
  checkbox.checked = params.M === 2;
  checkbox.addEventListener("change", () => {
    params.M = checkbox.checked ? 2 : 1;
    updateVoice();
  });
  const checkboxLabel = document.createElement("label");
  checkboxLabel.htmlFor = "falsetto";
  checkboxLabel.textContent = "Falsetto (M=2)";
  checkboxRow.appendChild(checkbox);
  checkboxRow.appendChild(checkboxLabel);
  controls.appendChild(checkboxRow);

  // Buttons
  const buttons = document.createElement("div");
  buttons.className = "buttons";

  const startBtn = document.createElement("button");
  startBtn.id = "startBtn";
  startBtn.textContent = "Start";
  startBtn.addEventListener("click", async () => {
    await startAudio();
    startBtn.disabled = true;
    stopBtn.disabled = false;
  });

  const stopBtn = document.createElement("button");
  stopBtn.id = "stopBtn";
  stopBtn.textContent = "Stop";
  stopBtn.disabled = true;
  stopBtn.addEventListener("click", () => {
    stopAudio();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  buttons.appendChild(startBtn);
  buttons.appendChild(stopBtn);
  controls.appendChild(buttons);

  // Spectrum analyzer canvas
  spectrumCanvas = document.createElement("canvas");
  spectrumCanvas.id = "spectrum";
  spectrumCanvas.width = 560;
  spectrumCanvas.height = 200;
  controls.appendChild(spectrumCanvas);

  app.appendChild(controls);
}

createUI();
