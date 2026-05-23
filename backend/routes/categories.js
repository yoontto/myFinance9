const express = require('express');
const router = express.Router();
const db = require('../database');

// 카테고리 목록
router.get('/', (req, res) => {
  const { type } = req.query;
  let stmt;
  if (type) {
    stmt = db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY type, name');
    res.json(stmt.all(type));
  } else {
    stmt = db.prepare('SELECT * FROM categories ORDER BY type, name');
    res.json(stmt.all());
  }
});

module.exports = router;
