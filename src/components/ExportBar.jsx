import React, { useState, useRef } from 'react';
import './ExportBar.css';

export function ExportBar({
  columns = [],
  rows = [],
  reportName = 'IoT Query Report',
  reportDesc = '',
  onReportNameChange,
  onReportDescChange,
  onExportXlsx,
  onExportReport,
  onExportJson,
  onImportJson,
  getChartSvg = () => null,
  getMapSvg = () => null,
}) {
  const [exporting, setExporting] = useState(false);
  const importInputRef = useRef(null);

  const handleXlsx = async () => {
    setExporting(true);
    try {
      await onExportXlsx(columns, rows, 'iot-query-export');
    } finally {
      setExporting(false);
    }
  };

  const handleReport = async () => {
    setExporting(true);
    try {
      const chartSvgs = [];
      const chartSvg = getChartSvg?.();
      if (chartSvg) chartSvgs.push(chartSvg);
      const mapSvg = getMapSvg?.();
      await onExportReport({
        reportName,
        description: reportDesc,
        columns,
        rows,
        chartSvgs,
        mapSvg: mapSvg || undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = () => {
    const payload = onExportJson?.();
    if (!payload) return;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iot-query-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        onImportJson?.(data);
      } catch (err) {
        console.error('Invalid report JSON:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="export-bar">
      <button type="button" className="btn-export" onClick={handleXlsx} disabled={exporting || !rows.length}>
        Export to Excel (.xlsx)
      </button>
      <div className="export-report">
        <input
          type="text"
          className="report-name-input"
          placeholder="Report name"
          value={reportName}
          onChange={e => onReportNameChange?.(e.target.value)}
        />
        <input
          type="text"
          className="report-desc-input"
          placeholder="Description (optional)"
          value={reportDesc}
          onChange={e => onReportDescChange?.(e.target.value)}
        />
        <button type="button" className="btn-export" onClick={handleReport} disabled={exporting || !rows.length}>
          Generate HTML report
        </button>
      </div>
      <div className="export-json-actions">
        <button type="button" className="btn-export btn-export-secondary" onClick={handleExportJson}>
          Export report JSON
        </button>
        <button
          type="button"
          className="btn-export btn-export-secondary"
          onClick={() => importInputRef.current?.click()}
        >
          Import report JSON
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="export-import-input"
          onChange={handleImportJson}
        />
      </div>
    </div>
  );
}
