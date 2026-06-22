// ─── Workout browse view ──────────────────────────────────────────────────────
function buildWorkout(state) {
  const session  = loadSession();
  const routines = loadRoutines();

  if (session) {
    return buildActiveSession(state);
  }

  const routineCards = routines.length===0
    ? `<div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">Inga sparade rutiner</div>
        <div class="empty-state-sub">Spara ett träningspass som rutin för att se det här</div>
       </div>`
    : routines.map(r=>`
      <div class="workout-card" style="cursor:pointer" data-action="load-routine" data-id="${r.id}">
        <div class="workout-card-info">
          <div class="workout-card-name">${esc(r.name)}</div>
          <div class="workout-card-meta">${(r.exercises||[]).length} övningar</div>
        </div>
        <button class="icon-btn" data-action="del-routine" data-id="${r.id}" style="color:var(--red)">${icon('trash',16)}</button>
        ${icon('chevron-right',16)}
      </div>`).join('');

  return `
    <div class="page-header">
      <div class="page-title">Träning</div>
    </div>
    <div style="padding:0 16px">
      <div class="form-row" style="margin-bottom:16px">
        <button class="btn btn-primary" style="flex:1" data-action="start-strength">
          ${icon('dumbbell',18)} Styrka
        </button>
        <button class="btn btn-teal" style="flex:1" data-action="start-cardio">
          ${icon('fire',18)} Kondition
        </button>
      </div>
      <div class="card">
        <div class="card-title">Mina rutiner</div>
        ${routineCards}
      </div>
      <div style="height:16px"></div>
    </div>`;
}

// ─── Active session view ──────────────────────────────────────────────────────
function buildActiveSession(state) {
  const session = loadSession();
  if (!session) return buildWorkout(state);

  const elapsed = Date.now() - session.startedAt;

  if (session.mode === 'cardio') {
    return buildCardioSession(session, elapsed);
  }

  const exerciseBlocks = (session.exercises||[]).map((ex, exIdx) => {
    const sets = ex.sets || [];
    const doneCount = sets.filter(s=>s.done).length;

    // Find PR from last session
    const allDays = loadDays();
    const hist = getExerciseHistory(allDays, ex.exId, 60);
    const pr = hist.length ? Math.max(...hist.map(h=>h.value)) : null;

    const setRows = sets.map((set, si) => `
      <div class="set-row">
        <div class="set-num">${si+1}</div>
        <input class="set-input" type="number" step="0.5" placeholder="kg"
          value="${set.weight||''}"
          data-action="set-weight" data-ex="${exIdx}" data-si="${si}">
        <input class="set-input" type="number" placeholder="reps"
          value="${set.reps||''}"
          data-action="set-reps" data-ex="${exIdx}" data-si="${si}">
        <div class="set-check${set.done?' done':''}"
          data-action="toggle-set" data-ex="${exIdx}" data-si="${si}">
          ${set.done?icon('check',14):''}
        </div>
      </div>`).join('');

    return `
      <div class="exercise-block" id="ex-block-${exIdx}">
        <div class="exercise-block-name">
          <span style="flex:1">${esc(ex.name)}</span>
          ${pr?`<span class="chip chip-accent" style="font-size:10px">PR ${pr}kg</span>`:''}
          <button class="icon-btn" data-action="del-session-ex" data-ex="${exIdx}" style="color:var(--red)">${icon('trash',14)}</button>
        </div>
        ${setRows}
        <button class="btn btn-ghost btn-sm btn-full" data-action="add-set" data-ex="${exIdx}" style="margin-top:4px">
          ${icon('plus',14)} Lägg till set
        </button>
      </div>`;
  }).join('');

  return `
    <div class="session-screen" id="session-screen">
      <div class="session-header">
        <div>
          <div class="session-name">${esc(session.name||'Träning')}</div>
          <div class="text-xs text-muted">Idag</div>
        </div>
        <div class="session-timer" id="session-timer">${fmtDuration(elapsed)}</div>
        <button class="icon-btn" data-action="cancel-session" style="color:var(--red)">${icon('x',20)}</button>
      </div>
      <div class="session-body">
        ${exerciseBlocks}
        <button class="btn btn-secondary btn-full" data-action="add-session-ex">
          ${icon('plus',14)} Lägg till övning
        </button>
        <div style="height:8px"></div>
      </div>
      <div class="session-footer">
        <button class="btn btn-secondary" style="flex:1" data-action="save-routine-from-session">
          ${icon('save',14)} Spara rutin
        </button>
        <button class="btn btn-primary" style="flex:2" data-action="finish-session">
          ${icon('check',16)} Avsluta träning
        </button>
      </div>
    </div>`;
}

function buildCardioSession(session, elapsed) {
  return `
    <div class="session-screen">
      <div class="session-header">
        <div>
          <div class="session-name">${esc(session.name||'Kondition')}</div>
          <div class="text-xs text-muted">Aktiv session</div>
        </div>
        <div class="session-timer" id="session-timer">${fmtDuration(elapsed)}</div>
        <button class="icon-btn" data-action="cancel-session" style="color:var(--red)">${icon('x',20)}</button>
      </div>
      <div class="session-body">
        <div class="card">
          <div class="card-title">Konditionspass</div>
          <div class="form-group">
            <label class="form-label">Typ</label>
            <select class="form-input" data-action="cardio-type">
              ${['Löpning','Cykling','Rodd','Simning','Hopprep','Elliptisk','Trappa','HIIT','Promenad','Spinning','Övrigt']
                .map(t=>`<option value="${t}"${session.cardioType===t?' selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Distans (km)</label>
              <input class="form-input" type="number" step="0.01" placeholder="–"
                value="${session.distanceKm||''}" data-action="cardio-distance">
            </div>
            <div class="form-group">
              <label class="form-label">Puls (bpm)</label>
              <input class="form-input" type="number" placeholder="–"
                value="${session.avgHr||''}" data-action="cardio-hr">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Kalorier (uppskattning)</label>
            <input class="form-input" type="number" placeholder="–"
              value="${session.kcal||''}" data-action="cardio-kcal">
          </div>
        </div>
      </div>
      <div class="session-footer">
        <button class="btn btn-primary btn-full" data-action="finish-session">
          ${icon('check',16)} Avsluta
        </button>
      </div>
    </div>`;
}

// ─── Modal: name new workout ──────────────────────────────────────────────────
function buildStartWorkoutModal(mode) {
  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">${mode==='cardio'?'Konditionspass':'Styrketräning'}</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Namn på pass</label>
        <input id="workout-name-input" class="form-input" type="text"
          placeholder="${mode==='cardio'?'t.ex. Löpning 5km':'t.ex. Bröst & Triceps'}" autofocus>
      </div>
      <button class="btn btn-primary btn-full" data-action="confirm-start-workout" data-mode="${mode}">
        Starta
      </button>
    </div>`;
}

// ─── Modal: exercise picker ───────────────────────────────────────────────────
function buildExPickerModal(filterCat) {
  const cats = EX_CATS;
  const catBtns = ['Alla', ...cats].map(c => `
    <button class="chip${(!filterCat&&c==='Alla')||(filterCat===c)?' chip-accent':''}"
      data-action="ex-cat-filter" data-cat="${c==='Alla'?'':c}" style="margin:2px">${c}</button>`).join('');

  const filtered = filterCat ? EXERCISES.filter(e=>e.cat===filterCat) : EXERCISES;
  const groupedByActive = filterCat ? [{ cat:filterCat, items:filtered }]
    : cats.map(c=>({ cat:c, items:EXERCISES.filter(e=>e.cat===c) }));

  const list = groupedByActive.map(g=>`
    <div class="ex-cat-label">${g.cat}</div>
    ${g.items.map(e=>`
      <div class="ex-item" data-action="pick-exercise" data-exid="${e.id}" data-exname="${esc(e.name)}">
        <div>
          <div class="ex-item-name">${esc(e.name)}</div>
          <div class="ex-item-muscles">${e.muscles.join(' · ')}</div>
        </div>
        ${icon('chevron-right',16)}
      </div>`).join('')}`).join('');

  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">Välj övning</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="ex-search">
      <input id="ex-search-input" class="form-input" type="search" placeholder="Sök övning…"
        data-action="ex-search-input" autofocus>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">${catBtns}</div>
    </div>
    <div id="ex-list">${list}</div>
    <div style="height:16px"></div>`;
}

// ─── Modal: save routine ──────────────────────────────────────────────────────
function buildSaveRoutineModal() {
  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">Spara rutin</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Rutinnamn</label>
        <input id="routine-name-input" class="form-input" type="text" placeholder="t.ex. Överkropp A" autofocus>
      </div>
      <button class="btn btn-primary btn-full" data-action="confirm-save-routine">
        Spara
      </button>
    </div>`;
}
