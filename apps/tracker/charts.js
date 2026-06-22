// ─── SVG Chart Utilities ──────────────────────────────────────────────────────

function ringChart(container, value, max, color, label, sublabel) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 36, cx = 44, cy = 44, stroke = 8;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const over = value > max && max > 0;
  const fill = over ? 'var(--amber)' : color;
  container.innerHTML = `
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="var(--border-strong)" stroke-width="${stroke}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
        stroke="${fill}" stroke-width="${stroke}"
        stroke-linecap="round"
        stroke-dasharray="${dash} ${circ}"
        stroke-dashoffset="${circ * 0.25}"
        transform="rotate(-90 ${cx} ${cy})"
        style="transition:stroke-dasharray .4s ease"/>
      <text x="${cx}" y="${cy - 6}" text-anchor="middle"
        font-size="14" font-weight="700" fill="var(--text)" font-family="var(--font)">${label}</text>
      <text x="${cx}" y="${cy + 11}" text-anchor="middle"
        font-size="10" fill="var(--muted)" font-family="var(--font)">${sublabel}</text>
    </svg>`;
}

function macroBar(container, value, max, color) {
  const pct = max > 0 ? Math.min(value / max, 1) * 100 : 0;
  container.innerHTML = `
    <div class="macro-bar-track">
      <div class="macro-bar-fill" style="width:${pct}%;background:${color};transition:width .4s ease"></div>
    </div>`;
}

function lineChart(container, points, opts = {}) {
  if (!points || points.length < 2) {
    container.innerHTML = `<div class="chart-empty">Inte tillräckligt med data</div>`;
    return;
  }
  const w = opts.width  || container.clientWidth  || 300;
  const h = opts.height || 140;
  const pad = { t:12, r:8, b:28, l:44 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const vals = points.map(p => p.value);
  const min = opts.min !== undefined ? opts.min : Math.min(...vals) * 0.95;
  const max = opts.max !== undefined ? opts.max : Math.max(...vals) * 1.05;
  const range = max - min || 1;

  const toX = (i) => pad.l + (i / (points.length - 1)) * iw;
  const toY = (v) => pad.t + ih - ((v - min) / range) * ih;

  const pathD = points.map((p, i) => `${i===0?'M':'L'}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${toX(points.length-1).toFixed(1)},${(pad.t+ih).toFixed(1)} L${toX(0).toFixed(1)},${(pad.t+ih).toFixed(1)} Z`;

  // Y-axis labels
  const yTicks = 4;
  let yLabels = '';
  for (let i=0; i<=yTicks; i++) {
    const v = min + (range / yTicks) * i;
    const y = toY(v);
    yLabels += `<text x="${pad.l-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--muted)">${v.toFixed(1)}</text>`;
    yLabels += `<line x1="${pad.l}" y1="${y}" x2="${pad.l+iw}" y2="${y}" stroke="var(--border)" stroke-width="1"/>`;
  }

  // X-axis labels (first, mid, last)
  let xLabels = '';
  const xIdxs = [0, Math.floor((points.length-1)/2), points.length-1];
  for (const i of xIdxs) {
    const lbl = points[i].date.slice(5); // MM-DD
    xLabels += `<text x="${toX(i)}" y="${h-6}" text-anchor="middle" font-size="10" fill="var(--muted)">${lbl}</text>`;
  }

  // Dots on last and max
  const maxIdx = vals.indexOf(Math.max(...vals));
  let dots = `<circle cx="${toX(points.length-1)}" cy="${toY(vals[vals.length-1])}" r="4" fill="${opts.color||'var(--accent)'}"/>`;
  if (maxIdx !== points.length-1) {
    dots += `<circle cx="${toX(maxIdx)}" cy="${toY(vals[maxIdx])}" r="3" fill="${opts.color||'var(--accent)'}"/>`;
  }

  container.innerHTML = `
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">
      <defs>
        <linearGradient id="lg${opts.id||'0'}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${opts.color||'var(--accent)'}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${opts.color||'var(--accent)'}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${yLabels}
      <path d="${areaD}" fill="url(#lg${opts.id||'0'})"/>
      <path d="${pathD}" fill="none" stroke="${opts.color||'var(--accent)'}" stroke-width="2" stroke-linejoin="round"/>
      ${xLabels}
      ${dots}
    </svg>`;
}

function barChart(container, data, opts = {}) {
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="chart-empty">Ingen data</div>`;
    return;
  }
  const w = opts.width  || container.clientWidth || 300;
  const h = opts.height || 120;
  const pad = { t:8, r:8, b:28, l:8 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const maxVal = Math.max(...data.map(d=>d.value), 1);
  const bw = (iw / data.length) * 0.6;
  const gap = (iw / data.length) * 0.4;
  const color = opts.color || 'var(--teal)';

  let bars = '';
  data.forEach((d, i) => {
    const bh = (d.value / maxVal) * ih;
    const x = pad.l + i * (iw / data.length) + gap / 2;
    const y = pad.t + ih - bh;
    const active = d.active || isToday(d.date);
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(bh,2).toFixed(1)}"
      rx="3" fill="${active?'var(--accent)':color}" opacity="${active?1:0.7}"/>`;
    const lbl = d.label || (d.date ? parseDate(d.date).toLocaleDateString('sv-SE',{weekday:'narrow'}) : '');
    bars += `<text x="${(x+bw/2).toFixed(1)}" y="${h-6}" text-anchor="middle" font-size="10" fill="var(--muted)">${lbl}</text>`;
  });

  container.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`;
}

function calendarGrid(container, yearMonth, daysMap, goals) {
  const [year, month] = yearMonth.split('-').map(Number);
  const firstDay = new Date(year, month-1, 1);
  const lastDay  = new Date(year, month, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const daysInMonth = lastDay.getDate();
  const todayStr = today();

  const dayNames = ['Mån','Tis','Ons','Tor','Fre','Lör','Sön'];
  let html = '<div class="cal-grid">';
  html += dayNames.map(d=>`<div class="cal-header">${d}</div>`).join('');

  // empty cells before first day
  for (let i=0; i<startDow; i++) html += '<div class="cal-cell cal-empty"></div>';

  for (let day=1; day<=daysInMonth; day++) {
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const d = daysMap[ds];
    const hasWorkout = d && d.workouts && d.workouts.length > 0;
    const hasMeals   = d && d.meals   && d.meals.length > 0;
    const isT = ds === todayStr;
    const isFuture = ds > todayStr;
    let cls = 'cal-cell';
    if (isT) cls += ' cal-today';
    if (isFuture) cls += ' cal-future';
    let dots = '';
    if (hasWorkout) dots += '<span class="cal-dot cal-dot-workout"></span>';
    if (hasMeals)   dots += '<span class="cal-dot cal-dot-meal"></span>';
    html += `<div class="${cls}" data-action="day-detail" data-date="${ds}">
      <span class="cal-day-num">${day}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}
