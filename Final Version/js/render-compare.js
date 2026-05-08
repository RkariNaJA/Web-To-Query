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
  // AX amount: n8n key NET_AMOUNT, fallback legacy aliases
  const aAmt = r => parseFloat(getVal(r, 'NET_AMOUNT') ?? getVal(r, 'Net amount') ?? getVal(r, 'LINEAMOUNT')) || 0;
  // AX price: n8n key UNIT_PRICE, fallback legacy aliases
  const aPrice = r => parseFloat(getVal(r, 'UNIT_PRICE') ?? getVal(r, 'Unit Price') ?? getVal(r, 'PURCHPRICE')) || 0;
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
  const uniqAxPrices = () => {
    const vals = new Set();
    axRows.forEach(r => { const v = parseFloat(getVal(r, 'UNIT_PRICE') ?? getVal(r, 'Unit Price') ?? getVal(r, 'PURCHPRICE')); if (!isNaN(v)) vals.add(v.toFixed(5)); });
    return [...vals].sort((a, b) => parseFloat(a) - parseFloat(b));
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
      ${mkCompareSelect('compare-filter-itemid', 'Item ID', uniqCompareOpts('ITEMID', 'ITEMID', null))}
      ${mkCompareSelect('compare-filter-color', 'Color', uniqCompareOpts('INVENTCOLORID', 'Color', 'IVZ_COLOR_CT'))}
      ${mkCompareSelect('compare-filter-size', 'Size', uniqCompareOpts('INVENTSIZEID', 'Size', 'IVZ_SIZE_CT'))}
      ${mkCompareSelect('compare-filter-season', 'Season', uniqCompareOpts('INVENTSTYLEID', 'Season', 'IVZ_SEASON_CT'))}
      ${mkCompareSelect('compare-filter-axprice', 'AX Price', uniqAxPrices())}
      ${mkCompareSelect('compare-filter-status', 'Status', ['Match', 'Mismatch', 'AX Only', 'Staging Only'])}
      <button onclick="['compare-filter-itemid','compare-filter-color','compare-filter-size','compare-filter-season','compare-filter-axprice','compare-filter-status'].forEach(id=>document.getElementById(id).value='');applyCompareFilter();"
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

// ── Compare PO Filter ──────────────────────────────────────────────
function applyCompareFilter() {
  const tbody = document.getElementById('compare-tbody');
  if (!tbody || !lastCompareData.stagingRows.length && !lastCompareData.axRows.length) return;

  const { stagingRows, axRows } = lastCompareData;
  const fItemId = document.getElementById('compare-filter-itemid')?.value || '';
  const fColor = document.getElementById('compare-filter-color')?.value || '';
  const fSize = document.getElementById('compare-filter-size')?.value || '';
  const fSeason = document.getElementById('compare-filter-season')?.value || '';
  const fAxPrice = document.getElementById('compare-filter-axprice')?.value || '';
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
  const aPrice = r => parseFloat(getVal(r, 'UNIT_PRICE') ?? getVal(r, 'Unit Price') ?? getVal(r, 'PURCHPRICE')) || 0;
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
    const itemId = s ? sItem(s) : (a ? aItem(a) : '—');
    const color = s ? sColor(s) : (a ? aColor(a) : '—');
    const size = s ? sSize(s) : (a ? aSize(a) : '—');
    const season = a ? aSeason(a) : (s ? (getVal(s, 'INVENTSTYLEID') ?? '—') : '—');
    if (fItemId && itemId !== fItemId) return false;
    if (fColor && color !== fColor) return false;
    if (fSize && size !== fSize) return false;
    if (fSeason && season !== fSeason) return false;
    if (fAxPrice) {
      const axPriceVal = a ? aPrice(a).toFixed(5) : null;
      if (!axPriceVal || axPriceVal !== fAxPrice) return false;
    }
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
