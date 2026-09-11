# Web-To-Query — Developer Guide

> The technical guide: the file layout, all twelve modes and the `queryType` contract, the
> request body per mode, the localStorage keys, and what to touch when adding a mode. For a
> short overview of what this is, see the **[README](../README.md)**.

A purchase-order query dashboard. Every mode posts a JSON body to one **n8n webhook**, which runs the
matching SQL against MSSQL and returns rows the page renders into a table. The browser holds no
database credentials and builds no SQL — n8n owns both.

Three databases are reachable through it: **Staging**, **AX**, and **DBC**.

---

## Quick start

**Final Version** — no build step, no install:

```
open "Final Version/index.html"
```

Then click the **gear icon** and paste your n8n webhook URL. Nothing works until that is set.

**React port** — needs Node:

```bash
cd po-query-react
npm install
npm run dev
```

---

## Structure

```
Web-To-Query/
├─ Final Version/        ★ the app in use — plain JS, no bundler
│  ├─ index.html            markup + the sidebar that defines mode order
│  ├─ js/                   14 modules, loaded as plain scripts (no imports)
│  │  ├─ core.js               MODES table, theme switching, shared state
│  │  ├─ init.js               boot; restores the last mode from localStorage
│  │  ├─ config.js             webhook + auth settings, persisted to localStorage
│  │  ├─ mode.js               per-mode query-bar layout and field labels
│  │  ├─ query.js              Run Query — dispatches per mode, incl. the two parallel compares
│  │  ├─ utils.js              fetchQuery(): builds the request body, throws on non-2xx
│  │  ├─ render-results.js     the standard results table
│  │  ├─ render-dbc.js         DBC header + lines (two tables)
│  │  ├─ render-compare.js     Staging vs AX side by side
│  │  ├─ render-comparedbc.js  Staging vs DBC side by side
│  │  ├─ filters.js            per-column filtering
│  │  ├─ export.js             export the current table to .xlsx
│  │  ├─ history.js            past queries, kept client-side
│  │  └─ reports.js            full-error popup + the Error / Unit / BotPO summary windows
│  ├─ css/                  12 stylesheets, one per area + three themes
│  └─ Version 1/            an earlier snapshot of this app
├─ po-query-react/       React + Vite port (see caveat below)
├─ Version/              standalone HTML prototypes, V1.2 → V3
├─ README.md            GitHub landing page: what the tool does, for anyone
└─ docs/DEVELOPER-GUIDE.md  this file
```

---

## Modes

Twelve, in sidebar order. `queryType` is what n8n receives and switches on.

| # | Mode key | Sidebar label | `queryType` sent |
| - | -------- | ------------- | ---------------- |
| 1 | `search` | Search PO (Staging) | `search` |
| 2 | `searchdbc` | Search PO DBC | `searchdbc` |
| 3 | `list` | Error PO | `list` |
| 4 | `count` | PO Line (AX) | `count` |
| 5 | `item` | Check Item On AX | `item` |
| 6 | `unit` | Check Unit On AX | `unit` |
| 7 | `update` | Pack / Roll | `update` |
| 8 | `packroll` | QTY Pack/Roll | `packroll` |
| 9 | `compare` | Compare Stg vs AX | **two calls:** `search` + `count` |
| 10 | `comparedbc` | Compare Stg vs DBC | **two calls:** `search` + `searchdbc` |
| 11 | `check` | BotPO Checking | `check` |
| 12 | `updatestaging` | Update Staging Status | `updatestaging` |

The two **compare** modes are the only ones that fire more than one request; both run in parallel and
render once both resolve. For every other mode the `queryType` is the mode key verbatim.

### Request body

`fetchQuery()` in `js/utils.js` sends:

```json
{ "queryType": "<mode>", "searchKeyword": "<the input>", "...extra": "per-mode fields" }
```

Only three modes add extra fields:

| Mode | Extra fields |
| ---- | ------------ |
| `item` | `inventSizeId`, `inventColorId`, `inventStyleId`, `dataAreaId` |
| `unit` | `dataAreaId` |
| `updatestaging` | an execution ID alongside the PO number |

`searchdbc` is the one non-flat response — `{ success, header, lines, totalHeaderRows, totalLineRows }`
— which is why it gets its own renderer.

---

## Features

- **Three themes** — dark, light, and `space`. Set on `data-theme`; the choice persists.
- **Excel export** of whatever the table currently shows, filters included.
- **Query history**, client-side only.
- **Per-column filters** on the wider result sets.
- **Full-error popup** for rows whose error text is too long for a cell.

### The summary windows (`reports.js`)

Four of them — `showFullError`, `showErrorSummary`, `showUnitSummary`, `showCheckSummary` — each
built as one big template literal and handed to a `window.open()` document. They are standalone
pages: their own `<style>`, their own copy of the data inlined as JSON, and their own filter and
render functions. Nothing from `js/` is in scope inside them.

`showCheckSummary` (BotPO Checking → **Error Summarize**) carries two cards, each with a filter and
an Excel export that follows that filter:

| Card | Filter | Export |
| ---- | ------ | ------ |
| ITEM SUMMARY | substring on item | one row per item: `ITEM, Color, SIZE, SEASON` |
| PO SUMMARY | **many POs at once** — `poTerms()` splits the box on commas, semicolons and whitespace, then a PO matches if it contains *any* term | one row per **item + season + colour**: `ITEM, PO, Color, SIZE, SEASON`, with PO and SIZE comma-joined and deduplicated inside the row |

Two things about the PO Summary export are easy to get wrong:

- It reads **`ALL_ROWS`, not `PO_DATA`**. `PO_DATA` rolls colours, sizes and seasons up per PO, so a
  colour can no longer be traced back to one season — grouping by item + season + colour needs the
  raw rows. The grouping key is `item||season||colour`; only PO and SIZE are joined within a group,
  and a missing colour or season becomes `-`.
- The card's header count and its red `PO: …` strip are **not static**. `renderPoSummary()` rewrites
  both, so they always show the filtered set.

---

## Configuration

Settings live in `localStorage`, not in a file — so they are **per browser**, and clearing site data
loses them:

| Key | Holds |
| --- | ----- |
| `po_webhook` | the n8n webhook URL |
| `po_auth` | auth token, if the webhook needs one |
| `po_mode` | last mode used, restored on reload |

> ⚠️ **`po_auth` is a token sitting in `localStorage`**, readable by any script running on the page.
> Acceptable for an internal tool on a trusted machine; not something to point at a webhook that
> reaches anything sensitive.

Because config is per browser, there is nothing to commit and no `.env` — which is also why this repo
carries no credentials at all.

---

## Notes

- ⚠️ **The React port lags by one mode.** `Final Version` has all twelve; `po-query-react` has eleven
  — `unit` (Check Unit On AX) was added to the vanilla app afterwards and never ported. Treat
  `Final Version` as the source of truth.
- `js/` modules are **plain scripts, not ES modules** — they share globals and depend on the load
  order in `index.html`. Adding a file means adding a `<script>` tag.
- ⚠️ **Backslash escapes die inside the summary popups.** Their code lives in a template literal, so
  an escape the literal doesn't recognise silently loses its backslash: writing `/[\s,;]+/` ships
  `/[s,;]+/` to the browser — a regex that splits on the letter *s*. Double every backslash meant for
  the generated code (`/[\\s,;]+/`), and remember `\n` / `\t` are worse, becoming real newlines and
  tabs that break a regex literal outright. This does **not** show up in `node --check reports.js`,
  which only sees a string; it only shows up in a browser.
- ⚠️ **Re-rendered popup markup has to be re-themed.** Light and `space` are applied by `applyTheme()`
  walking `[style]` attributes and swapping the dark hex values — so any function that rewrites
  `innerHTML` (every filter re-render) must call `applyTheme(container)` afterwards, or that section
  snaps back to the dark palette.
- Adding a mode touches four places: `MODES` in `core.js`, the nav item in `index.html`, the query-bar
  branch in `mode.js`, and the dispatch in `query.js` — plus a `tag-*` / `active-*` colour pair in the
  CSS.
- `Version/` and `Final Version/Version 1/` are kept for reference. Neither is wired to anything.
