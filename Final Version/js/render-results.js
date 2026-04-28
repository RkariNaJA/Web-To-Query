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
      <div class="summary-card"><div class="summary-label">Completed</div><div class="summary-value green" id="search-summary-completed">${okCount}</div></div>
      <div class="summary-card"><div class="summary-label">Errors</div><div class="summary-value ${errCount > 0 ? 'red' : 'green'}" id="search-summary-errors">${errCount}</div></div>
      <div class="summary-card"><div class="summary-label">Total Qty</div><div class="summary-value" id="search-summary-qty">${parseFloat(totalQty).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Total Amount</div><div class="summary-value" id="search-summary-amt">${parseFloat(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
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
        <div class="summary-card"><div class="summary-label">Total QTY</div><div class="summary-value blue" id="count-summary-qty">${parseFloat(totalQty).toLocaleString()}</div></div>
        <div class="summary-card"><div class="summary-label">Total Net Amount</div><div class="summary-value" id="count-summary-amt">${parseFloat(totalAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
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
    // const totalRemainder = rows.reduce((s, r) => s + (parseFloat(getVal(r, 'Deliver Remainder') || 0) || 0), 0);
    const totalRemainder = rows.reduce((s, r) => {
      const val = getVal(r, 'DELIVER_REMAINDER') || getVal(r, 'Deliver Remainder') || 0;
      return s + (parseFloat(val) || 0);
    }, 0);
    const uniqItemIds = [...new Set(rows.map(r => getVal(r, 'ITEMID')).filter(v => v != null && v !== ''))].sort();
    const uniqPurchIds = [...new Set(rows.map(r => getVal(r, 'PURCHID')).filter(v => v != null && v !== ''))].sort();
    const packrollQueriedPOs = po.split(',').map(s => s.trim()).filter(Boolean);
    const packrollMissingPOs = packrollQueriedPOs.filter(p => !uniqPurchIds.includes(p));
    lastPackrollQueriedPOs = packrollQueriedPOs;
    const poDisplayContent = [
      ...uniqPurchIds.map(p => `<span style="color:var(--accent);">${p}</span>`),
      ...packrollMissingPOs.map(p => `<span style="color:var(--red);font-weight:600;" title="Not found in output">⚠ ${p}</span>`)
    ].join(', ') || '—';
    summaryHTML = `<div class="summary-row">
      <div class="summary-card"><div class="summary-label">Total Lines</div><div class="summary-value teal" id="packroll-line-count">${rows.length}</div></div>
      <div class="summary-card"><div class="summary-label">Total Quantity</div><div class="summary-value blue" id="packroll-summary-qty">${parseFloat(totalQty).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Total Received</div><div class="summary-value green" id="packroll-summary-received">${parseFloat(totalReceived).toLocaleString()}</div></div>
      <div class="summary-card"><div class="summary-label">Deliver Remainder</div><div class="summary-value ${totalRemainder > 0 ? 'orange' : 'green'}" id="packroll-summary-remainder">${parseFloat(totalRemainder).toLocaleString()}</div></div>
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
          style="background:var(--surface2);border:1px solid var(--border);font-family:var(--mono);font-size:11px;padding:5px 10px;border-radius:6px;min-width:120px;letter-spacing:0.04em;">${poDisplayContent}</div>
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

  let missingPOsHTML = '';
  if (mode === 'update' || mode === 'packroll') {
    const qPOs = po.split(',').map(s => s.trim()).filter(Boolean);
    const rPOs = [...new Set(rows.map(r => getVal(r, 'PURCHID')).filter(v => v != null && v !== ''))];
    const missing = qPOs.filter(p => !rPOs.includes(p));
    if (missing.length > 0) {
      missingPOsHTML = ` <span style="color:var(--red);font-size:11px;font-family:var(--mono);">⚠&nbsp;${missing.map(p => `<span style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);padding:1px 6px;border-radius:4px;font-weight:600;">${p}</span>`).join('&nbsp;')}</span>`;
    }
  }
  area.innerHTML = `
    ${summaryHTML}
    <div class="results-meta">
      <span class="results-count">Showing <strong>${rows.length}</strong> row${rows.length !== 1 ? 's' : ''} for PO <strong>${po}</strong>${missingPOsHTML}</span>
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
