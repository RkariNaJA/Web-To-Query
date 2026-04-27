import { getVal } from '../utils';

function uniqVals(rows, key) {
  return [...new Set(rows.map(r => getVal(r, key)).filter(v => v && v !== '—'))].sort();
}

function buildCheckSummaryHtml(rows) {
  const totalExecs = uniqVals(rows, 'EXECUTIONID').length;
  const totalItems = new Set(rows.map(r => getVal(r, 'ITEMID'))).size;

  const allSizes   = uniqVals(rows, 'INVENTSIZEID');
  const allColors  = uniqVals(rows, 'INVENTCOLORID');
  const allSeasons = uniqVals(rows, 'INVENTSEASONID');
  const allPOs     = uniqVals(rows, 'PURCHID');

  const mkOpts = arr => arr.map(v => `<option value="${v}">${v}</option>`).join('');
  const selStyle = `background:#1a1e28;border:1px solid #3a4258;color:#e2e6f0;font-family:'IBM Plex Mono',monospace;font-size:11px;padding:5px 8px;border-radius:6px;cursor:pointer;min-width:120px;`;
  const lblStyle = `font-family:'IBM Plex Mono',monospace;font-size:10px;color:#6b7494;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:4px;`;

  const filterBar = `<div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;padding:16px 0 20px;">
    <div><div style="${lblStyle}">PO</div><input id="f-po" oninput="applyFilter()" placeholder="Type to filter..." style="${selStyle}min-width:160px;" autocomplete="off"/></div>
    <div><div style="${lblStyle}">Size</div><select id="f-size" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(allSizes)}</select></div>
    <div><div style="${lblStyle}">Color</div><select id="f-color" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(allColors)}</select></div>
    <div><div style="${lblStyle}">Season</div><select id="f-season" onchange="applyFilter()" style="${selStyle}"><option value="">All</option>${mkOpts(allSeasons)}</select></div>
    <button onclick="['f-po','f-size','f-color','f-season'].forEach(id=>document.getElementById(id).value='');applyFilter();" style="align-self:flex-end;padding:5px 12px;background:#13161d;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">✕ Clear</button>
    <span id="row-count" style="align-self:flex-end;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-left:auto;">${rows.length} rows</span>
  </div>`;

  const th = txt => `<th style="padding:10px 14px;text-align:left;font-size:10px;letter-spacing:0.07em;color:#6b7494;text-transform:uppercase;border-bottom:1px solid #252a38;white-space:nowrap;">${txt}</th>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>BotPO Check Summary</title>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
    <style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#0d0f14;color:#e2e6f0;font-family:'IBM Plex Sans',sans-serif;padding:32px;min-height:100vh;}body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(62,207,142,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(62,207,142,0.02) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}.wrap{position:relative;z-index:1;max-width:1200px;margin:0 auto;}tbody tr{border-bottom:1px solid #252a38;}tbody tr:hover td{background:rgba(255,255,255,0.02);}tbody td{padding:9px 14px;color:#e2e6f0;vertical-align:middle;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-thumb{background:#3a4258;border-radius:3px;}</style>
    </head><body><div class="wrap">
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:4px;padding-bottom:20px;border-bottom:1px solid #252a38;">
      <div style="width:32px;height:32px;background:#3ecf8e;border-radius:8px;display:grid;place-items:center;font-size:16px;flex-shrink:0;color:#0d0f14;">✓</div>
      <div><div style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:0.06em;">BOTPO CHECK SUMMARY</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#6b7494;margin-top:3px;">${totalExecs} Exec ID${totalExecs!==1?'s':''} · ${totalItems} unique item${totalItems!==1?'s':''}</div></div>
      <button onclick="window.print()" style="margin-left:auto;padding:8px 16px;background:#1a1e28;border:1px solid #3a4258;color:#6b7494;font-family:'IBM Plex Mono',monospace;font-size:11px;border-radius:6px;cursor:pointer;">⎙ Print</button>
    </div>
    ${filterBar}
    <div style="overflow-x:auto;border:1px solid #252a38;border-radius:8px;">
      <table style="width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:12px;">
        <thead><tr style="background:#1a1e28;">${[th('ITEM ID'),th('LINES'),th('LINE NO.'),th('PO'),th('SIZES'),th('COLORS'),th('SEASONS'),th('STATUS')].join('')}</tr></thead>
        <tbody id="check-tbody"></tbody>
      </table>
    </div></div>
    <script>
      const ALL_ROWS = ${JSON.stringify(rows)};
      function gv(r,key){const k=key.toLowerCase();for(let j in r)if(j.toLowerCase()===k)return r[j];return undefined;}
      function buildTable(rows){
        const execGroups={};
        rows.forEach(r=>{const exec=gv(r,'EXECUTIONID')||'(unknown)';if(!execGroups[exec])execGroups[exec]=[];execGroups[exec].push(r);});
        const html=Object.entries(execGroups).sort(([a],[b])=>a.localeCompare(b)).map(([exec,erows])=>{
          const poGroups={};erows.forEach(r=>{const p=gv(r,'PURCHID')||'(unknown)';if(!poGroups[p])poGroups[p]=[];poGroups[p].push(r);});
          const itemGroups={};erows.forEach(r=>{const it=gv(r,'ITEMID')||'(unknown)';if(!itemGroups[it])itemGroups[it]=[];itemGroups[it].push(r);});
          const dupCount=Object.values(itemGroups).filter(a=>a.length>1).length;
          const groupRow=\`<tr><td colspan="8" style="padding:10px 14px;background:#13161d;border-top:2px solid #3a4258;border-bottom:1px solid #252a38;">
            <span style="font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;color:#3ecf8e;">\${exec}</span>
            <span style="margin-left:10px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(62,207,142,0.1);color:#3ecf8e;border:1px solid rgba(62,207,142,0.3);">\${erows.length} LINE\${erows.length!==1?'S':''}</span>
            <span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(79,156,249,0.1);color:#4f9cf9;border:1px solid rgba(79,156,249,0.25);">\${Object.keys(poGroups).length} PO\${Object.keys(poGroups).length!==1?'s':''}</span>
            \${dupCount>0?\`<span style="margin-left:6px;font-size:10px;padding:2px 7px;border-radius:3px;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);">\${dupCount} DUPLICATE\${dupCount!==1?'S':''}</span>\`:''}
          </td></tr>\`;
          const itemRows=Object.entries(itemGroups).flatMap(([item,irows])=>{
            const isDup=irows.length>1;
            const badge=isDup?\`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.35);white-space:nowrap;">⧉ DUPLICATE ×\${irows.length}</span>\`:\`<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;background:rgba(239,68,68,0.12);color:#f87171;border:1px solid rgba(239,68,68,0.35);white-space:nowrap;">✕ ERROR</span>\`;
            const rowBg=isDup?'background:rgba(251,146,60,0.04);':'background:rgba(239,68,68,0.03);';
            const itemColor=isDup?'#9ca3af':'#4f9cf9';
            return irows.map((r,i)=>\`<tr style="\${rowBg}">
              <td style="color:\${itemColor};font-weight:600;padding-left:28px;">\${i===0?item:''}</td>
              <td style="color:#f0c060;text-align:center;">\${i===0?irows.length:''}</td>
              <td style="color:#6b7494;font-size:11px;">\${gv(r,'LINENUMBER')??'—'}</td>
              <td style="color:#4f9cf9;font-size:11px;">\${gv(r,'PURCHID')??'—'}</td>
              <td style="color:#f0c060;">\${gv(r,'INVENTSIZEID')??'—'}</td>
              <td style="color:#a78bfa;">\${gv(r,'INVENTCOLORID')??'—'}</td>
              <td style="color:#3ecf8e;font-size:11px;">\${gv(r,'INVENTSEASONID')??'—'}</td>
              <td>\${badge}</td>
            </tr>\`);
          }).join('');
          return groupRow+itemRows;
        }).join('');
        document.getElementById('check-tbody').innerHTML=html||'<tr><td colspan="8" style="padding:20px;text-align:center;color:#6b7494;">No results match the current filters.</td></tr>';
        document.getElementById('row-count').textContent=rows.length+' rows';
      }
      function applyFilter(){
        const fPO=document.getElementById('f-po').value.trim().toLowerCase();
        const fSize=document.getElementById('f-size').value;
        const fColor=document.getElementById('f-color').value;
        const fSeason=document.getElementById('f-season').value;
        buildTable(ALL_ROWS.filter(r=>(!fPO||(gv(r,'PURCHID')||'').toLowerCase().includes(fPO))&&(!fSize||gv(r,'INVENTSIZEID')===fSize)&&(!fColor||gv(r,'INVENTCOLORID')===fColor)&&(!fSeason||gv(r,'INVENTSEASONID')===fSeason)));
      }
      buildTable(ALL_ROWS);
    <\/script></body></html>`;
}

const COLS = ['EXEC ID','SITE','LINE','PO','ITEM ID','SIZE','COLOR','SEASON'];
const KEYS = ['EXECUTIONID','INVENTSITEID','LINENUMBER','PURCHID','ITEMID','INVENTSIZEID','INVENTCOLORID','INVENTSEASONID'];

export default function BotPOCheckTab({ rows, po }) {
  const execIds = [...new Set(rows.map(r => getVal(r,'EXECUTIONID')).filter(v => v && v !== '—'))].join(', ') || '—';
  const sites   = [...new Set(rows.map(r => getVal(r,'INVENTSITEID')).filter(v => v && v !== '—'))].join(', ') || '—';

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <div className="summary-row" style={{ flex:1, flexWrap:'wrap', alignItems:'stretch' }}>
          <div className="summary-card" style={{ flex:'none', minWidth:110 }}><div className="summary-label">Total Lines</div><div className="summary-value red">{rows.length}</div></div>
          <div className="summary-card" style={{ flex:2, minWidth:160 }}><div className="summary-label">Exec ID</div><div className="summary-value small" style={{ color:'var(--green)', wordBreak:'break-word', whiteSpace:'normal' }}>{execIds}</div></div>
          <div className="summary-card" style={{ flex:'none', minWidth:110 }}><div className="summary-label">Sites</div><div className="summary-value small" style={{ color:'var(--teal)', wordBreak:'break-word', whiteSpace:'normal' }}>{sites}</div></div>
        </div>
        <button onClick={() => { const win = window.open('','_blank'); win.document.write(buildCheckSummaryHtml(rows)); win.document.close(); }} style={{ flexShrink:0, padding:'9px 18px', background:'var(--red)', color:'#0d0f14', border:'none', borderRadius:8, fontFamily:'var(--mono)', fontSize:12, fontWeight:600, cursor:'pointer', letterSpacing:'0.05em' }}>≡ Error Summarize</button>
      </div>
      <div className="results-meta">
        <span className="results-count">Showing <strong>{rows.length}</strong> row{rows.length!==1?'s':''} for PO <strong>{po}</strong></span>
        <span className="tag tag-check">BOTPO CHECKING</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{COLS.map(c=><th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r,i) => (
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
