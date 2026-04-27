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

export async function fetchQuery(webhook, auth, queryType, po, execId = null) {
  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (auth) headers['Authorization'] = auth;
  const body = { queryType, searchKeyword: po };
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
