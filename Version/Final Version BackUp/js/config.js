// ── Config ─────────────────────────────────────────────────────────
function openConfig() {
  document.getElementById('cfg-webhook').value = cfg.webhook;
  document.getElementById('cfg-auth').value = cfg.auth;
  document.getElementById('config-modal').classList.add('open');
}
function closeConfig() { document.getElementById('config-modal').classList.remove('open'); }
function saveConfig() {
  cfg.webhook = document.getElementById('cfg-webhook').value.trim();
  cfg.auth = document.getElementById('cfg-auth').value.trim();
  localStorage.setItem('po_webhook', cfg.webhook);
  localStorage.setItem('po_auth', cfg.auth);
  updateEndpointDisplay();
  closeConfig();
}
function updateEndpointDisplay() {
  const el = document.getElementById('endpoint-display');
  if (cfg.webhook) {
    try { const u = new URL(cfg.webhook); el.textContent = u.hostname + u.pathname; }
    catch { el.textContent = cfg.webhook.slice(0, 32) + '…'; }
  } else { el.textContent = 'Not configured'; }
}
document.getElementById('config-modal').addEventListener('click', function (e) { if (e.target === this) closeConfig(); });
