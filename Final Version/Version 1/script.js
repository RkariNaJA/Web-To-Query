// ── Theme ───────────────────────────────────────────────────────────
(function () {
  if (localStorage.getItem('po_theme') === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('po_theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('po_theme', 'light');
  }
}

// ── State ──────────────────────────────────────────────────────────
let mode = 'search';
let history = [];
let lastListRows = [];
let lastCheckRows = [];
let lastCountRows = [];
let lastSearchRows = [];
let lastPackrollRows = [];
let lastCompareData = { stagingRows: [], axRows: [] };
let lastSearchDBCData = { header: [], lines: [] };
let lastCompareDBC = { stagingRows: [], dbcLines: [] };
let cfg = {
  webhook: localStorage.getItem('po_webhook') || '',
  auth: localStorage.getItem('po_auth') || ''
};

const MODES = {
  search: { label: 'SEARCH PO (STAGING)', tagClass: 'tag-search', navClass: 'active-search' },
  list: { label: 'ERROR PO', tagClass: 'tag-list', navClass: 'active-list' },
  count: { label: 'PO LINE (AX)', tagClass: 'tag-count', navClass: 'active-count' },
  update: { label: 'PACK / ROLL', tagClass: 'tag-update', navClass: 'active-update' },
  packroll: { label: 'QTY PACK/ROLL', tagClass: 'tag-packroll', navClass: 'active-packroll' },
  compare: { label: 'COMPARE STG vs PO AX', tagClass: 'tag-compare', navClass: 'active-compare' },
  check: { label: 'BOTPO CHECKING', tagClass: 'tag-check', navClass: 'active-check' },
  updatestaging: { label: 'UPDATE STAGING STATUS', tagClass: 'tag-updatestaging', navClass: 'active-updatestaging' },
  searchdbc: { label: 'SEARCH PO DBC', tagClass: 'tag-searchdbc', navClass: 'active-searchdbc' },
  comparedbc: { label: 'COMPARE STG vs PO DBC', tagClass: 'tag-comparedbc', navClass: 'active-comparedbc' }
};

// ── Init ───────────────────────────────────────────────────────────
const savedPO = localStorage.getItem('po_last_input');
if (savedPO) document.getElementById('po-input').value = savedPO;
updateSQLPreview();
updateEndpointDisplay();

// ── Mode ───────────────────────────────────────────────────────────
function setMode(m) {
  mode = m;
  Object.keys(MODES).forEach(id => {
    const el = document.getElementById('nav-' + id);
    if (el) el.className = 'nav-item' + (m === id ? ' ' + MODES[id].navClass : '');
  });
  const isUpdate = m === 'updatestaging';
  document.getElementById('exec-input-wrap').style.display = isUpdate ? 'flex' : 'none';
  document.getElementById('query-bar-label').textContent = isUpdate ? 'Purchase Order Number & Execution ID' : 'Purchase Order Number';
  updateSQLPreview();
}

// ── SQL Preview ────────────────────────────────────────────────────
function updateSQLPreview() {
  const po = document.getElementById('po-input').value.trim() || '?';
  const el = document.getElementById('sql-preview');
  const kw = s => `<span class="sql-kw">${s}</span>`;
  const vl = s => `<span class="sql-val">${s}</span>`;
  const fn = s => `<span class="sql-fn">${s}</span>`;

  if (mode === 'search') {
    el.innerHTML = `${kw('SELECT')} ISSELECTED, TRANSFERSTATUS, LINENUMBER, EXECUTIONID,
       PURCHQTY, PURCHPRICE, LINEAMOUNT, PURCHUNIT,
       inventSerialId ${kw('AS')} JOBNUMBER, ITEMID, INVENTSIZEID,
       INVENTCOLORID, INVENTSTYLEID, INVENTSITEID, INVENTLOCATIONID, INVENTSTATUSID
${kw('FROM')} DMFPURCHLINEENTITY
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")} ${kw('AND')} EXECUTIONID ${kw('=')} (${kw('SELECT')} ${fn('MAX')}(EXECUTIONID) ${kw('FROM')} DMFPURCHLINEENTITY
  ${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")} ${kw('AND')} EXECUTIONID ${kw('LIKE')} ${vl("'BotPO%'")})
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  } else if (mode === 'list') {
    el.innerHTML = `${kw('SELECT')} TRANSFERSTATUS,PURCHID, LINENUMBER, EXECUTIONID, PURCHPRICE,
       PURCHQTY, ITEMID, INVENTSIZEID, INVENTCOLORID,
       INVENTSTYLEID ${kw('AS')} [INVENTSEASONID]
${kw('FROM')} DMFPURCHLINEENTITY
${kw('WHERE')} PURCHID ${kw('IN')} ${vl("'" + po + "'")} ${kw('AND')} EXECUTIONID ${kw('=')} (${kw('SELECT')} ${fn('MAX')}(EXECUTIONID) ${kw('FROM')} DMFPURCHLINEENTITY
  ${kw('WHERE')} PURCHID ${kw('IN')} ${vl("'" + po + "'")} ${kw('AND')} EXECUTIONID ${kw('LIKE')} ${vl("'BotPO%'")})
  ${kw('AND')} TRANSFERSTATUS ${kw('=')} ${vl('2')}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  } else if (mode === 'count') {
    el.innerHTML = `${kw('SELECT')} LINENUMBER, PURCHID, ITEMID,
       IVZ_COLOR_CT ${kw('AS')} [Color], IVZ_SIZE_CT ${kw('AS')} [Size],
       IVZ_SEASON_CT ${kw('AS')} [Season], PURCHQTY ${kw('AS')} [QTY],
       PURCHPRICE ${kw('AS')} [Unit Price], LINEAMOUNT ${kw('AS')} [Net amount],
       ${fn('SUM')}(PURCHQTY) ${kw('OVER')} () ${kw('AS')} [Total QTY],
       ${fn('SUM')}(LINEAMOUNT) ${kw('OVER')} () ${kw('AS')} [Total Net amount],
       PURCHUNIT, NAME ${kw('AS')} [Item Name]
${kw('FROM')} PURCHLINE
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  } else if (mode === 'update') {
    el.innerHTML = `${kw('SELECT')} ITEMARRIVALNUM, PURCHID, INVENTLOCATIONID,
       INVENTSITEID, CREATEDDATETIME, POSTEDDATETIME, POSTED, CREATEDBY
${kw('FROM')} IVZ_ItemArrivalJour_CT
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")};`;
  } else if (mode === 'packroll') {
    el.innerHTML = `${kw('SELECT')} LINENUMBER, ITEMID, PURCHQTY ${kw('AS')} [Quantity],
       PURCHQTY ${kw('-')} REMAINPURCHPHYSICAL ${kw('AS')} [Received],
       REMAINPURCHPHYSICAL ${kw('AS')} [Deliver Remainder],
       REMAINPURCHPHYSICAL ${kw('AS')} [Ordered],
       QTYORDERED ${kw('AS')} [Invent Unit QTY],
       ${kw('CASE')}
           ${kw('WHEN')} REMAINPURCHPHYSICAL ${kw('=')} QTYORDERED ${kw('THEN')} ${vl("'True'")}
           ${kw('ELSE')} ${vl("'False'")}
       ${kw('END')} ${kw('AS')} [Compare O&amp;I],
       ${kw('CASE')}
           ${kw('WHEN')} PURCHQTY ${kw('=')} PURCHQTY${kw('-')}REMAINPURCHPHYSICAL ${kw('THEN')} ${vl("'True'")}
           ${kw('ELSE')} ${vl("'False'")}
       ${kw('END')} ${kw('AS')} [Compare Q&amp;R]
${kw('FROM')} PURCHLINE
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  } else if (mode === 'check') {
    el.innerHTML = `${kw('SELECT')} EXECUTIONID, INVENTSITEID, LINENUMBER, PURCHID,
       ITEMID, INVENTSIZEID, INVENTCOLORID, INVENTSEASONID, CREATEDBY
${kw('FROM')} DMFPURCHLINEENTITY
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")} ${kw('AND')} EXECUTIONID ${kw('=')} (${kw('SELECT')} ${fn('MAX')}(EXECUTIONID) ${kw('FROM')} DMFPURCHLINEENTITY
  ${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")} ${kw('AND')} EXECUTIONID ${kw('LIKE')} ${vl("'BotPO%'")})
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  } else if (mode === 'updatestaging') {
    const execId = document.getElementById('exec-input')?.value.trim() || '?';
    el.innerHTML = `${kw('UPDATE')} DMFPURCHLINEENTITY
${kw('SET')} TRANSFERSTATUS ${kw('=')} ${vl('1')}
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")}
  ${kw('AND')} EXECUTIONID ${kw('=')} ${vl("'" + execId + "'")}
  ${kw('AND')} TRANSFERSTATUS ${kw('=')} ${vl('2')};`;
  } else if (mode === 'searchdbc') {
    el.innerHTML = `<span style="color:#38bdf8">── QUERY 1 (DBC Header)</span>
${kw('SELECT')} CREATEDATETIME, EXPORTDATETIME, STATUS, VENDORAXACCOUNT,
       COMPANY, PURCHID, ORDERACCOUNT, INVOICEACCOUNT, CURRENCYCODE
${kw('FROM')} PO_HEADER_DBC
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")}

<span style="color:#38bdf8">── QUERY 2 (DBC Lines)</span>
${kw('SELECT')} LINENUMBER, CREATEDATETIME, EXPORTDATETIME, STATUS,
       PURCHQTY, PURCHPRICE, LINEAMOUNT, JOBNUMBER, INVENTSTATUS,
       SEASON, COLORID, COLORNAME, SIZEIDFABRIC, SIZEID, COMPANY, SITEID, LOCATIONID
${kw('FROM')} PO_LINES_DBC
${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")};`;
  } else if (mode === 'compare') {
    el.innerHTML = `<span style="color:var(--accent)">── QUERY 1 (Staging)</span>
${kw('SELECT')} LINENUMBER, ITEMID, INVENTSIZEID, INVENTCOLORID, PURCHQTY, PURCHPRICE, LINEAMOUNT, TRANSFERSTATUS
${kw('FROM')} DMFPURCHLINEENTITY ${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")} <span style="color:var(--text-dim)">…MAX EXECUTIONID…</span>

<span style="color:var(--purple)">── QUERY 2 (PO Line AX)</span>
${kw('SELECT')} LINENUMBER, ITEMID, IVZ_COLOR_CT, IVZ_SIZE_CT, PURCHQTY, PURCHPRICE, LINEAMOUNT
${kw('FROM')} PURCHLINE ${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")};`;
  } else if (mode === 'comparedbc') {
    el.innerHTML = `<span style="color:var(--accent)">── QUERY 1 (Staging)</span>
${kw('SELECT')} LINENUMBER, INVENTSIZEID, INVENTCOLORID, INVENTSTYLEID, PURCHQTY, PURCHPRICE, LINEAMOUNT, TRANSFERSTATUS
${kw('FROM')} DMFPURCHLINEENTITY ${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")} <span style="color:var(--text-dim)">…MAX EXECUTIONID…</span>

<span style="color:#e879f9">── QUERY 2 (DBC Lines — MAX CREATEDATETIME per line)</span>
${kw('SELECT')} LINENUMBER, SIZEID, COLORID, SEASON, PURCHQTY, PURCHPRICE, LINEAMOUNT, STATUS, CREATEDATETIME
${kw('FROM')} PO_LINES_DBC ${kw('WHERE')} PURCHID ${kw('=')} ${vl("'" + po + "'")}
<span style="color:var(--text-dim)">  [client deduplicates: MAX(CREATEDATETIME) per LINENUMBER]</span>;`;
  }
}

document.getElementById('po-input').addEventListener('input', () => {
  localStorage.setItem('po_last_input', document.getElementById('po-input').value);
  updateSQLPreview();
});

document.getElementById('exec-input').addEventListener('input', () => {
  updateSQLPreview();
});

// ── Helper ─────────────────────────────────────────────────────────
function getVal(r, key) {
  if (!r) return undefined;
  const kLow = String(key).toLowerCase();
  for (let j in r) {
    if (String(j).toLowerCase() === kLow) return r[j];
  }
  return undefined;
}

function fmt(v, decimals = 2) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── Fetch helper ───────────────────────────────────────────────────
async function fetchQuery(queryType, po, execId = null) {
  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (cfg.auth) headers['Authorization'] = cfg.auth;
  const body = { queryType, searchKeyword: po };
  if (execId) body.executionId = execId;
  const res = await fetch(cfg.webhook, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} (${queryType}): ${res.statusText}${txt ? ' — ' + txt.slice(0, 80) : ''}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data
    : Array.isArray(data.rows) ? data.rows
      : Array.isArray(data.data) ? data.data : [];
  return { rows, raw: data };
}

// ── Run Query ──────────────────────────────────────────────────────
async function runQuery() {
  const po = document.getElementById('po-input').value.trim();
  if (!po) { showError('Please enter a PO number.'); return; }
  if (mode === 'updatestaging') {
    const execId = document.getElementById('exec-input').value.trim();
    if (!execId) { showError('Please enter an Execution ID.'); return; }
  }
  if (!cfg.webhook) { openConfig(); return; }

  showLoading();
  const btn = document.getElementById('run-btn');
  btn.disabled = true;

  try {
    if (mode === 'compare') {
      // Fire both queries in parallel
      const [stagingRes, axRes] = await Promise.all([
        fetchQuery('search', po),
        fetchQuery('count', po)
      ]);
      addHistory(po, mode, stagingRes.rows.length + axRes.rows.length);
      renderCompare(stagingRes.rows, axRes.rows, po);
    } else if (mode === 'searchdbc') {
      const { raw } = await fetchQuery('searchdbc', po);
      const totalRows = (raw.totalHeaderRows || 0) + (raw.totalLineRows || 0);
      addHistory(po, mode, totalRows);
      renderSearchDBC(raw, po);
    } else if (mode === 'comparedbc') {
      const [stagingRes, dbcRes] = await Promise.all([
        fetchQuery('search', po),
        fetchQuery('searchdbc', po)
      ]);
      const dbcLines = Array.isArray(dbcRes.raw.lines) ? dbcRes.raw.lines : [];
      addHistory(po, mode, stagingRes.rows.length + dbcLines.length);
      renderCompareDBC(stagingRes.rows, dbcLines, po);
    } else {
      const execId = mode === 'updatestaging' ? document.getElementById('exec-input').value.trim() : null;
      const { rows, raw } = await fetchQuery(mode, po, execId);
      const serverTotalQty = getVal(raw, 'totalQTY') ?? getVal(raw, 'total_qty') ?? null;
      const serverTotalAmount = getVal(raw, 'totalNetAmount') ?? getVal(raw, 'total_amount') ?? null;
      addHistory(po, mode, mode === 'updatestaging' ? (raw.rowsAffected ?? 0) : rows.length);
      renderResults(rows, po, serverTotalQty, serverTotalAmount, raw);
    }
  } catch (e) {
    let msg = e.message || 'Network error.';
    if (msg.toLowerCase().includes('failed to fetch')) {
      msg = 'Failed to fetch — possible causes:<br>① Wrong webhook URL in Config<br>② n8n workflow not Published/Active<br>③ ngrok tunnel is offline (restart ngrok)';
    }
    showError(msg);
  } finally {
    btn.disabled = false;
  }
}

// ── Search PO DBC ──────────────────────────────────────────────────
function renderSearchDBC(raw, po) {
  const area = document.getElementById('results-area');
  lastSearchDBCData = raw;

  const header = Array.isArray(raw.header) ? raw.header : [];
  const lines  = Array.isArray(raw.lines)  ? raw.lines  : [];

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

  const totalQty = lines.reduce((s, r) => s + (parseFloat(r.PURCHQTY  || 0) || 0), 0);
  const totalAmt = lines.reduce((s, r) => s + (parseFloat(r.LINEAMOUNT || 0) || 0), 0);

  const summaryHTML = `
    <div class="summary-row">
      <div class="summary-card"><div class="summary-label">Header Rows</div><div class="summary-value" style="color:#38bdf8;">${header.length}</div></div>
      <div class="summary-card"><div class="summary-label">Line Rows</div><div class="summary-value blue">${lines.length}</div></div>
      <div class="summary-card"><div class="summary-label">Total Qty</div><div class="summary-value">${parseFloat(totalQty).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Total Amount</div><div class="summary-value">${parseFloat(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
    </div>`;

  const headerCols = ['CREATED', 'EXPORTED', 'STATUS', 'VENDOR AX', 'COMPANY', 'PURCHID', 'ORDER ACCT', 'INVOICE ACCT', 'CURRENCY'];
  const headerKeys = ['CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'VENDORAXACCOUNT', 'COMPANY', 'PURCHID', 'ORDERACCOUNT', 'INVOICEACCOUNT', 'CURRENCYCODE'];

  const headerRowsHTML = header.map(r =>
    '<tr>' + headerKeys.map(k => {
      const v = r[k] != null && r[k] !== '' ? r[k] : '—';
      return v === '—' ? `<td class="td-dim">—</td>` : `<td>${v}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const linesCols = ['LINE', 'CREATED', 'EXPORTED', 'STATUS', 'QTY', 'PRICE', 'AMOUNT', 'JOB NO', 'INVENT STATUS', 'SEASON', 'COLOR ID', 'COLOR NAME', 'SIZE FABRIC', 'SIZE ID', 'COMPANY', 'SITE', 'LOCATION'];
  const linesKeys = ['LINENUMBER', 'CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSTATUS', 'SEASON', 'COLORID', 'COLORNAME', 'SIZEIDFABRIC', 'SIZEID', 'COMPANY', 'SITEID', 'LOCATIONID'];

  const linesRowsHTML = lines.map(r =>
    '<tr>' + linesKeys.map(k => {
      let v = r[k] != null && r[k] !== '' ? r[k] : '—';
      if (v !== '—') {
        if (k === 'PURCHQTY')   v = parseFloat(v || 0).toFixed(0);
        if (k === 'PURCHPRICE') v = parseFloat(v || 0).toFixed(5);
        if (k === 'LINEAMOUNT') v = parseFloat(v || 0).toFixed(2);
      }
      if (k === 'LINENUMBER') return `<td class="num">${v}</td>`;
      return v === '—' ? `<td class="td-dim">—</td>` : `<td>${v}</td>`;
    }).join('') + '</tr>'
  ).join('');

  area.innerHTML = `
    ${summaryHTML}
    <div class="results-meta">
      <span class="results-count">PO <strong>${po}</strong> —
        <span style="color:#38bdf8">${header.length} Header</span> ·
        <span style="color:var(--accent)">${lines.length} Lines</span>
      </span>
      <span class="tag tag-searchdbc">SEARCH PO DBC</span>
      <button onclick="exportDBCToExcel()" style="margin-left:auto;padding:5px 14px;background:var(--surface2);border:1px solid var(--green);color:var(--green);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:0.05em;font-weight:600;transition:all 0.15s;" onmouseover="this.style.background='var(--green-glow)'" onmouseout="this.style.background='var(--surface2)'">&#11015; Export Excel</button>
    </div>
    <div style="padding:0 28px 8px;font-family:var(--mono);font-size:10px;color:#38bdf8;letter-spacing:0.1em;text-transform:uppercase;">&#9472;&#9472; Header</div>
    <div class="table-wrap" style="max-height:200px;flex:none;">
      <table>
        <thead><tr>${headerCols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${headerRowsHTML}</tbody>
      </table>
    </div>
    <div style="padding:10px 28px 8px;font-family:var(--mono);font-size:10px;color:var(--accent);letter-spacing:0.1em;text-transform:uppercase;">&#9472;&#9472; Lines</div>
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

  const wb   = XLSX.utils.book_new();
  const po   = document.getElementById('po-input').value.trim();
  const name = `PO_SearchDBC_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const headerKeys = ['CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'VENDORAXACCOUNT', 'COMPANY', 'PURCHID', 'ORDERACCOUNT', 'INVOICEACCOUNT', 'CURRENCYCODE'];
  const headerCols = ['CREATED', 'EXPORTED', 'STATUS', 'VENDOR AX', 'COMPANY', 'PURCHID', 'ORDER ACCT', 'INVOICE ACCT', 'CURRENCY'];
  if (header.length) {
    const ws = XLSX.utils.aoa_to_sheet([headerCols, ...header.map(r => headerKeys.map(k => r[k] ?? ''))]);
    XLSX.utils.book_append_sheet(wb, ws, 'Header');
  }

  const linesKeys = ['LINENUMBER', 'CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSTATUS', 'SEASON', 'COLORID', 'COLORNAME', 'SIZEIDFABRIC', 'SIZEID', 'COMPANY', 'SITEID', 'LOCATIONID'];
  const linesCols = ['LINE', 'CREATED', 'EXPORTED', 'STATUS', 'QTY', 'PRICE', 'AMOUNT', 'JOB NO', 'INVENT STATUS', 'SEASON', 'COLOR ID', 'COLOR NAME', 'SIZE FABRIC', 'SIZE ID', 'COMPANY', 'SITE', 'LOCATION'];
  if (lines.length) {
    const ws = XLSX.utils.aoa_to_sheet([linesCols, ...lines.map(r => linesKeys.map(k => r[k] ?? ''))]);
    XLSX.utils.book_append_sheet(wb, ws, 'Lines');
  }

  XLSX.writeFile(wb, name);
}

// ── Compare PO Stg vs DBC ──────────────────────────────────────────
function renderCompareDBC(stagingRows, dbcLines, po) {
  const area = document.getElementById('results-area');

  // Keep only the row with MAX CREATEDATETIME per LINENUMBER
  const dbcLatestMap = {};
  dbcLines.forEach(r => {
    const ln = r.LINENUMBER;
    if (!dbcLatestMap[ln] || String(r.CREATEDATETIME) > String(dbcLatestMap[ln].CREATEDATETIME)) {
      dbcLatestMap[ln] = r;
    }
  });
  const dbcLinesDeduped = Object.values(dbcLatestMap);

  lastCompareDBC = { stagingRows, dbcLines: dbcLinesDeduped };
  updateBadge('comparedbc', stagingRows.length + dbcLinesDeduped.length);

  // Staging accessors
  const sLine  = r => parseFloat(getVal(r, 'LINENUMBER'))   || 0;
  const sQty   = r => parseFloat(getVal(r, 'PURCHQTY'))     || 0;
  const sPrice = r => parseFloat(getVal(r, 'PURCHPRICE'))   || 0;
  const sAmt   = r => parseFloat(getVal(r, 'LINEAMOUNT'))   || 0;
  const sSize  = r => getVal(r, 'INVENTSIZEID')   ?? '—';
  const sColor = r => getVal(r, 'INVENTCOLORID')  ?? '—';
  const sSeason= r => getVal(r, 'INVENTSTYLEID')  ?? '—';
  const sXfer  = r => parseInt(getVal(r, 'TRANSFERSTATUS'));

  // DBC accessors
  const dLine  = r => parseFloat(r.LINENUMBER)  || 0;
  const dQty   = r => parseFloat(r.PURCHQTY)    || 0;
  const dPrice = r => parseFloat(r.PURCHPRICE)  || 0;
  const dAmt   = r => parseFloat(r.LINEAMOUNT)  || 0;
  const dSize  = r => r.SIZEID     ?? '—';
  const dColor = r => r.COLORID    ?? '—';
  const dSeason= r => r.SEASON     ?? '—';
  const dStatus= r => r.STATUS     ?? '—';

  // Build keyed maps
  const stagingMap = {};
  stagingRows.forEach(r => { stagingMap[sLine(r)] = r; });
  const dbcMap = {};
  dbcLinesDeduped.forEach(r => { dbcMap[dLine(r)] = r; });

  const allLines = [...new Set([
    ...stagingRows.map(r => sLine(r)),
    ...dbcLinesDeduped.map(r => dLine(r))
  ])].sort((a, b) => a - b);

  // Totals
  const stgTotalQty = stagingRows.reduce((s, r) => s + sQty(r), 0);
  const stgTotalAmt = stagingRows.reduce((s, r) => s + sAmt(r), 0);
  const dbcTotalQty = dbcLinesDeduped.reduce((s, r) => s + dQty(r), 0);
  const dbcTotalAmt = dbcLinesDeduped.reduce((s, r) => s + dAmt(r), 0);
  const diffQty = dbcTotalQty - stgTotalQty;
  const diffAmt = dbcTotalAmt - stgTotalAmt;
  const qtyMatch = Math.abs(diffQty) < 0.01;
  const amtMatch = Math.abs(diffAmt) < 0.01;
  const lineMatch = stagingRows.length === dbcLinesDeduped.length;

  let mismatchLines = 0, onlyStg = 0, onlyDbc = 0;
  allLines.forEach(ln => {
    const s = stagingMap[ln], d = dbcMap[ln];
    if (!s) onlyDbc++;
    else if (!d) onlyStg++;
    else if (Math.abs(dQty(d) - sQty(s)) > 0.01 || Math.abs(dPrice(d) - sPrice(s)) > 0.0001) mismatchLines++;
  });
  const issueCount = mismatchLines + onlyStg + onlyDbc;
  const allMatch = qtyMatch && amtMatch && lineMatch;

  const summaryHTML = `
    <div class="summary-row">
      <div class="summary-card ${lineMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Lines Stg / DBC</div>
        <div class="summary-value ${lineMatch ? 'green' : 'red'}">${stagingRows.length} / ${dbcLinesDeduped.length}</div>
        <div class="summary-sub">${lineMatch ? '&#10003; Match' : '&#10007; Mismatch'}</div>
      </div>
      <div class="summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Total QTY Staging</div>
        <div class="summary-value blue">${fmt(stgTotalQty, 0)}</div>
        <div class="summary-sub" style="color:#e879f9">DBC: ${fmt(dbcTotalQty, 0)}</div>
      </div>
      <div class="summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">QTY Diff (DBC &#8722; Stg)</div>
        <div class="summary-value ${qtyMatch ? 'teal' : 'red'}">${diffQty >= 0 ? '+' : ''}${fmt(diffQty, 0)}</div>
        <div class="summary-sub">${qtyMatch ? '&#10003; Match' : '&#10007; Mismatch'}</div>
      </div>
      <div class="summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Total Amount Staging</div>
        <div class="summary-value blue">${fmt(stgTotalAmt, 2)}</div>
        <div class="summary-sub" style="color:#e879f9">DBC: ${fmt(dbcTotalAmt, 2)}</div>
      </div>
      <div class="summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Amount Diff (DBC &#8722; Stg)</div>
        <div class="summary-value ${amtMatch ? 'teal' : 'red'}">${diffAmt >= 0 ? '+' : ''}${fmt(diffAmt, 2)}</div>
        <div class="summary-sub">${amtMatch ? '&#10003; Match' : '&#10007; Mismatch'}</div>
      </div>
      <div class="summary-card ${issueCount === 0 ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Line Issues</div>
        <div class="summary-value ${issueCount === 0 ? 'green' : 'red'}">${issueCount}</div>
        <div class="summary-sub">${mismatchLines} qty/amt &#183; ${onlyStg} stg-only &#183; ${onlyDbc} dbc-only</div>
      </div>
    </div>`;

  const cols = ['LINE', 'ITEM ID', 'COLOR', 'SIZE', 'SEASON',
    'STG QTY', 'DBC QTY', '&#916; QTY',
    'STG PRICE', 'DBC PRICE', '&#916; PRICE',
    'DBC STATUS', 'STG TRANSFER', 'STATUS'];

  const rows_html = allLines.map(ln => {
    const s = stagingMap[ln], d = dbcMap[ln];
    let rowClass = 'row-match';
    if (!s) rowClass = 'row-only-ax';
    else if (!d) rowClass = 'row-only-staging';
    else {
      const qd = Math.abs(dQty(d) - sQty(s));
      const pd = Math.abs(dPrice(d) - sPrice(s));
      if (qd > 0.01 || pd > 0.0001) rowClass = 'row-mismatch';
    }

    const itemId = s ? (getVal(s, 'ITEMID') ?? '—') : '—';
    const color  = s ? sColor(s)  : (d ? dColor(d)  : '—');
    const size   = s ? sSize(s)   : (d ? dSize(d)   : '—');
    const season = s ? sSeason(s) : (d ? dSeason(d) : '—');

    const stgQty   = s ? sQty(s)   : null;
    const dbcQty   = d ? dQty(d)   : null;
    const stgPrice = s ? sPrice(s) : null;
    const dbcPrice = d ? dPrice(d) : null;

    const dQ = (stgQty !== null && dbcQty !== null)     ? (dbcQty   - stgQty)   : null;
    const dP = (stgPrice !== null && dbcPrice !== null)  ? (dbcPrice - stgPrice) : null;
    const qtyOk   = dQ !== null && Math.abs(dQ) < 0.01;
    const priceOk = dP !== null && Math.abs(dP) < 0.0001;

    const tLabels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
    const tCls    = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };

    const dbcStat = d ? parseInt(dStatus(d)) : null;
    const isImported = dbcStat === 9;

    const dbcStatusCell = d
      ? `<td><span style="font-family:var(--mono);font-size:11px;padding:2px 7px;border-radius:4px;background:${isImported ? 'rgba(62,207,142,0.12)' : 'rgba(251,146,60,0.12)'};color:${isImported ? 'var(--green)' : 'var(--orange)'};">${dbcStat}</span></td>`
      : `<td class="td-dim">&#8212;</td>`;

    let transferCell;
    if (!s) {
      transferCell = `<td class="td-dim">&#8212;</td>`;
    } else if (!isImported) {
      transferCell = `<td><span class="transfer-badge transfer-pending">&#8856; Not Imported</span></td>`;
    } else {
      const tv = sXfer(s);
      transferCell = `<td><span class="transfer-badge ${tCls[tv] || 'transfer-pending'}">&#9679; ${tLabels[tv] || '?'}</span></td>`;
    }

    let statusCell;
    if (!s) statusCell = `<td><span class="match-badge match-ax">DBC Only</span></td>`;
    else if (!d) statusCell = `<td><span class="match-badge match-staging">Stg Only</span></td>`;
    else if (!qtyOk || !priceOk) statusCell = `<td><span class="match-badge match-bad">&#10007; Mismatch</span></td>`;
    else statusCell = `<td><span class="match-badge match-ok">&#10003; Match</span></td>`;

    const tdNum = (v, dec = 0, bad = false) => v !== null
      ? `<td class="num${bad ? ' td-mismatch' : ''}">${fmt(v, dec)}</td>`
      : `<td class="diff-missing">&#8212;</td>`;
    const tdDiff = (delta, ok) => {
      if (delta === null) return `<td class="diff-missing">&#8212;</td>`;
      if (Math.abs(delta) < 0.0001) return `<td class="diff-zero">0</td>`;
      return `<td class="${ok ? 'diff-ok' : 'diff-bad'}">${delta > 0 ? '+' : ''}${fmt(delta, delta % 1 === 0 ? 0 : 5)}</td>`;
    };

    return `<tr class="${rowClass}">
      <td class="num">${ln}</td>
      <td>${itemId !== '—' ? itemId : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${color  !== '—' ? color  : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${size   !== '—' ? size   : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${season !== '—' ? season : '<span class="td-dim">&#8212;</span>'}</td>
      ${tdNum(stgQty,   0, !qtyOk   && stgQty   !== null && dbcQty   !== null)}
      ${tdNum(dbcQty,   0, !qtyOk   && stgQty   !== null && dbcQty   !== null)}
      ${tdDiff(dQ, qtyOk)}
      ${tdNum(stgPrice, 5, !priceOk && stgPrice !== null && dbcPrice !== null)}
      ${tdNum(dbcPrice, 5, !priceOk && stgPrice !== null && dbcPrice !== null)}
      ${tdDiff(dP, priceOk)}
      ${dbcStatusCell}
      ${transferCell}
      ${statusCell}
    </tr>`;
  }).join('');

  const groupHeaderHTML = `<tr>
    <th colspan="5" class="th-group-base" style="border-right:1px solid var(--border-accent);">LINE INFO</th>
    <th colspan="3" class="th-group-staging" style="border-right:1px solid rgba(79,156,249,0.2);">QTY</th>
    <th colspan="3" class="th-group-ax" style="border-right:1px solid rgba(232,121,249,0.2);">PRICE</th>
    <th colspan="3" class="th-group-diff">STATUS</th>
  </tr>`;

  const uniqOpts = (sField, dField) => {
    const vals = new Set();
    stagingRows.forEach(r => { const v = getVal(r, sField); if (v && v !== '—') vals.add(String(v)); });
    dbcLinesDeduped.forEach(r => { const v = r[dField]; if (v && v !== '—') vals.add(String(v)); });
    return [...vals].sort();
  };
  const mkSel = (id, label, opts) => `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">${label}</div>
      <select id="${id}" onchange="applyCompareDBC()"
        style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
        <option value="">All</option>
        ${opts.map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>
    </div>`;

  area.innerHTML = `
    ${summaryHTML}
    <div class="results-meta">
      <span class="results-count">
        Comparing PO <strong>${po}</strong> &#8212;
        <span style="color:var(--accent)" id="comparedbc-stg-count">${stagingRows.length} Staging</span> vs
        <span style="color:#e879f9">${dbcLinesDeduped.length} DBC Lines</span>
      </span>
      <span class="tag tag-comparedbc">COMPARE STG vs DBC</span>
      ${allMatch ? '<span class="tag tag-ok">&#10003; FULL MATCH</span>' : `<span class="tag tag-list">&#10007; ${issueCount} ISSUE${issueCount !== 1 ? 'S' : ''}</span>`}
      <button onclick="exportToExcel()" style="margin-left:auto;padding:5px 14px;background:var(--surface2);border:1px solid var(--green);color:var(--green);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:0.05em;font-weight:600;transition:all 0.15s;" onmouseover="this.style.background='var(--green-glow)'" onmouseout="this.style.background='var(--surface2)'">&#11015; Export Excel</button>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:10px 28px 4px;">
      ${mkSel('cdbc-filter-color',  'Color',  uniqOpts('INVENTCOLORID', 'COLORID'))}
      ${mkSel('cdbc-filter-size',   'Size',   uniqOpts('INVENTSIZEID',  'SIZEID'))}
      ${mkSel('cdbc-filter-season', 'Season', uniqOpts('INVENTSTYLEID', 'SEASON'))}
      ${mkSel('cdbc-filter-status', 'Status', ['Match', 'Mismatch', 'DBC Only', 'Stg Only'])}
      <button onclick="['cdbc-filter-color','cdbc-filter-size','cdbc-filter-season','cdbc-filter-status'].forEach(id=>document.getElementById(id).value='');applyCompareDBC();"
        style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">&#10005; Clear</button>
      <span id="comparedbc-line-count" style="align-self:flex-end;font-family:var(--mono);font-size:11px;color:var(--text-dim);">${allLines.length} lines</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          ${groupHeaderHTML}
          <tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody id="comparedbc-tbody">${rows_html}</tbody>
      </table>
    </div>`;
}

function applyCompareDBC() {
  const tbody = document.getElementById('comparedbc-tbody');
  if (!tbody) return;

  const { stagingRows, dbcLines } = lastCompareDBC;
  const fColor  = document.getElementById('cdbc-filter-color')?.value  || '';
  const fSize   = document.getElementById('cdbc-filter-size')?.value   || '';
  const fSeason = document.getElementById('cdbc-filter-season')?.value || '';
  const fStatus = document.getElementById('cdbc-filter-status')?.value || '';

  const sLine  = r => parseFloat(getVal(r, 'LINENUMBER')) || 0;
  const sQty   = r => parseFloat(getVal(r, 'PURCHQTY'))   || 0;
  const sPrice = r => parseFloat(getVal(r, 'PURCHPRICE')) || 0;
  const sSize  = r => getVal(r, 'INVENTSIZEID')  ?? '—';
  const sColor = r => getVal(r, 'INVENTCOLORID') ?? '—';
  const sSeason= r => getVal(r, 'INVENTSTYLEID') ?? '—';
  const sXfer  = r => parseInt(getVal(r, 'TRANSFERSTATUS'));

  const dLine  = r => parseFloat(r.LINENUMBER) || 0;
  const dQty   = r => parseFloat(r.PURCHQTY)   || 0;
  const dPrice = r => parseFloat(r.PURCHPRICE) || 0;
  const dSize  = r => r.SIZEID  ?? '—';
  const dColor = r => r.COLORID ?? '—';
  const dSeason= r => r.SEASON  ?? '—';
  const dStatus= r => r.STATUS  ?? '—';

  const stagingMap = {};
  stagingRows.forEach(r => { stagingMap[sLine(r)] = r; });
  const dbcMap = {};
  dbcLines.forEach(r => { dbcMap[dLine(r)] = r; });

  let allLines = [...new Set([
    ...stagingRows.map(r => sLine(r)),
    ...dbcLines.map(r => dLine(r))
  ])].sort((a, b) => a - b);

  allLines = allLines.filter(ln => {
    const s = stagingMap[ln], d = dbcMap[ln];
    const color  = s ? sColor(s)  : (d ? dColor(d)  : '—');
    const size   = s ? sSize(s)   : (d ? dSize(d)   : '—');
    const season = s ? sSeason(s) : (d ? dSeason(d) : '—');
    if (fColor  && color  !== fColor)  return false;
    if (fSize   && size   !== fSize)   return false;
    if (fSeason && season !== fSeason) return false;
    if (fStatus) {
      let rowStatus;
      if (!s) rowStatus = 'DBC Only';
      else if (!d) rowStatus = 'Stg Only';
      else {
        const qd = Math.abs(dQty(d) - sQty(s));
        const pd = Math.abs(dPrice(d) - sPrice(s));
        rowStatus = (qd > 0.01 || pd > 0.0001) ? 'Mismatch' : 'Match';
      }
      if (rowStatus !== fStatus) return false;
    }
    return true;
  });

  const tLabels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
  const tCls    = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };
  const tdNum  = (v, dec = 0) => v !== null ? `<td class="num">${fmt(v, dec)}</td>` : `<td class="diff-missing">&#8212;</td>`;
  const tdDiff = (delta, ok) => {
    if (delta === null) return `<td class="diff-missing">&#8212;</td>`;
    if (Math.abs(delta) < 0.0001) return `<td class="diff-zero">0</td>`;
    return `<td class="${ok ? 'diff-ok' : 'diff-bad'}">${delta > 0 ? '+' : ''}${fmt(delta, delta % 1 === 0 ? 0 : 5)}</td>`;
  };

  tbody.innerHTML = allLines.map(ln => {
    const s = stagingMap[ln], d = dbcMap[ln];
    let rowClass = 'row-match';
    if (!s) rowClass = 'row-only-ax';
    else if (!d) rowClass = 'row-only-staging';
    else {
      const qd = Math.abs(dQty(d) - sQty(s));
      const pd = Math.abs(dPrice(d) - sPrice(s));
      if (qd > 0.01 || pd > 0.0001) rowClass = 'row-mismatch';
    }
    const itemId = s ? (getVal(s, 'ITEMID') ?? '—') : '—';
    const color  = s ? sColor(s)  : (d ? dColor(d)  : '—');
    const size   = s ? sSize(s)   : (d ? dSize(d)   : '—');
    const season = s ? sSeason(s) : (d ? dSeason(d) : '—');
    const stgQty   = s ? sQty(s)   : null;
    const dbcQty   = d ? dQty(d)   : null;
    const stgPrice = s ? sPrice(s) : null;
    const dbcPrice = d ? dPrice(d) : null;
    const dQ = (stgQty !== null && dbcQty !== null)    ? (dbcQty   - stgQty)   : null;
    const dP = (stgPrice !== null && dbcPrice !== null) ? (dbcPrice - stgPrice) : null;
    const qtyOk   = dQ !== null && Math.abs(dQ) < 0.01;
    const priceOk = dP !== null && Math.abs(dP) < 0.0001;
    const dbcStat   = d ? parseInt(dStatus(d)) : null;
    const isImported = dbcStat === 9;
    const dbcStatusCell = d
      ? `<td><span style="font-family:var(--mono);font-size:11px;padding:2px 7px;border-radius:4px;background:${isImported ? 'rgba(62,207,142,0.12)' : 'rgba(251,146,60,0.12)'};color:${isImported ? 'var(--green)' : 'var(--orange)'};">${dbcStat}</span></td>`
      : `<td class="td-dim">&#8212;</td>`;
    let transferCell;
    if (!s) {
      transferCell = `<td class="td-dim">&#8212;</td>`;
    } else if (!isImported) {
      transferCell = `<td><span class="transfer-badge transfer-pending">&#8856; Not Imported</span></td>`;
    } else {
      const tv = sXfer(s);
      transferCell = `<td><span class="transfer-badge ${tCls[tv] || 'transfer-pending'}">&#9679; ${tLabels[tv] || '?'}</span></td>`;
    }
    let statusCell;
    if (!s) statusCell = `<td><span class="match-badge match-ax">DBC Only</span></td>`;
    else if (!d) statusCell = `<td><span class="match-badge match-staging">Stg Only</span></td>`;
    else if (!qtyOk || !priceOk) statusCell = `<td><span class="match-badge match-bad">&#10007; Mismatch</span></td>`;
    else statusCell = `<td><span class="match-badge match-ok">&#10003; Match</span></td>`;
    return `<tr class="${rowClass}">
      <td class="num">${ln}</td>
      <td>${itemId !== '—' ? itemId : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${color  !== '—' ? color  : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${size   !== '—' ? size   : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${season !== '—' ? season : '<span class="td-dim">&#8212;</span>'}</td>
      ${tdNum(stgQty,   0)}${tdNum(dbcQty,   0)}${tdDiff(dQ, qtyOk)}
      ${tdNum(stgPrice, 5)}${tdNum(dbcPrice, 5)}${tdDiff(dP, priceOk)}
      ${dbcStatusCell}${transferCell}${statusCell}
    </tr>`;
  }).join('');

  const lc = document.getElementById('comparedbc-line-count');
  if (lc) lc.textContent = allLines.length + ' lines';
}

// ── Compare PO ─────────────────────────────────────────────────────
function renderCompare(stagingRows, axRows, po) {
  const area = document.getElementById('results-area');
  lastCompareData = { stagingRows, axRows };
  updateBadge('compare', stagingRows.length + axRes_len(axRows));

  // Build lookup maps keyed by LINENUMBER (primary) + ITEMID (secondary)
  const makeKey = (r, lineKey, itemKey) => {
    const line = String(getVal(r, lineKey) ?? '').trim();
    const item = String(getVal(r, itemKey) ?? '').trim();
    return line + '::' + item;
  };

  // Staging row accessors
  const sLine = r => parseFloat(getVal(r, 'LINENUMBER')) || 0;
  const sQty = r => parseFloat(getVal(r, 'PURCHQTY')) || 0;
  const sAmt = r => parseFloat(getVal(r, 'LINEAMOUNT')) || 0;
  const sPrice = r => parseFloat(getVal(r, 'PURCHPRICE')) || 0;
  const sItem = r => getVal(r, 'ITEMID') ?? '—';
  const sSize = r => getVal(r, 'INVENTSIZEID') ?? '—';
  const sColor = r => getVal(r, 'INVENTCOLORID') ?? '—';
  const sTransfer = r => parseInt(getVal(r, 'TRANSFERSTATUS'));

  // AX row accessors (PURCHLINE aliases)
  const aLine = r => parseFloat(getVal(r, 'LINENUMBER')) || 0;
  // AX qty: could be 'QTY' alias or 'PURCHQTY'
  const aQty = r => parseFloat(getVal(r, 'QTY') ?? getVal(r, 'PURCHQTY')) || 0;
  // AX amount: 'Net amount' alias or 'LINEAMOUNT'
  const aAmt = r => parseFloat(getVal(r, 'Net amount') ?? getVal(r, 'LINEAMOUNT')) || 0;
  // AX price: 'Unit Price' alias or 'PURCHPRICE'
  const aPrice = r => parseFloat(getVal(r, 'Unit Price') ?? getVal(r, 'PURCHPRICE')) || 0;
  const aItem = r => getVal(r, 'ITEMID') ?? '—';
  // AX size: 'Size' alias or 'IVZ_SIZE_CT'
  const aSize = r => getVal(r, 'Size') ?? getVal(r, 'IVZ_SIZE_CT') ?? '—';
  // AX color: 'Color' alias or 'IVZ_COLOR_CT'
  const aColor = r => getVal(r, 'Color') ?? getVal(r, 'IVZ_COLOR_CT') ?? '—';

  // Build maps: lineNumber → row
  const stagingMap = {};
  stagingRows.forEach(r => { stagingMap[sLine(r)] = r; });
  const axMap = {};
  axRows.forEach(r => { axMap[aLine(r)] = r; });

  // Union of all line numbers
  const allLines = [...new Set([
    ...stagingRows.map(r => sLine(r)),
    ...axRows.map(r => aLine(r))
  ])].sort((a, b) => a - b);

  // Totals
  const stagingTotalQty = stagingRows.reduce((s, r) => s + sQty(r), 0);
  const stagingTotalAmt = stagingRows.reduce((s, r) => s + sAmt(r), 0);
  const axTotalQty = axRows.reduce((s, r) => s + aQty(r), 0);
  const axTotalAmt = axRows.reduce((s, r) => s + aAmt(r), 0);
  const diffQty = axTotalQty - stagingTotalQty;
  const diffAmt = axTotalAmt - stagingTotalAmt;
  const qtyMatch = Math.abs(diffQty) < 0.01;
  const amtMatch = Math.abs(diffAmt) < 0.01;
  const lineMatch = stagingRows.length === axRows.length;
  const allMatch = qtyMatch && amtMatch && lineMatch;

  // Count mismatches per line
  let mismatchLines = 0, onlyStaging = 0, onlyAx = 0;
  allLines.forEach(ln => {
    const s = stagingMap[ln], a = axMap[ln];
    if (!s) { onlyAx++; }
    else if (!a) { onlyStaging++; }
    else {
      const qDiff = Math.abs(aQty(a) - sQty(s));
      const aDiff = Math.abs(aAmt(a) - sAmt(s));
      if (qDiff > 0.01 || aDiff > 0.01) mismatchLines++;
    }
  });

  // ── Summary cards ──
  const summaryHTML = `
    <div class="summary-row">
      <div class="summary-card ${lineMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Lines Staging / AX</div>
        <div class="summary-value ${lineMatch ? 'green' : 'red'}">${stagingRows.length} / ${axRows.length}</div>
        <div class="summary-sub">${lineMatch ? '✓ Match' : '✗ Mismatch'}</div>
      </div>
      <div class="summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Total QTY Staging</div>
        <div class="summary-value blue">${fmt(stagingTotalQty, 0)}</div>
        <div class="summary-sub" style="color:var(--purple)">AX: ${fmt(axTotalQty, 0)}</div>
      </div>
      <div class="summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">QTY Diff (AX − Staging)</div>
        <div class="summary-value ${qtyMatch ? 'teal' : 'red'}">${diffQty >= 0 ? '+' : ''}${fmt(diffQty, 0)}</div>
        <div class="summary-sub">${qtyMatch ? '✓ Match' : '✗ Mismatch'}</div>
      </div>
      <div class="summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Total Amount Staging</div>
        <div class="summary-value blue">${fmt(stagingTotalAmt, 2)}</div>
        <div class="summary-sub" style="color:var(--purple)">AX: ${fmt(axTotalAmt, 2)}</div>
      </div>
      <div class="summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Amount Diff (AX − Staging)</div>
        <div class="summary-value ${amtMatch ? 'teal' : 'red'}">${diffAmt >= 0 ? '+' : ''}${fmt(diffAmt, 2)}</div>
        <div class="summary-sub">${amtMatch ? '✓ Match' : '✗ Mismatch'}</div>
      </div>
      <div class="summary-card ${mismatchLines + onlyStaging + onlyAx === 0 ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">Line Issues</div>
        <div class="summary-value ${mismatchLines + onlyStaging + onlyAx === 0 ? 'green' : 'red'}">${mismatchLines + onlyStaging + onlyAx}</div>
        <div class="summary-sub">${mismatchLines} qty/amt · ${onlyStaging} stg-only · ${onlyAx} ax-only</div>
      </div>
    </div>`;

  // ── Comparison table ──
  const cols = ['LINE', 'ITEM ID', 'SIZE', 'COLOR',
    'STG QTY', 'AX QTY', 'Δ QTY',
    'STG PRICE', 'AX PRICE', 'Δ PRICE',
    'TRANSFER', 'STATUS'];

  const rows_html = allLines.map(ln => {
    const s = stagingMap[ln];
    const a = axMap[ln];

    let rowClass = 'row-match';
    if (!s) rowClass = 'row-only-ax';
    else if (!a) rowClass = 'row-only-staging';
    else {
      const qd = Math.abs(aQty(a) - sQty(s));
      const pd = Math.abs(aPrice(a) - sPrice(s));
      if (qd > 0.01 || pd > 0.0001) rowClass = 'row-mismatch';
    }

    const itemId = s ? sItem(s) : (a ? aItem(a) : '—');
    const size = s ? sSize(s) : (a ? aSize(a) : '—');
    const color = s ? sColor(s) : (a ? aColor(a) : '—');

    const stgQty = s ? sQty(s) : null;
    const axQty = a ? aQty(a) : null;
    const stgPrice = s ? sPrice(s) : null;
    const axPrice = a ? aPrice(a) : null;

    const dQty = (stgQty !== null && axQty !== null) ? (axQty - stgQty) : null;
    const dPrice = (stgPrice !== null && axPrice !== null) ? (axPrice - stgPrice) : null;

    const qtyOk = dQty !== null && Math.abs(dQty) < 0.01;
    const priceOk = dPrice !== null && Math.abs(dPrice) < 0.0001;

    const transfer = s ? sTransfer(s) : null;
    const tLabels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
    const tCls = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };
    const tv = transfer !== null ? transfer : -1;
    const transferCell = s
      ? `<td><span class="transfer-badge ${tCls[tv] || 'transfer-pending'}">● ${tLabels[tv] || '?'}</span></td>`
      : `<td class="td-dim">—</td>`;

    let statusCell;
    if (!s) statusCell = `<td><span class="match-badge match-ax">AX Only</span></td>`;
    else if (!a) statusCell = `<td><span class="match-badge match-staging">Staging Only</span></td>`;
    else if (!qtyOk || !priceOk) statusCell = `<td><span class="match-badge match-bad">✗ Mismatch</span></td>`;
    else statusCell = `<td><span class="match-badge match-ok">✓ Match</span></td>`;

    const tdNum = (v, dec = 0, isMismatch = false) => v !== null
      ? `<td class="num${isMismatch ? ' td-mismatch' : ''}">${fmt(v, dec)}</td>`
      : `<td class="diff-missing">—</td>`;

    const tdDiff = (d, ok) => {
      if (d === null) return `<td class="diff-missing">—</td>`;
      if (Math.abs(d) < 0.0001) return `<td class="diff-zero">0</td>`;
      return `<td class="${ok ? 'diff-ok' : 'diff-bad'}">${d > 0 ? '+' : ''}${fmt(d, d % 1 === 0 ? 0 : 5)}</td>`;
    };

    return `<tr class="${rowClass}">
      <td class="num">${ln}</td>
      <td>${itemId !== '—' ? itemId : '<span class="td-dim">—</span>'}</td>
      <td>${size !== '—' ? size : '<span class="td-dim">—</span>'}</td>
      <td>${color !== '—' ? color : '<span class="td-dim">—</span>'}</td>
      ${tdNum(stgQty, 0, !qtyOk && stgQty !== null && axQty !== null)}
      ${tdNum(axQty, 0, !qtyOk && stgQty !== null && axQty !== null)}
      ${tdDiff(dQty, qtyOk)}
      ${tdNum(stgPrice, 5, !priceOk && stgPrice !== null && axPrice !== null)}
      ${tdNum(axPrice, 5, !priceOk && stgPrice !== null && axPrice !== null)}
      ${tdDiff(dPrice, priceOk)}
      ${transferCell}
      ${statusCell}
    </tr>`;
  }).join('');

  // Group header row for column grouping
  const groupHeaderHTML = `<tr>
    <th colspan="4" class="th-group-base" style="border-right:1px solid var(--border-accent);">LINE INFO</th>
    <th colspan="3" class="th-group-staging" style="border-right:1px solid rgba(79,156,249,0.2);">QTY</th>
    <th colspan="3" class="th-group-ax" style="border-right:1px solid rgba(167,139,250,0.2);">PRICE</th>
    <th colspan="2" class="th-group-diff">STATUS</th>
  </tr>`;

  const uniqCompareOpts = (sField, aField, aFieldAlt) => {
    const vals = new Set();
    stagingRows.forEach(r => { const v = getVal(r, sField); if (v && v !== '—') vals.add(String(v)); });
    axRows.forEach(r => { const v = getVal(r, aField) ?? (aFieldAlt ? getVal(r, aFieldAlt) : undefined); if (v && v !== '—') vals.add(String(v)); });
    return [...vals].sort();
  };
  const mkCompareSelect = (id, label, opts) => `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">${label}</div>
      <select id="${id}" onchange="applyCompareFilter()"
        style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
        <option value="">All</option>
        ${opts.map(v => `<option value="${v}">${v}</option>`).join('')}
      </select>
    </div>`;

  area.innerHTML = `
    ${summaryHTML}
    <div class="results-meta">
      <span class="results-count">
        Comparing PO <strong>${po}</strong> —
        <span style="color:var(--accent)" id="compare-staging-count">${stagingRows.length} Staging</span> vs
        <span style="color:var(--purple)">${axRows.length} AX Lines</span>
      </span>
      <span class="tag tag-compare">COMPARE PO</span>
      ${allMatch ? '<span class="tag tag-ok">✓ FULL MATCH</span>' : `<span class="tag tag-list">✗ ${mismatchLines + onlyStaging + onlyAx} ISSUE${mismatchLines + onlyStaging + onlyAx !== 1 ? 'S' : ''}</span>`}
      <button onclick="exportToExcel()" style="margin-left:auto;padding:5px 14px;background:var(--surface2);border:1px solid var(--green);color:var(--green);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:0.05em;font-weight:600;transition:all 0.15s;" onmouseover="this.style.background='var(--green-glow)'" onmouseout="this.style.background='var(--surface2)'">⬇ Export Excel</button>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:10px 28px 4px;">
      ${mkCompareSelect('compare-filter-color', 'Color', uniqCompareOpts('INVENTCOLORID', 'Color', 'IVZ_COLOR_CT'))}
      ${mkCompareSelect('compare-filter-size', 'Size', uniqCompareOpts('INVENTSIZEID', 'Size', 'IVZ_SIZE_CT'))}
      ${mkCompareSelect('compare-filter-season', 'Season', uniqCompareOpts('INVENTSTYLEID', 'Season', 'IVZ_SEASON_CT'))}
      ${mkCompareSelect('compare-filter-status', 'Status', ['Match', 'Mismatch', 'AX Only', 'Staging Only'])}
      <button onclick="['compare-filter-color','compare-filter-size','compare-filter-season','compare-filter-status'].forEach(id=>document.getElementById(id).value='');applyCompareFilter();"
        style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
      <span id="compare-line-count" style="align-self:flex-end;font-family:var(--mono);font-size:11px;color:var(--text-dim);">${allLines.length} lines</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          ${groupHeaderHTML}
          <tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>
        </thead>
        <tbody id="compare-tbody">${rows_html}</tbody>
      </table>
    </div>`;
}

// tiny helper used in renderCompare before axRows is destructured
function axRes_len(arr) { return arr ? arr.length : 0; }

// ── Render Results (non-compare modes) ────────────────────────────
function renderResults(rows, po, serverTotalQty, serverTotalAmount, raw = {}) {
  const area = document.getElementById('results-area');
  const modeInfo = MODES[mode] ?? { label: mode.toUpperCase(), tagClass: 'tag-update', navClass: 'active-update' };

  if (rows.length === 0) {
    const icons = { search: '⊘', list: '✅', count: '⊘', update: '⊘', packroll: '⊘', check: '⊘' };
    const msgs = {
      search: `No staging data found for PO <strong>${po}</strong>.`,
      list: `✅ No errors — all lines transferred successfully for PO <strong>${po}</strong>.`,
      count: `No PO lines found in AX for PO <strong>${po}</strong>.`,
      update: `No Pack/Roll records found for PO <strong>${po}</strong>.`,
      packroll: `No QTY Pack/Roll lines found for PO <strong>${po}</strong>.`,
      check: `No BotPO data found for PO <strong>${po}</strong>.`
    };
    area.innerHTML = `
      <div class="state-box" style="border-style:solid;border-color:${mode === 'list' ? 'rgba(62,207,142,0.3)' : 'var(--border)'};">
        <div class="state-icon">${icons[mode]}</div>
        <span style="color:var(--text);">${msgs[mode]}</span>
      </div>`;
    updateBadge(mode, 0);
    return;
  }

  updateBadge(mode, rows.length);


  let cols, colKeys;

  if (mode === 'search') {
    cols = ['LINE', 'EXEC ID', 'ITEM ID', 'SIZE', 'COLOR', 'STYLE', 'QTY', 'PRICE', 'AMOUNT', 'JOB NO', 'SITE', 'LOCATION', 'STATUS', 'TRANSFER'];
    colKeys = ['LINENUMBER', 'EXECUTIONID', 'ITEMID', 'INVENTSIZEID', 'INVENTCOLORID', 'INVENTSTYLEID', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSITEID', 'INVENTLOCATIONID', 'INVENTSTATUSID', 'TRANSFERSTATUS'];
  } else if (mode === 'list') {
    cols = ['LINE', 'EXEC ID', 'PO', 'ITEM ID', 'SIZE', 'COLOR', 'SEASON', 'QTY', 'PRICE', 'TRANSFER'];
    colKeys = ['LINENUMBER', 'EXECUTIONID', 'PURCHID', 'ITEMID', 'INVENTSIZEID', 'INVENTCOLORID', 'INVENTSEASONID', 'PURCHQTY', 'PURCHPRICE', 'TRANSFERSTATUS'];
  } else if (mode === 'count') {
    cols = ['LINE', 'PO', 'ITEM ID', 'COLOR', 'SIZE', 'SEASON', 'QTY', 'UNIT PRICE', 'NET AMOUNT', 'UNIT'];
    colKeys = ['LINENUMBER', 'PURCHID', 'ITEMID', 'IVZ_COLOR_CT', 'IVZ_SIZE_CT', 'IVZ_SEASON_CT', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'PURCHUNIT'];
  } else if (mode === 'check') {
    cols = ['EXEC ID', 'SITE', 'LINE', 'PO', 'ITEM ID', 'SIZE', 'COLOR', 'SEASON'];
    colKeys = ['EXECUTIONID', 'INVENTSITEID', 'LINENUMBER', 'PURCHID', 'ITEMID', 'INVENTSIZEID', 'INVENTCOLORID', 'INVENTSEASONID'];
  } else if (mode === 'packroll') {
    cols = ['LINE', 'PURCHID', 'ITEM ID', 'QUANTITY', 'RECEIVED', 'Deliver_Remainder', 'ORDERED', 'Invent_Unit_QTY', 'Compare_O_I', 'Compare_Q_R'];
    colKeys = ['LINENUMBER', 'PURCHID', 'ITEMID', 'Quantity', 'Received', 'Deliver_Remainder', 'Ordered', 'Invent_Unit_QTY', 'Compare_O_I', 'Compare_Q_R'];
  } else {
    cols = ['ARRIVAL NUM', 'PO', 'LOCATION', 'SITE', 'CREATED', 'POSTED DATE', 'POSTED', 'CREATED BY'];
    colKeys = ['ITEMARRIVALNUM', 'PURCHID', 'INVENTLOCATIONID', 'INVENTSITEID', 'CREATEDDATETIME', 'POSTEDDATETIME', 'POSTED', 'CREATEDBY'];
  }

  const getPO = r => String(getVal(r, 'PURCHID') ?? getVal(r, 'purchid') ?? getVal(r, 'PurchId') ?? '');
  const getLine = r => parseFloat(getVal(r, 'LINENUMBER') ?? getVal(r, 'linenumber') ?? 0) || 0;

  const sortedRows = mode === 'count'
    ? [...rows].sort((a, b) => {
      const pa = getPO(a), pb = getPO(b);
      if (pa !== pb) return pa.localeCompare(pb);
      return getLine(a) - getLine(b);
    })
    : rows;

  const rows_html = sortedRows.map(r => {
    return '<tr>' + colKeys.map(k => {
      let origVal = getVal(r, k);
      let val = (origVal !== undefined && origVal !== null && origVal !== '') ? origVal : '—';

      if (val !== '—') {
        if (k === 'PURCHQTY') val = parseFloat(val || 0).toFixed(0);
        if (k === 'PURCHPRICE' || k === 'Unit Price') val = parseFloat(val || 0).toFixed(5);
        if (k === 'LINEAMOUNT') val = parseFloat(val || 0).toFixed(2);
        if (k === 'Net amount') val = parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (['Quantity', 'Received', 'Deliver Remainder', 'Ordered', 'Invent Unit QTY'].includes(k))
          val = parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      }

      if (k === 'Compare_O_I' || k === 'Compare_Q_R') {
        const isTrue = String(val).toLowerCase() === 'true';
        return `<td><span class="${isTrue ? 'posted-yes' : 'posted-no'}">${isTrue ? '✓ True' : '✗ False'}</span></td>`;
      }
      if (k === 'TRANSFERSTATUS') {
        const v = parseInt(val);
        const labels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
        const cls = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };
        return `<td><span class="transfer-badge ${cls[v] || 'transfer-pending'}">● ${labels[v] || 'Pending'}</span></td>`;
      }
      if (k === 'POSTED') {
        const v = parseInt(val);
        return `<td><span class="${v === 1 ? 'posted-yes' : 'posted-no'}">${v === 1 ? '● Posted' : '○ Not Posted'}</span></td>`;
      }
      if (k === 'LINENUMBER') return `<td class="num">${val}</td>`;
      if (!val || val === '—') return `<td class="td-dim">—</td>`;
      return `<td>${val}</td>`;
    }).join('') + '</tr>';
  }).join('');

  let summaryHTML = '';
  if (mode === 'search') {
    lastSearchRows = rows;
    const totalQty = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'PURCHQTY') || 0) || 0), 0);
    const totalAmt = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'LINEAMOUNT') || 0) || 0), 0);
    const errCount = rows.filter(r => parseInt(getVal(r, 'TRANSFERSTATUS')) === 2).length;
    const okCount = rows.filter(r => parseInt(getVal(r, 'TRANSFERSTATUS')) === 1).length;
    const uniqSearchOpts = key => [...new Set(rows.map(r => getVal(r, key)).filter(v => v != null && v !== ''))].sort();
    const mkSearchSelect = (id, label, opts) => `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">${label}</div>
        <select id="${id}" onchange="applySearchFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
          <option value="">All</option>
          ${opts.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>`;
    summaryHTML = `<div class="summary-row">
      <div class="summary-card"><div class="summary-label">Total Lines</div><div class="summary-value blue" id="search-line-count">${rows.length}</div></div>
      <div class="summary-card"><div class="summary-label">Completed</div><div class="summary-value green">${okCount}</div></div>
      <div class="summary-card"><div class="summary-label">Errors</div><div class="summary-value ${errCount > 0 ? 'red' : 'green'}">${errCount}</div></div>
      <div class="summary-card"><div class="summary-label">Total Qty</div><div class="summary-value">${parseFloat(totalQty).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Total Amount</div><div class="summary-value">${parseFloat(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:10px 0 4px;">
      ${mkSearchSelect('search-filter-color', 'Color', uniqSearchOpts('INVENTCOLORID'))}
      ${mkSearchSelect('search-filter-size', 'Size', uniqSearchOpts('INVENTSIZEID'))}
      ${mkSearchSelect('search-filter-season', 'Season', uniqSearchOpts('INVENTSTYLEID'))}
      <button onclick="document.getElementById('search-filter-color').value='';document.getElementById('search-filter-size').value='';document.getElementById('search-filter-season').value='';applySearchFilter();"
        style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
    </div>`;
  } else if (mode === 'list') {
    lastListRows = rows;
    const uniqFrom = (arr, key) => [...new Set(arr.map(r => getVal(r, key)).filter(v => v && v !== '—'))].join(', ') || '—';
    const poGroups = {};
    rows.forEach(r => {
      const poid = getVal(r, 'PURCHID') || '(unknown)';
      if (!poGroups[poid]) poGroups[poid] = [];
      poGroups[poid].push(r);
    });
    const allItems = uniqFrom(rows, 'ITEMID');
    const allSizes = uniqFrom(rows, 'INVENTSIZEID');
    const allColors = uniqFrom(rows, 'INVENTCOLORID');
    const allSeasons = uniqFrom(rows, 'INVENTSEASONID');
    summaryHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div class="summary-row" style="flex-wrap:wrap;align-items:stretch;">
          <div class="summary-card" style="flex:none;min-width:110px;">
            <div class="summary-label">Error Lines</div>
            <div class="summary-value red">${rows.length}</div>
            <div class="summary-sub">${Object.keys(poGroups).length} PO${Object.keys(poGroups).length !== 1 ? 's' : ''}</div>
          </div>
          <div class="summary-card" style="flex:2;min-width:160px;">
            <div class="summary-label">Items</div>
            <div class="summary-value small" style="color:var(--accent);word-break:break-word;white-space:normal;">${allItems}</div>
          </div>
          <div class="summary-card" style="flex:2;min-width:160px;">
            <div class="summary-label">Sizes</div>
            <div class="summary-value small" style="color:var(--yellow);word-break:break-word;white-space:normal;">${allSizes}</div>
          </div>
          <div class="summary-card" style="flex:2;min-width:160px;">
            <div class="summary-label">Colors</div>
            <div class="summary-value small" style="color:var(--purple);word-break:break-word;white-space:normal;">${allColors}</div>
          </div>
          <div class="summary-card" style="flex:2;min-width:160px;">
            <div class="summary-label">Seasons</div>
            <div class="summary-value small" style="color:var(--teal);word-break:break-word;white-space:normal;">${allSeasons}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;justify-content:center;">
            <button onclick="showFullError()" style="padding:9px 18px;background:var(--red);color:#fff;border:none;border-radius:8px;font-family:var(--mono);font-size:12px;font-weight:600;cursor:pointer;letter-spacing:0.05em;transition:all 0.15s;" onmouseover="this.style.background='#ff8888'" onmouseout="this.style.background='var(--red)'">⚠ Show Full Error</button>
            <button onclick="showErrorSummary()" style="padding:9px 18px;background:var(--orange);color:#fff;border:none;border-radius:8px;font-family:var(--mono);font-size:12px;font-weight:600;cursor:pointer;letter-spacing:0.05em;transition:all 0.15s;" onmouseover="this.style.background='#fdb07a'" onmouseout="this.style.background='var(--orange)'">≡ Error Summarize</button>
          </div>
        </div>
      </div>`;
  } else if (mode === 'count') {
    lastCountRows = rows;
    const row0Qty = rows[0] ? (parseFloat(getVal(rows[0], 'Total QTY')) || 0) : 0;
    const row0Amt = rows[0] ? (parseFloat(getVal(rows[0], 'Total Net amount')) || 0) : 0;
    const sumQty = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'QTY') || getVal(r, 'PURCHQTY')) || 0), 0);
    const sumAmt = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'Net amount') || getVal(r, 'LINEAMOUNT')) || 0), 0);
    let totalQty = serverTotalQty ?? (row0Qty !== 0 ? row0Qty : sumQty);
    let totalAmt = serverTotalAmount ?? (row0Amt !== 0 ? row0Amt : sumAmt);

    const uniqOpts = key => [...new Set(rows.map(r => getVal(r, key)).filter(v => v != null && v !== ''))].sort();
    const mkSelect = (id, label, opts) => `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">${label}</div>
        <select id="${id}" onchange="applyCountFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:110px;">
          <option value="">All</option>
          ${opts.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>`;

    summaryHTML = `
      <div class="summary-row">
        <div class="summary-card"><div class="summary-label">Total Lines</div><div class="summary-value purple" id="count-line-count">${rows.length}</div></div>
        <div class="summary-card"><div class="summary-label">Total QTY</div><div class="summary-value blue">${parseFloat(totalQty).toLocaleString()}</div></div>
        <div class="summary-card"><div class="summary-label">Total Net Amount</div><div class="summary-value">${parseFloat(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:10px 0 4px;">
        ${mkSelect('filter-color', 'Color', uniqOpts('IVZ_COLOR_CT'))}
        ${mkSelect('filter-size', 'Size', uniqOpts('IVZ_SIZE_CT'))}
        ${mkSelect('filter-season', 'Season', uniqOpts('IVZ_SEASON_CT'))}
        <button onclick="document.getElementById('filter-color').value='';document.getElementById('filter-size').value='';document.getElementById('filter-season').value='';applyCountFilter();"
          style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
      </div>`;
  } else if (mode === 'check') {
    lastCheckRows = rows;
    const uniq = key => [...new Set(rows.map(r => getVal(r, key)).filter(v => v && v !== '—'))].join(', ') || '—';
    const execIds = uniq('EXECUTIONID');
    const sites = uniq('INVENTSITEID');
    summaryHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <div class="summary-row" style="flex:1;flex-wrap:wrap;align-items:stretch;">
          <div class="summary-card" style="flex:none;min-width:110px;"><div class="summary-label">Total Lines</div><div class="summary-value red">${rows.length}</div></div>
          <div class="summary-card" style="flex:2;min-width:160px;"><div class="summary-label">Exec ID</div><div class="summary-value small" style="color:var(--green);word-break:break-word;white-space:normal;">${execIds}</div></div>
          <div class="summary-card" style="flex:none;min-width:110px;"><div class="summary-label">Sites</div><div class="summary-value small" style="color:var(--teal);word-break:break-word;white-space:normal;">${sites}</div></div>
        </div>
        <button onclick="showCheckSummary()" style="flex-shrink:0;padding:9px 18px;background:var(--red);color:#0d0f14;border:none;border-radius:8px;font-family:var(--mono);font-size:12px;font-weight:600;cursor:pointer;letter-spacing:0.05em;transition:all 0.15s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">≡ Error Summarize</button>
      </div>`;
  } else if (mode === 'updatestaging') {
    const success = raw.success === true;
    const rowsAffected = raw.rowsAffected ?? 0;
    const message = raw.message || (success ? 'Update completed.' : 'Update failed.');
    const purchaseOrder = raw.purchaseOrder || po;

    area.innerHTML = `
      <div class="summary-row">
        <div class="summary-card" style="flex:none;min-width:130px;">
          <div class="summary-label">Status</div>
          <div class="summary-value ${success ? 'green' : 'red'}">${success ? '✓ SUCCESS' : '✕ FAILED'}</div>
        </div>
        <div class="summary-card" style="flex:none;min-width:130px;">
          <div class="summary-label">Rows Affected</div>
          <div class="summary-value ${rowsAffected > 0 ? 'yellow' : 'red'}">${rowsAffected}</div>
        </div>
        <div class="summary-card" style="flex:2;min-width:200px;">
          <div class="summary-label">Message</div>
          <div class="summary-value small" style="color:var(--text-muted);word-break:break-word;white-space:normal;">${message}</div>
        </div>
      </div>
      <div class="results-meta">
        <span class="results-count">Update for PO <strong>${purchaseOrder}</strong></span>
        <span class="tag ${modeInfo.tagClass}">${modeInfo.label}</span>
      </div>
      <div style="display:flex;justify-content:center;align-items:center;flex:1;padding:40px;">
        <div style="text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">${success ? '✓' : '✕'}</div>
          <div style="font-family:var(--mono);font-size:14px;color:${success ? 'var(--green)' : 'var(--red)'};">${message}</div>
        </div>
      </div>`;
    return;
  } else if (mode === 'packroll') {
    lastPackrollRows = rows;
    const totalQty = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'Quantity') || 0) || 0), 0);
    const totalReceived = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'Received') || 0) || 0), 0);
    const totalRemainder = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'Deliver Remainder') || 0) || 0), 0);
    const uniqItemIds = [...new Set(rows.map(r => getVal(r, 'ITEMID')).filter(v => v != null && v !== ''))].sort();
    const uniqPurchIds = [...new Set(rows.map(r => getVal(r, 'PURCHID')).filter(v => v != null && v !== ''))].sort();
    summaryHTML = `<div class="summary-row">
      <div class="summary-card"><div class="summary-label">Total Lines</div><div class="summary-value teal" id="packroll-line-count">${rows.length}</div></div>
      <div class="summary-card"><div class="summary-label">Total Quantity</div><div class="summary-value blue">${parseFloat(totalQty).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Total Received</div><div class="summary-value green">${parseFloat(totalReceived).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Deliver Remainder</div><div class="summary-value ${totalRemainder > 0 ? 'orange' : 'green'}">${parseFloat(totalRemainder).toLocaleString()}</div></div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:10px 0 4px;">
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">Item ID</div>
        <select id="packroll-filter-itemid" onchange="applyPackrollFilter()"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--text-primary);font-family:var(--mono);font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:130px;">
          <option value="">All</option>
          ${uniqItemIds.map(v => `<option value="${v}">${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:0.06em;text-transform:uppercase;">PO</div>
        <div id="packroll-po-display"
          style="background:var(--surface2);border:1px solid var(--border);color:var(--accent);font-family:var(--mono);font-size:11px;padding:5px 10px;border-radius:6px;min-width:120px;letter-spacing:0.04em;">${uniqPurchIds.join(', ') || '—'}</div>
      </div>
      <button onclick="document.getElementById('packroll-filter-itemid').value='';applyPackrollFilter();"
        style="align-self:flex-end;padding:5px 12px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
    </div>`;
  } else {
    const posted = rows.filter(r => parseInt(r.POSTED) === 1).length;
    summaryHTML = `<div class="summary-row">
      <div class="summary-card"><div class="summary-label">Records</div><div class="summary-value orange">${rows.length}</div></div>
      <div class="summary-card"><div class="summary-label">Posted</div><div class="summary-value green">${posted}</div></div>
      <div class="summary-card"><div class="summary-label">Not Posted</div><div class="summary-value red">${rows.length - posted}</div></div>
    </div>`;
  }

  area.innerHTML = `
    ${summaryHTML}
    <div class="results-meta">
      <span class="results-count">Showing <strong>${rows.length}</strong> row${rows.length !== 1 ? 's' : ''} for PO <strong>${po}</strong></span>
      <span class="tag ${modeInfo.tagClass}">${modeInfo.label}</span>
      <button onclick="exportToExcel()" style="margin-left:auto;padding:5px 14px;background:var(--surface2);border:1px solid var(--green);color:var(--green);font-family:var(--mono);font-size:11px;border-radius:6px;cursor:pointer;letter-spacing:0.05em;font-weight:600;transition:all 0.15s;" onmouseover="this.style.background='var(--green-glow)'" onmouseout="this.style.background='var(--surface2)'">⬇ Export Excel</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody id="${mode === 'count' ? 'count-tbody' : mode === 'search' ? 'search-tbody' : mode === 'packroll' ? 'packroll-tbody' : ''}">${rows_html}</tbody>
      </table>
    </div>`;
}

// ── Export to Excel (.xlsx) ───────────────────────────────────────
function exportToExcel() {
  const table = document.querySelector('#results-area table');
  if (!table) return;

  const data = [];

  // Use the last thead row as headers (skips compare group-header row)
  const theadRows = table.querySelectorAll('thead tr');
  const headerRow = theadRows[theadRows.length - 1];
  data.push([...headerRow.querySelectorAll('th')].map(th => th.textContent.trim()));

  // Data rows
  table.querySelectorAll('tbody tr').forEach(tr => {
    data.push([...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
  });

  const modeLabel = {
    search: 'Search', list: 'ErrorPO', count: 'POLine_AX', update: 'PackRoll',
    packroll: 'QtyPackRoll', compare: 'Compare_Stg_AX', check: 'BotPO',
    searchdbc: 'SearchDBC', comparedbc: 'Compare_Stg_DBC'
  }[mode] || mode;
  const filename = `PO_${modeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, modeLabel.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

// ── Loading / Error ────────────────────────────────────────────────
function showLoading() {
  const loadingMsg = mode === 'compare'
    ? '<span>Fetching Staging + AX in parallel…</span>'
    : mode === 'comparedbc'
      ? '<span>Fetching Staging + DBC in parallel…</span>'
      : '<span>Executing query…</span>';
  document.getElementById('results-area').innerHTML =
    `<div class="state-box"><div class="spinner"></div>${loadingMsg}</div>`;
}

function showError(msg) {
  document.getElementById('results-area').innerHTML = `
    <div class="err-box"><span style="font-size:16px;flex-shrink:0;">⚠</span><div>${msg}</div></div>
    <div class="state-box" style="flex:1;"><div class="state-icon" style="font-size:24px;">?</div>
    <span style="font-size:11px;color:var(--text-dim);">Check your webhook URL in ⚙ Config</span></div>`;
}

// ── History ────────────────────────────────────────────────────────
function addHistory(po, m, count) {
  history.unshift({ po, mode: m, count });
  if (history.length > 12) history.pop();
  renderHistory();
}
function renderHistory() {
  document.getElementById('history-list').innerHTML = history.map(h => `
    <div class="history-item" onclick="restoreHistory('${h.po}','${h.mode}')">
      <div class="history-dot ${h.mode}"></div>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${h.po}</span>
      <span style="font-size:10px;color:var(--text-dim);">${h.count}</span>
    </div>`).join('');
}
function restoreHistory(po, m) {
  document.getElementById('po-input').value = po;
  setMode(m);
  updateSQLPreview();
}
function updateBadge(m, n) {
  const el = document.getElementById('badge-' + m);
  if (el) el.textContent = n;
}

// ── Config ─────────────────────────────────────────────────────────
function openConfig() {
  document.getElementById('cfg-webhook').value = cfg.webhook;
  document.getElementById('cfg-auth').value = cfg.auth;
  document.getElementById('config-modal').classList.add('open');
}
function closeConfig() { document.getElementById('config-modal').classList.remove('open'); }
function saveConfig() {
  cfg.webhook = document.getElementById('cfg-webhook').value.trim();
  cfg.auth = document.getElementById('cfg-auth').value.trim();
  localStorage.setItem('po_webhook', cfg.webhook);
  localStorage.setItem('po_auth', cfg.auth);
  updateEndpointDisplay();
  closeConfig();
}
function updateEndpointDisplay() {
  const el = document.getElementById('endpoint-display');
  if (cfg.webhook) {
    try { const u = new URL(cfg.webhook); el.textContent = u.hostname + u.pathname; }
    catch { el.textContent = cfg.webhook.slice(0, 32) + '…'; }
  } else { el.textContent = 'Not configured'; }
}
document.getElementById('config-modal').addEventListener('click', function (e) { if (e.target === this) closeConfig(); });

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

  const isLight = localStorage.getItem('po_theme') === 'light';
  const html = `<!DOCTYPE html>
<html lang="en"${isLight ? ' data-theme="light"' : ''}>
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
      if(document.documentElement.getAttribute('data-theme')!=='light') return;
      const m={'#0d0f14':'#eef1f9','#13161d':'#eaedf8','#1a1e28':'#f0f2f8','#252a38':'#c6cde2','#3a4258':'#a4adc8','#e2e6f0':'#1e2d4a','#6b7494':'#546080'};
      document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});
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

  const isLight = localStorage.getItem('po_theme') === 'light';
  const html = `<!DOCTYPE html>
<html lang="en"${isLight ? ' data-theme="light"' : ''}>
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
    <div style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
        <thead>
          <tr style="background:#1a1e28;">
            ${th('ITEM ID')}${th('ERROR LINES')}${th('LINE NO.')}${th('SIZES')}${th('COLORS')}${th('SEASONS')}${th('STATUS')}
          </tr>
        </thead>
        <tbody>${tbodyRows}</tbody>
      </table>
    </div>
  </div>
  <script>
    (function(){
      if(document.documentElement.getAttribute('data-theme')!=='light') return;
      const m={'#0d0f14':'#eef1f9','#13161d':'#eaedf8','#1a1e28':'#f0f2f8','#252a38':'#c6cde2','#3a4258':'#a4adc8','#e2e6f0':'#1e2d4a','#6b7494':'#546080'};
      document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});
    })();
  <\/script>
</body>
</html>`;

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

  const poSummaryBar = `
    <div style="border:1px solid #252a38;border-radius:8px;margin-bottom:20px;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#13161d;border-bottom:1px solid #252a38;cursor:pointer;user-select:none;" onclick="const b=document.getElementById('po-sum-body');const ic=document.getElementById('po-sum-ic');b.style.display=b.style.display==='none'?'block':'none';ic.textContent=b.style.display==='none'?'▶':'▼';">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#4f9cf9;letter-spacing:0.06em;">PO SUMMARY &nbsp;<span style="color:#6b7494;font-weight:400;">${totalPOs} PO${totalPOs !== 1 ? 's' : ''}</span></span>
        <span id="po-sum-ic" style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">▼</span>
      </div>
      <div style="padding:8px 14px;background:#0d0f14;border-bottom:1px solid #252a38;word-break:break-all;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#f87171;letter-spacing:0.03em;">PO: ${allPOsStr}</span>
      </div>
      <div id="po-sum-body" style="max-height:320px;overflow-y:auto;background:#0d0f14;">
        ${Object.entries(poSummaryMap).sort(([a], [b]) => a.localeCompare(b)).map(([po, { execs, items }]) => {
    const totalLines = Object.values(items).reduce((s, i) => s + i.count, 0);
    const itemCount = Object.keys(items).length;
    const execStr = execs.size ? [...execs].sort().join(', ') : '—';
    const itemRows = Object.entries(items).sort(([a], [b]) => a.localeCompare(b)).map(([item, { count, sizes, colors, seasons }]) => `
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px 14px 6px 20px;border-bottom:1px solid #13161d;border-right:1px solid #1a1e28;">
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#4f9cf9;width:100%;margin-bottom:1px;">${item}${count > 1 ? ` <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(251,146,60,0.12);color:#fb923c;border:1px solid rgba(251,146,60,0.3);">×${count}</span>` : ''}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">Size</span><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#f0c060;margin-left:4px;">${joinOrDash(sizes)}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;margin-left:10px;">Color</span><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#a78bfa;margin-left:4px;">${joinOrDash(colors)}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;margin-left:10px;">Season</span><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#3ecf8e;margin-left:4px;">${joinOrDash(seasons)}</span>
            </div>`).join('');
    return `
          <div style="border-bottom:1px solid #1a1e28;">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 14px;background:#13161d;">
              <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#4f9cf9;">${po}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">·  ${execStr}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(62,207,142,0.1);color:#3ecf8e;border:1px solid rgba(62,207,142,0.3);">${totalLines} LINE${totalLines !== 1 ? 'S' : ''}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:1px 6px;border-radius:3px;background:rgba(79,156,249,0.1);color:#4f9cf9;border:1px solid rgba(79,156,249,0.25);">${itemCount} ITEM${itemCount !== 1 ? 'S' : ''}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;">${itemRows}</div>
          </div>`;
  }).join('')}
      </div>
    </div>`;

  const itemSummaryBar = `
    <div style="border:1px solid #252a38;border-radius:8px;margin-bottom:20px;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#13161d;border-bottom:1px solid #252a38;cursor:pointer;user-select:none;" onclick="const b=document.getElementById('item-sum-body');const ic=document.getElementById('item-sum-ic');b.style.display=b.style.display==='none'?'block':'none';ic.textContent=b.style.display==='none'?'▶':'▼';">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#3ecf8e;letter-spacing:0.06em;">ITEM SUMMARY &nbsp;<span style="color:#6b7494;font-weight:400;">${Object.keys(itemSummaryMap).length} item${Object.keys(itemSummaryMap).length !== 1 ? 's' : ''}</span></span>
        <span id="item-sum-ic" style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">▼</span>
      </div>
      <div id="item-sum-body" style="max-height:220px;overflow-y:auto;">
        <div style="display:grid;grid-template-columns:1fr 1fr;background:#0d0f14;">
          ${Object.entries(itemSummaryMap).sort(([a], [b]) => a.localeCompare(b)).map(([item, { sizes, colors, seasons }]) => `
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:7px 14px;border-bottom:1px solid #1a1e28;border-right:1px solid #1a1e28;">
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:#4f9cf9;width:100%;margin-bottom:2px;">${item}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;">Size</span><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#f0c060;margin-left:4px;">${joinOrDash(sizes)}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;margin-left:10px;">Color</span><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#a78bfa;margin-left:4px;">${joinOrDash(colors)}</span>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;margin-left:10px;">Season</span><span style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#3ecf8e;margin-left:4px;">${joinOrDash(seasons)}</span>
            </div>`).join('')}
        </div>
      </div>
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

  const isLight = localStorage.getItem('po_theme') === 'light';
  const html = `<!DOCTYPE html>
<html lang="en"${isLight ? ' data-theme="light"' : ''}>
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

    buildTable(ALL_ROWS);
    (function(){
      if(document.documentElement.getAttribute('data-theme')!=='light') return;
      const m={'#0d0f14':'#eef1f9','#13161d':'#eaedf8','#1a1e28':'#f0f2f8','#252a38':'#c6cde2','#3a4258':'#a4adc8','#e2e6f0':'#1e2d4a','#6b7494':'#546080'};
      document.querySelectorAll('[style]').forEach(el=>{let s=el.getAttribute('style'),c=false;for(const[d,l] of Object.entries(m)){if(s.includes(d)){s=s.split(d).join(l);c=true;}}if(c)el.setAttribute('style',s);});
    })();
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

// ── Search PO Filter ───────────────────────────────────────────────
function applySearchFilter() {
  const tbody = document.getElementById('search-tbody');
  if (!tbody || !lastSearchRows.length) return;

  const fColor = document.getElementById('search-filter-color')?.value || '';
  const fSize = document.getElementById('search-filter-size')?.value || '';
  const fSeason = document.getElementById('search-filter-season')?.value || '';

  const filtered = lastSearchRows.filter(r => {
    if (fColor && getVal(r, 'INVENTCOLORID') !== fColor) return false;
    if (fSize && getVal(r, 'INVENTSIZEID') !== fSize) return false;
    if (fSeason && getVal(r, 'INVENTSTYLEID') !== fSeason) return false;
    return true;
  });

  const colKeys = ['LINENUMBER', 'EXECUTIONID', 'ITEMID', 'INVENTSIZEID', 'INVENTCOLORID', 'INVENTSTYLEID', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSITEID', 'INVENTLOCATIONID', 'INVENTSTATUSID', 'TRANSFERSTATUS'];

  tbody.innerHTML = filtered.map(r =>
    '<tr>' + colKeys.map(k => {
      let val = getVal(r, k);
      val = (val !== undefined && val !== null && val !== '') ? val : '—';
      if (val !== '—') {
        if (k === 'PURCHQTY') val = parseFloat(val || 0).toFixed(0);
        if (k === 'PURCHPRICE') val = parseFloat(val || 0).toFixed(5);
        if (k === 'LINEAMOUNT') val = parseFloat(val || 0).toFixed(2);
      }
      if (k === 'TRANSFERSTATUS') {
        const v = parseInt(val);
        const labels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
        const cls = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };
        return `<td><span class="transfer-badge ${cls[v] || 'transfer-pending'}">● ${labels[v] || 'Pending'}</span></td>`;
      }
      if (k === 'LINENUMBER') return `<td class="num">${val}</td>`;
      if (!val || val === '—') return `<td class="td-dim">—</td>`;
      return `<td>${val}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const lineCount = document.getElementById('search-line-count');
  if (lineCount) lineCount.textContent = filtered.length;
}

// ── Compare PO Filter ──────────────────────────────────────────────
function applyCompareFilter() {
  const tbody = document.getElementById('compare-tbody');
  if (!tbody || !lastCompareData.stagingRows.length && !lastCompareData.axRows.length) return;

  const { stagingRows, axRows } = lastCompareData;
  const fColor = document.getElementById('compare-filter-color')?.value || '';
  const fSize = document.getElementById('compare-filter-size')?.value || '';
  const fSeason = document.getElementById('compare-filter-season')?.value || '';
  const fStatus = document.getElementById('compare-filter-status')?.value || '';

  const sLine = r => parseFloat(getVal(r, 'LINENUMBER')) || 0;
  const sQty = r => parseFloat(getVal(r, 'PURCHQTY')) || 0;
  const sPrice = r => parseFloat(getVal(r, 'PURCHPRICE')) || 0;
  const sItem = r => getVal(r, 'ITEMID') ?? '—';
  const sSize = r => getVal(r, 'INVENTSIZEID') ?? '—';
  const sColor = r => getVal(r, 'INVENTCOLORID') ?? '—';
  const sTransfer = r => parseInt(getVal(r, 'TRANSFERSTATUS'));
  const aLine = r => parseFloat(getVal(r, 'LINENUMBER')) || 0;
  const aQty = r => parseFloat(getVal(r, 'QTY') ?? getVal(r, 'PURCHQTY')) || 0;
  const aPrice = r => parseFloat(getVal(r, 'Unit Price') ?? getVal(r, 'PURCHPRICE')) || 0;
  const aItem = r => getVal(r, 'ITEMID') ?? '—';
  const aSize = r => getVal(r, 'Size') ?? getVal(r, 'IVZ_SIZE_CT') ?? '—';
  const aColor = r => getVal(r, 'Color') ?? getVal(r, 'IVZ_COLOR_CT') ?? '—';
  const aSeason = r => getVal(r, 'Season') ?? getVal(r, 'IVZ_SEASON_CT') ?? getVal(r, 'INVENTSTYLEID') ?? '—';

  const stagingMap = {};
  stagingRows.forEach(r => { stagingMap[sLine(r)] = r; });
  const axMap = {};
  axRows.forEach(r => { axMap[aLine(r)] = r; });

  let allLines = [...new Set([
    ...stagingRows.map(r => sLine(r)),
    ...axRows.map(r => aLine(r))
  ])].sort((a, b) => a - b);

  allLines = allLines.filter(ln => {
    const s = stagingMap[ln];
    const a = axMap[ln];
    const color = s ? sColor(s) : (a ? aColor(a) : '—');
    const size = s ? sSize(s) : (a ? aSize(a) : '—');
    const season = a ? aSeason(a) : (s ? (getVal(s, 'INVENTSTYLEID') ?? '—') : '—');
    if (fColor && color !== fColor) return false;
    if (fSize && size !== fSize) return false;
    if (fSeason && season !== fSeason) return false;
    if (fStatus) {
      let rowStatus;
      if (!s) rowStatus = 'AX Only';
      else if (!a) rowStatus = 'Staging Only';
      else {
        const qd = Math.abs(aQty(a) - sQty(s));
        const pd = Math.abs(aPrice(a) - sPrice(s));
        rowStatus = (qd > 0.01 || pd > 0.0001) ? 'Mismatch' : 'Match';
      }
      if (rowStatus !== fStatus) return false;
    }
    return true;
  });

  const tdNum = (v, dec = 0) => v !== null ? `<td class="num">${fmt(v, dec)}</td>` : `<td class="diff-missing">—</td>`;
  const tdDiff = (d, ok) => {
    if (d === null) return `<td class="diff-missing">—</td>`;
    if (Math.abs(d) < 0.0001) return `<td class="diff-zero">0</td>`;
    return `<td class="${ok ? 'diff-ok' : 'diff-bad'}">${d > 0 ? '+' : ''}${fmt(d, d % 1 === 0 ? 0 : 5)}</td>`;
  };

  tbody.innerHTML = allLines.map(ln => {
    const s = stagingMap[ln];
    const a = axMap[ln];
    let rowClass = 'row-match';
    if (!s) rowClass = 'row-only-ax';
    else if (!a) rowClass = 'row-only-staging';
    else {
      const qd = Math.abs(aQty(a) - sQty(s));
      const pd = Math.abs(aPrice(a) - sPrice(s));
      if (qd > 0.01 || pd > 0.0001) rowClass = 'row-mismatch';
    }
    const itemId = s ? sItem(s) : (a ? aItem(a) : '—');
    const size = s ? sSize(s) : (a ? aSize(a) : '—');
    const color = s ? sColor(s) : (a ? aColor(a) : '—');
    const stgQty = s ? sQty(s) : null;
    const axQty = a ? aQty(a) : null;
    const stgPrice = s ? sPrice(s) : null;
    const axPrice = a ? aPrice(a) : null;
    const dQty = (stgQty !== null && axQty !== null) ? (axQty - stgQty) : null;
    const dPrice = (stgPrice !== null && axPrice !== null) ? (axPrice - stgPrice) : null;
    const qtyOk = dQty !== null && Math.abs(dQty) < 0.01;
    const priceOk = dPrice !== null && Math.abs(dPrice) < 0.0001;
    const transfer = s ? sTransfer(s) : null;
    const tLabels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
    const tCls = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };
    const tv = transfer !== null ? transfer : -1;
    const transferCell = s
      ? `<td><span class="transfer-badge ${tCls[tv] || 'transfer-pending'}">● ${tLabels[tv] || '?'}</span></td>`
      : `<td class="td-dim">—</td>`;
    let statusCell;
    if (!s) statusCell = `<td><span class="match-badge match-ax">AX Only</span></td>`;
    else if (!a) statusCell = `<td><span class="match-badge match-staging">Staging Only</span></td>`;
    else if (!qtyOk || !priceOk) statusCell = `<td><span class="match-badge match-bad">✗ Mismatch</span></td>`;
    else statusCell = `<td><span class="match-badge match-ok">✓ Match</span></td>`;
    return `<tr class="${rowClass}">
      <td class="num">${ln}</td>
      <td>${itemId !== '—' ? itemId : '<span class="td-dim">—</span>'}</td>
      <td>${size !== '—' ? size : '<span class="td-dim">—</span>'}</td>
      <td>${color !== '—' ? color : '<span class="td-dim">—</span>'}</td>
      ${tdNum(stgQty, 0)}${tdNum(axQty, 0)}${tdDiff(dQty, qtyOk)}
      ${tdNum(stgPrice, 5)}${tdNum(axPrice, 5)}${tdDiff(dPrice, priceOk)}
      ${transferCell}${statusCell}
    </tr>`;
  }).join('');

  const lineCount = document.getElementById('compare-line-count');
  if (lineCount) lineCount.textContent = allLines.length + ' lines';
}

// ── PO Line (AX) Filter ────────────────────────────────────────────
function applyCountFilter() {
  const tbody = document.getElementById('count-tbody');
  if (!tbody || !lastCountRows.length) return;

  const fColor = document.getElementById('filter-color')?.value || '';
  const fSize = document.getElementById('filter-size')?.value || '';
  const fSeason = document.getElementById('filter-season')?.value || '';

  let filtered = lastCountRows.filter(r => {
    if (fColor && getVal(r, 'IVZ_COLOR_CT') !== fColor) return false;
    if (fSize && getVal(r, 'IVZ_SIZE_CT') !== fSize) return false;
    if (fSeason && getVal(r, 'IVZ_SEASON_CT') !== fSeason) return false;
    return true;
  });

  // re-sort same as renderResults count sort
  filtered = [...filtered].sort((a, b) => {
    const pa = String(getVal(a, 'PURCHID') ?? '');
    const pb = String(getVal(b, 'PURCHID') ?? '');
    if (pa !== pb) return pa.localeCompare(pb);
    return (parseFloat(getVal(a, 'LINENUMBER')) || 0) - (parseFloat(getVal(b, 'LINENUMBER')) || 0);
  });

  const colKeys = ['LINENUMBER', 'PURCHID', 'ITEMID', 'IVZ_COLOR_CT', 'IVZ_SIZE_CT', 'IVZ_SEASON_CT', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'PURCHUNIT'];

  tbody.innerHTML = filtered.map(r =>
    '<tr>' + colKeys.map(k => {
      let val = getVal(r, k);
      val = (val !== undefined && val !== null && val !== '') ? val : '—';
      if (val !== '—') {
        if (k === 'PURCHQTY') val = parseFloat(val || 0).toFixed(0);
        if (k === 'PURCHPRICE') val = parseFloat(val || 0).toFixed(5);
        if (k === 'LINEAMOUNT') val = parseFloat(val || 0).toFixed(2);
      }
      if (k === 'LINENUMBER') return `<td class="num">${val}</td>`;
      if (!val || val === '—') return `<td class="td-dim">—</td>`;
      return `<td>${val}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const lineCount = document.getElementById('count-line-count');
  if (lineCount) lineCount.textContent = filtered.length;
}

// ── QTY Pack/Roll Filter ───────────────────────────────────────────
function applyPackrollFilter() {
  const tbody = document.getElementById('packroll-tbody');
  if (!tbody || !lastPackrollRows.length) return;

  const fItemId = document.getElementById('packroll-filter-itemid')?.value || '';

  const filtered = lastPackrollRows.filter(r => {
    if (fItemId && getVal(r, 'ITEMID') !== fItemId) return false;
    return true;
  });

  const colKeys = ['LINENUMBER', 'PURCHID', 'ITEMID', 'Quantity', 'Received', 'Deliver_Remainder', 'Ordered', 'Invent_Unit_QTY', 'Compare_O_I', 'Compare_Q_R'];

  tbody.innerHTML = filtered.map(r =>
    '<tr>' + colKeys.map(k => {
      let val = getVal(r, k);
      val = (val !== undefined && val !== null && val !== '') ? val : '—';
      if (val !== '—') {
        if (['Quantity', 'Received', 'Deliver Remainder', 'Ordered', 'Invent Unit QTY'].includes(k))
          val = parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
      }
      if (k === 'Compare_O_I' || k === 'Compare_Q_R') {
        const isTrue = String(val).toLowerCase() === 'true';
        return `<td><span class="${isTrue ? 'posted-yes' : 'posted-no'}">${isTrue ? '✓ True' : '✗ False'}</span></td>`;
      }
      if (k === 'LINENUMBER') return `<td class="num">${val}</td>`;
      if (!val || val === '—') return `<td class="td-dim">—</td>`;
      return `<td>${val}</td>`;
    }).join('') + '</tr>'
  ).join('');

  const lineCount = document.getElementById('packroll-line-count');
  if (lineCount) lineCount.textContent = filtered.length;

  const poDisplay = document.getElementById('packroll-po-display');
  if (poDisplay) {
    const pos = [...new Set(filtered.map(r => getVal(r, 'PURCHID')).filter(v => v != null && v !== ''))].sort();
    poDisplay.textContent = pos.length ? pos.join(', ') : '—';
  }
}
