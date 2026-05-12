import { useState, useMemo } from 'react';
import { getVal } from '../utils';

const COLS = ['ITEM ID','SIZE','COLOR','SEASON','COMPANY'];
const KEYS = ['ITEMID','INVENTSIZEID','INVENTCOLORID','INVENTSTYLEID','Company'];

function uniqOpts(rows, key) {
  return [...new Set(rows.map(r => getVal(r, key)).filter(v => v != null && v !== ''))].sort();
}

export default function CheckItemAXTab({ rows, po }) {
  const [fSize,    setFSize]    = useState('');
  const [fColor,   setFColor]   = useState('');
  const [fSeason,  setFSeason]  = useState('');
  const [fCompany, setFCompany] = useState('');

  const sizeOpts    = useMemo(() => uniqOpts(rows, 'INVENTSIZEID'),  [rows]);
  const colorOpts   = useMemo(() => uniqOpts(rows, 'INVENTCOLORID'), [rows]);
  const seasonOpts  = useMemo(() => uniqOpts(rows, 'INVENTSTYLEID'), [rows]);
  const companyOpts = useMemo(() => uniqOpts(rows, 'Company'),       [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (fSize)    r = r.filter(x => getVal(x, 'INVENTSIZEID')  === fSize);
    if (fColor)   r = r.filter(x => getVal(x, 'INVENTCOLORID') === fColor);
    if (fSeason)  r = r.filter(x => getVal(x, 'INVENTSTYLEID') === fSeason);
    if (fCompany) r = r.filter(x => getVal(x, 'Company')       === fCompany);
    return r;
  }, [rows, fSize, fColor, fSeason, fCompany]);

  const selStyle = { background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text-primary)', fontFamily:'var(--mono)', fontSize:11, padding:'5px 8px', borderRadius:6, cursor:'pointer', minWidth:110 };
  const lblStyle = { fontFamily:'var(--mono)', fontSize:10, color:'var(--text-dim)', letterSpacing:'0.06em', textTransform:'uppercase', display:'block', marginBottom:4 };

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Total Rows</div><div className="summary-value pink">{filtered.length}</div></div>
        <div className="summary-card"><div className="summary-label">Sizes Found</div><div className="summary-value">{sizeOpts.length}</div></div>
        <div className="summary-card"><div className="summary-label">Colors Found</div><div className="summary-value">{colorOpts.length}</div></div>
        <div className="summary-card"><div className="summary-label">Styles Found</div><div className="summary-value">{seasonOpts.length}</div></div>
      </div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:12, flexWrap:'wrap', padding:'4px 0' }}>
        <div><label style={lblStyle}>Size</label><select style={selStyle} value={fSize} onChange={e=>setFSize(e.target.value)}><option value="">All</option>{sizeOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div><label style={lblStyle}>Color</label><select style={selStyle} value={fColor} onChange={e=>setFColor(e.target.value)}><option value="">All</option>{colorOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div><label style={lblStyle}>Season</label><select style={selStyle} value={fSeason} onChange={e=>setFSeason(e.target.value)}><option value="">All</option>{seasonOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <div><label style={lblStyle}>Company</label><select style={selStyle} value={fCompany} onChange={e=>setFCompany(e.target.value)}><option value="">All</option>{companyOpts.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
        <button onClick={()=>{setFSize('');setFColor('');setFSeason('');setFCompany('');}} style={{alignSelf:'flex-end',padding:'5px 12px',background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text-muted)',fontFamily:'var(--mono)',fontSize:11,borderRadius:6,cursor:'pointer'}}>✕ Clear</button>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{filtered.length}</strong> row{filtered.length !== 1 ? 's' : ''} for Item ID <strong>{po}</strong></span>
        <span className="tag tag-item">CHECK ITEM ON AX</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c=><th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {filtered.map((r,i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  const raw = getVal(r, k);
                  const val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
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
