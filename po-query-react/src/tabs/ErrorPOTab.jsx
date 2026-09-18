import { getVal } from '../utils';
import { exportRows } from '../exportExcel';
import { showFullError, showErrorSummary } from '../reports';

function uniqFrom(arr, key) {
  return [...new Set(arr.map(r => getVal(r, key)).filter(v => v && v !== '—'))].join(', ') || '—';
}

export default function ErrorPOTab({ rows, po }) {
  const poGroups = {};
  rows.forEach(r => { const p = getVal(r,'PURCHID')||'(unknown)'; if(!poGroups[p]) poGroups[p]=[]; poGroups[p].push(r); });

  const allItems   = uniqFrom(rows,'ITEMID');
  const allSizes   = uniqFrom(rows,'INVENTSIZEID');
  const allColors  = uniqFrom(rows,'INVENTCOLORID');
  const allSeasons = uniqFrom(rows,'INVENTSEASONID');

  const COLS  = ['LINE','EXEC ID','PO','ITEM ID','SIZE','COLOR','SEASON','QTY','PRICE','TRANSFER'];
  const KEYS  = ['LINENUMBER','EXECUTIONID','PURCHID','ITEMID','INVENTSIZEID','INVENTCOLORID','INVENTSEASONID','PURCHQTY','PURCHPRICE','TRANSFERSTATUS'];

  return (
    <>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div className="summary-row" style={{ flexWrap:'wrap', alignItems:'stretch' }}>
          <div className="summary-card" style={{ flex:'none', minWidth:110 }}>
            <div className="summary-label">Error Lines</div>
            <div className="summary-value red">{rows.length}</div>
            <div className="summary-sub">{Object.keys(poGroups).length} PO{Object.keys(poGroups).length!==1?'s':''}</div>
          </div>
          <div className="summary-card" style={{ flex:2, minWidth:160 }}>
            <div className="summary-label">Items</div>
            <div className="summary-value small" style={{ color:'var(--accent)', wordBreak:'break-word', whiteSpace:'normal' }}>{allItems}</div>
          </div>
          <div className="summary-card" style={{ flex:2, minWidth:160 }}>
            <div className="summary-label">Sizes</div>
            <div className="summary-value small" style={{ color:'var(--yellow)', wordBreak:'break-word', whiteSpace:'normal' }}>{allSizes}</div>
          </div>
          <div className="summary-card" style={{ flex:2, minWidth:160 }}>
            <div className="summary-label">Colors</div>
            <div className="summary-value small" style={{ color:'var(--purple)', wordBreak:'break-word', whiteSpace:'normal' }}>{allColors}</div>
          </div>
          <div className="summary-card" style={{ flex:2, minWidth:160 }}>
            <div className="summary-label">Seasons</div>
            <div className="summary-value small" style={{ color:'var(--teal)', wordBreak:'break-word', whiteSpace:'normal' }}>{allSeasons}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, flexShrink:0, justifyContent:'center' }}>
            <button className="action-btn red" onClick={() => showFullError(rows)}>⚠ Show Full Error</button>
            <button className="action-btn orange" onClick={() => showErrorSummary(rows)}>≡ Error Summarize</button>
          </div>
        </div>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{rows.length}</strong> row{rows.length!==1?'s':''} for PO <strong>{po}</strong></span>
        <span className="tag tag-list">ERROR PO</span>
        <button
          className="export-btn"
          style={{ marginLeft:'auto' }}
          onClick={() => exportRows({
            cols: COLS, keys: KEYS, rows,
            sheet: 'ErrorPO', file: `PO_ErrorPO_${po}`,
            format: (k, v) => (k === 'PURCHQTY' ? parseFloat(v).toFixed(0) : k === 'PURCHPRICE' ? parseFloat(v).toFixed(5) : v),
          })}
        >⬇ Export Excel</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c=><th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  let raw = getVal(r,k);
                  let val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
                  if (val !== '—') {
                    if (k === 'PURCHQTY') val = parseFloat(val||0).toFixed(0);
                    if (k === 'PURCHPRICE') val = parseFloat(val||0).toFixed(5);
                  }
                  if (k === 'TRANSFERSTATUS') {
                    const v = parseInt(val);
                    const labels = {1:'Completed',2:'ERROR',0:'Pending'};
                    const cls = {1:'transfer-ok',2:'transfer-error',0:'transfer-pending'};
                    return <td key={k}><span className={`transfer-badge ${cls[v]??'transfer-pending'}`}>● {labels[v]??'Pending'}</span></td>;
                  }
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
