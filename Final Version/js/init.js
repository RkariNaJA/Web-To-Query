// ── Init ───────────────────────────────────────────────────────────
const savedPO = localStorage.getItem('po_last_input');
if (savedPO) document.getElementById('po-input').value = savedPO;

['item-size-input', 'item-color-input', 'item-style-input', 'item-company-input'].forEach(id => {
  const val = localStorage.getItem('po_' + id);
  if (val) document.getElementById(id).value = val;
});

const savedMode = localStorage.getItem('po_mode');
if (savedMode && MODES[savedMode]) setMode(savedMode);

updateSQLPreview();
updateEndpointDisplay();
