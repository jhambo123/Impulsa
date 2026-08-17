// ==============================================
// IMPULSA — CLEAN MINIMAL WITH DROPDOWNS
// ==============================================

let userFilters = {
  markets: { Indices: true, Forex: true, Crypto: true, Commodities: true, Economic: true, Bonds: true },
  minImpact: 5,
  notifications: true
};

const newsData = [
  { id: 1, source: "Impulsa", time: "2 min ago", title: "Fed signals cautious rate path shift", desc: "Fed commentary shifts rate expectations across markets.", markets: ["Economic", "Bonds"], impact: 9 },
  { id: 2, source: "Impulsa", time: "11 min ago", title: "US CPI hotter than expected", desc: "Inflation data challenges rate-cut outlook.", markets: ["Economic", "Indices", "Bonds"], impact: 10 },
  { id: 3, source: "Impulsa", time: "24 min ago", title: "Gold rallies on risk concerns", desc: "Safe-haven demand boosts precious metals.", markets: ["Commodities", "Bonds"], impact: 7 },
  { id: 4, source: "Impulsa", time: "1 hr ago", title: "Bitcoin breaks key resistance", desc: "Crypto momentum strengthens across the board.", markets: ["Crypto"], impact: 8 },
  { id: 5, source: "Impulsa", time: "2 hr ago", title: "EUR/USD holds steady", desc: "Range-bound trading continues into London session.", markets: ["Forex"], impact: 4 }
];

// ==============================================
// PAGE SWITCHING
// ==============================================
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ==============================================
// DROPDOWN TOGGLE
// ==============================================
function setupDropdown(toggleId, contentId) {
  const toggle = document.getElementById(toggleId);
  const content = document.getElementById(contentId);
  toggle?.addEventListener('click', () => {
    toggle.classList.toggle('open');
    content.classList.toggle('open');
  });
}

// ==============================================
// INIT APP
// ==============================================
function init() {
  setupDropdown('marketsToggle', 'marketsDropdown');
  setupDropdown('impactToggle', 'impactDropdown');
  setupDropdown('notifToggle', 'notifDropdown');
  setupDropdown('s_marketsToggle', 's_marketsDropdown');
  setupDropdown('s_impactToggle', 's_impactDropdown');
  setupDropdown('s_notifToggle', 's_notifDropdown');

  // Slider live update
  document.getElementById('impactSlider')?.addEventListener('input', e => {
    document.getElementById('impactVal').textContent = e.target.value;
  });
  document.getElementById('s_impactSlider')?.addEventListener('input', e => {
    document.getElementById('s_impactVal').textContent = e.target.value;
  });

  const saved = localStorage.getItem('impulsa_filters');
  if (saved) {
    userFilters = JSON.parse(saved);
    loadSettingsUI();
    showPage('homePage');
  } else {
    showPage('setupPage');
  }

  updateClock();
  setInterval(updateClock, 1000);
  renderNews();
  requestNotifPerm();
}

// ==============================================
// SAVE & CONTINUE
// ==============================================
function saveAndGoHome() {
  userFilters.markets.Indices = document.querySelector('input[name="market"][value="Indices"]').checked;
  userFilters.markets.Forex = document.querySelector('input[name="market"][value="Forex"]').checked;
  userFilters.markets.Crypto = document.querySelector('input[name="market"][value="Crypto"]').checked;
  userFilters.markets.Commodities = document.querySelector('input[name="market"][value="Commodities"]').checked;
  userFilters.markets.Economic = document.querySelector('input[name="market"][value="Economic"]').checked;
  userFilters.markets.Bonds = document.querySelector('input[name="market"][value="Bonds"]').checked;
  userFilters.minImpact = parseInt(document.getElementById('impactSlider').value);
  userFilters.notifications = document.getElementById('notifCheck').checked;

  localStorage.setItem('impulsa_filters', JSON.stringify(userFilters));
  renderNews();
  showPage('homePage');
}

// ==============================================
// SETTINGS PAGE
// ==============================================
function loadSettingsUI() {
  document.getElementById('s_Indices').checked = userFilters.markets.Indices;
  document.getElementById('s_Forex').checked = userFilters.markets.Forex;
  document.getElementById('s_Crypto').checked = userFilters.markets.Crypto;
  document.getElementById('s_Commodities').checked = userFilters.markets.Commodities;
  document.getElementById('s_Economic').checked = userFilters.markets.Economic;
  document.getElementById('s_Bonds').checked = userFilters.markets.Bonds;
  document.getElementById('s_impactSlider').value = userFilters.minImpact;
  document.getElementById('s_impactVal').textContent = userFilters.minImpact;
  document.getElementById('s_notifCheck').checked = userFilters.notifications;
}

function saveSettings() {
  userFilters.markets.Indices = document.getElementById('s_Indices').checked;
  userFilters.markets.Forex = document.getElementById('s_Forex').checked;
  userFilters.markets.Crypto = document.getElementById('s_Crypto').checked;
  userFilters.markets.Commodities = document.getElementById('s_Commodities').checked;
  userFilters.markets.Economic = document.getElementById('s_Economic').checked;
  userFilters.markets.Bonds = document.getElementById('s_Bonds').checked;
  userFilters.minImpact = parseInt(document.getElementById('s_impactSlider').value);
  userFilters.notifications = document.getElementById('s_notifCheck').checked;

  localStorage.setItem('impulsa_filters', JSON.stringify(userFilters));
  renderNews();
  showPage('homePage');
}

// ==============================================
// RENDER NEWS
// ==============================================
function renderNews() {
  const feed = document.getElementById('newsFeed');
  if (!feed) return;
  feed.innerHTML = '';

  const filtered = newsData.filter(s => {
    const marketOk = s.markets.some(m => userFilters.markets[m]);
    const impactOk = s.impact >= userFilters.minImpact;
    return marketOk && impactOk;
  });

  if (filtered.length === 0) {
    feed.innerHTML = '<p style="text-align:center;color:#666;padding:60px 20px;">No news matching your filters</p>';
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <div class="news-meta">${s.source} • ${s.time}</div>
      <h3 class="news-title">${s.title}</h3>
      <p class="news-desc">${s.desc}</p>
      <div class="news-impact">${'⭐'.repeat(s.impact)} ${s.impact}/10</div>
    `;
    feed.appendChild(card);
  });
}

// ==============================================
// NOTIFICATIONS + CLOCK
// ==============================================
function requestNotifPerm() {
  if (Notification.permission === 'default') Notification.requestPermission();
}

function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString('en-GB', {hour12: false});
}

// ==============================================
// BUTTONS
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('continueBtn')?.addEventListener('click', saveAndGoHome);
  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    loadSettingsUI();
    showPage('settingsPage');
  });
  document.getElementById('backBtn')?.addEventListener('click', () => showPage('homePage'));
  document.getElementById('saveBtn')?.addEventListener('click', saveSettings);
  document.getElementById('refreshBtn')?.addEventListener('click', renderNews);
});