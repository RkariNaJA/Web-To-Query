import { getVal } from '../utils';

const COLS = ['ARRIVAL NUM','PO','LOCATION','SITE','CREATED','POSTED DATE','POSTED','CREATED BY'];
const KEYS = ['ITEMARRIVALNUM','PURCHID','INVENTLOCATIONID','INVENTSITEID','CREATEDDATETIME','POSTEDDATETIME','POSTED','CREATEDBY'];

export default function PackRollTab({ rows, po }) {
  const posted = rows.filter(r => parseInt(r.POSTED) === 1).length;

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Records</div><div className="summary-value orange">{rows.length}</div></div>
        <div className="summary-card"><div className="summary-label">Posted</div><div className="summary-value green">{posted}</div></div>
        <div className="summary-card"><div className="summary-label">Not Posted</div><div className="summary-value red">{rows.length - posted}</div></div>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{rows.length}</strong> row{rows.length !== 1 ? 's' : ''} for PO <strong>{po}</strong></span>
        <span className="tag tag-update">PACK / ROLL</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {KEYS.map(k => {
                  let raw = getVal(r, k);
                  let val = (raw !== undefined && raw !== null && raw !== '') ? raw : '—';
                  if (k === 'POSTED') {
                    const v = parseInt(val);
                    return <td key={k}><span className={v === 1 ? 'posted-yes' : 'posted-no'}>{v === 1 ? '● Posted' : '○ Not Posted'}</span></td>;
                  }
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
