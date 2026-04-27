import * as XLSX from 'xlsx';

const HEADER_COLS = ['CREATED','EXPORTED','STATUS','VENDOR AX','COMPANY','PURCHID','ORDER ACCT','INVOICE ACCT','CURRENCY'];
const HEADER_KEYS = ['CREATEDATETIME','EXPORTDATETIME','STATUS','VENDORAXACCOUNT','COMPANY','PURCHID','ORDERACCOUNT','INVOICEACCOUNT','CURRENCYCODE'];

const LINE_COLS = ['LINE','CREATED','EXPORTED','STATUS','QTY','PRICE','AMOUNT','JOB NO','INVENT STATUS','SEASON','COLOR ID','COLOR NAME','SIZE FABRIC','SIZE ID','COMPANY','SITE','LOCATION'];
const LINE_KEYS = ['LINENUMBER','CREATEDATETIME','EXPORTDATETIME','STATUS','PURCHQTY','PURCHPRICE','LINEAMOUNT','JOBNUMBER','INVENTSTATUS','SEASON','COLORID','COLORNAME','SIZEIDFABRIC','SIZEID','COMPANY','SITEID','LOCATIONID'];

export default function SearchDBCTab({ dbcHeader, dbcLines, po }) {
  const header = dbcHeader ?? [];
  const lines  = dbcLines  ?? [];

  const totalQty = lines.reduce((s, r) => s + (parseFloat(r.PURCHQTY   || 0) || 0), 0);
  const totalAmt = lines.reduce((s, r) => s + (parseFloat(r.LINEAMOUNT  || 0) || 0), 0);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    if (header.length) {
      const ws = XLSX.utils.aoa_to_sheet([HEADER_COLS, ...header.map(r => HEADER_KEYS.map(k => r[k] ?? ''))]);
      XLSX.utils.book_append_sheet(wb, ws, 'Header');
    }
    if (lines.length) {
      const ws = XLSX.utils.aoa_to_sheet([LINE_COLS, ...lines.map(r => LINE_KEYS.map(k => r[k] ?? ''))]);
      XLSX.utils.book_append_sheet(wb, ws, 'Lines');
    }
    XLSX.writeFile(wb, `PO_SearchDBC_${po}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return (
    <>
      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-label">Header Rows</div>
          <div className="summary-value" style={{ color:'#38bdf8' }}>{header.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Line Rows</div>
          <div className="summary-value blue">{lines.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Qty</div>
          <div className="summary-value">{parseFloat(totalQty).toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Amount</div>
          <div className="summary-value">{parseFloat(totalAmt).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
      </div>

      <div className="results-meta">
        <span className="results-count">
          PO <strong>{po}</strong> —{' '}
          <span style={{ color:'#38bdf8' }}>{header.length} Header</span> ·{' '}
          <span style={{ color:'var(--accent)' }}>{lines.length} Lines</span>
        </span>
        <span className="tag tag-searchdbc">SEARCH PO DBC</span>
        <button className="export-btn" style={{ marginLeft:'auto' }} onClick={exportExcel}>⬇ Export Excel</button>
      </div>

      <div className="dbc-section-label" style={{ color:'#38bdf8' }}>── Header</div>
      <div className="table-wrap" style={{ maxHeight:200, flex:'none' }}>
        <table>
          <thead><tr>{HEADER_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {header.map((r, i) => (
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

      <div className="dbc-section-label" style={{ color:'var(--accent)' }}>── Lines</div>
      <div className="table-wrap">
        <table>
          <thead><tr>{LINE_COLS.map(c => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {lines.map((r, i) => (
              <tr key={i}>
                {LINE_KEYS.map(k => {
                  let v = r[k] != null && r[k] !== '' ? r[k] : '—';
                  if (v !== '—') {
                    if (k === 'PURCHQTY')   v = parseFloat(v).toFixed(0);
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
