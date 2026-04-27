const THEME_ICONS = { dark: '🌙', light: '☀', space: '✦' };
const THEME_CYCLE = { dark: 'light', light: 'space', space: 'dark' };

export default function Header({ onOpenConfig, webhookUrl, theme, onCycleTheme }) {
  let display = 'Not configured';
  if (webhookUrl) {
    try { const u = new URL(webhookUrl); display = u.hostname + u.pathname; }
    catch { display = webhookUrl.slice(0, 32) + '…'; }
  }

  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⬡</div>
        <span className="logo-text">PO · QUERY</span>
      </div>
      <div className="header-divider" />
      <span className="header-sub">DMFPURCHLINEENTITY / MSSQL</span>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onCycleTheme}
          title={`Switch to ${THEME_CYCLE[theme] ?? 'light'} theme`}
          className="theme-btn"
        >
          {THEME_ICONS[theme] ?? '🌙'}
        </button>
        <button
          onClick={onOpenConfig}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--mono)', fontSize: 11, padding: '5px 12px', borderRadius: 6, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          ⚙ CONFIG
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--green)' }}>
          <div className="status-dot" />
          <span>READY</span>
        </div>
      </div>
    </header>
  );
}
