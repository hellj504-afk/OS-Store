// ==========================================
// DASHBOARD.JS — Stats & Calculations
// ==========================================

window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  // 1. Total Unique Items
  const uniqueCodes = new Set(data.map(i => i.code));
  const totalItemsEl = document.getElementById('statItems');
  if (totalItemsEl) totalItemsEl.textContent = uniqueCodes.size;

  // 2. Total Cost (Value) - K/M/B Format
  const totalValue = data.reduce((sum, item) => {
    return sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0));
  }, 0);
  
  const statValueEl = document.getElementById('statValue');
  if (statValueEl) {
    // formatCost function utils.js se aata hai (jo K/M/B banata hai)
    if (typeof formatCost === 'function') {
      statValueEl.textContent = formatCost(totalValue);
    } else {
      statValueEl.textContent = 'Rs. ' + formatNumber(totalValue);
    }
  }

  // 3. Low Stock Count (NOS < 500, KGS < 100, Zero)
  let lowStockCount = 0;
  const merged = {};
  
  // Pehle same codes ko mila lein taake total qty nikal sake
  data.forEach(item => {
    if (merged[item.code]) {
      merged[item.code].qty += (Number(item.qty) || 0);
    } else {
      merged[item.code] = { ...item, qty: Number(item.qty) || 0 };
    }
  });

  // Phir condition check karein
  Object.values(merged).forEach(item => {
    const uom = (item.uom || 'NOS').toUpperCase();
    const qty = Number(item.qty);
    
    if (qty <= 0) {
      lowStockCount++;
    } else if (uom === 'NOS' && qty < 500) {
      lowStockCount++;
    } else if ((uom === 'KGS' || uom === 'KG') && qty < 100) {
      lowStockCount++;
    }
  });

  const statAlertsEl = document.getElementById('statAlerts');
  if (statAlertsEl) {
    statAlertsEl.textContent = lowStockCount;
    // Agar dashboard par koi animation ya color change chahiye toh yahan kar sakte hain
  }
};

// Agar aapko dashboard par table chahiye thi to ye function use hoga (filhal naye design mein table nahi hai)
window.renderDashboardTable = function() {
  const tbody = document.getElementById('dashTable');
  if (!tbody) return;

  const query = document.getElementById('dashSearch')?.value.toLowerCase() || '';
  const filtered = window.inventoryData.filter(item => !query || item.code.toLowerCase().includes(query));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading...</td></tr>`;
  if (filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="empty">No items found.</td></tr>`;

  const recent = filtered.slice(0, 10);
  tbody.innerHTML = recent.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td>${formatNumber(item.qty)}</td>
    </tr>
  `).join('');
};
