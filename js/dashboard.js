// ==========================================
// DASHBOARD.JS — Donut Stats & K/M/B Cost
// ==========================================

window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  const uniqueCodes = new Set(data.map(i => i.code));
  if (document.getElementById('statItems')) document.getElementById('statItems').textContent = uniqueCodes.size;

  const totalValue = data.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0)), 0);
  if (document.getElementById('statValue')) document.getElementById('statValue').textContent = formatCost(totalValue);

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

  if (document.getElementById('statAlerts')) document.getElementById('statAlerts').textContent = lowStockCount;
};
