const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM asset_categories ORDER BY id').all());
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: '카테고리명이 필요합니다.' });
  const result = db.prepare(
    'INSERT INTO asset_categories (name, color) VALUES (?, ?)'
  ).run(name.trim(), color || '#34ace0');
  res.status(201).json(db.prepare('SELECT * FROM asset_categories WHERE id=?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, color } = req.body;
  const row = db.prepare('SELECT * FROM asset_categories WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  if (!name) return res.status(400).json({ error: '카테고리명이 필요합니다.' });
  db.prepare('UPDATE asset_categories SET name=?, color=? WHERE id=?').run(name.trim(), color || row.color, req.params.id);
  res.json(db.prepare('SELECT * FROM asset_categories WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM asset_categories WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: '카테고리를 찾을 수 없습니다.' });
  db.prepare('UPDATE assets SET category_id=NULL WHERE category_id=?').run(req.params.id);
  db.prepare('DELETE FROM asset_categories WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
