import { getVal } from '../utils';

const COLS = ['LINE','ITEM ID','QUANTITY','RECEIVED','Deliver_Remainder','ORDERED','Invent_Unit_QTY','Compare_O_I','Compare_Q_R'];
const KEYS = ['LINENUMBER','ITEMID','Quantity','Received','Deliver_Remainder','Ordered','Invent_Unit_QTY','Compare_O_I','Compare_Q_R'];
const QTY_KEYS = ['Quantity','Received','Deliver_Remainder','Ordered','Invent_Unit_QTY'];

function CompareBadge({ val }) {
  const isTrue = String(val).toLowerCase() === 'true';
  return <span className={isTrue ? 'posted-yes' : 'posted-no'}>{isTrue ? '✓ True' : '✗ False'}</span>;
}

export default function QtyPackRollTab({ rows, po }) {
  const totalQty      = rows.reduce((s, r) => s + (parseFloat(getVal(r,'Quantity') || 0) || 0), 0);
  const totalReceived = rows.reduce((s, r) => s + (parseFloat(getVal(r,'Received') || 0) || 0), 0);
  const totalRemainder= rows.reduce((s, r) => s + (parseFloat(getVal(r,'Deliver_Remainder') || 0) || 0), 0);

  return (
    <>
      <div className="summary-row">
        <div className="summary-card"><div className="summary-label">Total Lines</div><div className="summary-value teal">{rows.length}</div></div>
        <div className="summary-card"><div className="summary-label">Total Quantity</div><div className="summary-value blue">{parseFloat(totalQty).toLocaleString()}</div></div>
        <div className="summary-card"><div className="summary-label">Total Received</div><div className="summary-value green">{parseFloat(totalReceived).toLocaleString()}</div></div>
        <div className="summary-card"><div className="summary-label">Deliver Remainder</div><div className={`summary-value ${totalRemainder > 0 ? 'orange' : 'green'}`}>{parseFloat(totalRemainder).toLocaleString()}</div></div>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{rows.length}</strong> row{rows.length !== 1 ? 's' : ''} for PO <strong>{po}</strong></span>
        <span className="tag tag-packroll">QTY PACK/ROLL</span>
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
                  if (val !== '—' && QTY_KEYS.includes(k)) {
                    val = parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                  }
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
