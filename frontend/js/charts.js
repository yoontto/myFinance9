// Chart.js 전역 기본 설정
Chart.defaults.font.family = "'Inter', sans-serif";

let monthlyChartInst   = null;
let categoryChartInst  = null;
let assetChartInst     = null;
let assetPieChartInst  = null;

function getChartColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid:    dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
    text:    dark ? '#8ba3c7' : '#475569',
    tooltip: dark ? '#1e2536' : '#ffffff',
  };
}

// 월별 수입/지출 바 차트
function renderMonthlyChart(monthlyData) {
  const c = getChartColors();
  const labels = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const incomeData  = Array(12).fill(0);
  const expenseData = Array(12).fill(0);

  monthlyData.forEach(({ month, type, total }) => {
    if (type === 'income')  incomeData[month - 1]  = total;
    if (type === 'expense') expenseData[month - 1] = total;
  });

  if (monthlyChartInst) monthlyChartInst.destroy();
  monthlyChartInst = new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '수입',
          data: incomeData,
          backgroundColor: 'rgba(16,185,129,0.75)',
          borderColor:     'rgba(16,185,129,1)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: '지출',
          data: expenseData,
          backgroundColor: 'rgba(239,68,68,0.65)',
          borderColor:     'rgba(239,68,68,1)',
          borderWidth: 1,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: c.text, font: { size: 12 } } },
        tooltip: {
          backgroundColor: c.tooltip,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: '#e2e8f0',
          borderWidth: 1,
          callbacks: { label: ctx => ' ' + fmt(ctx.raw) },
        },
      },
      scales: {
        x: { grid: { color: c.grid }, ticks: { color: c.text } },
        y: { grid: { color: c.grid }, ticks: { color: c.text, callback: v => fmt(v) } },
      },
    },
  });
}

// 카테고리 도넛 차트
function renderCategoryChart(categoryData) {
  const c = getChartColors();
  if (categoryChartInst) categoryChartInst.destroy();

  if (!categoryData || categoryData.length === 0) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  categoryChartInst = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: categoryData.map(d => `${d.icon} ${d.name}`),
      datasets: [{
        data: categoryData.map(d => d.total),
        backgroundColor: categoryData.map(d => d.color + 'cc'),
        borderColor:     categoryData.map(d => d.color),
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { color: c.text, font: { size: 11 }, padding: 10 } },
        tooltip: {
          backgroundColor: c.tooltip,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: '#e2e8f0',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${fmt(ctx.raw)}` },
        },
      },
    },
  });
}

// 이달 자산 비율 파이 차트
// assets: [{category_id, category_name, category_color, amount}]
// categories: [{id, name, color}]
function renderAssetPieChart(assets, categories) {
  const c = getChartColors();

  const groupMap = {};
  categories.forEach(cat => {
    groupMap[cat.id] = { name: cat.name, color: cat.color, total: 0 };
  });
  groupMap['null'] = { name: '미분류', color: '#94a3b8', total: 0 };

  assets.forEach(a => {
    const key = a.category_id != null ? a.category_id : 'null';
    if (groupMap[key]) groupMap[key].total += a.amount;
  });

  const entries = Object.values(groupMap).filter(e => e.total > 0);

  if (assetPieChartInst) assetPieChartInst.destroy();

  if (entries.length === 0) {
    const ctx = document.getElementById('assetPieChart').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  const grandTotal = entries.reduce((s, e) => s + e.total, 0);

  assetPieChartInst = new Chart(document.getElementById('assetPieChart'), {
    type: 'pie',
    plugins: [ChartDataLabels],
    data: {
      labels: entries.map(e => e.name),
      datasets: [{
        data: entries.map(e => e.total),
        backgroundColor: entries.map(e => e.color + 'cc'),
        borderColor:     entries.map(e => e.color),
        borderWidth: 2,
        hoverOffset: 8,
        radius: '85%',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          align: 'center',
          labels: { color: c.text, font: { size: 11 }, padding: 10, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: c.tooltip,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: '#e2e8f0',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${fmt(ctx.raw)} (${grandTotal > 0 ? ((ctx.raw / grandTotal) * 100).toFixed(1) : 0}%)`,
          },
        },
        datalabels: {
          formatter: (value) =>
            grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) + '%' : '',
          color: '#fff',
          font: { weight: '700', size: 12 },
          textShadowBlur: 4,
          textShadowColor: 'rgba(0,0,0,0.45)',
          display: (ctx) => (ctx.dataset.data[ctx.dataIndex] / grandTotal) >= 0.03,
        },
      },
    },
  });
}

// 자산 추이 스택 바 차트
// chartData: { categories: [{id, name, color}], months: [{label, catTotals: [{id, total}], uncategorized}] }
function renderAssetChart(chartData) {
  const c = getChartColors();
  const { categories, months } = chartData;
  const labels = months.map(m => m.label);

  const datasets = categories.map(cat => ({
    label: cat.name,
    data: months.map(m => m.catTotals.find(ct => ct.id === cat.id)?.total || 0),
    backgroundColor: cat.color + 'cc',
    borderColor: cat.color,
    borderWidth: 1,
    borderRadius: 3,
    stack: 'assets',
  }));

  const hasUncategorized = months.some(m => m.uncategorized > 0);
  if (hasUncategorized) {
    datasets.push({
      label: '미분류',
      data: months.map(m => m.uncategorized),
      backgroundColor: '#94a3b8cc',
      borderColor: '#94a3b8',
      borderWidth: 1,
      borderRadius: 3,
      stack: 'assets',
    });
  }

  if (assetChartInst) assetChartInst.destroy();
  assetChartInst = new Chart(document.getElementById('assetChart'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: c.text, font: { size: 11 }, padding: 12 } },
        tooltip: {
          backgroundColor: c.tooltip,
          titleColor: c.text,
          bodyColor: c.text,
          borderColor: '#e2e8f0',
          borderWidth: 1,
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}` },
        },
      },
      scales: {
        x: { stacked: true, grid: { color: c.grid }, ticks: { color: c.text } },
        y: { stacked: true, grid: { color: c.grid }, ticks: { color: c.text, callback: v => `${(v / 1000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}백만` } },
      },
    },
  });
}

function refreshChartColors() {
  const c = getChartColors();
  if (monthlyChartInst) {
    const scales = monthlyChartInst.options.scales;
    scales.x.grid.color = c.grid; scales.x.ticks.color = c.text;
    scales.y.grid.color = c.grid; scales.y.ticks.color = c.text;
    monthlyChartInst.update();
  }
  if (categoryChartInst) {
    categoryChartInst.options.plugins.legend.labels.color = c.text;
    categoryChartInst.update();
  }
  if (assetChartInst) {
    const scales = assetChartInst.options.scales;
    scales.x.grid.color = c.grid; scales.x.ticks.color = c.text;
    scales.y.grid.color = c.grid; scales.y.ticks.color = c.text;
    assetChartInst.options.plugins.legend.labels.color = c.text;
    assetChartInst.update();
  }
  if (assetPieChartInst) {
    assetPieChartInst.options.plugins.legend.labels.color = c.text;
    assetPieChartInst.update();
  }
}
