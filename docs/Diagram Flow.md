# Diagram Flow

How Web-To-Query works, drawn from the code in `Final Version/`. The React port (`po-query-react/`) follows the same flows.

## 1. Overview

What runs where: a static page, one n8n webhook, three SQL Server databases. The browser never sends SQL or holds a database credential.

```text
┌────────────────────────────────┐            ┌──────────────────────────────────────┐
│ Your browser                   │───────────▶│ n8n workflow                         │
│ Final Version/index.html       │ POST JSON  │ Web - MSSQL Database Query           │
│ (or po-query-react, Vite)      │◀───────────│                                      │
│                                │ rows JSON  │ Webhook (one URL for every mode)     │
│ 14 JS modules · no bundler     │            │ Route by Query Type (Switch)         │
│ 13 query modes in the sidebar  │            │ Execute Query + Format per mode      │
│                                │            │ Respond to Webhook                   │
│ localStorage:                  │            │                                      │
│  po_webhook · po_auth          │            │ holds the SQL + DB credentials       │
└────────────────────────────────┘            └──────────────────┬───────────────────┘
                                                                 │ MSSQL
                                     ┌───────────────────────────┼───────────────────────────┐
                                     │ SQL                       │ SQL                       │ SQL
                                     ▼                           ▼                           ▼
                         ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
                         │ Staging                │  │ AX 2012                │  │ DBC                    │
                         │ DMFPURCHLINEENTITY     │  │ PURCHLINE · INVENTDIM  │  │ PO_HEADER_DBC          │
                         │                        │  │ InventTableModule      │  │ PO_LINES_DBC           │
                         │ search · Find · list   │  │ IVZ_ItemArrivalJour_CT │  │                        │
                         │ check · updatestaging  │  │ count · item · unit    │  │ searchdbc              │
                         └────────────────────────┘  │ update · packroll      │  └────────────────────────┘
                                                     └────────────────────────┘
```

## 2. Page load

What happens when `Final Version/index.html` opens. The modules are plain scripts that share globals, so their order in `index.html` is the dependency order.

```text
   ┌──────────────────────────────────────────────────────┐
   │ Final Version/index.html  (opened from disk)         │
   │                                                      │
   │ 1. 13 stylesheets  css/variables.css ...             │
   │    table-legibility.css (must load last)             │
   │ 2. SheetJS xlsx-0.20.3 from cdn.sheetjs.com          │
   │ 3. 14 plain <script> tags, order matters             │
   └──────────────────────────┬───────────────────────────┘
                              │ core.js runs first
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ js/core.js                                           │
   │                                                      │
   │ applyAppearance(): OS light/dark, or Space           │
   │   (po_space) → writes po_theme                       │
   │ shared state: mode, history, lastXxxRows             │
   │ cfg = { webhook: po_webhook, auth: po_auth }         │
   │ MODES table · QUERY_TYPES { find: 'Find' }           │
   └──────────────────────────┬───────────────────────────┘
                              │ utils, history, config, export, mode,
                              │ render-*, filters, query, reports
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ js/init.js  (last script)                            │
   │                                                      │
   │ 1. Restore PO input from po_last_input               │
   │ 2. Restore item / colour / size / company inputs     │
   │ 3. setMode(po_mode) → defaults to 'search'           │
   │ 4. updateSQLPreview() → read-only SQL text           │
   │ 5. updateEndpointDisplay() → Ready / No webhook      │
   └──────────────────────────────────────────────────────┘
```

## 3. Run Query (one request)

Every mode except the two compares: one `fetchQuery()` call, one renderer.

```text
  ┌────────────────────────────────────────────────┐
  │ Run Query button → runQuery()  js/query.js     │
  │                                                │
  │ 1. PO input empty? → showError, stop           │
  │ 2. updatestaging + no Execution ID? → stop     │
  │ 3. No webhook set? → open Config, stop         │
  │ 4. showLoading(), disable the button           │
  └───────────────────────┬────────────────────────┘
                          │ queryType = QUERY_TYPES[mode] || mode
                          ▼
  ┌────────────────────────────────────────────────┐            ┌──────────────────────────────┐
  │ fetchQuery()  js/utils.js                      │───────────▶│ n8n webhook                  │
  │                                                │    POST    │ (URL from po_webhook)        │
  │ body: { queryType, searchKeyword,              │◀───────────│                              │
  │         executionId?, item / unit extras }     │    JSON    │ runs that mode's SQL         │
  │ headers: Authorization = po_auth (if set)      │            │                              │
  │                                                │            │ { success, totalRows,        │
  │ not 2xx? → throw 'HTTP 404 (count): ...'       │            │   rows: [...] }              │
  │ strip blank rows with isBlankRow()             │            └──────────────────────────────┘
  └───────────────────────┬────────────────────────┘
                          │ { rows, raw }
                          ▼
  ┌────────────────────────────────────────────────┐
  │ Back in runQuery()                             │
  │                                                │
  │ 1. addHistory(po, mode, count)  (keeps 12)     │
  │ 2. searchdbc → renderSearchDBC(raw)            │
  │    everything else → renderResults(rows)       │
  │ 3. Error? 'Failed to fetch' → hint: wrong      │
  │    URL / workflow inactive / ngrok offline     │
  │ 4. Re-enable the Run Query button              │
  └────────────────────────────────────────────────┘
```

## 4. Compare Stg vs PO AX

Two requests in parallel, plus a third (`Find`) when the BotPO staging lookup comes back empty.

```text
                       ┌──────────────────────────────────────────────┐
                       │ Compare Stg vs PO AX  (mode 'compare')       │
                       │ js/query.js · Promise.all                    │
                       └──────────────────────┬───────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ in parallel                                   │ in parallel
                      ▼                                               ▼
 ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
 │ fetchQuery('search', po)                 │    │ fetchQuery('count', po)                  │
 │ Staging · EXECUTIONID LIKE 'BotPO%'      │    │ AX · PURCHLINE                           │
 └────────────────────┬─────────────────────┘    └────────────────────┬─────────────────────┘
                      └───────────────────────┬───────────────────────┘
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │ Both resolved                                          │
                  │                                                        │
                  │ 1. Staging rows empty? → fetchQuery('Find', po)        │
                  │    stagingSource = 'find'  (else 'search')             │
                  │ 2. Keep only AX rows with a LINENUMBER                 │
                  │    (drops the totals-only { TOTAL_QTY: 0 } row)        │
                  │ 3. addHistory(po, 'compare', stg + ax lines)           │
                  └───────────────────────────┬────────────────────────────┘
                                              │
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │ renderCompare(stagingRows, axLines, po, source)        │
                  │ js/render-compare.js                                   │
                  │                                                        │
                  │ side by side, ✓ Match / Δ badges per line              │
                  │ header: (via SEARCH BOTPO) or                          │
                  │         (via SEARCH PO — fallback)                     │
                  └────────────────────────────────────────────────────────┘
```

## 5. Compare Stg vs PO DBC

Two requests in parallel, no fallback.

```text
                       ┌──────────────────────────────────────────────┐
                       │ Compare Stg vs PO DBC  (mode 'comparedbc')   │
                       │ js/query.js · Promise.all                    │
                       └──────────────────────┬───────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ in parallel                                   │ in parallel
                      ▼                                               ▼
 ┌──────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
 │ fetchQuery('search', po)                 │    │ fetchQuery('searchdbc', po)              │
 │ Staging · DMFPURCHLINEENTITY             │    │ DBC · uses raw.lines only                │
 └────────────────────┬─────────────────────┘    └────────────────────┬─────────────────────┘
                      └───────────────────────┬───────────────────────┘
                                              ▼
                  ┌────────────────────────────────────────────────────────┐
                  │ renderCompareDBC(stagingRows, dbcLines, po)            │
                  │ js/render-comparedbc.js                                │
                  │                                                        │
                  │ addHistory(po, 'comparedbc', stg + dbc lines)          │
                  │ no Find fallback here (unlike Compare Stg vs AX)       │
                  └────────────────────────────────────────────────────────┘
```

## 6. The n8n workflow

The other end of every request. Switch outputs are n8n display names; the `Find` → `PO-Stagging` pairing is not confirmed (see DEVELOPER-GUIDE.md).

```text
                           ┌──────────────────────────────────────────────┐
                           │ Webhook  (POST, one URL for every mode)      │
                           │ → Parse Web Request → Parse Query Intent     │
                           └──────────────────────┬───────────────────────┘
                                                  │ Route by Query Type (Switch on queryType)
              ┌───────────────────────┬───────────┴───────────┬───────────────────────┐
              │                       │                       │                       │
              ▼                       ▼                       ▼                       ▼
    ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
    │ Search PO          │  │ PO-Stagging        │  │ ... 11 more        │  │ Fallback           │
    │ search             │  │ Find (unconfirmed) │  │ 9 used by tabs,    │  │ unknown queryType  │
    │                    │  │                    │  │ 2 that no tab uses │  │                    │
    │ Execute Query      │  │ Execute Query      │  │ Execute Query      │  │ takes this branch, │
    │ Format             │  │ Format             │  │ Format             │  │ no useful data     │
    └─────────┬──────────┘  └─────────┬──────────┘  └─────────┬──────────┘  └────────────────────┘
              └───────────────────────┼───────────────────────┘
                                      ▼
             ┌──────────────────────────────────────────────────┐
             │ Respond to Webhook                               │
             │ { success, queryType, totalRows, rows }          │
             │ searchdbc: { header, lines, totalHeaderRows,     │
             │              totalLineRows }                     │
             │ nothing matched: rows: [{}]  (page strips it)    │
             └──────────────────────────────────────────────────┘
```

## 7. After the results

What the user can do with a rendered table. Nothing here calls n8n again.

```text
                             ┌──────────────────────────────────────────┐
                             │ Results table on the page                │
                             │ render-results.js / render-dbc.js /      │
                             │ render-compare*.js                       │
                             └────────────────────┬─────────────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                │ type in a filter                │ Export Excel                    │ popup buttons
                ▼                                 ▼                                 ▼
 ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
 │ js/filters.js                │  │ js/export.js                 │  │ js/reports.js                │
 │                              │  │                              │  │ window.open() popup pages    │
 │ applySearchFilter(),         │  │ exportToExcel()              │  │                              │
 │ applyCountFilter(), ...      │  │ reads the visible table      │  │ showFullError                │
 │ per-column filters; summary  │  │ SheetJS → .xlsx file         │  │ showErrorSummary             │
 │ cards recount live           │  │ PO_<Mode>_<yyyy-mm-dd>.xlsx  │  │ showUnitSummary              │
 └──────────────────────────────┘  └──────────────────────────────┘  │ showCheckSummary             │
                                                                     │   Item / PO Summary + export │
                                                                     │ themed from po_theme         │
                                                                     └──────────────────────────────┘
```

## 8. Settings

Where the webhook URL and token live. There is no `.env` and no config file.

```text
┌────────────────────────────────┐            ┌──────────────────────────────────────────┐
│ Gear icon → openConfig()       │───────────▶│ Browser localStorage (per browser)       │
│ js/config.js                   │  setItem   │                                          │
│                                │            │ po_webhook     n8n webhook URL           │
│ fields: webhook URL,           │            │ po_auth        Authorization header      │
│         auth token             │            │ po_mode        last mode (setMode)       │
│                                │            │ po_last_input  last PO typed             │
│ Save → saveConfig()            │            │ po_space       1 = Space theme on        │
│                                │            │ po_theme       applied theme (written)   │
└───────────────┬────────────────┘            └──────────────────────────────────────────┘
                │ updateEndpointDisplay()
                ▼
┌────────────────────────────────┐
│ Header status                  │
│ Ready  /  No webhook           │
│ (config only, never pings n8n) │
└────────────────────────────────┘
```
