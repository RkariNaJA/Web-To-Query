import { getVal, getPopupThemeVars } from '../utils';

function uniqFrom(arr, key) {
  return [...new Set(arr.map(r => getVal(r, key)).filter(v => v && v !== '—'))].join(', ') || '—';
}

function buildFullErrorHtml(rows) {
  const t = getPopupThemeVars();
  const rootVars = `:root{--bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--border:${t.border};--border-accent:${t.borderAccent};--text:${t.text};--text-muted:${t.textMuted};--accent:${t.accent};}`;

  const poGroups = {};
  rows.forEach(r => {
    const poid = getVal(r,'PURCHID') || '(unknown)';
    if (!poGroups[poid]) poGroups[poid] = [];
    poGroups[poid].push(r);
  });

  const sections = Object.entries(poGroups).map(([poid, prows]) => {
    const itemCount = {};
    prows.forEach(r => { const item = getVal(r,'ITEMID') || ''; if (item) itemCount[item] = (itemCount[item] || 0) + 1; });
    const tableRows = prows.map(r => {
      const line  = getVal(r,'LINENUMBER') ?? '—';
      const item  = getVal(r,'ITEMID') ?? '—';
      const size  = getVal(r,'INVENTSIZEID') ?? '—';
      const color = getVal(r,'INVENTCOLORID') ?? '—';
      const season= getVal(r,'INVENTSEASONID') ?? '—';
      const qty   = getVal(r,'PURCHQTY') ?? '—';
      const price = getVal(r,'PURCHPRICE') ?? '—';
      const isDup = item !== '—' && itemCount[item] > 1;
      const statusBadge = isDup
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">⧉ DUPLICATE</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">✕ ERROR</span>`;
      return `<tr style="${isDup?'background:rgba(251,146,60,0.05);':''}">
        <td style="color:#f0c060;">${line}</td>
        <td style="color:${isDup?'#fb923c':'var(--text)'};font-weight:${isDup?600:400};">${item}</td>
        <td>${size}</td><td style="color:#a78bfa;">${color}</td><td style="color:#2dd4bf;">${season}</td>
        <td style="color:#f0c060;">${qty !== '—' ? parseFloat(qty).toFixed(0) : '—'}</td>
        <td>${price !== '—' ? parseFloat(price).toFixed(5) : '—'}</td>
        <td>${statusBadge}</td></tr>`;
    }).join('');
    const dupCount = prows.filter(r => { const i = getVal(r,'ITEMID')||''; return i && itemCount[i] > 1; }).length;
    return `<div style="margin-bottom:32px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:var(--accent);">${poid}</span>
        <span style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">${prows.length} ERROR LINE${prows.length!==1?'S':''}</span>
        ${dupCount>0?`<span style="font-family:'IBM Plex Mono',monospace;font-size:10px;padding:3px 8px;border-radius:4px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">${dupCount} DUPLICATE${dupCount!==1?'S':''}</span>`:''}
        <div style="flex:1;height:1px;background:var(--border);"></div>
      </div>
      <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;">
        <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
          <thead><tr style="background:var(--surface2);">${['LINE','ITEM ID','SIZE','COLOR','SEASON','QTY','PRICE','STATUS'].map(h=>`<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap;">${h}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div></div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Full Error Report</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>${rootVars}*{box-sizing:border-box;margin:0;padding:0;}body{background:var(--bg);color:var(--text);font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(79,156,249,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,156,249,0.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}.wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;}tbody tr{border-bottom:1px solid var(--border);}tbody tr:last-child{border-bottom:none;}tbody tr:hover{background:var(--surface2) !important;}tbody td{padding:9px 14px;color:var(--text);white-space:nowrap;vertical-align:middle;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:var(--border-accent);border-radius:3px;}</style>
    </head><body><div class="wrap">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border);">
      <div style="width:32px;height:32px;background:var(--accent);border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;">⬡</div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">FULL ERROR REPORT</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:3px;">${rows.length} error lines across ${Object.keys(poGroups).length} PO${Object.keys(poGroups).length!==1?'s':''}</div></div>
      <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:var(--surface2);border:1px solid var(--border-accent);color:var(--text-muted);font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
    </div>${sections}</div></body></html>`;
}

function buildErrorSummaryHtml(rows) {
  const t = getPopupThemeVars();
  const rootVars = `:root{--bg:${t.bg};--surface:${t.surface};--surface2:${t.surface2};--border:${t.border};--border-accent:${t.borderAccent};--text:${t.text};--text-muted:${t.textMuted};--accent:${t.accent};}`;

  const uniqFrom2 = (arr, key) => [...new Set(arr.map(r => getVal(r,key)).filter(v=>v&&v!=='—'))].join(', ')||'—';
  const poGroups = {};
  rows.forEach(r => { const p = getVal(r,'PURCHID')||'(unknown)'; if(!poGroups[p]) poGroups[p]=[]; poGroups[p].push(r); });
  const totalPOs   = Object.keys(poGroups).length;
  const totalItems = Object.values(poGroups).reduce((s,pr)=>s+new Set(pr.map(r=>getVal(r,'ITEMID'))).size,0);

  const tbodyRows = Object.entries(poGroups).sort(([,a],[,b])=>{
    const ea=[...new Set(a.map(r=>getVal(r,'EXECUTIONID')).filter(Boolean))].join(', ');
    const eb=[...new Set(b.map(r=>getVal(r,'EXECUTIONID')).filter(Boolean))].join(', ');
    return ea.localeCompare(eb);
  }).map(([poid,prows])=>{
    const itemGroups = {};
    prows.forEach(r=>{const it=getVal(r,'ITEMID')||'(unknown)';if(!itemGroups[it]) itemGroups[it]=[];itemGroups[it].push(r);});
    const dupItems = Object.values(itemGroups).filter(a=>a.length>1).length;
    const execId = [...new Set(prows.map(r=>getVal(r,'EXECUTIONID')).filter(v=>v&&v!=='—'))].join(', ')||'—';
    const groupRow = `<tr><td colspan="7" style="padding:10px 14px;background:var(--surface);border-top:2px solid var(--border-accent);border-bottom:1px solid var(--border);">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:var(--accent);">${poid}</span>
      <span style="margin-left:8px;font-size:11px;color:var(--text-muted);">· ${execId}</span>
      <span style="margin-left:10px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);">${prows.length} ERROR LINE${prows.length!==1?'S':''}</span>
      <span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(79,156,249,0.1);color:var(--accent);border:1px solid rgba(79,156,249,0.25);">${Object.keys(itemGroups).length} ITEM${Object.keys(itemGroups).length!==1?'S':''}</span>
      ${dupItems>0?`<span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">${dupItems} DUPLICATE${dupItems!==1?'S':''}</span>`:''}
    </td></tr>`;
    const itemRows = Object.entries(itemGroups).map(([item,irows])=>{
      const isDup = irows.length > 1;
      const statusBadge = isDup
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);white-space:nowrap;">⧉ DUPLICATE ×${irows.length}</span>`
        : `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(255,102,102,0.12);color:#f66;border:1px solid rgba(255,102,102,0.3);white-space:nowrap;">✕ ERROR</span>`;
      return `<tr style="${isDup?'background:rgba(251,146,60,0.04);':''}">
        <td style="color:var(--accent);font-weight:600;padding-left:28px;">${item}</td>
        <td style="color:#f0c060;text-align:center;">${irows.length}</td>
        <td style="color:var(--text-muted);font-size:11px;">${irows.map(r=>getVal(r,'LINENUMBER')??'—').join(', ')}</td>
        <td style="color:#f0c060;">${uniqFrom2(irows,'INVENTSIZEID')}</td>
        <td style="color:#a78bfa;">${uniqFrom2(irows,'INVENTCOLORID')}</td>
        <td style="color:#2dd4bf;">${uniqFrom2(irows,'INVENTSEASONID')}</td>
        <td>${statusBadge}</td></tr>`;
    }).join('');
    return groupRow + itemRows;
  }).join('');

  const th = txt=>`<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:var(--text-muted);text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap;">${txt}</th>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>Error Summary</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>${rootVars}*{box-sizing:border-box;margin:0;padding:0;}body{background:var(--bg);color:var(--text);font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(79,156,249,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,156,249,0.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}.wrap{position:relative;z-index:1;max-width:1100px;margin:0 auto;}tbody tr{border-bottom:1px solid var(--border);}tbody tr:hover td{background:rgba(255,255,255,0.02);}tbody td{padding:9px 14px;color:var(--text);vertical-align:middle;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-thumb{background:var(--border-accent);border-radius:3px;}</style>
    </head><body><div class="wrap">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border);">
      <div style="width:32px;height:32px;background:#fb923c;border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;">≡</div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">ERROR SUMMARY</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:3px;">${totalPOs} PO${totalPOs!==1?'s':''} · ${totalItems} unique item${totalItems!==1?'s':''} with errors</div></div>
      <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:var(--surface2);border:1px solid var(--border-accent);color:var(--text-muted);font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
    </div>
    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
        <thead><tr style="background:var(--surface2);">${[th('ITEM ID'),th('ERROR LINES'),th('LINE NO.'),th('SIZES'),th('COLORS'),th('SEASONS'),th('STATUS')].join('')}</tr></thead>
        <tbody>${tbodyRows}</tbody>
      </table>
    </div></div></body></html>`;
}

function openWindow(html) {
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
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
            <button onClick={() => openWindow(buildFullErrorHtml(rows))} style={{ padding:'9px 18px', background:'var(--red)', color:'#fff', border:'none', borderRadius:8, fontFamily:'var(--mono)', fontSize:12, fontWeight:600, cursor:'pointer', letterSpacing:'0.05em' }}>⚠ Show Full Error</button>
            <button onClick={() => openWindow(buildErrorSummaryHtml(rows))} style={{ padding:'9px 18px', background:'var(--orange)', color:'#fff', border:'none', borderRadius:8, fontFamily:'var(--mono)', fontSize:12, fontWeight:600, cursor:'pointer', letterSpacing:'0.05em' }}>≡ Error Summarize</button>
          </div>
        </div>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{rows.length}</strong> row{rows.length!==1?'s':''} for PO <strong>{po}</strong></span>
        <span className="tag tag-list">ERROR PO</span>
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
