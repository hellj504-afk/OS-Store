// ==========================================
// APP.JS — Navigation Controller
// ==========================================

window.showPage = function(pageName) {
  // 1. Update active button
  const btns = document.querySelectorAll('.nav button');
  btns.forEach(btn => {
    if (btn.dataset.page === pageName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // 2. Hide all pages
  document.querySelectorAll('.section-page').forEach(x => x.classList.remove('active'));

  // 3. Show target page
  const pageEl = document.getElementById('page-' + pageName);
  if (pageEl) {
    pageEl.classList.add('active');
  }

  // 4. Update Header Title
  const titles = { 
    dashboard: 'Dashboard', 
    inventory: 'Custom Inventory', 
    slow_moving: 'Slow Moving', 
    bom: 'BOM Management', 
    issue: 'Issue Voucher', 
    ir: 'IR / Move Order', 
    failure: 'Failure & Scrap', 
    alerts: 'Low Stock Alerts', 
    pdf: 'PDF / Excel Import' 
  };
  document.getElementById('headerTitle').textContent = titles[pageName] || 'Dashboard';

  // 5. Render page specific data
  if (pageName === 'alerts' && window.renderAlerts) window.renderAlerts();
  if (pageName === 'slow_moving' && window.renderSlowMoving) window.renderSlowMoving();
  if (pageName === 'bom' && window.renderBOM) window.renderBOM();
  if (pageName === 'issue' && window.renderIssue) window.renderIssue();
  if (pageName === 'ir' && window.renderIR) window.renderIR();
};

// Firebase Ready Event
window.addEventListener('firebaseReady', async () => {
  setTimeout(async () => {
    if (typeof window.refreshInventoryData === 'function') {
      await window.refreshInventoryData();
    }
  }, 500);
});

// Fallback
setTimeout(() => { 
  if (!window.isDataLoaded && window.refreshInventoryData) {
    window.refreshInventoryData(); 
  }
}, 3000);

// Modal Close on ESC and Backdrop click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('itemModal')?.classList.contains('open')) {
    window.closeItemModal();
  }
});

document.getElementById('itemModal')?.addEventListener('click', (e) => {
  if (e.target.id === 'itemModal') window.closeItemModal();
});
