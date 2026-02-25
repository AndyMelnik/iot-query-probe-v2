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
const DEFAULT_COLORS = ['#58a6ff', '#3fb950', '#f0c674', '#f85149', '#bc8cff', '#79b8ff', '#56d364', '#e3b341'];

function inferNumeric(rows, colIndex) {
  if (!rows.length) return false;
  const v = rows[0][colIndex];
  return typeof v === 'number' || (typeof v === 'string' && /^-?\d*\.?\d+$/.test(String(v).trim()));
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
  const [chartTitle, setChartTitle] = useState('');
  const [legendPosition, setLegendPosition] = useState('bottom');
  const [customColors, setCustomColors] = useState({});

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

  const getColor = (key, index) => customColors[key] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

  const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 };

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
        {(chartType === 'line' || chartType === 'bar' || chartType === 'stacked_bar' || chartType === 'stacked_area') && (
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
          <>
            <label>
              Category
              <select value={groupField || xField} onChange={e => setGroupField(e.target.value)}>
                {colNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Value
              <select value={yField} onChange={e => setYField(e.target.value)}>
                {colNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Chart title
          <input
            type="text"
            className="chart-title-input"
            placeholder="Optional title"
            value={chartTitle}
            onChange={e => setChartTitle(e.target.value)}
          />
        </label>
        <label>
          Legend
          <select value={legendPosition} onChange={e => setLegendPosition(e.target.value)}>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </label>
      </div>
      {seriesKeys.length > 0 && seriesKeys.length <= 12 && (
        <div className="chart-colors">
          <span className="chart-colors-label">Colors:</span>
          {seriesKeys.slice(0, 12).map((key, i) => (
            <label key={key} className="chart-color-swatch">
              <span className="chart-color-name">{key}</span>
              <input
                type="color"
                value={getColor(key, i)}
                onChange={e => setCustomColors(c => ({ ...c, [key]: e.target.value }))}
                title={key}
              />
            </label>
          ))}
        </div>
      )}
      <div className="chart-builder-canvas" ref={containerRef}>
        {chartTitle && <div className="chart-custom-title">{chartTitle}</div>}
        <ResponsiveContainer width="100%" height={360}>
          {chartType === 'line' && (
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <YAxis stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign={legendPosition === 'top' ? 'top' : 'bottom'} />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Line key={key} type="monotone" dataKey={key} name={key} stroke={getColor(key, i)} dot={false} />
              ))}
            </LineChart>
          )}
          {chartType === 'bar' && (
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <YAxis stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign={legendPosition === 'top' ? 'top' : 'bottom'} />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Bar key={key} dataKey={key} name={key} fill={getColor(key, i)} />
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
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={getColor(chartData[i].name, i)} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, '']} />
              <Legend verticalAlign={legendPosition === 'top' ? 'top' : 'bottom'} />
            </PieChart>
          )}
          {chartType === 'stacked_bar' && (
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <YAxis stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign={legendPosition === 'top' ? 'top' : 'bottom'} />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Bar key={key} dataKey={key} name={key} stackId="1" fill={getColor(key, i)} />
              ))}
            </BarChart>
          )}
          {chartType === 'stacked_area' && (
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3a4d" />
              <XAxis dataKey={xField} stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <YAxis stroke="#8b9cb6" tick={{ fill: '#8b9cb6' }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign={legendPosition === 'top' ? 'top' : 'bottom'} />
              {seriesKeys.slice(0, 8).map((key, i) => (
                <Area key={key} type="monotone" dataKey={key} name={key} stackId="1" stroke={getColor(key, i)} fill={getColor(key, i)} fillOpacity={0.6} />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
