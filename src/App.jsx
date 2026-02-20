import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isAuthenticated, clearAuth, executeQuery, exportXlsx, exportReportHtml } from './lib/api';
import { SQLEditor } from './components/SQLEditor';
import { ResultsTable } from './components/ResultsTable';
import { ChartBuilder } from './components/ChartBuilder';
import { MapView } from './components/MapView';
import { ExportBar } from './components/ExportBar';
import './App.css';

const defaultSql = 'SELECT 1 AS id, \'Hello\' AS label\nLIMIT 10';

export default function App() {
  const [auth, setAuth] = useState(null);
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
    setAuth(isAuthenticated());
  }, []);

  const runQuery = useCallback(async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await executeQuery(sql);
      setResult(data);
      setHistory(h => [{ sql: sql.trim(), at: Date.now() }, ...h.slice(0, 49)]);
      try {
        localStorage.setItem('iqp_sql', sql);
      } catch {}
    } catch (err) {
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
        <h1>IoT Query Probe v2</h1>
        <button type="button" className="btn-logout" onClick={logout}>
          Sign out
        </button>
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
    </div>
  );
}
