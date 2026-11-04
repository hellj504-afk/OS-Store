// ==========================================
// APP.JS — Main controller & initialization
// ==========================================

document.getElementById('nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.section-page').forEach(x => x.classList.remove('active'));

  const targetPage = btn.dataset.page;
  const pageEl = document.getElementById('page-' + targetPage);
  if (pageEl) pageEl.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    inventory: 'Custom Inventory',
    alerts: 'Low Stock Alerts',
    pdf: 'PDF Import Center'
  };
  document.getElementById('headerTitle').textContent = titles[targetPage] || 'Dashboard';

  // Agar Alerts page khula hai, toh alert table render karein
  if (targetPage === 'alerts' && window.renderAlerts) {
    window.renderAlerts();
  }
});

window.showPage = function(pageName) {
  const btn = document.querySelector(`.nav button[data-page="${pageName}"]`);
  if (btn) btn.click();
};

window.addEventListener('firebaseReady', async () => {
  setTimeout(async () => {
    if (typeof window.refreshInventoryData === 'function') {
      await window.refreshInventoryData();
    }
  }, 500);
});

setTimeout(() => {
  if (!window.isDataLoaded && typeof window.refreshInventoryData === 'function') {
    window.refreshInventoryData();
  }
}, 3000);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('itemModal');
    if (modal && modal.classList.contains('open')) window.closeItemModal();
  }
});

document.getElementById('itemModal').addEventListener('click', (e) => {
  if (e.target.id === 'itemModal') window.closeItemModal();
});
