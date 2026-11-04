// ==========================================
// DASHBOARD.JS
// ==========================================

window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  document.getElementById('statItems').textContent = new Set(data.map(i => i.code)).size;

  const totalQty = data.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  document.getElementById('statQty').textContent = formatNumber(totalQty);

  const totalValue = data.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0)), 0);
  document.getElementById('statValue').textContent = 'Rs. ' + formatNumber(totalValue);

  let alertsCount = 0;
  const merged = {};
  data.forEach(item => {
    if (merged[item.code]) merged[item.code].qty += (Number(item.qty) || 0);
    else merged[item.code] = { ...item, qty: Number(item.qty) || 0 };
  });

  Object.values(merged).forEach(item => {
    const qty = Number(item.qty);
    const uom = (item.uom || 'NOS').toUpperCase();
    if (qty <= 0) alertsCount++;
    else if (uom === 'NOS' && qty < 500) alertsCount++;
    else if ((uom === 'KGS' || uom === 'KG') && qty < 100) alertsCount++;
  });
  
  document.getElementById('statAlerts').textContent = alertsCount;
  document.getElementById('statUpdated').textContent = data.length > 0 ? formatDate(new Date()).split(' ')[0] : '—';
};

window.renderDashboardTable = function() {
  const tbody = document.getElementById('dashTable');
  if (!tbody) return;

  const query = document.getElementById('dashSearch')?.value.toLowerCase() || '';
  
  // Yahan fix kiya gaya hai: Dashboard par saara data show hoga, sirf slow moving nahi
  let data = window.inventoryData;
  
  const filtered = data.filter(item => 
    !query || item.code.toLowerCase().includes(query) || (item.desc || '').toLowerCase().includes(query)
  );

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="4" class="empty">Loading...</td></tr>`;
  if (filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="4" class="empty">No items found.</td></tr>`;

  // Table mein pehle 15 items dikhayen
  const recent = filtered.slice(0, 15);
  
  tbody.innerHTML = recent.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td>${formatNumber(item.qty)}</td>
    </tr>
  `).join('');

  if (filtered.length > 15) {
    tbody.innerHTML += `<tr><td colspan="4" class="empty" style="font-size:10px; padding:10px">Showing 15 of ${filtered.length} items. Go to Inventory to see all.</td></tr>`;
  }
};
