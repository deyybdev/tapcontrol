const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/districts
router.get('/', async (req, res) => {
  try {
    // Always compute live consumer_count from the consumers table so it's never stale
    const [rows] = await db.query(`
      SELECT d.*,
             COUNT(c.consumer_id) AS consumer_count
      FROM districts d
      LEFT JOIN consumers c ON c.district_id = d.id
      GROUP BY d.id
      ORDER BY d.id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/districts
router.post('/', async (req, res) => {
  const { id, name, usage_pct, consumer_count, status } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name are required' });
  try {
    await db.query(
      'INSERT INTO districts (id, name, usage_pct, consumer_count, status) VALUES (?,?,?,?,?)',
      [id, name, usage_pct || 0, consumer_count || 0, status || 'Operational']
    );
    const [[row]] = await db.query('SELECT * FROM districts WHERE id = ?', [id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/districts/:id
router.put('/:id', async (req, res) => {
  const { name, usage_pct, consumer_count, status } = req.body;
  try {
    await db.query(
      'UPDATE districts SET name=?, usage_pct=?, consumer_count=?, status=? WHERE id=?',
      [name, usage_pct, consumer_count, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM districts WHERE id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/districts/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM districts WHERE id = ?', [req.params.id]);
    res.json({ message: 'District deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
