// ── History ────────────────────────────────────────────────────────
function addHistory(po, m, count) {
  history.unshift({ po, mode: m, count });
  if (history.length > 12) history.pop();
  renderHistory();
}
function renderHistory() {
  document.getElementById('history-list').innerHTML = history.map(h => `
    <div class="history-item" onclick="restoreHistory('${h.po}','${h.mode}')">
      <div class="history-dot ${h.mode}"></div>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${h.po}</span>
      <span style="font-size:10px;color:var(--text-dim);">${h.count}</span>
    </div>`).join('');
}
function restoreHistory(po, m) {
  document.getElementById('po-input').value = po;
  setMode(m);
  updateSQLPreview();
}
