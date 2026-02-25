import React, { useRef, useEffect, useState } from 'react';
import { parseSqlVariables } from '../lib/sqlVariables.js';
import './SQLEditor.css';

export function SQLEditor({ value, onChange, onRun, loading, variables = {}, onVariablesChange }) {
  const textareaRef = useRef(null);
  const [variablesOpen, setVariablesOpen] = useState(false);

  const varNames = parseSqlVariables(value);

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

  const setVar = (name, val) => {
    onVariablesChange?.({ ...variables, [name]: val });
  };

  return (
    <div className="sql-editor">
      {varNames.length > 0 && (
        <div className="sql-accordion">
          <button
            type="button"
            className="sql-accordion-header"
            onClick={() => setVariablesOpen(v => !v)}
            aria-expanded={variablesOpen}
          >
            <span>Variables</span>
            <span className="sql-accordion-icon">{variablesOpen ? '▼' : '▶'}</span>
          </button>
          {variablesOpen && (
            <div className="sql-accordion-body">
              {varNames.map(name => (
                <label key={name} className="sql-variable-row">
                  <span className="sql-variable-name">{name}</span>
                  <input
                    type="text"
                    className="sql-variable-input"
                    value={variables[name] ?? ''}
                    onChange={e => setVar(name, e.target.value)}
                    placeholder={`{{${name}}}`}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="sql-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="SELECT * FROM ... Use {{variable_name}} for parameters"
        spellCheck={false}
        rows={8}
      />
      <div className="sql-editor-footer">
        <button type="button" className="btn-run" onClick={onRun} disabled={loading}>
          {loading ? 'Running…' : 'Run (Ctrl+Enter)'}
        </button>
      </div>
    </div>
  );
}
