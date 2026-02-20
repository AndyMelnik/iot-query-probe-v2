import React, { useState, useEffect, useRef } from 'react';
import './DebugPanel.css';

const MAX_LOGS = 100;

export function DebugPanel() {
  const [logs, setLogs] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    const addLog = (level, args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      setLogs(prev => {
        const newLogs = [...prev, {
          timestamp: new Date().toISOString(),
          level,
          message,
        }].slice(-MAX_LOGS);
        return newLogs;
      });
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog('info', args);
    };

    console.debug = (...args) => {
      originalDebug(...args);
      addLog('debug', args);
    };

    // Log initial state
    addLog('info', ['Debug panel initialized']);
    
    // Log browser info
    addLog('info', ['Browser:', navigator.userAgent]);
    addLog('info', ['URL:', window.location.href]);
    addLog('info', ['Cookies:', document.cookie || 'No cookies']);
    
    // Log CSRF token from cookie
    const cookies = document.cookie.split(';').map(c => c.trim());
    const csrfCookie = cookies.find(c => c.startsWith('iqp_csrf='));
    if (csrfCookie) {
      addLog('info', ['CSRF cookie found:', csrfCookie.split('=')[1].substring(0, 20) + '...']);
    } else {
      addLog('warn', ['CSRF cookie not found']);
    }
    
    // Log auth token status
    try {
      const authToken = localStorage.getItem('auth_token');
      if (authToken) {
        addLog('info', ['Auth token found:', authToken.substring(0, 20) + '...']);
      } else {
        addLog('info', ['No auth token in localStorage']);
      }
    } catch (e) {
      addLog('warn', ['Cannot access localStorage:', e.message]);
    }

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  const exportLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <button 
        className="debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Open debug panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <h3>Debug Panel</h3>
        <div className="debug-panel-controls">
          <label>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          <button onClick={clearLogs}>Clear</button>
          <button onClick={exportLogs}>Export</button>
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      </div>
      <div className="debug-panel-content">
        {logs.map((log, i) => (
          <div key={i} className={`debug-log debug-log-${log.level}`}>
            <span className="debug-log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
            <span className="debug-log-level">{log.level}</span>
            <pre className="debug-log-message">{log.message}</pre>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
