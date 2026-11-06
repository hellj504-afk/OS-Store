// ==========================================
// APP.JS — Navigation & Page Controller (Fixed)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  
  const nav = document.getElementById('nav');
  if (!nav) return;

  // Navigation Click Event
  nav.addEventListener('click', (e) => {
    // Jab icon (SVG) ya text par click ho, toh closest button dhoondein
    const btn = e.target.closest('button');
    if (!btn) return;

    // 1. Active class update karein
    document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');

    // 2. Saare pages hide karein
    document.querySelectorAll('.section-page').forEach(x => x.classList.remove('active'));

    // 3. Target page show karein
    const targetPage = btn.dataset.page;
    const pageEl = document.getElementById('page-' + targetPage);
    if (pageEl) {
      pageEl.classList.add('active');
    }

    // 4. Header Title update karein
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
    document.getElementById('headerTitle').textContent = titles[targetPage] || 'Dashboard';

    // 5. Page specific render functions call karein
    if (targetPage === 'alerts' && window.renderAlerts) window.renderAlerts();
    if (targetPage === 'slow_moving' && window.renderSlowMoving) window.renderSlowMoving();
    if (targetPage === 'bom' && window.renderBOM) window.renderBOM();
    if (targetPage === 'issue' && window.renderIssue) window.renderIssue();
    if (targetPage === 'ir' && window.renderIR) window.renderIR();
  });

  // Firebase Ready event
  window.addEventListener('firebaseReady', async () => {
    setTimeout(async () => {
      if (typeof window.refreshInventoryData === 'function') {
        await window.refreshInventoryData();
      }
    }, 500);
  });

  // Fallback: Agar 3 second mein data load na ho
  setTimeout(() => { 
    if (!window.isDataLoaded && window.refreshInventoryData) {
      window.refreshInventoryData(); 
    }
  }, 3000);

  // Escape key se modal band karein
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('itemModal').classList.contains('open')) {
      window.closeItemModal();
    }
  });

  // Modal backdrop click se band karein
  document.getElementById('itemModal').addEventListener('click', (e) => {
    if (e.target.id === 'itemModal') window.closeItemModal();
  });

});
