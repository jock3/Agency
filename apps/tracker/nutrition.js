// ─── Nutrition view ───────────────────────────────────────────────────────────
function buildNutrition(state) {
  const day    = getDay(state.date);
  const goals  = loadGoals() || calcGoals(loadProfile());
  const totals = getDayTotals(day);
  const favs   = loadFavorites();

  const slotTabs = MEAL_SLOTS.map((slot, i) => {
    const slotMeals = (day.meals||[]).filter(m=>m.slot===slot);
    const slotKcal  = slotMeals.reduce((s,m)=>s+(m.kcal||0),0);
    const active    = (state.nutritionSlot||'Frukost')===slot;
    return `<button class="segment-btn${active?' active':''}" data-action="nut-slot" data-slot="${slot}">
      ${slot}${slotKcal>0?` <span style="font-size:10px;opacity:.7">${slotKcal}</span>`:''}
    </button>`;
  }).join('');

  const activeSlot = state.nutritionSlot || 'Frukost';
  const slotMeals  = (day.meals||[]).filter(m=>m.slot===activeSlot);

  const mealItems = slotMeals.length===0
    ? `<div class="empty-state" style="padding:20px 0">
        <div class="empty-state-text">Inga måltider loggade</div>
        <div class="empty-state-sub">Sök efter mat nedan</div>
       </div>`
    : slotMeals.map(m=>`
      <div class="meal-item" style="border-radius:8px;background:var(--card2);margin-bottom:4px;border-left:none;padding:10px 12px">
        <div style="flex:1">
          <div class="meal-item-name">${esc(m.name)}</div>
          <div class="meal-item-macros">P ${m.protein||0}g · K ${m.carbs||0}g · F ${m.fat||0}g</div>
        </div>
        <div class="meal-item-kcal">${m.kcal||0}</div>
        <button class="icon-btn" data-action="del-meal" data-id="${m.id}" data-date="${state.date}">${icon('x',15)}</button>
      </div>`).join('');

  const favsHtml = favs.length===0 ? '' : `
    <div class="card-title" style="margin-top:16px">Favoriter</div>
    ${favs.map(f=>`
      <div class="search-result" data-action="add-fav-meal" data-fav="${esc(JSON.stringify(f))}" data-slot="${activeSlot}" data-date="${state.date}">
        <div class="search-result-name">${esc(f.name)}</div>
        <div class="search-result-macros">P ${f.protein}g · K ${f.carbs}g · F ${f.fat}g · ${f.kcal} kcal</div>
      </div>`).join('')}`;

  const macroSummary = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin-bottom:12px">
      ${[['Kalorier',totals.kcal+'/'+goals.kcal,'var(--accent)'],
         ['Protein',totals.protein+'g','var(--blue)'],
         ['Kolhydr.',totals.carbs+'g','var(--amber)'],
         ['Fett',totals.fat+'g','var(--green)']].map(([l,v,c])=>`
        <div style="background:var(--card);border-radius:8px;padding:8px">
          <div style="font-size:13px;font-weight:700;color:${c}">${v}</div>
          <div style="font-size:10px;color:var(--muted)">${l}</div>
        </div>`).join('')}
    </div>`;

  return `
    <div class="page-header">
      <div style="flex:1">
        <div class="page-title">Näring</div>
        <div class="page-subtitle">${fmtDate(state.date)}</div>
      </div>
      <button class="icon-btn" data-action="open-manual-meal" data-date="${state.date}"
        data-slot="${activeSlot}" title="Lägg till manuellt">${icon('edit',20)}</button>
    </div>
    <div style="padding:0 16px">
      ${macroSummary}
      <div class="segment" style="margin-bottom:12px">${slotTabs}</div>
      ${mealItems}

      <!-- Food search -->
      <div class="card mt-8">
        <div class="card-title">Sök livsmedel</div>
        <div style="position:relative">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted)">${icon('search',16)}</span>
          <input id="food-search-input" class="form-input" style="padding-left:34px"
            type="search" placeholder="Sök på Open Food Facts…"
            value="${esc(state.foodQuery||'')}"
            data-action="food-search-input">
        </div>
        <div id="food-results" style="margin-top:8px">${buildFoodResults(state)}</div>
      </div>
      ${favsHtml}
      <div style="height:16px"></div>
    </div>`;
}

function buildFoodResults(state) {
  const results = state.foodResults || [];
  const loading  = state.foodLoading;
  const slot     = state.nutritionSlot || 'Frukost';
  if (loading) return `<div class="text-center text-muted text-sm" style="padding:12px">Söker…</div>`;
  if (!results.length) return '';
  return results.map(r => {
    const n = r.nutriments || {};
    const per = n['energy-kcal_100g'] ? '100g' : '';
    const kcal = Math.round(n['energy-kcal_100g'] || n['energy_100g']/4.184 || 0);
    const prot = Math.round((n['proteins_100g']||0)*10)/10;
    const carb = Math.round((n['carbohydrates_100g']||0)*10)/10;
    const fat  = Math.round((n['fat_100g']||0)*10)/10;
    const encoded = esc(JSON.stringify({
      code:r.code, name:r.product_name, brand:r.brands,
      kcal_100:kcal, protein_100:prot, carbs_100:carb, fat_100:fat
    }));
    return `<div class="search-result" data-action="pick-food" data-food="${encoded}" data-slot="${slot}" data-date="${state.date}">
      <div class="search-result-name">${esc(r.product_name||'Okänt')}</div>
      ${r.brands?`<div class="search-result-brand">${esc(r.brands)}</div>`:''}
      <div class="search-result-macros">${kcal} kcal · P ${prot}g · K ${carb}g · F ${fat}g (per ${per})</div>
    </div>`;
  }).join('');
}

// ─── Modal: pick food quantity ────────────────────────────────────────────────
function buildFoodQuantityModal(food, slot, date) {
  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">${esc(food.name)}</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body">
      ${food.brand?`<div class="text-sm text-muted" style="margin-bottom:12px">${esc(food.brand)}</div>`:''}
      <div class="text-sm text-muted" style="margin-bottom:16px">Per 100g: ${food.kcal_100} kcal · P ${food.protein_100}g · K ${food.carbs_100}g · F ${food.fat_100}g</div>
      <div class="form-group">
        <label class="form-label">Mängd (gram)</label>
        <input id="food-qty" class="form-input" type="number" value="100" min="1" step="1" autofocus>
      </div>
      <div id="food-qty-preview" class="card" style="background:var(--card2);text-align:center;margin-bottom:16px">
        <span id="food-qty-kcal" style="font-size:20px;font-weight:800;color:var(--accent)">0</span>
        <span class="text-muted text-sm"> kcal</span>
        <div class="text-xs text-muted mt-4" id="food-qty-macros"></div>
      </div>
      <button class="btn btn-primary btn-full"
        data-action="confirm-food" data-date="${date}" data-slot="${slot}"
        data-food="${esc(JSON.stringify(food))}">
        Lägg till
      </button>
      <button class="btn btn-ghost btn-full mt-8"
        data-action="fav-food" data-food="${esc(JSON.stringify(food))}">
        ${icon('star',14)} Spara som favorit
      </button>
    </div>`;
}

// ─── Modal: manual meal entry ─────────────────────────────────────────────────
function buildManualMealModal(slot, date) {
  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">Lägg till manuellt</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Namn</label>
        <input id="m-name" class="form-input" type="text" placeholder="t.ex. Havregrynsgröt" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Kalorier (kcal)</label>
        <input id="m-kcal" class="form-input" type="number" min="0" step="1" placeholder="0">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Protein (g)</label>
          <input id="m-prot" class="form-input" type="number" min="0" step="0.1" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">Kolhydrater (g)</label>
          <input id="m-carb" class="form-input" type="number" min="0" step="0.1" placeholder="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Fett (g)</label>
        <input id="m-fat" class="form-input" type="number" min="0" step="0.1" placeholder="0">
      </div>
      <button class="btn btn-primary btn-full"
        data-action="confirm-manual-meal" data-slot="${slot}" data-date="${date}">
        Lägg till
      </button>
    </div>`;
}

// ─── Food search handler ──────────────────────────────────────────────────────
async function searchFood(query, state) {
  if (!query || query.length < 2) return;
  state.foodLoading = true;
  state.foodQuery   = query;
  const resultsEl = document.getElementById('food-results');
  if (resultsEl) resultsEl.innerHTML = `<div class="text-center text-muted text-sm" style="padding:12px">Söker…</div>`;
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,nutriments`;
    const res  = await fetch(url);
    const data = await res.json();
    state.foodResults = (data.products||[]).filter(p=>p.product_name);
    state.foodLoading = false;
    if (resultsEl) resultsEl.innerHTML = buildFoodResults(state);
  } catch(e) {
    state.foodLoading = false;
    state.foodResults = [];
    if (resultsEl) resultsEl.innerHTML = `<div class="text-center text-muted text-sm" style="padding:12px">Sökning misslyckades</div>`;
  }
}
