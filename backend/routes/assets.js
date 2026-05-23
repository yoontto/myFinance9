const express = require('express');
const router = express.Router();
const db = require('../database');

// 자산 목록 조회 (월 필터)
router.get('/', (req, res) => {
  const { year, month } = req.query;
  let rows;
  if (year && month) {
    rows = db.prepare(
      'SELECT * FROM assets WHERE year=? AND month=? ORDER BY name'
    ).all(year, month);
  } else {
    rows = db.prepare('SELECT * FROM assets ORDER BY year DESC, month DESC, name').all();
  }
  res.json(rows);
});

// 자산 추가/수정 (같은 이름+년월이면 upsert)
router.post('/', (req, res) => {
  const { name, amount, year, month } = req.body;
  if (!name || amount === undefined || !year || !month) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }
  const existing = db.prepare(
    'SELECT * FROM assets WHERE name=? AND year=? AND month=?'
  ).get(name, year, month);

  if (existing) {
    db.prepare('UPDATE assets SET amount=? WHERE id=?').run(amount, existing.id);
    res.json({ ...existing, amount });
  } else {
    const result = db.prepare(
      'INSERT INTO assets (name, amount, year, month) VALUES (?, ?, ?, ?)'
    ).run(name, amount, year, month);
    res.status(201).json(db.prepare('SELECT * FROM assets WHERE id=?').get(result.lastInsertRowid));
  }
});

// 자산 삭제
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '자산을 찾을 수 없습니다.' });
  db.prepare('DELETE FROM assets WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
