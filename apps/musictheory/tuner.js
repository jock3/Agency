'use strict';

const GUITAR_STRINGS = [
  { note: 'E2', freq: 82.41 },
  { note: 'A2', freq: 110.00 },
  { note: 'D3', freq: 146.83 },
  { note: 'G3', freq: 196.00 },
  { note: 'B3', freq: 246.94 },
  { note: 'E4', freq: 329.63 },
];

const TUNER_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// ── Tuner constants ──────────────────────────────────────────────
const TUNER_FFT_SIZE             = 4096;  // samples for autocorrelation
const TUNER_RMS_THRESHOLD        = 0.008; // minimum signal level to process
const TUNER_SILENCE_GATE         = 0.2;   // amplitude below which sample is "silent"
const TUNER_CORR_STRENGTH        = 0.5;   // autocorr peak must exceed this × corr[0]
const CENTS_IN_TUNE              = 5;     // cents — shown as green
const CENTS_NEAR                 = 15;    // cents — shown as amber
const CENTS_RANGE                = 50;    // max cents displayed on needle
const STRING_HIGHLIGHT_THRESHOLD = 0.25;  // log2 octaves distance for string match
const TUNER_CANVAS_PAD_X         = 20;    // horizontal padding in canvas

let _tunerCtx = null;
let _tunerStream = null;
let _tunerAnalyser = null;
let _tunerBuf = null;
let _tunerRaf = null;
let _tunerActive = false;

function initTuner() {
  const container = document.getElementById('tuner-strings');
  if (!container) return;
  container.innerHTML = GUITAR_STRINGS.map(s => {
    const letter = s.note.replace(/\d/, '');
    return `<div class="tuner-string">
      <div class="ts-name">${letter}</div>
      <div class="ts-note">${s.note}</div>
      <div class="ts-freq">${s.freq.toFixed(2)} Hz</div>
    </div>`;
  }).join('');
}

function toggleTuner() {
  if (_tunerActive) stopTuner();
  else startTuner();
}

async function startTuner() {
  const status = document.getElementById('tuner-status');
  const btn = document.getElementById('tuner-toggle');
  try {
    _tunerStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _tunerCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = _tunerCtx.createMediaStreamSource(_tunerStream);
    _tunerAnalyser = _tunerCtx.createAnalyser();
    _tunerAnalyser.fftSize = TUNER_FFT_SIZE;
    src.connect(_tunerAnalyser);
    _tunerBuf = new Float32Array(_tunerAnalyser.fftSize);
    _tunerActive = true;
    if (btn) btn.textContent = '⏹ Stoppa stämmare';
    if (status) status.textContent = 'Aktiv — spela en sträng på gitarren...';
    _tunerRaf = requestAnimationFrame(updateTuner);
  } catch (err) {
    if (status) status.textContent = 'Kunde inte komma åt mikrofonen: ' + err.message;
  }
}

function stopTuner() {
  _tunerActive = false;
  if (_tunerRaf) { cancelAnimationFrame(_tunerRaf); _tunerRaf = null; }
  if (_tunerStream) { _tunerStream.getTracks().forEach(t => t.stop()); _tunerStream = null; }
  if (_tunerCtx) { _tunerCtx.close().catch(() => {}); _tunerCtx = null; }

  const btn = document.getElementById('tuner-toggle');
  const status = document.getElementById('tuner-status');
  const noteEl = document.getElementById('tuner-note');
  const centsEl = document.getElementById('tuner-cents');
  const freqEl = document.getElementById('tuner-freq');
  if (btn) btn.textContent = '🎤 Starta stämmare';
  if (status) status.textContent = 'Klicka på knappen nedan för att starta stämaren — kräver mikrofonåtkomst.';
  if (noteEl) noteEl.textContent = '—';
  if (centsEl) { centsEl.textContent = ''; centsEl.className = 'tuner-cents'; }
  if (freqEl) freqEl.textContent = '';
  _clearTunerCanvas();
  document.querySelectorAll('.tuner-string').forEach(el => el.classList.remove('active'));
}

function updateTuner() {
  if (!_tunerActive) return;
  _tunerRaf = requestAnimationFrame(updateTuner);
  _tunerAnalyser.getFloatTimeDomainData(_tunerBuf);
  const freq = _autoCorrelate(_tunerBuf, _tunerCtx.sampleRate);
  if (freq <= 0) return;

  const midi = 12 * Math.log2(freq / 440) + 69;
  const midiRound = Math.round(midi);
  const cents = Math.round((midi - midiRound) * 100);
  const noteName = TUNER_NOTES[((midiRound % 12) + 12) % 12];
  const octave = Math.floor(midiRound / 12) - 1;

  const noteEl = document.getElementById('tuner-note');
  const centsEl = document.getElementById('tuner-cents');
  const freqEl = document.getElementById('tuner-freq');
  if (noteEl) noteEl.textContent = noteName + octave;
  if (centsEl) {
    centsEl.textContent = (cents >= 0 ? '+' : '') + cents + ' cents';
    centsEl.className = 'tuner-cents ' + (Math.abs(cents) < CENTS_IN_TUNE ? 'in-tune' : Math.abs(cents) < CENTS_NEAR ? 'near' : 'off');
  }
  if (freqEl) freqEl.textContent = freq.toFixed(1) + ' Hz';

  _drawNeedle(cents);
  _highlightNearestString(freq);
}

function _autoCorrelate(buf, sampleRate) {
  let rms = 0;
  const n = buf.length;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < TUNER_RMS_THRESHOLD) return -1;

  let r1 = 0, r2 = n - 1;
  for (let i = 0; i < n / 2; i++) { if (Math.abs(buf[i]) < TUNER_SILENCE_GATE) { r1 = i; break; } }
  for (let i = 1; i < n / 2; i++) { if (Math.abs(buf[n - i]) < TUNER_SILENCE_GATE) { r2 = n - i; break; } }

  const c = buf.slice(r1, r2 + 1);
  const len = c.length;
  const corr = new Float32Array(len);
  for (let lag = 0; lag < len; lag++) {
    for (let j = 0; j < len - lag; j++) corr[lag] += c[j] * c[j + lag];
  }

  let d = 1;
  while (d < len && corr[d] > corr[d - 1]) d++;

  let maxVal = -Infinity, maxLag = -1;
  for (let i = d; i < len; i++) {
    if (corr[i] > maxVal) { maxVal = corr[i]; maxLag = i; }
  }
  if (maxLag < 1 || maxVal < corr[0] * TUNER_CORR_STRENGTH) return -1;

  let x = maxLag;
  if (x > 0 && x < len - 1) {
    const y1 = corr[x - 1], y2 = corr[x], y3 = corr[x + 1];
    const denom = 2 * y2 - y1 - y3;
    if (denom > 0) x += (y3 - y1) / (2 * denom);
  }
  return sampleRate / x;
}

function _drawNeedle(cents) {
  const canvas = document.getElementById('tuner-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const trackY = H / 2, padX = TUNER_CANVAS_PAD_X;

  ctx.fillStyle = '#1c2432';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(padX, trackY - 6, W - padX * 2, 12, 6);
  else ctx.rect(padX, trackY - 6, W - padX * 2, 12);
  ctx.fill();

  ctx.fillStyle = '#28364a';
  for (let t = -CENTS_RANGE; t <= CENTS_RANGE; t += 10) {
    const tx = W / 2 + (t / CENTS_RANGE) * (W / 2 - padX);
    const th = t === 0 ? 22 : 10;
    ctx.fillRect(tx - 0.5, trackY - th / 2, 1, th);
  }

  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(W / 2 - 1, trackY - 18, 2, 36);

  const clamp = Math.max(-CENTS_RANGE, Math.min(CENTS_RANGE, cents));
  const nx = W / 2 + (clamp / CENTS_RANGE) * (W / 2 - padX);
  const inTune = Math.abs(cents) < CENTS_IN_TUNE;
  const near = Math.abs(cents) < CENTS_NEAR;
  const color = inTune ? '#22c55e' : near ? '#f59e0b' : '#ef4444';

  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(nx, trackY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function _clearTunerCanvas() {
  const canvas = document.getElementById('tuner-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

function _highlightNearestString(freq) {
  let bestIdx = -1, bestDist = Infinity;
  GUITAR_STRINGS.forEach((s, i) => {
    const dist = Math.abs(Math.log2(freq / s.freq));
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  });
  document.querySelectorAll('.tuner-string').forEach((el, i) => {
    el.classList.toggle('active', i === bestIdx && bestDist < STRING_HIGHLIGHT_THRESHOLD);
  });
}

document.addEventListener('DOMContentLoaded', initTuner);
