import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import './ChartBuilder.css';

const CHART_TYPES = ['line', 'bar', 'pie', 'stacked_bar', 'stacked_area'];
const COLORS = ['#58a6ff', '#3fb950', '#f0c674', '#f85149', '#bc8cff', '#79b8ff', '#56d364', '#e3b341'];

function inferNumeric(rows, colIndex) {
  if (!rows.length) return false;
  const v = rows[0][colIndex];
  return typeof v === 'number' || (typeof v === 'string' && /^-?\d*\.?\d+$/.test(v.trim()));
}

function inferNumericColumns(columns, rows) {
  const colNames = columns.map(c => (typeof c === 'object' ? c.name : c));
  return colNames
    .map((name, i) => ({ name, i, numeric: inferNumeric(rows, i) }))
    .filter(x => x.numeric);
}

export function ChartBuilder({ columns = [], rows = [], containerRef }) {
  const colNames = useMemo(() => columns.map(c => (typeof c === 'object' ? c.name : c)), [columns]);
  const numericCols = useMemo(() => inferNumericColumns(columns, rows), [columns, rows]);

  const [chartType, setChartType] = useState('line');
  const [xField, setXField] = useState(colNames[0] || '');
  const [yField, setYField] = useState(numericCols[0]?.name || colNames[1] || '');
  const [groupField, setGroupField] = useState(colNames[2] || '');

  const chartData = useMemo(() => {
    if (!rows.length || !xField) return [];
    const xi = colNames.indexOf(xField);
    const yi = colNames.indexOf(yField);
    const gi = groupField ? colNames.indexOf(groupField) : -1;
    if (xi < 0) return [];

    if (chartType === 'pie') {
      const catIdx = groupField ? gi : xi;
      const valIdx = groupField ? yi : (numericCols[0]?.i ?? yi);
      if (catIdx < 0 || valIdx < 0) return [];
      const map = new Map();
      rows.forEach(row => {
        const k = String(row[catIdx] ?? '');
        const v = Number(row[valIdx]) || 0;
        map.set(k, (map.get(k) || 0) + v);
      });
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    }

    const keyFn = row => String(row[xi] ?? '');
    const groups = new Map();
    rows.forEach(row => {
      const key = keyFn(row);
      const g = gi >= 0 ? String(row[gi] ?? '') : '_';
      if (!groups.has(key)) groups.set(key, { [xField]: key });
      const obj = groups.get(key);
      const yVal = yi >= 0 ? Number(row[yi]) : 1;
      if (g === '_') {
        obj[yField] = (obj[yField] || 0) + yVal;
      } else {
        obj[g] = (obj[g] || 0) + yVal;
      }
    });
    return Array.from(groups.values());
  }, [rows, colNames, xField, yField, groupField, chartType, numericCols]);

  const seriesKeys = useMemo(() => {
    if (chartData.length === 0) return [];
    const keys = new Set();
    chartData.forEach(d => Object.keys(d).forEach(k => { if (k !== xField) keys.add(k); }));
    return Array.from(keys);
  }, [chartData, xField]);

  return (
    <div className="chart-builder">
      <div className="chart-builder-controls">
        <label>
          Type
          <select value={chartType} onChange={e => setChartType(e.target.value)}>
            {CHART_TYPES.map(t => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label>
          X / Category
          <select value={xField} onChange={e => setXField(e.target.value)}>
            {colNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        {(chartType === 'line' || chartType === 'bar' || chartType.startsWith('stacked')) && (
          <label>
            Y / Value
            <select value={yField} onChange={e => setYField(e.target.value)}>
              {colNames.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        {(chartType === 'stacked_bar' || chartType === 'stacked_area') && (
          <label>
            Group / Series
            <select value={groupField} onChange={e => setGroupField(e.target.value)}>
            <option value="">—</option>
              {colNames.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        {chartType === 'pie' && (
          <label>
            Value
            <select value={yField} onChange={e => setYField(e.target.value)}>
              {colNames.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="chart-builder-canvas" ref={containerRef}>
        <ResponsiveContainer width="100%" height={320}>
          {chartType === 'line' && (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" />
              <YAxis stroke="#8b9cb6" />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <Legend />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} dot={false} />
              ))}
            </LineChart>
          )}
          {chartType === 'bar' && (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" />
              <YAxis stroke="#8b9cb6" />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <Legend />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          )}
          {chartType === 'pie' && (
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <Legend />
            </PieChart>
          )}
          {chartType === 'stacked_bar' && (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" />
              <YAxis stroke="#8b9cb6" />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <Legend />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Bar key={key} dataKey={key} stackId="1" fill={COLORS[i % COLORS.length]} />
              ))}
            </BarChart>
          )}
          {chartType === 'stacked_area' && (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" />
              <YAxis stroke="#8b9cb6" />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <Legend />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.6} />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
