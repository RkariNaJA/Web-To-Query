export default function QueryBar({ mode, poInput, execInput, itemInputs, onPoChange, onExecChange, onItemChange, onClearItem, onRun, loading }) {
  const isUpdate = mode === 'updatestaging';
  const isItem   = mode === 'item';

  const labelMap = {
    updatestaging: 'Purchase Order Number & Execution ID',
    item:          'Item ID · Size · Color · Season · Company',
  };

  const wrapStyle = (w) => ({ flex: `0 1 ${w}px`, maxWidth: w });

  return (
    <div className="query-bar">
      <div className="query-bar-label">
        {labelMap[mode] || 'Purchase Order Number'}
      </div>
      <div className="query-row">
        <div className="po-input-wrap">
          <span className="po-prefix">{isItem ? 'ITEM_ID ›' : 'PO_ID ›'}</span>
          <input
            className="po-input"
            type="text"
            placeholder={isItem ? 'e.g. PSKNI701890' : 'e.g. CDHN26HTI020034'}
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
        {isItem && (
          <>
            <div className="po-input-wrap" style={wrapStyle(150)}>
              <span className="po-prefix">SIZE ›</span>
              <input className="po-input" type="text" placeholder="e.g. M" autoComplete="off" spellCheck="false"
                value={itemInputs.size} onChange={e => onItemChange('size', e.target.value)} onKeyDown={e => e.key === 'Enter' && onRun()} />
            </div>
            <div className="po-input-wrap" style={wrapStyle(150)}>
              <span className="po-prefix">COLOR ›</span>
              <input className="po-input" type="text" placeholder="e.g. 616" autoComplete="off" spellCheck="false"
                value={itemInputs.color} onChange={e => onItemChange('color', e.target.value)} onKeyDown={e => e.key === 'Enter' && onRun()} />
            </div>
            <div className="po-input-wrap" style={wrapStyle(150)}>
              <span className="po-prefix">SEASON ›</span>
              <input className="po-input" type="text" placeholder="e.g. FA26" autoComplete="off" spellCheck="false"
                value={itemInputs.season} onChange={e => onItemChange('season', e.target.value)} onKeyDown={e => e.key === 'Enter' && onRun()} />
            </div>
            <div className="po-input-wrap" style={wrapStyle(140)}>
              <span className="po-prefix">COMPANY ›</span>
              <input className="po-input" type="text" placeholder="e.g. HT" autoComplete="off" spellCheck="false"
                value={itemInputs.company} onChange={e => onItemChange('company', e.target.value)} onKeyDown={e => e.key === 'Enter' && onRun()} />
            </div>
          </>
        )}
        <div style={{ display:'flex', flexDirection:'column', gap:6, flexShrink:0 }}>
          <button className="run-btn" onClick={onRun} disabled={loading}>▶ RUN</button>
          {isItem && (
            <button
              onClick={onClearItem}
              style={{ padding:'6px 18px', background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:12, fontWeight:600, borderRadius:8, cursor:'pointer', letterSpacing:'0.05em', transition:'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.color='var(--red)'; }}
              onMouseOut={e  => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-muted)'; }}
            >
              ✕ CLEAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
