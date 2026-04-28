// ── Helper ─────────────────────────────────────────────────────────
function getVal(r, key) {
  if (!r) return undefined;
  const kLow = String(key).toLowerCase();
  for (let j in r) {
    if (String(j).toLowerCase() === kLow) return r[j];
  }
  return undefined;
}

function fmt(v, decimals = 2) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// ── Fetch helper ───────────────────────────────────────────────────
async function fetchQuery(queryType, po, execId = null, extraBody = {}) {
  const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' };
  if (cfg.auth) headers['Authorization'] = cfg.auth;
  const body = { queryType, searchKeyword: po, ...extraBody };
  if (execId) body.executionId = execId;
  const res = await fetch(cfg.webhook, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
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

// ── Loading / Error ────────────────────────────────────────────────
function showLoading() {
  const loadingMsg = mode === 'compare'
    ? '<span>Fetching Staging + AX in parallel…</span>'
    : mode === 'comparedbc'
      ? '<span>Fetching Staging + DBC in parallel…</span>'
      : '<span>Executing query…</span>';
  document.getElementById('results-area').innerHTML =
    `<div class="state-box"><div class="spinner"></div>${loadingMsg}</div>`;
}

function showError(msg) {
  document.getElementById('results-area').innerHTML = `
    <div class="err-box"><span style="font-size:16px;flex-shrink:0;">⚠</span><div>${msg}</div></div>
    <div class="state-box" style="flex:1;"><div class="state-icon" style="font-size:24px;">?</div>
    <span style="font-size:11px;color:var(--text-dim);">Check your webhook URL in ⚙ Config</span></div>`;
}

function updateBadge(m, n) {
  const el = document.getElementById('badge-' + m);
  if (el) el.textContent = n;
}
