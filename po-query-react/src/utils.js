export function getPopupThemeVars() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  if (theme === 'light') return { bg:'#f0f2f8', surface:'#ffffff', surface2:'#e8ecf4', border:'#d0d6e8', borderAccent:'#b8c2d8', text:'#1a2038', textMuted:'#5a6478', textDim:'#9aa0b0', accent:'#4f9cf9' };
  if (theme === 'space') return { bg:'#07051a', surface:'#0e0c28', surface2:'#151232', border:'#2a2660', borderAccent:'#3d3880', text:'#e0d8ff', textMuted:'#6b63a0', textDim:'#3d3866', accent:'#c77dff' };
  return { bg:'#0d0f14', surface:'#13161d', surface2:'#1a1e28', border:'#252a38', borderAccent:'#3a4258', text:'#e2e6f0', textMuted:'#6b7494', textDim:'#3d4560', accent:'#4f9cf9' };
}

export function getVal(r, key) {
  if (!r) return undefined;
  const kLow = String(key).toLowerCase();
  for (const j in r) {
    if (String(j).toLowerCase() === kLow) return r[j];
  }
  return undefined;
}

export function fmt(v, decimals = 2) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export async function fetchQuery(webhook, auth, queryType, po, execId = null, extraBody = {}) {
  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (auth) headers['Authorization'] = auth;
  const body = { queryType, searchKeyword: po, ...extraBody };
  if (execId) body.executionId = execId;
  const res = await fetch(webhook, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} (${queryType}): ${res.statusText}${txt ? ' — ' + txt.slice(0, 80) : ''}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data) ? data
    : Array.isArray(data.rows) ? data.rows
    : Array.isArray(data.data) ? data.data : [];
  return { rows, raw: data };
}
