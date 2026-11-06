// ==========================================
// DASHBOARD.JS — Donut Stats & K/M/B Cost
// ==========================================

window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  // Total Items (Unique Codes)
  const uniqueCodes = new Set(data.map(i => i.code));
  document.getElementById('statItems').textContent = uniqueCodes.size;

  // Total Cost (Sum of Qty * Cost)
  const totalValue = data.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0)), 0);
  // Use formatCost (defined in utils.js) to show K/M/B
  document.getElementById('statValue').textContent = formatCost(totalValue);

  // Total Quantity (HIDDEN on dashboard now, but kept in code for safety)
  // const totalQty = data.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  // if(document.getElementById('statQty')) document.getElementById('statQty').textContent = formatNumber(totalQty);

  // Low Stock Count Calculate
  let lowStockCount = 0;
  const merged = {};
  data.forEach(item => {
    if (merged[item.code]) merged[item.code].qty += (Number(item.qty) || 0);
    else merged[item.code] = { ...item, qty: Number(item.qty) || 0 };
  });

  Object.values(merged).forEach(item => {
    const uom = (item.uom || '').toUpperCase();
    const qty = Number(item.qty);
    if (qty <= 0) lowStockCount++;
    else if (uom === 'NOS' && qty < 500) lowStockCount++;
    else if ((uom === 'KGS' || uom === 'KG') && qty < 100) lowStockCount++;
  });

  document.getElementById('statAlerts').textContent = lowStockCount;
  
  // Last Updated Date
  const dateEl = document.getElementById('statUpdated');
  if (dateEl) dateEl.textContent = data.length > 0 ? formatDate(new Date()).split(' ')[0] : '—';
};
