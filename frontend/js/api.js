// API 기본 URL
const BASE = '/api';

const api = {
  async get(path) {
    const res = await fetch(BASE + path);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async patch(path, body) {
    const res = await fetch(BASE + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async delete(path) {
    const res = await fetch(BASE + path, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // 편의 메서드
  getCategories: (type) => api.get('/categories' + (type ? `?type=${type}` : '')),
  getTransactions: (year, month) => api.get(`/transactions?year=${year}&month=${month}`),
  addTransaction: (data) => api.post('/transactions', data),
  updateTransaction: (id, data) => api.put(`/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/transactions/${id}`),
  getAssetCategories: () => api.get('/asset-categories'),
  addAssetCategory: (data) => api.post('/asset-categories', data),
  updateAssetCategory: (id, data) => api.put(`/asset-categories/${id}`, data),
  deleteAssetCategory: (id) => api.delete(`/asset-categories/${id}`),
  getAssets: (year, month) => api.get(`/assets?year=${year}&month=${month}`),
  getAssetChart: (months = 12) => api.get(`/assets/chart?months=${months}`),
  addAsset: (data) => api.post('/assets', data),
  updateAsset: (id, data) => api.put(`/assets/${id}`, data),
  reorderAssets: (orders) => api.patch('/assets/reorder', { orders }),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
  getStats: (year, month) => api.get(`/stats/monthly?year=${year}&month=${month}`),

  async uploadExcel(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(BASE + '/excel/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error((await res.json()).error || '업로드 실패');
    return res.json();
  },
  importExcel: (items, year, month) => api.post('/excel/import', { items, year, month }),
};
