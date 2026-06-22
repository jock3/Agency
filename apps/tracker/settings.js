// ─── Settings view ────────────────────────────────────────────────────────────
function buildSettings(state) {
  const profile = loadProfile() || {};
  const goals   = loadGoals()   || {};
  const theme   = localStorage.getItem('tracker_theme') || 'dark';

  const actLabel = (ACTIVITY_LEVELS.find(a=>a.id===profile.activity)||ACTIVITY_LEVELS[2]).label;

  return `
    <div class="page-header">
      <div class="page-title">Inställningar</div>
    </div>
    <div style="padding:0 0 24px">
      <!-- Profile -->
      <div class="settings-section">
        <div class="settings-section-title">Profil</div>
        <div class="settings-row" data-action="edit-profile">
          <div class="settings-row-label">Namn</div>
          <div class="settings-row-value">${esc(profile.name||'Ej satt')}</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" data-action="edit-profile">
          <div class="settings-row-label">Kön</div>
          <div class="settings-row-value">${profile.sex==='kvinna'?'Kvinna':'Man'}</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" data-action="edit-profile">
          <div class="settings-row-label">Ålder / Längd / Vikt</div>
          <div class="settings-row-value">${profile.age||'–'} år · ${profile.heightCm||'–'} cm · ${profile.weightKg||'–'} kg</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" data-action="edit-profile">
          <div class="settings-row-label">Aktivitetsnivå</div>
          <div class="settings-row-value">${actLabel}</div>
          ${icon('chevron-right',16)}
        </div>
      </div>

      <!-- Goals -->
      <div class="settings-section">
        <div class="settings-section-title">Mål</div>
        <div class="settings-row" data-action="edit-goals">
          <div class="settings-row-label">Kalorimål</div>
          <div class="settings-row-value">${goals.kcal||'–'} kcal</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" data-action="edit-goals">
          <div class="settings-row-label">Proteinmål</div>
          <div class="settings-row-value">${goals.protein||'–'} g</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" data-action="edit-goals">
          <div class="settings-row-label">Vattenmål</div>
          <div class="settings-row-value">${goals.water||2500} ml</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" data-action="edit-goals">
          <div class="settings-row-label">Stegmål</div>
          <div class="settings-row-value">${goals.steps||8000}</div>
          ${icon('chevron-right',16)}
        </div>
      </div>

      <!-- Appearance -->
      <div class="settings-section">
        <div class="settings-section-title">Utseende</div>
        <div class="settings-row">
          <div class="settings-row-label">${icon('sun',16)} Ljust / Mörkt tema</div>
          <button class="btn btn-secondary btn-sm" data-action="toggle-theme">
            ${theme==='dark'?icon('sun',14)+' Ljust':icon('moon',14)+' Mörkt'}
          </button>
        </div>
      </div>

      <!-- Data -->
      <div class="settings-section">
        <div class="settings-section-title">Data</div>
        <div class="settings-row" style="cursor:pointer" data-action="export-data">
          <div class="settings-row-label">${icon('export',16)} Exportera data</div>
          <div class="settings-row-value">JSON</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" style="cursor:pointer" data-action="import-data">
          <div class="settings-row-label">${icon('import',16)} Importera data</div>
          <div class="settings-row-value">JSON</div>
          ${icon('chevron-right',16)}
        </div>
        <div class="settings-row" style="cursor:pointer" data-action="clear-data">
          <div class="settings-row-label" style="color:var(--red)">${icon('trash',16)} Rensa all data</div>
          ${icon('chevron-right',16)}
        </div>
      </div>

      <div style="padding:0 16px;margin-top:8px">
        <div class="text-xs text-muted text-center" style="padding:12px">
          Track3r · Data lagras lokalt på din enhet
        </div>
      </div>
    </div>`;
}

// ─── Modal: edit profile ──────────────────────────────────────────────────────
function buildProfileModal() {
  const p = loadProfile() || {};
  const actOpts = ACTIVITY_LEVELS.map(a=>
    `<option value="${a.id}"${p.activity===a.id?' selected':''}>${a.label}</option>`).join('');
  const goals = calcGoals(p);

  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">Redigera profil</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Namn</label>
        <input id="p-name" class="form-input" type="text" value="${esc(p.name||'')}" placeholder="Ditt namn">
      </div>
      <div class="form-group">
        <label class="form-label">Kön</label>
        <select id="p-sex" class="form-input">
          <option value="man"${p.sex!=='kvinna'?' selected':''}>Man</option>
          <option value="kvinna"${p.sex==='kvinna'?' selected':''}>Kvinna</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Ålder</label>
          <input id="p-age" class="form-input" type="number" value="${p.age||''}" placeholder="25">
        </div>
        <div class="form-group">
          <label class="form-label">Längd (cm)</label>
          <input id="p-height" class="form-input" type="number" value="${p.heightCm||''}" placeholder="175">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vikt (kg)</label>
          <input id="p-weight" class="form-input" type="number" step="0.1" value="${p.weightKg||''}" placeholder="75">
        </div>
        <div class="form-group">
          <label class="form-label">Målvikt (kg)</label>
          <input id="p-goalweight" class="form-input" type="number" step="0.1" value="${p.goalWeightKg||''}" placeholder="70">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Aktivitetsnivå</label>
        <select id="p-activity" class="form-input">${actOpts}</select>
      </div>
      <div id="goals-preview" class="card" style="background:var(--card2);text-align:center;margin-bottom:16px">
        <div style="font-size:18px;font-weight:800;color:var(--accent)">${goals.kcal} kcal</div>
        <div class="text-xs text-muted mt-4">P ${goals.protein}g · K ${goals.carbs}g · F ${goals.fat}g</div>
      </div>
      <button class="btn btn-primary btn-full" data-action="save-profile">
        Spara & beräkna mål
      </button>
    </div>`;
}

// ─── Modal: edit goals manually ───────────────────────────────────────────────
function buildGoalsModal() {
  const g = loadGoals() || calcGoals(loadProfile());
  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">Redigera mål</span>
      <button class="icon-btn" data-action="close-modal">${icon('x')}</button>
    </div>
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kalorier (kcal)</label>
          <input id="g-kcal" class="form-input" type="number" value="${g.kcal||2000}">
        </div>
        <div class="form-group">
          <label class="form-label">Protein (g)</label>
          <input id="g-prot" class="form-input" type="number" value="${g.protein||150}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Kolhydrater (g)</label>
          <input id="g-carb" class="form-input" type="number" value="${g.carbs||200}">
        </div>
        <div class="form-group">
          <label class="form-label">Fett (g)</label>
          <input id="g-fat" class="form-input" type="number" value="${g.fat||65}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vatten (ml)</label>
          <input id="g-water" class="form-input" type="number" value="${g.water||2500}">
        </div>
        <div class="form-group">
          <label class="form-label">Stegmål</label>
          <input id="g-steps" class="form-input" type="number" value="${g.steps||8000}">
        </div>
      </div>
      <button class="btn btn-primary btn-full" data-action="save-goals">Spara mål</button>
    </div>`;
}

// ─── Modal: onboarding (first run) ───────────────────────────────────────────
function buildOnboardingModal() {
  const actOpts = ACTIVITY_LEVELS.map(a=>
    `<option value="${a.id}"${a.id==='moderate'?' selected':''}>${a.label}</option>`).join('');
  return `
    <div class="modal-handle"></div>
    <div class="modal-header">
      <span class="modal-title">Välkommen till Track3r</span>
    </div>
    <div class="modal-body">
      <div class="text-sm text-muted" style="margin-bottom:16px">Fyll i dina uppgifter för att beräkna dina mål.</div>
      <div class="form-group">
        <label class="form-label">Ditt namn</label>
        <input id="p-name" class="form-input" type="text" placeholder="Namn" autofocus>
      </div>
      <div class="form-group">
        <label class="form-label">Kön</label>
        <select id="p-sex" class="form-input">
          <option value="man">Man</option>
          <option value="kvinna">Kvinna</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Ålder</label>
          <input id="p-age" class="form-input" type="number" placeholder="25" min="10" max="100">
        </div>
        <div class="form-group">
          <label class="form-label">Längd (cm)</label>
          <input id="p-height" class="form-input" type="number" placeholder="175">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vikt (kg)</label>
          <input id="p-weight" class="form-input" type="number" step="0.1" placeholder="75">
        </div>
        <div class="form-group">
          <label class="form-label">Målvikt (kg)</label>
          <input id="p-goalweight" class="form-input" type="number" step="0.1" placeholder="70">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Aktivitetsnivå</label>
        <select id="p-activity" class="form-input">${actOpts}</select>
      </div>
      <button class="btn btn-primary btn-full" data-action="save-profile">
        Kom igång
      </button>
    </div>`;
}
