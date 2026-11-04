document.getElementById('nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.section-page').forEach(x => x.classList.remove('active'));

  const targetPage = btn.dataset.page;
  document.getElementById('page-' + targetPage).classList.add('active');

  const titles = { dashboard: 'Dashboard', inventory: 'Custom Inventory', slow_moving: 'Slow Moving', alerts: 'Low Stock Alerts', pdf: 'PDF Import Center' };
  document.getElementById('headerTitle').textContent = titles[targetPage] || 'Dashboard';

  if (targetPage === 'alerts') window.renderAlerts();
  if (targetPage === 'slow_moving') window.renderSlowMoving();
});

window.showPage = function(pageName) {
  document.querySelector(`.nav button[data-page="${pageName}"]`).click();
};

window.addEventListener('firebaseReady', async () => {
  setTimeout(async () => {
    if (typeof window.refreshInventoryData === 'function') await window.refreshInventoryData();
  }, 500);
});

setTimeout(() => { if (!window.isDataLoaded && window.refreshInventoryData) window.refreshInventoryData(); }, 3000);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('itemModal').classList.contains('open')) window.closeItemModal();
});
document.getElementById('itemModal').addEventListener('click', (e) => {
  if (e.target.id === 'itemModal') window.closeItemModal();
});
