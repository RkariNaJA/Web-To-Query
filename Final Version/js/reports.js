// ── Show Full Error ────────────────────────────────────────────────
function showFullError() {
  if (!lastListRows.length) return;

  // Group rows by PO
  const poGroups = {};
  lastListRows.forEach(r => {
    const poid = getVal(r, 'PURCHID') || '(unknown)';
    if (!poGroups[poid]) poGroups[poid] = [];
    poGroups[poid].push(r);
  });

  // Build per-PO sections
  const sections = Object.entries(poGroups).map(([poid, prows]) => {
    // Count ITEMID occurrences within this PO to detect duplicates
    const itemCount = {};
    prows.forEach(r => {
      const item = getVal(r, 'ITEMID') || '';
      if (item) itemCount[item] = (itemCount[item] || 0) + 1;
    });

    const tableRows = prows.map(r => {
      const line = getVal(r, 'LINENUMBER') ?? '—';
      const item = getVal(r, 'ITEMID') ?? '—';
      const size = getVal(r, 'INVENTSIZEID') ?? '—';
      const color = getVal(r, 'INVENTCOLORID') ?? '—';
      const season = getVal(r, 'INVENTSEASONID') ?? '—';
      const qty = getVal(r, 'PURCHQTY') ?? '—';
      const price = getVal(r, 'PURCHPRICE') ?? '—';
      const isDup = item !== '—' && itemCount[item] > 1;

      const statusBadge = isDup
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">⧉ DUPLICATE</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">✕ ERROR</span>`;

      const rowStyle = isDup ? 'background:rgba(251,146,60,0.05);' : '';

      return `<tr style="${rowStyle}">
        <td style="color:#f0c060;">${line}</td>
        <td style="color:${isDup ? '#fb923c' : '#e2e6f0'};font-weight:${isDup ? 600 : 400};">${item}</td>
        <td>${size}</td>
        <td style="color:#a78bfa;">${color}</td>
        <td style="color:#2dd4bf;">${season}</td>
        <td style="color:#f0c060;">${qty !== '—' ? parseFloat(qty).toFixed(0) : '—'}</td>
        <td>${price !== '—' ? parseFloat(price).toFixed(5) : '—'}</td>
        <td>${statusBadge}</td>
      </tr>`;
    }).join('');

    const dupCount = prows.filter(r => { const i = getVal(r, 'ITEMID') || ''; return i && itemCount[i] > 1; }).length;
    const errOnly = prows.length - dupCount;

    return `
      <div style="margin-bottom:32px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#4f9cf9;">${poid}</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">${prows.length} ERROR LINE${prows.length !== 1 ? 'S' : ''}</span>
          ${dupCount > 0 ? `<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">${dupCount} DUPLICATE${dupCount !== 1 ? 'S' : ''}</span>` : ''}
          <div style="flex:1;height:1px;background:#252a38;"></div>
        </div>
        <div style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
            <thead>
              <tr style="background:#1a1e28;">
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">LINE</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">ITEM ID</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">SIZE</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">COLOR</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">SEASON</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">QTY</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">PRICE</th>
                <th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">STATUS</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  const totalLines = lastListRows.length;
  const totalPOs = Object.keys(poGroups).length;

  const theme = localStorage.getItem('po_theme') || 'dark';
  const html = `<!DOCTYPE html>
<html lang="en"${theme !== 'dark' ? ` data-theme="${theme}"` : ''}>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Full Error Report</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#0d0f14;color:#e2e6f0;font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(79,156,249,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,156,249,0.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
    .wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;}
    tbody tr{border-bottom:1px solid #252a38;}
    tbody tr:last-child{border-bottom:none;}
    tbody tr:hover{background:#1a1e28 !important;}
    tbody td{padding:9px 14px;color:#e2e6f0;white-space:nowrap;vertical-align:middle;}
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#3a4258;border-radius:3px;}
    html[data-theme="light"] body{background:#eef1f9 !important;color:#1e2d4a !important;}
    html[data-theme="light"] body::before{background-image:linear-gradient(rgba(45,122,239,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(45,122,239,0.05) 1px,transparent 1px) !important;}
    html[data-theme="light"] tbody tr{border-bottom:1px solid #c6cde2 !important;}
    html[data-theme="light"] tbody tr:hover{background:rgba(45,122,239,0.04) !important;}
    html[data-theme="light"] tbody td{color:#1e2d4a !important;}
    html[data-theme="light"] thead tr{background:#eaedf8 !important;}
    html[data-theme="light"] td[colspan]{background:#eaedf8 !important;border-top-color:#a4adc8 !important;border-bottom-color:#c6cde2 !important;}
    html[data-theme="light"] button{background:#f6f8fd !important;border-color:#a4adc8 !important;color:#546080 !important;}
    html[data-theme="light"] ::-webkit-scrollbar-thumb{background:#a4adc8 !important;}
    html[data-theme="space"] body{background:#07051a !important;color:#c8bbf0 !important;}
    html[data-theme="space"] body::before{background-image:linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px) !important;}
    html[data-theme="space"] tbody tr{border-bottom:1px solid #251d4a !important;}
    html[data-theme="space"] tbody tr:hover{background:rgba(139,92,246,0.07) !important;}
    html[data-theme="space"] tbody td{color:#c8bbf0 !important;}
    html[data-theme="space"] thead tr{background:#120f2e !important;}
    html[data-theme="space"] td[colspan]{background:#0d0a24 !important;border-top-color:#3d3070 !important;border-bottom-color:#251d4a !important;}
    html[data-theme="space"] button{background:#120f2e !important;border-color:#3d3070 !important;color:#7e6db5 !important;}
    html[data-theme="space"] ::-webkit-scrollbar-thumb{background:#3d3070 !important;}
  </style>
</head>
<body>
  <div class="wrap">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #252a38;">
      <div style="width:32px;height:32px;background:#4f9cf9;border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;">⬡</div>
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">FULL ERROR REPORT</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-top:3px;">${totalLines} error line${totalLines !== 1 ? 's' : ''} across ${totalPOs} PO${totalPOs !== 1 ? 's' : ''}</div>
      </div>
      <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:#1a1e28;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
    </div>
    ${sections}
  </div>
  <script>
    (function(){
      const t=document.documentElement.getAttribute('data-theme');
      if(t==='light'){const m={'#0d0f14':'#eef1f9','#13161d':'#eaedf8','#1a1e28':'#f0f2f8','#252a38':'#c6cde2','#3a4258':'#a4adc8','#e2e6f0':'#1e2d4a','#6b7494':'#546080'};document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});}
      else if(t==='space'){const m={'#0d0f14':'#07051a','#13161d':'#0d0a24','#1a1e28':'#120f2e','#252a38':'#251d4a','#3a4258':'#3d3070','#e2e6f0':'#c8bbf0','#6b7494':'#7e6db5','#4f9cf9':'#c77dff','#f66':'#ff6b9d','#f87171':'#ff6b9d','#fb923c':'#ff9e64','#f0c060':'#ffe66d','#a78bfa':'#e0aaff','#3ecf8e':'#72efdd','#2dd4bf':'#72efdd'};document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});}
    })();
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── Error Summarize ────────────────────────────────────────────────
function showErrorSummary() {
  if (!lastListRows.length) return;

  const uniqFrom = (arr, key) =>
    [...new Set(arr.map(r => getVal(r, key)).filter(v => v && v !== '—'))].join(', ') || '—';

  // Group rows by PO → then by ITEMID
  const poGroups = {};
  lastListRows.forEach(r => {
    const poid = getVal(r, 'PURCHID') || '(unknown)';
    if (!poGroups[poid]) poGroups[poid] = [];
    poGroups[poid].push(r);
  });

  const totalPOs = Object.keys(poGroups).length;
  const totalItems = Object.values(poGroups).reduce((s, prows) =>
    s + new Set(prows.map(r => getVal(r, 'ITEMID'))).size, 0);

  // Build all tbody rows — one PO group header row + item rows per PO, sorted by EXEC ID
  const tbodyRows = Object.entries(poGroups)
    .sort(([, a], [, b]) => {
      const execA = [...new Set(a.map(r => getVal(r, 'EXECUTIONID')).filter(Boolean))].join(', ');
      const execB = [...new Set(b.map(r => getVal(r, 'EXECUTIONID')).filter(Boolean))].join(', ');
      return execA.localeCompare(execB);
    })
    .map(([poid, prows]) => {
      const itemGroups = {};
      prows.forEach(r => {
        const item = getVal(r, 'ITEMID') || '(unknown)';
        if (!itemGroups[item]) itemGroups[item] = [];
        itemGroups[item].push(r);
      });

      const dupItems = Object.values(itemGroups).filter(a => a.length > 1).length;
      const execId = [...new Set(prows.map(r => getVal(r, 'EXECUTIONID')).filter(v => v && v !== '—'))].join(', ') || '—';

      // PO group header row (spans all 7 columns)
      const groupRow = `<tr>
      <td colspan="7" style="padding:10px 14px;background:#13161d;border-top:2px solid #3a4258;border-bottom:1px solid #252a38;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#4f9cf9;">${poid}</span>
        <span style="margin-left:8px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;">·</span>
        <span style="margin-left:8px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#e2e6f0;">${execId}</span>
        <span style="margin-left:10px;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">${prows.length} ERROR LINE${prows.length !== 1 ? 'S' : ''}</span>
        <span style="margin-left:6px;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(79,156,249,0.1);color:#4f9cf9;border:1px solid rgba(79,156,249,0.25);">${Object.keys(itemGroups).length} ITEM${Object.keys(itemGroups).length !== 1 ? 'S' : ''}</span>
        ${dupItems > 0 ? `<span style="margin-left:6px;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">${dupItems} DUPLICATE${dupItems !== 1 ? 'S' : ''}</span>` : ''}
      </td>
    </tr>`;

      const itemRows = Object.entries(itemGroups).map(([item, irows]) => {
        const lineNums = irows.map(r => getVal(r, 'LINENUMBER') ?? '—').join(', ');
        const sizes = uniqFrom(irows, 'INVENTSIZEID');
        const colors = uniqFrom(irows, 'INVENTCOLORID');
        const seasons = uniqFrom(irows, 'INVENTSEASONID');
        const isDup = irows.length > 1;

        const statusBadge = isDup
          ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);white-space:nowrap;">⧉ DUPLICATE ×${irows.length}</span>`
          : `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);white-space:nowrap;">✕ ERROR</span>`;

        const rowBg = isDup ? 'background:rgba(251,146,60,0.04);' : '';

        return `<tr style="${rowBg}">
        <td style="color:#4f9cf9;font-weight:600;padding-left:28px;">${item}</td>
        <td style="color:#f0c060;text-align:center;">${irows.length}</td>
        <td style="color:#6b7494;font-size:11px;">${lineNums}</td>
        <td style="color:#f0c060;">${sizes}</td>
        <td style="color:#a78bfa;">${colors}</td>
        <td style="color:#2dd4bf;">${seasons}</td>
        <td>${statusBadge}</td>
      </tr>`;
      }).join('');

      return groupRow + itemRows;
    }).join('');

  const th = txt => `<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">${txt}</th>`;

  const theme = localStorage.getItem('po_theme') || 'dark';
  const html = `<!DOCTYPE html>
<html lang="en"${theme !== 'dark' ? ` data-theme="${theme}"` : ''}>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Error Summary</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#0d0f14;color:#e2e6f0;font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(79,156,249,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,156,249,0.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
    .wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;}
    tbody tr{border-bottom:1px solid #252a38;}
    tbody tr:last-child{border-bottom:none;}
    tbody tr:hover td{background:rgba(255,255,255,0.02);}
    tbody td{padding:9px 14px;color:#e2e6f0;vertical-align:middle;}
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#3a4258;border-radius:3px;}
    html[data-theme="light"] body{background:#eef1f9 !important;color:#1e2d4a !important;}
    html[data-theme="light"] body::before{background-image:linear-gradient(rgba(45,122,239,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(45,122,239,0.05) 1px,transparent 1px) !important;}
    html[data-theme="light"] tbody tr{border-bottom:1px solid #c6cde2 !important;}
    html[data-theme="light"] tbody tr:hover td{background:rgba(45,122,239,0.04) !important;}
    html[data-theme="light"] tbody td{color:#1e2d4a !important;}
    html[data-theme="light"] thead tr{background:#eaedf8 !important;}
    html[data-theme="light"] td[colspan]{background:#eaedf8 !important;border-top-color:#a4adc8 !important;border-bottom-color:#c6cde2 !important;}
    html[data-theme="light"] button{background:#f6f8fd !important;border-color:#a4adc8 !important;color:#546080 !important;}
    html[data-theme="light"] ::-webkit-scrollbar-thumb{background:#a4adc8 !important;}
    html[data-theme="space"] body{background:#07051a !important;color:#c8bbf0 !important;}
    html[data-theme="space"] body::before{background-image:linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px) !important;}
    html[data-theme="space"] tbody tr{border-bottom:1px solid #251d4a !important;}
    html[data-theme="space"] tbody tr:hover td{background:rgba(139,92,246,0.06) !important;}
    html[data-theme="space"] tbody td{color:#c8bbf0 !important;}
    html[data-theme="space"] thead tr{background:#120f2e !important;}
    html[data-theme="space"] td[colspan]{background:#0d0a24 !important;border-top-color:#3d3070 !important;border-bottom-color:#251d4a !important;}
    html[data-theme="space"] button{background:#120f2e !important;border-color:#3d3070 !important;color:#7e6db5 !important;}
    html[data-theme="space"] ::-webkit-scrollbar-thumb{background:#3d3070 !important;}
  </style>
</head>
<body>
  <div class="wrap">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #252a38;">
      <div style="width:32px;height:32px;background:#fb923c;border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;">≡</div>
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">ERROR SUMMARY</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-top:3px;">${totalPOs} PO${totalPOs !== 1 ? 's' : ''} · ${totalItems} unique item${totalItems !== 1 ? 's' : ''} with errors</div>
      </div>
      <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:#1a1e28;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:16px 0 20px;">
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">PO</div>
        <input id="f-po" oninput="applyFilter()" placeholder="Type to filter..." style="background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;min-width:160px;" autocomplete="off" spellcheck="false"/></div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Line No</div>
        <input id="f-line" oninput="applyFilter()" placeholder="e.g. 1" style="background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;min-width:80px;" autocomplete="off" spellcheck="false"/></div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Item</div>
        <input id="f-item" oninput="applyFilter()" placeholder="Type to filter..." style="background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;min-width:140px;" autocomplete="off" spellcheck="false"/></div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Size</div>
        <select id="f-size" onchange="applyFilter()" style="background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;min-width:110px;"><option value="">All</option>${[...new Set(lastListRows.map(r => getVal(r, 'INVENTSIZEID')).filter(v => v && v !== '—'))].sort().map(v => `<option value="${v}">${v}</option>`).join('')}</select></div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Color</div>
        <select id="f-color" onchange="applyFilter()" style="background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;min-width:110px;"><option value="">All</option>${[...new Set(lastListRows.map(r => getVal(r, 'INVENTCOLORID')).filter(v => v && v !== '—'))].sort().map(v => `<option value="${v}">${v}</option>`).join('')}</select></div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;">Season</div>
        <select id="f-season" onchange="applyFilter()" style="background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;min-width:110px;"><option value="">All</option>${[...new Set(lastListRows.map(r => getVal(r, 'INVENTSEASONID')).filter(v => v && v !== '—'))].sort().map(v => `<option value="${v}">${v}</option>`).join('')}</select></div>
      <button onclick="['f-po','f-line','f-item','f-size','f-color','f-season'].forEach(id=>document.getElementById(id).value='');applyFilter();"
        style="align-self:flex-end;padding:5px 12px;background:#13161d;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
      <span id="row-count" style="align-self:flex-end;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-left:auto;">${lastListRows.length} rows</span>
    </div>
    <div style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
        <thead>
          <tr style="background:#1a1e28;">
            ${th('ITEM ID')}${th('ERROR LINES')}${th('LINE NO.')}${th('SIZES')}${th('COLORS')}${th('SEASONS')}${th('STATUS')}
          </tr>
        </thead>
        <tbody id="error-sum-tbody"></tbody>
      </table>
    </div>
  </div>
  <script>
    const ALL_ROWS = ${JSON.stringify(lastListRows)};

    function gv(r,key){var k=key.toLowerCase();for(var j in r)if(j.toLowerCase()===k)return r[j];return undefined;}
    function uFrom(rows,key){return[...new Set(rows.map(function(r){return gv(r,key);}).filter(function(v){return v&&v!=='—';}))].join(', ')||'—';}

    function buildTable(rows){
      var poGroups={};
      rows.forEach(function(r){var poid=gv(r,'PURCHID')||'(unknown)';if(!poGroups[poid])poGroups[poid]=[];poGroups[poid].push(r);});
      var html=Object.entries(poGroups).sort(function(a,b){
        var ea=[...new Set(a[1].map(function(r){return gv(r,'EXECUTIONID');}).filter(Boolean))].join(', ');
        var eb=[...new Set(b[1].map(function(r){return gv(r,'EXECUTIONID');}).filter(Boolean))].join(', ');
        return ea.localeCompare(eb);
      }).map(function(e){
        var poid=e[0],prows=e[1];
        var itemGroups={};
        prows.forEach(function(r){var item=gv(r,'ITEMID')||'(unknown)';if(!itemGroups[item])itemGroups[item]=[];itemGroups[item].push(r);});
        var dupItems=Object.values(itemGroups).filter(function(a){return a.length>1;}).length;
        var execId=[...new Set(prows.map(function(r){return gv(r,'EXECUTIONID');}).filter(function(v){return v&&v!=='—';}))].join(', ')||'—';
        var groupRow='<tr><td colspan="7" style="padding:10px 14px;background:#13161d;border-top:2px solid #3a4258;border-bottom:1px solid #252a38;">'+
          '<span style="font-family:IBM Plex Mono,monospace;font-size:12px;font-weight:600;color:#4f9cf9;">'+poid+'</span>'+
          '<span style="margin-left:8px;font-family:IBM Plex Mono,monospace;font-size:11px;color:#6b7494;">\xB7</span>'+
          '<span style="margin-left:8px;font-family:IBM Plex Mono,monospace;font-size:11px;color:#e2e6f0;">'+execId+'</span>'+
          '<span style="margin-left:10px;font-family:IBM Plex Mono,monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">'+prows.length+' ERROR LINE'+(prows.length!==1?'S':'')+'</span>'+
          '<span style="margin-left:6px;font-family:IBM Plex Mono,monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(79,156,249,0.1);color:#4f9cf9;border:1px solid rgba(79,156,249,0.25);">'+Object.keys(itemGroups).length+' ITEM'+(Object.keys(itemGroups).length!==1?'S':'')+'</span>'+
          (dupItems>0?'<span style="margin-left:6px;font-family:IBM Plex Mono,monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">'+dupItems+' DUPLICATE'+(dupItems!==1?'S':'')+'</span>':'')+
        '</td></tr>';
        var itemRows=Object.entries(itemGroups).map(function(ie){
          var item=ie[0],irows=ie[1];
          var lineNums=irows.map(function(r){var v=gv(r,'LINENUMBER');return v!=null?v:'—';}).join(', ');
          var sizes=uFrom(irows,'INVENTSIZEID');
          var colors=uFrom(irows,'INVENTCOLORID');
          var seasons=uFrom(irows,'INVENTSEASONID');
          var isDup=irows.length>1;
          var badge=isDup
            ?'<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);white-space:nowrap;">⧉ DUPLICATE \xD7'+irows.length+'</span>'
            :'<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);white-space:nowrap;">✕ ERROR</span>';
          var rowBg=isDup?'background:rgba(251,146,60,0.04);':'';
          return '<tr style="'+rowBg+'">'+
            '<td style="color:#4f9cf9;font-weight:600;padding-left:28px;">'+item+'</td>'+
            '<td style="color:#f0c060;text-align:center;">'+irows.length+'</td>'+
            '<td style="color:#6b7494;font-size:11px;">'+lineNums+'</td>'+
            '<td style="color:#f0c060;">'+sizes+'</td>'+
            '<td style="color:#a78bfa;">'+colors+'</td>'+
            '<td style="color:#2dd4bf;">'+seasons+'</td>'+
            '<td>'+badge+'</td>'+
          '</tr>';
        }).join('');
        return groupRow+itemRows;
      }).join('');
      document.getElementById('error-sum-tbody').innerHTML=html||'<tr><td colspan="7" style="padding:20px;text-align:center;color:#6b7494;">No results match.</td></tr>';
      document.getElementById('row-count').textContent=rows.length+' rows';
    }

    function applyFilter(){
      var fPO=document.getElementById('f-po').value.trim().toLowerCase();
      var fLine=document.getElementById('f-line').value.trim();
      var fItem=document.getElementById('f-item').value.trim().toLowerCase();
      var fSize=document.getElementById('f-size').value;
      var fColor=document.getElementById('f-color').value;
      var fSeason=document.getElementById('f-season').value;
      buildTable(ALL_ROWS.filter(function(r){
        if(fPO&&!(gv(r,'PURCHID')||'').toLowerCase().includes(fPO))return false;
        if(fLine&&String(gv(r,'LINENUMBER')||'')!==fLine)return false;
        if(fItem&&!(gv(r,'ITEMID')||'').toLowerCase().includes(fItem))return false;
        if(fSize&&gv(r,'INVENTSIZEID')!==fSize)return false;
        if(fColor&&gv(r,'INVENTCOLORID')!==fColor)return false;
        if(fSeason&&gv(r,'INVENTSEASONID')!==fSeason)return false;
        return true;
      }));
    }

    buildTable(ALL_ROWS);
    (function(){
      const t=document.documentElement.getAttribute('data-theme');
      if(t==='light'){const m={'#0d0f14':'#eef1f9','#13161d':'#eaedf8','#1a1e28':'#f0f2f8','#252a38':'#c6cde2','#3a4258':'#a4adc8','#e2e6f0':'#1e2d4a','#6b7494':'#546080'};document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});}
      else if(t==='space'){const m={'#0d0f14':'#07051a','#13161d':'#0d0a24','#1a1e28':'#120f2e','#252a38':'#251d4a','#3a4258':'#3d3070','#e2e6f0':'#c8bbf0','#6b7494':'#7e6db5','#4f9cf9':'#c77dff','#f66':'#ff6b9d','#f87171':'#ff6b9d','#fb923c':'#ff9e64','#f0c060':'#ffe66d','#a78bfa':'#e0aaff','#3ecf8e':'#72efdd','#2dd4bf':'#72efdd'};document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});}
    })();
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── Unit Summarize ─────────────────────────────────────────────────
function showUnitSummary() {
  if (!lastUnitRows.length) return;

  const rows = lastUnitRows;
  const gv = (r, key) => { const k = key.toLowerCase(); for (const j in r) if (j.toLowerCase() === k) return r[j]; return undefined; };
  const uniq = key => [...new Set(rows.map(r => gv(r, key)).filter(v => v != null && v !== ''))].sort();

  const allCompanies = uniq('Company');
  const allModules   = uniq('MODULETYPE');
  const allItems     = uniq('ITEMID');
  const totalRows    = rows.length;

  const mkOpts = arr => arr.map(v => `<option value="${v}">${v}</option>`).join('');
  const selStyle = `background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:140px;`;
  const lblStyle = `font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;`;
  const th = (txt, extra='') => `<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;${extra}">${txt}</th>`;

  // Build compare table header: MODULE TYPE | FIELD | [Co1] | [Co2] | ... | MATCH
  const compareHeader = [th('MODULE TYPE'), th('FIELD'), ...allCompanies.map(c => th(c)), th('MATCH','text-align:center;')].join('');

  const theme = localStorage.getItem('po_theme') || 'dark';
  const html = `<!DOCTYPE html>
<html lang="en"${theme !== 'dark' ? ` data-theme="${theme}"` : ''}>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Unit Summary</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#0d0f14;color:#e2e6f0;font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(129,140,248,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(129,140,248,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
    .wrap{position:relative;z-index:1;max-width:1400px;margin:0 auto;}
    .section-title{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#6b7494;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #252a38;}
    tbody tr{border-bottom:1px solid #252a38;}
    tbody tr:last-child{border-bottom:none;}
    tbody tr:hover td{background:rgba(129,140,248,0.04);}
    tbody td{padding:9px 14px;color:#e2e6f0;vertical-align:middle;white-space:nowrap;}
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#3a4258;border-radius:3px;}
    html[data-theme="light"] body{background:#f0f2f8 !important;color:#1a2038 !important;}
    html[data-theme="light"] tbody tr{border-bottom:1px solid #d0d6e8 !important;}
    html[data-theme="light"] tbody tr:hover td{background:rgba(129,140,248,0.06) !important;}
    html[data-theme="light"] tbody td{color:#1a2038 !important;}
    html[data-theme="light"] thead tr{background:#e8ecf4 !important;}
    html[data-theme="light"] td[colspan]{background:#e8ecf4 !important;border-top-color:#b8c2d8 !important;border-bottom-color:#d0d6e8 !important;}
    html[data-theme="light"] button,html[data-theme="light"] select{background:#ffffff !important;border-color:#b8c2d8 !important;color:#5a6478 !important;}
    html[data-theme="light"] .section-title{color:#5a6478 !important;border-bottom-color:#d0d6e8 !important;}
    html[data-theme="light"] ::-webkit-scrollbar-thumb{background:#b8c2d8 !important;}
    html[data-theme="space"] body{background:#07051a !important;color:#e0d8ff !important;}
    html[data-theme="space"] tbody tr{border-bottom:1px solid #2a2660 !important;}
    html[data-theme="space"] tbody tr:hover td{background:rgba(139,92,246,0.07) !important;}
    html[data-theme="space"] tbody td{color:#e0d8ff !important;}
    html[data-theme="space"] thead tr{background:#151232 !important;}
    html[data-theme="space"] td[colspan]{background:#0e0c28 !important;border-top-color:#3d3880 !important;border-bottom-color:#2a2660 !important;}
    html[data-theme="space"] button,html[data-theme="space"] select{background:#151232 !important;border-color:#3d3880 !important;color:#6b63a0 !important;}
    html[data-theme="space"] .section-title{color:#6b63a0 !important;border-bottom-color:#2a2660 !important;}
    html[data-theme="space"] ::-webkit-scrollbar-thumb{background:#3d3880 !important;}
  </style>
</head>
<body><div class="wrap">
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #252a38;">
    <div style="width:32px;height:32px;background:#818cf8;border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;color:#0d0f14;">◇</div>
    <div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">UNIT SUMMARY</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-top:3px;">${allItems.length} item${allItems.length !== 1 ? 's' : ''} · ${allCompanies.length} compan${allCompanies.length !== 1 ? 'ies' : 'y'} · ${allModules.length} module type${allModules.length !== 1 ? 's' : ''} · ${totalRows} rows</div>
    </div>
    <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:#1a1e28;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
  </div>
  <!-- Filter bar -->
  <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding-bottom:24px;">
    <div><div style="${lblStyle}">Company</div><select id="f-company" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(allCompanies)}</select></div>
    <div><div style="${lblStyle}">Module Type</div><select id="f-module" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(allModules)}</select></div>
    <button onclick="document.getElementById('f-company').value='';document.getElementById('f-module').value='';applyFilter();"
      style="align-self:flex-end;padding:5px 12px;background:#13161d;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
    <span id="row-count" style="align-self:flex-end;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-left:auto;">${totalRows} rows</span>
  </div>
  <!-- Compare table (top) -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #252a38;">
    <div class="section-title" style="margin-bottom:0;padding-bottom:0;border-bottom:none;">Company Comparison</div>
    <button onclick="(function(){var el=document.getElementById('compare-wrap');var btn=document.getElementById('compare-toggle');var hidden=el.style.display==='none';el.style.display=hidden?'':'none';btn.textContent=hidden?'▲ Hide':'▼ Show';})()" id="compare-toggle"
      style="padding:3px 10px;background:#13161d;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:10px;border-radius:5px;cursor:pointer;letter-spacing:0.05em;">▲ Hide</button>
  </div>
  <div id="compare-wrap" style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;margin-bottom:32px;">
    <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
      <thead><tr style="background:#1a1e28;">${compareHeader}</tr></thead>
      <tbody id="unit-compare-tbody"></tbody>
    </table>
  </div>
  <!-- Detail table (bottom) -->
  <div class="section-title">Detail by Company</div>
  <div style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;">
    <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
      <thead><tr style="background:#1a1e28;">${[th('ITEM ID'),th('MODULE TYPE'),th('PO UNIT'),th('SALES UNIT'),th('INVENT UNIT'),th('BOM UNIT'),th('REQ GROUP')].join('')}</tr></thead>
      <tbody id="unit-sum-tbody"></tbody>
    </table>
  </div>
</div>
<script>
  const ALL_ROWS = ${JSON.stringify(rows)};
  const ALL_COMPANIES = ${JSON.stringify(allCompanies)};
  const FIELDS = ['PO_UNIT','SALES_UNIT','INVENT_UNIT','BOMUNITID','REQGROUPID'];
  const FIELD_LABELS = {'PO_UNIT':'PO Unit','SALES_UNIT':'Sales Unit','INVENT_UNIT':'Invent Unit','BOMUNITID':'BOM Unit','REQGROUPID':'Req Group'};
  const MODULE_COLORS = {'Sales Order':'#818cf8','Purchase Order':'#3ecf8e','Inventory':'#fb923c'};

  function gv(r,k){const kl=k.toLowerCase();for(const j in r)if(j.toLowerCase()===kl)return r[j];return undefined;}
  function modColor(m){return MODULE_COLORS[m]||'#e2e6f0';}

  function buildCompareTable(data){
    // Build pivot: module → field → company → value
    const pivot={};
    const modules=[...new Set(data.map(r=>gv(r,'MODULETYPE')).filter(Boolean))].sort();
    const companies=[...new Set(data.map(r=>gv(r,'Company')).filter(Boolean))].sort();

    data.forEach(r=>{
      const m=gv(r,'MODULETYPE')||'(unknown)';
      const c=gv(r,'Company')||'(unknown)';
      if(!pivot[m])pivot[m]={};
      if(!pivot[m][c])pivot[m][c]={};
      FIELDS.forEach(f=>{pivot[m][c][f]=gv(r,f)??'—';});
    });

    const colCount=2+companies.length+1; // MODULE TYPE + FIELD + companies + MATCH
    let html='';
    modules.forEach((mod,mi)=>{
      const mc=modColor(mod);
      // Module type header row
      html+=\`<tr>
        <td colspan="\${colCount}" style="padding:8px 14px;background:#13161d;border-top:\${mi===0?'none':'2px solid #252a38'};border-bottom:1px solid #252a38;">
          <span style="font-size:10px;padding:3px 10px;border-radius:4px;font-weight:700;color:\${mc};background:rgba(129,140,248,0.08);border:1px solid rgba(129,140,248,0.2);letter-spacing:0.06em;">\${mod}</span>
        </td></tr>\`;
      // One row per field
      FIELDS.forEach((field,fi)=>{
        const vals=companies.map(c=>pivot[mod]?.[c]?.[field]??'—');
        const allSame=vals.every(v=>v===vals[0]);
        const matchBadge=allSame
          ? \`<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(62,207,142,0.12);color:#3ecf8e;border:1px solid rgba(62,207,142,0.3);">✓ Match</span>\`
          : \`<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.12);color:#fb923c;border:1px solid rgba(251,146,60,0.3);">✗ Differ</span>\`;
        const rowBg=fi%2===0?'background:rgba(255,255,255,0.01);':'';
        const companyCells=companies.map((c,ci)=>{
          const v=pivot[mod]?.[c]?.[field]??'—';
          const isDiff=!allSame;
          const cellColor=isDiff?(v!==vals[0]||vals.filter(x=>x===v).length<vals.length)?'#fb923c':'#e2e6f0':'#e2e6f0';
          const cellBg=isDiff?'background:rgba(251,146,60,0.06);':'';
          return \`<td style="\${cellBg}color:\${cellColor};font-weight:\${isDiff?600:400};">\${v}</td>\`;
        }).join('');
        html+=\`<tr style="\${rowBg}">
          <td style="color:#6b7494;font-size:11px;padding-left:28px;"> </td>
          <td style="color:#6b7494;font-size:11px;">\${FIELD_LABELS[field]}</td>
          \${companyCells}
          <td style="text-align:center;">\${matchBadge}</td>
        </tr>\`;
      });
    });

    document.getElementById('unit-compare-tbody').innerHTML=html||
      \`<tr><td colspan="\${colCount}" style="padding:20px;text-align:center;color:#6b7494;">No data.</td></tr>\`;
  }

  function buildDetailTable(data){
    const companyGroups={};
    data.forEach(r=>{const c=gv(r,'Company')||'(unknown)';if(!companyGroups[c])companyGroups[c]=[];companyGroups[c].push(r);});
    const html=Object.entries(companyGroups).sort(([a],[b])=>a.localeCompare(b)).map(([company,crows])=>{
      const moduleGroups={};
      crows.forEach(r=>{const m=gv(r,'MODULETYPE')||'(unknown)';if(!moduleGroups[m])moduleGroups[m]=[];moduleGroups[m].push(r);});
      const mCount=Object.keys(moduleGroups).length;
      const companyHeader=\`<tr>
        <td colspan="7" style="padding:10px 14px;background:#13161d;border-top:2px solid #818cf8;border-bottom:1px solid #252a38;">
          <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#818cf8;">\${company}</span>
          <span style="margin-left:10px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(129,140,248,0.12);color:#818cf8;border:1px solid rgba(129,140,248,0.3);">\${crows.length} ROW\${crows.length!==1?'S':''}</span>
          <span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(129,140,248,0.08);color:#818cf8;border:1px solid rgba(129,140,248,0.2);">\${mCount} MODULE TYPE\${mCount!==1?'S':''}</span>
        </td></tr>\`;
      const moduleRows=Object.entries(moduleGroups).sort(([a],[b])=>a.localeCompare(b)).flatMap(([mod,mrows])=>{
        const mc=modColor(mod);
        const modHeader=\`<tr>
          <td colspan="7" style="padding:7px 14px 7px 28px;background:#0d0f14;border-bottom:1px solid #252a38;">
            <span style="font-size:10px;padding:2px 8px;border-radius:4px;font-weight:700;color:\${mc};background:rgba(129,140,248,0.08);border:1px solid rgba(129,140,248,0.2);letter-spacing:0.05em;">\${mod}</span>
            <span style="margin-left:8px;font-size:10px;color:#6b7494;">\${mrows.length} row\${mrows.length!==1?'s':''}</span>
          </td></tr>\`;
        const dataRows=mrows.map(r=>\`<tr>
          <td style="color:#818cf8;font-weight:600;padding-left:42px;">\${gv(r,'ITEMID')??'—'}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;color:\${mc};background:rgba(129,140,248,0.06);border:1px solid rgba(129,140,248,0.15);">\${mod}</span></td>
          <td>\${gv(r,'PO_UNIT')??'—'}</td>
          <td>\${gv(r,'SALES_UNIT')??'—'}</td>
          <td>\${gv(r,'INVENT_UNIT')??'—'}</td>
          <td style="color:#f0c060;">\${gv(r,'BOMUNITID')??'—'}</td>
          <td style="color:#6b7494;">\${gv(r,'REQGROUPID')??'—'}</td>
        </tr>\`).join('');
        return modHeader+dataRows;
      }).join('');
      return companyHeader+moduleRows;
    }).join('');
    document.getElementById('unit-sum-tbody').innerHTML=html||'<tr><td colspan="7" style="padding:20px;text-align:center;color:#6b7494;">No results match.</td></tr>';
    document.getElementById('row-count').textContent=data.length+' rows';
  }

  function applyFilter(){
    const fCo=document.getElementById('f-company').value;
    const fMod=document.getElementById('f-module').value;
    const filtered=ALL_ROWS.filter(r=>(!fCo||gv(r,'Company')===fCo)&&(!fMod||gv(r,'MODULETYPE')===fMod));
    buildCompareTable(filtered);
    buildDetailTable(filtered);
  }

  buildCompareTable(ALL_ROWS);
  buildDetailTable(ALL_ROWS);
<\/script>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── BotPO Check Summarize ──────────────────────────────────────────
function showCheckSummary() {
  if (!lastCheckRows.length) return;

  const uniqVals = key => [...new Set(lastCheckRows.map(r => getVal(r, key)).filter(v => v && v !== '—'))].sort();
  const totalExecs = uniqVals('EXECUTIONID').length;
  const totalItems = new Set(lastCheckRows.map(r => getVal(r, 'ITEMID'))).size;

  const mkOpts = arr => arr.map(v => `<option value="${v}">${v}</option>`).join('');

  const selStyle = `background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:120px;`;
  const lblStyle = `font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;`;

  // Build per-item summary (sizes / colors / seasons)
  const itemSummaryMap = {};
  lastCheckRows.forEach(r => {
    const item = getVal(r, 'ITEMID') || '(unknown)';
    if (!itemSummaryMap[item]) itemSummaryMap[item] = { sizes: new Set(), colors: new Set(), seasons: new Set() };
    const sz = getVal(r, 'INVENTSIZEID'); if (sz && sz !== '—') itemSummaryMap[item].sizes.add(sz);
    const cl = getVal(r, 'INVENTCOLORID'); if (cl && cl !== '—') itemSummaryMap[item].colors.add(cl);
    const se = getVal(r, 'INVENTSEASONID'); if (se && se !== '—') itemSummaryMap[item].seasons.add(se);
  });

  const joinOrDash = set => set.size ? [...set].sort().join(', ') : '-';

  // Build per-PO summary (items / exec IDs / sizes / colors / seasons)
  const poSummaryMap = {};
  lastCheckRows.forEach(r => {
    const po = getVal(r, 'PURCHID') || '(unknown)';
    const item = getVal(r, 'ITEMID') || '(unknown)';
    const exec = getVal(r, 'EXECUTIONID');
    if (!poSummaryMap[po]) poSummaryMap[po] = { execs: new Set(), items: {} };
    if (exec && exec !== '—') poSummaryMap[po].execs.add(exec);
    if (!poSummaryMap[po].items[item]) poSummaryMap[po].items[item] = { count: 0, sizes: new Set(), colors: new Set(), seasons: new Set() };
    poSummaryMap[po].items[item].count++;
    const sz = getVal(r, 'INVENTSIZEID'); if (sz && sz !== '—') poSummaryMap[po].items[item].sizes.add(sz);
    const cl = getVal(r, 'INVENTCOLORID'); if (cl && cl !== '—') poSummaryMap[po].items[item].colors.add(cl);
    const se = getVal(r, 'INVENTSEASONID'); if (se && se !== '—') poSummaryMap[po].items[item].seasons.add(se);
  });

  const totalPOs = Object.keys(poSummaryMap).length;
  const allPOsStr = Object.keys(poSummaryMap).sort().join(',');

  const poSummaryData = Object.entries(poSummaryMap).sort(([a], [b]) => a.localeCompare(b)).map(([po, { execs, items }]) => ({ po, execs: [...execs].sort(), items: Object.entries(items).sort(([a], [b]) => a.localeCompare(b)).map(([item, { count, sizes, colors, seasons }]) => ({ item, count, sizes: [...sizes].sort(), colors: [...colors].sort(), seasons: [...seasons].sort() })) }));
  const itemSummaryData = Object.entries(itemSummaryMap).sort(([a], [b]) => a.localeCompare(b)).map(([item, { sizes, colors, seasons }]) => ({ item, sizes: [...sizes].sort(), colors: [...colors].sort(), seasons: [...seasons].sort() }));

  const poSummaryBar = `
    <div style="border:1px solid #252a38;border-radius:8px;margin-bottom:20px;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#13161d;border-bottom:1px solid #252a38;cursor:pointer;user-select:none;" onclick="const b=document.getElementById('po-sum-body');const ic=document.getElementById('po-sum-ic');b.style.display=b.style.display==='none'?'block':'none';ic.textContent=b.style.display==='none'?'▶':'▼';">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#4f9cf9;letter-spacing:0.06em;">PO SUMMARY &nbsp;<span style="color:#6b7494;font-weight:400;">${totalPOs} PO${totalPOs !== 1 ? 's' : ''}</span></span>
        <span id="po-sum-ic" style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">▼</span>
      </div>
      <div style="padding:8px 14px;background:#0d0f14;border-bottom:1px solid #252a38;word-break:break-all;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#f87171;letter-spacing:0.03em;">PO: ${allPOsStr}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:#13161d;border-bottom:1px solid #252a38;" onclick="event.stopPropagation()">
        <span style="${lblStyle}">Filter PO</span>
        <input id="f-po-sum" oninput="renderPoSummary(this.value)" placeholder="Type PO to filter..." style="${selStyle}flex:1 1 160px;" autocomplete="off" spellcheck="false"/>
        <button onclick="document.getElementById('f-po-sum').value='';renderPoSummary('');" style="padding:5px 10px;background:#0d0f14;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">✕</button>
      </div>
      <div id="po-sum-body" style="max-height:320px;overflow-y:auto;background:#0d0f14;"></div>
    </div>`;

  const itemSummaryBar = `
    <div style="border:1px solid #252a38;border-radius:8px;margin-bottom:20px;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#13161d;border-bottom:1px solid #252a38;cursor:pointer;user-select:none;" onclick="const b=document.getElementById('item-sum-body');const ic=document.getElementById('item-sum-ic');b.style.display=b.style.display==='none'?'block':'none';ic.textContent=b.style.display==='none'?'▶':'▼';">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#3ecf8e;letter-spacing:0.06em;">ITEM SUMMARY &nbsp;<span style="color:#6b7494;font-weight:400;">${Object.keys(itemSummaryMap).length} item${Object.keys(itemSummaryMap).length !== 1 ? 's' : ''}</span></span>
        <span id="item-sum-ic" style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">▼</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;background:#13161d;border-bottom:1px solid #252a38;" onclick="event.stopPropagation()">
        <span style="${lblStyle}">Filter Item</span>
        <input id="f-item-sum" oninput="renderItemSummary(this.value)" placeholder="Type item to filter..." style="${selStyle}flex:1 1 160px;" autocomplete="off" spellcheck="false"/>
        <button onclick="document.getElementById('f-item-sum').value='';renderItemSummary('');" style="padding:5px 10px;background:#0d0f14;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">✕</button>
      </div>
      <div id="item-sum-body" style="max-height:220px;overflow-y:auto;background:#0d0f14;"></div>
    </div>`;

  const filterBar = `
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:16px 0 20px;">
      <div><div style="${lblStyle}">PO</div>
        <input id="f-po" oninput="applyFilter()" placeholder="Type to filter..." style="${selStyle}min-width:160px;" autocomplete="off" spellcheck="false"/></div>
      <div><div style="${lblStyle}">Size</div>
        <select id="f-size" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(uniqVals('INVENTSIZEID'))}</select></div>
      <div><div style="${lblStyle}">Color</div>
        <select id="f-color" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(uniqVals('INVENTCOLORID'))}</select></div>
      <div><div style="${lblStyle}">Season</div>
        <select id="f-season" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(uniqVals('INVENTSEASONID'))}</select></div>
      <button onclick="['f-po','f-size','f-color','f-season'].forEach(id=>document.getElementById(id).value='');applyFilter();"
        style="align-self:flex-end;padding:5px 12px;background:#13161d;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
      <span id="row-count" style="align-self:flex-end;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-left:auto;">${lastCheckRows.length} rows</span>
    </div>`;

  const th = txt => `<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">${txt}</th>`;

  const theme = localStorage.getItem('po_theme') || 'dark';
  const html = `<!DOCTYPE html>
<html lang="en"${theme !== 'dark' ? ` data-theme="${theme}"` : ''}>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>BotPO Check Summary</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{background:#0d0f14;color:#e2e6f0;font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}
    body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(62,207,142,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(62,207,142,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
    .wrap{position:relative;z-index:1;max-width:1200px;margin:0 auto;}
    tbody tr{border-bottom:1px solid #252a38;}
    tbody tr:last-child{border-bottom:none;}
    tbody tr:hover td{background:rgba(255,255,255,0.02);}
    tbody td{padding:9px 14px;color:#e2e6f0;vertical-align:middle;}
    ::-webkit-scrollbar{width:6px;height:6px;}
    ::-webkit-scrollbar-track{background:transparent;}
    ::-webkit-scrollbar-thumb{background:#3a4258;border-radius:3px;}
    html[data-theme="light"] body{background:#eef1f9 !important;color:#1e2d4a !important;}
    html[data-theme="light"] body::before{background-image:linear-gradient(rgba(45,122,239,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(45,122,239,0.05) 1px,transparent 1px) !important;}
    html[data-theme="light"] tbody tr{border-bottom:1px solid #c6cde2 !important;}
    html[data-theme="light"] tbody tr:hover td{background:rgba(45,122,239,0.04) !important;}
    html[data-theme="light"] tbody td{color:#1e2d4a !important;}
    html[data-theme="light"] thead tr{background:#eaedf8 !important;}
    html[data-theme="light"] td[colspan]{background:#eaedf8 !important;border-top-color:#a4adc8 !important;border-bottom-color:#c6cde2 !important;}
    html[data-theme="light"] button{background:#f6f8fd !important;border-color:#a4adc8 !important;color:#546080 !important;}
    html[data-theme="light"] select,html[data-theme="light"] input{background:#f6f8fd !important;border-color:#a4adc8 !important;color:#1e2d4a !important;}
    html[data-theme="light"] ::-webkit-scrollbar-thumb{background:#a4adc8 !important;}
    html[data-theme="space"] body{background:#07051a !important;color:#c8bbf0 !important;}
    html[data-theme="space"] body::before{background-image:linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px) !important;}
    html[data-theme="space"] tbody tr{border-bottom:1px solid #251d4a !important;}
    html[data-theme="space"] tbody tr:hover td{background:rgba(139,92,246,0.06) !important;}
    html[data-theme="space"] tbody td{color:#c8bbf0 !important;}
    html[data-theme="space"] thead tr{background:#120f2e !important;}
    html[data-theme="space"] td[colspan]{background:#0d0a24 !important;border-top-color:#3d3070 !important;border-bottom-color:#251d4a !important;}
    html[data-theme="space"] button{background:#120f2e !important;border-color:#3d3070 !important;color:#7e6db5 !important;}
    html[data-theme="space"] select,html[data-theme="space"] input{background:#120f2e !important;border-color:#3d3070 !important;color:#c8bbf0 !important;}
    html[data-theme="space"] ::-webkit-scrollbar-thumb{background:#3d3070 !important;}
  </style>
</head>
<body>
  <div class="wrap">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px;padding-bottom:20px;border-bottom:1px solid #252a38;">
      <div style="width:32px;height:32px;background:#3ecf8e;border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;color:#0d0f14;">✓</div>
      <div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">BOTPO CHECK SUMMARY</div>
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-top:3px;">${totalExecs} Exec ID${totalExecs !== 1 ? 's' : ''} · ${totalItems} unique item${totalItems !== 1 ? 's' : ''}</div>
      </div>
      <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:#1a1e28;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
    </div>
    ${itemSummaryBar}
    ${poSummaryBar}
    ${filterBar}
    <div style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
        <thead>
          <tr style="background:#1a1e28;">
            ${th('ITEM ID')}${th('LINES')}${th('LINE NO.')}${th('PO')}${th('SIZES')}${th('COLORS')}${th('SEASONS')}${th('STATUS')}
          </tr>
        </thead>
        <tbody id="check-tbody"></tbody>
      </table>
    </div>
  </div>
  <script>
    const ALL_ROWS = ${JSON.stringify(lastCheckRows)};
    const PO_DATA = ${JSON.stringify(poSummaryData)};
    const ITEM_DATA = ${JSON.stringify(itemSummaryData)};

    function jod(arr){return arr&&arr.length?arr.join(', '):'-';}

    function renderPoSummary(filter){
      var q=(filter||'').toLowerCase();
      var data=PO_DATA.filter(function(d){return !q||d.po.toLowerCase().includes(q);});
      if(!data.length){document.getElementById('po-sum-body').innerHTML='<div style="padding:16px;text-align:center;font-family:IBM Plex Mono,monospace;font-size:11px;color:#6b7494;">No POs match.</div>';return;}
      document.getElementById('po-sum-body').innerHTML=data.map(function(d){
        var totalLines=d.items.reduce(function(s,i){return s+i.count;},0);
        var execStr=d.execs.length?d.execs.join(', '):'—';
        var itemRows=d.items.map(function(it){
          return '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px 14px 6px 20px;border-bottom:1px solid #13161d;border-right:1px solid #1a1e28;">'+
            '<span style="font-family:IBM Plex Mono,monospace;font-size:11px;font-weight:600;color:#4f9cf9;width:100%;margin-bottom:1px;">'+it.item+(it.count>1?' <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(251,146,60,0.12);color:#fb923c;border:1px solid rgba(251,146,60,0.3);">\xD7'+it.count+'</span>':'')+'</span>'+
            '<span style="font-size:10px;color:#6b7494;">Size</span><span style="font-size:10px;color:#f0c060;margin-left:4px;">'+jod(it.sizes)+'</span>'+
            '<span style="font-size:10px;color:#6b7494;margin-left:10px;">Color</span><span style="font-size:10px;color:#a78bfa;margin-left:4px;">'+jod(it.colors)+'</span>'+
            '<span style="font-size:10px;color:#6b7494;margin-left:10px;">Season</span><span style="font-size:10px;color:#3ecf8e;margin-left:4px;">'+jod(it.seasons)+'</span>'+
          '</div>';
        }).join('');
        return '<div style="border-bottom:1px solid #1a1e28;">'+
          '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 14px;background:#13161d;">'+
            '<span style="font-family:IBM Plex Mono,monospace;font-size:12px;font-weight:600;color:#4f9cf9;">'+d.po+'</span>'+
            '<span style="font-size:10px;color:#6b7494;margin-left:4px;">\xB7  '+execStr+'</span>'+
            '<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(62,207,142,0.1);color:#3ecf8e;border:1px solid rgba(62,207,142,0.3);">'+totalLines+' LINE'+(totalLines!==1?'S':'')+'</span>'+
            '<span style="font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(79,156,249,0.1);color:#4f9cf9;border:1px solid rgba(79,156,249,0.25);">'+d.items.length+' ITEM'+(d.items.length!==1?'S':'')+'</span>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;">'+itemRows+'</div>'+
        '</div>';
      }).join('');
    }

    function renderItemSummary(filter){
      var q=(filter||'').toLowerCase();
      var data=ITEM_DATA.filter(function(d){return !q||d.item.toLowerCase().includes(q);});
      if(!data.length){document.getElementById('item-sum-body').innerHTML='<div style="padding:16px;text-align:center;font-family:IBM Plex Mono,monospace;font-size:11px;color:#6b7494;">No items match.</div>';return;}
      document.getElementById('item-sum-body').innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;background:#0d0f14;">'+
        data.map(function(d){
          return '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:7px 14px;border-bottom:1px solid #1a1e28;border-right:1px solid #1a1e28;">'+
            '<span style="font-family:IBM Plex Mono,monospace;font-size:11px;font-weight:600;color:#4f9cf9;width:100%;margin-bottom:2px;">'+d.item+'</span>'+
            '<span style="font-size:10px;color:#6b7494;">Size</span><span style="font-size:10px;color:#f0c060;margin-left:4px;">'+jod(d.sizes)+'</span>'+
            '<span style="font-size:10px;color:#6b7494;margin-left:10px;">Color</span><span style="font-size:10px;color:#a78bfa;margin-left:4px;">'+jod(d.colors)+'</span>'+
            '<span style="font-size:10px;color:#6b7494;margin-left:10px;">Season</span><span style="font-size:10px;color:#3ecf8e;margin-left:4px;">'+jod(d.seasons)+'</span>'+
          '</div>';
        }).join('')+
      '</div>';
    }

    function gv(r, key) {
      const k = key.toLowerCase();
      for (let j in r) if (j.toLowerCase() === k) return r[j];
      return undefined;
    }

    function buildTable(rows) {
      const execGroups = {};
      rows.forEach(r => {
        const exec = gv(r, 'EXECUTIONID') || '(unknown)';
        if (!execGroups[exec]) execGroups[exec] = [];
        execGroups[exec].push(r);
      });

      const html = Object.entries(execGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([exec, erows]) => {
          const poGroups = {};
          erows.forEach(r => { const p = gv(r,'PURCHID')||'(unknown)'; if(!poGroups[p]) poGroups[p]=[]; poGroups[p].push(r); });

          const itemGroups = {};
          erows.forEach(r => { const it = gv(r,'ITEMID')||'(unknown)'; if(!itemGroups[it]) itemGroups[it]=[]; itemGroups[it].push(r); });
          const dupCount = Object.values(itemGroups).filter(a => a.length > 1).length;

          const groupRow = \`<tr>
            <td colspan="8" style="padding:10px 14px;background:#13161d;border-top:2px solid #3a4258;border-bottom:1px solid #252a38;">
              <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#3ecf8e;">\${exec}</span>
              <span style="margin-left:10px;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(62,207,142,0.1);color:#3ecf8e;border:1px solid rgba(62,207,142,0.3);">\${erows.length} LINE\${erows.length!==1?'S':''}</span>
              <span style="margin-left:6px;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(79,156,249,0.1);color:#4f9cf9;border:1px solid rgba(79,156,249,0.25);">\${Object.keys(poGroups).length} PO\${Object.keys(poGroups).length!==1?'s':''}</span>
              \${dupCount>0?\`<span style="margin-left:6px;font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">\${dupCount} DUPLICATE\${dupCount!==1?'S':''}</span>\`:''}
            </td></tr>\`;

          const itemRows = Object.entries(itemGroups).flatMap(([item, irows]) => {
            const isDup = irows.length > 1;
            const badge = isDup
              ? \`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);white-space:nowrap;">⧉ DUPLICATE ×\${irows.length}</span>\`
              : \`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.35);white-space:nowrap;">✕ ERROR</span>\`;
            const rowBg = isDup ? 'background:rgba(251,146,60,0.04);' : 'background:rgba(239,68,68,0.03);';
            const itemColor = isDup ? '#9ca3af' : '#4f9cf9';
            return irows.map((r, i) => \`<tr style="\${rowBg}">
              <td style="color:\${itemColor};font-weight:600;padding-left:28px;">\${i===0?item:''}</td>
              <td style="color:#f0c060;text-align:center;">\${i===0?irows.length:''}</td>
              <td style="color:#6b7494;font-size:11px;">\${gv(r,'LINENUMBER')??'—'}</td>
              <td style="color:#4f9cf9;font-size:11px;">\${gv(r,'PURCHID')??'—'}</td>
              <td style="color:#f0c060;">\${gv(r,'INVENTSIZEID')??'—'}</td>
              <td style="color:#a78bfa;">\${gv(r,'INVENTCOLORID')??'—'}</td>
              <td style="color:#3ecf8e;font-size:11px;">\${gv(r,'INVENTSEASONID')??'—'}</td>
              <td>\${badge}</td>
            </tr>\`);
          }).join('');

          return groupRow + itemRows;
        }).join('');

      document.getElementById('check-tbody').innerHTML = html || '<tr><td colspan="8" style="padding:20px;text-align:center;color:#6b7494;">No results match the current filters.</td></tr>';
      document.getElementById('row-count').textContent = rows.length + ' rows';
    }

    function applyFilter() {
      const fPO     = document.getElementById('f-po').value.trim().toLowerCase();
      const fSize   = document.getElementById('f-size').value;
      const fColor  = document.getElementById('f-color').value;
      const fSeason = document.getElementById('f-season').value;
      buildTable(ALL_ROWS.filter(r =>
        (!fPO     || (gv(r,'PURCHID')||'').toLowerCase().includes(fPO)) &&
        (!fSize   || gv(r,'INVENTSIZEID')   === fSize)   &&
        (!fColor  || gv(r,'INVENTCOLORID')  === fColor)  &&
        (!fSeason || gv(r,'INVENTSEASONID') === fSeason)
      ));
    }

    renderPoSummary('');
    renderItemSummary('');
    buildTable(ALL_ROWS);
    (function(){
      const t=document.documentElement.getAttribute('data-theme');
      if(t==='light'){const m={'#0d0f14':'#eef1f9','#13161d':'#eaedf8','#1a1e28':'#f0f2f8','#252a38':'#c6cde2','#3a4258':'#a4adc8','#e2e6f0':'#1e2d4a','#6b7494':'#546080'};document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});}
      else if(t==='space'){const m={'#0d0f14':'#07051a','#13161d':'#0d0a24','#1a1e28':'#120f2e','#252a38':'#251d4a','#3a4258':'#3d3070','#e2e6f0':'#c8bbf0','#6b7494':'#7e6db5','#4f9cf9':'#c77dff','#f66':'#ff6b9d','#f87171':'#ff6b9d','#f87171':'#ff6b9d','#fb923c':'#ff9e64','#f0c060':'#ffe66d','#a78bfa':'#e0aaff','#3ecf8e':'#72efdd','#2dd4bf':'#72efdd','#f87171':'#ff6b9d'};document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});}
    })();
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}
