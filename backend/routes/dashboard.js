const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

router.get('/', async (req, res) => {
  try {
    const [[{ total_consumers }]] = await db.query(
      'SELECT COUNT(*) AS total_consumers FROM consumers'
    );

    const [[{ unpaid_total }]] = await db.query(
      "SELECT COALESCE(SUM(amount_due),0) AS unpaid_total FROM billing_records WHERE status != 'Paid'"
    );

    const [[{ collected }]] = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS collected FROM payments
       WHERE MONTH(payment_date) = MONTH(CURDATE())
         AND YEAR(payment_date)  = YEAR(CURDATE())`
    );

    const [[{ open_requests }]] = await db.query(
      "SELECT COUNT(*) AS open_requests FROM service_requests WHERE status = 'Open'"
    );

    const [recent_consumers] = await db.query(
      `SELECT consumer_id, full_name, district_id, status
       FROM consumers
       ORDER BY date_created DESC, consumer_id DESC
       LIMIT 5`
    );

    const [district_stats] = await db.query(
      `SELECT d.id, d.name,
              COUNT(DISTINCT c.consumer_id) AS consumer_count,
              COALESCE(SUM(mr.curr_reading - mr.prev_reading), 0) AS total_usage
       FROM districts d
       LEFT JOIN consumers c ON c.district_id = d.id
       LEFT JOIN meter_readings mr ON mr.district_id = d.id
       GROUP BY d.id, d.name
       ORDER BY d.id`
    );

    res.json({
      total_consumers,
      unpaid_total,
      collected,
      open_requests,
      recent_consumers,
      district_stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
