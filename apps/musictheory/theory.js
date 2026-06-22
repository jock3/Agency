'use strict';

// === NOTES & TUNING ===

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_ALIASES = { Db:'C#', Eb:'D#', Fb:'E', Gb:'F#', Ab:'G#', Bb:'A#', Cb:'B' };
let TUNING = ['E','B','G','D','A','E']; // index 0 = high E, index 5 = low E
let STRING_NAMES = ['e','B','G','D','A','E'];
const STRING_THICKNESS = [1, 1.2, 1.8, 2.2, 2.8, 3.4]; // px visual thickness

let CAPO = 0; // capo fret (0 = ingen capo)

const TUNING_PRESETS = {
  'Standard': { notes: ['E','B','G','D','A','E'], names: ['e','B','G','D','A','E'] },
  'Drop D':   { notes: ['E','B','G','D','A','D'], names: ['e','B','G','D','A','D'] },
  'Open G':   { notes: ['D','B','G','D','G','D'], names: ['d','B','G','D','G','D'] },
  'Open D':   { notes: ['D','A','F#','D','A','D'], names: ['d','A','F#','D','A','D'] },
  'DADGAD':   { notes: ['D','A','G','D','A','D'], names: ['d','A','G','D','A','D'] },
  'Open E':   { notes: ['E','B','G#','E','B','E'], names: ['e','B','G#','E','B','E'] },
};

// === INTERVAL COLORS & NAMES ===

const INTERVAL_INFO = {
  0:  { color: '#ef4444', text: '#fff', name: 'R',   full: 'Root (Grundton)' },
  1:  { color: '#f97316', text: '#fff', name: 'b2',  full: 'Minor 2nd (liten sekund)' },
  2:  { color: '#f59e0b', text: '#000', name: '2',   full: 'Major 2nd (stor sekund)' },
  3:  { color: '#eab308', text: '#000', name: 'b3',  full: 'Minor 3rd (liten ters)' },
  4:  { color: '#84cc16', text: '#000', name: '3',   full: 'Major 3rd (stor ters)' },
  5:  { color: '#22c55e', text: '#fff', name: '4',   full: 'Perfect 4th (kvart)' },
  6:  { color: '#14b8a6', text: '#fff', name: 'b5',  full: 'Tritone / b5 (triton)' },
  7:  { color: '#3b82f6', text: '#fff', name: '5',   full: 'Perfect 5th (kvint)' },
  8:  { color: '#6366f1', text: '#fff', name: 'b6',  full: 'Minor 6th (liten sext)' },
  9:  { color: '#a855f7', text: '#fff', name: '6',   full: 'Major 6th (stor sext)' },
  10: { color: '#ec4899', text: '#fff', name: 'b7',  full: 'Minor 7th (liten septima)' },
  11: { color: '#f43f5e', text: '#fff', name: '7',   full: 'Major 7th (stor septima)' },
};

// === SCALES ===

const SCALES = {
  'Major': {
    intervals: [0,2,4,5,7,9,11],
    desc: 'Ljus och glad karaktär. Grunden i västerländsk musik.',
    formula: 'H-H-½-H-H-H-½',
    category: 'Heptatonisk',
    use: 'Pop, klassisk, country, folk',
    color: '#84cc16'
  },
  'Natural Minor': {
    intervals: [0,2,3,5,7,8,10],
    desc: 'Mörk och melankolisk. Den vanligaste mollskalan i pop och rock. Identisk med Aeolian-modus.',
    formula: 'H-½-H-H-½-H-H',
    category: 'Heptatonisk',
    use: 'Rock, pop, metal, folk',
    color: '#6366f1',
    modeOf: { parent: 'Major', degree: 6, offset: 9 }
  },
  'Harmonic Minor': {
    intervals: [0,2,3,5,7,8,11],
    desc: 'Dramatisk med förhöjd 7:a. Exotisk och intensiv känsla.',
    formula: 'H-½-H-H-½-1½-½',
    category: 'Heptatonisk',
    use: 'Klassisk, metal, flamenco',
    color: '#f43f5e'
  },
  'Melodic Minor': {
    intervals: [0,2,3,5,7,9,11],
    desc: 'Jazzskala med mollterst men durliknande övre del. Smidigt melodisk.',
    formula: 'H-½-H-H-H-H-½',
    category: 'Heptatonisk',
    use: 'Jazz, fusion',
    color: '#ec4899'
  },
  'Major Pentatonic': {
    intervals: [0,2,4,7,9],
    desc: 'Enkel och universell durskala. 5 noter utan dissonanta halvtonssteg.',
    formula: 'H-H-1½-H-1½',
    category: 'Pentatonisk',
    use: 'Pop, country, blues, rock',
    color: '#f59e0b'
  },
  'Minor Pentatonic': {
    intervals: [0,3,5,7,10],
    desc: 'Den mest använda gitarrskalan. Kärnan i blues och rock.',
    formula: '1½-H-H-1½-H',
    category: 'Pentatonisk',
    use: 'Blues, rock, metal, funk',
    color: '#a855f7'
  },
  'Blues': {
    intervals: [0,3,5,6,7,10],
    desc: 'Minor pentatonic + bluesstonen (b5). Det klassiska bluesljudet.',
    formula: '1½-H-½-½-1½-H',
    category: 'Hexatonisk',
    use: 'Blues, rock, R&B',
    color: '#14b8a6'
  },
  'Dorian': {
    intervals: [0,2,3,5,7,9,10],
    desc: 'Moll med stor 6:a. Kallad "jazzens mollskala". Sval och funky.',
    formula: 'H-½-H-H-H-½-H',
    category: 'Modal',
    use: 'Jazz, funk, folk, rock',
    color: '#22c55e',
    modeOf: { parent: 'Major', degree: 2, offset: 2 }
  },
  'Phrygian': {
    intervals: [0,1,3,5,7,8,10],
    desc: 'Spansk och flamenco-karaktär med liten 2:a. Mörk och dramatisk.',
    formula: '½-H-H-H-½-H-H',
    category: 'Modal',
    use: 'Flamenco, metal, fusion',
    color: '#f97316',
    modeOf: { parent: 'Major', degree: 3, offset: 4 }
  },
  'Lydian': {
    intervals: [0,2,4,6,7,9,11],
    desc: 'Dur med förhöjd 4:a (#4). Drömsk, flytande och surrealistisk.',
    formula: 'H-H-H-½-H-H-½',
    category: 'Modal',
    use: 'Film, jazz, pop, fusion',
    color: '#3b82f6',
    modeOf: { parent: 'Major', degree: 4, offset: 5 }
  },
  'Mixolydian': {
    intervals: [0,2,4,5,7,9,10],
    desc: 'Dur med liten 7:a. Dominantens natur. Fundamentet i blues-rock.',
    formula: 'H-H-½-H-H-½-H',
    category: 'Modal',
    use: 'Blues, rock, country, folk',
    color: '#eab308',
    modeOf: { parent: 'Major', degree: 5, offset: 7 }
  },
  'Locrian': {
    intervals: [0,1,3,5,6,8,10],
    desc: 'Mörkast av alla modusarna med liten 5:a. Sällsynt men effektfull.',
    formula: '½-H-H-½-H-H-H',
    category: 'Modal',
    use: 'Metal, jazz (på vii-ackord)',
    color: '#f43f5e',
    modeOf: { parent: 'Major', degree: 7, offset: 11 }
  },
};

// Common diatonic progressions per scale (idx = diatonic chord index)
const COMMON_PROGRESSIONS = {
  'Major': [
    { name: 'I–IV–V–I',  idx: [0,3,4,0] },
    { name: 'I–V–vi–IV', idx: [0,4,5,3] },
    { name: 'I–vi–IV–V', idx: [0,5,3,4] },
    { name: 'ii–V–I',    idx: [1,4,0] },
    { name: 'I–IV–I–V',  idx: [0,3,0,4] },
  ],
  'Natural Minor': [
    { name: 'i–iv–v',        idx: [0,3,4] },
    { name: 'i–VI–III–VII',  idx: [0,5,2,6] },
    { name: 'i–VII–VI–VII',  idx: [0,6,5,6] },
    { name: 'i–iv–VII–III',  idx: [0,3,6,2] },
  ],
  'Harmonic Minor': [
    { name: 'i–iv–V–i', idx: [0,3,4,0] },
    { name: 'i–V–i',    idx: [0,4,0] },
    { name: 'i–iv–V',   idx: [0,3,4] },
  ],
  'Dorian': [
    { name: 'i–IV–i',       idx: [0,3,0] },
    { name: 'i–IV–VII',     idx: [0,3,6] },
    { name: 'i–III–VII–IV', idx: [0,2,6,3] },
  ],
  'Mixolydian': [
    { name: 'I–VII–IV–I', idx: [0,6,3,0] },
    { name: 'I–VII–I',    idx: [0,6,0] },
    { name: 'I–IV–VII',   idx: [0,3,6] },
  ],
  'Phrygian': [
    { name: 'i–II–i',     idx: [0,1,0] },
    { name: 'i–VII–VI',   idx: [0,6,5] },
    { name: 'i–II–VII–i', idx: [0,1,6,0] },
  ],
};

// ── Audio constants ──────────────────────────────────────────────
const MIDI_A4            = 69;       // MIDI number of A4
const FREQ_A4            = 440;      // Hz of A4 reference pitch
const STRUM_DELAY_SEC    = 0.022;    // seconds between strings when strumming
const NOTE_ATTACK_SEC    = 0.005;    // gain ramp-up time
const NOTE_DECAY_SEC     = 1.6;      // gain ramp-down time
const NOTE_TIME_ATTACK   = 0.008;    // attack for playNoteAtTime
const NOTE_TIME_DECAY    = 0.4;      // gain ramp-down for playNoteAtTime
const NOTE_TIME_SUSTAIN  = 1.5;      // total duration for playNoteAtTime
const NOTE_DEFAULT_VOL   = 0.03;     // default volume for playNoteAtTime
const FILTER_HIGH_MULT   = 8;        // highpass cutoff = freq * this
const FILTER_HIGH_MAX    = 5000;     // highpass cutoff ceiling Hz
const FILTER_LOW_MULT    = 2;        // lowpass cutoff = freq * this
const FILTER_LOW_MAX     = 900;      // lowpass cutoff ceiling Hz

// ── Scale matching constants ─────────────────────────────────────
const SCALE_MATCH_THRESHOLD   = 60;  // min % match to include a result
const SCALE_MATCH_MAX_RESULTS = 8;   // max results returned

// ── Chord voicing constants ──────────────────────────────────────
const CHORD_SEARCH_FRETS = 7;        // frets to scan when voicing chords

// === CHORD TYPES ===

const CHORD_INTERVALS = {
  '':     [0,4,7],
  'maj':  [0,4,7],
  'M':    [0,4,7],
  'm':    [0,3,7],
  'min':  [0,3,7],
  '-':    [0,3,7],
  '5':    [0,7],
  '7':    [0,4,7,10],
  'dom7': [0,4,7,10],
  'maj7': [0,4,7,11],
  'M7':   [0,4,7,11],
  'm7':   [0,3,7,10],
  'min7': [0,3,7,10],
  '-7':   [0,3,7,10],
  'dim':  [0,3,6],
  'dim7': [0,3,6,9],
  'aug':  [0,4,8],
  '+':    [0,4,8],
  'sus2': [0,2,7],
  'sus4': [0,5,7],
  'sus':  [0,5,7],
  'add9': [0,4,7,14],
  'm7b5': [0,3,6,10],
  '6':    [0,4,7,9],
  'm6':   [0,3,7,9],
  '9':    [0,4,7,10,14],
  'maj9': [0,4,7,11,14],
  'm9':   [0,3,7,10,14],
  '11':   [0,4,7,10,14,17],
  '13':   [0,4,7,10,14,17,21],
};

// === THEORY FUNCTIONS ===

function normalizeNote(n) {
  return NOTE_ALIASES[n] || n;
}

function noteIndex(note) {
  return NOTES.indexOf(normalizeNote(note));
}

function noteAtFret(stringIdx, fret) {
  const open = noteIndex(TUNING[stringIdx]);
  return NOTES[(open + CAPO + fret) % 12];
}

function getScaleNotes(key, scaleName) {
  const scale = SCALES[scaleName];
  if (!scale) return [];
  const root = noteIndex(key);
  return scale.intervals.map(i => NOTES[(root + i) % 12]);
}

function getIntervalAtFret(stringIdx, fret, key, scaleName) {
  const scale = SCALES[scaleName];
  if (!scale) return null;
  const note = noteAtFret(stringIdx, fret);
  const root = noteIndex(key);
  const noteIdx = noteIndex(note);
  const semitones = (noteIdx - root + 12) % 12;
  return scale.intervals.includes(semitones) ? semitones : null;
}

function getDiatonicChords(key, scaleName) {
  const scale = SCALES[scaleName];
  if (!scale) return [];
  const notes = getScaleNotes(key, scaleName);
  const count = notes.length;
  const ROMAN = ['I','II','III','IV','V','VI','VII'];

  return notes.map((root, i) => {
    const third = notes[(i + 2) % count];
    const fifth = notes[(i + 4) % count];
    const t = (noteIndex(third) - noteIndex(root) + 12) % 12;
    const f = (noteIndex(fifth) - noteIndex(root) + 12) % 12;

    let quality = '';
    if (t === 4 && f === 7) quality = '';
    else if (t === 3 && f === 7) quality = 'm';
    else if (t === 3 && f === 6) quality = 'dim';
    else if (t === 4 && f === 8) quality = 'aug';
    else quality = '';

    const minor = quality === 'm' || quality === 'dim';
    const roman = minor ? ROMAN[i].toLowerCase() : ROMAN[i];
    const suffix = quality === 'dim' ? '°' : quality === 'aug' ? '+' : quality;
    return { root, quality, roman, name: root + (quality === 'm' ? 'm' : ''), suffix };
  });
}

function parseChord(str) {
  str = str.trim().replace(/\/[A-G][#b]?$/, '');
  const m = str.match(/^([A-G][#b]?)(.*)/);
  if (!m) return null;
  const rootStr = m[1];
  const quality = m[2] || '';
  const root = normalizeNote(rootStr);
  if (!NOTES.includes(root)) return null;
  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS[''];
  return { root, rootStr, quality, intervals, display: str };
}

function parseProgression(input) {
  return input.split(/[\s,|\n—–-]+/)
    .map(t => parseChord(t.trim()))
    .filter(Boolean);
}

function chordNotes(chord) {
  const r = noteIndex(chord.root);
  return [...new Set(chord.intervals.map(i => NOTES[(r + i) % 12]))];
}

function analyzeProgression(chords) {
  const allNotes = new Set(chords.flatMap(c => chordNotes(c)));
  const noteArr = [...allNotes];
  const results = [];

  NOTES.forEach(key => {
    Object.entries(SCALES).forEach(([scaleName, scale]) => {
      const scaleNotes = getScaleNotes(key, scaleName);
      const matched = noteArr.filter(n => scaleNotes.includes(n));
      const pct = Math.round((matched.length / noteArr.length) * 100);
      if (pct < SCALE_MATCH_THRESHOLD) return;

      const missing = noteArr.filter(n => !scaleNotes.includes(n));
      results.push({ key, scaleName, pct, matched, missing, scaleNotes });
    });
  });

  return results
    .sort((a, b) => b.pct - a.pct || SCALES[a.scaleName].intervals.length - SCALES[b.scaleName].intervals.length)
    .slice(0, SCALE_MATCH_MAX_RESULTS);
}

// === AUDIO (Web Audio API — plucked string) ===

const STRING_MIDI_BASE = [64, 59, 55, 50, 45, 40]; // high e, B, G, D, A, low E

let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

function playNote(stringIdx, fret) {
  try {
    const ctx = getAudioCtx();
    const midi = STRING_MIDI_BASE[stringIdx] + CAPO + fret;
    const freq = FREQ_A4 * Math.pow(2, (midi - MIDI_A4) / 12);
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * FILTER_HIGH_MULT, FILTER_HIGH_MAX), now);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * FILTER_LOW_MULT, FILTER_LOW_MAX), now + 0.5);
    filter.Q.setValueAtTime(2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.26, now + NOTE_ATTACK_SEC);
    gain.gain.exponentialRampToValueAtTime(0.001, now + NOTE_DECAY_SEC);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + NOTE_DECAY_SEC);
  } catch (_) { /* audio unavailable */ }
}

function playNoteAtTime(stringIdx, fret, startTime, duration, vol = NOTE_DEFAULT_VOL) {
  try {
    const ctx = getAudioCtx();
    const midi = STRING_MIDI_BASE[stringIdx] + CAPO + fret;
    const freq = FREQ_A4 * Math.pow(2, (midi - MIDI_A4) / 12);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * FILTER_HIGH_MULT, FILTER_HIGH_MAX), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * FILTER_LOW_MULT, 800), startTime + NOTE_TIME_DECAY);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + NOTE_TIME_ATTACK);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (_) {}
}

// Strum chord notes across strings starting at startTime
function strum(noteNames, startTime, duration) {
  const noteSet = new Set(noteNames);
  for (let si = 5; si >= 0; si--) {         // low E (si=5) first, strum upward
    const delay = (5 - si) * STRUM_DELAY_SEC; // 22ms between strings
    for (let f = 0; f <= CHORD_SEARCH_FRETS; f++) {
      if (noteSet.has(noteAtFret(si, f))) {
        playNoteAtTime(si, f, startTime + delay, Math.max(0.2, duration - delay));
        break;
      }
    }
  }
}

// Returns sorted list of fret numbers where root note appears (one per fret)
function getRootPositions(key, scaleName, numFrets) {
  const frets = [];
  for (let f = 0; f <= numFrets; f++) {
    for (let s = 0; s < 6; s++) {
      if (getIntervalAtFret(s, f, key, scaleName) === 0) {
        frets.push(f);
        break;
      }
    }
  }
  return frets;
}

// Returns the relative major or minor for a given key/scale, or null if not applicable
function getRelativeScale(key, scaleName) {
  if (scaleName === 'Major') {
    return { key: NOTES[(noteIndex(key) + 9) % 12], scaleName: 'Natural Minor' };
  }
  if (scaleName === 'Natural Minor') {
    return { key: NOTES[(noteIndex(key) + 3) % 12], scaleName: 'Major' };
  }
  return null;
}

// Compute an open-position guitar voicing for a chord.
// chordNoteNames: array of note name strings; rootNote: root of chord
// Returns [lowE, A, D, G, B, highE] fret numbers, -1 = muted.
function computeChordVoicing(chordNoteNames, rootNote) {
  const noteSet = new Set(chordNoteNames);
  const root = normalizeNote(rootNote);
  const fifth = NOTES[(noteIndex(root) + 7) % 12];
  const bassOK = new Set([root, fifth]);
  const result = [];
  for (let si = 5; si >= 0; si--) {
    let found = -1;
    const maxF = si >= 4 ? 4 : 5; // tighter window on bass strings
    for (let f = 0; f <= maxF; f++) {
      const n = noteAtFret(si, f);
      if (noteSet.has(n) && (si < 4 || bassOK.has(n))) { found = f; break; }
    }
    result.push(found);
  }
  return result; // index 0 = low E, index 5 = high e
}

// CommonJS compatibility shim — no-op in the browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeNote,
    noteIndex,
    getScaleNotes,
    getIntervalAtFret,
    getDiatonicChords,
    analyzeProgression,
    parseChord,
    parseProgression,
    NOTES,
    SCALES,
  };
}
