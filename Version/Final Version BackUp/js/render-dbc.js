// ── Search PO DBC ──────────────────────────────────────────────────
function renderSearchDBC(raw, po) {
  const area = document.getElementById('results-area');
  lastSearchDBCData = raw;

  const header = Array.isArray(raw.header) ? raw.header : [];
  const lines = Array.isArray(raw.lines) ? raw.lines : [];

  if (header.length === 0 && lines.length === 0) {
    area.innerHTML = `
      <div class="state-box" style="border-style:solid;border-color:var(--border);">
        <div class="state-icon">&#8856;</div>
        <span style="color:var(--text);">No DBC data found for PO <strong>${po}</strong>.</span>
      </div>`;
    updateBadge('searchdbc', 0);
    return;
  }

  updateBadge('searchdbc', header.length + lines.length);

  const totalQty = lines.reduce((s, r) => s + (parseFloat(r.PURCHQTY || 0) || 0), 0);
  const totalAmt = lines.reduce((s, r) => s + (parseFloat(r.LINEAMOUNT || 0) || 0), 0);

  const summaryHTML = `
    <div class="summary-row">
      <div class="summary-card"><div class="summary-label">Header Rows</div><div class="summary-value" style="color:#38bdf8;" id="dbc-summary-header-count">${header.length}</div></div>
      <div class="summary-card"><div class="summary-label">Line Rows</div><div class="summary-value blue" id="dbc-summary-lines-count">${lines.length}</div></div>
      <div class="summary-card"><div class="summary-label">Total Qty</div><div class="summary-value" id="dbc-summary-totalqty">${parseFloat(totalQty).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Total Amount</div><div class="summary-value" id="dbc-summary-totalamt">${parseFloat(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
    </div>`;

  const headerCols = ['CREATED', 'EXPORTED', 'STATUS', 'VENDOR AX', 'COMPANY', 'PURCHID', 'ORDER ACCT', 'INVOICE ACCT', 'CURRENCY'];
  const headerKeys = ['CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'VENDORAXACCOUNT', 'COMPANY', 'PURCHID', 'ORDERACCOUNT', 'INVOICEACCOUNT', 'CURRENCYCODE'];

  const headerRowsHTML = header.map(r =>
    '<tr>' + headerKeys.map(k => {
      const v = r[k] != null && r[k] !== '' ? r[k] : '—';
      return v === '—' ? `<td class="td-dim">—</td>` : `<td>${v}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const linesCols = ['LINE', 'CREATED', 'EXPORTED', 'STATUS', 'ITEM ID', 'QTY', 'PRICE', 'AMOUNT', 'JOB NO', 'INVENT STATUS', 'SEASON', 'COLOR ID', 'COLOR NAME', 'SIZE FABRIC', 'SIZE ID', 'COMPANY', 'SITE', 'LOCATION'];
  const linesKeys = ['LINENUMBER', 'CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'ITEMID', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSTATUS', 'SEASON', 'COLORID', 'COLORNAME', 'SIZEIDFABRIC', 'SIZEID', 'COMPANY', 'SITEID', 'LOCATIONID'];

  const linesRowsHTML = lines.map(r =>
    '<tr>' + linesKeys.map(k => {
      let v = r[k] != null && r[k] !== '' ? r[k] : '—';
      if (v !== '—') {
        if (k === 'PURCHQTY') v = parseFloat(v || 0).toFixed(0);
        if (k === 'PURCHPRICE') v = parseFloat(v || 0).toFixed(5);
        if (k === 'LINEAMOUNT') v = parseFloat(v || 0).toFixed(2);
      }
      if (k === 'LINENUMBER') return `<td class="num">${v}</td>`;
      return v === '—' ? `<td class="td-dim">—</td>` : `<td>${v}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const hUniqCreated  = [...new Set(header.map(r => r.CREATEDATETIME).filter(v => v != null && v !== ''))].sort();
  const hUniqExported = [...new Set(header.map(r => r.EXPORTDATETIME).filter(v => v != null && v !== ''))].sort();
  const lUniqCreated  = [...new Set(lines.map(r => r.CREATEDATETIME).filter(v => v != null && v !== ''))].sort();
  const lUniqExported = [...new Set(lines.map(r => r.EXPORTDATETIME).filter(v => v != null && v !== ''))].sort();
  const lUniqItemId   = [...new Set(lines.map(r => r.ITEMID).filter(v => v != null && v !== ''))].sort();
  const lUniqSizeFab  = [...new Set(lines.map(r => r.SIZEIDFABRIC).filter(v => v != null && v !== ''))].sort();
  const lUniqColorId  = [...new Set(lines.map(r => r.COLORID).filter(v => v != null && v !== ''))].sort();
  const lUniqSeason   = [...new Set(lines.map(r => r.SEASON).filter(v => v != null && v !== ''))].sort();

  area.innerHTML = `
    ${summaryHTML}
    <div class="results-meta">
      <span class="results-count">PO <strong>${po}</strong> —
        <span style="color:#38bdf8" id="dbc-meta-header-count">${header.length} Header</span> ·
        <span style="color:var(--accent)" id="dbc-meta-lines-count">${lines.length} Lines</span>
      </span>
      <span class="tag tag-searchdbc">SEARCH PO DBC</span>
      <button onclick="exportDBCToExcel()" style="margin-left:auto;padding:5px 14px;background:var(--surface2);border:1px solid var(--green);color:var(--green);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:0.05em;font-weight:600;transition:all 0.15s;" onmouseover="this.style.background='var(--green-glow)'" onmouseout="this.style.background='var(--surface2)'">&#11015; Export Excel</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;padding:0 28px 8px;">
      <div style="font-family:var(--mono);font-size:10px;color:#38bdf8;letter-spacing:0.1em;text-transform:uppercase;">&#9472;&#9472; Header</div>
      <button id="dbc-header-toggle" onclick="const s=document.getElementById('searchdbc-header-section'),b=document.getElementById('dbc-header-toggle');if(s.style.display==='none'){s.style.display='';b.textContent='▼ Hide';}else{s.style.display='none';b.textContent='▶ Show';}"
        style="padding:2px 10px;background:var(--surface2);border:1px solid #38bdf8;color:#38bdf8;font-family:var(--mono);font-size:10px;border-radius:4px;cursor:pointer;letter-spacing:0.05em;">▼ Hide</button>
    </div>
    <div id="searchdbc-header-section">
      <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:4px 28px 8px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Created</div>
          <select id="dbc-h-filter-created" onchange="applyDBCHeaderFilter()"
            style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:160px;">
            <option value="">All</option>
            ${hUniqCreated.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Exported</div>
          <select id="dbc-h-filter-exported" onchange="applyDBCHeaderFilter()"
            style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:160px;">
            <option value="">All</option>
            ${hUniqExported.map(v => `<option value="${v}">${v}</option>`).join('')}
          </select>
        </div>
        <button onclick="document.getElementById('dbc-h-filter-created').value='';document.getElementById('dbc-h-filter-exported').value='';applyDBCHeaderFilter();"
          style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
      </div>
      <div class="table-wrap" style="max-height:200px;flex:none;">
        <table>
          <thead><tr>${headerCols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody id="searchdbc-header-tbody">${headerRowsHTML}</tbody>
        </table>
      </div>
    </div>
    <div style="padding:10px 28px 8px;font-family:var(--mono);font-size:10px;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;">&#9472;&#9472; Lines</div>
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:4px 28px 8px;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Created</div>
        <select id="dbc-l-filter-created" onchange="applyDBCLinesFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:160px;">
          <option value="">All</option>
          ${lUniqCreated.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Exported</div>
        <select id="dbc-l-filter-exported" onchange="applyDBCLinesFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:160px;">
          <option value="">All</option>
          ${lUniqExported.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Item ID</div>
        <select id="dbc-l-filter-itemid" onchange="applyDBCLinesFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:130px;">
          <option value="">All</option>
          ${lUniqItemId.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Size Fabric</div>
        <select id="dbc-l-filter-sizefab" onchange="applyDBCLinesFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
          <option value="">All</option>
          ${lUniqSizeFab.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Color ID</div>
        <select id="dbc-l-filter-colorid" onchange="applyDBCLinesFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
          <option value="">All</option>
          ${lUniqColorId.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Season</div>
        <select id="dbc-l-filter-season" onchange="applyDBCLinesFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
          <option value="">All</option>
          ${lUniqSeason.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <button onclick="['dbc-l-filter-created','dbc-l-filter-exported','dbc-l-filter-itemid','dbc-l-filter-sizefab','dbc-l-filter-colorid','dbc-l-filter-season'].forEach(id=>document.getElementById(id).value='');applyDBCLinesFilter();"
        style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${linesCols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody id="searchdbc-lines-tbody">${linesRowsHTML}</tbody>
      </table>
    </div>`;
}

function exportDBCToExcel() {
  const { header = [], lines = [] } = lastSearchDBCData;
  if (!header.length && !lines.length) return;

  const wb = XLSX.utils.book_new();
  const po = document.getElementById('po-input').value.trim();
  const name = `PO_SearchDBC_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const headerKeys = ['CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'VENDORAXACCOUNT', 'COMPANY', 'PURCHID', 'ORDERACCOUNT', 'INVOICEACCOUNT', 'CURRENCYCODE'];
  const headerCols = ['CREATED', 'EXPORTED', 'STATUS', 'VENDOR AX', 'COMPANY', 'PURCHID', 'ORDER ACCT', 'INVOICE ACCT', 'CURRENCY'];
  if (header.length) {
    const ws = XLSX.utils.aoa_to_sheet([headerCols, ...header.map(r => headerKeys.map(k => r[k] ?? ''))]);
    XLSX.utils.book_append_sheet(wb, ws, 'Header');
  }

  const linesKeys = ['LINENUMBER', 'CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'ITEMID', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSTATUS', 'SEASON', 'COLORID', 'COLORNAME', 'SIZEIDFABRIC', 'SIZEID', 'COMPANY', 'SITEID', 'LOCATIONID'];
  const linesCols = ['LINE', 'CREATED', 'EXPORTED', 'STATUS', 'ITEMID', 'QTY', 'PRICE', 'AMOUNT', 'JOB NO', 'INVENT STATUS', 'SEASON', 'COLOR ID', 'COLOR NAME', 'SIZE FABRIC', 'SIZE ID', 'COMPANY', 'SITE', 'LOCATION'];
  if (lines.length) {
    const ws = XLSX.utils.aoa_to_sheet([linesCols, ...lines.map(r => linesKeys.map(k => r[k] ?? ''))]);
    XLSX.utils.book_append_sheet(wb, ws, 'Lines');
  }

  XLSX.writeFile(wb, name);
}
