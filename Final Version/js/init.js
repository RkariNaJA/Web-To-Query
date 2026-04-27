// ── Init ───────────────────────────────────────────────────────────
const savedPO = localStorage.getItem('po_last_input');
if (savedPO) document.getElementById('po-input').value = savedPO;
updateSQLPreview();
updateEndpointDisplay();
