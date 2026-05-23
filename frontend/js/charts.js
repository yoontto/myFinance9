// Chart.js 전역 기본 설정
Chart.defaults.font.family = "'Inter', sans-serif";

let monthlyChartInst = null;
let categoryChartInst = null;
let assetChartInst    = null;

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

// 자산 추이 라인 차트
function renderAssetChart(data) {
  const c = getChartColors();
  // data: [{year, month, total}]
  const labels = data.map(d => `${d.year}.${String(d.month).padStart(2,'0')}`);
  const values = data.map(d => d.total);

  if (assetChartInst) assetChartInst.destroy();
  assetChartInst = new Chart(document.getElementById('assetChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '총 자산',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.12)',
        borderWidth: 2.5,
        pointBackgroundColor: '#3b82f6',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: c.text } },
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

function refreshChartColors() {
  // 테마 전환 시 차트 재렌더링
  if (monthlyChartInst) {
    const c = getChartColors();
    const scales = monthlyChartInst.options.scales;
    scales.x.grid.color = c.grid; scales.x.ticks.color = c.text;
    scales.y.grid.color = c.grid; scales.y.ticks.color = c.text;
    monthlyChartInst.update();
  }
  if (categoryChartInst) {
    categoryChartInst.options.plugins.legend.labels.color = getChartColors().text;
    categoryChartInst.update();
  }
}
