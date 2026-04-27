export default function QueryBar({ mode, poInput, execInput, onPoChange, onExecChange, onRun, loading }) {
  const isUpdate = mode === 'updatestaging';

  return (
    <div className="query-bar">
      <div className="query-bar-label">
        {isUpdate ? 'Purchase Order Number & Execution ID' : 'Purchase Order Number'}
      </div>
      <div className="query-row">
        <div className="po-input-wrap">
          <span className="po-prefix">PO_ID ›</span>
          <input
            className="po-input"
            type="text"
            placeholder="e.g. CDHN26HTI020034"
            autoComplete="off"
            spellCheck="false"
            value={poInput}
            onChange={e => onPoChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onRun()}
          />
        </div>
        {isUpdate && (
          <div className="po-input-wrap">
            <span className="po-prefix">EXEC_ID ›</span>
            <input
              className="po-input"
              type="text"
              placeholder="e.g. BotPO_20240101_001"
              autoComplete="off"
              spellCheck="false"
              value={execInput}
              onChange={e => onExecChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onRun()}
            />
          </div>
        )}
        <button className="run-btn" onClick={onRun} disabled={loading}>
          ▶ RUN
        </button>
      </div>
    </div>
  );
}
