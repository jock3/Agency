// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  view:          'dashboard',
  date:          today(),
  nutritionSlot: 'Frukost',
  foodQuery:     '',
  foodResults:   [],
  foodLoading:   false,
  historyMonth:  today().slice(0,7),
  detailDate:    null,
  progressExId:  null,
};

// ─── Timer ────────────────────────────────────────────────────────────────────
let timerInterval = null;

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const session = loadSession();
    if (!session) { clearInterval(timerInterval); return; }
    const el = document.getElementById('session-timer');
    if (el) el.textContent = fmtDuration(Date.now() - session.startedAt);
  }, 1000);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const main = document.getElementById('main');
  const nav  = document.getElementById('nav');

  nav.innerHTML = buildNav(state.view);

  clearInterval(timerInterval);

  switch (state.view) {
    case 'dashboard':
      main.innerHTML = buildDashboard(state);
      // Render charts after DOM is set
      requestAnimationFrame(() => {
        const goals  = loadGoals() || calcGoals(loadProfile());
        const day    = getDay(state.date);
        const totals = getDayTotals(day);
        renderRings(totals, goals);
      });
      break;
    case 'nutrition':
      main.innerHTML = buildNutrition(state);
      break;
    case 'workout':
      main.innerHTML = buildWorkout(state);
      if (loadSession()) startTimer();
      break;
    case 'progress':
      main.innerHTML = buildProgress(state);
      requestAnimationFrame(() => renderProgressCharts(state));
      break;
    case 'history':
      main.innerHTML = buildHistory(state);
      requestAnimationFrame(() => {
        renderCalendar(state);
        renderDayDetail(state);
      });
      break;
    case 'settings':
      main.innerHTML = buildSettings(state);
      break;
    default:
      main.innerHTML = buildDashboard(state);
  }
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
function openModal(html) {
  const m = document.getElementById('modal');
  const o = document.getElementById('overlay');
  m.innerHTML = html;
  m.classList.remove('hidden');
  o.classList.remove('hidden');
  const firstInput = m.querySelector('input[autofocus]');
  if (firstInput) setTimeout(()=>firstInput.focus(), 80);
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('modal').innerHTML = '';
}

function showToast(msg, ms=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(()=>t.classList.add('hidden'), ms);
}

// ─── Food quantity modal live preview ─────────────────────────────────────────
function updateFoodQtyPreview() {
  const qtyEl   = document.getElementById('food-qty');
  const kcalEl  = document.getElementById('food-qty-kcal');
  const macroEl = document.getElementById('food-qty-macros');
  if (!qtyEl || !kcalEl) return;
  const qty  = parseFloat(qtyEl.value)||0;
  const food = JSON.parse(qtyEl.closest('[data-food]')?.dataset?.food
    || document.querySelector('[data-action="confirm-food"]')?.dataset?.food || '{}');
  if (!food.kcal_100) return;
  const f = qty/100;
  kcalEl.textContent  = Math.round(food.kcal_100*f);
  if (macroEl) macroEl.textContent = `P ${Math.round(food.protein_100*f*10)/10}g · K ${Math.round(food.carbs_100*f*10)/10}g · F ${Math.round(food.fat_100*f*10)/10}g`;
}

// ─── Profile goals preview ────────────────────────────────────────────────────
function updateGoalsPreview() {
  const preview = document.getElementById('goals-preview');
  if (!preview) return;
  const p = {
    sex:         document.getElementById('p-sex')?.value,
    age:         parseFloat(document.getElementById('p-age')?.value)||0,
    heightCm:    parseFloat(document.getElementById('p-height')?.value)||0,
    weightKg:    parseFloat(document.getElementById('p-weight')?.value)||0,
    goalWeightKg:parseFloat(document.getElementById('p-goalweight')?.value)||0,
    activity:    document.getElementById('p-activity')?.value,
  };
  const g = calcGoals(p);
  preview.innerHTML = `
    <div style="font-size:18px;font-weight:800;color:var(--accent)">${g.kcal} kcal</div>
    <div class="text-xs text-muted mt-4">P ${g.protein}g · K ${g.carbs}g · F ${g.fat}g</div>`;
}

// ─── Exercise search filter ───────────────────────────────────────────────────
function filterExList(query, cat) {
  const list = document.getElementById('ex-list');
  if (!list) return;
  const q = query.toLowerCase();
  let items = EXERCISES;
  if (cat)   items = items.filter(e=>e.cat===cat);
  if (query) items = items.filter(e=>e.name.toLowerCase().includes(q)||e.muscles.some(m=>m.toLowerCase().includes(q)));

  const groups = cat ? [{ cat, items }]
    : EX_CATS.map(c=>({ cat:c, items:items.filter(e=>e.cat===c) })).filter(g=>g.items.length>0);

  list.innerHTML = groups.map(g=>`
    <div class="ex-cat-label">${g.cat}</div>
    ${g.items.map(e=>`
      <div class="ex-item" data-action="pick-exercise" data-exid="${e.id}" data-exname="${esc(e.name)}">
        <div>
          <div class="ex-item-name">${esc(e.name)}</div>
          <div class="ex-item-muscles">${e.muscles.join(' · ')}</div>
        </div>
        ${icon('chevron-right',16)}
      </div>`).join('')}`).join('');
}

// ─── Event handling ───────────────────────────────────────────────────────────
let _foodSearchTimeout = null;
let _exCatFilter = '';

document.getElementById('app').addEventListener('click', handleClick);
document.getElementById('overlay').addEventListener('click', closeModal);
document.getElementById('app').addEventListener('change', handleChange);
document.getElementById('modal').addEventListener('click', handleClick);
document.getElementById('modal').addEventListener('input', handleModalInput);

function handleClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, ...ds } = { action: el.dataset.action, ...el.dataset };
  dispatch(action, ds, el);
}

function handleChange(e) {
  const el = e.target;
  const action = el.dataset.action;
  if (!action) return;
  dispatch(action, el.dataset, el);
}

function handleModalInput(e) {
  const action = e.target.dataset.action;
  if (!action) return;
  if (action === 'food-qty-change') updateFoodQtyPreview();
  if (['p-sex','p-age','p-height','p-weight','p-goalweight','p-activity'].includes(e.target.id)) updateGoalsPreview();
}

function dispatch(action, data, el) {
  const date = data.date || state.date;

  switch (action) {

    // ── Navigation ──────────────────────────────────────────────────────────
    case 'nav':
      state.view = data.view;
      render();
      break;

    case 'prev-day':
      state.date = addDays(state.date, -1);
      render();
      break;

    case 'next-day':
      if (!isToday(state.date)) { state.date = addDays(state.date, 1); render(); }
      break;

    case 'goto-today':
      state.date = today();
      render();
      break;

    case 'day-detail':
      state.detailDate = data.date;
      renderDayDetail(state);
      break;

    case 'hist-prev-month': {
      const [y,m] = state.historyMonth.split('-').map(Number);
      const d = new Date(y, m-2, 1);
      state.historyMonth = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      renderCalendar(state);
      state.detailDate = null;
      renderDayDetail(state);
      break;
    }

    case 'hist-next-month': {
      const [y,m] = state.historyMonth.split('-').map(Number);
      const d = new Date(y, m, 1);
      const nm = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (nm <= today().slice(0,7)) {
        state.historyMonth = nm;
        renderCalendar(state);
        state.detailDate = null;
        renderDayDetail(state);
      }
      break;
    }

    // ── Water ───────────────────────────────────────────────────────────────
    case 'water-cup': {
      const goals = loadGoals() || calcGoals(loadProfile());
      const waterCups = Math.round((goals.water||2500)/250);
      const idx = parseInt(data.idx);
      const day = getDay(state.date);
      const filledCups = day.water ? Math.round(day.water/250) : 0;
      const newFilled = (idx < filledCups) ? idx : idx+1;
      day.water = newFilled * 250;
      saveDay(state.date, day);
      render();
      break;
    }

    // ── Steps & weight ──────────────────────────────────────────────────────
    case 'log-steps': {
      const v = parseFloat(el.value);
      if (isNaN(v)) break;
      const day = getDay(date);
      day.steps = Math.round(v);
      saveDay(date, day);
      break;
    }

    case 'log-weight': {
      const v = parseFloat(el.value);
      if (isNaN(v)) break;
      const day = getDay(date);
      day.weight = v;
      saveDay(date, day);
      break;
    }

    case 'log-measure': {
      const v = parseFloat(el.value);
      const day = getDay(today());
      day.measurements = day.measurements || {};
      if (!isNaN(v)) day.measurements[data.key] = v;
      saveDay(today(), day);
      break;
    }

    // ── Meals ───────────────────────────────────────────────────────────────
    case 'add-meal':
      state.nutritionSlot = data.slot;
      state.view = 'nutrition';
      render();
      break;

    case 'del-meal': {
      const day = getDay(date);
      day.meals = (day.meals||[]).filter(m=>m.id!==data.id);
      saveDay(date, day);
      render();
      break;
    }

    case 'copy-yesterday': {
      const yesterday = addDays(date, -1);
      const yDay = getDay(yesterday);
      if (!yDay.meals || yDay.meals.length===0) { showToast('Inga måltider igår'); break; }
      const day = getDay(date);
      const newMeals = yDay.meals.map(m=>({...m, id:uid()}));
      day.meals = [...(day.meals||[]), ...newMeals];
      saveDay(date, day);
      render();
      showToast('Kopierade igårs måltider');
      break;
    }

    case 'nut-slot':
      state.nutritionSlot = data.slot;
      state.foodResults = [];
      render();
      break;

    case 'open-manual-meal':
      openModal(buildManualMealModal(data.slot, data.date));
      break;

    case 'confirm-manual-meal': {
      const name = document.getElementById('m-name')?.value?.trim();
      const kcal = parseFloat(document.getElementById('m-kcal')?.value)||0;
      if (!name) { showToast('Ange ett namn'); break; }
      const meal = {
        id: uid(), slot: data.slot,
        name, kcal,
        protein: parseFloat(document.getElementById('m-prot')?.value)||0,
        carbs:   parseFloat(document.getElementById('m-carb')?.value)||0,
        fat:     parseFloat(document.getElementById('m-fat')?.value)||0,
      };
      const day = getDay(data.date);
      day.meals = [...(day.meals||[]), meal];
      saveDay(data.date, day);
      closeModal();
      render();
      showToast(`${name} tillagd`);
      break;
    }

    // ── Food search ──────────────────────────────────────────────────────────
    case 'food-search-input': {
      const q = el.value;
      state.foodQuery = q;
      clearTimeout(_foodSearchTimeout);
      if (q.length > 1) {
        _foodSearchTimeout = setTimeout(() => searchFood(q, state), 500);
      } else {
        state.foodResults = [];
        const r = document.getElementById('food-results');
        if (r) r.innerHTML = '';
      }
      break;
    }

    case 'pick-food': {
      const food = JSON.parse(data.food);
      openModal(buildFoodQuantityModal(food, data.slot, data.date));
      // wire live preview
      setTimeout(() => {
        const qtyEl = document.getElementById('food-qty');
        if (qtyEl) {
          qtyEl.addEventListener('input', updateFoodQtyPreview);
          updateFoodQtyPreview();
        }
      }, 50);
      break;
    }

    case 'confirm-food': {
      const food = JSON.parse(data.food);
      const qty  = parseFloat(document.getElementById('food-qty')?.value)||100;
      const f = qty/100;
      const meal = {
        id: uid(), slot: data.slot,
        name: food.name + (qty!==100?` (${qty}g)`:''),
        kcal:    Math.round(food.kcal_100*f),
        protein: Math.round(food.protein_100*f*10)/10,
        carbs:   Math.round(food.carbs_100*f*10)/10,
        fat:     Math.round(food.fat_100*f*10)/10,
      };
      const day = getDay(data.date);
      day.meals = [...(day.meals||[]), meal];
      saveDay(data.date, day);
      closeModal();
      render();
      showToast(`${food.name} tillagd`);
      break;
    }

    case 'add-fav-meal': {
      const fav = JSON.parse(data.fav);
      const meal = { id:uid(), slot:data.slot, name:fav.name, kcal:fav.kcal, protein:fav.protein, carbs:fav.carbs, fat:fav.fat };
      const day = getDay(data.date);
      day.meals = [...(day.meals||[]), meal];
      saveDay(data.date, day);
      render();
      showToast(`${fav.name} tillagd`);
      break;
    }

    case 'fav-food': {
      const food = JSON.parse(data.food);
      const favs = loadFavorites();
      if (!favs.find(f=>f.name===food.name)) {
        favs.push({ name:food.name, kcal:food.kcal_100, protein:food.protein_100, carbs:food.carbs_100, fat:food.fat_100 });
        saveFavorites(favs);
        showToast('Sparad som favorit');
      }
      break;
    }

    // ── Workout ──────────────────────────────────────────────────────────────
    case 'start-workout':
    case 'start-strength':
      openModal(buildStartWorkoutModal('strength'));
      break;

    case 'start-cardio':
      openModal(buildStartWorkoutModal('cardio'));
      break;

    case 'confirm-start-workout': {
      const name = document.getElementById('workout-name-input')?.value?.trim() || 'Träning';
      const session = { id:uid(), mode:data.mode, name, startedAt:Date.now(), exercises:[], cardioType:'Löpning', distanceKm:null, avgHr:null, kcal:null };
      saveSession(session);
      closeModal();
      state.view = 'workout';
      render();
      startTimer();
      break;
    }

    case 'resume-session':
      state.view = 'workout';
      render();
      startTimer();
      break;

    case 'load-routine': {
      const routines = loadRoutines();
      const routine  = routines.find(r=>r.id===data.id);
      if (!routine) break;
      const session  = {
        id: uid(), mode:'strength', name:routine.name, startedAt:Date.now(),
        exercises: (routine.exercises||[]).map(re=>({
          exId:re.exId, name:re.name,
          sets:(re.sets||[{reps:'',weight:'',done:false}]).map(s=>({...s,done:false})),
        })),
      };
      saveSession(session);
      state.view = 'workout';
      render();
      startTimer();
      break;
    }

    case 'add-session-ex':
      _exCatFilter = '';
      openModal(buildExPickerModal(''));
      break;

    case 'ex-cat-filter':
      _exCatFilter = data.cat;
      filterExList(document.getElementById('ex-search-input')?.value||'', data.cat);
      // Update active chip styling
      document.querySelectorAll('[data-action="ex-cat-filter"]').forEach(b=>{
        b.className = 'chip' + (b.dataset.cat===data.cat?' chip-accent':'');
      });
      break;

    case 'ex-search-input':
      filterExList(el.value, _exCatFilter);
      break;

    case 'pick-exercise': {
      const session = loadSession();
      if (!session) break;
      const newEx = { exId:data.exid, name:data.exname, sets:[{reps:'',weight:'',done:false}] };
      session.exercises = [...(session.exercises||[]), newEx];
      saveSession(session);
      closeModal();
      render();
      startTimer();
      // Scroll to new exercise
      setTimeout(()=>{
        const el = document.getElementById(`ex-block-${session.exercises.length-1}`);
        if (el) el.scrollIntoView({behavior:'smooth',block:'start'});
      }, 100);
      break;
    }

    case 'del-session-ex': {
      const session = loadSession();
      if (!session) break;
      session.exercises = session.exercises.filter((_,i)=>i!==parseInt(data.ex));
      saveSession(session);
      render();
      startTimer();
      break;
    }

    case 'add-set': {
      const session = loadSession();
      if (!session) break;
      const exIdx = parseInt(data.ex);
      const lastSet = session.exercises[exIdx].sets.slice(-1)[0]||{};
      session.exercises[exIdx].sets.push({ reps:lastSet.reps||'', weight:lastSet.weight||'', done:false });
      saveSession(session);
      render();
      startTimer();
      break;
    }

    case 'toggle-set': {
      const session = loadSession();
      if (!session) break;
      const exIdx = parseInt(data.ex), si = parseInt(data.si);
      const set = session.exercises[exIdx].sets[si];
      set.done = !set.done;
      saveSession(session);
      // Just update this cell without full re-render
      el.classList.toggle('done', set.done);
      el.innerHTML = set.done ? icon('check',14) : '';
      if (navigator.vibrate) navigator.vibrate(set.done?[30]:[10]);
      break;
    }

    case 'set-weight': {
      const session = loadSession();
      if (!session) break;
      session.exercises[parseInt(data.ex)].sets[parseInt(data.si)].weight = parseFloat(el.value)||null;
      saveSession(session);
      break;
    }

    case 'set-reps': {
      const session = loadSession();
      if (!session) break;
      session.exercises[parseInt(data.ex)].sets[parseInt(data.si)].reps = parseInt(el.value)||null;
      saveSession(session);
      break;
    }

    case 'cardio-type': {
      const session = loadSession(); if(!session) break;
      session.cardioType = el.value; saveSession(session); break;
    }
    case 'cardio-distance': {
      const session = loadSession(); if(!session) break;
      session.distanceKm = parseFloat(el.value)||null; saveSession(session); break;
    }
    case 'cardio-hr': {
      const session = loadSession(); if(!session) break;
      session.avgHr = parseInt(el.value)||null; saveSession(session); break;
    }
    case 'cardio-kcal': {
      const session = loadSession(); if(!session) break;
      session.kcal = parseInt(el.value)||null; saveSession(session); break;
    }

    case 'finish-session': {
      const session = loadSession();
      if (!session) break;
      const durationMin = Math.round((Date.now()-session.startedAt)/60000);
      const workout = {
        id:session.id, name:session.name, mode:session.mode,
        durationMin, startedAt:session.startedAt,
        exercises: session.exercises,
        cardioType:session.cardioType, distanceKm:session.distanceKm,
        avgHr:session.avgHr, kcal:session.kcal||0,
      };
      const day = getDay(state.date);
      day.workouts = [...(day.workouts||[]), workout];
      saveDay(state.date, day);
      clearSession();
      clearInterval(timerInterval);
      state.view = 'dashboard';
      render();
      showToast(`${session.name} sparat! ${durationMin} min`);
      break;
    }

    case 'cancel-session':
      if (!confirm('Avbryt träningspasset? Data går förlorad.')) break;
      clearSession();
      clearInterval(timerInterval);
      state.view = 'workout';
      render();
      break;

    case 'save-routine-from-session':
      openModal(buildSaveRoutineModal());
      break;

    case 'confirm-save-routine': {
      const name = document.getElementById('routine-name-input')?.value?.trim();
      if (!name) { showToast('Ange ett namn'); break; }
      const session = loadSession();
      if (!session) break;
      const routines = loadRoutines();
      routines.push({
        id:uid(), name,
        exercises:(session.exercises||[]).map(e=>({
          exId:e.exId, name:e.name,
          sets:(e.sets||[]).map(s=>({reps:s.reps,weight:s.weight})),
        })),
      });
      saveRoutines(routines);
      closeModal();
      showToast(`Rutin "${name}" sparad`);
      break;
    }

    case 'del-routine': {
      const routines = loadRoutines().filter(r=>r.id!==data.id);
      saveRoutines(routines);
      render();
      break;
    }

    case 'del-workout': {
      const day = getDay(date);
      day.workouts = (day.workouts||[]).filter(w=>w.id!==data.wid);
      saveDay(date, day);
      render();
      break;
    }

    // ── Progress ─────────────────────────────────────────────────────────────
    case 'select-progress-ex':
      state.progressExId = el.value || null;
      render();
      requestAnimationFrame(()=>renderProgressCharts(state));
      break;

    // ── Settings ─────────────────────────────────────────────────────────────
    case 'edit-profile':
      openModal(buildProfileModal());
      setTimeout(()=>document.querySelectorAll('#modal input').forEach(i=>
        i.addEventListener('input', updateGoalsPreview)), 50);
      break;

    case 'save-profile': {
      const p = {
        name:         document.getElementById('p-name')?.value?.trim()||'',
        sex:          document.getElementById('p-sex')?.value||'man',
        age:          parseFloat(document.getElementById('p-age')?.value)||0,
        heightCm:     parseFloat(document.getElementById('p-height')?.value)||0,
        weightKg:     parseFloat(document.getElementById('p-weight')?.value)||0,
        goalWeightKg: parseFloat(document.getElementById('p-goalweight')?.value)||0,
        activity:     document.getElementById('p-activity')?.value||'moderate',
      };
      saveProfile(p);
      const g = calcGoals(p);
      saveGoals(g);
      closeModal();
      render();
      showToast('Profil sparad!');
      break;
    }

    case 'edit-goals':
      openModal(buildGoalsModal());
      break;

    case 'save-goals': {
      const g = {
        kcal:    parseFloat(document.getElementById('g-kcal')?.value)||2000,
        protein: parseFloat(document.getElementById('g-prot')?.value)||150,
        carbs:   parseFloat(document.getElementById('g-carb')?.value)||200,
        fat:     parseFloat(document.getElementById('g-fat')?.value)||65,
        water:   parseFloat(document.getElementById('g-water')?.value)||2500,
        steps:   parseInt(document.getElementById('g-steps')?.value)||8000,
      };
      saveGoals(g);
      closeModal();
      render();
      showToast('Mål sparade');
      break;
    }

    case 'toggle-theme': {
      const cur = localStorage.getItem('tracker_theme')||'dark';
      const next = cur==='dark'?'light':'dark';
      localStorage.setItem('tracker_theme', next);
      document.documentElement.setAttribute('data-theme', next);
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.content = next==='dark'?'#1A1A1B':'#F0F0EE';
      render();
      break;
    }

    case 'export-data': {
      const json = exportData();
      const blob = new Blob([json], {type:'application/json'});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `track3r-backup-${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exporterad');
      break;
    }

    case 'import-data': {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async () => {
        try {
          const text = await input.files[0].text();
          importData(text);
          render();
          showToast('Data importerad!');
        } catch(err) {
          showToast('Importfel: kontrollera filen');
        }
      };
      input.click();
      break;
    }

    case 'clear-data':
      if (!confirm('Är du säker? All data raderas permanent.')) break;
      ['tracker_profile','tracker_goals','tracker_days','tracker_routines','tracker_favorites','tracker_session']
        .forEach(k=>localStorage.removeItem(k));
      render();
      showToast('Data rensad');
      break;

    case 'close-modal':
      closeModal();
      break;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Restore view from hash
  const hash = location.hash.slice(1);
  if (['dashboard','nutrition','workout','progress','history','settings'].includes(hash)) {
    state.view = hash;
  }

  // Restore date from hash param
  const hashDate = location.hash.match(/date=(\d{4}-\d{2}-\d{2})/);
  if (hashDate) state.date = hashDate[1];

  render();

  // First-run onboarding
  if (!loadProfile()) {
    setTimeout(()=>openModal(buildOnboardingModal()), 300);
  }

  // Update hash on nav
  window.addEventListener('hashchange', ()=>{
    const v = location.hash.slice(1).split('?')[0];
    if (['dashboard','nutrition','workout','progress','history','settings'].includes(v)) {
      state.view = v;
      render();
    }
  });

  // Persist nav state to hash
  document.getElementById('app').addEventListener('click', e=>{
    const el = e.target.closest('[data-action="nav"]');
    if (el) history.replaceState(null,'','#'+el.dataset.view);
  });
}

init();
