import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { fmt } from '../utils';

const HEADER_COLS = ['CREATED','EXPORTED','STATUS','VENDOR AX','COMPANY','PURCHID','ORDER ACCT','INVOICE ACCT','CURRENCY'];
const HEADER_KEYS = ['CREATEDATETIME','EXPORTDATETIME','STATUS','VENDORAXACCOUNT','COMPANY','PURCHID','ORDERACCOUNT','INVOICEACCOUNT','CURRENCYCODE'];

const LINE_COLS = ['LINE','CREATED','EXPORTED','STATUS','QTY','PRICE','AMOUNT','JOB NO','INVENT STATUS','SEASON','COLOR ID','COLOR NAME','SIZE FABRIC','SIZE ID','COMPANY','SITE','LOCATION'];
const LINE_KEYS = ['LINENUMBER','CREATEDATETIME','EXPORTDATETIME','STATUS','PURCHQTY','PURCHPRICE','LINEAMOUNT','JOBNUMBER','INVENTSTATUS','SEASON','COLORID','COLORNAME','SIZEIDFABRIC','SIZEID','COMPANY','SITEID','LOCATIONID'];

const uniq = (arr, key) => [...new Set(arr.map(r => r[key]).filter(v => v != null && v !== ''))].sort();

function Filter({ label, value, onChange, options, minWidth = 130 }) {
  return (
    <div className="filter-group">
      <div className="filter-label">{label}</div>
      <select className="filter-select" style={{ minWidth }} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );
}

export default function SearchDBCTab({ dbcHeader, dbcLines, po }) {
  // Stable identities, so the memos below don't recompute on every render.
  const header = useMemo(() => dbcHeader ?? [], [dbcHeader]);
  const lines  = useMemo(() => dbcLines  ?? [], [dbcLines]);

  const [hCreated,  setHCreated]  = useState('');
  const [hExported, setHExported] = useState('');
  const [lCreated,  setLCreated]  = useState('');
  const [lExported, setLExported] = useState('');
  const [lItemId,   setLItemId]   = useState('');
  const [lSizeFab,  setLSizeFab]  = useState('');
  const [lColorId,  setLColorId]  = useState('');
  const [lSeason,   setLSeason]   = useState('');

  const filteredHeader = useMemo(() => header.filter(r => {
    if (hCreated  && r.CREATEDATETIME !== hCreated)  return false;
    if (hExported && r.EXPORTDATETIME !== hExported) return false;
    return true;
  }), [header, hCreated, hExported]);

  const filteredLines = useMemo(() => lines.filter(r => {
    if (lCreated  && r.CREATEDATETIME !== lCreated)  return false;
    if (lExported && r.EXPORTDATETIME !== lExported) return false;
    if (lItemId   && r.ITEMID         !== lItemId)   return false;
    if (lSizeFab  && r.SIZEIDFABRIC   !== lSizeFab)  return false;
    if (lColorId  && r.COLORID        !== lColorId)  return false;
    if (lSeason   && r.SEASON         !== lSeason)   return false;
    return true;
  }), [lines, lCreated, lExported, lItemId, lSizeFab, lColorId, lSeason]);

  // Totals follow the line filters, matching applyDBCLinesFilter().
  const totalQty = filteredLines.reduce((s, r) => s + (parseFloat(r.PURCHQTY   || 0) || 0), 0);
  const totalAmt = filteredLines.reduce((s, r) => s + (parseFloat(r.LINEAMOUNT || 0) || 0), 0);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    if (filteredHeader.length) {
      const ws = XLSX.utils.aoa_to_sheet([HEADER_COLS, ...filteredHeader.map(r => HEADER_KEYS.map(k => r[k] ?? ''))]);
      XLSX.utils.book_append_sheet(wb, ws, 'Header');
    }
    if (filteredLines.length) {
      const ws = XLSX.utils.aoa_to_sheet([LINE_COLS, ...filteredLines.map(r => LINE_KEYS.map(k => r[k] ?? ''))]);
      XLSX.utils.book_append_sheet(wb, ws, 'Lines');
    }
    XLSX.writeFile(wb, `PO_SearchDBC_${po}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <>
      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-label">Header Rows</div>
          <div className="summary-value sky">{filteredHeader.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Line Rows</div>
          <div className="summary-value blue">{filteredLines.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Qty</div>
          <div className="summary-value">{fmt(totalQty, 4)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Amount</div>
          <div className="summary-value">{fmt(totalAmt, 2)}</div>
        </div>
      </div>

      <div className="results-meta">
        <span className="results-count">
          PO <strong>{po}</strong> —{' '}
          <span className="text-sky">{filteredHeader.length} Header</span> ·{' '}
          <span className="text-accent">{filteredLines.length} Lines</span>
        </span>
        <span className="tag tag-searchdbc">SEARCH PO DBC</span>
        <button className="export-btn" style={{ marginLeft:'auto' }} onClick={exportExcel}>⬇ Export Excel</button>
      </div>

      <div className="dbc-section-label sky">── Header</div>
      <div className="filters-row">
        <Filter label="Created"  value={hCreated}  onChange={setHCreated}  options={uniq(header,'CREATEDATETIME')} minWidth={160} />
        <Filter label="Exported" value={hExported} onChange={setHExported} options={uniq(header,'EXPORTDATETIME')} minWidth={160} />
        <button className="filter-clear" onClick={() => { setHCreated(''); setHExported(''); }}>✕ Clear</button>
      </div>
      <div className="table-wrap" style={{ maxHeight:200, flex:'none' }}>
        <table>
          <thead><tr>{HEADER_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filteredHeader.map((r, i) => (
              <tr key={i}>
                {HEADER_KEYS.map(k => {
                  const v = r[k] != null && r[k] !== '' ? r[k] : '—';
                  return v === '—' ? <td key={k} className="td-dim">—</td> : <td key={k}>{v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dbc-section-label accent">── Lines</div>
      <div className="filters-row">
        <Filter label="Created"     value={lCreated}  onChange={setLCreated}  options={uniq(lines,'CREATEDATETIME')} minWidth={160} />
        <Filter label="Exported"    value={lExported} onChange={setLExported} options={uniq(lines,'EXPORTDATETIME')} minWidth={160} />
        <Filter label="Item ID"     value={lItemId}   onChange={setLItemId}   options={uniq(lines,'ITEMID')} />
        <Filter label="Size Fabric" value={lSizeFab}  onChange={setLSizeFab}  options={uniq(lines,'SIZEIDFABRIC')} minWidth={110} />
        <Filter label="Color ID"    value={lColorId}  onChange={setLColorId}  options={uniq(lines,'COLORID')} minWidth={110} />
        <Filter label="Season"      value={lSeason}   onChange={setLSeason}   options={uniq(lines,'SEASON')} minWidth={110} />
        <button
          className="filter-clear"
          onClick={() => { setLCreated(''); setLExported(''); setLItemId(''); setLSizeFab(''); setLColorId(''); setLSeason(''); }}
        >✕ Clear</button>
        <span className="filter-count">{filteredLines.length} rows</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{LINE_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filteredLines.map((r, i) => (
              <tr key={i}>
                {LINE_KEYS.map(k => {
                  let v = r[k] != null && r[k] !== '' ? r[k] : '—';
                  if (v !== '—') {
                    if (k === 'PURCHQTY')   v = parseFloat(v).toFixed(4);
                    if (k === 'PURCHPRICE') v = parseFloat(v).toFixed(5);
                    if (k === 'LINEAMOUNT') v = parseFloat(v).toFixed(2);
                  }
                  if (k === 'LINENUMBER') return <td key={k} className="num">{v}</td>;
                  return v === '—' ? <td key={k} className="td-dim">—</td> : <td key={k}>{v}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
