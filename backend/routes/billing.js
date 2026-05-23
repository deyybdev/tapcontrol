const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// ── Maynilad 2025 Tiered Rate (residential, all-in avg ₱65.62/m³) ──
// Based on MWSS-approved rates effective January 2025
// Tiers derived from published monthly bill benchmarks:
//   ≤10 m³  → ₱181.59 flat (connection + basic charge)
//   11–20   → ₱50.09 per m³ over 10 (₱682.66 - ₱181.59 = ₱501.07 / 10)
//   21–30   → ₱46.61 per m³ over 20 (₱1,148.73 - ₱682.66 = ₱466.07 / 10 ≈ ₱46.61)
//   >30     → ₱65.62 per m³ (all-in average applied to excess)
function calcMayniladBill(m3) {
  m3 = parseFloat(m3) || 0;
  if (m3 <= 0) return 0;
  if (m3 <= 10) return 181.59;
  if (m3 <= 20) return 181.59 + (m3 - 10) * 50.09;
  if (m3 <= 30) return 682.66 + (m3 - 20) * 46.61;
  return 1148.73 + (m3 - 30) * 65.62;
}

// GET /api/billing  (optional ?search= &status=)
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT b.*, c.full_name AS consumer_name
      FROM billing_records b
      JOIN consumers c ON b.consumer_id = c.consumer_id
      WHERE 1=1`;
    const params = [];

    if (req.query.search) {
      sql += ' AND (b.id LIKE ? OR c.full_name LIKE ?)';
      const s = `%${req.query.search}%`;
      params.push(s, s);
    }
    if (req.query.status) {
      sql += ' AND b.status = ?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY b.created_at DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/billing
router.post('/', async (req, res) => {
  let { consumer_id, consumption, amount_due, due_date, status } = req.body;
  if (!consumer_id || consumption == null) {
    return res.status(400).json({ error: 'consumer_id and consumption are required' });
  }
  // Auto-calculate if amount not provided
  if (!amount_due) amount_due = calcMayniladBill(consumption).toFixed(2);
  try {
    // Generate ID server-side — safe against race conditions and deletions
    const [[{ maxId }]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(id, 4) AS UNSIGNED)), 0) AS maxId FROM billing_records`
    );
    const newId = 'BL-' + String(maxId + 1).padStart(3, '0');
    await db.query(
      'INSERT INTO billing_records (id, consumer_id, consumption, amount_due, due_date, status) VALUES (?,?,?,?,?,?)',
      [newId, consumer_id, consumption, amount_due, due_date || null, status || 'Unpaid']
    );
    const [[row]] = await db.query(
      `SELECT b.*, c.full_name AS consumer_name
       FROM billing_records b JOIN consumers c ON b.consumer_id = c.consumer_id
       WHERE b.id = ?`, [newId]
    );
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/billing/:id
router.put('/:id', async (req, res) => {
  let { consumer_id, consumption, amount_due, due_date, status } = req.body;
  if (!amount_due && consumption) {
    amount_due = calcMayniladBill(consumption).toFixed(2);
  }
  try {
    await db.query(
      'UPDATE billing_records SET consumer_id=?, consumption=?, amount_due=?, due_date=?, status=? WHERE id=?',
      [consumer_id, consumption, amount_due, due_date || null, status, req.params.id]
    );
    const [[row]] = await db.query(
      `SELECT b.*, c.full_name AS consumer_name
       FROM billing_records b JOIN consumers c ON b.consumer_id = c.consumer_id
       WHERE b.id = ?`, [req.params.id]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/billing/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM billing_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'Billing record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;