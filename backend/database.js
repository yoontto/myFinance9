const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'myfinance.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT '💰',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('income','expense')),
    amount INTEGER NOT NULL,
    category_id INTEGER,
    memo TEXT DEFAULT '',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS asset_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    category_id INTEGER,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (category_id) REFERENCES asset_categories(id) ON DELETE SET NULL
  );
`);

// 기존 DB 마이그레이션
try { db.exec('ALTER TABLE assets ADD COLUMN category_id INTEGER'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE assets ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch(e) { /* already exists */ }

// 기본 카테고리 삽입 (없을 때만)
const count = db.prepare('SELECT COUNT(*) as cnt FROM categories').get();
if (count.cnt === 0) {
  const insertCategory = db.prepare(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)'
  );
  const defaults = [
    // 지출
    ['식비',           'expense', '#ef4444', '🍚'],
    ['교통비',         'expense', '#f97316', '🚌'],
    ['쇼핑',           'expense', '#eab308', '🛍️'],
    ['의료/건강',      'expense', '#22c55e', '🏥'],
    ['엔터테인먼트',   'expense', '#8b5cf6', '🎬'],
    ['통신비',         'expense', '#06b6d4', '📱'],
    ['주거/관리비',    'expense', '#64748b', '🏠'],
    ['기타지출',       'expense', '#94a3b8', '💸'],
    // 수입
    ['급여',           'income',  '#10b981', '💼'],
    ['부업/프리랜서',  'income',  '#3b82f6', '💻'],
    ['투자수익',       'income',  '#f59e0b', '📈'],
    ['기타수입',       'income',  '#a78bfa', '💰'],
  ];
  defaults.forEach(([name, type, color, icon]) =>
    insertCategory.run(name, type, color, icon)
  );
}

// 기본 자산 카테고리 삽입 (없을 때만)
const assetCatCount = db.prepare('SELECT COUNT(*) as cnt FROM asset_categories').get();
if (assetCatCount.cnt === 0) {
  const insertAssetCat = db.prepare('INSERT INTO asset_categories (name, color) VALUES (?, ?)');
  [
    ['금융자산', '#3b82f6'],
    ['부동산',   '#10b981'],
    ['투자자산', '#f59e0b'],
    ['기타자산', '#8b5cf6'],
  ].forEach(([name, color]) => insertAssetCat.run(name, color));
}

module.exports = db;
