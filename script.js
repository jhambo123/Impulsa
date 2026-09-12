// ==================================================
// IMPULSA — NOTIFICATIONS + DETAIL EXPLANATIONS VERSION
// ==================================================

// 🔑 YOUR NEWSAPI KEY
const NEWS_API_KEY = "pub_98a9005051034de29cb0aca05a77fc4a";

const setupPage = document.getElementById('setup-page');
const homePage = document.getElementById('home-page');
const detailPage = document.getElementById('detail-page');
const continueBtn = document.getElementById('continue-btn');
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const slider = document.getElementById('impact-threshold');
const scoreValue = document.getElementById('score-value');
const impactAllCheckbox = document.getElementById('impact-all');
const selectAllMarkets = document.getElementById('select-all-markets');
const notificationsToggle = document.getElementById('notifications-enabled');
const newsFeed = document.getElementById('news-feed');
const detailContent = document.getElementById('detail-content');

let lastNewsTitles = []; // Track for new notifications

// --------------------------
// DROPDOWNS
// --------------------------
document.querySelectorAll('.dropdown-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.getAttribute('data-target')).classList.toggle('open');
  });
});

// Select All Markets
selectAllMarkets.addEventListener('change', () => {
  document.querySelectorAll('input[name="markets"]').forEach(cb => cb.checked = selectAllMarkets.checked);
});

// Impact Slider + All
slider.addEventListener('input', () => {
  scoreValue.textContent = `${slider.value} – 10`;
  impactAllCheckbox.checked = false;
});
impactAllCheckbox.addEventListener('change', () => {
  slider.disabled = impactAllCheckbox.checked;
  scoreValue.textContent = impactAllCheckbox.checked ? "All Scores" : `${slider.value} – 10`;
});

// --------------------------
// NOTIFICATION PERMISSION
// --------------------------
notificationsToggle.addEventListener('change', async () => {
  if (notificationsToggle.checked && "Notification" in window) {
    const permission = await Notification.requestPermission();
    notificationsToggle.checked = (permission === "granted");
    localStorage.setItem('impulsa_notifications', notificationsToggle.checked);
  } else {
    localStorage.setItem('impulsa_notifications', 'false');
  }
});

// Load saved notification setting
const savedNotif = localStorage.getItem('impulsa_notifications') === 'true';
notificationsToggle.checked = savedNotif && "Notification" in window && Notification.permission === "granted";

// --------------------------
// CONTINUE → GO!
// --------------------------
continueBtn.addEventListener('click', async () => {
  const selectedMarkets = Array.from(document.querySelectorAll('input[name="markets"]:checked')).map(cb => cb.value);
  if (selectedMarkets.length === 0) return alert('Pick at least one market first!');

  const filters = {
    markets: selectedMarkets,
    longevity: document.querySelector('input[name="longevity"]:checked')?.value || "all",
    minImpact: impactAllCheckbox.checked ? 1 : parseInt(slider.value),
    showAllImpact: impactAllCheckbox.checked
  };
  localStorage.setItem('impulsa_filters', JSON.stringify(filters));

  setupPage.classList.remove('active');
  homePage.classList.add('active');
  lastNewsTitles = [];
  await fetchAndShowNews();
});

// Settings & Back
settingsBtn.addEventListener('click', () => {
  homePage.classList.remove('active');
  setupPage.classList.add('active');
});
backBtn.addEventListener('click', () => {
  detailPage.classList.remove('active');
  homePage.classList.add('active');
});

// --------------------------
// FETCH NEWS
// --------------------------
async function fetchAndShowNews() {
  if (!homePage.classList.contains('active')) return;
  newsFeed.innerHTML = '<p class="empty-state">⚡ Loading news...</p>';
  
  const filters = JSON.parse(localStorage.getItem('impulsa_filters'));
  const marketMap = {
    "S&P 500": "S&P 500 stock market", "NASDAQ": "NASDAQ tech stocks",
    "FTSE 100": "FTSE 100 UK", "DAX": "DAX Germany",
    "EUR/USD": "EUR USD forex", "GBP/USD": "GBP USD pound",
    "Bitcoin": "Bitcoin BTC crypto", "Ethereum": "Ethereum ETH",
    "Gold": "Gold price commodity", "Oil": "Oil price crude"
  };

  const searchQuery = `(${filters.markets.map(m => marketMap[m] || m).join(" OR ")}) AND (market OR economy OR policy OR news OR Trump)`;

  try {
    const res = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${NEWS_API_KEY}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.status !== "ok" || !data.articles.length) return showDemoFallback(filters);

    const scoredNews = data.articles.map(article => scoreArticle(article, filters));
    let filtered = scoredNews.filter(n => n.impact >= filters.minImpact);
    if (filters.longevity !== "all") filtered = filtered.filter(n => n.longevityType === filters.longevity);

    checkForNewNews(filtered); // Send notifications
    displayNews(filtered);
  } catch (err) {
    console.error(err);
    showDemoFallback(filters);
  }
}

// --------------------------
// SCORE ARTICLE + BUILD EXPLANATIONS
// --------------------------
function scoreArticle(article, filters) {
  const title = (article.title || "").toLowerCase();
  const desc = (article.description || "").toLowerCase();
  const fullText = title + " " + desc;

  // Impact scoring
  let impact = 5;
  const high = ["trump", "fed", "rate", "decision", "ban", "approve", "crash", "surge", "record", "deal", "tariff", "announce"];
  const med = ["rise", "fall", "change", "update", "plan", "talks"];
  high.forEach(w => { if (fullText.includes(w)) impact += 2; });
  med.forEach(w => { if (fullText.includes(w)) impact += 1; });
  impact = Math.max(1, Math.min(10, impact));

  // Longevity
  let longevityType = "1-5hrs", longevityLabel = "1–5 Hours";
  if (fullText.includes("rate") || fullText.includes("policy") || fullText.includes("election") || fullText.includes("trump")) {
    longevityType = "1-2weeks"; longevityLabel = "1–2 Weeks";
  } else if (fullText.includes("earnings") || fullText.includes("report") || fullText.includes("data")) {
    longevityType = "1-3days"; longevityLabel = "1–3 Days";
  }

  // Match market
  let matchedMarket = "Market News";
  for (const m of filters.markets) {
    if (fullText.includes(m.toLowerCase())) { matchedMarket = m; break; }
  }

  // Auto-generate EXPLANATIONS
  const explanations = generateExplanations(matchedMarket, title, impact, longevityLabel, filters);

  return {
    market: matchedMarket,
    headline: article.title,
    description: article.description || "No description available.",
    source: article.source?.name || "News",
    impact,
    longevityType,
    longevityLabel,
    explanations,
    time: getTimeAgo(new Date(article.publishedAt)),
    url: article.url
  };
}

// --------------------------
// AUTO EXPLANATIONS
// --------------------------
function generateExplanations(market, title, impact, longevity, filters) {
  let why = "", correlation = "";

  // WHY it's happening
  if (title.includes("trump") || title.includes("president")) {
    why = "This relates to statements or actions from the Trump administration. Policy announcements, trade decisions, and regulatory changes often shift market expectations quickly.";
  } else if (title.includes("rate") || title.includes("fed") || title.includes("central bank")) {
    why = "Interest rate decisions directly affect borrowing costs for companies and governments. Higher rates typically pressure stocks and crypto; lower rates tend to boost growth.";
  } else if (title.includes("rise") || title.includes("surge") || title.includes("gain")) {
    why = "Positive momentum — buying pressure, strong data, or optimism is driving price upward. Markets move higher when confidence increases.";
  } else if (title.includes("fall") || title.includes("drop") || title.includes("crash")) {
    why = "Negative pressure — selling, weak data, or uncertainty is pushing prices down. Fear or caution can accelerate declines.";
  } else if (title.includes("gold") || title.includes("oil") || title.includes("commodity")) {
    why = "Commodities respond to supply/demand, geopolitics, and currency strength. Gold often acts as a 'safe haven' during uncertainty.";
  } else {
    why = "Market news reflects shifting expectations. Traders price in new information, which creates movement.";
  }

  // CORRELATION to YOUR filters
  const isInList = filters.markets.includes(market);
  const scoreMatch = impact >= filters.minImpact;
  correlation = `This matches your filters because:\n• ${market} is in your selected markets ${isInList ? '✅' : '⚠️'}\n• Impact score ${impact}/10 ${scoreMatch ? 'meets' : 'is above'} your minimum of ${filters.minImpact}\n• Expected effect window: ${longevity}`;

  return { why, correlation };
}

// --------------------------
// NOTIFICATIONS
// --------------------------
function checkForNewNews(news) {
  if (localStorage.getItem('impulsa_notifications') !== 'true') return;
  if ("Notification" in window && Notification.permission !== "granted") return;

  const newTitles = news.map(n => n.headline);
  const brandNew = news.filter(n => !lastNewsTitles.includes(n.headline));

  brandNew.slice(0, 2).forEach(item => {
    new Notification(`⚡ Impulsa — ${item.market}`, {
      body: `${item.headline.substring(0, 60)}...\nImpact: ${item.impact}/10`,
      icon: "https://newsapi.org/favicon.ico",
      tag: "impulsa-news"
    });
  });

  lastNewsTitles = newTitles;
}

// --------------------------
// DISPLAY NEWS CARDS
// --------------------------
function displayNews(news) {
  newsFeed.innerHTML = "";
  if (!news.length) {
    newsFeed.innerHTML = '<p class="empty-state">No news matching your filters right now</p>';
    return;
  }
  news.forEach(item => {
    const card = document.createElement('div');
    card.className = "news-card";
    card.innerHTML = `
      <div class="market">${item.market}</div>
      <div class="impact">${'⭐'.repeat(item.impact)} (${item.impact}/10)</div>
      <div class="headline">${item.headline}</div>
      <div class="time">${item.source} • ${item.time}</div>
    `;
    card.addEventListener('click', () => showDetail(item));
    newsFeed.appendChild(card);
  });
}

// --------------------------
// SHOW DETAIL PAGE
// --------------------------
function showDetail(item) {
  detailContent.innerHTML = `
    <div class="detail-card">
      <div class="market">${item.market}</div>
      <div class="impact">${'⭐'.repeat(item.impact)} (${item.impact}/10)</div>
      <h3 class="headline">${item.headline}</h3>
      <p style="color:var(--muted);margin-bottom:1rem;">${item.description}</p>
      
      <h4 class="section-title">🔍 Why this is happening</h4>
      <p class="explanation">${item.explanations.why}</p>
      
      <h4 class="section-title">📊 How this matches your filters</h4>
      <p class="correlation">${item.explanations.correlation.replaceAll('\n', '<br>')}</p>
      
      <p class="longevity-note">⏱️ Effect window: <strong>${item.longevityLabel}</strong></p>
      
      <a href="${item.url}" target="_blank" class="read-full">📰 Read full article →</a>
      <p class="source">Source: ${item.source}</p>
    </div>
  `;
  homePage.classList.remove('active');
  detailPage.classList.add('active');
}

// --------------------------
// DEMO FALLBACK
// --------------------------
function showDemoFallback(filters) {
  const demoArticles = [
    { title: "Trump policy shifts impact global markets", description: "New trade and regulatory announcements move asset prices across multiple sectors.", source: { name: "Demo" }, publishedAt: new Date(Date.now() - 120000).toISOString() },
    { title: "Bitcoin sees renewed institutional interest", description: "Major financial firms increase holdings as adoption accelerates.", source: { name: "Demo" }, publishedAt: new Date(Date.now() - 900000).toISOString() },
    { title: "Gold prices climb on safe-haven demand", description: "Geopolitical uncertainty drives investors toward precious metals.", source: { name: "Demo" }, publishedAt: new Date(Date.now() - 1800000).toISOString() }
  ];
  const demoNews = demoArticles.map(a => scoreArticle(a, filters));
  let filtered = demoNews.filter(n => filters.markets.includes(n.market) && n.impact >= filters.minImpact);
  if (filters.longevity !== "all") filtered = filtered.filter(n => n.longevityType === filters.longevity);
  checkForNewNews(filtered);
  displayNews(filtered);
}

// Time helper
function getTimeAgo(pubDate) {
  const mins = Math.floor((Date.now() - pubDate) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins/60)} hr ago`;
  return `${Math.floor(mins/1440)} days ago`;
}

// Auto-refresh every 5 mins
setInterval(() => {
  if (homePage.classList.contains('active')) fetchAndShowNews();
}, 300000);
