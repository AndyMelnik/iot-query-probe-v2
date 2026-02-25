import React, { useState, useEffect, useCallback, useRef } from 'react';
import { isAuthenticated, clearAuth, executeQuery, exportXlsx, exportReportHtml, getCsrfToken } from './lib/api';
import { substituteSqlVariables } from './lib/sqlVariables';
import { SQLEditor } from './components/SQLEditor';
import { ResultsTable } from './components/ResultsTable';
import { ChartBuilder } from './components/ChartBuilder';
import { MapView } from './components/MapView';
import { ExportBar } from './components/ExportBar';
import { DebugPanel } from './components/DebugPanel';
import './App.css';

const defaultSql = 'SELECT * FROM raw_business_data.objects\nLIMIT {{limit}}';

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
  const [variables, setVariables] = useState(() => {
    try {
      const s = localStorage.getItem('iqp_variables');
      return s ? JSON.parse(s) : { limit: '1000' };
    } catch {
      return { limit: '1000' };
    }
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportName, setReportName] = useState('IoT Query Report');
  const [reportDesc, setReportDesc] = useState('');
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
    const resolvedSql = substituteSqlVariables(sql, variables);
    if (!resolvedSql.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const startTime = Date.now();
      const data = await executeQuery(resolvedSql);
      const duration = Date.now() - startTime;
      console.log('Query executed successfully:', { rowCount: data.rowCount, duration: `${duration}ms`, truncated: data.truncated });
      setResult(data);
      try {
        localStorage.setItem('iqp_sql', sql);
        localStorage.setItem('iqp_variables', JSON.stringify(variables));
      } catch {}
    } catch (err) {
      console.error('Query execution failed:', err);
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [sql, variables]);

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

  // Hooks must run unconditionally (before any early return)
  const columns = result?.columns || [];
  const rawRows = result?.rows || [];
  const rows = React.useMemo(() => {
    try {
      if (!rawRows.length || !columns.length) return rawRows;
      const colNames = columns.map(c => (typeof c === 'object' ? c.name : c));
      const first = rawRows[0];
      if (first == null || Array.isArray(first)) return rawRows;
      return rawRows.map(row => {
        if (row == null) return colNames.map(() => '');
        return colNames.map(name => (row[name] ?? ''));
      });
    } catch (e) {
      console.error('Row normalization error:', e);
      return rawRows;
    }
  }, [rawRows, columns]);

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
          <SQLEditor value={sql} onChange={setSql} onRun={runQuery} loading={loading} variables={variables} onVariablesChange={setVariables} />
          {error && <div className="error-banner">{error}</div>}
        </section>

        {result && (
          <>
            <div className="result-meta-bar">
              <span className="result-meta-stat">
                <strong>{result.rowCount}</strong> rows
              </span>
              {result.truncated && (
                <span className="result-meta-truncated">(truncated)</span>
              )}
              <span className="result-meta-stat">{result.executionTimeMs} ms</span>
              <div className="result-meta-export">
                <ExportBar
                  columns={columns}
                  rows={rows}
                  reportName={reportName}
                  reportDesc={reportDesc}
                  onReportNameChange={setReportName}
                  onReportDescChange={setReportDesc}
                  onExportXlsx={handleExportXlsx}
                  onExportReport={handleExportReport}
                  onExportJson={() => ({ sql, variables, reportName, reportDesc })}
                  onImportJson={(data) => {
                    if (data.sql != null) setSql(data.sql);
                    if (data.variables != null) setVariables(data.variables);
                    if (data.reportName != null) setReportName(data.reportName);
                    if (data.reportDesc != null) setReportDesc(data.reportDesc);
                  }}
                  getChartSvg={() => chartContainerRef.current?.querySelector?.('svg')?.outerHTML ?? null}
                  getMapSvg={() => mapContainerRef.current?.querySelector?.('.leaflet-map-pane')?.outerHTML ?? null}
                />
              </div>
            </div>

            <section className="dashboard-section dashboard-table">
              <h2 className="section-title">Data table</h2>
              <div className="section-card">
                <ResultsTable columns={columns} rows={rows} />
              </div>
            </section>

            <section className="dashboard-section dashboard-chart">
              <h2 className="section-title">Charts</h2>
              <div className="section-card">
                <ChartBuilder columns={columns} rows={rows} containerRef={chartContainerRef} />
              </div>
            </section>

            <section className="dashboard-section dashboard-map">
              <h2 className="section-title">Map</h2>
              <div className="section-card">
                <MapView columns={columns} rows={rows} containerRef={mapContainerRef} />
              </div>
            </section>
          </>
        )}
      </div>
      <DebugPanel />
    </div>
  );
}
