// ── Export to Excel (.xlsx) ───────────────────────────────────────
function exportToExcel() {
  const table = document.querySelector('#results-area table');
  if (!table) return;

  const data = [];

  // Use the last thead row as headers (skips compare group-header row)
  const theadRows = table.querySelectorAll('thead tr');
  const headerRow = theadRows[theadRows.length - 1];
  data.push([...headerRow.querySelectorAll('th')].map(th => th.textContent.trim()));

  // Data rows
  table.querySelectorAll('tbody tr').forEach(tr => {
    data.push([...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
  });

  const modeLabel = {
    search: 'Search', list: 'ErrorPO', count: 'POLine_AX', update: 'PackRoll',
    packroll: 'QtyPackRoll', compare: 'Compare_Stg_AX', check: 'BotPO',
    searchdbc: 'SearchDBC', comparedbc: 'Compare_Stg_DBC'
  }[mode] || mode;
  const filename = `PO_${modeLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, modeLabel.slice(0, 31));
  XLSX.writeFile(wb, filename);
}
