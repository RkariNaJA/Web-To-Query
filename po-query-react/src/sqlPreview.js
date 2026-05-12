const kw = s => `<span class="sql-kw">${s}</span>`;
const vl = s => `<span class="sql-val">${s}</span>`;
const fn = s => `<span class="sql-fn">${s}</span>`;

export function buildSqlPreview(mode, po, execId, itemInputs = {}) {
  const p = po || '?';
  const e = execId || '?';

  if (mode === 'search') {
    return `${kw('SELECT')} ISSELECTED, TRANSFERSTATUS, LINENUMBER, EXECUTIONID,
       PURCHQTY, PURCHPRICE, LINEAMOUNT, PURCHUNIT,
       inventSerialId ${kw('AS')} JOBNUMBER, ITEMID, INVENTSIZEID,
       INVENTCOLORID, INVENTSTYLEID, INVENTSITEID, INVENTLOCATIONID, INVENTSTATUSID
${kw('FROM')} DMFPURCHLINEENTITY
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)} ${kw('AND')} EXECUTIONID ${kw('=')} (${kw('SELECT')} ${fn('MAX')}(EXECUTIONID) ${kw('FROM')} DMFPURCHLINEENTITY
  ${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)} ${kw('AND')} EXECUTIONID ${kw('LIKE')} ${vl("'BotPO%'")})
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  }
  if (mode === 'list') {
    return `${kw('SELECT')} TRANSFERSTATUS,PURCHID, LINENUMBER, EXECUTIONID, PURCHPRICE,
       PURCHQTY, ITEMID, INVENTSIZEID, INVENTCOLORID,
       INVENTSTYLEID ${kw('AS')} [INVENTSEASONID]
${kw('FROM')} DMFPURCHLINEENTITY
${kw('WHERE')} PURCHID ${kw('IN')} ${vl(`'${p}'`)} ${kw('AND')} EXECUTIONID ${kw('=')} (${kw('SELECT')} ${fn('MAX')}(EXECUTIONID) ${kw('FROM')} DMFPURCHLINEENTITY
  ${kw('WHERE')} PURCHID ${kw('IN')} ${vl(`'${p}'`)} ${kw('AND')} EXECUTIONID ${kw('LIKE')} ${vl("'BotPO%'")})
  ${kw('AND')} TRANSFERSTATUS ${kw('=')} ${vl('2')}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  }
  if (mode === 'count') {
    return `${kw('SELECT')} LINENUMBER, PURCHID, ITEMID,
       IVZ_COLOR_CT ${kw('AS')} [Color], IVZ_SIZE_CT ${kw('AS')} [Size],
       IVZ_SEASON_CT ${kw('AS')} [Season], PURCHQTY ${kw('AS')} [QTY],
       PURCHPRICE ${kw('AS')} [Unit Price], LINEAMOUNT ${kw('AS')} [Net amount],
       ${fn('SUM')}(PURCHQTY) ${kw('OVER')} () ${kw('AS')} [Total QTY],
       ${fn('SUM')}(LINEAMOUNT) ${kw('OVER')} () ${kw('AS')} [Total Net amount],
       PURCHUNIT, NAME ${kw('AS')} [Item Name]
${kw('FROM')} PURCHLINE
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  }
  if (mode === 'update') {
    return `${kw('SELECT')} ITEMARRIVALNUM, PURCHID, INVENTLOCATIONID,
       INVENTSITEID, CREATEDDATETIME, POSTEDDATETIME, POSTED, CREATEDBY
${kw('FROM')} IVZ_ItemArrivalJour_CT
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)};`;
  }
  if (mode === 'packroll') {
    return `${kw('SELECT')} LINENUMBER, ITEMID, PURCHQTY ${kw('AS')} [Quantity],
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
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  }
  if (mode === 'check') {
    return `${kw('SELECT')} EXECUTIONID, INVENTSITEID, LINENUMBER, PURCHID,
       ITEMID, INVENTSIZEID, INVENTCOLORID, INVENTSEASONID, CREATEDBY
${kw('FROM')} DMFPURCHLINEENTITY
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)} ${kw('AND')} EXECUTIONID ${kw('=')} (${kw('SELECT')} ${fn('MAX')}(EXECUTIONID) ${kw('FROM')} DMFPURCHLINEENTITY
  ${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)} ${kw('AND')} EXECUTIONID ${kw('LIKE')} ${vl("'BotPO%'")})
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  }
  if (mode === 'updatestaging') {
    return `${kw('UPDATE')} DMFPURCHLINEENTITY
${kw('SET')} TRANSFERSTATUS ${kw('=')} ${vl('1')}
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)}
  ${kw('AND')} EXECUTIONID ${kw('=')} ${vl(`'${e}'`)}
  ${kw('AND')} TRANSFERSTATUS ${kw('=')} ${vl('2')};`;
  }
  if (mode === 'searchdbc') {
    return `<span style="color:#e879f9">── QUERY 1 (DBC Header)</span>
${kw('SELECT')} CREATEDATETIME, EXPORTDATETIME, STATUS, VENDORAXACCOUNT,
       COMPANY, PURCHID, ORDERACCOUNT, INVOICEACCOUNT, CURRENCYCODE
${kw('FROM')} PO_HEADER_DBC
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)};

<span style="color:#e879f9">── QUERY 2 (DBC Lines)</span>
${kw('SELECT')} LINENUMBER, CREATEDATETIME, EXPORTDATETIME, STATUS,
       PURCHQTY, PURCHPRICE, LINEAMOUNT, JOBNUMBER,
       INVENTSTATUS, SEASON, COLORID, COLORNAME,
       SIZEIDFABRIC, SIZEID, COMPANY, SITEID, LOCATIONID
${kw('FROM')} PO_LINES_DBC
${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)}
${kw('ORDER BY')} LINENUMBER ${kw('ASC')};`;
  }
  if (mode === 'comparedbc') {
    return `<span style="color:var(--accent)">── QUERY 1 (Staging)</span>
${kw('SELECT')} LINENUMBER, ITEMID, INVENTSIZEID, INVENTCOLORID, INVENTSTYLEID,
       PURCHQTY, PURCHPRICE, LINEAMOUNT, TRANSFERSTATUS
${kw('FROM')} DMFPURCHLINEENTITY ${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)} <span style="color:var(--text-dim)">…MAX EXECUTIONID…</span>

<span style="color:#e879f9">── QUERY 2 (DBC Lines — MAX CREATEDATETIME per line)</span>
${kw('SELECT')} LINENUMBER, PURCHQTY, PURCHPRICE, LINEAMOUNT,
       SIZEID, COLORID, SEASON, STATUS
${kw('FROM')} PO_LINES_DBC ${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)};`;
  }
  if (mode === 'item') {
    const sz = itemInputs.size    || '?';
    const cl = itemInputs.color   || '?';
    const sn = itemInputs.season  || '?';
    const co = itemInputs.company || '?';
    return `${kw('SELECT')} ITEMID, INVENTSIZEID, INVENTCOLORID, INVENTSTYLEID,
       i.DATAAREAID ${kw('AS')} [Company]
${kw('FROM')} INVENTDIM d
${kw('LEFT JOIN')} INVENTDIMCOMBINATION i ${kw('ON')} i.INVENTDIMID ${kw('=')} d.INVENTDIMID
${kw('WHERE')} i.ITEMID ${kw('=')} ${vl(`'${p}'`)}
  ${kw('AND')} INVENTSIZEID ${kw('=')} ${vl(`'${sz}'`)}
  ${kw('AND')} INVENTCOLORID ${kw('=')} ${vl(`'${cl}'`)}
  ${kw('AND')} INVENTSTYLEID ${kw('=')} ${vl(`'${sn}'`)}
  ${kw('AND')} i.DATAAREAID ${kw('=')} ${vl(`'${co}'`)};`;
  }
  // compare
  return `<span style="color:var(--accent)">── QUERY 1 (Staging)</span>
${kw('SELECT')} LINENUMBER, ITEMID, INVENTSIZEID, INVENTCOLORID, PURCHQTY, PURCHPRICE, LINEAMOUNT, TRANSFERSTATUS
${kw('FROM')} DMFPURCHLINEENTITY ${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)} <span style="color:var(--text-dim)">…MAX EXECUTIONID…</span>

<span style="color:var(--purple)">── QUERY 2 (PO Line AX)</span>
${kw('SELECT')} LINENUMBER, ITEMID, IVZ_COLOR_CT, IVZ_SIZE_CT, PURCHQTY, PURCHPRICE, LINEAMOUNT
${kw('FROM')} PURCHLINE ${kw('WHERE')} PURCHID ${kw('=')} ${vl(`'${p}'`)};`;
}
