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
  // Chord analyzer
  chordInput: '',
  parsedChords: [],
  matches: [],
  selectedMatch: null,
};

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
    row += buildCell(openNote, openInterval, displayMode, hiddenIntervals, true, 0, focusFret);

    // Frets 1 – numFrets
    for (let f = 1; f <= numFrets; f++) {
      const note = noteAtFret(s, f);
      const interval = getIntervalAtFret(s, f, key, scaleName);
      row += buildCell(note, interval, displayMode, hiddenIntervals, false, f, focusFret);
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
    const activeClass = focusFret !== null && f >= Math.max(0, focusFret - 1) && f <= focusFret + 4 ? ' class="fret-num active-fret-num"' : '';
    nums += `<div class="fret-num"${activeClass}>${f}</div>`;
  }
  nums += `</div>`;

  container.innerHTML = `
    <div class="fretboard">
      <div class="string-rows">${rows.join('')}</div>
      ${markers}
      ${nums}
    </div>`;
}

function buildCell(note, interval, displayMode, hiddenIntervals, isNut, fret, focusFret) {
  const cellClass = `fret-cell${isNut ? ' nut' : ''}`;
  let inner = '';

  if (interval !== null && !hiddenIntervals.has(interval)) {
    const info = INTERVAL_INFO[interval];
    const label = displayMode === 'intervals' ? info.name : note;

    // Determine if this dot is inside the active position window
    let inWindow = true;
    if (focusFret !== null) {
      const lo = Math.max(0, focusFret - 1);
      const hi = focusFret + 4;
      inWindow = fret >= lo && fret <= hi;
    }

    const isRoot = interval === 0;
    const isActiveFocus = isRoot && focusFret === fret;
    let dotClass = `note-dot${isRoot ? ' root-dot' : ''}${!inWindow ? ' dimmed' : ''}${isActiveFocus ? ' focus-active' : ''}`;
    const clickAttr = isRoot ? ` onclick="setFocusFret(${fret})" title="${note} — ${info.full} · Klicka för att isolera position"` : ` title="${note} — ${info.full}"`;

    inner = `<div class="${dotClass}"
      style="background:${info.color};color:${info.text}"
      ${clickAttr}>${label}</div>`;
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
  const chordChips = diatonic.slice(0, 7).map(c => `
    <div class="chord-chip">
      <span>${c.name}</span>
      <span class="roman">${c.roman}${c.suffix}</span>
    </div>`).join('');

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
        <h3>Diatoniska ackord</h3>
        <p style="font-size:0.78rem;color:var(--muted);margin-bottom:10px">Ackord som naturligt tillhör skalan</p>
        <div class="chord-row">${chordChips}</div>
      </div>` : ''}
    </div>`;
}

// ===== SCALE EXPLORER RENDER =====

function renderScaleExplorer() {
  buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
  buildLegend(state.scaleName);
  buildScaleInfo(state.key, state.scaleName);
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

  resultsEl.innerHTML = `
    <div style="margin-bottom:12px">
      <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Tolkade ackord</div>
      <div class="parsed-chords">${parsedHTML}</div>
    </div>
    ${matchHTML}
    ${previewHTML}`;

  if (matches.length > 0 && state.selectedMatch !== null) {
    const m = matches[state.selectedMatch];
    buildFretboard('analyzer-fretboard', m.key, m.scaleName, 'intervals', new Set(), 12);
  }
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
}

function selectMatch(i) {
  state.selectedMatch = i;
  renderChordAnalyzer();
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
    renderScaleExplorer();
  });

  // Scale select
  const scaleEl = document.getElementById('scale-select');
  Object.keys(SCALES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    const cat = SCALES[name].category;
    opt.textContent = `${name}`;
    opt.dataset.cat = cat;
    if (name === state.scaleName) opt.selected = true;
    scaleEl.appendChild(opt);
  });
  scaleEl.addEventListener('change', e => {
    state.scaleName = e.target.value;
    state.hiddenIntervals.clear();
    state.focusFret = null;
    renderScaleExplorer();
  });

  // Display mode toggle
  document.querySelectorAll('.display-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.display-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.displayMode = btn.dataset.mode;
      buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
    });
  });

  // Fret range
  const fretSlider = document.getElementById('fret-range');
  const fretLabel = document.getElementById('fret-count');
  fretSlider.addEventListener('input', () => {
    state.numFrets = parseInt(fretSlider.value);
    fretLabel.textContent = state.numFrets;
    buildFretboard('fretboard', state.key, state.scaleName, state.displayMode, state.hiddenIntervals, state.numFrets, state.focusFret);
  });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
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
  initTabs();
  initSelects();
  initChordAnalyzer();
  renderScaleExplorer();
  renderChordAnalyzer();
});
