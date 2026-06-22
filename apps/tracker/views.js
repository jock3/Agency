// ─── Icon lookup ──────────────────────────────────────────────────────────────
function icon(name, size=20) {
  const i = {
    home:    '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    food:    '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2s-5 0-5 7c0 3.31 2.69 6 6 6h-1v7"/>',
    dumbbell:'<path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M4 5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M17 5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1z"/>',
    chart:   '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    plus:    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x:       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    check:   '<polyline points="20 6 9 17 4 12"/>',
    back:    '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    fwd:     '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    trash:   '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    search:  '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    star:    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    fire:    '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    edit:    '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    sun:     '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    moon:    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    down:    '<polyline points="21 15 15 9 9 15 3 9"/>',
    up:      '<polyline points="3 15 9 9 15 15 21 9"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'chevron-right':'<polyline points="9 18 15 12 9 6"/>',
    save:    '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
    copy:    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    timer:   '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    play:    '<polygon points="5 3 19 12 5 21 5 3"/>',
    pause:   '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    'export':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    'import':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    steps:   '<path d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="M3 10h7"/><path d="M14 10h7"/><path d="M10 5v14"/>',
    weight:  '<circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>',
  };
  const svg = i[name] || i['plus'];
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg}</svg>`;
}

// ─── Nav bar ──────────────────────────────────────────────────────────────────
function buildNav(view) {
  const tabs = [
    { id:'dashboard',  label:'Hem',       ic:'home'     },
    { id:'nutrition',  label:'Näring',    ic:'food'     },
    { id:'workout',    label:'Träning',   ic:'dumbbell' },
    { id:'progress',   label:'Framsteg',  ic:'chart'    },
    { id:'history',    label:'Historik',  ic:'calendar' },
  ];
  return tabs.map(t => `
    <button class="nav-btn${view===t.id?' active':''}" data-action="nav" data-view="${t.id}">
      ${icon(t.ic, 22)}
      <span>${t.label}</span>
    </button>`).join('');
}

// ─── Dashboard view ───────────────────────────────────────────────────────────
function buildDashboard(state) {
  const goals    = loadGoals() || calcGoals(loadProfile());
  const day      = getDay(state.date);
  const totals   = getDayTotals(day);
  const profile  = loadProfile();
  const session  = loadSession();

  const kcalPct = goals.kcal > 0 ? Math.round((totals.kcal / goals.kcal) * 100) : 0;
  const remaining = goals.kcal - totals.kcal;
  const waterCups = Math.round((goals.water || 2500) / 250);
  const filledCups = day.water ? Math.round(day.water / 250) : 0;

  let cupsHtml = '';
  for (let i=0; i<waterCups; i++) {
    cupsHtml += `<div class="water-cup${i<filledCups?' filled':''}" data-action="water-cup" data-idx="${i}">💧</div>`;
  }

  const mealSlotsHtml = MEAL_SLOTS.map(slot => {
    const meals = (day.meals||[]).filter(m => m.slot===slot);
    const slotKcal = meals.reduce((s,m)=>s+(m.kcal||0),0);
    const items = meals.map(m => `
      <div class="meal-item">
        <div class="meal-item-name">${esc(m.name)}</div>
        <div class="meal-item-macros">P ${m.protein||0}g · K ${m.carbs||0}g · F ${m.fat||0}g</div>
        <div class="meal-item-kcal">${m.kcal||0} kcal</div>
        <button class="icon-btn" data-action="del-meal" data-id="${m.id}" data-date="${state.date}" style="flex-shrink:0">
          ${icon('x',16)}
        </button>
      </div>`).join('');
    return `
      <div class="meal-slot">
        <div class="meal-slot-header" data-action="add-meal" data-slot="${slot}" data-date="${state.date}">
          <span class="meal-slot-name">${slot}</span>
          ${slotKcal>0?`<span class="meal-slot-kcal">${slotKcal} kcal</span>`:''}
          ${icon('plus', 16)}
        </div>
        ${items}
      </div>`;
  }).join('');

  const workoutsHtml = (day.workouts||[]).length===0
    ? `<div class="text-muted text-sm" style="padding:8px 0">Inga träningspass loggade</div>`
    : (day.workouts||[]).map(w => {
        const vol = getWorkoutVolume(w);
        const sets = (w.exercises||[]).reduce((s,e)=>s+(e.sets||[]).filter(x=>x.done).length,0);
        return `<div class="workout-card">
          <div class="workout-card-info">
            <div class="workout-card-name">${esc(w.name||'Träning')}</div>
            <div class="workout-card-meta">${sets} set · ${vol>0?vol+' kg volym':''}${w.durationMin?' · '+w.durationMin+' min':''}</div>
          </div>
          <button class="icon-btn" data-action="del-workout" data-wid="${w.id}" data-date="${state.date}">
            ${icon('x',16)}
          </button>
        </div>`;
      }).join('');

  const sessionBanner = session ? `
    <div class="card" style="background:var(--accent-dim);border-color:var(--accent);margin:12px 16px 0;cursor:pointer" data-action="resume-session">
      <div class="flex gap-8" style="align-items:center">
        ${icon('timer',20)}
        <div style="flex:1">
          <div class="font-bold" style="font-size:14px">Pågående träning</div>
          <div class="text-sm text-muted">${esc(session.name||'Träning')} · Tryck för att fortsätta</div>
        </div>
        ${icon('chevron-right')}
      </div>
    </div>` : '';

  return `
    <div class="page-header" style="justify-content:space-between">
      <button class="icon-btn" data-action="prev-day">${icon('back')}</button>
      <div style="text-align:center">
        <div class="font-bold" style="font-size:17px">${fmtDate(state.date)}</div>
        ${!isToday(state.date)?`<button class="text-sm" style="color:var(--accent)" data-action="goto-today">Idag</button>`:''}
      </div>
      <button class="icon-btn" data-action="next-day" ${isToday(state.date)?'disabled style="opacity:.3"':''}>${icon('fwd')}</button>
    </div>

    ${sessionBanner}

    <div style="padding:0 16px 8px">
      <!-- Macro summary -->
      <div class="card mt-8">
        <div class="card-title">Kalorier & Makros</div>
        <div class="macro-summary">
          <div id="ring-kcal"></div>
          <div class="macro-details">
            <div class="macro-row">
              <span class="macro-label">Protein</span>
              <span class="macro-val">${totals.protein}/${goals.protein}g</span>
              <div class="macro-bar-wrap"><div id="bar-protein"></div></div>
            </div>
            <div class="macro-row">
              <span class="macro-label">Kolhydr.</span>
              <span class="macro-val">${totals.carbs}/${goals.carbs}g</span>
              <div class="macro-bar-wrap"><div id="bar-carbs"></div></div>
            </div>
            <div class="macro-row">
              <span class="macro-label">Fett</span>
              <span class="macro-val">${totals.fat}/${goals.fat}g</span>
              <div class="macro-bar-wrap"><div id="bar-fat"></div></div>
            </div>
          </div>
        </div>
        <div class="text-sm text-muted mt-8" style="text-align:center">
          ${remaining>=0?`${remaining} kcal kvar`:`${Math.abs(remaining)} kcal över mål`}
        </div>
      </div>

      <!-- Water -->
      <div class="card mt-8">
        <div class="card-title">Vatten</div>
        <div class="water-row">
          <div class="water-cups">${cupsHtml}</div>
          <span class="water-label">${day.water||0} / ${goals.water||2500} ml</span>
        </div>
      </div>

      <!-- Steps & weight -->
      <div class="form-row mt-8">
        <div class="card flex gap-8" style="align-items:center;padding:12px">
          ${icon('steps',18)}
          <div style="flex:1">
            <div class="text-xs text-muted">Steg</div>
            <input class="set-input" style="width:80px;font-size:16px;background:transparent;border:none;padding:0"
              type="number" placeholder="${goals.steps||8000}"
              value="${day.steps||''}"
              data-action="log-steps" data-date="${state.date}">
          </div>
        </div>
        <div class="card flex gap-8" style="align-items:center;padding:12px">
          ${icon('weight',18)}
          <div style="flex:1">
            <div class="text-xs text-muted">Vikt (kg)</div>
            <input class="set-input" style="width:80px;font-size:16px;background:transparent;border:none;padding:0"
              type="number" step="0.1" placeholder="–"
              value="${day.weight||''}"
              data-action="log-weight" data-date="${state.date}">
          </div>
        </div>
      </div>

      <!-- Meals -->
      <div class="card mt-8">
        <div style="display:flex;align-items:center;margin-bottom:6px">
          <span class="card-title" style="margin:0;flex:1">Måltider</span>
          <button class="btn btn-sm btn-ghost" data-action="copy-yesterday" data-date="${state.date}" style="font-size:11px;padding:4px 8px">
            ${icon('copy',14)} Kopiera igår
          </button>
        </div>
        ${mealSlotsHtml}
      </div>

      <!-- Workouts -->
      <div class="card mt-8" style="margin-bottom:16px">
        <div style="display:flex;align-items:center;margin-bottom:8px">
          <span class="card-title" style="margin:0;flex:1">Träning</span>
          <button class="btn btn-sm btn-teal" data-action="start-workout">
            ${icon('plus',14)} Ny träning
          </button>
        </div>
        ${workoutsHtml}
      </div>
    </div>`;
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderRings(totals, goals) {
  const rc = document.getElementById('ring-kcal');
  if (rc) ringChart(rc, totals.kcal, goals.kcal, 'var(--accent)',
    totals.kcal, 'kcal');
  const bp = document.getElementById('bar-protein');
  if (bp) macroBar(bp, totals.protein, goals.protein, 'var(--blue)');
  const bc = document.getElementById('bar-carbs');
  if (bc) macroBar(bc, totals.carbs, goals.carbs, 'var(--amber)');
  const bf = document.getElementById('bar-fat');
  if (bf) macroBar(bf, totals.fat, goals.fat, 'var(--green)');
}
