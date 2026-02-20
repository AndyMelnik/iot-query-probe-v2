import { Router } from 'express';
import ExcelJS from 'exceljs';
import { auditLog } from '../lib/logger.js';

export const exportRouter = Router();

exportRouter.post('/xlsx', async (req, res) => {
  const { columns = [], rows = [], filename = 'export', filters } = req.body || {};
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    return res.status(400).json({ success: false, error: 'columns and rows required' });
  }

  const colNames = columns.map(c => (typeof c === 'object' && c?.name) || String(c));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Data');
  
  ws.addRow(colNames);
  ws.getRow(1).font = { bold: true };
  rows.forEach(row => {
    ws.addRow(colNames.map((_, i) => row[i]));
  });
  
  colNames.forEach((_, i) => {
    ws.getColumn(i + 1).width = 15;
  });

  const safeName = (filename || 'export').replace(/[^\w\-.]/g, '_').slice(0, 100);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);
  
  const buffer = await wb.xlsx.writeBuffer();
  res.send(buffer);

  auditLog('export_xlsx', { userId: req.user?.userId, rowCount: rows.length });
});
