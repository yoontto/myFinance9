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
  getAssets: (year, month) => api.get(`/assets?year=${year}&month=${month}`),
  addAsset: (data) => api.post('/assets', data),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
  getStats: (year, month) => api.get(`/stats/monthly?year=${year}&month=${month}`),
};
