// ─── Constants ───────────────────────────────────────────────────────────────
const MEAL_SLOTS = ['Frukost', 'Lunch', 'Mellanmål', 'Middag'];

const ACTIVITY_LEVELS = [
  { id:'sedentary',  label:'Stillasittande',    mult:1.2   },
  { id:'light',      label:'Lätt aktiv',         mult:1.375 },
  { id:'moderate',   label:'Måttligt aktiv',      mult:1.55  },
  { id:'active',     label:'Aktiv',               mult:1.725 },
  { id:'very_active',label:'Mycket aktiv',        mult:1.9   },
];

const EXERCISES = [
  // Bröst
  {id:'bv1', name:'Bänkpress',              cat:'Bröst',    muscles:['Bröst','Triceps','Axlar']},
  {id:'bv2', name:'Lutande bänkpress',      cat:'Bröst',    muscles:['Övre bröst','Triceps']},
  {id:'bv3', name:'Nedåtlutande bänkpress', cat:'Bröst',    muscles:['Nedre bröst','Triceps']},
  {id:'bv4', name:'Hantelpress bröst',      cat:'Bröst',    muscles:['Bröst','Triceps']},
  {id:'bv5', name:'Lutande hantelpress',    cat:'Bröst',    muscles:['Övre bröst']},
  {id:'bv6', name:'Hantelfly',              cat:'Bröst',    muscles:['Bröst']},
  {id:'bv7', name:'Kabelkorsning',          cat:'Bröst',    muscles:['Bröst']},
  {id:'bv8', name:'Pec deck',               cat:'Bröst',    muscles:['Bröst']},
  {id:'bv9', name:'Dips bröst',             cat:'Bröst',    muscles:['Bröst','Triceps']},
  {id:'bv10',name:'Armhävning',             cat:'Bröst',    muscles:['Bröst','Triceps','Axlar']},
  // Rygg
  {id:'ry1', name:'Marklyft',               cat:'Rygg',     muscles:['Rygg','Ben','Kärnstyrka']},
  {id:'ry2', name:'Raka marklyft',          cat:'Rygg',     muscles:['Baklår','Rumpa','Rygg']},
  {id:'ry3', name:'Hantelroning',           cat:'Rygg',     muscles:['Lat','Biceps']},
  {id:'ry4', name:'Skivstångsroning',       cat:'Rygg',     muscles:['Lat','Biceps','Rygg']},
  {id:'ry5', name:'Chins',                  cat:'Rygg',     muscles:['Lat','Biceps']},
  {id:'ry6', name:'Pullups',                cat:'Rygg',     muscles:['Lat','Biceps']},
  {id:'ry7', name:'Latdrag',                cat:'Rygg',     muscles:['Lat','Biceps']},
  {id:'ry8', name:'Sittandes kabelroning',  cat:'Rygg',     muscles:['Rygg','Biceps']},
  {id:'ry9', name:'T-stångsroning',         cat:'Rygg',     muscles:['Rygg','Biceps']},
  {id:'ry10',name:'Ryggextension',          cat:'Rygg',     muscles:['Ländrygg','Rumpa']},
  {id:'ry11',name:'Facepull',               cat:'Rygg',     muscles:['Bakre delta','Rotatorkuff']},
  {id:'ry12',name:'Seal row',               cat:'Rygg',     muscles:['Rygg']},
  // Ben
  {id:'be1', name:'Knäböj',                 cat:'Ben',      muscles:['Quadriceps','Rumpa','Ländrygg']},
  {id:'be2', name:'Frontböj',               cat:'Ben',      muscles:['Quadriceps','Kärnstyrka']},
  {id:'be3', name:'Benpress',               cat:'Ben',      muscles:['Quadriceps','Rumpa']},
  {id:'be4', name:'Utfallssteg',            cat:'Ben',      muscles:['Quadriceps','Rumpa','Baklår']},
  {id:'be5', name:'Bulgarisk split squat',  cat:'Ben',      muscles:['Quadriceps','Rumpa']},
  {id:'be6', name:'Leg curl',               cat:'Ben',      muscles:['Baklår']},
  {id:'be7', name:'Leg extension',          cat:'Ben',      muscles:['Quadriceps']},
  {id:'be8', name:'Sumo marklyft',          cat:'Ben',      muscles:['Baklår','Rumpa','Ljumske']},
  {id:'be9', name:'Goblet squat',           cat:'Ben',      muscles:['Quadriceps','Rumpa']},
  {id:'be10',name:'Step up',                cat:'Ben',      muscles:['Quadriceps','Rumpa']},
  {id:'be11',name:'Box squat',              cat:'Ben',      muscles:['Quadriceps','Rumpa']},
  {id:'be12',name:'Hack squat',             cat:'Ben',      muscles:['Quadriceps']},
  // Axlar
  {id:'ax1', name:'Militärpress',           cat:'Axlar',    muscles:['Axlar','Triceps']},
  {id:'ax2', name:'Axelpress sittandes',    cat:'Axlar',    muscles:['Axlar','Triceps']},
  {id:'ax3', name:'Hantelpress axlar',      cat:'Axlar',    muscles:['Axlar','Triceps']},
  {id:'ax4', name:'Lateralyft',             cat:'Axlar',    muscles:['Mellersta delta']},
  {id:'ax5', name:'Framlift',               cat:'Axlar',    muscles:['Främre delta']},
  {id:'ax6', name:'Bakre deltalyft',        cat:'Axlar',    muscles:['Bakre delta']},
  {id:'ax7', name:'Arnold press',           cat:'Axlar',    muscles:['Axlar']},
  {id:'ax8', name:'Upright row',            cat:'Axlar',    muscles:['Axlar','Trapezius']},
  {id:'ax9', name:'Axelshrugs',             cat:'Axlar',    muscles:['Trapezius']},
  {id:'ax10',name:'Cuban press',            cat:'Axlar',    muscles:['Rotatorkuff','Axlar']},
  // Biceps
  {id:'bi1', name:'Bicepscurl',             cat:'Biceps',   muscles:['Biceps']},
  {id:'bi2', name:'Hantelcurl',             cat:'Biceps',   muscles:['Biceps']},
  {id:'bi3', name:'Hammarcurl',             cat:'Biceps',   muscles:['Biceps','Brachialis']},
  {id:'bi4', name:'Concentrationscurl',     cat:'Biceps',   muscles:['Biceps']},
  {id:'bi5', name:'Kabelbiceps',            cat:'Biceps',   muscles:['Biceps']},
  {id:'bi6', name:'Preacher curl',          cat:'Biceps',   muscles:['Biceps']},
  {id:'bi7', name:'Spidercurl',             cat:'Biceps',   muscles:['Biceps']},
  {id:'bi8', name:'Zottman curl',           cat:'Biceps',   muscles:['Biceps','Underarm']},
  // Triceps
  {id:'tr1', name:'Trånggreppsbänk',        cat:'Triceps',  muscles:['Triceps','Bröst']},
  {id:'tr2', name:'Overhead triceps',       cat:'Triceps',  muscles:['Triceps']},
  {id:'tr3', name:'Tricepsnedpress',        cat:'Triceps',  muscles:['Triceps']},
  {id:'tr4', name:'Skullcrusher',           cat:'Triceps',  muscles:['Triceps']},
  {id:'tr5', name:'Dips triceps',           cat:'Triceps',  muscles:['Triceps','Bröst']},
  {id:'tr6', name:'Kickback',               cat:'Triceps',  muscles:['Triceps']},
  {id:'tr7', name:'Diamond armhävning',     cat:'Triceps',  muscles:['Triceps']},
  // Mage
  {id:'ma1', name:'Situps',                 cat:'Mage',     muscles:['Mage']},
  {id:'ma2', name:'Crunch',                 cat:'Mage',     muscles:['Mage']},
  {id:'ma3', name:'Planka',                 cat:'Mage',     muscles:['Kärnstyrka']},
  {id:'ma4', name:'Sidoplanka',             cat:'Mage',     muscles:['Oblique','Kärnstyrka']},
  {id:'ma5', name:'Russian twist',          cat:'Mage',     muscles:['Oblique','Mage']},
  {id:'ma6', name:'Benboj',                 cat:'Mage',     muscles:['Nedre mage']},
  {id:'ma7', name:'Ab wheel',               cat:'Mage',     muscles:['Kärnstyrka']},
  {id:'ma8', name:'Hanging leg raise',      cat:'Mage',     muscles:['Mage']},
  {id:'ma9', name:'Dragon flag',            cat:'Mage',     muscles:['Kärnstyrka']},
  {id:'ma10',name:'Pallof press',           cat:'Mage',     muscles:['Kärnstyrka','Oblique']},
  // Rumpa
  {id:'ru1', name:'Hip thrust',             cat:'Rumpa',    muscles:['Rumpa','Baklår']},
  {id:'ru2', name:'Glute bridge',           cat:'Rumpa',    muscles:['Rumpa']},
  {id:'ru3', name:'Kabelnedåtkick',         cat:'Rumpa',    muscles:['Rumpa']},
  {id:'ru4', name:'Hip abduktion',          cat:'Rumpa',    muscles:['Rumpa','Höft']},
  {id:'ru5', name:'Frog pump',              cat:'Rumpa',    muscles:['Rumpa']},
  // Vader
  {id:'va1', name:'Vadpress stående',       cat:'Vader',    muscles:['Vader']},
  {id:'va2', name:'Vadpress sittandes',     cat:'Vader',    muscles:['Soleus']},
  {id:'va3', name:'Enbeins vadpress',       cat:'Vader',    muscles:['Vader']},
  // Helkropp
  {id:'hk1', name:'Kettlebell swing',       cat:'Helkropp', muscles:['Rumpa','Rygg','Kärnstyrka']},
  {id:'hk2', name:'Burpee',                 cat:'Helkropp', muscles:['Helkropp']},
  {id:'hk3', name:'Thrusters',              cat:'Helkropp', muscles:['Ben','Axlar']},
  {id:'hk4', name:'Clean and press',        cat:'Helkropp', muscles:['Helkropp']},
  {id:'hk5', name:'Turkish get-up',         cat:'Helkropp', muscles:['Kärnstyrka','Axlar']},
  {id:'hk6', name:'Bear complex',           cat:'Helkropp', muscles:['Helkropp']},
  {id:'hk7', name:'Farmarsteg',             cat:'Helkropp', muscles:['Kärnstyrka','Rygg','Händer']},
  {id:'hk8', name:'Man maker',              cat:'Helkropp', muscles:['Helkropp']},
  // Kondition
  {id:'ko1', name:'Löpning',               cat:'Kondition', muscles:['Helkropp']},
  {id:'ko2', name:'Cykling',               cat:'Kondition', muscles:['Ben']},
  {id:'ko3', name:'Rodd',                  cat:'Kondition', muscles:['Rygg','Ben','Armar']},
  {id:'ko4', name:'Simning',               cat:'Kondition', muscles:['Helkropp']},
  {id:'ko5', name:'Hopprep',               cat:'Kondition', muscles:['Helkropp']},
  {id:'ko6', name:'Elliptisk',             cat:'Kondition', muscles:['Ben','Armar']},
  {id:'ko7', name:'Trappa',               cat:'Kondition', muscles:['Ben','Rumpa']},
  {id:'ko8', name:'HIIT',                  cat:'Kondition', muscles:['Helkropp']},
  {id:'ko9', name:'Promenad',              cat:'Kondition', muscles:['Ben']},
  {id:'ko10',name:'Spinning',              cat:'Kondition', muscles:['Ben']},
  // Rörlighet
  {id:'ro1', name:'Yoga',                  cat:'Rörlighet', muscles:['Helkropp']},
  {id:'ro2', name:'Stretching',            cat:'Rörlighet', muscles:['Helkropp']},
  {id:'ro3', name:'Foam roll',             cat:'Rörlighet', muscles:['Helkropp']},
  {id:'ro4', name:'Hip flexor stretch',    cat:'Rörlighet', muscles:['Höftböjare']},
  {id:'ro5', name:'Hamstringsstretch',     cat:'Rörlighet', muscles:['Baklår']},
];

const EX_CATS = [...new Set(EXERCISES.map(e => e.cat))];

// ─── Date utilities ───────────────────────────────────────────────────────────
function today() {
  return dateStr(new Date());
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function parseDate(s) {
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}

function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

function isToday(s) { return s === today(); }
function isYesterday(s) { return s === addDays(today(), -1); }

function fmtDate(s) {
  if (isToday(s)) return 'Idag';
  if (isYesterday(s)) return 'Igår';
  const d = parseDate(s);
  return d.toLocaleDateString('sv-SE', { weekday:'short', month:'short', day:'numeric' });
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Storage ─────────────────────────────────────────────────────────────────
function loadProfile()    { return JSON.parse(localStorage.getItem('tracker_profile') || 'null'); }
function saveProfile(p)   { localStorage.setItem('tracker_profile', JSON.stringify(p)); }
function loadGoals()      { return JSON.parse(localStorage.getItem('tracker_goals') || 'null'); }
function saveGoals(g)     { localStorage.setItem('tracker_goals', JSON.stringify(g)); }
function loadDays()       { return JSON.parse(localStorage.getItem('tracker_days') || '{}'); }
function saveDay(date, d) { const all = loadDays(); all[date] = d; localStorage.setItem('tracker_days', JSON.stringify(all)); }
function getDay(date)     { return loadDays()[date] || { meals:[], workouts:[], steps:null, weight:null, water:0, measurements:{} }; }
function loadRoutines()   { return JSON.parse(localStorage.getItem('tracker_routines') || '[]'); }
function saveRoutines(r)  { localStorage.setItem('tracker_routines', JSON.stringify(r)); }
function loadFavorites()  { return JSON.parse(localStorage.getItem('tracker_favorites') || '[]'); }
function saveFavorites(f) { localStorage.setItem('tracker_favorites', JSON.stringify(f)); }
function loadSession()    { return JSON.parse(localStorage.getItem('tracker_session') || 'null'); }
function saveSession(s)   { localStorage.setItem('tracker_session', JSON.stringify(s)); }
function clearSession()   { localStorage.removeItem('tracker_session'); }

// ─── Goal calculation (Mifflin-St Jeor) ──────────────────────────────────────
function calcGoals(p) {
  if (!p || !p.age) return { kcal:2000, protein:150, carbs:220, fat:67, water:2500, steps:8000 };
  const w = p.weightKg || 75;
  const h = p.heightCm || 175;
  const a = p.age || 25;
  const bmr = p.sex === 'kvinna'
    ? (10*w) + (6.25*h) - (5*a) - 161
    : (10*w) + (6.25*h) - (5*a) + 5;
  const act = ACTIVITY_LEVELS.find(x => x.id === p.activity) || ACTIVITY_LEVELS[2];
  const tdee = Math.round(bmr * act.mult);
  const goal = p.goalWeightKg && p.goalWeightKg < w ? tdee - 500
             : p.goalWeightKg && p.goalWeightKg > w ? tdee + 300
             : tdee;
  const protein = Math.round(w * 1.8);
  const fat     = Math.round((goal * 0.25) / 9);
  const carbs   = Math.round((goal - protein*4 - fat*9) / 4);
  return { kcal: goal, protein, carbs: Math.max(carbs,0), fat, water:2500, steps:8000 };
}

// ─── Data aggregation ─────────────────────────────────────────────────────────
function getDayTotals(day) {
  const meals = day.meals || [];
  return {
    kcal:    meals.reduce((s,m) => s + (m.kcal||0), 0),
    protein: meals.reduce((s,m) => s + (m.protein||0), 0),
    carbs:   meals.reduce((s,m) => s + (m.carbs||0), 0),
    fat:     meals.reduce((s,m) => s + (m.fat||0), 0),
  };
}

function getWorkoutVolume(workout) {
  if (!workout.exercises) return 0;
  return workout.exercises.reduce((s,ex) => {
    const sets = ex.sets || [];
    return s + sets.reduce((ss,set) => ss + (set.done ? (set.weight||0)*(set.reps||0) : 0), 0);
  }, 0);
}

function getWeeklyVolume(daysMap, endDate) {
  const result = [];
  for (let i=6; i>=0; i--) {
    const d = addDays(endDate, -i);
    const day = daysMap[d];
    const vol = day ? (day.workouts||[]).reduce((s,w)=>s+getWorkoutVolume(w),0) : 0;
    result.push({ date: d, volume: vol });
  }
  return result;
}

function getWeightHistory(daysMap, n=90) {
  const end = today();
  const pts = [];
  for (let i=n-1; i>=0; i--) {
    const d = addDays(end, -i);
    const day = daysMap[d];
    if (day && day.weight) pts.push({ date: d, value: day.weight });
  }
  return pts;
}

function getExerciseHistory(daysMap, exId, n=60) {
  const end = today();
  const pts = [];
  for (let i=n-1; i>=0; i--) {
    const d = addDays(end, -i);
    const day = daysMap[d];
    if (!day) continue;
    for (const w of (day.workouts||[])) {
      for (const ex of (w.exercises||[])) {
        if (ex.exId === exId) {
          const best = (ex.sets||[]).filter(s=>s.done).reduce((b,s)=>s.weight>b?s.weight:b, 0);
          if (best > 0) pts.push({ date: d, value: best });
        }
      }
    }
  }
  return pts;
}

function getStreak(daysMap) {
  let streak = 0;
  let d = today();
  while (true) {
    const day = daysMap[d];
    if (!day) break;
    const hasActivity = (day.meals&&day.meals.length>0) || (day.workouts&&day.workouts.length>0);
    if (!hasActivity) break;
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

// ─── Export / Import ──────────────────────────────────────────────────────────
function exportData() {
  return JSON.stringify({
    profile:   loadProfile(),
    goals:     loadGoals(),
    days:      loadDays(),
    routines:  loadRoutines(),
    favorites: loadFavorites(),
    exported:  new Date().toISOString(),
  }, null, 2);
}

function importData(json) {
  const d = JSON.parse(json);
  if (d.profile)   saveProfile(d.profile);
  if (d.goals)     saveGoals(d.goals);
  if (d.days)      localStorage.setItem('tracker_days', JSON.stringify(d.days));
  if (d.routines)  saveRoutines(d.routines);
  if (d.favorites) saveFavorites(d.favorites);
}
