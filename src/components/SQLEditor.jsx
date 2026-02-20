import React, { useRef, useEffect } from 'react';
import './SQLEditor.css';

export function SQLEditor({ value, onChange, onRun, loading, history = [] }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onRun();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [onRun]);

  return (
    <div className="sql-editor">
      <div className="sql-editor-toolbar">
        <button type="button" className="btn-run" onClick={onRun} disabled={loading}>
          {loading ? 'Running…' : 'Run (Ctrl+Enter)'}
        </button>
        {history.length > 0 && (
          <select
            className="history-select"
            onChange={(e) => {
              const v = e.target.value;
              if (v) onChange(v);
            }}
            value=""
          >
            <option value="">History</option>
            {history.slice(0, 15).map((h, i) => (
              <option key={i} value={h.sql}>
                {h.sql.slice(0, 60)}…
              </option>
            ))}
          </select>
        )}
      </div>
      <textarea
        ref={textareaRef}
        className="sql-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SELECT * FROM ..."
        spellCheck={false}
        rows={8}
      />
    </div>
  );
}
