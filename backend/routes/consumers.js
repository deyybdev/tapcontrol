const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/consumers  (optional ?search= &district= &type=)
router.get('/', async (req, res) => {
  try {
    let sql    = 'SELECT * FROM consumers WHERE 1=1';
    const params = [];

    if (req.query.search) {
      sql += ' AND (full_name LIKE ? OR consumer_id LIKE ? OR address LIKE ? OR contact_number LIKE ?)';
      const s = `%${req.query.search}%`;
      params.push(s, s, s, s);
    }
    if (req.query.district) {
      sql += ' AND district_id = ?';
      params.push(req.query.district);
    }
    if (req.query.type) {
      sql += ' AND account_type = ?';
      params.push(req.query.type);
    }
    sql += ' ORDER BY date_created DESC';

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/consumers
router.post('/', async (req, res) => {
  const { district_id, full_name, address, contact_number, account_type, status } = req.body;
  if (!full_name || !address || !contact_number) {
    return res.status(400).json({ error: 'full_name, address, contact_number are required' });
  }
  try {
    // Auto-generate consumer_id from the highest existing one (numeric sort, safe after deletions)
    const [[lastConsumer]] = await db.query(
      `SELECT consumer_id FROM consumers ORDER BY CAST(SUBSTRING_INDEX(consumer_id, '-', -1) AS UNSIGNED) DESC LIMIT 1`
    );
    let nextNum = 1;
    if (lastConsumer && lastConsumer.consumer_id) {
      const match = lastConsumer.consumer_id.match(/C-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const consumer_id = 'C-' + String(nextNum).padStart(3, '0');

    // Auto-generate meter number from the highest existing one (numeric sort)
    const [[lastMeter]] = await db.query(
      `SELECT meter_no FROM consumers WHERE meter_no IS NOT NULL ORDER BY CAST(SUBSTRING_INDEX(meter_no, '-', -1) AS UNSIGNED) DESC LIMIT 1`
    );
    let nextMeterNum = 1;
    if (lastMeter && lastMeter.meter_no) {
      const match = lastMeter.meter_no.match(/MTR-(\d+)/);
      if (match) nextMeterNum = parseInt(match[1]) + 1;
    }
    const meter_no = 'MTR-' + String(nextMeterNum).padStart(5, '0');

    await db.query(
      `INSERT INTO consumers
         (consumer_id, district_id, full_name, address, contact_number, meter_no, account_type, status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [consumer_id, district_id, full_name, address, contact_number, meter_no,
       account_type || 'Residential', status || 'Active']
    );
    // Keep district consumer_count in sync
    await db.query(
      `UPDATE districts SET consumer_count = (SELECT COUNT(*) FROM consumers WHERE district_id = ?) WHERE id = ?`,
      [district_id, district_id]
    );
    const [[row]] = await db.query('SELECT * FROM consumers WHERE consumer_id = ?', [consumer_id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { district_id, full_name, address, contact_number, account_type, status } = req.body;
  try {
    // Get the old district_id before updating (consumer may be moving districts)
    const [[existing]] = await db.query('SELECT district_id FROM consumers WHERE consumer_id = ?', [req.params.id]);
    const old_district_id = existing ? existing.district_id : null;

    await db.query(
      `UPDATE consumers
       SET district_id=?, full_name=?, address=?, contact_number=?, account_type=?, status=?
       WHERE consumer_id=?`,
      [district_id, full_name, address, contact_number, account_type, status, req.params.id]
    );

    // Update consumer_count for the new district
    await db.query(
      `UPDATE districts SET consumer_count = (SELECT COUNT(*) FROM consumers WHERE district_id = ?) WHERE id = ?`,
      [district_id, district_id]
    );
    // If district changed, also update the old district's count
    if (old_district_id && old_district_id !== district_id) {
      await db.query(
        `UPDATE districts SET consumer_count = (SELECT COUNT(*) FROM consumers WHERE district_id = ?) WHERE id = ?`,
        [old_district_id, old_district_id]
      );
    }

    const [[row]] = await db.query('SELECT * FROM consumers WHERE consumer_id = ?', [req.params.id]);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/consumers/:id
// Child rows (meter_readings, billing_records, payments, service_requests) are
// removed automatically via ON DELETE CASCADE in the schema.
router.delete('/:id', async (req, res) => {
  try {
    // Get district_id before deleting so we can update the count
    const [[existing]] = await db.query('SELECT district_id FROM consumers WHERE consumer_id = ?', [req.params.id]);
    const district_id = existing ? existing.district_id : null;

    const [result] = await db.query('DELETE FROM consumers WHERE consumer_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Consumer not found' });
    }

    // Update the district's consumer count
    if (district_id) {
      await db.query(
        `UPDATE districts SET consumer_count = (SELECT COUNT(*) FROM consumers WHERE district_id = ?) WHERE id = ?`,
        [district_id, district_id]
      );
    }

    res.json({ message: 'Consumer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
