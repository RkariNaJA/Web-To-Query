import { useState, useEffect } from 'react';
import { fetchQuery, getVal } from './utils';
import { MODES } from './constants';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import QueryBar from './components/QueryBar';
import SqlPreview from './components/SqlPreview';
import ConfigModal from './components/ConfigModal';
import SearchTab from './tabs/SearchTab';
import ErrorPOTab from './tabs/ErrorPOTab';
import POLineAXTab from './tabs/POLineAXTab';
import PackRollTab from './tabs/PackRollTab';
import QtyPackRollTab from './tabs/QtyPackRollTab';
import ComparePOTab from './tabs/ComparePOTab';
import BotPOCheckTab from './tabs/BotPOCheckTab';
import UpdateStagingTab from './tabs/UpdateStagingTab';
import SearchDBCTab from './tabs/SearchDBCTab';
import CompareDBCTab from './tabs/CompareDBCTab';

function getInitialConfig() {
  return {
    webhook: localStorage.getItem('po_webhook') || '',
    auth:    localStorage.getItem('po_auth') || '',
  };
}

export default function App() {
  const [mode, setModeState]        = useState('search');
  const [poInput, setPoInput]       = useState(() => localStorage.getItem('po_last_input') || '');
  const [execInput, setExecInput]   = useState('');
  const [config, setConfig]         = useState(getInitialConfig);
  const [configOpen, setConfigOpen] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [uiState, setUiState]       = useState({ type: 'idle' });
  const [badges, setBadges]         = useState({});
  const [history, setHistory]       = useState([]);
  const [theme, setTheme]           = useState(() => localStorage.getItem('po_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('po_theme', theme);
  }, [theme]);

  function cycleTheme() {
    setTheme(t => t === 'dark' ? 'light' : t === 'light' ? 'space' : 'dark');
  }

  function setMode(m, restorePo) {
    setModeState(m);
    if (restorePo !== undefined) setPoInput(restorePo);
  }

  function updateBadge(m, n) {
    setBadges(prev => ({ ...prev, [m]: n }));
  }

  function addHistory(po, m, count) {
    setHistory(prev => [{ po, mode: m, count }, ...prev].slice(0, 12));
  }

  function handlePoChange(val) {
    setPoInput(val);
    localStorage.setItem('po_last_input', val);
  }

  function saveConfig(newCfg) {
    setConfig(newCfg);
    localStorage.setItem('po_webhook', newCfg.webhook);
    localStorage.setItem('po_auth', newCfg.auth);
    setConfigOpen(false);
  }

  async function runQuery() {
    if (!poInput.trim()) { setUiState({ type: 'error', msg: 'Please enter a PO number.' }); return; }
    if (mode === 'updatestaging' && !execInput.trim()) { setUiState({ type: 'error', msg: 'Please enter an Execution ID.' }); return; }
    if (!config.webhook) { setConfigOpen(true); return; }

    setLoading(true);
    setUiState({ type: 'loading' });

    try {
      if (mode === 'compare') {
        const [stagingRes, axRes] = await Promise.all([
          fetchQuery(config.webhook, config.auth, 'search', poInput.trim()),
          fetchQuery(config.webhook, config.auth, 'count', poInput.trim()),
        ]);
        const total = stagingRes.rows.length + axRes.rows.length;
        addHistory(poInput.trim(), mode, total);
        updateBadge('compare', total);
        setUiState({ type: 'result', mode: 'compare', stagingRows: stagingRes.rows, axRows: axRes.rows, po: poInput.trim() });

      } else if (mode === 'comparedbc') {
        const [stagingRes, dbcRes] = await Promise.all([
          fetchQuery(config.webhook, config.auth, 'search', poInput.trim()),
          fetchQuery(config.webhook, config.auth, 'searchdbc', poInput.trim()),
        ]);
        const dbcLines = Array.isArray(dbcRes.raw?.lines) ? dbcRes.raw.lines : [];
        const total = stagingRes.rows.length + dbcLines.length;
        addHistory(poInput.trim(), mode, total);
        updateBadge('comparedbc', total);
        setUiState({ type: 'result', mode: 'comparedbc', stagingRows: stagingRes.rows, dbcLines, po: poInput.trim() });

      } else if (mode === 'searchdbc') {
        const { raw } = await fetchQuery(config.webhook, config.auth, 'searchdbc', poInput.trim());
        const dbcHeader = Array.isArray(raw?.header) ? raw.header : [];
        const dbcLines  = Array.isArray(raw?.lines)  ? raw.lines  : [];
        const count = dbcHeader.length + dbcLines.length;
        addHistory(poInput.trim(), mode, count);
        updateBadge('searchdbc', count);
        setUiState({ type: 'result', mode: 'searchdbc', dbcHeader, dbcLines, po: poInput.trim() });

      } else {
        const execId = mode === 'updatestaging' ? execInput.trim() : null;
        const { rows, raw } = await fetchQuery(config.webhook, config.auth, mode, poInput.trim(), execId);
        const serverTotalQty    = getVal(raw, 'totalQTY')       ?? getVal(raw, 'total_qty')    ?? null;
        const serverTotalAmount = getVal(raw, 'totalNetAmount') ?? getVal(raw, 'total_amount') ?? null;
        const count = mode === 'updatestaging' ? (raw.rowsAffected ?? 0) : rows.length;
        addHistory(poInput.trim(), mode, count);
        updateBadge(mode, rows.length);
        setUiState({ type: 'result', mode, rows, po: poInput.trim(), raw, serverTotalQty, serverTotalAmount });
      }
    } catch (e) {
      let msg = e.message || 'Network error.';
      if (msg.toLowerCase().includes('failed to fetch')) {
        msg = 'Failed to fetch — possible causes:\n① Wrong webhook URL in Config\n② n8n workflow not Published/Active\n③ ngrok tunnel is offline (restart ngrok)';
      }
      setUiState({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  }

  function renderResults() {
    if (uiState.type === 'idle') {
      return (
        <div className="state-box">
          <div className="state-icon">⬡</div>
          <span>Select a query mode and enter a PO number</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Results will appear here</span>
        </div>
      );
    }
    if (uiState.type === 'loading') {
      const loadingMsg = mode === 'compare' ? 'Fetching Staging + AX in parallel…'
        : mode === 'comparedbc' ? 'Fetching Staging + DBC in parallel…'
        : 'Executing query…';
      return (
        <div className="state-box">
          <div className="spinner" />
          <span>{loadingMsg}</span>
        </div>
      );
    }
    if (uiState.type === 'error') {
      return (
        <>
          <div className="err-box">
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠</span>
            <div style={{ whiteSpace: 'pre-line' }}>{uiState.msg}</div>
          </div>
          <div className="state-box" style={{ flex: 1 }}>
            <div className="state-icon" style={{ fontSize: 24 }}>?</div>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Check your webhook URL in ⚙ Config</span>
          </div>
        </>
      );
    }
    if (uiState.type === 'result') {
      const { mode: rMode, rows, po, raw, stagingRows, axRows, dbcLines, dbcHeader, serverTotalQty, serverTotalAmount } = uiState;

      if (rMode === 'compare')     return <ComparePOTab stagingRows={stagingRows} axRows={axRows} po={po} />;
      if (rMode === 'comparedbc')  return <CompareDBCTab stagingRows={stagingRows} dbcLines={dbcLines} po={po} />;
      if (rMode === 'updatestaging') return <UpdateStagingTab raw={raw} po={po} />;
      if (rMode === 'searchdbc')   return <SearchDBCTab dbcHeader={dbcHeader} dbcLines={dbcLines} po={po} />;

      const emptyMsgs = {
        search:   `No staging data found for PO ${po}.`,
        list:     `✅ No errors — all lines transferred successfully for PO ${po}.`,
        count:    `No PO lines found in AX for PO ${po}.`,
        update:   `No Pack/Roll records found for PO ${po}.`,
        packroll: `No QTY Pack/Roll lines found for PO ${po}.`,
        check:    `No BotPO data found for PO ${po}.`,
      };

      if (!rows || rows.length === 0) {
        return (
          <div className="state-box" style={{ borderStyle: 'solid', borderColor: rMode === 'list' ? 'rgba(62,207,142,0.3)' : 'var(--border)' }}>
            <div className="state-icon">{rMode === 'list' ? '✅' : '⊘'}</div>
            <span style={{ color: 'var(--text)' }}>{emptyMsgs[rMode] ?? `No results for PO ${po}.`}</span>
          </div>
        );
      }

      if (rMode === 'search')   return <SearchTab rows={rows} po={po} />;
      if (rMode === 'list')     return <ErrorPOTab rows={rows} po={po} />;
      if (rMode === 'count')    return <POLineAXTab rows={rows} po={po} serverTotalQty={serverTotalQty} serverTotalAmount={serverTotalAmount} />;
      if (rMode === 'update')   return <PackRollTab rows={rows} po={po} />;
      if (rMode === 'packroll') return <QtyPackRollTab rows={rows} po={po} />;
      if (rMode === 'check')    return <BotPOCheckTab rows={rows} po={po} />;
    }
    return null;
  }

  return (
    <div className="layout">
      <Header onOpenConfig={() => setConfigOpen(true)} webhookUrl={config.webhook} theme={theme} onCycleTheme={cycleTheme} />
      <Sidebar mode={mode} badges={badges} history={history} onSetMode={setMode} webhookUrl={config.webhook} />
      <main>
        <QueryBar
          mode={mode}
          poInput={poInput}
          execInput={execInput}
          onPoChange={handlePoChange}
          onExecChange={setExecInput}
          onRun={runQuery}
          loading={loading}
        />
        <SqlPreview mode={mode} poInput={poInput} execInput={execInput} />
        <div className="results-area">
          {renderResults()}
        </div>
      </main>
      <ConfigModal open={configOpen} config={config} onSave={saveConfig} onClose={() => setConfigOpen(false)} />
    </div>
  );
}
