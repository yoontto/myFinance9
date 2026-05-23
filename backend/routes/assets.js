const express = require('express');
const router = express.Router();
const db = require('../database');

// 월별 카테고리 스택 차트 데이터
router.get('/chart', (req, res) => {
  const months = parseInt(req.query.months) || 12;
  const categories = db.prepare('SELECT * FROM asset_categories ORDER BY id').all();

  const result = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = dt.getFullYear();
    const month = dt.getMonth() + 1;
    const label = `${year}.${String(month).padStart(2, '0')}`;

    const catTotals = categories.map(cat => {
      const row = db.prepare(
        'SELECT SUM(amount) as total FROM assets WHERE category_id=? AND year=? AND month=?'
      ).get(cat.id, year, month);
      return { id: cat.id, total: row?.total || 0 };
    });

    const uncatRow = db.prepare(
      'SELECT SUM(amount) as total FROM assets WHERE category_id IS NULL AND year=? AND month=?'
    ).get(year, month);

    result.push({ year, month, label, catTotals, uncategorized: uncatRow?.total || 0 });
  }

  res.json({ categories, months: result });
});

// 자산 목록 조회 (월 필터 + 카테고리 JOIN)
router.get('/', (req, res) => {
  const { year, month } = req.query;
  let rows;
  if (year && month) {
    rows = db.prepare(`
      SELECT a.*, ac.name as category_name, ac.color as category_color
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      WHERE a.year=? AND a.month=?
      ORDER BY ac.name, a.sort_order, a.name
    `).all(year, month);
  } else {
    rows = db.prepare(`
      SELECT a.*, ac.name as category_name, ac.color as category_color
      FROM assets a
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      ORDER BY a.year DESC, a.month DESC, ac.name, a.sort_order, a.name
    `).all();
  }
  res.json(rows);
});

// 자산 추가/수정 (같은 이름+카테고리+년월이면 upsert)
router.post('/', (req, res) => {
  const { name, amount, year, month, category_id } = req.body;
  if (!name || amount === undefined || !year || !month) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  }

  const catId = category_id || null;
  const existing = catId
    ? db.prepare('SELECT * FROM assets WHERE name=? AND year=? AND month=? AND category_id=?').get(name, year, month, catId)
    : db.prepare('SELECT * FROM assets WHERE name=? AND year=? AND month=? AND category_id IS NULL').get(name, year, month);

  let id;
  if (existing) {
    db.prepare('UPDATE assets SET amount=? WHERE id=?').run(amount, existing.id);
    id = existing.id;
  } else {
    const result = db.prepare(
      'INSERT INTO assets (name, amount, year, month, category_id) VALUES (?, ?, ?, ?, ?)'
    ).run(name, amount, year, month, catId);
    id = result.lastInsertRowid;
  }

  const row = db.prepare(`
    SELECT a.*, ac.name as category_name, ac.color as category_color
    FROM assets a LEFT JOIN asset_categories ac ON a.category_id = ac.id
    WHERE a.id=?
  `).get(id);
  res.status(existing ? 200 : 201).json(row);
});

// 순서 일괄 저장
router.patch('/reorder', (req, res) => {
  const { orders } = req.body; // [{id, sort_order}]
  if (!Array.isArray(orders)) return res.status(400).json({ error: '잘못된 형식입니다.' });
  const update = db.prepare('UPDATE assets SET sort_order=? WHERE id=?');
  db.transaction(() => orders.forEach(o => update.run(o.sort_order, o.id)))();
  res.json({ success: true });
});

// 자산 수정
router.put('/:id', (req, res) => {
  const { name, amount, category_id } = req.body;
  const row = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '자산을 찾을 수 없습니다.' });
  if (!name || amount === undefined) return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
  db.prepare('UPDATE assets SET name=?, amount=?, category_id=? WHERE id=?')
    .run(name, amount, category_id || null, req.params.id);
  res.json(db.prepare(`
    SELECT a.*, ac.name as category_name, ac.color as category_color
    FROM assets a LEFT JOIN asset_categories ac ON a.category_id = ac.id
    WHERE a.id=?
  `).get(req.params.id));
});

// 자산 삭제
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM assets WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '자산을 찾을 수 없습니다.' });
  db.prepare('DELETE FROM assets WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
