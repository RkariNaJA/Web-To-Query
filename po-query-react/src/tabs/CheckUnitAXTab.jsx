import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getVal } from '../utils';
import { showUnitSummary } from '../reports';

const COLS = ['ITEM ID','PO UNIT','SALES UNIT','INVENT UNIT','BOM UNIT','REQ GROUP','MODULE TYPE','COMPANY'];
const KEYS = ['ITEMID','PO_UNIT','SALES_UNIT','INVENT_UNIT','BOMUNITID','REQGROUPID','MODULETYPE','Company'];

export default function CheckUnitAXTab({ rows, po }) {
  const [fCompany, setFCompany] = useState('');
  const [fModule,  setFModule]  = useState('');

  const companyOpts = useMemo(
    () => [...new Set(rows.map(r => getVal(r,'Company')).filter(v => v != null && v !== ''))].sort(),
    [rows],
  );
  const moduleOpts = useMemo(
    () => [...new Set(rows.map(r => getVal(r,'MODULETYPE')).filter(v => v != null && v !== ''))].sort(),
    [rows],
  );

  const filtered = useMemo(() => rows.filter(r => {
    if (fCompany && getVal(r,'Company')    !== fCompany) return false;
    if (fModule  && getVal(r,'MODULETYPE') !== fModule)  return false;
    return true;
  }), [rows, fCompany, fModule]);

  // The summary cards count what is on screen, so they track the filters.
  const shownCompanies = useMemo(
    () => new Set(filtered.map(r => getVal(r,'Company')).filter(v => v != null && v !== '')).size,
    [filtered],
  );
  const shownModules = useMemo(
    () => new Set(filtered.map(r => getVal(r,'MODULETYPE')).filter(v => v != null && v !== '')).size,
    [filtered],
  );

  function exportExcel() {
    const data = [COLS, ...filtered.map(r => KEYS.map(k => getVal(r, k) ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Check Unit');
    XLSX.writeFile(wb, `PO_Unit_${po}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Total Rows</div><div className="summary-value indigo">{filtered.length}</div></div>
        <div className="summary-card"><div className="summary-label">Companies</div><div className="summary-value">{shownCompanies}</div></div>
        <div className="summary-card"><div className="summary-label">Module Types</div><div className="summary-value">{shownModules}</div></div>
      </div>

      <div className="results-meta">
        <span className="results-count">Showing <strong>{filtered.length}</strong>{filtered.length !== rows.length ? ` / ${rows.length}` : ''} row{filtered.length !== 1 ? 's' : ''} for Item ID <strong>{po}</strong></span>
        <span className="tag tag-unit">CHECK UNIT ON AX</span>
        <button
          className="export-btn indigo"
          style={{ marginLeft:'auto' }}
          onClick={() => showUnitSummary(filtered)}
        >≡ Summarize</button>
        <button className="export-btn" onClick={exportExcel}>⬇ Export Excel</button>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <div className="filter-label">Company</div>
          <select className="filter-select" value={fCompany} onChange={e => setFCompany(e.target.value)}>
            <option value="">All</option>
            {companyOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Module Type</div>
          <select className="filter-select" value={fModule} onChange={e => setFModule(e.target.value)}>
            <option value="">All</option>
            {moduleOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button className="filter-clear" onClick={() => { setFCompany(''); setFModule(''); }}>✕ Clear</button>
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
                  const val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
                  if (val === '—') return <td key={k} className="td-dim">—</td>;
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
