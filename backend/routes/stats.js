const express = require('express');
const router = express.Router();
const db = require('../database');

// 월별 통계
router.get('/monthly', (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  // 월별 수입/지출 합계
  const monthly = db.prepare(`
    SELECT
      CAST(strftime('%m', date) AS INTEGER) AS month,
      type,
      SUM(amount) AS total
    FROM transactions
    WHERE strftime('%Y', date) = ?
    GROUP BY month, type
    ORDER BY month
  `).all(String(targetYear));

  // 카테고리별 지출 (전체 or 특정 월)
  const { month } = req.query;
  let categoryStats;
  if (month) {
    const ym = `${targetYear}-${String(month).padStart(2, '0')}`;
    categoryStats = db.prepare(`
      SELECT c.name, c.color, c.icon, SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ?
      GROUP BY t.category_id
      ORDER BY total DESC
    `).all(ym);
  } else {
    categoryStats = db.prepare(`
      SELECT c.name, c.color, c.icon, SUM(t.amount) AS total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.type = 'expense' AND strftime('%Y', t.date) = ?
      GROUP BY t.category_id
      ORDER BY total DESC
    `).all(String(targetYear));
  }

  // 이번 달 요약
  const now = new Date();
  const thisYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const summary = db.prepare(`
    SELECT type, SUM(amount) AS total
    FROM transactions
    WHERE strftime('%Y-%m', date) = ?
    GROUP BY type
  `).all(thisYm);

  res.json({ monthly, categoryStats, summary });
});

module.exports = router;
