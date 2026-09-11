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
    } else if (mode === 'item') {
      const inventSizeId  = document.getElementById('item-size-input')?.value.trim()    || '';
      const inventColorId = document.getElementById('item-color-input')?.value.trim()   || '';
      const inventStyleId = document.getElementById('item-style-input')?.value.trim()   || '';
      const dataAreaId    = document.getElementById('item-company-input')?.value.trim() || '';
      const { rows, raw } = await fetchQuery('item', po, null, { inventSizeId, inventColorId, inventStyleId, dataAreaId });
      addHistory(po, mode, raw.totalRows ?? rows.length);
      renderResults(rows, po, null, null, raw);
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
