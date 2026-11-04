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
    dashboard: 'Dashboard', inventory: 'Custom Inventory', slow_moving: 'Slow Moving', 
    bom: 'BOM Management', issue: 'Issue Voucher', ir: 'IR / Move Order', 
    failure: 'Failure & Scrap', alerts: 'Low Stock Alerts', pdf: 'PDF Import Center' 
  };
  document.getElementById('headerTitle').textContent = titles[targetPage] || 'Dashboard';

  if (targetPage === 'alerts' && window.renderAlerts) window.renderAlerts();
  if (targetPage === 'slow_moving' && window.renderSlowMoving) window.renderSlowMoving();
  if (targetPage === 'bom' && window.renderBOM) window.renderBOM();
  if (targetPage === 'issue' && window.renderIssue) window.renderIssue();
  if (targetPage === 'ir' && window.renderIR) window.renderIR();
  if (targetPage === 'failure' && window.renderFailure) window.renderFailure();
});

window.showPage = function(pageName) {
  const btn = document.querySelector(`.nav button[data-page="${pageName}"]`);
  if (btn) btn.click();
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
