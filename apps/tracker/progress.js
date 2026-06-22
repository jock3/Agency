// ─── Progress view ────────────────────────────────────────────────────────────
function buildProgress(state) {
  const daysMap = loadDays();
  const profile = loadProfile();
  const streak  = getStreak(daysMap);
  const weightPts = getWeightHistory(daysMap, 90);
  const weeklyVol = getWeeklyVolume(daysMap, today());
  const exHistoryEx = state.progressExId || null;

  // Workout count last 30 days
  let workoutCount = 0;
  for (let i=0; i<30; i++) {
    const d = addDays(today(), -i);
    const day = daysMap[d];
    if (day && day.workouts && day.workouts.length > 0) workoutCount++;
  }

  // Best weight from last 30 days
  const recent30 = weightPts.slice(-30);
  const latestWeight = recent30.length ? recent30[recent30.length-1].value : null;
  const startWeight  = recent30.length ? recent30[0].value : null;
  const weightDiff   = (latestWeight && startWeight) ? (latestWeight - startWeight) : null;

  const exerciseOptions = EXERCISES.filter(e=>e.cat!=='Kondition'&&e.cat!=='Rörlighet')
    .map(e=>`<option value="${e.id}"${exHistoryEx===e.id?' selected':''}>${esc(e.name)}</option>`).join('');

  let exChartHtml = '';
  if (exHistoryEx) {
    const pts = getExerciseHistory(daysMap, exHistoryEx, 90);
    exChartHtml = `<div id="ex-chart-wrap" class="chart-wrap" style="height:140px"></div>`;
    if (pts.length < 2) {
      exChartHtml = `<div class="chart-empty">Inte tillräckligt med data för vald övning</div>`;
    }
  }

  return `
    <div class="page-header">
      <div class="page-title">Framsteg</div>
    </div>
    <div style="padding:0 16px">
      <!-- Stats grid -->
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-val" style="color:var(--accent)">${streak}</div>
          <div class="stat-label">Dagars streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:var(--teal)">${workoutCount}</div>
          <div class="stat-label">Pass (30 dagar)</div>
        </div>
      </div>
      ${latestWeight ? `
      <div class="stat-row mt-8">
        <div class="stat-card">
          <div class="stat-val" style="color:var(--blue)">${latestWeight.toFixed(1)} kg</div>
          <div class="stat-label">Senaste vikt</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:${weightDiff<=0?'var(--green)':'var(--amber)'}">
            ${weightDiff>0?'+':''}${weightDiff!==null?weightDiff.toFixed(1)+'kg':'–'}
          </div>
          <div class="stat-label">Förändring (30 d)</div>
        </div>
      </div>` : ''}

      <!-- Weekly volume -->
      <div class="card mt-12">
        <div class="card-title">Vecklig volym (kg)</div>
        <div id="vol-chart" class="chart-wrap" style="height:120px"></div>
      </div>

      <!-- Weight trend -->
      <div class="card mt-8">
        <div class="card-title">Viktkurva (90 dagar)</div>
        <div id="weight-chart" class="chart-wrap" style="height:140px"></div>
      </div>

      <!-- Strength progress -->
      <div class="card mt-8">
        <div class="card-title">Styrkeframsteg</div>
        <select class="form-input" data-action="select-progress-ex" style="margin-bottom:12px">
          <option value="">Välj övning…</option>
          ${exerciseOptions}
        </select>
        ${exChartHtml}
      </div>

      <!-- Body measurements -->
      <div class="card mt-8" style="margin-bottom:16px">
        <div class="card-title">Kroppsmått</div>
        <div class="form-row">
          ${[['Bröst','chest'],['Midja','waist'],['Höfter','hips'],['Bicep','arm'],['Lår','thigh']].map(([l,k])=>{
            const today_day = getDay(today());
            const val = (today_day.measurements||{})[k]||'';
            return `<div class="form-group">
              <label class="form-label">${l} (cm)</label>
              <input class="form-input" type="number" step="0.1" placeholder="–"
                value="${val}" data-action="log-measure" data-key="${k}">
            </div>`;
          }).join('')}
        </div>
        <div class="text-xs text-muted" style="margin-top:4px">Loggas för idag</div>
      </div>
    </div>`;
}

function renderProgressCharts(state) {
  const daysMap = loadDays();
  const weeklyVol = getWeeklyVolume(daysMap, today());
  const volEl = document.getElementById('vol-chart');
  if (volEl) {
    barChart(volEl, weeklyVol.map(d=>({
      date: d.date,
      value: Math.round(d.volume),
      label: parseDate(d.date).toLocaleDateString('sv-SE',{weekday:'narrow'})
    })), { color:'var(--teal)', height:120, width: volEl.offsetWidth||300 });
  }

  const weightPts = getWeightHistory(daysMap, 90);
  const wtEl = document.getElementById('weight-chart');
  if (wtEl) {
    lineChart(wtEl, weightPts, { color:'var(--blue)', height:140, width:wtEl.offsetWidth||300, id:'wt' });
  }

  if (state.progressExId) {
    const pts = getExerciseHistory(daysMap, state.progressExId, 90);
    const exEl = document.getElementById('ex-chart-wrap');
    if (exEl) {
      lineChart(exEl, pts, { color:'var(--accent)', height:140, width:exEl.offsetWidth||300, id:'ex' });
    }
  }
}

// ─── History / Calendar view ──────────────────────────────────────────────────
function buildHistory(state) {
  const daysMap = loadDays();
  const yearMonth = state.historyMonth || today().slice(0,7);
  const [year, month] = yearMonth.split('-').map(Number);
  const monthName = new Date(year, month-1, 1).toLocaleDateString('sv-SE', { month:'long', year:'numeric' });

  return `
    <div class="page-header">
      <div class="page-title">Historik</div>
    </div>
    <div style="padding:0 16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <button class="icon-btn" data-action="hist-prev-month">${icon('back')}</button>
        <span class="font-bold" style="flex:1;text-align:center;text-transform:capitalize">${monthName}</span>
        <button class="icon-btn" data-action="hist-next-month"
          ${yearMonth >= today().slice(0,7)?'disabled style="opacity:.3"':''}>${icon('fwd')}</button>
      </div>
      <div id="cal-wrap"></div>

      <!-- Day detail panel -->
      <div id="day-detail" style="margin-top:12px"></div>
      <div style="height:16px"></div>
    </div>`;
}

function renderCalendar(state) {
  const daysMap = loadDays();
  const yearMonth = state.historyMonth || today().slice(0,7);
  const wrap = document.getElementById('cal-wrap');
  if (wrap) calendarGrid(wrap, yearMonth, daysMap);
}

function renderDayDetail(state) {
  const panel = document.getElementById('day-detail');
  if (!panel || !state.detailDate) { if(panel) panel.innerHTML=''; return; }
  const d = state.detailDate;
  const day = getDay(d);
  const totals = getDayTotals(day);
  const workouts = day.workouts||[];
  const meals = day.meals||[];

  panel.innerHTML = `
    <div class="card">
      <div class="card-title" style="margin-bottom:8px">${fmtDate(d)}</div>
      ${day.weight?`<div class="text-sm" style="margin-bottom:6px">${icon('weight',14)} Vikt: <strong>${day.weight} kg</strong></div>`:''}
      ${totals.kcal>0?`<div class="text-sm" style="margin-bottom:6px">${icon('fire',14)} ${totals.kcal} kcal · P ${totals.protein}g · K ${totals.carbs}g · F ${totals.fat}g</div>`:''}
      ${workouts.length>0?`<div class="text-sm" style="margin-bottom:6px">${icon('dumbbell',14)} ${workouts.map(w=>esc(w.name||'Träning')).join(', ')}</div>`:''}
      ${meals.length===0&&workouts.length===0?'<div class="text-muted text-sm">Ingen data loggad</div>':''}
    </div>`;
}
