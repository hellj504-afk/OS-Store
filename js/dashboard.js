// ==========================================
// DASHBOARD.JS — Stats & Store Cost
// ==========================================

window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  const uniqueCodes = new Set(data.map(i => i.code));
  if (document.getElementById('statItems')) document.getElementById('statItems').textContent = uniqueCodes.size;

  // 1. Total Inventory Cost (WIP)
  const invData = data.filter(i => !i.source?.includes('slow_moving') && !i.source?.includes('bom') && !i.source?.includes('assembly') && !i.source?.includes('store'));
  const totalInvValue = invData.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0)), 0);
  if (document.getElementById('statValue')) document.getElementById('statValue').textContent = formatCost(totalInvValue);

  // 2. Store Cost (NEW)
  const storeData = data.filter(i => i.source && i.source.includes('store'));
  const totalStoreValue = storeData.reduce((sum, item) => sum + ((Number(item.qty) || 0) * (Number(item.cost) || 0)), 0);
  if (document.getElementById('statStoreValue')) document.getElementById('statStoreValue').textContent = formatCost(totalStoreValue);

  // 3. Low Stock Count
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
