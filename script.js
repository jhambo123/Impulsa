// ========== PAGE SWITCHING ==========
const filterPage = document.getElementById('filterPage');
const homePage = document.getElementById('homePage');
const continueBtn = document.getElementById('continueBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Dropdown toggles
const marketDropdown = document.getElementById('marketDropdown');
const impactDropdown = document.getElementById('impactDropdown');
const marketBox = marketDropdown.parentElement;
const impactBox = impactDropdown.parentElement;

// Open/close dropdowns
marketDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
  marketBox.classList.toggle('open');
  impactBox.classList.remove('open');
});

impactDropdown.addEventListener('click', (e) => {
  e.stopPropagation();
  impactBox.classList.toggle('open');
  marketBox.classList.remove('open');
});

// Close when tapping outside
document.addEventListener('click', () => {
  marketBox.classList.remove('open');
  impactBox.classList.remove('open');
});

// ✅ SAVE FILTERS & GO TO HOME SCREEN
continueBtn.addEventListener('click', () => {
  const selectedMarkets = Array.from(document.querySelectorAll('.market-check:checked')).map(c => c.value);
  const selectedImpact = document.querySelector('input[name="impact"]:checked')?.value || 7;

  if (selectedMarkets.length === 0) {
    alert('Please select at least one market category!');
    return;
  }

  localStorage.setItem('impulsa_categories', JSON.stringify(selectedMarkets));
  localStorage.setItem('impulsa_minImpact', selectedImpact);

  filterPage.classList.remove('active');
  homePage.classList.add('active');

  console.log('Saved → Markets:', selectedMarkets, 'Min Impact:', selectedImpact);
});

// Back to filters
settingsBtn.addEventListener('click', () => {
  homePage.classList.remove('active');
  filterPage.classList.add('active');
});