import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getVal, fmt } from '../utils';

export default function ComparePOTab({ stagingRows, axRows, po }) {
  const [fColor,   setFColor]   = useState('');
  const [fSize,    setFSize]    = useState('');
  const [fSeason,  setFSeason]  = useState('');
  const [fAxPrice, setFAxPrice] = useState('');
  const [fStatus,  setFStatus]  = useState('');

  const sLine  = r => parseFloat(getVal(r,'LINENUMBER')) || 0;
  const sQty   = r => parseFloat(getVal(r,'PURCHQTY'))   || 0;
  const sAmt   = r => parseFloat(getVal(r,'LINEAMOUNT')) || 0;
  const sPrice = r => parseFloat(getVal(r,'PURCHPRICE')) || 0;
  const sItem  = r => getVal(r,'ITEMID') ?? '—';
  const sSize  = r => getVal(r,'INVENTSIZEID')  ?? '—';
  const sColor = r => getVal(r,'INVENTCOLORID') ?? '—';
  const sSeason= r => getVal(r,'INVENTSTYLEID') ?? '—';
  const sXfer  = r => parseInt(getVal(r,'TRANSFERSTATUS'));

  const aLine  = r => parseFloat(getVal(r,'LINENUMBER')) || 0;
  const aQty   = r => parseFloat(getVal(r,'QTY') ?? getVal(r,'PURCHQTY')) || 0;
  const aAmt   = r => parseFloat(getVal(r,'Net amount') ?? getVal(r,'LINEAMOUNT')) || 0;
  const aPrice = r => parseFloat(getVal(r,'Unit Price') ?? getVal(r,'PURCHPRICE')) || 0;
  const aItem  = r => getVal(r,'ITEMID') ?? '—';
  const aSize  = r => getVal(r,'Size') ?? getVal(r,'IVZ_SIZE_CT') ?? '—';
  const aColor = r => getVal(r,'Color') ?? getVal(r,'IVZ_COLOR_CT') ?? '—';
  const aSeason= r => getVal(r,'Season') ?? getVal(r,'IVZ_SEASON_CT') ?? getVal(r,'INVENTSTYLEID') ?? '—';

  const stagingMap = useMemo(() => {
    const m = {};
    stagingRows.forEach(r => { m[sLine(r)] = r; });
    return m;
  }, [stagingRows]);

  const axMap = useMemo(() => {
    const m = {};
    axRows.forEach(r => { m[aLine(r)] = r; });
    return m;
  }, [axRows]);

  const allLinesBase = useMemo(() =>
    [...new Set([...stagingRows.map(r => sLine(r)), ...axRows.map(r => aLine(r))])].sort((a,b) => a-b),
    [stagingRows, axRows]
  );

  // Totals (always from all rows)
  const stagingTotalQty = stagingRows.reduce((s,r) => s+sQty(r), 0);
  const stagingTotalAmt = stagingRows.reduce((s,r) => s+sAmt(r), 0);
  const axTotalQty      = axRows.reduce((s,r) => s+aQty(r), 0);
  const axTotalAmt      = axRows.reduce((s,r) => s+aAmt(r), 0);
  const diffQty = axTotalQty - stagingTotalQty;
  const diffAmt = axTotalAmt - stagingTotalAmt;
  const qtyMatch  = Math.abs(diffQty) < 0.01;
  const amtMatch  = Math.abs(diffAmt) < 0.01;
  const lineMatch = stagingRows.length === axRows.length;

  let mismatchLines = 0, onlyStaging = 0, onlyAx = 0;
  allLinesBase.forEach(ln => {
    const s = stagingMap[ln], a = axMap[ln];
    if (!s) onlyAx++;
    else if (!a) onlyStaging++;
    else {
      const qd = Math.abs(aQty(a) - sQty(s));
      const pd = Math.abs(aPrice(a) - sPrice(s));
      if (qd > 0.01 || pd > 0.0001) mismatchLines++;
    }
  });
  const totalIssues = mismatchLines + onlyStaging + onlyAx;
  const allMatch = qtyMatch && amtMatch && lineMatch;

  // Filter options
  const colorOpts  = useMemo(() => [...new Set([...stagingRows.map(r => sColor(r)), ...axRows.map(r => aColor(r))].filter(v => v && v !== '—'))].sort(), [stagingRows, axRows]);
  const sizeOpts   = useMemo(() => [...new Set([...stagingRows.map(r => sSize(r)),  ...axRows.map(r => aSize(r))].filter(v => v && v !== '—'))].sort(), [stagingRows, axRows]);
  const seasonOpts = useMemo(() => [...new Set([...stagingRows.map(r => sSeason(r)),...axRows.map(r => aSeason(r))].filter(v => v && v !== '—'))].sort(), [stagingRows, axRows]);
  const axPriceOpts= useMemo(() => [...new Set(axRows.map(r => aPrice(r).toFixed(5)).filter(v => parseFloat(v) !== 0))].sort((a,b) => parseFloat(a)-parseFloat(b)), [axRows]);

  const filteredLines = useMemo(() => {
    return allLinesBase.filter(ln => {
      const s = stagingMap[ln], a = axMap[ln];
      const color  = s ? sColor(s)  : (a ? aColor(a)  : '—');
      const size   = s ? sSize(s)   : (a ? aSize(a)   : '—');
      const season = a ? aSeason(a) : (s ? sSeason(s) : '—');
      if (fColor  && color  !== fColor)  return false;
      if (fSize   && size   !== fSize)   return false;
      if (fSeason && season !== fSeason) return false;
      if (fAxPrice) {
        const ap = a ? aPrice(a).toFixed(5) : null;
        if (!ap || ap !== fAxPrice) return false;
      }
      if (fStatus) {
        let st;
        if (!s)        st = 'AX Only';
        else if (!a)   st = 'Staging Only';
        else {
          const qd = Math.abs(aQty(a) - sQty(s));
          const pd = Math.abs(aPrice(a) - sPrice(s));
          st = (qd > 0.01 || pd > 0.0001) ? 'Mismatch' : 'Match';
        }
        if (st !== fStatus) return false;
      }
      return true;
    });
  }, [allLinesBase, stagingMap, axMap, fColor, fSize, fSeason, fAxPrice, fStatus]);

  function clearFilters() {
    setFColor(''); setFSize(''); setFSeason(''); setFAxPrice(''); setFStatus('');
  }

  function exportExcel() {
    const header = ['LINE','ITEM ID','SIZE','COLOR','STG QTY','AX QTY','Δ QTY','STG PRICE','AX PRICE','Δ PRICE','TRANSFER','STATUS'];
    const data = [header, ...filteredLines.map(ln => {
      const s = stagingMap[ln], a = axMap[ln];
      const stgQty   = s ? sQty(s)   : '';
      const axQtyV   = a ? aQty(a)   : '';
      const stgPrice = s ? sPrice(s) : '';
      const axPriceV = a ? aPrice(a) : '';
      const dQ = (s && a) ? (aQty(a) - sQty(s))     : '';
      const dP = (s && a) ? (aPrice(a) - sPrice(s))  : '';
      const tv = s ? sXfer(s) : '';
      const tLabel = { 1:'Completed', 2:'ERROR', 0:'Pending' };
      let st = '';
      if (!s) st = 'AX Only';
      else if (!a) st = 'Staging Only';
      else st = (Math.abs(dQ) > 0.01 || Math.abs(dP) > 0.0001) ? 'Mismatch' : 'Match';
      return [ln, s ? sItem(s) : (a ? aItem(a) : ''), s ? sSize(s) : (a ? aSize(a) : ''), s ? sColor(s) : (a ? aColor(a) : ''), stgQty, axQtyV, dQ, stgPrice, axPriceV, dP, tLabel[tv] ?? '', st];
    })];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compare PO');
    XLSX.writeFile(wb, `PO_Compare_${po}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function TdNum({ v, dec = 0, mismatch = false }) {
    if (v === null) return <td className="diff-missing">—</td>;
    return <td className={`num${mismatch ? ' td-mismatch' : ''}`}>{fmt(v, dec)}</td>;
  }
  function TdDiff({ d, ok, dec }) {
    if (d === null) return <td className="diff-missing">—</td>;
    if (Math.abs(d) < 0.0001) return <td className="diff-zero">0</td>;
    const decimals = dec ?? (d % 1 === 0 ? 0 : 5);
    return <td className={ok ? 'diff-ok' : 'diff-bad'}>{d > 0 ? '+' : ''}{fmt(d, decimals)}</td>;
  }

  const COLS = ['LINE','ITEM ID','SIZE','COLOR','STG QTY','AX QTY','Δ QTY','STG PRICE','AX PRICE','Δ PRICE','TRANSFER','STATUS'];

  return (
    <>
      <div className="summary-row">
        <div className={`summary-card ${lineMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Lines Staging / AX</div>
          <div className={`summary-value ${lineMatch ? 'green' : 'red'}`}>{stagingRows.length} / {axRows.length}</div>
          <div className="summary-sub">{lineMatch ? '✓ Match' : '✗ Mismatch'}</div>
        </div>
        <div className={`summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Total QTY Staging</div>
          <div className="summary-value blue">{fmt(stagingTotalQty,0)}</div>
          <div className="summary-sub" style={{ color:'var(--purple)' }}>AX: {fmt(axTotalQty,0)}</div>
        </div>
        <div className={`summary-card ${qtyMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">QTY Diff (AX − Staging)</div>
          <div className={`summary-value ${qtyMatch ? 'teal' : 'red'}`}>{diffQty >= 0 ? '+' : ''}{fmt(diffQty,0)}</div>
          <div className="summary-sub">{qtyMatch ? '✓ Match' : '✗ Mismatch'}</div>
        </div>
        <div className={`summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Total Amount Staging</div>
          <div className="summary-value blue">{fmt(stagingTotalAmt,2)}</div>
          <div className="summary-sub" style={{ color:'var(--purple)' }}>AX: {fmt(axTotalAmt,2)}</div>
        </div>
        <div className={`summary-card ${amtMatch ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Amount Diff (AX − Staging)</div>
          <div className={`summary-value ${amtMatch ? 'teal' : 'red'}`}>{diffAmt >= 0 ? '+' : ''}{fmt(diffAmt,2)}</div>
          <div className="summary-sub">{amtMatch ? '✓ Match' : '✗ Mismatch'}</div>
        </div>
        <div className={`summary-card ${totalIssues === 0 ? 'highlight-match' : 'highlight-mismatch'}`}>
          <div className="summary-label">Line Issues</div>
          <div className={`summary-value ${totalIssues === 0 ? 'green' : 'red'}`}>{totalIssues}</div>
          <div className="summary-sub">{mismatchLines} qty/price · {onlyStaging} stg-only · {onlyAx} ax-only</div>
        </div>
      </div>

      <div className="results-meta">
        <span className="results-count">
          Comparing PO <strong>{po}</strong> —{' '}
          <span style={{ color:'var(--accent)' }}>{stagingRows.length} Staging</span> vs{' '}
          <span style={{ color:'var(--purple)' }}>{axRows.length} AX Lines</span>
        </span>
        <span className="tag tag-compare">COMPARE PO</span>
        {allMatch
          ? <span className="tag tag-ok">✓ FULL MATCH</span>
          : <span className="tag tag-list">✗ {totalIssues} ISSUE{totalIssues !== 1 ? 'S' : ''}</span>
        }
        <button className="export-btn" style={{ marginLeft:'auto' }} onClick={exportExcel}>⬇ Export Excel</button>
      </div>

      <div className="filters-row">
        <div className="filter-group">
          <div className="filter-label">Color</div>
          <select className="filter-select" value={fColor} onChange={e => setFColor(e.target.value)}>
            <option value="">All</option>
            {colorOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Size</div>
          <select className="filter-select" value={fSize} onChange={e => setFSize(e.target.value)}>
            <option value="">All</option>
            {sizeOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Season</div>
          <select className="filter-select" value={fSeason} onChange={e => setFSeason(e.target.value)}>
            <option value="">All</option>
            {seasonOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">AX Price</div>
          <select className="filter-select" value={fAxPrice} onChange={e => setFAxPrice(e.target.value)}>
            <option value="">All</option>
            {axPriceOpts.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <div className="filter-label">Status</div>
          <select className="filter-select" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">All</option>
            {['Match','Mismatch','AX Only','Staging Only'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button className="filter-clear" onClick={clearFilters}>✕ Clear</button>
        <span className="filter-count">{filteredLines.length} lines</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th colSpan={4} className="th-group-base" style={{ borderRight:'1px solid var(--border-accent)' }}>LINE INFO</th>
              <th colSpan={3} className="th-group-staging" style={{ borderRight:'1px solid rgba(79,156,249,0.2)' }}>QTY</th>
              <th colSpan={3} className="th-group-ax" style={{ borderRight:'1px solid rgba(167,139,250,0.2)' }}>PRICE</th>
              <th colSpan={2} className="th-group-diff">STATUS</th>
            </tr>
            <tr>{COLS.map(c => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {filteredLines.map(ln => {
              const s = stagingMap[ln];
              const a = axMap[ln];

              let rowClass = 'row-match';
              if (!s) rowClass = 'row-only-ax';
              else if (!a) rowClass = 'row-only-staging';
              else {
                const qd = Math.abs(aQty(a) - sQty(s));
                const pd = Math.abs(aPrice(a) - sPrice(s));
                if (qd > 0.01 || pd > 0.0001) rowClass = 'row-mismatch';
              }

              const itemId   = s ? sItem(s)  : (a ? aItem(a)  : '—');
              const size     = s ? sSize(s)  : (a ? aSize(a)  : '—');
              const color    = s ? sColor(s) : (a ? aColor(a) : '—');
              const stgQty   = s ? sQty(s)   : null;
              const axQtyV   = a ? aQty(a)   : null;
              const stgPrice = s ? sPrice(s) : null;
              const axPriceV = a ? aPrice(a) : null;
              const dQty   = (stgQty   !== null && axQtyV   !== null) ? (axQtyV   - stgQty)   : null;
              const dPrice = (stgPrice !== null && axPriceV !== null) ? (axPriceV - stgPrice)  : null;
              const qtyOk   = dQty   !== null && Math.abs(dQty)   < 0.01;
              const priceOk = dPrice !== null && Math.abs(dPrice) < 0.0001;
              const tv = s ? sXfer(s) : -1;
              const tLabels = {1:'Completed',2:'ERROR',0:'Pending'};
              const tCls    = {1:'transfer-ok',2:'transfer-error',0:'transfer-pending'};

              let statusCell;
              if (!s)             statusCell = <td><span className="match-badge match-ax">AX Only</span></td>;
              else if (!a)        statusCell = <td><span className="match-badge match-staging">Staging Only</span></td>;
              else if (!qtyOk || !priceOk) statusCell = <td><span className="match-badge match-bad">✗ Mismatch</span></td>;
              else                statusCell = <td><span className="match-badge match-ok">✓ Match</span></td>;

              return (
                <tr key={ln} className={rowClass}>
                  <td className="num">{ln}</td>
                  <td>{itemId !== '—' ? itemId : <span className="td-dim">—</span>}</td>
                  <td>{size   !== '—' ? size   : <span className="td-dim">—</span>}</td>
                  <td>{color  !== '—' ? color  : <span className="td-dim">—</span>}</td>
                  <TdNum v={stgQty}   dec={0} mismatch={!qtyOk   && stgQty   !== null && axQtyV   !== null} />
                  <TdNum v={axQtyV}   dec={0} mismatch={!qtyOk   && stgQty   !== null && axQtyV   !== null} />
                  <TdDiff d={dQty}   ok={qtyOk} />
                  <TdNum v={stgPrice} dec={5} mismatch={!priceOk && stgPrice !== null && axPriceV !== null} />
                  <TdNum v={axPriceV} dec={5} mismatch={!priceOk && stgPrice !== null && axPriceV !== null} />
                  <TdDiff d={dPrice} ok={priceOk} />
                  {s
                    ? <td><span className={`transfer-badge ${tCls[tv] ?? 'transfer-pending'}`}>● {tLabels[tv] ?? '?'}</span></td>
                    : <td className="td-dim">—</td>
                  }
                  {statusCell}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
