// ==========================================
// UTILS.JS — Helper functions
// ==========================================

// Toast Notification dikhane ke liye
window.showToast = function(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = 'toast show ' + type; // type: 'success', 'error', ya 'default'
  
  // 3 second baad hide kar dein
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
};

// Date format karne ke liye (e.g., 27-Oct-2026 10:54 AM)
window.formatDate = function(date = new Date()) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 ko 12 banao
  
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
};

// Numbers ko comma ke sath format karna (e.g., 1,234.50)
window.formatNumber = function(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

// Topbar mein aaj ki date update karna
document.addEventListener('DOMContentLoaded', () => {
  const datePill = document.getElementById('todayDate');
  if (datePill) {
    // Sirf date dikhani hai topbar mein
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    datePill.textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
});

console.log("✅ Utils.js loaded");
