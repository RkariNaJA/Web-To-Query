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
${kw('SELECT')} LINENUMBER, CREATEDATETIME, EXPORTDATETIME, STATUS,ITEMID,
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
