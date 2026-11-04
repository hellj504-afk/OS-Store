window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  document.getElementById('statItems').textContent = new Set(data.map(i => i.code)).size;

  const totalQty = data.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  document.getElementById('statQty').textContent = formatNumber(totalQty);

  const totalValue = data.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0)), 0);
  document.getElementById('statValue').textContent = 'Rs. ' + formatNumber(totalValue);

  // Low stock count calculate
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
};
