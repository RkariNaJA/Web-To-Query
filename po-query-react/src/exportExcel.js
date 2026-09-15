import * as XLSX from 'xlsx';
import { getVal } from './utils';

// The vanilla app scrapes the rendered table, so its export always matches what
// is on screen — filters and number formatting included. React tabs already own
// their columns, so they pass them in and hand over the rows currently shown.
export function exportRows({ cols, keys, rows, sheet, file, format }) {
  const data = [cols, ...rows.map(r => keys.map(k => {
    const raw = getVal(r, k);
    if (raw === undefined || raw === null || raw === '') return '';
    return format ? format(k, raw) : raw;
  }))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, `${file}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
