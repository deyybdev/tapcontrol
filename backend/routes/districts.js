const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/districts — returns limits + live computed stats
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.name, d.status,
             d.max_capacity_m3, d.max_consumers,
             COUNT(DISTINCT c.consumer_id)                        AS actual_consumers,
             COALESCE(SUM(mr.curr_reading - mr.prev_reading), 0)  AS actual_usage_m3
      FROM districts d
      LEFT JOIN consumers     c  ON c.district_id  = d.id
      LEFT JOIN meter_readings mr ON mr.district_id = d.id
      GROUP BY d.id, d.name, d.status, d.max_capacity_m3, d.max_consumers
      ORDER BY d.id
    `);

    // Compute percentages and auto-derive status
    const result = rows.map(d => {
      const usagePct    = d.max_capacity_m3 > 0
        ? Math.min(Math.round((d.actual_usage_m3 / d.max_capacity_m3) * 100), 100) : 0;
      const consumerPct = d.max_consumers > 0
        ? Math.min(Math.round((d.actual_consumers / d.max_consumers) * 100), 100) : 0;
      const maxPct = Math.max(usagePct, consumerPct);
      const autoStatus = maxPct >= 90 ? 'Critical' : maxPct >= 75 ? 'Near Limit' : 'Operational';
      return {
        id:               d.id,
        name:             d.name,
        status:           autoStatus,
        max_capacity_m3:  d.max_capacity_m3,
        max_consumers:    d.max_consumers,
        actual_consumers: d.actual_consumers,
        actual_usage_m3:  d.actual_usage_m3,
        usage_pct:        usagePct,
        consumer_pct:     consumerPct,
        // legacy field so other pages still work
        consumer_count:   d.actual_consumers,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/districts
router.post('/', async (req, res) => {
  const { name, max_capacity_m3, max_consumers } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    // Generate ID server-side from highest existing numeric suffix — never collides
    const [[{ maxId }]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(id, 2) AS UNSIGNED)), 0) AS maxId FROM districts`
    );
    const newId = 'D' + String(maxId + 1).padStart(2, '0');
    await db.query(
      `INSERT INTO districts (id, name, max_capacity_m3, max_consumers, status)
       VALUES (?, ?, ?, ?, 'Operational')`,
      [newId, name, max_capacity_m3 || 1000, max_consumers || 500]
    );
    const [[row]] = await db.query('SELECT * FROM districts WHERE id = ?', [newId]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/districts/:id
router.put('/:id', async (req, res) => {
  const { name, max_capacity_m3, max_consumers } = req.body;
  try {
    await db.query(
      `UPDATE districts SET name=?, max_capacity_m3=?, max_consumers=? WHERE id=?`,
      [name, max_capacity_m3 || 1000, max_consumers || 500, req.params.id]
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

// PATCH /api/districts/:id/consumer-count — called by consumers route to keep count in sync
router.patch('/:id/consumer-count', async (req, res) => {
  try {
    await db.query(
      `UPDATE districts SET consumer_count = (SELECT COUNT(*) FROM consumers WHERE district_id = ?) WHERE id = ?`,
      [req.params.id, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
