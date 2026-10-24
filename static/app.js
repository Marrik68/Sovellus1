

async function fetchNews(ticker) {
    try {
        const res = await fetch('/api/news?ticker=' + encodeURIComponent(ticker) + '&limit=3');
        if (!res.ok) throw new Error('Ei uutisia');
        return await res.json();
    } catch (e) {
        return { ticker: ticker, news: [] };
    }
}

function renderNews(newsData) {
    if (!newsData.news || newsData.news.length === 0) return '<div class="news-section"><p>Ei uutisia</p></div>';
    let html = '<div class="news-section"><h4>📰 Uutiset</h4>';
    newsData.news.forEach(item => {
        html += '<a href="' + item.link + '" target="_blank" class="news-item">';
        html += '<strong>' + (item.title || 'Uutinen') + '</strong> <span>' + (item.publisher || '') + '</span>';
        html += '</a>';
    });
    html += '</div>';
    return html;
}
// Pörssidashboard - JavaScript

const API_BASE = "";
const stocks = [
  { ticker: "MANTA.HE", name: "Mandatum", type: "stock" },
  { ticker: "NESTE.HE", name: "Neste", type: "stock" },
  { ticker: "NOKIA.HE", name: "Nokia", type: "stock" },
  { ticker: "NDA-FI.HE", name: "Nordea", type: "stock" },
  { ticker: "SAMPO.HE", name: "Sampo", type: "stock" },
  { ticker: "WRT1V.HE", name: "Wärtsilä", type: "stock" },
  { ticker: "DI.KK", name: "DI Eur. korko WK", type: "fund" },
  { ticker: "DI.EO", name: "DI EuroOsake WK", type: "fund" }
];

let charts = {};
let prices = {};
let purchasePrices = JSON.parse(localStorage.getItem("purchasePrices")) || {};

const select = document.getElementById("stockSelect");
const timeRange = document.getElementById("timeRange");
const purchaseInput = document.getElementById("stockPrice");
const stocksGrid = document.getElementById("stocksGrid");
const summarySection = document.getElementById("summarySection");
const summaryGrid = document.getElementById("summaryGrid");

// Alusta dropdown
stocks.forEach(s => {
  const opt = document.createElement("option");
  opt.value = s.ticker;
  opt.textContent = s.name + " (" + s.ticker + ")";
  select.appendChild(opt);
});

// Hae hinta API:sta
async function fetchPrice(ticker) {
  try {
    const res = await fetch(`/api/price?ticker=${encodeURIComponent(ticker)}`);
    if (!res.ok) throw new Error("Ei dataa");
    const data = await res.json();
    prices[ticker] = data;
    return data;
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Hae historia kaaviota varten
async function fetchHistory(ticker, period, interval) {
  try {
    const res = await fetch(`/api/history?ticker=${encodeURIComponent(ticker)}&period=${period}&interval=${interval}`);
    if (!res.ok) throw new Error("Ei historiaa");
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

function formatPrice(v) {
  return v ? v.toLocaleString("fi-FI", { style: "currency", currency: "EUR" }) : "–";
}

function renderCard(stock) {
  const p = prices[stock.ticker];
  if (!p) return "";
  const changePct = p.changePercent || 0;
  const cls = changePct >= 0 ? "positive" : "negative";
  const pp = parseFloat(purchasePrices[stock.ticker]);
  let profitHtml = "";
  if (pp && p.price) {
    const diff = (p.price - pp) * 100; // yksinkertaistettu, ei määrää
    const sign = diff >= 0 ? "+" : "";
    profitHtml = `<div class="purchase-info">Ostohinta: ${formatPrice(pp)} <span class="profit ${diff < 0 ? 'negative' : ''}">${sign}${diff.toFixed(2)} €/kpl</span></div>`;
  }
  return `<div class="stock-card" data-change="${cls}">
    <div class="stock-name">${stock.name}<span class="ticker"> ${stock.ticker}</span></div>
    <div class="price-row">
      <div class="price">${formatPrice(p.price)}</div>
      <div class="change-badge ${cls}">${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%</div>
    </div>
    <div class="small-chart-container" id="chart-${stock.ticker}"></div>
    ${profitHtml}
  </div>`;
}

function renderAll() {
  stocksGrid.innerHTML = stocks.map(renderCard).join("");
}

function updateSummary() {
  let totalValue = 0;
  let totalCost = 0;
  let anyPrice = false;

  stocks.forEach(s => {
    const p = prices[s.ticker];
    const pp = parseFloat(purchasePrices[s.ticker]);
    if (p && p.price) {
      anyPrice = true;
      totalValue += p.price; // yksinkertaistettu: 1 kpl per osake
      if (pp) totalCost += pp;
    }
  });

  if (!anyPrice) {
    summarySection.style.display = "none";
    return;
  }

  const totalChange = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  summaryGrid.innerHTML = `
    <div class="summary-card">
      <h2>Kokonaisarvo</h2>
      <p>${formatPrice(totalValue)}</p>
    </div>
    <div class="summary-card">
      <h2>Ostohinta (yht.)</h2>
      <p>${formatPrice(totalCost)}</p>
    </div>
    <div class="summary-card">
      <h2>Tuotto</h2>
      <p class="${totalChange >= 0 ? 'positive' : 'negative'}">${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)}%</p>
    </div>
  `;
  summarySection.style.display = "flex";
}

function initChart(ticker) {
  const ctx = document.createElement("canvas");
  document.getElementById(`chart-${ticker}`).appendChild(ctx);
  charts[ticker] = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: { labels: [], datasets: [{ label: ticker, data: [], borderColor: "#3498db", backgroundColor: "rgba(52,152,219,0.1)", fill: true, tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
  });
}

async function updateChart(ticker, period, interval) {
  const hist = await fetchHistory(ticker, period, interval);
  if (!hist || !hist.timestamps || !hist.prices) return;
  const chart = charts[ticker];
  if (!chart) return;
  chart.data.labels = hist.timestamps;
  chart.data.datasets[0].data = hist.prices;
  chart.update();
}

async function loadAll() {
  // Hae hinnat kaikille
  await Promise.all(stocks.map(s => fetchPrice(s.ticker)));
  renderAll();
  updateSummary();

  // Piirrä pienet kaaviot
  stocks.forEach(s => {
    initChart(s.ticker);
    updateChart(s.ticker, timeRange.value, "1d");
  });
}

// Tapahtumat
timeRange.addEventListener("change", () => {
  stocks.forEach(s => updateChart(s.ticker, timeRange.value, "1d"));
});

select.addEventListener("change", () => {
  const t = select.value;
  purchaseInput.value = purchasePrices[t] || "";
  updateChart(t, timeRange.value, "1d");
});

purchaseInput.addEventListener("blur", () => {
  const t = select.value;
  const v = parseFloat(purchaseInput.value);
  if (!isNaN(v)) {
    purchasePrices[t] = v;
    localStorage.setItem("purchasePrices", JSON.stringify(purchasePrices));
    renderAll();
    updateSummary();
  }
});

// Käynnistä
loadAll();
setInterval(loadAll, 60000);
