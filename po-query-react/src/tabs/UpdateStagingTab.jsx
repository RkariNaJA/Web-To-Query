import { MODES } from '../constants';

export default function UpdateStagingTab({ raw, po }) {
  const success      = raw.success === true;
  const rowsAffected = raw.rowsAffected ?? 0;
  const message      = raw.message || (success ? 'Update completed.' : 'Update failed.');
  const purchaseOrder = raw.purchaseOrder || po;
  const modeInfo     = MODES['updatestaging'];

  return (
    <>
      <div className="summary-row">
        <div className="summary-card" style={{ flex: 'none', minWidth: 130 }}>
          <div className="summary-label">Status</div>
          <div className={`summary-value ${success ? 'green' : 'red'}`}>{success ? '✓ SUCCESS' : '✕ FAILED'}</div>
        </div>
        <div className="summary-card" style={{ flex: 'none', minWidth: 130 }}>
          <div className="summary-label">Rows Affected</div>
          <div className={`summary-value ${rowsAffected > 0 ? 'yellow' : 'red'}`}>{rowsAffected}</div>
        </div>
        <div className="summary-card" style={{ flex: 2, minWidth: 200 }}>
          <div className="summary-label">Message</div>
          <div className="summary-value small" style={{ color: 'var(--text-muted)', wordBreak: 'break-word', whiteSpace: 'normal' }}>{message}</div>
        </div>
      </div>
      <div className="results-meta">
        <span className="results-count">Update for PO <strong>{purchaseOrder}</strong></span>
        <span className={`tag ${modeInfo.tagClass}`}>{modeInfo.label}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{success ? '✓' : '✕'}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: success ? 'var(--green)' : 'var(--red)' }}>{message}</div>
        </div>
      </div>
    </>
  );
}
