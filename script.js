// ==================================================
// IMPULSA — FIXED DROPDOWNS + FILTERS SAVED
// ==================================================

// 🔑 YOUR NEWSAPI KEY — PUT YOUR REAL KEY INSIDE THE QUOTES
const NEWS_API_KEY = "pub_98a9005051034de29cb0aca05a77fc4a";

// Get ALL page elements
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

let lastNewsTitles = [];

// ==================================================
// ✅ FIXED DROPDOWN CODE — THIS MAKES THEM CLICKABLE
// ==================================================
function setupDropdowns() {
  const dropdownBtns = document.querySelectorAll('.dropdown-btn');
  
  dropdownBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const list = document.getElementById(targetId);
      
      // Close ALL other dropdowns first
      document.querySelectorAll('.dropdown-list').forEach(dl => {
        if (dl.id !== targetId) dl.classList.remove('open');
      });
      
      // Toggle THIS dropdown
      list.classList.toggle('open');
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-list').forEach(dl => {
      dl.classList.remove('open');
    });
  });

  // Keep dropdown open when clicking inside
  document.querySelectorAll('.dropdown-list').forEach(list => {
    list.addEventListener('click', (e) => e.stopPropagation());
  });
}

// ==================================================
// REMEMBER SAVED FILTERS
// ==================================================
function loadSavedFilters() {
  const savedFilters = localStorage.getItem('impulsa_filters');
  const lastScreen = localStorage.getItem('impulsa_last_screen');

  if (savedFilters) {
    const f = JSON.parse(savedFilters);

    // Restore markets
    document.querySelectorAll('input[name="markets"]').forEach(cb => {
      cb.checked = f.markets.includes(cb.value);
    });
    const allBoxes = document.querySelectorAll('input[name="markets"]');
    selectAllMarkets.checked = [...allBoxes].every(cb => cb.checked);

    // Restore longevity
    const longRadio = document.querySelector(`input[name="longevity"][value="${f.longevity}"]`);
    if (longRadio) longRadio.checked = true;

    // Restore impact slider
    if (f.showAllImpact) {
      impactAllCheckbox.checked = true;
      slider.disabled = true;
      scoreValue.textContent = "All Scores";
    } else {
      impactAllCheckbox.checked = false;
      slider.disabled = false;
      slider.value = f.minImpact || 7;
      scoreValue.textContent = `${slider.value} – 10`;
    }

    // Go straight to Home if that's where we left off
    if (lastScreen === 'home') {
      setupPage.classList.remove('active');
      homePage.classList.add('active');
      fetchAndShowNews();
    }
  }

  // Restore notification toggle
  const notifOn = localStorage.getItem('impulsa_notifications') === 'true';
  notificationsToggle.checked = notifOn && Notification.permission === "granted";
}

// ==================================================
// PAGE FULLY LOADED → RUN EVERYTHING
// ==================================================
document.addEventListener('DOMContentLoaded', () => {
  setupDropdowns(); // ✅ Dropdowns work FIRST
  loadSavedFilters();

  // Select All Markets
  selectAllMarkets.addEventListener('change', () => {
    document.querySelectorAll('input[name="markets"]').forEach(cb => {
      cb.checked = selectAllMarkets.checked;
    });
  });

  // Impact slider
  slider.addEventListener('input', () => {
    scoreValue.textContent = `${slider.value} – 10`;
    impactAllCheckbox.checked = false;
  });

  impactAllCheckbox.addEventListener('change', () => {
    slider.disabled = impactAllCheckbox.checked;
    scoreValue.textContent = impactAllCheckbox.checked ? "All Scores" : `${slider.value} – 10`;
  });

  // Notifications toggle
  notificationsToggle.addEventListener('change', async () => {
    if (notificationsToggle.checked) {
      const perm = await Notification.requestPermission();
      notificationsToggle.checked = perm === "granted";
    }
    localStorage.setItem('impulsa_notifications', notificationsToggle.checked);
  });

  // ==================================================
  // ✅ CONTINUE BUTTON — GOES TO NEXT PAGE
  // ==================================================
  continueBtn.addEventListener('click', async () => {
    const selectedMarkets = [...document.querySelectorAll('input[name="markets"]:checked')].map(cb => cb.value);
    
    if (selectedMarkets.length === 0) {
      alert('⚠️ Pick at least ONE market first!');
      return;
    }

    const filters = {
      markets: selectedMarkets,
      longevity: document.querySelector('input[name="longevity"]:checked')?.value || "all",
      minImpact: impactAllCheckbox.checked ? 1 : parseInt(slider.value),
      showAllImpact: impactAllCheckbox.checked
    };

    // Save forever until changed
    localStorage.setItem('impulsa_filters', JSON.stringify(filters));
    localStorage.setItem('impulsa_last_screen', 'home');

    // ✅ SWITCH PAGE — THIS IS WHAT WAS MISSING
    setupPage.classList.remove('active');
    homePage.classList.add('active');
    
    lastNewsTitles = [];
    await fetchAndShowNews();
  });

  // Settings button
  settingsBtn.addEventListener('click', () => {
    localStorage.setItem('impulsa_last_screen', 'setup');
    homePage.classList.remove('active');
    setupPage.classList.add('active');
  });

  // Back button
  backBtn.addEventListener('click', () => {
    localStorage.setItem('impulsa_last_screen', 'home');
    detailPage.classList.remove('active');
    homePage.classList.add('active');
  });
});

// ==================================================
// NEWS FETCH & SCORING
// ==================================================
async function fetchAndShowNews() {
  if (!homePage.classList.contains('active')) return;
  newsFeed.innerHTML = '<p class="empty-state">⚡ Loading news...</p>';

  const filters = JSON.parse(localStorage.getItem('impulsa_filters'));
  const marketMap = {
    "S&P 500": "S&P 500 stock market",
    "NASDAQ": "NASDAQ tech stocks",
    "FTSE 100": "FTSE 100 UK",
    "DAX": "DAX Germany",
    "EUR/USD": "EUR USD forex",
    "GBP/USD": "GBP USD pound",
    "Bitcoin": "Bitcoin BTC crypto",
    "Ethereum": "Ethereum ETH",
    "Gold": "Gold price commodity",
    "Oil": "Oil price crude"
  };

  const searchQuery = `(${filters.markets.map(m => marketMap[m] || m).join(" OR ")}) AND (market OR economy OR policy OR news OR Trump)`;

  try {
    const res = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${NEWS_API_KEY}`);
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (!data.articles?.length) return showDemoFallback(filters);

    const scoredNews = data.articles.map(a => scoreArticle(a, filters));
    let filtered = scoredNews.filter(n => n.impact >= filters.minImpact);
    if (filters.longevity !== "all") filtered = filtered.filter(n => n.longevityType === filters.longevity);

    checkForNewNews(filtered);
    displayNews(filtered);
  } catch (err) {
    console.error(err);
    showDemoFallback(filters);
  }
}

function scoreArticle(article, filters) {
  const title = (article.title || "").toLowerCase();
  const desc = (article.description || "").toLowerCase();
  const fullText = title + " " + desc;

  let impact = 5;
  const highWords = ["trump", "fed", "rate", "decision", "ban", "approve", "crash", "surge", "record", "deal", "tariff", "announce"];
  const medWords = ["rise", "fall", "change", "update", "plan", "talks"];
  highWords.forEach(w => { if (fullText.includes(w)) impact += 2; });
  medWords.forEach(w => { if (fullText.includes(w)) impact += 1; });
  impact = Math.max(1, Math.min(10, impact));

  let longevityType = "1-5hrs", longevityLabel = "1–5 Hours";
  if (fullText.includes("rate") || fullText.includes("policy") || fullText.includes("election") || fullText.includes("trump")) {
    longevityType = "1-2weeks"; longevityLabel = "1–2 Weeks";
  } else if (fullText.includes("earnings") || fullText.includes("report") || fullText.includes("data")) {
    longevityType = "1-3days"; longevityLabel = "1–3 Days";
  }

  let matchedMarket = "Market News";
  for (const m of filters.markets) {
    if (fullText.includes(m.toLowerCase())) { matchedMarket = m; break; }
  }

  const why = generateWhy(title, matchedMarket);
  const correlation = `This matches your filters:\n• ${matchedMarket} is selected ✅\n• Impact ${impact}/10 meets your min ${filters.minImpact}\n• Window: ${longevityLabel}`;

  return {
    market: matchedMarket,
    headline: article.title,
    description: article.description || "No description available.",
    source: article.source?.name || "News",
    impact,
    longevityType,
    longevityLabel,
    explanations: { why, correlation },
    time: getTimeAgo(new Date(article.publishedAt)),
    url: article.url
  };
}

function generateWhy(title, market) {
  if (title.includes("trump") || title.includes("president")) {
    return "Statements or policy changes shift market expectations — affecting trade, rules & confidence.";
  } else if (title.includes("rate") || title.includes("fed")) {
    return "Interest rates change borrowing costs — higher = pressure; lower = growth boost.";
  } else if (title.includes("rise") || title.includes("surge")) {
    return "Buying & optimism pushing prices up — markets move higher on confidence.";
  } else if (title.includes("fall") || title.includes("drop")) {
    return "Selling & uncertainty pushing prices down — fear accelerates declines.";
  } else if (market === "Gold" || market === "Oil") {
    return "Commodities shift with supply, demand & geopolitics. Gold = safe haven.";
  }
  return "New info changes expectations — traders price it in → market moves.";
}

function checkForNewNews(news) {
  if (localStorage.getItem('impulsa_notifications') !== 'true') return;
  if (Notification.permission !== "granted") return;
  const brandNew = news.filter(n => !lastNewsTitles.includes(n.headline));
  brandNew.slice(0, 2).forEach(item => {
    new Notification(`⚡ Impulsa — ${item.market}`, {
      body: `${item.headline.substring(0, 55)}...\nImpact: ${item.impact}/10`
    });
  });
  lastNewsTitles = news.map(n => n.headline);
}

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