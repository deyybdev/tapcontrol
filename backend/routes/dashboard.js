const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/dashboard  — summary stats for the index page
router.get('/', async (req, res) => {
  try {
    const [[{ total_consumers }]] = await db.query('SELECT COUNT(*) AS total_consumers FROM consumers');
    const [[{ unpaid_total }]]    = await db.query("SELECT COALESCE(SUM(amount_due),0) AS unpaid_total FROM billing_records WHERE status != 'Paid'");
    const [[{ collected }]]       = await db.query("SELECT COALESCE(SUM(amount),0) AS collected FROM payments WHERE MONTH(payment_date) = MONTH(CURRENT_DATE) AND YEAR(payment_date) = YEAR(CURRENT_DATE)");
    const [[{ open_requests }]]   = await db.query("SELECT COUNT(*) AS open_requests FROM service_requests WHERE status = 'Open'");

    const [districtUsage] = await db.query('SELECT name, usage_pct FROM districts ORDER BY id');

    res.json({
      total_consumers,
      unpaid_total,
      collected,
      open_requests,
      district_usage: districtUsage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
