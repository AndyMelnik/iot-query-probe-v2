import React, { useState } from 'react';
import './ExportBar.css';

export function ExportBar({
  columns = [],
  rows = [],
  onExportXlsx,
  onExportReport,
  getChartSvg = () => null,
  getMapSvg = () => null,
}) {
  const [reportName, setReportName] = useState('IoT Query Report');
  const [reportDesc, setReportDesc] = useState('');
  const [exporting, setExporting] = useState(false);

  const colNames = columns.map(c => (typeof c === 'object' ? c.name : c));

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
          onChange={e => setReportName(e.target.value)}
        />
        <input
          type="text"
          className="report-desc-input"
          placeholder="Description (optional)"
          value={reportDesc}
          onChange={e => setReportDesc(e.target.value)}
        />
        <button type="button" className="btn-export" onClick={handleReport} disabled={exporting || !rows.length}>
          Generate HTML report
        </button>
      </div>
    </div>
  );
}
