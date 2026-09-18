import { useState } from 'react';
import { Dialog } from 'radix-ui';

// The parent mounts this only while the dialog is open, so the fields seed
// themselves from `config` on every open — no effect syncing props into state.
// `open` is therefore hard-coded true: Radix drives escape/overlay dismissal
// through onOpenChange, while App.jsx still owns whether we are mounted at all.
export default function ConfigModal({ config, onSave, onClose }) {
  const [webhook, setWebhook] = useState(config.webhook);
  const [auth, setAuth] = useState(config.auth);

  function handleSave() {
    onSave({ webhook: webhook.trim(), auth: auth.trim() });
  }

  return (
    <Dialog.Root open onOpenChange={isOpen => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        {/* Content sits inside Overlay so the existing .config-modal flex
            centering keeps working — as siblings the panel would not centre. */}
        <Dialog.Overlay className="config-modal open">
          <Dialog.Content className="config-panel">
            <Dialog.Title className="config-title">
              ⚙ Connection Settings
              <Dialog.Close asChild>
                <button className="config-close" aria-label="Close settings">✕</button>
              </Dialog.Close>
            </Dialog.Title>
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
            <Dialog.Description asChild>
              <div className="config-note">
                Sends <code>POST</code> → <code>{'{ "queryType": "search|list|count|update|packroll|compare|check|updatestaging", "searchKeyword": "PO" }'}</code><br /><br />
                <b>search</b> = Staging PO &nbsp;|&nbsp; <b>list</b> = Error PO &nbsp;|&nbsp; <b>count</b> = PO Line AX<br />
                <b>update</b> = Pack/Roll &nbsp;|&nbsp; <b>packroll</b> = QTY Pack/Roll &nbsp;|&nbsp; <b>compare</b> = fires both <b>search</b> + <b>count</b> in parallel<br />
                <b>check</b> = BotPO Checking &nbsp;|&nbsp; <b>updatestaging</b> = Update Staging Status
              </div>
            </Dialog.Description>
            <button className="save-btn" onClick={handleSave}>Save &amp; Close</button>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
