// ── Search PO DBC Filter ───────────────────────────────────────────
function applyDBCHeaderFilter() {
  const tbody = document.getElementById('searchdbc-header-tbody');
  if (!tbody) return;

  const fCreated  = document.getElementById('dbc-h-filter-created')?.value  || '';
  const fExported = document.getElementById('dbc-h-filter-exported')?.value || '';
  const { header = [] } = lastSearchDBCData || {};

  const filtered = header.filter(r => {
    if (fCreated  && r.CREATEDATETIME !== fCreated)  return false;
    if (fExported && r.EXPORTDATETIME !== fExported) return false;
    return true;
  });

  const headerKeys = ['CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'VENDORAXACCOUNT', 'COMPANY', 'PURCHID', 'ORDERACCOUNT', 'INVOICEACCOUNT', 'CURRENCYCODE'];
  tbody.innerHTML = filtered.map(r =>
    '<tr>' + headerKeys.map(k => {
      const v = r[k] != null && r[k] !== '' ? r[k] : '—';
      return v === '—' ? `<td class="td-dim">—</td>` : `<td>${v}</td>`;
    }).join('') + '</tr>'
  ).join('');
}

function applyDBCLinesFilter() {
  const tbody = document.getElementById('searchdbc-lines-tbody');
  if (!tbody) return;

  const fCreated  = document.getElementById('dbc-l-filter-created')?.value  || '';
  const fExported = document.getElementById('dbc-l-filter-exported')?.value || '';
  const fItemId   = document.getElementById('dbc-l-filter-itemid')?.value   || '';
  const fSizeFab  = document.getElementById('dbc-l-filter-sizefab')?.value  || '';
  const fColorId  = document.getElementById('dbc-l-filter-colorid')?.value  || '';
  const fSeason   = document.getElementById('dbc-l-filter-season')?.value   || '';
  const { lines = [] } = lastSearchDBCData || {};

  const filtered = lines.filter(r => {
    if (fCreated  && r.CREATEDATETIME !== fCreated)  return false;
    if (fExported && r.EXPORTDATETIME !== fExported) return false;
    if (fItemId   && r.ITEMID         !== fItemId)   return false;
    if (fSizeFab  && r.SIZEIDFABRIC   !== fSizeFab)  return false;
    if (fColorId  && r.COLORID        !== fColorId)  return false;
    if (fSeason   && r.SEASON         !== fSeason)   return false;
    return true;
  });

  const linesKeys = ['LINENUMBER', 'CREATEDATETIME', 'EXPORTDATETIME', 'STATUS', 'ITEMID', 'PURCHQTY', 'PURCHPRICE', 'LINEAMOUNT', 'JOBNUMBER', 'INVENTSTATUS', 'SEASON', 'COLORID', 'COLORNAME', 'SIZEIDFABRIC', 'SIZEID', 'COMPANY', 'SITEID', 'LOCATIONID'];
  tbody.innerHTML = filtered.map(r =>
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
