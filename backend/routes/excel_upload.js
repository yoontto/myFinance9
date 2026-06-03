const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const XLSX    = require('xlsx');
const db      = require('../database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 카테고리명별 자동 색상 팔레트
const COLOR_PALETTE = [
  '#ffda79', '#34ace0', '#ff5252', '#33d9b2',
  '#ff9f43', '#fd79a8', '#74b9ff', '#a29bfe',
  '#55efc4', '#e17055', '#badc58', '#81ecec',
];

function autoColor(index) {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}

// '재무현황' 텍스트가 있는 셀 아래 표를 파싱
function parseFinanceTable(workbook) {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // '재무현황' 텍스트가 포함된 행 인덱스 찾기
  let startRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const rowStr = rows[i].join(' ');
    if (rowStr.includes('재무현황')) {
      startRow = i;
      break;
    }
  }
  if (startRow === -1) return null;

  // 헤더 행 찾기 (항목, 상품명, 금액 컬럼)
  let headerRow = -1;
  let colItem = -1, colName = -1, colAmount = -1;
  for (let i = startRow + 1; i < Math.min(startRow + 10, rows.length); i++) {
    for (let j = 0; j < rows[i].length; j++) {
      const cell = String(rows[i][j]).replace(/\s/g, '');
      // 중복 컬럼명이 있을 경우 처음 발견된 위치(자산 쪽)만 사용
      if (cell === '항목'  && colItem   === -1) colItem   = j;
      if (cell === '상품명' && colName   === -1) colName   = j;
      if ((cell.includes('금액') || cell.includes('잔액') || cell.includes('평가금액')) && colAmount === -1) colAmount = j;
    }
    if (colItem !== -1 && colName !== -1) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1 || colItem === -1 || colName === -1) return null;

  // 금액 컬럼이 없으면 헤더 이후 마지막 숫자형 컬럼으로 추정
  if (colAmount === -1) {
    const header = rows[headerRow];
    for (let j = header.length - 1; j >= 0; j--) {
      const cell = String(header[j]).replace(/\s/g, '');
      if (cell !== '' && j !== colItem && j !== colName) {
        colAmount = j;
        break;
      }
    }
  }

  // 데이터 행 수집 (병합 셀 대응: 항목이 비면 이전 항목명 이어받기)
  const items = [];
  let lastCategory = '';
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    let itemVal   = String(row[colItem]  || '').trim();
    const nameVal   = String(row[colName]  || '').trim();
    const amountRaw = colAmount !== -1 ? row[colAmount] : '';

    // 빈 행이나 합계 행 제외
    if (!itemVal && !nameVal) continue;
    if (itemVal.includes('합계') || itemVal.includes('총계') || itemVal.includes('소계')) continue;
    if (nameVal.includes('합계') || nameVal.includes('총계') || nameVal.includes('소계')) continue;

    // 병합 셀: 항목이 비어 있으면 마지막으로 본 항목명 이어받기
    if (itemVal) {
      lastCategory = itemVal;
    } else {
      itemVal = lastCategory;
    }

    // 금액 파싱 (숫자 이외 문자 제거)
    const amountStr = String(amountRaw).replace(/[^0-9.-]/g, '');
    const amount = amountStr ? Math.round(parseFloat(amountStr)) : 0;

    if (!nameVal || amount <= 0) continue;

    items.push({ category: itemVal || '미분류', name: nameVal, amount });
  }

  return items;
}

// POST /api/excel/debug  (파싱 과정 상세 확인용)
router.post('/debug', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (e) {
    return res.status(400).json({ error: '엑셀 파일을 읽을 수 없습니다.' });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  // '재무현황' 행 찾기
  let startRow = -1;
  const searchLog = [];
  for (let i = 0; i < rows.length; i++) {
    const rowStr = rows[i].join(' ');
    searchLog.push({ rowIndex: i, content: rowStr.slice(0, 120) });
    if (rowStr.includes('재무현황')) { startRow = i; break; }
  }

  // 헤더 행 후보
  let headerRow = -1, colItem = -1, colName = -1, colAmount = -1;
  const headerSearch = [];
  if (startRow !== -1) {
    for (let i = startRow + 1; i < Math.min(startRow + 10, rows.length); i++) {
      const cellValues = rows[i].map((v, j) => ({ j, raw: v, clean: String(v).replace(/\s/g, '') }));
      headerSearch.push({ rowIndex: i, cells: cellValues });
      for (const { j, clean } of cellValues) {
        if (clean === '항목'   && colItem   === -1) colItem   = j;
        if (clean === '상품명' && colName   === -1) colName   = j;
        if ((clean.includes('금액') || clean.includes('잔액') || clean.includes('평가금액')) && colAmount === -1) colAmount = j;
      }
      if (colItem !== -1 && colName !== -1) { headerRow = i; break; }
    }
  }

  // 데이터 행 샘플
  const dataRows = [];
  if (headerRow !== -1) {
    for (let i = headerRow + 1; i < Math.min(headerRow + 20, rows.length); i++) {
      dataRows.push({ rowIndex: i, cells: rows[i] });
    }
  }

  res.json({
    sheetName,
    totalRows: rows.length,
    startRow,
    headerRow,
    colItem,
    colName,
    colAmount,
    first30Rows: searchLog.slice(0, 30),
    headerSearchRows: headerSearch,
    dataSample: dataRows,
  });
});

// POST /api/excel/upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

  let workbook;
  try {
    workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  } catch (e) {
    return res.status(400).json({ error: '엑셀 파일을 읽을 수 없습니다.' });
  }

  const items = parseFinanceTable(workbook);
  if (!items) {
    return res.status(422).json({ error: "'재무현황' 표를 찾을 수 없습니다. 엑셀 파일에 '재무현황' 텍스트와 '항목', '상품명' 컬럼이 있는지 확인해주세요." });
  }
  if (items.length === 0) {
    return res.status(422).json({ error: '등록할 자산 항목이 없습니다.' });
  }

  res.json({ preview: items });
});

// POST /api/excel/import  (미리보기 확인 후 실제 저장)
router.post('/import', (req, res) => {
  const { items, year, month } = req.body;
  if (!Array.isArray(items) || !year || !month) {
    return res.status(400).json({ error: '잘못된 요청입니다.' });
  }

  // 카테고리 이름 → id 매핑 (없으면 생성)
  const existingCats = db.prepare('SELECT * FROM asset_categories').all();
  const catMap = {};
  existingCats.forEach(c => { catMap[c.name] = c.id; });

  let colorIndex = existingCats.length;
  const insertCat = db.prepare('INSERT INTO asset_categories (name, color) VALUES (?, ?)');
  const insertAsset = db.prepare(
    'INSERT INTO assets (name, alias, amount, year, month, category_id, is_excel) VALUES (?, ?, ?, ?, ?, ?, 1)'
  );
  const updateAsset = db.prepare('UPDATE assets SET amount=?, alias=? WHERE id=?');
  const findAsset = db.prepare(
    'SELECT * FROM assets WHERE name=? AND year=? AND month=? AND category_id=?'
  );

  const results = db.transaction(() => {
    const saved = [];
    items.forEach(({ category, name, amount, alias }) => {
      const aliasVal = (alias || '').trim() || null;

      // 카테고리 확보
      let catId = catMap[category];
      if (!catId) {
        const r = insertCat.run(category, autoColor(colorIndex++));
        catId = r.lastInsertRowid;
        catMap[category] = catId;
      }

      // upsert 자산
      const existing = findAsset.get(name, year, month, catId);
      if (existing) {
        updateAsset.run(amount, aliasVal, existing.id);
        saved.push({ ...existing, amount, alias: aliasVal, action: 'updated' });
      } else {
        const r = insertAsset.run(name, aliasVal, amount, year, month, catId);
        saved.push({ id: r.lastInsertRowid, name, alias: aliasVal, amount, year, month, category_id: catId, action: 'created' });
      }
    });
    return saved;
  })();

  res.json({ success: true, count: results.length, items: results });
});

module.exports = router;
