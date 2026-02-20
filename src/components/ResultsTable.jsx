import React, { useState, useMemo } from 'react';
import './ResultsTable.css';

const PAGE_SIZE = 100;

export function ResultsTable({ columns = [], rows = [] }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);
  const [filterVals, setFilterVals] = useState({});
  const [hiddenCols, setHiddenCols] = useState(new Set());
  const [page, setPage] = useState(0);

  const colNames = useMemo(() => columns.map(c => (typeof c === 'object' ? c.name : c)), [columns]);

  const filtered = useMemo(() => {
    let data = rows;
    const hasFilter = colNames.some(c => filterVals[c]?.trim());
    if (hasFilter) {
      data = data.filter(row =>
        colNames.every((col, i) => {
          const f = filterVals[col]?.trim();
          if (!f) return true;
          const cell = row[i];
          return String(cell ?? '').toLowerCase().includes(f.toLowerCase());
        })
      );
    }
    if (sortKey != null) {
      const i = colNames.indexOf(sortKey);
      if (i >= 0) {
        data = [...data].sort((a, b) => {
          const va = a[i];
          const vb = b[i];
          const cmp = va == null && vb == null ? 0 : va == null ? 1 : vb == null ? -1 : va < vb ? -1 : va > vb ? 1 : 0;
          return sortDir * cmp;
        });
      }
    }
    return data;
  }, [rows, colNames, filterVals, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const visibleCols = colNames.filter(c => !hiddenCols.has(c));

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const toggleCol = (key) => {
    setHiddenCols(s => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="results-table-wrap">
      <div className="results-table-meta">
        {filtered.length} rows (page {currentPage + 1} of {totalPages})
      </div>
      <div className="results-table-scroll">
        <table className="results-table">
          <thead>
            <tr>
              {visibleCols.map(col => (
                <th key={col}>
                  <span
                    className="th-sort"
                    onClick={() => toggleSort(col)}
                    role="button"
                    tabIndex={0}
                  >
                    {col}
                    {sortKey === col && (sortDir === 1 ? ' ↑' : ' ↓')}
                  </span>
                  <button type="button" className="th-hide" onClick={() => toggleCol(col)} title="Hide column">×</button>
                </th>
              ))}
              <th className="th-actions" />
            </tr>
            <tr className="filter-row">
              {visibleCols.map(col => (
                <td key={col}>
                  <input
                    type="text"
                    className="filter-input"
                    placeholder="Filter"
                    value={filterVals[col] ?? ''}
                    onChange={e => setFilterVals(f => ({ ...f, [col]: e.target.value }))}
                  />
                </td>
              ))}
              <td />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => (
              <tr key={ri}>
                {visibleCols.map((col, ci) => {
                  const idx = colNames.indexOf(col);
                  return <td key={col}>{String(row[idx] ?? '')}</td>;
                })}
                <td className="td-actions" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="results-table-footer">
        <button
          type="button"
          disabled={currentPage === 0}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </button>
        <span>Page {currentPage + 1} of {totalPages}</span>
        <button
          type="button"
          disabled={currentPage >= totalPages - 1}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
      {colNames.some(c => hiddenCols.has(c)) && (
        <div className="results-table-hidden">
          Hidden: {colNames.filter(c => hiddenCols.has(c)).map(c => (
            <button key={c} type="button" onClick={() => toggleCol(c)}>{c}</button>
          ))}
        </div>
      )}
    </div>
  );
}
