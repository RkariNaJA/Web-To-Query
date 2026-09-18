import { useState, useMemo } from 'react';
import { getVal } from '../utils';
import { exportRows } from '../exportExcel';
import { showCheckSummary } from '../reports';

const COLS = ['EXEC ID','SITE','LINE','PO','ITEM ID','SIZE','COLOR','SEASON'];
const KEYS = ['EXECUTIONID','INVENTSITEID','LINENUMBER','PURCHID','ITEMID','INVENTSIZEID','INVENTCOLORID','INVENTSEASONID'];

function uniqVals(rows, key) {
  return [...new Set(rows.map(r => getVal(r, key)).filter(v => v && v !== '—'))].sort();
}

export default function BotPOCheckTab({ rows, po }) {
  const [fPo,     setFPo]     = useState('');
  const [fItemId, setFItemId] = useState('');

  const poOpts   = useMemo(() => uniqVals(rows, 'PURCHID'), [rows]);
  const itemOpts = useMemo(() => uniqVals(rows, 'ITEMID'),  [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    if (fPo     && getVal(r,'PURCHID') !== fPo)     return false;
    if (fItemId && getVal(r,'ITEMID')  !== fItemId) return false;
    return true;
  }), [rows, fPo, fItemId]);

  const execIds = [...new Set(filtered.map(r => getVal(r,'EXECUTIONID')).filter(v => v && v !== '—'))].join(', ') || '—';
  const sites   = [...new Set(filtered.map(r => getVal(r,'INVENTSITEID')).filter(v => v && v !== '—'))].join(', ') || '—';

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div className="summary-row" style={{ flex:1, flexWrap:'wrap', alignItems:'stretch' }}>
          <div className="summary-card" style={{ flex:'none', minWidth:110 }}><div className="summary-label">Total Lines</div><div className="summary-value red">{filtered.length}</div></div>
          <div className="summary-card" style={{ flex:2, minWidth:160 }}><div className="summary-label">Exec ID</div><div className="summary-value small" style={{ color:'var(--green)', wordBreak:'break-word', whiteSpace:'normal' }}>{execIds}</div></div>
          <div className="summary-card" style={{ flex:'none', minWidth:110 }}><div className="summary-label">Sites</div><div className="summary-value small" style={{ color:'var(--teal)', wordBreak:'break-word', whiteSpace:'normal' }}>{sites}</div></div>
        </div>
        <button className="action-btn red" style={{ flexShrink:0 }} onClick={() => showCheckSummary(filtered)}>≡ Error Summarize</button>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{filtered.length}</strong>{filtered.length !== rows.length ? ` / ${rows.length}` : ''} row{filtered.length!==1?'s':''} for PO <strong>{po}</strong></span>
        <span className="tag tag-check">BOTPO CHECKING</span>
        <button
          className="export-btn"
          style={{ marginLeft:'auto' }}
          onClick={() => exportRows({ cols: COLS, keys: KEYS, rows: filtered, sheet: 'BotPO', file: `PO_BotPO_${po}` })}
        >⬇ Export Excel</button>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <div className="filter-label">PO</div>
          <select className="filter-select" value={fPo} onChange={e => setFPo(e.target.value)}>
            <option value="">All</option>
            {poOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Item ID</div>
          <select className="filter-select" value={fItemId} onChange={e => setFItemId(e.target.value)}>
            <option value="">All</option>
            {itemOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button className="filter-clear" onClick={() => { setFPo(''); setFItemId(''); }}>✕ Clear</button>
        <span className="filter-count">{filtered.length} rows</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c=><th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r,i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  let val = getVal(r,k);
                  val = (val !== undefined && val !== null && val !== '') ? val : '—';
                  if (k === 'LINENUMBER') return <td key={k} className="num">{val}</td>;
                  if (!val || val === '—') return <td key={k} className="td-dim">—</td>;
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
