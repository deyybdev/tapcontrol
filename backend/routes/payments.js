const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/payments  (optional ?search= &method=)
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT p.*, c.full_name AS consumer_name
      FROM payments p
      JOIN consumers c ON p.consumer_id = c.consumer_id
      WHERE 1=1`;
    const params = [];

    if (req.query.search) {
      sql += ' AND (p.id LIKE ? OR c.full_name LIKE ? OR p.bill_id LIKE ?)';
      const s = `%${req.query.search}%`;
      params.push(s, s, s);
    }
    if (req.query.method) {
      sql += ' AND p.method = ?';
      params.push(req.query.method);
    }
    sql += ' ORDER BY p.payment_date DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments
router.post('/', async (req, res) => {
  const { consumer_id, bill_id, amount, method, payment_date, received_by } = req.body;
  if (!consumer_id || !bill_id || !amount) {
    return res.status(400).json({ error: 'consumer_id, bill_id, and amount are required' });
  }
  try {
    // Generate ID server-side — safe against race conditions and deletions
    const [[{ maxId }]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(id, 5) AS UNSIGNED)), 0) AS maxId FROM payments`
    );
    const newId = 'PAY-' + String(maxId + 1).padStart(3, '0');

    await db.query(
      'INSERT INTO payments (id, consumer_id, bill_id, amount, method, payment_date, received_by) VALUES (?,?,?,?,?,?,?)',
      [newId, consumer_id, bill_id, amount, method || 'Cash', payment_date || new Date(), received_by || null]
    );
    // Auto-mark the bill as Paid
    await db.query("UPDATE billing_records SET status='Paid' WHERE id=?", [bill_id]);

    const [[row]] = await db.query(
      `SELECT p.*, c.full_name AS consumer_name
       FROM payments p JOIN consumers c ON p.consumer_id = c.consumer_id
       WHERE p.id = ?`, [newId]
    );
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  const { consumer_id, bill_id, amount, method, received_by } = req.body;
  try {
    await db.query(
      'UPDATE payments SET consumer_id=?, bill_id=?, amount=?, method=?, received_by=? WHERE id=?',
      [consumer_id, bill_id, amount, method, received_by || null, req.params.id]
    );
    const [[row]] = await db.query(
      `SELECT p.*, c.full_name AS consumer_name
       FROM payments p JOIN consumers c ON p.consumer_id = c.consumer_id
       WHERE p.id = ?`, [req.params.id]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM payments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Payment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;