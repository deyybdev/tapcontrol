const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/meters  (optional ?search= &district=)
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT m.*, c.full_name AS consumer_name
      FROM meter_readings m
      JOIN consumers c ON m.consumer_id = c.consumer_id
      WHERE 1=1`;
    const params = [];

    if (req.query.search) {
      sql += ' AND (m.meter_no LIKE ? OR c.full_name LIKE ?)';
      const s = `%${req.query.search}%`;
      params.push(s, s);
    }
    if (req.query.district) {
      sql += ' AND m.district_id = ?';
      params.push(req.query.district);
    }
    sql += ' ORDER BY m.reading_date DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meters
router.post('/', async (req, res) => {
  const { id, meter_no, consumer_id, district_id, prev_reading, curr_reading, reading_date, reader_name } = req.body;
  if (!id || !meter_no || !consumer_id || curr_reading == null) {
    return res.status(400).json({ error: 'id, meter_no, consumer_id, curr_reading are required' });
  }
  if (parseFloat(curr_reading) < parseFloat(prev_reading || 0)) {
    return res.status(400).json({ error: 'Current reading must be >= previous reading' });
  }
  try {
    await db.query(
      `INSERT INTO meter_readings
         (id, meter_no, consumer_id, district_id, prev_reading, curr_reading, reading_date, reader_name)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, meter_no, consumer_id, district_id, prev_reading || 0,
       curr_reading, reading_date || new Date(), reader_name || null]
    );
    const [[row]] = await db.query('SELECT * FROM meter_readings WHERE id = ?', [id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/meters/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM meter_readings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Meter reading deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
