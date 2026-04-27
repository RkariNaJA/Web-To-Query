import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getVal } from '../utils';

function TransferBadge({ val }) {
  const v = parseInt(val);
  const labels = { 1: 'Completed', 2: 'ERROR', 0: 'Pending' };
  const cls = { 1: 'transfer-ok', 2: 'transfer-error', 0: 'transfer-pending' };
  return <span className={`transfer-badge ${cls[v] ?? 'transfer-pending'}`}>● {labels[v] ?? 'Pending'}</span>;
}

const COLS = ['LINE','EXEC ID','ITEM ID','SIZE','COLOR','STYLE','QTY','PRICE','AMOUNT','JOB NO','SITE','LOCATION','STATUS','TRANSFER'];
const KEYS = ['LINENUMBER','EXECUTIONID','ITEMID','INVENTSIZEID','INVENTCOLORID','INVENTSTYLEID','PURCHQTY','PURCHPRICE','LINEAMOUNT','JOBNUMBER','INVENTSITEID','INVENTLOCATIONID','INVENTSTATUSID','TRANSFERSTATUS'];

export default function SearchTab({ rows, po }) {
  const [fColor,  setFColor]  = useState('');
  const [fSize,   setFSize]   = useState('');
  const [fSeason, setFSeason] = useState('');

  const totalQty = rows.reduce((s, r) => s + (parseFloat(getVal(r,'PURCHQTY')   || 0) || 0), 0);
  const totalAmt = rows.reduce((s, r) => s + (parseFloat(getVal(r,'LINEAMOUNT') || 0) || 0), 0);
  const errCount = rows.filter(r => parseInt(getVal(r,'TRANSFERSTATUS')) === 2).length;
  const okCount  = rows.filter(r => parseInt(getVal(r,'TRANSFERSTATUS')) === 1).length;

  const colorOpts  = useMemo(() => [...new Set(rows.map(r => getVal(r,'INVENTCOLORID')).filter(Boolean))].sort(), [rows]);
  const sizeOpts   = useMemo(() => [...new Set(rows.map(r => getVal(r,'INVENTSIZEID')).filter(Boolean))].sort(),  [rows]);
  const seasonOpts = useMemo(() => [...new Set(rows.map(r => getVal(r,'INVENTSTYLEID')).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (fColor  && getVal(r,'INVENTCOLORID') !== fColor)  return false;
    if (fSize   && getVal(r,'INVENTSIZEID')  !== fSize)   return false;
    if (fSeason && getVal(r,'INVENTSTYLEID') !== fSeason) return false;
    return true;
  }), [rows, fColor, fSize, fSeason]);

  function exportExcel() {
    const data = [COLS, ...filtered.map(r => KEYS.map(k => {
      let v = getVal(r, k);
      if (v == null || v === '') return '';
      if (k === 'PURCHQTY')    return parseFloat(v).toFixed(0);
      if (k === 'PURCHPRICE')  return parseFloat(v).toFixed(5);
      if (k === 'LINEAMOUNT')  return parseFloat(v).toFixed(2);
      return v;
    }))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Search PO');
    XLSX.writeFile(wb, `PO_Search_${po}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Total Lines</div><div className="summary-value blue">{rows.length}</div></div>
        <div className="summary-card"><div className="summary-label">Completed</div><div className="summary-value green">{okCount}</div></div>
        <div className="summary-card"><div className="summary-label">Errors</div><div className={`summary-value ${errCount > 0 ? 'red' : 'green'}`}>{errCount}</div></div>
        <div className="summary-card"><div className="summary-label">Total Qty</div><div className="summary-value">{parseFloat(totalQty).toLocaleString()}</div></div>
        <div className="summary-card"><div className="summary-label">Total Amount</div><div className="summary-value">{parseFloat(totalAmt).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
      </div>

      <div className="results-meta">
        <span className="results-count">Showing <strong>{filtered.length}</strong>{filtered.length !== rows.length ? ` / ${rows.length}` : ''} row{filtered.length !== 1 ? 's' : ''} for PO <strong>{po}</strong></span>
        <span className="tag tag-search">SEARCH PO (STAGING)</span>
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
        <button className="filter-clear" onClick={() => { setFColor(''); setFSize(''); setFSeason(''); }}>✕ Clear</button>
        <span className="filter-count">{filtered.length} rows</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  let raw = getVal(r, k);
                  let val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
                  if (val !== '—') {
                    if (k === 'PURCHQTY')   val = parseFloat(val || 0).toFixed(0);
                    if (k === 'PURCHPRICE') val = parseFloat(val || 0).toFixed(5);
                    if (k === 'LINEAMOUNT') val = parseFloat(val || 0).toFixed(2);
                  }
                  if (k === 'TRANSFERSTATUS') return <td key={k}><TransferBadge val={val} /></td>;
                  if (k === 'LINENUMBER')     return <td key={k} className="num">{val}</td>;
                  if (!val || val === '—')    return <td key={k} className="td-dim">—</td>;
                  return <td key={k}>{val}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
