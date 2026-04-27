import { NAV_ITEMS, MODES } from '../constants';

export default function Sidebar({ mode, badges, history, onSetMode, webhookUrl }) {
  let endpointDisplay = 'Not configured';
  if (webhookUrl) {
    try { const u = new URL(webhookUrl); endpointDisplay = u.hostname + u.pathname; }
    catch { endpointDisplay = webhookUrl.slice(0, 32) + '…'; }
  }

  return (
    <aside>
      {NAV_ITEMS.map((item, i) => {
        if (item.section) {
          return <div key={`s-${i}`} className="sidebar-section-label">{item.section}</div>;
        }
        const { id, icon, label } = item;
        return (
          <div
            key={id}
            className={`nav-item${mode === id ? ' ' + MODES[id].navClass : ''}`}
            onClick={() => onSetMode(id)}
          >
            <span className="nav-icon">{icon}</span>
            {label}
            <span className="nav-badge">{badges[id] ?? '—'}</span>
          </div>
        );
      })}

      <div className="sidebar-section-label" style={{ marginTop: 12 }}>History</div>
      <div>
        {history.map((h, i) => (
          <div key={i} className="history-item" onClick={() => onSetMode(h.mode, h.po)}>
            <div className={`history-dot ${h.mode}`} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.po}</span>
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{h.count}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.8 }}>
          WEBHOOK ENDPOINT<br />
          <span style={{ color: 'var(--text-muted)', wordBreak: 'break-all' }}>{endpointDisplay}</span>
        </div>
      </div>
    </aside>
  );
}
