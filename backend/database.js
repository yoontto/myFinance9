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
try { db.exec('ALTER TABLE assets ADD COLUMN alias TEXT'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE assets ADD COLUMN is_excel INTEGER DEFAULT 0'); } catch(e) { /* already exists */ }

// 색상 팔레트 마이그레이션 — 기존 카테고리 색상을 파스텔 팔레트로 업데이트
const categoryColorMap = {
  '식비': '#ff5252', '교통비': '#ff9f43', '쇼핑': '#ffda79',
  '의료/건강': '#33d9b2', '엔터테인먼트': '#a29bfe', '통신비': '#34ace0',
  '주거/관리비': '#81ecec', '기타지출': '#fd79a8',
  '급여': '#33d9b2', '부업/프리랜서': '#74b9ff', '투자수익': '#ffda79', '기타수입': '#55efc4',
};
const assetCategoryColorMap = {
  '금융자산': '#34ace0', '부동산': '#33d9b2', '투자자산': '#ffda79',
  '기타자산': '#a29bfe', '노후/연금': '#ff9f43', '현금/입출금': '#55efc4',
  '주식/ETF': '#ff9f43', '펀드': '#fd79a8', '채권': '#74b9ff', '보험': '#81ecec',
};
const updateCatColor = db.prepare('UPDATE categories SET color=? WHERE name=?');
const updateAssetCatColor = db.prepare('UPDATE asset_categories SET color=? WHERE name=?');
Object.entries(categoryColorMap).forEach(([name, color]) => updateCatColor.run(color, name));
Object.entries(assetCategoryColorMap).forEach(([name, color]) => updateAssetCatColor.run(color, name));

// 기본 카테고리 삽입 (없을 때만)
const count = db.prepare('SELECT COUNT(*) as cnt FROM categories').get();
if (count.cnt === 0) {
  const insertCategory = db.prepare(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)'
  );
  const defaults = [
    // 지출
    ['식비',           'expense', '#ff5252', '🍚'],
    ['교통비',         'expense', '#ff9f43', '🚌'],
    ['쇼핑',           'expense', '#ffda79', '🛍️'],
    ['의료/건강',      'expense', '#33d9b2', '🏥'],
    ['엔터테인먼트',   'expense', '#a29bfe', '🎬'],
    ['통신비',         'expense', '#34ace0', '📱'],
    ['주거/관리비',    'expense', '#81ecec', '🏠'],
    ['기타지출',       'expense', '#fd79a8', '💸'],
    // 수입
    ['급여',           'income',  '#33d9b2', '💼'],
    ['부업/프리랜서',  'income',  '#74b9ff', '💻'],
    ['투자수익',       'income',  '#ffda79', '📈'],
    ['기타수입',       'income',  '#55efc4', '💰'],
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
    ['금융자산', '#34ace0'],
    ['부동산',   '#33d9b2'],
    ['투자자산', '#ffda79'],
    ['기타자산', '#a29bfe'],
  ].forEach(([name, color]) => insertAssetCat.run(name, color));
}

module.exports = db;
