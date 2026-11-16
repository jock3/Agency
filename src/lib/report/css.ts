/**
 * Sidornas CSS (A4 liggande, 1123 × 794 px) som en sträng, så att samma stilar
 * kan läggas in både i editorn och i PDF-sidan som Chromium renderar.
 * Alla klasser har prefixet rp- för att inte krocka med resten av Agency.
 * Bara hex och rgba: html2canvas och äldre renderare klarar inte oklch() eller color-mix().
 * Färgerna är Milous och är desamma i ljust och mörkt läge.
 */
export const PAGE_W = 1123;
export const PAGE_H = 794;

export const FONT_LINK = "https://fonts.googleapis.com/css2?family=REM:wght@300;400;500;600;700;800&display=swap";

export const PAGE_CSS = `
.rp-page,.rp-page *{box-sizing:border-box}
.rp-page{width:1123px;height:794px;position:relative;overflow:hidden;background:#FFFFFF;color:#1C1C1C;font-family:'REM',ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.4;padding:56px 64px 84px;display:flex;flex-direction:column;text-align:left;-webkit-font-smoothing:antialiased}
.rp-page h1,.rp-page h2,.rp-page h3,.rp-page p{margin:0}
.rp-pg-foot{position:absolute;left:64px;right:64px;bottom:30px;display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #E8E4E4;font-size:11px;color:#6C6C6C}
.rp-pg-foot b{color:#1C1C1C;font-weight:600;margin-left:14px}
.rp-pg-head{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin-bottom:30px;flex:none}
.rp-pg-eyebrow{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E60330;margin-bottom:10px}
.rp-pg-title{font-size:36px;font-weight:700;line-height:1.08;letter-spacing:-.015em}
.rp-pg-sub{font-size:15px;color:#6C6C6C;margin-top:10px;max-width:660px}
.rp-pg-badge{flex:none;font-size:12px;font-weight:500;color:#1C1C1C;background:#F2F2F2;border-radius:999px;padding:7px 14px;margin-bottom:4px;white-space:nowrap}
.rp-pg-empty{margin-top:24px;padding:28px;border:1.5px dashed #D9D3D3;border-radius:10px;color:#6C6C6C;font-size:15px}

.rp-page.rp-cover{background:#E60330;background-image:linear-gradient(135deg,#E60330 0%,#9C3C6F 100%);color:#FFFFFF;padding:60px 72px;justify-content:space-between}
.rp-cv-ring{position:absolute;border-radius:50%;border:2px solid rgba(255,222,208,.35)}
.rp-cv-ring.rp-r1{width:640px;height:640px;right:-180px;top:-200px}
.rp-cv-ring.rp-r2{width:390px;height:390px;right:-55px;top:-75px;border-color:rgba(255,222,208,.22)}
.rp-cv-dot{position:absolute;width:150px;height:150px;border-radius:50%;background:rgba(255,222,208,.16);right:130px;bottom:110px}
.rp-cv-top{position:relative;display:flex;justify-content:space-between;font-size:13px;font-weight:600;letter-spacing:.03em}
.rp-cv-top span + span{font-weight:400;color:rgba(255,255,255,.82)}
.rp-cv-main{position:relative;max-width:780px}
.rp-cv-kicker{font-size:14px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#FFDED0;margin-bottom:22px}
.rp-cv-client{font-size:76px;font-weight:800;line-height:.98;letter-spacing:-.025em}
.rp-cv-campaign{font-size:32px;font-weight:500;margin-top:18px;line-height:1.15}
.rp-cv-period{display:inline-block;font-size:15px;margin-top:24px;color:#FFFFFF;border:1px solid rgba(255,255,255,.5);border-radius:999px;padding:6px 16px}

.rp-kpi-grid{display:grid;gap:26px 30px}
.rp-kpi-card{border-top:3px solid #E60330;padding-top:14px}
.rp-kpi-abbr{font-size:22px;font-weight:700;line-height:1.1}
.rp-kpi-name{font-size:12px;color:#6C6C6C;margin-top:3px}
.rp-kpi-desc{font-size:13px;line-height:1.5;color:#2B2B2B;margin:9px 0 11px}
.rp-kpi-formula{display:inline-block;font-size:11px;font-weight:500;padding:3px 9px;border-radius:999px;background:#FFDED0;color:#931644}
.rp-kpi-formula.rp-raw{background:#F2F2F2;color:#6C6C6C}
.rp-kpi-grid.rp-dense{gap:16px 26px}
.rp-kpi-grid.rp-dense .rp-kpi-desc{font-size:12px;margin:6px 0 8px}

.rp-st{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.rp-st th{font-size:11px;font-weight:600;color:#6C6C6C;text-align:right;padding:0 12px 10px;border-bottom:2px solid #1C1C1C;vertical-align:bottom;line-height:1.25}
.rp-st td{padding:10px 12px;font-size:13.5px;text-align:right;border-bottom:1px solid #ECE8E8;white-space:nowrap}
.rp-st th:first-child,.rp-st td:first-child{text-align:left;padding-left:14px;white-space:normal;border-left:3px solid transparent}
.rp-st-plat td{background:#F5F3F3;font-weight:600;font-size:14.5px;padding-top:12px;padding-bottom:12px}
.rp-st-plat td:first-child{border-left-color:#E60330;font-size:16px;font-weight:700}
.rp-pl-cell{display:flex;align-items:center;gap:12px}
.rp-pl-logo{width:30px;height:30px;border-radius:7px;background:#FFFFFF;border:1px solid #E3DEDE;display:flex;align-items:center;justify-content:center;flex:none;overflow:hidden;font-size:13px;font-weight:700;color:#1C1C1C;line-height:1}
.rp-pl-logo img{width:24px;height:24px;display:block}
.rp-pl-logo.rp-sm{width:20px;height:20px;border-radius:5px;font-size:10px}
.rp-pl-logo.rp-sm img{width:16px;height:16px}
.rp-st-row td:first-child{font-weight:600}
.rp-st-ad td{font-size:13px;color:#2B2B2B}
.rp-st-ad td:first-child{padding-left:40px}
.rp-ad-dot{display:inline-block;width:7px;height:7px;border-radius:50%;border:1.5px solid #AAAAAA;margin-right:9px;vertical-align:1px}
.rp-st-total td{font-weight:700;border-bottom:0;border-top:2px solid #1C1C1C;background:#FFDED0}
.rp-st.rp-compact td{padding-top:5px;padding-bottom:5px;font-size:12px}
.rp-st.rp-compact .rp-st-plat td{padding-top:8px;padding-bottom:8px;font-size:13px}
.rp-st.rp-compact .rp-st-plat td:first-child{font-size:14px}
.rp-st.rp-compact .rp-pl-logo{width:24px;height:24px}
.rp-st.rp-compact .rp-pl-logo img{width:19px;height:19px}
.rp-st-notes{margin-top:14px;font-size:11px;color:#6C6C6C;line-height:1.55;max-width:880px}

.rp-page.rp-comment{flex-direction:row;padding:0}
.rp-cm-side{width:38%;background:#FFDED0;padding:56px 44px 84px 64px;flex:none}
.rp-cm-side .rp-pg-eyebrow{color:#931644}
.rp-cm-title{font-size:38px;font-weight:700;line-height:1.1;letter-spacing:-.015em}
.rp-cm-body{flex:1;padding:62px 72px 96px 56px;font-size:16px;line-height:1.65;color:#2B2B2B}
.rp-cm-body p + p,.rp-cm-body ul + p{margin-top:14px}
.rp-cm-body ul{margin:8px 0 0;padding:0;list-style:none}
.rp-cm-body li{position:relative;padding-left:20px;margin-top:6px}
.rp-cm-body li .rp-d{position:absolute;left:0;top:10px;width:8px;height:8px;border-radius:2px;background:#E60330}
.rp-page.rp-comment .rp-pg-foot{left:calc(38% + 56px)}

.rp-page.rp-summary .rp-pg-head{margin-bottom:22px}
.rp-sm-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;flex:none}
.rp-sm-tile{background:#F2F2F2;border-radius:10px;padding:14px 18px}
.rp-sm-tile.rp-hero{background:#1C1C1C;color:#FFFFFF}
.rp-sm-tile-l{font-size:12px;color:#6C6C6C}
.rp-sm-tile.rp-hero .rp-sm-tile-l{color:#AAAAAA}
.rp-sm-tile-v{font-size:27px;font-weight:700;margin-top:4px;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap}
.rp-sm-bottom{display:grid;gap:44px;margin-top:24px;min-height:0}
.rp-sm-h{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6C6C6C;margin-bottom:12px}
.rp-bar-row + .rp-bar-row{margin-top:11px}
.rp-bar-top{display:flex;justify-content:space-between;align-items:center;font-size:13px;gap:12px}
.rp-bar-name{display:flex;align-items:center;gap:8px;font-weight:600}
.rp-bar-top span{color:#6C6C6C;font-variant-numeric:tabular-nums}
.rp-bar-track{height:8px;background:#F2F2F2;border-radius:4px;margin-top:5px;overflow:hidden}
.rp-bar-fill{height:8px;background:#E60330;border-radius:4px}
.rp-ins{list-style:none;margin:0;padding:0}
.rp-ins li{display:flex;gap:10px;align-items:baseline;font-size:13.5px;line-height:1.45;padding:7px 0;border-bottom:1px solid #ECE8E8}
.rp-ins li:first-child{padding-top:0}
.rp-ins b{font-weight:700}
.rp-ins-dot{flex:none;width:7px;height:7px;border-radius:2px;background:#E60330}
.rp-sm-concl{margin-top:14px;font-size:14px;line-height:1.55;color:#2B2B2B;border-left:3px solid #E60330;padding-left:12px}
`;
