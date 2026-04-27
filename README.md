# Web-To-Query

A purchase order query dashboard that connects to an n8n webhook → MSSQL pipeline and renders results in a multi-mode interface.

## Structure

```
├── Final Version/     — Main app (vanilla JS + CSS, no build step needed)
├── po-query-react/    — React/Vite port (run: npm install && npm run dev)
└── Version/           — Early HTML prototypes (V1 – V3)
```

## Final Version — Modes

| Mode | Description |
|------|-------------|
| PO Line (AX) | Query PO lines from AX |
| Search PO | Search purchase orders with filters |
| Search PO DBC | Search DBC purchase orders (header + lines) |
| Compare PO | Compare PO data side by side |
| Compare DBC | Compare DBC header/lines data |
| QTY Pack/Roll | Pack and roll quantity tracking |
| History | Query execution history |

## Usage

Open `Final Version/index.html` directly in a browser. Configure the n8n webhook URL in the Config modal (gear icon).

## Tech Stack

- Vanilla JS / CSS — no build step for Final Version
- React + Vite — for the `po-query-react/` port
- n8n webhook → MSSQL for data
