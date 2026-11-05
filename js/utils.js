// ==========================================
// UTILS.JS — Helpers, Toast & Daily Quotes
// ==========================================

// 1. Toast Notification
window.showToast = function(message, type = 'default') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = 'toast show ' + type; 
  
  clearTimeout(window.toastTimeout);
  window.toastTimeout = setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
};

// 2. Date Formatter
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
  hours = hours ? hours : 12;
  
  return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
};

// 3. Number Formatter (with Commas)
window.formatNumber = function(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

// 4. Daily Motivation Quotes
const dailyQuotes = [
  "The secret of getting ahead is getting started. – Mark Twain",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
  "Don't watch the clock; do what it does. Keep going. – Sam Levenson",
  "The only way to do great work is to love what you do. – Steve Jobs",
  "Believe you can and you're halfway there. – Theodore Roosevelt",
  "It always seems impossible until it's done. – Nelson Mandela",
  "Quality is not an act, it is a habit. – Aristotle",
  "Action is the foundational key to all success. – Pablo Picasso",
  "The best way to predict the future is to create it. – Peter Drucker",
  "Your limitation—it's only your imagination."
];

// 5. Initialize on Page Load
document.addEventListener('DOMContentLoaded', () => {
  // Topbar Date
  const datePill = document.getElementById('todayDate');
  if (datePill) {
    const d = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    datePill.textContent = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // Daily Quote Bar
  const quoteBar = document.getElementById('quoteBar');
  if (quoteBar) {
    // Din ke hisaab se quote change hoga (taake roz naya ho)
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = dayOfYear % dailyQuotes.length;
    quoteBar.innerHTML = `💡 <strong>Daily Motivation:</strong> ${dailyQuotes[quoteIndex]}`;
  }
});

console.log("✅ Utils.js loaded (Quotes + Helpers)");
