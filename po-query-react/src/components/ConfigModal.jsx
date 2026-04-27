import { useState, useEffect } from 'react';

export default function ConfigModal({ open, config, onSave, onClose }) {
  const [webhook, setWebhook] = useState(config.webhook);
  const [auth, setAuth] = useState(config.auth);

  useEffect(() => {
    setWebhook(config.webhook);
    setAuth(config.auth);
  }, [open, config]);

  function handleSave() {
    onSave({ webhook: webhook.trim(), auth: auth.trim() });
  }

  if (!open) return null;

  return (
    <div className="config-modal open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="config-panel">
        <div className="config-title">
          ⚙ Connection Settings
          <button className="config-close" onClick={onClose}>✕</button>
        </div>
        <div className="field-group">
          <div className="field-label">n8n Webhook URL</div>
          <input
            className="field-input"
            type="text"
            placeholder="http://localhost:5678/webhook/po-query"
            value={webhook}
            onChange={e => setWebhook(e.target.value)}
          />
        </div>
        <div className="field-group">
          <div className="field-label">Authorization Header (optional)</div>
          <input
            className="field-input"
            type="text"
            placeholder="Bearer eyJ..."
            value={auth}
            onChange={e => setAuth(e.target.value)}
          />
        </div>
        <div className="config-note">
          Sends <code>POST</code> → <code>{'{ "queryType": "search|list|count|update|packroll|compare|check|updatestaging", "searchKeyword": "PO" }'}</code><br /><br />
          <b>search</b> = Staging PO &nbsp;|&nbsp; <b>list</b> = Error PO &nbsp;|&nbsp; <b>count</b> = PO Line AX<br />
          <b>update</b> = Pack/Roll &nbsp;|&nbsp; <b>packroll</b> = QTY Pack/Roll &nbsp;|&nbsp; <b>compare</b> = fires both <b>search</b> + <b>count</b> in parallel<br />
          <b>check</b> = BotPO Checking &nbsp;|&nbsp; <b>updatestaging</b> = Update Staging Status
        </div>
        <button className="save-btn" onClick={handleSave}>Save &amp; Close</button>
      </div>
    </div>
  );
}
