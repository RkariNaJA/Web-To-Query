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
        <div class="summary-value blue">${fmt(stgTotalQty, 4)}</div>
        <div class="summary-sub" style="color:#e879f9">DBC: ${fmt(dbcTotalQty, 4)}</div>
      </div>
      <div class="summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}">
        <div class="summary-label">QTY Diff (DBC &#8722; Stg)</div>
        <div class="summary-value ${qtyMatch ? 'teal' : 'red'}">${diffQty >= 0 ? '+' : ''}${fmt(diffQty, 4)}</div>
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
    const tdDiff = (delta, ok, dec = 5) => {
      if (delta === null) return `<td class="diff-missing">&#8212;</td>`;
      if (Math.abs(delta) < 0.0001) return `<td class="diff-zero">0</td>`;
      return `<td class="${ok ? 'diff-ok' : 'diff-bad'}">${delta > 0 ? '+' : ''}${fmt(delta, delta % 1 === 0 ? 0 : dec)}</td>`;
    };

    return `<tr class="${rowClass}">
      <td class="num">${ln}</td>
      <td>${itemId !== '—' ? itemId : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${color  !== '—' ? color  : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${size   !== '—' ? size   : '<span class="td-dim">&#8212;</span>'}</td>
      <td>${season !== '—' ? season : '<span class="td-dim">&#8212;</span>'}</td>
      ${tdNum(stgQty,   4, !qtyOk   && stgQty   !== null && dbcQty   !== null)}
      ${tdNum(dbcQty,   4, !qtyOk   && stgQty   !== null && dbcQty   !== null)}
      ${tdDiff(dQ, qtyOk, 4)}
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
      ${mkSel('cdbc-filter-itemid', 'Item ID', uniqOpts('ITEMID', 'ITEMID'))}
      ${mkSel('cdbc-filter-color',  'Color',  uniqOpts('INVENTCOLORID', 'COLORID'))}
      ${mkSel('cdbc-filter-size',   'Size',   uniqOpts('INVENTSIZEID',  'SIZEID'))}
      ${mkSel('cdbc-filter-season', 'Season', uniqOpts('INVENTSTYLEID', 'SEASON'))}
      ${mkSel('cdbc-filter-status', 'Status', ['Match', 'Mismatch', 'DBC Only', 'Stg Only'])}
      <button onclick="['cdbc-filter-itemid','cdbc-filter-color','cdbc-filter-size','cdbc-filter-season','cdbc-filter-status'].forEach(id=>document.getElementById(id).value='');applyCompareDBC();"
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
  const fItemId = document.getElementById('cdbc-filter-itemid')?.value || '';
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
    const itemId = s ? (getVal(s, 'ITEMID') ?? '—') : '—';
    const color  = s ? sColor(s)  : (d ? dColor(d)  : '—');
    const size   = s ? sSize(s)   : (d ? dSize(d)   : '—');
    const season = s ? sSeason(s) : (d ? dSeason(d) : '—');
    if (fItemId && itemId !== fItemId) return false;
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
  const tdDiff = (delta, ok, dec = 5) => {
    if (delta === null) return `<td class="diff-missing">&#8212;</td>`;
    if (Math.abs(delta) < 0.0001) return `<td class="diff-zero">0</td>`;
    return `<td class="${ok ? 'diff-ok' : 'diff-bad'}">${delta > 0 ? '+' : ''}${fmt(delta, delta % 1 === 0 ? 0 : dec)}</td>`;
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
      ${tdNum(stgQty,   4)}${tdNum(dbcQty,   4)}${tdDiff(dQ, qtyOk, 4)}
      ${tdNum(stgPrice, 5)}${tdNum(dbcPrice, 5)}${tdDiff(dP, priceOk)}
      ${dbcStatusCell}${transferCell}${statusCell}
    </tr>`;
  }).join('');

  const lc = document.getElementById('comparedbc-line-count');
  if (lc) lc.textContent = allLines.length + ' lines';
}
