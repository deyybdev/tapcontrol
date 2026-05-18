const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

const RATE_PER_M3 = 0.76;

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
  let { id, consumer_id, consumption, amount_due, due_date, status } = req.body;
  if (!id || !consumer_id || consumption == null) {
    return res.status(400).json({ error: 'id, consumer_id, and consumption are required' });
  }
  // Auto-calculate if amount not provided
  if (!amount_due) amount_due = (parseFloat(consumption) * RATE_PER_M3).toFixed(2);
  try {
    await db.query(
      'INSERT INTO billing_records (id, consumer_id, consumption, amount_due, due_date, status) VALUES (?,?,?,?,?,?)',
      [id, consumer_id, consumption, amount_due, due_date || null, status || 'Unpaid']
    );
    const [[row]] = await db.query(
      `SELECT b.*, c.full_name AS consumer_name
       FROM billing_records b JOIN consumers c ON b.consumer_id = c.consumer_id
       WHERE b.id = ?`, [id]
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
    amount_due = (parseFloat(consumption) * RATE_PER_M3).toFixed(2);
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
