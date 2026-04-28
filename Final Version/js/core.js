// ── Theme ───────────────────────────────────────────────────────────
(function () {
  const saved = localStorage.getItem('po_theme');
  if (saved && saved !== 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  if (next === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', next);
  }
  localStorage.setItem('po_theme', next);
}

function toggleSpaceTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  if (current === 'space') {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('po_theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'space');
    localStorage.setItem('po_theme', 'space');
  }
}

// ── State ──────────────────────────────────────────────────────────
let mode = 'search';
let history = [];
let lastListRows = [];
let lastCheckRows = [];
let lastCountRows = [];
let lastSearchRows = [];
let lastPackrollRows = [];
let lastPackrollQueriedPOs = [];
let lastItemRows = [];
let lastCompareData = { stagingRows: [], axRows: [] };
let lastSearchDBCData = { header: [], lines: [] };
let lastCompareDBC = { stagingRows: [], dbcLines: [] };
let cfg = {
  webhook: localStorage.getItem('po_webhook') || '',
  auth: localStorage.getItem('po_auth') || ''
};

const MODES = {
  search: { label: 'SEARCH PO (STAGING)', tagClass: 'tag-search', navClass: 'active-search' },
  list: { label: 'ERROR PO', tagClass: 'tag-list', navClass: 'active-list' },
  count: { label: 'PO LINE (AX)', tagClass: 'tag-count', navClass: 'active-count' },
  update: { label: 'PACK / ROLL', tagClass: 'tag-update', navClass: 'active-update' },
  packroll: { label: 'QTY PACK/ROLL', tagClass: 'tag-packroll', navClass: 'active-packroll' },
  compare: { label: 'COMPARE STG vs PO AX', tagClass: 'tag-compare', navClass: 'active-compare' },
  check: { label: 'BOTPO CHECKING', tagClass: 'tag-check', navClass: 'active-check' },
  updatestaging: { label: 'UPDATE STAGING STATUS', tagClass: 'tag-updatestaging', navClass: 'active-updatestaging' },
  searchdbc: { label: 'SEARCH PO DBC', tagClass: 'tag-searchdbc', navClass: 'active-searchdbc' },
  comparedbc: { label: 'COMPARE STG vs PO DBC', tagClass: 'tag-comparedbc', navClass: 'active-comparedbc' },
  item: { label: 'CHECK ITEM ON AX', tagClass: 'tag-item', navClass: 'active-item' }
};
