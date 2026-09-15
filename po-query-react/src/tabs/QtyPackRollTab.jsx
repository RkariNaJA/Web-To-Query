import { useState, useMemo } from 'react';
import { getVal, fmt } from '../utils';
import { exportRows } from '../exportExcel';

const COLS = ['LINE','PURCHID','ITEM ID','QUANTITY','RECEIVED','Deliver_Remainder','ORDERED','Invent_Unit_QTY','Compare_O_I','Compare_Q_R'];
const KEYS = ['LINENUMBER','PURCHID','ITEMID','Quantity','Received','Deliver_Remainder','Ordered','Invent_Unit_QTY','Compare_O_I','Compare_Q_R'];
const QTY_KEYS = ['Quantity','Received','Deliver_Remainder','Ordered','Invent_Unit_QTY'];

const num = v => parseFloat(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function CompareBadge({ val }) {
  const isTrue = String(val).toLowerCase() === 'true';
  return <span className={isTrue ? 'posted-yes' : 'posted-no'}>{isTrue ? '✓ True' : '✗ False'}</span>;
}

export default function QtyPackRollTab({ rows, po }) {
  const [fItemId, setFItemId] = useState('');

  const itemOpts = useMemo(
    () => [...new Set(rows.map(r => getVal(r,'ITEMID')).filter(v => v != null && v !== ''))].sort(),
    [rows],
  );

  const filtered = useMemo(
    () => rows.filter(r => !fItemId || getVal(r,'ITEMID') === fItemId),
    [rows, fItemId],
  );

  const totalQty       = filtered.reduce((s, r) => s + (parseFloat(getVal(r,'Quantity') || 0) || 0), 0);
  const totalReceived  = filtered.reduce((s, r) => s + (parseFloat(getVal(r,'Received') || 0) || 0), 0);
  const totalRemainder = filtered.reduce((s, r) => s + (parseFloat(getVal(r,'Deliver_Remainder') || 0) || 0), 0);

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Total Lines</div><div className="summary-value teal">{filtered.length}</div></div>
        <div className="summary-card"><div className="summary-label">Total Quantity</div><div className="summary-value blue">{fmt(totalQty, 0)}</div></div>
        <div className="summary-card"><div className="summary-label">Total Received</div><div className="summary-value green">{fmt(totalReceived, 0)}</div></div>
        <div className="summary-card"><div className="summary-label">Deliver Remainder</div><div className={`summary-value ${totalRemainder > 0 ? 'orange' : 'green'}`}>{fmt(totalRemainder, 0)}</div></div>
      </div>

      <div className="results-meta">
        <span className="results-count">Showing <strong>{filtered.length}</strong>{filtered.length !== rows.length ? ` / ${rows.length}` : ''} row{filtered.length !== 1 ? 's' : ''} for PO <strong>{po}</strong></span>
        <span className="tag tag-packroll">QTY PACK/ROLL</span>
        <button
          className="export-btn"
          style={{ marginLeft:'auto' }}
          onClick={() => exportRows({
            cols: COLS, keys: KEYS, rows: filtered,
            sheet: 'QtyPackRoll', file: `PO_QtyPackRoll_${po}`,
            format: (k, v) => (QTY_KEYS.includes(k) ? num(v) : v),
          })}
        >⬇ Export Excel</button>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <div className="filter-label">Item ID</div>
          <select className="filter-select" value={fItemId} onChange={e => setFItemId(e.target.value)}>
            <option value="">All</option>
            {itemOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button className="filter-clear" onClick={() => setFItemId('')}>✕ Clear</button>
        <span className="filter-count">{filtered.length} rows</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  const raw = getVal(r, k);
                  let val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
                  if (val !== '—' && QTY_KEYS.includes(k)) val = num(val);
                  if (k === 'Compare_O_I' || k === 'Compare_Q_R') return <td key={k}><CompareBadge val={raw} /></td>;
                  if (k === 'LINENUMBER') return <td key={k} className="num">{val}</td>;
                  if (!val || val === '—') return <td key={k} className="td-dim">—</td>;
                  if (k === 'Received') return <td key={k} style={{ color: 'var(--green)', fontWeight: 600, background: 'rgba(62,207,142,0.07)' }}>{val}</td>;
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
