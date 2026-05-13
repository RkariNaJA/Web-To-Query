// ── Mode ───────────────────────────────────────────────────────────
function setMode(m) {
  mode = m;
  Object.keys(MODES).forEach(id => {
    const el = document.getElementById('nav-' + id);
    if (el) el.className = 'nav-item' + (m === id ? ' ' + MODES[id].navClass : '');
  });
  localStorage.setItem('po_mode', m);
  const isUpdate = m === 'updatestaging';
  const isItem = m === 'item';
  const isUnit = m === 'unit';
  document.getElementById('exec-input-wrap').style.display = isUpdate ? 'flex' : 'none';
  ['item-size-wrap', 'item-color-wrap', 'item-style-wrap'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isItem ? 'flex' : 'none';
  });
  const companyWrap = document.getElementById('item-company-wrap');
  if (companyWrap) companyWrap.style.display = (isItem || isUnit) ? 'flex' : 'none';
  const clearBtn = document.getElementById('item-clear-btn');
  if (clearBtn) clearBtn.style.display = isItem ? 'block' : 'none';
  document.getElementById('po-prefix').textContent = (isItem || isUnit) ? 'ITEM_ID ›' : 'PO_ID ›';
  document.getElementById('po-input').placeholder = (isItem || isUnit) ? 'e.g. PSKNI701890' : 'e.g. CDHN26HTI020034';
  const labelMap = { updatestaging: 'Purchase Order Number & Execution ID', item: 'Item ID · Size · Color · Style · Company', unit: 'Item ID' };
  document.getElementById('query-bar-label').textContent = labelMap[m] || 'Purchase Order Number';
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
       INVENTSITEID ${kw('AS')} [Site],
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
  } else if (mode === 'item') {
    const size = document.getElementById('item-size-input')?.value.trim() || '?';
    const color = document.getElementById('item-color-input')?.value.trim() || '?';
    const season = document.getElementById('item-style-input')?.value.trim() || '?';
    const company = document.getElementById('item-company-input')?.value.trim() || '?';
    el.innerHTML = `${kw('SELECT')} ITEMID, INVENTSIZEID, INVENTCOLORID, INVENTSTYLEID,
       i.DATAAREAID ${kw('AS')} [Company]
${kw('FROM')} INVENTDIM d
${kw('LEFT JOIN')} INVENTDIMCOMBINATION i ${kw('ON')} i.INVENTDIMID ${kw('=')} d.INVENTDIMID
${kw('WHERE')} i.ITEMID ${kw('=')} ${vl("'" + po + "'")}
  ${kw('AND')} INVENTSIZEID ${kw('=')} ${vl("'" + size + "'")}
  ${kw('AND')} INVENTCOLORID ${kw('=')} ${vl("'" + color + "'")}
  ${kw('AND')} INVENTSTYLEID ${kw('=')} ${vl("'" + season + "'")}
  ${kw('AND')} i.DATAAREAID ${kw('=')} ${vl("'" + company + "'")};`;
  } else if (mode === 'unit') {
    const company = document.getElementById('item-company-input')?.value.trim() || '';
    el.innerHTML = `${kw('SELECT DISTINCT')} TM.ITEMID,
       UNITID ${kw('AS')} [PO_UNIT], UNITID ${kw('AS')} [SALES_UNIT], UNITID ${kw('AS')} [INVENT_UNIT],
       BOMUNITID, REQGROUPID,
       ${kw('CASE')} ${fn('CAST')}(MODULETYPE ${kw('AS')} varchar(10))
           ${kw('WHEN')} ${vl("'2'")} ${kw('THEN')} ${vl("'Sales Order'")}
           ${kw('WHEN')} ${vl("'0'")} ${kw('THEN')} ${vl("'Purchase Order'")}
           ${kw('WHEN')} ${vl("'1'")} ${kw('THEN')} ${vl("'Inventory'")}
           ${kw('ELSE')} ${fn('CAST')}(MODULETYPE ${kw('AS')} varchar(10))
       ${kw('END AS')} MODULETYPE,
       TM.DATAAREAID ${kw('AS')} [Company]
${kw('FROM')} InventTableModule TM
${kw('JOIN')} INVENTTABLE I ${kw('ON')} TM.ITEMID ${kw('=')} I.ITEMID
${kw('WHERE')} TM.ITEMID ${kw('=')} ${vl("'" + po + "'")}
  ${kw('AND')} (${vl("'" + (company || '') + "'")} ${kw('=')} ${vl("''")} ${kw('OR')} TM.DATAAREAID ${kw('=')} ${vl("'" + (company || '') + "'")})
${kw('ORDER BY')} TM.DATAAREAID;`;
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

['item-size-input', 'item-color-input', 'item-style-input', 'item-company-input'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    localStorage.setItem('po_' + id, document.getElementById(id).value);
    updateSQLPreview();
  });
});

function clearItemInputs() {
  ['po-input', 'item-size-input', 'item-color-input', 'item-style-input', 'item-company-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; localStorage.removeItem('po_' + id); }
  });
  localStorage.removeItem('po_last_input');
  updateSQLPreview();
}
