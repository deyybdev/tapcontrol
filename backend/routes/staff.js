const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/staff  (optional ?search= &district= &role=)
router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT * FROM staff WHERE 1=1';
    const params = [];

    if (req.query.search) {
      sql += ' AND (name LIKE ? OR role LIKE ? OR staff_id LIKE ?)';
      const s = `%${req.query.search}%`;
      params.push(s, s, s);
    }
    if (req.query.district) {
      sql += ' AND district_id = ?';
      params.push(req.query.district);
    }
    if (req.query.role) {
      sql += ' AND role = ?';
      params.push(req.query.role);
    }
    sql += ' ORDER BY date_hired DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff
router.post('/', async (req, res) => {
  const { staff_id, name, role, district_id, contact, status } = req.body;
  if (!staff_id || !name) return res.status(400).json({ error: 'staff_id and name are required' });
  try {
    await db.query(
      'INSERT INTO staff (staff_id, name, role, district_id, contact, status) VALUES (?,?,?,?,?,?)',
      [staff_id, name, role || 'Meter Reader', district_id || null, contact || null, status || 'Active']
    );
    const [[row]] = await db.query('SELECT * FROM staff WHERE staff_id = ?', [staff_id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/staff/:id
router.put('/:id', async (req, res) => {
  const { name, role, district_id, contact, status } = req.body;
  try {
    await db.query(
      'UPDATE staff SET name=?, role=?, district_id=?, contact=?, status=? WHERE staff_id=?',
      [name, role, district_id || null, contact || null, status, req.params.id]
    );
    const [[row]] = await db.query('SELECT * FROM staff WHERE staff_id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM staff WHERE staff_id = ?', [req.params.id]);
    res.json({ message: 'Staff member deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
