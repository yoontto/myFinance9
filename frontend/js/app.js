// ===== 유틸 =====
const fmt = (n) => '₩' + Number(n || 0).toLocaleString('ko-KR');
const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

// ===== STATE =====
let state = {
  dashYear: new Date().getFullYear(),
  dashMonth: new Date().getMonth() + 1,
  txYear:   new Date().getFullYear(),
  txMonth:  new Date().getMonth() + 1,
  assetYear:  new Date().getFullYear(),
  assetMonth: new Date().getMonth() + 1,

  categories: [],
  transactions: [],
  assets: [],
  assetCategories: [],
  editingTxId: null,
  editingAssetId: null,
  txType: 'income',
};

// ===== TOAST =====
function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove());
  }, 2800);
}

// ===== THEME =====
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  setTheme(saved);
}
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');
  if (theme === 'dark') { icon.textContent = '☀️'; label.textContent = '라이트 모드'; }
  else                  { icon.textContent = '🌙'; label.textContent = '다크 모드'; }
  setTimeout(refreshChartColors, 100);
}
document.getElementById('themeToggle').addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  setTheme(cur === 'dark' ? 'light' : 'dark');
});

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.getElementById(`nav-${page}`).classList.add('active');
  closeSidebar();

  if (page === 'dashboard')    loadDashboard();
  if (page === 'transactions') loadTransactions();
  if (page === 'assets')       loadAssets();
}
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});
document.getElementById('viewAllBtn').addEventListener('click', () => navigate('transactions'));

// ===== MOBILE SIDEBAR =====
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
});
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

// ===== MONTH NAVIGATOR =====
function setupMonthNav(prevId, nextId, displayId, yearKey, monthKey, onLoad) {
  function update() {
    document.getElementById(displayId).textContent =
      `${state[yearKey]}년 ${state[monthKey]}월`;
    onLoad();
  }
  document.getElementById(prevId).addEventListener('click', () => {
    state[monthKey]--;
    if (state[monthKey] < 1) { state[monthKey] = 12; state[yearKey]--; }
    update();
  });
  document.getElementById(nextId).addEventListener('click', () => {
    state[monthKey]++;
    if (state[monthKey] > 12) { state[monthKey] = 1; state[yearKey]++; }
    update();
  });
  update();
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const stats = await api.getStats(state.dashYear, state.dashMonth);
    const { monthly, categoryStats, summary } = stats;

    // 요약 카드
    const income  = summary.find(s => s.type === 'income')?.total  || 0;
    const expense = summary.find(s => s.type === 'expense')?.total || 0;
    document.getElementById('card-income').textContent  = fmt(income);
    document.getElementById('card-expense').textContent = fmt(expense);
    document.getElementById('card-balance').textContent = fmt(income - expense);

    // 총 자산 (이번 달)
    const assets = await api.getAssets(state.dashYear, state.dashMonth);
    const totalAsset = assets.reduce((a, b) => a + b.amount, 0);
    document.getElementById('card-asset').textContent = fmt(totalAsset);

    // 차트
    renderMonthlyChart(monthly);
    renderCategoryChart(categoryStats);

    // 최근 거래 (현재 월)
    const txs = await api.getTransactions(state.dashYear, state.dashMonth);
    renderTxList('recent-list', txs.slice(0, 8), true);
  } catch (e) {
    console.error(e);
  }
}

// ===== TRANSACTIONS =====
async function loadTransactions() {
  try {
    state.transactions = await api.getTransactions(state.txYear, state.txMonth);
    renderFilteredTxList();
  } catch(e) { console.error(e); }
}

function renderFilteredTxList() {
  const typeF = document.getElementById('typeFilter').value;
  const catF  = document.getElementById('categoryFilter').value;
  let list = state.transactions;
  if (typeF) list = list.filter(t => t.type === typeF);
  if (catF)  list = list.filter(t => String(t.category_id) === catF);
  renderTxList('tx-list', list, false);
}

document.getElementById('typeFilter').addEventListener('change', renderFilteredTxList);
document.getElementById('categoryFilter').addEventListener('change', renderFilteredTxList);

function renderTxList(listId, txs, readonly) {
  const ul = document.getElementById(listId);
  if (!txs || txs.length === 0) {
    ul.innerHTML = `<li class="empty-state"><div class="empty-icon">📭</div><p>거래 내역이 없습니다</p></li>`;
    return;
  }
  ul.innerHTML = txs.map(tx => `
    <li class="transaction-item" data-id="${tx.id}">
      <div class="tx-icon" style="background:${(tx.category_color || '#6366f1')}22">
        ${tx.category_icon || '💰'}
      </div>
      <div class="tx-info">
        <div class="tx-name">${tx.category_name || '미분류'}${tx.memo ? ` · <span class="text-muted text-sm">${tx.memo}</span>` : ''}</div>
        <div class="tx-meta">${tx.date} &nbsp;·&nbsp; <span class="badge ${tx.type}">${tx.type === 'income' ? '수입' : '지출'}</span></div>
      </div>
      <div class="tx-amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)}</div>
      ${!readonly ? `
      <div class="tx-actions">
        <button class="tx-btn edit" data-id="${tx.id}" title="수정">✏️</button>
        <button class="tx-btn delete" data-id="${tx.id}" title="삭제">🗑️</button>
      </div>` : ''}
    </li>
  `).join('');

  if (!readonly) {
    ul.querySelectorAll('.tx-btn.edit').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); openEditTx(btn.dataset.id); })
    );
    ul.querySelectorAll('.tx-btn.delete').forEach(btn =>
      btn.addEventListener('click', e => { e.stopPropagation(); deleteTx(btn.dataset.id); })
    );
  }
}

async function deleteTx(id) {
  if (!confirm('이 거래를 삭제할까요?')) return;
  try {
    await api.deleteTransaction(id);
    toast('거래가 삭제되었습니다');
    loadTransactions();
    loadDashboard();
  } catch(e) { toast('삭제 실패', 'error'); }
}

// ===== TX MODAL =====
function openTxModal(type = 'income', tx = null) {
  state.editingTxId = tx?.id || null;
  state.txType = type;

  document.getElementById('txModalTitle').textContent = tx ? '거래 수정' : '거래 추가';
  document.getElementById('txAmount').value = tx?.amount || '';
  document.getElementById('txDate').value   = tx?.date   || today();
  document.getElementById('txMemo').value   = tx?.memo   || '';

  setTxType(tx?.type || type);
  populateCategorySelect(tx?.category_id);
  document.getElementById('txModal').classList.add('open');
  document.getElementById('txAmount').focus();
}

function setTxType(type) {
  state.txType = type;
  document.getElementById('tabIncome').classList.toggle('active',  type === 'income');
  document.getElementById('tabExpense').classList.toggle('active', type === 'expense');
  populateCategorySelect();
}

document.getElementById('tabIncome').addEventListener('click',  () => setTxType('income'));
document.getElementById('tabExpense').addEventListener('click', () => setTxType('expense'));

function populateCategorySelect(selectedId) {
  const sel = document.getElementById('txCategory');
  const cats = state.categories.filter(c => c.type === state.txType);
  sel.innerHTML = cats.map(c =>
    `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.icon} ${c.name}</option>`
  ).join('');
}

function closeTxModal() {
  document.getElementById('txModal').classList.remove('open');
  state.editingTxId = null;
}

document.getElementById('txCancel').addEventListener('click', closeTxModal);
document.getElementById('txModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeTxModal();
});

document.getElementById('txSave').addEventListener('click', async () => {
  const amount = parseInt(document.getElementById('txAmount').value);
  const category_id = parseInt(document.getElementById('txCategory').value);
  const date   = document.getElementById('txDate').value;
  const memo   = document.getElementById('txMemo').value.trim();

  if (!amount || amount <= 0) { toast('금액을 입력해주세요', 'error'); return; }
  if (!date) { toast('날짜를 선택해주세요', 'error'); return; }

  const data = { type: state.txType, amount, category_id, date, memo };
  try {
    if (state.editingTxId) {
      await api.updateTransaction(state.editingTxId, data);
      toast('거래가 수정되었습니다');
    } else {
      await api.addTransaction(data);
      toast('거래가 추가되었습니다');
    }
    closeTxModal();
    loadTransactions();
    loadDashboard();
  } catch(e) { toast('저장 실패', 'error'); }
});

document.getElementById('addTxBtn').addEventListener('click', () => openTxModal(state.txType));

function openEditTx(id) {
  const tx = state.transactions.find(t => t.id == id);
  if (tx) openTxModal(tx.type, tx);
}

// ===== ASSETS =====
async function loadAssets() {
  try {
    const [assets, chartData] = await Promise.all([
      api.getAssets(state.assetYear, state.assetMonth),
      api.getAssetChart(12),
    ]);
    state.assets = assets;
    state.assetCategories = chartData.categories;
    renderAssets();
    renderAssetPieChart(state.assets, state.assetCategories);
    renderAssetChart(chartData);
  } catch(e) { console.error(e); }
}

function renderAssets() {
  const container = document.getElementById('asset-category-list');
  const total = state.assets.reduce((a, b) => a + b.amount, 0);
  document.getElementById('total-asset-display').textContent = '합계: ' + fmt(total);

  if (state.assets.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏦</div><p>자산을 추가해보세요</p></div>`;
    return;
  }

  // 카테고리별 그룹핑
  const groupMap = {};
  state.assetCategories.forEach(cat => {
    groupMap[cat.id] = { cat, items: [] };
  });
  groupMap['null'] = { cat: { id: null, name: '미분류', color: '#94a3b8' }, items: [] };

  state.assets.forEach(a => {
    const key = a.category_id != null ? a.category_id : 'null';
    if (!groupMap[key]) groupMap[key] = { cat: { id: a.category_id, name: a.category_name || '미분류', color: a.category_color || '#94a3b8' }, items: [] };
    groupMap[key].items.push(a);
  });

  const rendered = Object.values(groupMap)
    .filter(g => g.items.length > 0)
    .map(({ cat, items }) => {
      const groupTotal = items.reduce((s, a) => s + a.amount, 0);
      const cards = items.map(a => `
        <div class="asset-card" data-id="${a.id}">
          <div class="asset-card-content">
            <div class="asset-name">${a.name}</div>
            <div class="asset-amount">${fmt(a.amount)}</div>
          </div>
          <div class="asset-card-actions">
            <button class="asset-edit" data-id="${a.id}" title="수정">✏️</button>
            <button class="asset-delete" data-id="${a.id}" title="삭제">✕</button>
          </div>
          <span class="drag-handle" title="드래그하여 순서 변경">⠿</span>
        </div>
      `).join('');
      return `
        <div class="asset-category-group">
          <div class="asset-category-header">
            <div class="asset-cat-label">
              <span class="asset-cat-dot" style="background:${cat.color}"></span>
              <span class="asset-cat-name">${cat.name}</span>
            </div>
            <span class="asset-cat-total">${fmt(groupTotal)}</span>
          </div>
          <div class="asset-grid">${cards}</div>
        </div>
      `;
    }).join('');

  container.innerHTML = rendered;
  container.querySelectorAll('.asset-edit').forEach(btn =>
    btn.addEventListener('click', () => {
      const asset = state.assets.find(a => a.id == btn.dataset.id);
      if (asset) openAssetModal(asset);
    })
  );
  container.querySelectorAll('.asset-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteAsset(btn.dataset.id))
  );

  container.querySelectorAll('.asset-grid').forEach(grid => {
    Sortable.create(grid, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'asset-ghost',
      chosenClass: 'asset-chosen',
      onEnd: async () => {
        const orders = [...grid.querySelectorAll('.asset-card')].map((el, idx) => ({
          id: parseInt(el.dataset.id),
          sort_order: idx,
        }));
        try {
          await api.reorderAssets(orders);
        } catch(e) { toast('순서 저장 실패', 'error'); }
      },
    });
  });
}

async function deleteAsset(id) {
  if (!confirm('이 자산을 삭제할까요?')) return;
  try {
    await api.deleteAsset(id);
    toast('자산이 삭제되었습니다');
    loadAssets();
  } catch(e) { toast('삭제 실패', 'error'); }
}

// 자산 추가/수정 모달
function openAssetModal(asset = null) {
  state.editingAssetId = asset?.id || null;
  document.getElementById('assetModalTitle').textContent = asset ? '자산 수정' : '자산 추가';
  document.getElementById('assetName').value   = asset?.name   || '';
  document.getElementById('assetAmount').value = asset?.amount || '';
  populateAssetCategorySelect(asset?.category_id);
  document.getElementById('assetModal').classList.add('open');
  document.getElementById('assetName').focus();
}
function closeAssetModal() {
  document.getElementById('assetModal').classList.remove('open');
  state.editingAssetId = null;
}
function populateAssetCategorySelect(selectedId) {
  const sel = document.getElementById('assetCategorySelect');
  sel.innerHTML = state.assetCategories.map(c =>
    `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.name}</option>`
  ).join('');
}

document.getElementById('addAssetBtn').addEventListener('click', openAssetModal);
document.getElementById('assetCancel').addEventListener('click', closeAssetModal);
document.getElementById('assetModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAssetModal();
});
document.getElementById('assetSave').addEventListener('click', async () => {
  const name        = document.getElementById('assetName').value.trim();
  const amount      = parseInt(document.getElementById('assetAmount').value);
  const category_id = parseInt(document.getElementById('assetCategorySelect').value) || null;
  if (!name)            { toast('자산명을 입력해주세요', 'error'); return; }
  if (!amount || amount < 0) { toast('금액을 입력해주세요', 'error'); return; }
  try {
    if (state.editingAssetId) {
      await api.updateAsset(state.editingAssetId, { name, amount, category_id });
      toast('자산이 수정되었습니다');
    } else {
      await api.addAsset({ name, amount, year: state.assetYear, month: state.assetMonth, category_id });
      toast('자산이 저장되었습니다');
    }
    closeAssetModal();
    loadAssets();
  } catch(e) { toast('저장 실패', 'error'); }
});

// 자산 카테고리 관리 모달
function openAssetCatModal() {
  renderCatManageList();
  document.getElementById('newCatName').value = '';
  document.getElementById('newCatColor').value = '#3b82f6';
  document.getElementById('assetCatModal').classList.add('open');
}
function closeAssetCatModal() {
  document.getElementById('assetCatModal').classList.remove('open');
}
function renderCatManageList() {
  const ul = document.getElementById('catManageList');
  if (!state.assetCategories.length) {
    ul.innerHTML = '<li style="color:var(--text-muted);font-size:13px;padding:8px 0">카테고리가 없습니다</li>';
    return;
  }
  ul.innerHTML = state.assetCategories.map(c => `
    <li class="cat-manage-item" data-id="${c.id}">
      <span class="asset-cat-dot" style="background:${c.color}"></span>
      <span class="cat-manage-name">${c.name}</span>
      <div class="cat-manage-actions">
        <button class="tx-btn edit cat-edit-btn" data-id="${c.id}" data-name="${c.name}" data-color="${c.color}" title="수정">✏️</button>
        <button class="tx-btn delete cat-delete-btn" data-id="${c.id}" title="삭제">🗑️</button>
      </div>
    </li>
  `).join('');

  ul.querySelectorAll('.cat-edit-btn').forEach(btn =>
    btn.addEventListener('click', () => startEditCat(btn.dataset.id, btn.dataset.name, btn.dataset.color))
  );
  ul.querySelectorAll('.cat-delete-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (!confirm('카테고리를 삭제하면 해당 카테고리의 자산이 미분류로 변경됩니다. 계속할까요?')) return;
      try {
        await api.deleteAssetCategory(btn.dataset.id);
        state.assetCategories = await api.getAssetCategories();
        toast('카테고리가 삭제되었습니다');
        renderCatManageList();
        loadAssets();
      } catch(e) { toast('삭제 실패', 'error'); }
    })
  );
}

function startEditCat(id, name, color) {
  const li = document.querySelector(`#catManageList li[data-id="${id}"]`);
  li.innerHTML = `
    <input type="color" class="color-picker cat-edit-color" value="${color}" />
    <input type="text" class="form-input cat-edit-name" value="${name}" maxlength="20" />
    <div class="cat-manage-actions">
      <button class="btn btn-primary cat-save-btn">저장</button>
      <button class="btn btn-ghost cat-cancel-btn">취소</button>
    </div>
  `;
  const nameInput = li.querySelector('.cat-edit-name');
  nameInput.focus();
  nameInput.select();

  li.querySelector('.cat-save-btn').addEventListener('click', async () => {
    const newName  = nameInput.value.trim();
    const newColor = li.querySelector('.cat-edit-color').value;
    if (!newName) { toast('카테고리명을 입력해주세요', 'error'); return; }
    try {
      await api.updateAssetCategory(id, { name: newName, color: newColor });
      state.assetCategories = await api.getAssetCategories();
      toast('카테고리가 수정되었습니다');
      renderCatManageList();
      loadAssets();
    } catch(e) { toast('수정 실패', 'error'); }
  });

  li.querySelector('.cat-cancel-btn').addEventListener('click', renderCatManageList);

  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter')  li.querySelector('.cat-save-btn').click();
    if (e.key === 'Escape') renderCatManageList();
  });
}

document.getElementById('manageCategoriesBtn').addEventListener('click', openAssetCatModal);
document.getElementById('assetCatClose').addEventListener('click', closeAssetCatModal);
document.getElementById('assetCatModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAssetCatModal();
});
document.getElementById('addCatBtn').addEventListener('click', async () => {
  const name  = document.getElementById('newCatName').value.trim();
  const color = document.getElementById('newCatColor').value;
  if (!name) { toast('카테고리명을 입력해주세요', 'error'); return; }
  try {
    await api.addAssetCategory({ name, color });
    state.assetCategories = await api.getAssetCategories();
    toast('카테고리가 추가되었습니다');
    document.getElementById('newCatName').value = '';
    renderCatManageList();
  } catch(e) { toast('추가 실패', 'error'); }
});

// ===== CATEGORY FILTER 채우기 =====
async function populateCategoryFilter() {
  const cats = await api.getCategories();
  state.categories = cats;
  const sel = document.getElementById('categoryFilter');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.icon} ${c.name}`;
    sel.appendChild(opt);
  });
}

// ===== INIT =====
async function init() {
  initTheme();
  await populateCategoryFilter();
  state.assetCategories = await api.getAssetCategories();

  // 월 네비게이터 설정
  setupMonthNav('dash-prev',  'dash-next',  'dash-month-display',  'dashYear',  'dashMonth',  loadDashboard);
  setupMonthNav('tx-prev',    'tx-next',    'tx-month-display',    'txYear',    'txMonth',    loadTransactions);
  setupMonthNav('asset-prev', 'asset-next', 'asset-month-display', 'assetYear', 'assetMonth', loadAssets);

  // 키보드 단축키
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeTxModal(); closeAssetModal(); }
  });
}

init();
