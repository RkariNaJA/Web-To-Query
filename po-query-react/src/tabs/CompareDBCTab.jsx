import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getVal, fmt } from '../utils';

export default function CompareDBCTab({ stagingRows, dbcLines, po }) {
  const [fColor,  setFColor]  = useState('');
  const [fSize,   setFSize]   = useState('');
  const [fSeason, setFSeason] = useState('');
  const [fStatus, setFStatus] = useState('');

  // Staging accessors
  const sLine  = r => parseFloat(getVal(r,'LINENUMBER'))   || 0;
  const sQty   = r => parseFloat(getVal(r,'PURCHQTY'))     || 0;
  const sPrice = r => parseFloat(getVal(r,'PURCHPRICE'))   || 0;
  const sAmt   = r => parseFloat(getVal(r,'LINEAMOUNT'))   || 0;
  const sSize  = r => getVal(r,'INVENTSIZEID')  ?? '—';
  const sColor = r => getVal(r,'INVENTCOLORID') ?? '—';
  const sSeason= r => getVal(r,'INVENTSTYLEID') ?? '—';
  const sXfer  = r => parseInt(getVal(r,'TRANSFERSTATUS'));
  const sItem  = r => getVal(r,'ITEMID') ?? '—';

  // DBC accessors
  const dLine  = r => parseFloat(r.LINENUMBER)  || 0;
  const dQty   = r => parseFloat(r.PURCHQTY)    || 0;
  const dPrice = r => parseFloat(r.PURCHPRICE)  || 0;
  const dSize  = r => r.SIZEID   ?? '—';
  const dColor = r => r.COLORID  ?? '—';
  const dSeason= r => r.SEASON   ?? '—';
  const dStatus= r => r.STATUS   ?? '—';

  // Deduplicate DBC lines: keep MAX CREATEDATETIME per LINENUMBER
  const dbcDeduped = useMemo(() => {
    const map = {};
    (dbcLines ?? []).forEach(r => {
      const ln = r.LINENUMBER;
      if (!map[ln] || String(r.CREATEDATETIME) > String(map[ln].CREATEDATETIME)) {
        map[ln] = r;
      }
    });
    return Object.values(map);
  }, [dbcLines]);

  const stagingMap = useMemo(() => {
    const m = {};
    stagingRows.forEach(r => { m[sLine(r)] = r; });
    return m;
  }, [stagingRows]);

  const dbcMap = useMemo(() => {
    const m = {};
    dbcDeduped.forEach(r => { m[dLine(r)] = r; });
    return m;
  }, [dbcDeduped]);

  const allLinesBase = useMemo(() =>
    [...new Set([...stagingRows.map(r => sLine(r)), ...dbcDeduped.map(r => dLine(r))])].sort((a,b) => a-b),
    [stagingRows, dbcDeduped]
  );

  // Totals
  const stgTotalQty = stagingRows.reduce((s,r) => s+sQty(r), 0);
  const stgTotalAmt = stagingRows.reduce((s,r) => s+sAmt(r), 0);
  const dbcTotalQty = dbcDeduped.reduce((s,r) => s+dQty(r), 0);
  const dbcTotalAmt = dbcDeduped.reduce((s,r) => s+(parseFloat(r.LINEAMOUNT)||0), 0);
  const diffQty = dbcTotalQty - stgTotalQty;
  const diffAmt = dbcTotalAmt - stgTotalAmt;
  const qtyMatch  = Math.abs(diffQty) < 0.01;
  const amtMatch  = Math.abs(diffAmt) < 0.01;
  const lineMatch = stagingRows.length === dbcDeduped.length;

  let mismatchLines = 0, onlyStg = 0, onlyDbc = 0;
  allLinesBase.forEach(ln => {
    const s = stagingMap[ln], d = dbcMap[ln];
    if (!s) onlyDbc++;
    else if (!d) onlyStg++;
    else {
      const qd = Math.abs(dQty(d) - sQty(s));
      const pd = Math.abs(dPrice(d) - sPrice(s));
      if (qd > 0.01 || pd > 0.0001) mismatchLines++;
    }
  });
  const issueCount = mismatchLines + onlyStg + onlyDbc;
  const allMatch   = qtyMatch && amtMatch && lineMatch;

  // Filter options
  const colorOpts  = useMemo(() => [...new Set([...stagingRows.map(r => sColor(r)), ...dbcDeduped.map(r => dColor(r))].filter(v => v && v !== '—'))].sort(), [stagingRows, dbcDeduped]);
  const sizeOpts   = useMemo(() => [...new Set([...stagingRows.map(r => sSize(r)),  ...dbcDeduped.map(r => dSize(r))].filter(v => v && v !== '—'))].sort(),  [stagingRows, dbcDeduped]);
  const seasonOpts = useMemo(() => [...new Set([...stagingRows.map(r => sSeason(r)),...dbcDeduped.map(r => dSeason(r))].filter(v => v && v !== '—'))].sort(), [stagingRows, dbcDeduped]);

  const filteredLines = useMemo(() => {
    return allLinesBase.filter(ln => {
      const s = stagingMap[ln], d = dbcMap[ln];
      const color  = s ? sColor(s)  : (d ? dColor(d)  : '—');
      const size   = s ? sSize(s)   : (d ? dSize(d)   : '—');
      const season = s ? sSeason(s) : (d ? dSeason(d) : '—');
      if (fColor  && color  !== fColor)  return false;
      if (fSize   && size   !== fSize)   return false;
      if (fSeason && season !== fSeason) return false;
      if (fStatus) {
        let st;
        if (!s)      st = 'DBC Only';
        else if (!d) st = 'Stg Only';
        else {
          const qd = Math.abs(dQty(d) - sQty(s));
          const pd = Math.abs(dPrice(d) - sPrice(s));
          st = (qd > 0.01 || pd > 0.0001) ? 'Mismatch' : 'Match';
        }
        if (st !== fStatus) return false;
      }
      return true;
    });
  }, [allLinesBase, stagingMap, dbcMap, fColor, fSize, fSeason, fStatus]);

  function clearFilters() {
    setFColor(''); setFSize(''); setFSeason(''); setFStatus('');
  }

  function exportExcel() {
    const header = ['LINE','ITEM ID','COLOR','SIZE','SEASON','STG QTY','DBC QTY','Δ QTY','STG PRICE','DBC PRICE','Δ PRICE','DBC STATUS','STG TRANSFER','STATUS'];
    const tLabels = { 1:'Completed', 2:'ERROR', 0:'Pending' };
    const data = [header, ...filteredLines.map(ln => {
      const s = stagingMap[ln], d = dbcMap[ln];
      const stgQty   = s ? sQty(s)   : '';
      const dbcQtyV  = d ? dQty(d)   : '';
      const stgPrice = s ? sPrice(s) : '';
      const dbcPriceV= d ? dPrice(d) : '';
      const dQ = (s && d) ? (dQty(d)   - sQty(s))   : '';
      const dP = (s && d) ? (dPrice(d) - sPrice(s))  : '';
      const dbcStat = d ? parseInt(dStatus(d)) : '';
      const isImported = dbcStat === 9;
      const tv = s ? sXfer(s) : '';
      let transferLabel = '';
      if (s && !isImported) transferLabel = 'Not Imported';
      else if (s) transferLabel = tLabels[tv] ?? '?';
      let stLabel = '';
      if (!s) stLabel = 'DBC Only';
      else if (!d) stLabel = 'Stg Only';
      else stLabel = (Math.abs(Number(dQ)) > 0.01 || Math.abs(Number(dP)) > 0.0001) ? 'Mismatch' : 'Match';
      return [ln, s ? sItem(s) : '—', s ? sColor(s) : (d ? dColor(d) : '—'), s ? sSize(s) : (d ? dSize(d) : '—'), s ? sSeason(s) : (d ? dSeason(d) : '—'), stgQty, dbcQtyV, dQ, stgPrice, dbcPriceV, dP, dbcStat, transferLabel, stLabel];
    })];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compare DBC');
    XLSX.writeFile(wb, `PO_CompareDBC_${po}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function TdNum({ v, dec = 0, mismatch = false }) {
    if (v === null) return <td className="diff-missing">—</td>;
    return <td className={`num${mismatch ? ' td-mismatch' : ''}`}>{fmt(v, dec)}</td>;
  }
  function TdDiff({ d, ok }) {
    if (d === null) return <td className="diff-missing">—</td>;
    if (Math.abs(d) < 0.0001) return <td className="diff-zero">0</td>;
    const decimals = d % 1 === 0 ? 0 : 5;
    return <td className={ok ? 'diff-ok' : 'diff-bad'}>{d > 0 ? '+' : ''}{fmt(d, decimals)}</td>;
  }

  const COLS = ['LINE','ITEM ID','COLOR','SIZE','SEASON','STG QTY','DBC QTY','Δ QTY','STG PRICE','DBC PRICE','Δ PRICE','DBC STATUS','STG TRANSFER','STATUS'];

  return (
    <>
      <div className="summary-row">
        <div className={`summary-card ${lineMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Lines Stg / DBC</div>
          <div className={`summary-value ${lineMatch ? 'green' : 'red'}`}>{stagingRows.length} / {dbcDeduped.length}</div>
          <div className="summary-sub">{lineMatch ? '✓ Match' : '✗ Mismatch'}</div>
        </div>
        <div className={`summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Total QTY Staging</div>
          <div className="summary-value blue">{fmt(stgTotalQty,0)}</div>
          <div className="summary-sub" style={{ color:'var(--pink)' }}>DBC: {fmt(dbcTotalQty,0)}</div>
        </div>
        <div className={`summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">QTY Diff (DBC − Stg)</div>
          <div className={`summary-value ${qtyMatch ? 'teal' : 'red'}`}>{diffQty >= 0 ? '+' : ''}{fmt(diffQty,0)}</div>
          <div className="summary-sub">{qtyMatch ? '✓ Match' : '✗ Mismatch'}</div>
        </div>
        <div className={`summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Total Amount Staging</div>
          <div className="summary-value blue">{fmt(stgTotalAmt,2)}</div>
          <div className="summary-sub" style={{ color:'var(--pink)' }}>DBC: {fmt(dbcTotalAmt,2)}</div>
        </div>
        <div className={`summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Amount Diff (DBC − Stg)</div>
          <div className={`summary-value ${amtMatch ? 'teal' : 'red'}`}>{diffAmt >= 0 ? '+' : ''}{fmt(diffAmt,2)}</div>
          <div className="summary-sub">{amtMatch ? '✓ Match' : '✗ Mismatch'}</div>
        </div>
        <div className={`summary-card ${issueCount === 0 ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Line Issues</div>
          <div className={`summary-value ${issueCount === 0 ? 'green' : 'red'}`}>{issueCount}</div>
          <div className="summary-sub">{mismatchLines} qty/price · {onlyStg} stg-only · {onlyDbc} dbc-only</div>
        </div>
      </div>

      <div className="results-meta">
        <span className="results-count">
          Comparing PO <strong>{po}</strong> —{' '}
          <span style={{ color:'var(--accent)' }}>{stagingRows.length} Staging</span> vs{' '}
          <span style={{ color:'var(--pink)' }}>{dbcDeduped.length} DBC Lines</span>
        </span>
        <span className="tag tag-comparedbc">COMPARE STG vs DBC</span>
        {allMatch
          ? <span className="tag tag-ok">✓ FULL MATCH</span>
          : <span className="tag tag-list">✗ {issueCount} ISSUE{issueCount !== 1 ? 'S' : ''}</span>
        }
        <button className="export-btn" style={{ marginLeft:'auto' }} onClick={exportExcel}>⬇ Export Excel</button>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <div className="filter-label">Color</div>
          <select className="filter-select" value={fColor} onChange={e => setFColor(e.target.value)}>
            <option value="">All</option>
            {colorOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Size</div>
          <select className="filter-select" value={fSize} onChange={e => setFSize(e.target.value)}>
            <option value="">All</option>
            {sizeOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Season</div>
          <select className="filter-select" value={fSeason} onChange={e => setFSeason(e.target.value)}>
            <option value="">All</option>
            {seasonOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Status</div>
          <select className="filter-select" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">All</option>
            {['Match','Mismatch','DBC Only','Stg Only'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button className="filter-clear" onClick={clearFilters}>✕ Clear</button>
        <span className="filter-count">{filteredLines.length} lines</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th colSpan={5} className="th-group-base" style={{ borderRight:'1px solid var(--border-accent)' }}>LINE INFO</th>
              <th colSpan={3} className="th-group-staging" style={{ borderRight:'1px solid rgba(79,156,249,0.2)' }}>QTY</th>
              <th colSpan={3} className="th-group-ax" style={{ borderRight:'1px solid rgba(232,121,249,0.2)' }}>PRICE</th>
              <th colSpan={3} className="th-group-diff">STATUS</th>
            </tr>
            <tr>{COLS.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filteredLines.map(ln => {
              const s = stagingMap[ln];
              const d = dbcMap[ln];

              let rowClass = 'row-match';
              if (!s) rowClass = 'row-only-ax';
              else if (!d) rowClass = 'row-only-staging';
              else {
                const qd = Math.abs(dQty(d) - sQty(s));
                const pd = Math.abs(dPrice(d) - sPrice(s));
                if (qd > 0.01 || pd > 0.0001) rowClass = 'row-mismatch';
              }

              const itemId   = s ? sItem(s)   : '—';
              const color    = s ? sColor(s)  : (d ? dColor(d)  : '—');
              const size     = s ? sSize(s)   : (d ? dSize(d)   : '—');
              const season   = s ? sSeason(s) : (d ? dSeason(d) : '—');
              const stgQty   = s ? sQty(s)    : null;
              const dbcQtyV  = d ? dQty(d)    : null;
              const stgPrice = s ? sPrice(s)  : null;
              const dbcPriceV= d ? dPrice(d)  : null;
              const dQ = (stgQty !== null && dbcQtyV !== null)     ? (dbcQtyV   - stgQty)   : null;
              const dP = (stgPrice !== null && dbcPriceV !== null)  ? (dbcPriceV - stgPrice)  : null;
              const qtyOk   = dQ !== null && Math.abs(dQ) < 0.01;
              const priceOk = dP !== null && Math.abs(dP) < 0.0001;

              const dbcStat  = d ? parseInt(dStatus(d)) : null;
              const isImported = dbcStat === 9;
              const tv = s ? sXfer(s) : -1;
              const tLabels = {1:'Completed',2:'ERROR',0:'Pending'};
              const tCls    = {1:'transfer-ok',2:'transfer-error',0:'transfer-pending'};

              const dbcStatusCell = d
                ? <td><span style={{ fontFamily:'var(--mono)', fontSize:11, padding:'2px 7px', borderRadius:4, background: isImported ? 'rgba(62,207,142,0.12)' : 'rgba(251,146,60,0.12)', color: isImported ? 'var(--green)' : 'var(--orange)' }}>{dbcStat}</span></td>
                : <td className="td-dim">—</td>;

              let transferCell;
              if (!s) {
                transferCell = <td className="td-dim">—</td>;
              } else if (!isImported) {
                transferCell = <td><span className="transfer-badge transfer-pending">⊘ Not Imported</span></td>;
              } else {
                transferCell = <td><span className={`transfer-badge ${tCls[tv] ?? 'transfer-pending'}`}>● {tLabels[tv] ?? '?'}</span></td>;
              }

              let statusCell;
              if (!s)             statusCell = <td><span className="match-badge match-ax">DBC Only</span></td>;
              else if (!d)        statusCell = <td><span className="match-badge match-staging">Stg Only</span></td>;
              else if (!qtyOk || !priceOk) statusCell = <td><span className="match-badge match-bad">✗ Mismatch</span></td>;
              else                statusCell = <td><span className="match-badge match-ok">✓ Match</span></td>;

              return (
                <tr key={ln} className={rowClass}>
                  <td className="num">{ln}</td>
                  <td>{itemId !== '—' ? itemId : <span className="td-dim">—</span>}</td>
                  <td>{color  !== '—' ? color  : <span className="td-dim">—</span>}</td>
                  <td>{size   !== '—' ? size   : <span className="td-dim">—</span>}</td>
                  <td>{season !== '—' ? season : <span className="td-dim">—</span>}</td>
                  <TdNum v={stgQty}    dec={0} mismatch={!qtyOk   && stgQty   !== null && dbcQtyV   !== null} />
                  <TdNum v={dbcQtyV}   dec={0} mismatch={!qtyOk   && stgQty   !== null && dbcQtyV   !== null} />
                  <TdDiff d={dQ} ok={qtyOk} />
                  <TdNum v={stgPrice}  dec={5} mismatch={!priceOk && stgPrice !== null && dbcPriceV !== null} />
                  <TdNum v={dbcPriceV} dec={5} mismatch={!priceOk && stgPrice !== null && dbcPriceV !== null} />
                  <TdDiff d={dP} ok={priceOk} />
                  {dbcStatusCell}
                  {transferCell}
                  {statusCell}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
