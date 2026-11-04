// ==========================================
// APP.JS — Main controller & initialization
// ==========================================

// ====================
// 1. NAVIGATION (Page Switching)
// ====================
document.getElementById('nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;

  // Sab buttons se active class hatao
  document.querySelectorAll('.nav button').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');

  // Sab pages hide karo
  document.querySelectorAll('.section-page').forEach(x => x.classList.remove('active'));

  // Target page show karo
  const targetPage = btn.dataset.page;
  const pageEl = document.getElementById('page-' + targetPage);
  if (pageEl) pageEl.classList.add('active');

  // Header title update karo
  const titles = {
    dashboard: 'Dashboard',
    inventory: 'Custom Inventory',
    pdf: 'PDF Import Center'
  };
  document.getElementById('headerTitle').textContent = titles[targetPage] || 'Dashboard';
});

// Function to switch page programmatically
window.showPage = function(pageName) {
  const btn = document.querySelector(`.nav button[data-page="${pageName}"]`);
  if (btn) btn.click();
};

// ====================
// 2. INITIALIZATION
// ====================
// Jab Firebase ready ho jaye (storage.js se event aata hai), tab data load karo
window.addEventListener('firebaseReady', async () => {
  console.log("🔥 Firebase ready signal received. Loading data...");
  
  // Thoda wait karein taake baaki files load ho jayein
  setTimeout(async () => {
    if (typeof window.refreshInventoryData === 'function') {
      await window.refreshInventoryData();
    } else {
      console.error("refreshInventoryData function not found!");
    }
  }, 500);
});

// ====================
// 3. FALLBACK (Agar firebaseReady event miss ho jaye)
// ====================
// 3 second baad check karein ke data load hua ya nahi. Agar nahi, toh force load karein.
setTimeout(() => {
  if (!window.isDataLoaded && typeof window.refreshInventoryData === 'function') {
    console.log("⏳ Fallback: Forcing data load...");
    window.refreshInventoryData();
  }
}, 3000);

// ====================
// 4. GLOBAL KEYBOARD SHORTCUTS
// ====================
document.addEventListener('keydown', (e) => {
  // ESC dabane par modal band ho jaye
  if (e.key === 'Escape') {
    const modal = document.getElementById('itemModal');
    if (modal && modal.classList.contains('open')) {
      window.closeItemModal();
    }
  }
});

// ====================
// 5. MODAL BACKDROP CLICK
// ====================
document.getElementById('itemModal').addEventListener('click', (e) => {
  // Agar modal ke bahar (backdrop par) click ho, toh band kar dein
  if (e.target.id === 'itemModal') {
    window.closeItemModal();
  }
});

console.log("✅ App.js loaded — StoreOS initialized");
