import { useState, useMemo } from 'react';
import { getVal } from '../utils';

const COLS = ['LINE','PO','ITEM ID','COLOR','SIZE','SEASON','QTY','UNIT PRICE','NET AMOUNT','UNIT'];
const KEYS = ['LINENUMBER','PURCHID','ITEMID','IVZ_COLOR_CT','IVZ_SIZE_CT','IVZ_SEASON_CT','PURCHQTY','PURCHPRICE','LINEAMOUNT','PURCHUNIT'];

function uniqOpts(rows, key) {
  return [...new Set(rows.map(r => getVal(r, key)).filter(v => v != null && v !== ''))].sort();
}

export default function POLineAXTab({ rows, po, serverTotalQty, serverTotalAmount }) {
  const [fColor, setFColor]   = useState('');
  const [fSize, setFSize]     = useState('');
  const [fSeason, setFSeason] = useState('');

  const row0Qty = rows[0] ? (parseFloat(getVal(rows[0], 'Total QTY')) || 0) : 0;
  const row0Amt = rows[0] ? (parseFloat(getVal(rows[0], 'Total Net amount')) || 0) : 0;
  const sumQty  = rows.reduce((s, r) => s + (parseFloat(getVal(r,'QTY') || getVal(r,'PURCHQTY')) || 0), 0);
  const sumAmt  = rows.reduce((s, r) => s + (parseFloat(getVal(r,'Net amount') || getVal(r,'LINEAMOUNT')) || 0), 0);
  const totalQty = serverTotalQty ?? (row0Qty !== 0 ? row0Qty : sumQty);
  const totalAmt = serverTotalAmount ?? (row0Amt !== 0 ? row0Amt : sumAmt);

  const colorOpts  = useMemo(() => uniqOpts(rows, 'IVZ_COLOR_CT'), [rows]);
  const sizeOpts   = useMemo(() => uniqOpts(rows, 'IVZ_SIZE_CT'), [rows]);
  const seasonOpts = useMemo(() => uniqOpts(rows, 'IVZ_SEASON_CT'), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (fColor)  r = r.filter(x => getVal(x,'IVZ_COLOR_CT')  === fColor);
    if (fSize)   r = r.filter(x => getVal(x,'IVZ_SIZE_CT')   === fSize);
    if (fSeason) r = r.filter(x => getVal(x,'IVZ_SEASON_CT') === fSeason);
    return [...r].sort((a, b) => {
      const pa = String(getVal(a,'PURCHID') ?? ''), pb = String(getVal(b,'PURCHID') ?? '');
      if (pa !== pb) return pa.localeCompare(pb);
      return (parseFloat(getVal(a,'LINENUMBER')) || 0) - (parseFloat(getVal(b,'LINENUMBER')) || 0);
    });
  }, [rows, fColor, fSize, fSeason]);

  const selStyle = { background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text-primary)', fontFamily:'var(--mono)', fontSize:11, padding:'5px 8px', borderRadius:6, cursor:'pointer', minWidth:110 };
  const lblStyle = { fontFamily:'var(--mono)', fontSize:10, color:'var(--text-dim)', letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:4 };

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Total Lines</div><div className="summary-value purple" id="count-line-count">{filtered.length}</div></div>
        <div className="summary-card"><div className="summary-label">Total QTY</div><div className="summary-value blue">{parseFloat(totalQty).toLocaleString()}</div></div>
        <div className="summary-card"><div className="summary-label">Total Net Amount</div><div className="summary-value">{parseFloat(totalAmt).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap', padding:'4px 0' }}>
        <div><label style={lblStyle}>Color</label><select style={selStyle} value={fColor} onChange={e=>setFColor(e.target.value)}><option value="">All</option>{colorOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div><label style={lblStyle}>Size</label><select style={selStyle} value={fSize} onChange={e=>setFSize(e.target.value)}><option value="">All</option>{sizeOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div><label style={lblStyle}>Season</label><select style={selStyle} value={fSeason} onChange={e=>setFSeason(e.target.value)}><option value="">All</option>{seasonOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <button onClick={()=>{setFColor('');setFSize('');setFSeason('');}} style={{alignSelf:'flex-end',padding:'5px 12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-muted)',fontFamily:'var(--mono)',fontSize:11,borderRadius:6,cursor:'pointer'}}>✕ Clear</button>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{filtered.length}</strong> row{filtered.length !== 1 ? 's' : ''} for PO <strong>{po}</strong></span>
        <span className="tag tag-count">PO LINE (AX)</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c=><th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r,i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  let raw = getVal(r, k);
                  let val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
                  if (val !== '—') {
                    if (k === 'PURCHQTY') val = parseFloat(val||0).toFixed(0);
                    if (k === 'PURCHPRICE') val = parseFloat(val||0).toFixed(5);
                    if (k === 'LINEAMOUNT') val = parseFloat(val||0).toFixed(2);
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
