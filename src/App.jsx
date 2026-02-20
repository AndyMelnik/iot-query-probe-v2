import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isAuthenticated, clearAuth, executeQuery, exportXlsx, exportReportHtml, getCsrfToken } from './lib/api';
import { SQLEditor } from './components/SQLEditor';
import { ResultsTable } from './components/ResultsTable';
import { ChartBuilder } from './components/ChartBuilder';
import { MapView } from './components/MapView';
import { ExportBar } from './components/ExportBar';
import { DebugPanel } from './components/DebugPanel';
import './App.css';

const defaultSql = 'SELECT * FROM raw_business_data.objects\nLIMIT 1000';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [sql, setSql] = useState(() => {
    try {
      return localStorage.getItem('iqp_sql') || defaultSql;
    } catch {
      return defaultSql;
    }
  });
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('table');
  const chartContainerRef = useRef(null);
  const mapContainerRef = useRef(null);

  useEffect(() => {
    // Enable debug logging if ?debug=true in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      window.__DEBUG_ENABLED = true;
      console.log('🐛 Debug mode enabled');
    }

    const init = async () => {
      console.log('App initialization started');
      const authenticated = isAuthenticated();
      console.log('Auth check:', authenticated ? 'Authenticated' : 'Not authenticated');
      setAuth(authenticated);
      if (authenticated) {
        setStatus('connecting');
        try {
          // Initialize CSRF cookie (double-submit pattern - no server storage needed)
          console.log('Fetching CSRF token...');
          await getCsrfToken();
          console.log('CSRF token initialized');
          setStatus('ready');
        } catch (err) {
          // CSRF token fetch failed, but continue anyway (cookie might be set)
          console.warn('CSRF token init warning:', err);
          setStatus('ready');
        }
      } else {
        setStatus('not-authenticated');
      }
    };
    init();
  }, []);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    console.log('Executing query:', sql.substring(0, 100));
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const startTime = Date.now();
      const data = await executeQuery(sql);
      const duration = Date.now() - startTime;
      console.log('Query executed successfully:', { 
        rowCount: data.rowCount, 
        duration: `${duration}ms`,
        truncated: data.truncated 
      });
      setResult(data);
      setHistory(h => [{ sql: sql.trim(), at: Date.now() }, ...h.slice(0, 49)]);
      try {
        localStorage.setItem('iqp_sql', sql);
      } catch {}
    } catch (err) {
      console.error('Query execution failed:', err);
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [sql]);

  const handleExportXlsx = useCallback(async (columns, rows, filename) => {
    await exportXlsx(columns, rows, filename);
  }, []);

  const handleExportReport = useCallback(async (payload) => {
    await exportReportHtml(payload);
  }, []);

  const logout = () => {
    clearAuth();
    setAuth(false);
  };

  if (auth === false) {
    return (
      <div className="app-unauth">
        <h1>IoT Query Probe v2</h1>
        <p>Not authenticated. Open this application from Navixy to sign in automatically.</p>
      </div>
    );
  }

  if (auth === null) {
    return (
      <div className="app-unauth">
        <p>Loading…</p>
      </div>
    );
  }

  const columns = result?.columns || [];
  const rows = result?.rows || [];

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <div>
            <h1>IoT Query Probe v2</h1>
            <p className="app-header-description">
              Analytics tool for Navixy IoT Query - explore telematics data and create simple reports
            </p>
          </div>
          <button type="button" className="btn-logout" onClick={logout}>
            Sign out
          </button>
        </div>
        <div className="app-status-bar">
          <span className={`status-indicator status-${status}`}>
            {status === 'connecting' && '🔄 Connecting...'}
            {status === 'ready' && '✅ Ready'}
            {status === 'error' && '❌ Connection Error'}
            {status === 'not-authenticated' && '⚠️ Not Authenticated'}
          </span>
        </div>
      </header>

      <div className="app-body">
        <section className="sql-section">
          <SQLEditor value={sql} onChange={setSql} onRun={runQuery} loading={loading} history={history} />
          {error && <div className="error-banner">{error}</div>}
        </section>

        {result && (
          <>
            <div className="result-meta">
              <span>{result.rowCount} rows</span>
              {result.truncated && <span className="truncated">(truncated to {result.rowCount})</span>}
              <span>{result.executionTimeMs} ms</span>
            </div>

            <div className="tabs">
              {['table', 'chart', 'map'].map(t => (
                <button
                  key={t}
                  type="button"
                  className={activeTab === t ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="panel">
              {activeTab === 'table' && (
                <ResultsTable columns={columns} rows={rows} />
              )}
              {activeTab === 'chart' && (
                <ChartBuilder columns={columns} rows={rows} containerRef={chartContainerRef} />
              )}
              {activeTab === 'map' && (
                <MapView columns={columns} rows={rows} containerRef={mapContainerRef} />
              )}
            </div>

            <ExportBar
              columns={columns}
              rows={rows}
              onExportXlsx={handleExportXlsx}
              onExportReport={handleExportReport}
              getChartSvg={() => chartContainerRef.current?.querySelector?.('svg')?.outerHTML ?? null}
              getMapSvg={() => mapContainerRef.current?.querySelector?.('.leaflet-map-pane')?.outerHTML ?? null}
            />
          </>
        )}
      </div>
      <DebugPanel />
    </div>
  );
}
