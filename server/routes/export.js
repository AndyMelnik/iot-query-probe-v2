import { Router } from 'express';
import writeXlsxFile from 'write-excel-file/node';
import { auditLog } from '../lib/logger.js';

export const exportRouter = Router();

exportRouter.post('/xlsx', async (req, res) => {
  const { columns = [], rows = [], filename = 'export' } = req.body || {};
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    return res.status(400).json({ success: false, error: 'columns and rows required' });
  }

  const colNames = columns.map(c => (typeof c === 'object' && c?.name) || String(c));
  const headerRow = colNames.map(c => ({ value: c, fontWeight: 'bold' }));
  const dataRows = rows.map(row => colNames.map((_, i) => ({ value: row[i] ?? '' })));
  const data = [headerRow, ...dataRows];

  const safeName = (filename || 'export').replace(/[^\w\-.]/g, '_').slice(0, 100);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.xlsx"`);

  const buffer = await writeXlsxFile(data, { buffer: true });
  res.send(buffer);

  auditLog('export_xlsx', { userId: req.user?.userId, rowCount: rows.length });
});
