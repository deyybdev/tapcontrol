const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/service-requests  (optional ?search= &status=)
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT sr.*, c.full_name AS consumer_name
      FROM service_requests sr
      JOIN consumers c ON sr.consumer_id = c.consumer_id
      WHERE 1=1`;
    const params = [];

    if (req.query.search) {
      sql += ' AND (sr.id LIKE ? OR c.full_name LIKE ? OR sr.type LIKE ?)';
      const s = `%${req.query.search}%`;
      params.push(s, s, s);
    }
    if (req.query.status) {
      sql += ' AND sr.status = ?';
      params.push(req.query.status);
    }
    sql += ' ORDER BY sr.filed_date DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/service-requests
router.post('/', async (req, res) => {
  const { id, consumer_id, type, priority, assigned_to } = req.body;
  if (!id || !consumer_id) {
    return res.status(400).json({ error: 'id and consumer_id are required' });
  }
  try {
    await db.query(
      `INSERT INTO service_requests (id, consumer_id, type, priority, assigned_to, status)
       VALUES (?,?,?,?,?,'Open')`,
      [id, consumer_id, type || 'Other', priority || 'Low', assigned_to || null]
    );
    const [[row]] = await db.query(
      `SELECT sr.*, c.full_name AS consumer_name
       FROM service_requests sr JOIN consumers c ON sr.consumer_id = c.consumer_id
       WHERE sr.id = ?`, [id]
    );
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/service-requests/:id/resolve  — quick resolve from table row
router.patch('/:id/resolve', async (req, res) => {
  try {
    await db.query("UPDATE service_requests SET status='Resolved' WHERE id=?", [req.params.id]);
    res.json({ message: 'Request resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/service-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM service_requests WHERE id = ?', [req.params.id]);
    res.json({ message: 'Service request deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
