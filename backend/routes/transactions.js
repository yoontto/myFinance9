const express = require('express');
const router = express.Router();
const db = require('../database');

// 거래 목록 조회 (월 필터 지원)
router.get('/', (req, res) => {
  const { year, month } = req.query;
  let rows;
  if (year && month) {
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    rows = db.prepare(`
      SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE strftime('%Y-%m', t.date) = ?
      ORDER BY t.date DESC, t.created_at DESC
    `).all(ym);
  } else {
    rows = db.prepare(`
      SELECT t.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC, t.created_at DESC
    `).all();
  }
  res.json(rows);
});

// 거래 추가
router.post('/', (req, res) => {
  const { type, amount, category_id, memo, date } = req.body;
  if (!type || !amount || !date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }
  const result = db.prepare(
    'INSERT INTO transactions (type, amount, category_id, memo, date) VALUES (?, ?, ?, ?, ?)'
  ).run(type, amount, category_id || null, memo || '', date);
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

// 거래 수정
router.put('/:id', (req, res) => {
  const { type, amount, category_id, memo, date } = req.body;
  const { id } = req.params;
  db.prepare(
    'UPDATE transactions SET type=?, amount=?, category_id=?, memo=?, date=? WHERE id=?'
  ).run(type, amount, category_id || null, memo || '', date, id);
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
  res.json(row);
});

// 거래 삭제
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: '거래를 찾을 수 없습니다.' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
