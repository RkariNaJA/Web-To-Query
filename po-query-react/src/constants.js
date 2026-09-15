export const MODES = {
  search:        { label: 'SEARCH BOTPO (STAGING)', tagClass: 'tag-search',        navClass: 'active-search' },
  find:          { label: 'SEARCH PO (STAGING)',     tagClass: 'tag-find',          navClass: 'active-find' },
  list:          { label: 'ERROR PO',               tagClass: 'tag-list',          navClass: 'active-list' },
  count:         { label: 'PO LINE (AX)',            tagClass: 'tag-count',         navClass: 'active-count' },
  update:        { label: 'PACK / ROLL',             tagClass: 'tag-update',        navClass: 'active-update' },
  packroll:      { label: 'QTY PACK/ROLL',           tagClass: 'tag-packroll',      navClass: 'active-packroll' },
  compare:       { label: 'COMPARE STG vs PO AX',   tagClass: 'tag-compare',       navClass: 'active-compare' },
  check:         { label: 'BOTPO CHECKING',          tagClass: 'tag-check',         navClass: 'active-check' },
  updatestaging: { label: 'UPDATE STAGING STATUS',   tagClass: 'tag-updatestaging', navClass: 'active-updatestaging' },
  searchdbc:     { label: 'SEARCH PO DBC',           tagClass: 'tag-searchdbc',     navClass: 'active-searchdbc' },
  comparedbc:    { label: 'COMPARE STG vs PO DBC',   tagClass: 'tag-comparedbc',    navClass: 'active-comparedbc' },
  item:          { label: 'CHECK ITEM ON AX',         tagClass: 'tag-item',          navClass: 'active-item' },
  unit:          { label: 'CHECK UNIT ON AX',         tagClass: 'tag-unit',          navClass: 'active-unit' },
};

// Wire queryType per mode, where the mode key and the n8n branch name differ only
// in spelling. The `find` mode posts 'Find' — capital F, the exact value its n8n
// Switch branch matches on — while the key stays lowercase like every other mode.
// Mirrors QUERY_TYPES in the vanilla app's js/core.js.
export const QUERY_TYPES = { find: 'Find' };

// `find` renders exactly like `search`: same columns, summary cards and filters,
// so both share SearchTab rather than duplicating it.
export function isStagingSearch(m) {
  return m === 'search' || m === 'find';
}

export const NAV_ITEMS = [
  { section: 'STAGING' },
  { id: 'search',        icon: '⌕',  label: 'Search BotPO (Staging)' },
  { id: 'find',          icon: '⌖',  label: 'Search PO (Staging)' },
  { id: 'list',          icon: '⚠',  label: 'Error PO' },
  { id: 'count',         icon: '≡',  label: 'PO Line (AX)' },
  { id: 'update',        icon: '⬡',  label: 'Pack / Roll' },
  { id: 'packroll',      icon: '⧉',  label: 'QTY Pack/Roll' },
  { section: 'COMPARE' },
  { id: 'compare',       icon: '⇄',  label: 'Compare Stg vs AX' },
  { id: 'comparedbc',    icon: '⇋',  label: 'Compare Stg vs DBC' },
  { section: 'DBC' },
  { id: 'searchdbc',     icon: '⊙',  label: 'Search PO DBC' },
  { section: 'BOTPO' },
  { id: 'check',         icon: '✓',  label: 'BotPO Checking' },
  { section: 'ITEM' },
  { id: 'item',          icon: '◈',  label: 'Check Item On AX' },
  { id: 'unit',          icon: '◇',  label: 'Check Unit On AX' },
  { section: 'ADMIN' },
  { id: 'updatestaging', icon: '↑',  label: 'Update Staging Status' },
];
