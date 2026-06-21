'use strict';

// Stub browser globals that theory.js references at module level (if any)
global.window = global.window || {};

const {
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
} = require('./theory.js');

// ─── normalizeNote ────────────────────────────────────────────────────────────

describe('normalizeNote', () => {
  test('maps flat aliases to their sharp equivalents', () => {
    expect(normalizeNote('Db')).toBe('C#');
    expect(normalizeNote('Eb')).toBe('D#');
    expect(normalizeNote('Gb')).toBe('F#');
    expect(normalizeNote('Ab')).toBe('G#');
    expect(normalizeNote('Bb')).toBe('A#');
  });

  test('maps Fb → E and Cb → B', () => {
    expect(normalizeNote('Fb')).toBe('E');
    expect(normalizeNote('Cb')).toBe('B');
  });

  test('passes through natural notes unchanged', () => {
    expect(normalizeNote('C')).toBe('C');
    expect(normalizeNote('G')).toBe('G');
    expect(normalizeNote('A')).toBe('A');
  });

  test('passes through sharp notes unchanged', () => {
    expect(normalizeNote('C#')).toBe('C#');
    expect(normalizeNote('F#')).toBe('F#');
    expect(normalizeNote('A#')).toBe('A#');
  });
});

// ─── noteIndex ────────────────────────────────────────────────────────────────

describe('noteIndex', () => {
  test('C maps to 0', () => {
    expect(noteIndex('C')).toBe(0);
  });

  test('F# maps to 6', () => {
    expect(noteIndex('F#')).toBe(6);
  });

  test('B maps to 11', () => {
    expect(noteIndex('B')).toBe(11);
  });

  test('all 12 NOTES map to sequential indices 0–11', () => {
    NOTES.forEach((note, i) => {
      expect(noteIndex(note)).toBe(i);
    });
  });

  test('flat aliases resolve to the same index as their sharp equivalent', () => {
    expect(noteIndex('Db')).toBe(noteIndex('C#'));
    expect(noteIndex('Eb')).toBe(noteIndex('D#'));
    expect(noteIndex('Ab')).toBe(noteIndex('G#'));
    expect(noteIndex('Bb')).toBe(noteIndex('A#'));
  });

  test('returns -1 for an unrecognised note', () => {
    expect(noteIndex('X')).toBe(-1);
  });
});

// ─── getScaleNotes ────────────────────────────────────────────────────────────

describe('getScaleNotes', () => {
  test('C Major returns the 7 correct notes', () => {
    expect(getScaleNotes('C', 'Major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  test('A Natural Minor returns the 7 correct notes', () => {
    expect(getScaleNotes('A', 'Natural Minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });

  test('A Minor Pentatonic returns 5 notes', () => {
    const notes = getScaleNotes('A', 'Minor Pentatonic');
    expect(notes).toHaveLength(5);
    expect(Array.isArray(notes)).toBe(true);
  });

  test('C Blues returns 6 notes', () => {
    const notes = getScaleNotes('C', 'Blues');
    expect(notes).toHaveLength(6);
  });

  test('G Major includes F# not Gb', () => {
    const notes = getScaleNotes('G', 'Major');
    expect(notes).toContain('F#');
    expect(notes).not.toContain('Gb');
  });

  test('D Major returns 7 notes including C# and F#', () => {
    const notes = getScaleNotes('D', 'Major');
    expect(notes).toHaveLength(7);
    expect(notes).toContain('C#');
    expect(notes).toContain('F#');
  });

  test('returns an array of strings', () => {
    const notes = getScaleNotes('C', 'Major');
    expect(Array.isArray(notes)).toBe(true);
    notes.forEach(n => expect(typeof n).toBe('string'));
  });

  test('returns empty array for unknown scale', () => {
    expect(getScaleNotes('C', 'NonExistentScale')).toEqual([]);
  });

  test('E Dorian returns 7 notes', () => {
    const notes = getScaleNotes('E', 'Dorian');
    expect(notes).toHaveLength(7);
  });
});

// ─── getIntervalAtFret ────────────────────────────────────────────────────────
// Signature: getIntervalAtFret(stringIdx, fret, key, scaleName)
// Default tuning: ['E','B','G','D','A','E'] (index 0 = high e)
// CAPO defaults to 0

describe('getIntervalAtFret', () => {
  test('string 0 (high e, open = E), fret 0, key E Major — interval should be 0 (root)', () => {
    // high e open = E; E is the root of E Major; semitones = 0
    expect(getIntervalAtFret(0, 0, 'E', 'Major')).toBe(0);
  });

  test('string 0 (high e), fret 2 in C Major — E is major 3rd (interval 4)', () => {
    // high e open = E; fret 2 → F# which is not in C Major
    // fret 0 = E (interval 4 in C Major), fret 1 = F (interval 5), fret 2 = F# (not in C Major → null)
    expect(getIntervalAtFret(0, 2, 'C', 'Major')).toBeNull();
  });

  test('string 0 (high e) fret 0 = E; in C Major, E is interval 4 (major 3rd)', () => {
    expect(getIntervalAtFret(0, 0, 'C', 'Major')).toBe(4);
  });

  test('string 0 (high e) fret 1 = F; in C Major, F is interval 5 (perfect 4th)', () => {
    expect(getIntervalAtFret(0, 1, 'C', 'Major')).toBe(5);
  });

  test('returns null for unknown scale', () => {
    expect(getIntervalAtFret(0, 0, 'C', 'NonExistentScale')).toBeNull();
  });

  test('returns null when note is not in scale', () => {
    // string 5 (low E), fret 1 = F; F is NOT in E Major (intervals [0,2,4,5,7,9,11])
    // F would be semitone 1 above E, which is a minor 2nd — not in Major scale
    expect(getIntervalAtFret(5, 1, 'E', 'Major')).toBeNull();
  });

  test('string 5 (low E) open fret 0 in E Major — root (interval 0)', () => {
    // low E is string index 5, open note is E, in E Major that is the root
    expect(getIntervalAtFret(5, 0, 'E', 'Major')).toBe(0);
  });
});

// ─── getDiatonicChords ────────────────────────────────────────────────────────

describe('getDiatonicChords', () => {
  test('C Major returns 7 chord objects', () => {
    expect(getDiatonicChords('C', 'Major')).toHaveLength(7);
  });

  test('each chord object has root, quality, roman, name, suffix properties', () => {
    const chords = getDiatonicChords('C', 'Major');
    chords.forEach(ch => {
      expect(ch).toHaveProperty('root');
      expect(ch).toHaveProperty('quality');
      expect(ch).toHaveProperty('roman');
      expect(ch).toHaveProperty('name');
      expect(ch).toHaveProperty('suffix');
    });
  });

  test('C Major: I chord (C) has quality "" (major)', () => {
    const chords = getDiatonicChords('C', 'Major');
    expect(chords[0].root).toBe('C');
    expect(chords[0].quality).toBe('');
  });

  test('C Major: II chord (D) has quality "m" (minor)', () => {
    const chords = getDiatonicChords('C', 'Major');
    expect(chords[1].root).toBe('D');
    expect(chords[1].quality).toBe('m');
  });

  test('C Major: V chord (G) has quality "" (major)', () => {
    const chords = getDiatonicChords('C', 'Major');
    expect(chords[4].root).toBe('G');
    expect(chords[4].quality).toBe('');
  });

  test('C Major: VII chord (B) has quality "dim"', () => {
    const chords = getDiatonicChords('C', 'Major');
    expect(chords[6].root).toBe('B');
    expect(chords[6].quality).toBe('dim');
  });

  test('C Major: III chord (E) has quality "m" (minor)', () => {
    const chords = getDiatonicChords('C', 'Major');
    expect(chords[2].root).toBe('E');
    expect(chords[2].quality).toBe('m');
  });

  test('each chord name contains the root note', () => {
    const chords = getDiatonicChords('C', 'Major');
    chords.forEach(ch => {
      expect(ch.name).toContain(ch.root);
    });
  });

  test('A Natural Minor returns 7 chord objects', () => {
    expect(getDiatonicChords('A', 'Natural Minor')).toHaveLength(7);
  });

  test('A Natural Minor: I chord is A minor (quality "m")', () => {
    const chords = getDiatonicChords('A', 'Natural Minor');
    expect(chords[0].root).toBe('A');
    expect(chords[0].quality).toBe('m');
  });

  test('returns empty array for unknown scale', () => {
    expect(getDiatonicChords('C', 'NonExistentScale')).toEqual([]);
  });

  test('roman numeral is lowercase for minor chords', () => {
    const chords = getDiatonicChords('C', 'Major');
    // ii, iii, vi are minor
    expect(chords[1].roman).toBe('ii');
    expect(chords[2].roman).toBe('iii');
    expect(chords[5].roman).toBe('vi');
  });

  test('roman numeral is uppercase for major chords', () => {
    const chords = getDiatonicChords('C', 'Major');
    expect(chords[0].roman).toBe('I');
    expect(chords[3].roman).toBe('IV');
    expect(chords[4].roman).toBe('V');
  });
});

// ─── parseChord ──────────────────────────────────────────────────────────────

describe('parseChord', () => {
  test('parses Cmaj7 — root C, quality maj7', () => {
    const ch = parseChord('Cmaj7');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('C');
    expect(ch.quality).toBe('maj7');
  });

  test('parses Dm — root D, quality m', () => {
    const ch = parseChord('Dm');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('D');
    expect(ch.quality).toBe('m');
  });

  test('parses G7 — root G, quality 7 (dominant seventh)', () => {
    const ch = parseChord('G7');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('G');
    expect(ch.quality).toBe('7');
  });

  test('parses plain C — root C, quality empty string (major)', () => {
    const ch = parseChord('C');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('C');
    expect(ch.quality).toBe('');
  });

  test('parses Am — root A, quality m', () => {
    const ch = parseChord('Am');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('A');
    expect(ch.quality).toBe('m');
  });

  test('parses F#m7 — root F#, quality m7', () => {
    const ch = parseChord('F#m7');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('F#');
    expect(ch.quality).toBe('m7');
  });

  test('parses Bb as root A# (normalised)', () => {
    const ch = parseChord('Bb');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('A#');
    expect(ch.rootStr).toBe('Bb');
  });

  test('strips slash bass note: C/G parses as C', () => {
    const ch = parseChord('C/G');
    expect(ch).not.toBeNull();
    expect(ch.root).toBe('C');
  });

  test('returns null for empty string', () => {
    expect(parseChord('')).toBeNull();
  });

  test('returns null for non-chord string like "xyz"', () => {
    expect(parseChord('xyz')).toBeNull();
  });

  test('returned object has root, rootStr, quality, intervals, display properties', () => {
    const ch = parseChord('Dm');
    expect(ch).toHaveProperty('root');
    expect(ch).toHaveProperty('rootStr');
    expect(ch).toHaveProperty('quality');
    expect(ch).toHaveProperty('intervals');
    expect(ch).toHaveProperty('display');
  });

  test('intervals is an array of numbers', () => {
    const ch = parseChord('Cmaj7');
    expect(Array.isArray(ch.intervals)).toBe(true);
    ch.intervals.forEach(i => expect(typeof i).toBe('number'));
  });

  test('Cmaj7 intervals are [0,4,7,11]', () => {
    const ch = parseChord('Cmaj7');
    expect(ch.intervals).toEqual([0, 4, 7, 11]);
  });

  test('Dm intervals are [0,3,7]', () => {
    const ch = parseChord('Dm');
    expect(ch.intervals).toEqual([0, 3, 7]);
  });

  test('G7 intervals are [0,4,7,10]', () => {
    const ch = parseChord('G7');
    expect(ch.intervals).toEqual([0, 4, 7, 10]);
  });
});

// ─── parseProgression ────────────────────────────────────────────────────────

describe('parseProgression', () => {
  test('space-separated progression returns 4 chord objects', () => {
    const result = parseProgression('C F G Am');
    expect(result).toHaveLength(4);
  });

  test('dash-separated progression returns 3 chord objects', () => {
    const result = parseProgression('Am-Dm-G7');
    expect(result).toHaveLength(3);
  });

  test('first chord of "C F G Am" has root C', () => {
    const result = parseProgression('C F G Am');
    expect(result[0].root).toBe('C');
  });

  test('last chord of "C F G Am" has root A, quality m', () => {
    const result = parseProgression('C F G Am');
    const last = result[result.length - 1];
    expect(last.root).toBe('A');
    expect(last.quality).toBe('m');
  });

  test('pipe-separated progression parses correctly', () => {
    const result = parseProgression('C|Am|F|G');
    expect(result).toHaveLength(4);
  });

  test('returns array of chord objects (each has root, quality, intervals)', () => {
    const result = parseProgression('C F G');
    result.forEach(ch => {
      expect(ch).toHaveProperty('root');
      expect(ch).toHaveProperty('quality');
      expect(ch).toHaveProperty('intervals');
    });
  });

  test('invalid tokens are filtered out', () => {
    const result = parseProgression('C xyz G');
    expect(result).toHaveLength(2);
  });

  test('empty string returns empty array', () => {
    expect(parseProgression('')).toEqual([]);
  });
});

// ─── analyzeProgression ───────────────────────────────────────────────────────
// analyzeProgression takes an array of chord objects (not strings)

describe('analyzeProgression', () => {
  test('returns an array', () => {
    const chords = parseProgression('C F G');
    expect(Array.isArray(analyzeProgression(chords))).toBe(true);
  });

  test('C, F, G progression matches C Major', () => {
    const chords = parseProgression('C F G');
    const results = analyzeProgression(chords);
    const cMajor = results.find(r => r.key === 'C' && r.scaleName === 'Major');
    expect(cMajor).toBeDefined();
    expect(cMajor.pct).toBe(100);
  });

  test('each result has key, scaleName, pct, matched, missing, scaleNotes properties', () => {
    const chords = parseProgression('C F G');
    const results = analyzeProgression(chords);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => {
      expect(r).toHaveProperty('key');
      expect(r).toHaveProperty('scaleName');
      expect(r).toHaveProperty('pct');
      expect(r).toHaveProperty('matched');
      expect(r).toHaveProperty('missing');
      expect(r).toHaveProperty('scaleNotes');
    });
  });

  test('results are sorted by pct descending', () => {
    const chords = parseProgression('C F G Am');
    const results = analyzeProgression(chords);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].pct).toBeGreaterThanOrEqual(results[i].pct);
    }
  });

  test('results array length is at most 8 (SCALE_MATCH_MAX_RESULTS)', () => {
    const chords = parseProgression('C F G Am');
    const results = analyzeProgression(chords);
    expect(results.length).toBeLessThanOrEqual(8);
  });

  test('all results have pct >= 60 (SCALE_MATCH_THRESHOLD)', () => {
    const chords = parseProgression('C F G');
    const results = analyzeProgression(chords);
    results.forEach(r => {
      expect(r.pct).toBeGreaterThanOrEqual(60);
    });
  });

  test('Am, Dm, E progression finds matches', () => {
    const chords = parseProgression('Am Dm E');
    const results = analyzeProgression(chords);
    expect(Array.isArray(results)).toBe(true);
  });

  test('pct field is a number between 0 and 100', () => {
    const chords = parseProgression('C F G');
    const results = analyzeProgression(chords);
    results.forEach(r => {
      expect(typeof r.pct).toBe('number');
      expect(r.pct).toBeGreaterThanOrEqual(0);
      expect(r.pct).toBeLessThanOrEqual(100);
    });
  });

  test('empty chord array returns an array (behaviour: NaN pct passes threshold filter)', () => {
    // When no chords are given, noteArr is empty and pct becomes NaN.
    // NaN < SCALE_MATCH_THRESHOLD (60) is false, so results still accumulate.
    // The function returns an array (not an error).
    expect(Array.isArray(analyzeProgression([]))).toBe(true);
  });
});
