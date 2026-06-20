'use strict';

// ===== STATE =====

const state = {
  // Scale explorer
  key: 'A',
  scaleName: 'Minor Pentatonic',
  displayMode: 'intervals', // 'intervals' | 'notes'
  hiddenIntervals: new Set(),
  numFrets: 15,
  focusFret: null,  // fret number of active position, or null = show all
  tuning: 'Standard',
  selectedDiatonicIdx: null,
  // Quiz
  quiz: { active: false, si: null, fret: null, interval: null, answered: false, correct: 0, total: 0, lastCorrect: null, chosen: null, choices: null },
  // Chord analyzer
  chordInput: '',
  parsedChords: [],
  matches: [],
  selectedMatch: null,
};

// ===== URL STATE SYNC =====

function updateHashFromState() {
  const p = new URLSearchParams();
  p.set('k', state.key);
  p.set('s', state.scaleName);
  p.set('m', state.displayMode);
  p.set('f', state.numFrets);
  if (state.focusFret !== null) p.set('pos', state.focusFret);
  if (state.tuning !== 'Standard') p.set('t', state.tuning);
  history.replaceState(null, '', '#' + p.toString());
}

function loadStateFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  const p = new URLSearchParams(hash);
  if (p.has('k') && NOTES.includes(p.get('k'))) state.key = p.get('k');
  if (p.has('s') && SCALES[p.get('s')]) state.scaleName = p.get('s');
  if (p.has('m') && ['intervals','notes'].includes(p.get('m'))) state.displayMode = p.get('m');
  if (p.has('f')) { const f = parseInt(p.get('f')); if (f >= 7 && f <= 22) state.numFrets = f; }
  if (p.has('pos')) { const pos = parseInt(p.get('pos')); if (!isNaN(pos)) state.focusFret = pos; }
  if (p.has('t') && TUNING_PRESETS[p.get('t')]) {
    state.tuning = p.get('t');
    const preset = TUNING_PRESETS[state.tuning];
    TUNING = preset.notes.slice();
    STRING_NAMES = preset.names.slice();
  }
}

function copyShareLink() {
  updateHashFromState();
  const btn = document.getElementById('share-btn');
  navigator.clipboard.writeText(window.location.href).then(() => {
    const old = btn.textContent;
    btn.textContent = '✓ Kopierad!';
    setTimeout(() => { btn.textContent = old; }, 2000);
  }).catch(() => { prompt('Kopiera länken:', window.location.href); });
}

function goToScale(key, scaleName) {
  state.key = key;
  state.scaleName = scaleName;
  state.hiddenIntervals.clear();
  state.focusFret = null;
  state.selectedDiatonicIdx = null;
  document.getElementById('key-select').value = key;
  document.getElementById('scale-select').value = scaleName;
  if (state.quiz.active) {
    state.quiz.answered = false;
    state.quiz.chosen = null;
    state.quiz.choices = null;
    nextQuizQuestion();
  } else {
    renderScaleExplorer();
  }
  updateHashFromState();
}

// ===== CHORD DIAGRAM =====

function renderChordDiagramSVG(name, voicing) {
  const STR = 6, FRETS = 5, SX = 16, SY = 32, SW = 11, FH = 13;
  const W = SX * 2 + SW * (STR - 1);
  const H = SY + FH * FRETS + 16;

  const playedFrets = voicing.filter(f => f > 0);
  const minF = playedFrets.length ? Math.min(...playedFrets) : 0;
  const startFret = minF > 1 ? minF : 1;
  const showNut = startFret === 1;
  const GY = SY + (showNut ? 3 : 0);

  let o = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
  o += `<text x="${W/2}" y="15" text-anchor="middle" fill="#e2e6f3" font-size="11" font-weight="700" font-family="monospace">${name}</text>`;
  if (showNut) {
    o += `<rect x="${SX}" y="${SY}" width="${SW*(STR-1)}" height="3" fill="#c8a84b" rx="1"/>`;
  } else {
    o += `<text x="${SX-3}" y="${GY + FH*0.55}" text-anchor="end" fill="#6b7599" font-size="8">${startFret}fr</text>`;
  }
  for (let f = 0; f <= FRETS; f++) {
    o += `<line x1="${SX}" y1="${GY+f*FH}" x2="${SX+SW*(STR-1)}" y2="${GY+f*FH}" stroke="#2a3050" stroke-width="1"/>`;
  }
  for (let s = 0; s < STR; s++) {
    o += `<line x1="${SX+s*SW}" y1="${GY}" x2="${SX+s*SW}" y2="${GY+FRETS*FH}" stroke="#3a4060" stroke-width="${(0.8+s*0.13).toFixed(2)}"/>`;
  }
  for (let s = 0; s < STR; s++) {
    const x = SX + s * SW;
    const f = voicing[s];
    if (f < 0) {
      o += `<text x="${x}" y="${SY-5}" text-anchor="middle" fill="#ef4444" font-size="10" font-weight="700">×</text>`;
    } else if (f === 0) {
      o += `<circle cx="${x}" cy="${SY-9}" r="3.5" fill="none" stroke="#6b7599" stroke-width="1.3"/>`;
    } else {
      const rf = f - startFret + 1;
      o += `<circle cx="${x}" cy="${GY+(rf-0.5)*FH}" r="5" fill="#6366f1"/>`;
    }
  }
  o += `</svg>`;
  return o;
}

function selectDiatonicChord(i) {
  state.selectedDiatonicIdx = state.selectedDiatonicIdx === i ? null : i;
  buildScaleInfo(state.key, state.scaleName);
}

// ===== FRETBOARD BUILDER =====

function buildFretboard(containerId, key, scaleName, displayMode, hiddenIntervals, numFrets, focusFret = null) {
  const container = document.getElementById(containerId);
  const scale = SCALES[scaleName];
  if (!scale) return;

  const rows = [];

  // String rows (index 0 = high e, index 5 = low E)
  for (let s = 0; s < 6; s++) {
    const sw = STRING_THICKNESS[s];
    let row = `<div class="string-row" style="--sw:${sw}px">`;
    row += `<div class="string-label">${STRING_NAMES[s]}</div>`;

    // Open string cell (nut)
    const openNote = noteAtFret(s, 0);
    const openInterval = getIntervalAtFret(s, 0, key, scaleName);
    row += buildCell(openNote, openInterval, displayMode, hiddenIntervals, true, s, 0, focusFret);

    // Frets 1 – numFrets
    for (let f = 1; f <= numFrets; f++) {
      const note = noteAtFret(s, f);
      const interval = getIntervalAtFret(s, f, key, scaleName);
      row += buildCell(note, interval, displayMode, hiddenIntervals, false, s, f, focusFret);
    }

    row += `</div>`;
    rows.push(row);
  }

  // Fret position markers (dots)
  const MARKERS = { 3: '●', 5: '●', 7: '●', 9: '●', 12: '●●', 15: '●' };
  let markers = `<div class="fret-markers">`;
  markers += `<div class="marker-spacer"></div><div class="marker-nut"></div>`;
  for (let f = 1; f <= numFrets; f++) {
    markers += `<div class="marker-cell">${MARKERS[f] || ''}</div>`;
  }
  markers += `</div>`;

  // Fret numbers
  let nums = `<div class="fret-numbers">`;
  nums += `<div class="num-spacer"></div><div class="num-nut"><span class="fret-num" style="width:42px">○</span></div>`;
  for (let f = 1; f <= numFrets; f++) {
    const isActiveFret = focusFret !== null && f >= Math.max(0, focusFret - 1) && f <= focusFret + 4;
    nums += `<div class="${isActiveFret ? 'fret-num active-fret-num' : 'fret-num'}">${f}</div>`;
  }
  nums += `</div>`;

  container.innerHTML = `
    <div class="fretboard">
      <div class="string-rows">${rows.join('')}</div>
      ${markers}
      ${nums}
    </div>`;
}

function buildCell(note, interval, displayMode, hiddenIntervals, isNut, stringIdx, fret, focusFret) {
  const cellClass = `fret-cell${isNut ? ' nut' : ''}`;
  let inner = '';

  if (interval !== null && !hiddenIntervals.has(interval)) {
    const info = INTERVAL_INFO[interval];
    const isQuizTarget = state.quiz.active && stringIdx === state.quiz.si && fret === state.quiz.fret;
    const label = isQuizTarget ? '?' : (displayMode === 'intervals' ? info.name : note);
    const bg = isQuizTarget ? '#ffffff' : info.color;
    const fg = isQuizTarget ? '#000000' : info.text;

    let inWindow = true;
    if (focusFret !== null) {
      const lo = Math.max(0, focusFret - 1);
      const hi = focusFret + 4;
      inWindow = fret >= lo && fret <= hi;
    }

    const isRoot = interval === 0;
    const isActiveFocus = isRoot && focusFret === fret && !isQuizTarget;
    const dotClass = [
      'note-dot',
      isRoot && !isQuizTarget ? 'root-dot' : '',
      !inWindow ? 'dimmed' : '',
      isActiveFocus ? 'focus-active' : '',
      isQuizTarget ? 'quiz-target' : '',
    ].filter(Boolean).join(' ');

    const onclick = `playNote(${stringIdx},${fret})`;
    const tip = isQuizTarget ? 'Vilket intervall är detta?' : `${note} — ${info.full}`;

    inner = `<div class="${dotClass}"
      data-si="${stringIdx}" data-fret="${fret}"
      style="background:${bg};color:${fg}"
      onclick="${onclick}"
      title="${tip}">${label}</div>`;
  }

  return `<div class="${cellClass}">${inner}</div>`;
}

// ===== INTERVAL LEGEND =====

function buildLegend(scaleName) {
  const scale = SCALES[scaleName];
  if (!scale) return;
  const container = document.getElementById('interval-legend');

  let html = `<div class="legend">
    <span class="legend-title">Intervaller</span>`;

  scale.intervals.forEach(interval => {
    const info = INTERVAL_INFO[interval];
    const hidden = state.hiddenIntervals.has(interval);
    html += `<div class="interval-chip${hidden ? ' hidden' : ''}" data-interval="${interval}"
      title="${info.full}" onclick="toggleInterval(${interval})">
      <span class="chip-dot" style="background:${info.color};color:${info.text}">${info.name}</span>
      <span style="color:${hidden ? 'var(--muted)' : 'var(--text)'}">${info.full}</span>
    </div>`;
  });

  html += `<button class="legend-reset" onclick="resetIntervals()">Visa alla</button>`;
  html += `</div>`;
  container.innerHTML = html;
}

// ===== SCALE INFO PANEL =====

function buildScaleInfo(key, scaleName) {
  const container = document.getElementById('scale-info');
  const scale = SCALES[scaleName];
  if (!scale) return;

  const scaleNotes = getScaleNotes(key, scaleName);
  const diatonic = getDiatonicChords(key, scaleName);

  // Notes in scale
  const notePills = scaleNotes.map((note, i) => {
    const interval = scale.intervals[i];
    const info = INTERVAL_INFO[interval];
    return `<span class="note-pill" style="background:${info.color}22;color:${info.color};border:1px solid ${info.color}55">${note}</span>`;
  }).join('');

  // Diatonic chords
  const chordChips = diatonic.slice(0, 7).map((c, i) => {
    const sel = state.selectedDiatonicIdx === i ? ' selected' : '';
    return `<div class="chord-chip${sel}" onclick="selectDiatonicChord(${i})" title="Visa ackorddiagram">
      <span>${c.root}${c.quality === 'm' ? 'm' : c.quality === 'dim' ? '°' : c.quality === 'aug' ? '+' : ''}</span>
      <span class="roman">${c.roman}${c.quality === 'dim' ? '°' : c.quality === 'aug' ? '+' : ''}</span>
    </div>`;
  }).join('');

  // Chord diagram for selected chord
  let diagramHTML = '';
  if (state.selectedDiatonicIdx !== null && diatonic[state.selectedDiatonicIdx]) {
    const cd = diatonic[state.selectedDiatonicIdx];
    const q = cd.quality || '';
    const ivl = (CHORD_INTERVALS[q] || [0,4,7]).slice(0, 3);
    const r = noteIndex(cd.root);
    const ns = [...new Set(ivl.map(i => NOTES[(r + i) % 12]))];
    const dn = cd.root + (q === 'm' ? 'm' : q === 'dim' ? '°' : q === 'aug' ? '+' : '');
    const voicing = computeChordVoicing(ns, cd.root);
    const noteLabels = ns.join(' · ');
    diagramHTML = `<div class="chord-diagram-panel">
      ${renderChordDiagramSVG(dn, voicing)}
      <div class="chord-diagram-info">
        <div class="chord-diagram-name">${dn}</div>
        <div class="chord-diagram-notes">${noteLabels}</div>
        <div class="chord-diagram-frets">${voicing.map((f,i) => f < 0 ? 'x' : f).join(' · ')}</div>
      </div>
    </div>`;
  }

  const rel = getRelativeScale(key, scaleName);
  const relCard = rel ? `
    <div class="info-card">
      <h3>Relativskala</h3>
      <p style="font-size:0.82rem;color:var(--muted);margin-bottom:12px">
        ${scaleName === 'Major'
          ? 'Relativmoll delar samma noter men börjar på den 6:e graden.'
          : 'Relativdur delar samma noter men börjar på den 3:e graden.'}
      </p>
      <button class="rel-scale-btn" onclick="goToScale('${rel.key}','${rel.scaleName}')">
        → ${rel.key} ${rel.scaleName}
      </button>
    </div>` : '';

  container.innerHTML = `
    <div class="scale-info">
      <div class="info-card">
        <h3>Beskrivning</h3>
        <p>${scale.desc}</p>
        <div style="margin-top:10px;font-size:0.78rem;color:var(--muted)">
          <strong>Används i:</strong> ${scale.use}
        </div>
      </div>
      <div class="info-card">
        <h3>Noterna i ${key} ${scaleName}</h3>
        <div class="note-pills">${notePills}</div>
        <div style="margin-top:12px;font-size:0.8rem;color:var(--muted)">
          <strong>Formel:</strong> <span style="font-family:monospace;color:var(--text)">${scale.formula}</span>
          &nbsp;(H=helton, ½=halvton, 1½=1½ton)
        </div>
        <div style="margin-top:4px;font-size:0.78rem;color:var(--muted)">
          <strong>Kategori:</strong> ${scale.category}
        </div>
      </div>
      ${diatonic.length > 0 ? `
      <div class="info-card">
        <h3>Diatoniska ackord <span style="font-size:0.68rem;color:var(--muted);font-weight:400">— klicka för diagram</span></h3>
        <div class="chord-row">${chordChips}</div>
        ${diagramHTML}
      </div>` : ''}
      ${relCard}
    </div>`;
}

// ===== POSITION BUTTONS =====

function buildPositionButtons(key, scaleName, numFrets) {
  const container = document.getElementById('position-btns');
  if (!container) return;

  const positions = getRootPositions(key, scaleName, numFrets);
  const scalePlayBtn = `<button id="play-scale-btn" class="play-scale-btn" onclick="playScale()">${_scaleIsPlaying ? '⏹ Stopp' : '▶ Spela skala'}</button>`;

  if (positions.length === 0) {
    container.innerHTML = `<div class="position-row">${scalePlayBtn}</div>`;
    return;
  }

  const btns = positions.map((f, i) => {
    const active = state.focusFret === f ? ' active' : '';
    const label = f === 0 ? 'öppen' : `band ${f}`;
    return `<button class="pos-btn${active}" onclick="setFocusFret(${f})">Pos ${i + 1}<span class="pos-fret">${label}</span></button>`;
  }).join('');

  const clearBtn = state.focusFret !== null
    ? `<button class="pos-btn pos-clear" onclick="clearFocus()">Visa hela halsen</button>` : '';

  container.innerHTML = `<div class="position-row"><span class="position-label">Positioner</span>${btns}${clearBtn}${scalePlayBtn}</div>`;
}

function clearFocus() {
  state.focusFret = null;
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, null);
  buildPositionButtons(state.key, state.scaleName, state.numFrets);
  updateHashFromState();
}

// ===== SCALE EXPLORER RENDER =====

function renderScaleExplorer() {
  if (_scaleIsPlaying) stopScale();
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
  buildLegend(state.scaleName);
  buildPositionButtons(state.key, state.scaleName, state.numFrets);
  buildScaleInfo(state.key, state.scaleName);
  buildQuizPanel();
}

// ===== QUIZ MODE =====

function toggleQuiz() {
  state.quiz.active = !state.quiz.active;
  if (state.quiz.active) {
    state.quiz.correct = 0;
    state.quiz.total = 0;
    state.quiz.answered = false;
    state.quiz.chosen = null;
    state.quiz.choices = null;
    nextQuizQuestion();
  } else {
    state.quiz.si = null;
    state.quiz.fret = null;
    state.quiz.interval = null;
    state.quiz.answered = false;
    state.quiz.chosen = null;
    state.quiz.choices = null;
    renderScaleExplorer();
  }
}

function nextQuizQuestion() {
  const scale = SCALES[state.scaleName];
  if (!scale) return;

  const lo = state.focusFret !== null ? Math.max(0, state.focusFret - 1) : 0;
  const hi = state.focusFret !== null ? state.focusFret + 4 : state.numFrets;

  const candidates = [];
  for (let s = 0; s < 6; s++) {
    for (let f = lo; f <= Math.min(hi, state.numFrets); f++) {
      const interval = getIntervalAtFret(s, f, state.key, state.scaleName);
      if (interval !== null && !state.hiddenIntervals.has(interval)) {
        if (!(s === state.quiz.si && f === state.quiz.fret)) {
          candidates.push({ si: s, fret: f, interval });
        }
      }
    }
  }

  if (!candidates.length) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  state.quiz.si = pick.si;
  state.quiz.fret = pick.fret;
  state.quiz.interval = pick.interval;
  state.quiz.answered = false;
  state.quiz.lastCorrect = null;
  state.quiz.chosen = null;

  const allIntervals = scale.intervals.filter(i => !state.hiddenIntervals.has(i));
  const wrong = allIntervals.filter(i => i !== pick.interval).sort(() => Math.random() - 0.5).slice(0, 3);
  state.quiz.choices = [...wrong, pick.interval].sort(() => Math.random() - 0.5);

  renderScaleExplorer();
}

function answerQuiz(chosenInterval) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;
  state.quiz.chosen = chosenInterval;
  state.quiz.total++;
  state.quiz.lastCorrect = chosenInterval === state.quiz.interval;
  if (state.quiz.lastCorrect) state.quiz.correct++;
  buildQuizPanel();
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
}

function buildQuizPanel() {
  const container = document.getElementById('quiz-panel');
  if (!container) return;

  if (!state.quiz.active) {
    container.innerHTML = '';
    const btn = document.getElementById('quiz-btn');
    if (btn) btn.classList.remove('active');
    return;
  }

  // If the quiz target is no longer valid for the current scale, pick a fresh question
  if (state.quiz.interval !== null) {
    const current = getIntervalAtFret(state.quiz.si, state.quiz.fret, state.key, state.scaleName);
    if (current !== state.quiz.interval) {
      nextQuizQuestion();
      return;
    }
  }

  const btn = document.getElementById('quiz-btn');
  if (btn) btn.classList.add('active');

  const choices = state.quiz.choices || [];
  const { correct, total, lastCorrect, chosen, interval: correctInterval, answered } = state.quiz;
  const pct = total > 0 ? Math.round(100 * correct / total) : null;
  const scoreStr = total > 0 ? `${correct}/${total}${pct !== null ? ` (${pct}%)` : ''}` : '—';

  const choicesHTML = choices.map(i => {
    const info = INTERVAL_INFO[i];
    let cls = 'quiz-choice';
    if (answered) {
      if (i === correctInterval) cls += ' correct';
      else if (i === chosen) cls += ' wrong';
      else cls += ' dimmed';
    }
    const action = answered ? 'disabled' : `onclick="answerQuiz(${i})"`;
    return `<button class="${cls}" ${action}>
      <span class="quiz-dot" style="background:${info.color};color:${info.text}">${info.name}</span>
      <span class="quiz-choice-label">${info.full}</span>
    </button>`;
  }).join('');

  const feedbackHTML = answered ? `
    <div class="quiz-feedback ${lastCorrect ? 'ok' : 'fail'}">
      ${lastCorrect ? '✓ Rätt!' : `✗ Fel — rätt svar: ${INTERVAL_INFO[correctInterval].full}`}
      <button class="quiz-next-btn" onclick="nextQuizQuestion()">Nästa →</button>
    </div>` : '';

  container.innerHTML = `
    <div class="quiz-panel-inner">
      <div class="quiz-header">
        <span class="quiz-title">🧠 Intervallquiz</span>
        <span class="quiz-score">${scoreStr}</span>
        <button class="quiz-close" onclick="toggleQuiz()" title="Avsluta quiz">✕</button>
      </div>
      <p class="quiz-question">Vilket intervall är det markerade notet <strong>(?)</strong>?</p>
      <div class="quiz-choices">${choicesHTML}</div>
      ${feedbackHTML}
    </div>`;
}

// ===== SCALE PLAYBACK =====

const _scaleTimeouts = [];
let _scaleIsPlaying = false;

function playScale() {
  if (_scaleIsPlaying) { stopScale(); return; }

  const lo = state.focusFret !== null ? Math.max(0, state.focusFret - 1) : 0;
  const hi = state.focusFret !== null ? state.focusFret + 4 : Math.min(state.numFrets, 12);

  // Collect all visible scale notes in the window
  const raw = [];
  for (let s = 0; s < 6; s++) {
    for (let f = lo; f <= hi; f++) {
      const interval = getIntervalAtFret(s, f, state.key, state.scaleName);
      if (interval !== null && !state.hiddenIntervals.has(interval)) {
        raw.push({ si: s, fret: f, midi: STRING_MIDI_BASE[s] + f });
      }
    }
  }

  // Sort by pitch, deduplicate MIDI notes (prefer higher si = cleaner sounding open strings)
  raw.sort((a, b) => a.midi - b.midi || b.si - a.si);
  const seenMidi = new Set();
  const notes = raw.filter(n => { if (seenMidi.has(n.midi)) return false; seenMidi.add(n.midi); return true; });
  if (!notes.length) return;

  // Ascending then descending (don't repeat the top note)
  const sequence = [...notes, ...[...notes].slice(0, -1).reverse()];

  _scaleIsPlaying = true;
  _syncScaleBtn();

  const stepMs = 220;
  const ctx = getAudioCtx();
  const t0 = ctx.currentTime + 0.05;

  sequence.forEach(({ si, fret }, i) => {
    playNoteAtTime(si, fret, t0 + i * stepMs / 1000, stepMs / 1000 * 0.85, 0.22);
    _scaleTimeouts.push(setTimeout(() => highlightScaleNote(si, fret, true),  i * stepMs + 50));
    _scaleTimeouts.push(setTimeout(() => highlightScaleNote(si, fret, false), i * stepMs + stepMs * 0.78));
  });

  _scaleTimeouts.push(setTimeout(() => {
    _scaleIsPlaying = false;
    _syncScaleBtn();
  }, sequence.length * stepMs + 200));
}

function stopScale() {
  _scaleIsPlaying = false;
  _scaleTimeouts.splice(0).forEach(clearTimeout);
  document.querySelectorAll('.note-dot.scale-active').forEach(el => el.classList.remove('scale-active'));
  _syncScaleBtn();
}

function _syncScaleBtn() {
  const btn = document.getElementById('play-scale-btn');
  if (btn) btn.textContent = _scaleIsPlaying ? '⏹ Stopp' : '▶ Spela skala';
}

function highlightScaleNote(si, fret, on) {
  const el = document.querySelector(`.note-dot[data-si="${si}"][data-fret="${fret}"]`);
  if (el) el.classList.toggle('scale-active', on);
}

// ===== CHORD ANALYZER =====

function renderChordAnalyzer() {
  const input = state.chordInput.trim();
  const resultsEl = document.getElementById('chord-results');

  if (!input) {
    resultsEl.innerHTML = `<div class="empty-state">
      <div class="big-icon">🎵</div>
      <p>Ange en ackordföljd ovan för att analysera vilka skalor som passar.</p>
    </div>`;
    return;
  }

  const chords = parseProgression(input);
  if (chords.length === 0) {
    resultsEl.innerHTML = `<div class="no-results">Inga giltiga ackord hittades. Försök med t.ex. "Am G F E".</div>`;
    return;
  }

  state.parsedChords = chords;
  const matches = analyzeProgression(chords);
  state.matches = matches;

  if (!state.selectedMatch && matches.length > 0) {
    state.selectedMatch = 0;
  }

  // Parsed chords display
  const parsedHTML = chords.map(c =>
    `<span class="parsed-chord">${c.display}</span>`
  ).join('');

  // Match cards
  let matchHTML = '';
  if (matches.length === 0) {
    matchHTML = `<div class="no-results">Ingen klar skalpassning hittades. Prova att ta bort kromatiska ackord.</div>`;
  } else {
    matchHTML = `<div class="match-results">` + matches.map((m, i) => {
      const pctClass = m.pct === 100 ? 'perfect' : m.pct >= 80 ? 'great' : 'good';
      const noteHTML = m.matched.map(n => `<span class="match-note hit">${n}</span>`).join('')
        + m.missing.map(n => `<span class="match-note miss">${n}</span>`).join('');
      const missingWarn = m.missing.length > 0
        ? `<div class="missing-warning">⚠ ${m.missing.join(', ')} saknas i skalan</div>` : '';
      const sel = state.selectedMatch === i ? ' selected' : '';

      return `<div class="match-card${sel}" onclick="selectMatch(${i})">
        <div class="match-header">
          <div class="match-name">${m.key} ${m.scaleName}</div>
          <div class="match-pct ${pctClass}">${m.pct}%</div>
        </div>
        <div class="match-category">${SCALES[m.scaleName].category} · ${SCALES[m.scaleName].use}</div>
        <div class="match-notes">${noteHTML}</div>
        ${missingWarn}
      </div>`;
    }).join('') + `</div>`;
  }

  // Fretboard preview of selected match
  let previewHTML = '';
  if (matches.length > 0 && state.selectedMatch !== null) {
    const m = matches[state.selectedMatch];
    previewHTML = `
      <div class="info-card" style="margin-bottom:16px">
        <div class="preview-header">Vald skala på gitarrhalsen — ${m.key} ${m.scaleName}</div>
        <div style="font-size:0.82rem;color:var(--muted);margin-bottom:14px">${SCALES[m.scaleName].desc}</div>
        <div class="fretboard-outer" style="margin:0">
          <div id="analyzer-fretboard"></div>
        </div>
      </div>`;
  }

  const wasPlaying = _isPlaying;
  if (wasPlaying) stopProgression();

  resultsEl.innerHTML = `
    <div class="player-bar">
      <div class="player-chords">
        <span class="player-label">Ackord</span>
        <div class="parsed-chords">${parsedHTML}</div>
      </div>
      <div class="player-controls">
        <label class="player-label">BPM</label>
        <div class="tempo-row">
          <button class="tempo-btn" onclick="adjustTempo(-5)">−</button>
          <input id="tempo-input" type="number" value="80" min="40" max="220" class="tempo-input">
          <button class="tempo-btn" onclick="adjustTempo(5)">+</button>
        </div>
        <button id="play-btn" class="play-btn" onclick="playProgression()">▶ Spela</button>
      </div>
    </div>
    ${matchHTML}
    ${previewHTML}`;

  if (matches.length > 0 && state.selectedMatch !== null) {
    const m = matches[state.selectedMatch];
    buildFretboard('analyzer-fretboard', m.key, m.scaleName, 'intervals', new Set(), 12);
  }
}

// ===== PROGRESSION PLAYER =====

const _playTimeouts = [];
let _isPlaying = false;

function playProgression() {
  if (_isPlaying) { stopProgression(); return; }
  const chords = state.parsedChords;
  if (!chords.length) return;

  _isPlaying = true;
  _syncPlayBtn();

  const bpm = Math.max(40, Math.min(220, parseInt(document.getElementById('tempo-input')?.value) || 80));
  const secPerChord = (60 / bpm) * 4;  // 4 beats per chord

  const ctx = getAudioCtx();
  const t0 = ctx.currentTime + 0.08;

  chords.forEach((chord, i) => {
    const t = t0 + i * secPerChord;
    strum(chordNotes(chord), t, secPerChord * 0.88);
    _playTimeouts.push(setTimeout(() => highlightPlayingChord(i), i * secPerChord * 1000 + 80));
  });

  _playTimeouts.push(setTimeout(() => {
    _isPlaying = false;
    _syncPlayBtn();
    highlightPlayingChord(null);
  }, chords.length * secPerChord * 1000 + 200));
}

function stopProgression() {
  _isPlaying = false;
  _playTimeouts.splice(0).forEach(clearTimeout);
  _syncPlayBtn();
  highlightPlayingChord(null);
}

function _syncPlayBtn() {
  const btn = document.getElementById('play-btn');
  if (btn) btn.textContent = _isPlaying ? '⏹ Stopp' : '▶ Spela';
}

function highlightPlayingChord(idx) {
  document.querySelectorAll('.parsed-chord').forEach((el, i) => {
    el.classList.toggle('playing', i === idx);
  });
}

// ===== EVENT HANDLERS =====

function toggleInterval(interval) {
  if (state.hiddenIntervals.has(interval)) {
    state.hiddenIntervals.delete(interval);
  } else {
    state.hiddenIntervals.add(interval);
  }
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
  buildLegend(state.scaleName);
}

function resetIntervals() {
  state.hiddenIntervals.clear();
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
  buildLegend(state.scaleName);
}

function setFocusFret(fret) {
  state.focusFret = state.focusFret === fret ? null : fret;
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
  buildPositionButtons(state.key, state.scaleName, state.numFrets);
  updateHashFromState();
}

function selectMatch(i) {
  state.selectedMatch = i;
  renderChordAnalyzer();
}

function adjustTempo(delta) {
  const input = document.getElementById('tempo-input');
  if (!input) return;
  input.value = Math.max(40, Math.min(220, (parseInt(input.value) || 80) + delta));
}

function setPreset(val) {
  document.getElementById('chord-input').value = val;
  state.chordInput = val;
  state.selectedMatch = null;
  renderChordAnalyzer();
}

// ===== INIT =====

function initSelects() {
  // Key select
  const keyEl = document.getElementById('key-select');
  NOTES.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = n;
    if (n === state.key) opt.selected = true;
    keyEl.appendChild(opt);
  });
  keyEl.addEventListener('change', e => {
    state.key = e.target.value;
    state.focusFret = null;
    state.selectedDiatonicIdx = null;
    renderScaleExplorer();
    updateHashFromState();
  });

  // Scale select
  const scaleEl = document.getElementById('scale-select');
  Object.keys(SCALES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    opt.dataset.cat = SCALES[name].category;
    if (name === state.scaleName) opt.selected = true;
    scaleEl.appendChild(opt);
  });
  scaleEl.addEventListener('change', e => {
    state.scaleName = e.target.value;
    state.hiddenIntervals.clear();
    state.focusFret = null;
    state.selectedDiatonicIdx = null;
    renderScaleExplorer();
    updateHashFromState();
  });

  // Display mode toggle — sync initial active state from state.displayMode
  document.querySelectorAll('.display-toggle button').forEach(btn => {
    if (btn.dataset.mode === state.displayMode) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.addEventListener('click', () => {
      document.querySelectorAll('.display-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.displayMode = btn.dataset.mode;
      buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
      updateHashFromState();
    });
  });

  // Fret range — sync initial value from state
  const fretSlider = document.getElementById('fret-range');
  const fretLabel = document.getElementById('fret-count');
  fretSlider.value = state.numFrets;
  fretLabel.textContent = state.numFrets;
  fretSlider.addEventListener('input', () => {
    state.numFrets = parseInt(fretSlider.value);
    fretLabel.textContent = state.numFrets;
    buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
    updateHashFromState();
  });

  // Tuning select
  const tuningEl = document.getElementById('tuning-select');
  Object.keys(TUNING_PRESETS).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name + ' (' + TUNING_PRESETS[name].names.join(' ') + ')';
    if (name === state.tuning) opt.selected = true;
    tuningEl.appendChild(opt);
  });
  tuningEl.addEventListener('change', e => {
    state.tuning = e.target.value;
    const preset = TUNING_PRESETS[state.tuning];
    TUNING = preset.notes.slice();
    STRING_NAMES = preset.names.slice();
    state.focusFret = null;
    renderScaleExplorer();
    updateHashFromState();
  });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (_isPlaying) stopProgression();
      if (_scaleIsPlaying) stopScale();
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tab).classList.add('active');
    });
  });
}

function initChordAnalyzer() {
  const input = document.getElementById('chord-input');
  input.addEventListener('input', e => {
    state.chordInput = e.target.value;
    state.selectedMatch = null;
    renderChordAnalyzer();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') renderChordAnalyzer();
  });

  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setPreset(btn.dataset.preset));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadStateFromHash();
  initTabs();
  initSelects();
  initChordAnalyzer();
  renderScaleExplorer();
  renderChordAnalyzer();
});
