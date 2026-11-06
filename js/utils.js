// ==========================================
// UTILS.JS — Helpers, Toast & PDF Download
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

// 4. NEW: Cost Formatter (K, M, B) for Dashboard
window.formatCost = function(num) {
  if (!num || isNaN(num)) return 'Rs. 0';
  const n = Number(num);
  if (n >= 1e9) return 'Rs. ' + (n / 1e9).toFixed(2) + ' B';  // Billion
  if (n >= 1e6) return 'Rs. ' + (n / 1e6).toFixed(2) + ' M';  // Million
  if (n >= 1e3) return 'Rs. ' + (n / 1e3).toFixed(1) + ' K';  // Thousand
  return 'Rs. ' + n.toFixed(0);
};

// 5. NEW: Download Low Stock as PDF
window.downloadLowStockPDF = function() {
  if (!window.inventoryData || window.inventoryData.length === 0) {
    return showToast('No data to download', 'error');
  }

  let merged = {};
  window.inventoryData.forEach(i => {
    if (merged[i.code]) merged[i.code].qty += (Number(i.qty)||0); 
    else merged[i.code] = { ...i, qty: Number(i.qty)||0 };
  });

  let alerts = [];
  Object.values(merged).forEach(i => {
    const q = Number(i.qty), u = (i.uom||'NOS').toUpperCase();
    if (q <= 0 || (u === 'NOS' && q < 500) || (u === 'KGS' && q < 100)) {
      alerts.push(i);
    }
  });

  if (alerts.length === 0) return showToast('No low stock items found', 'default');

  // Create PDF via Print Window
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write('<html><head><title>Low Stock Report</title>');
  printWindow.document.write('<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px;} th{background:#f4f4f4;}</style>');
  printWindow.document.write('</head><body>');
  printWindow.document.write('<h2>Low Stock Items Report</h2>');
  printWindow.document.write('<p>Date: ' + new Date().toLocaleDateString() + '</p>');
  printWindow.document.write('<table><thead><tr><th>Item Code</th><th>Description</th><th>UOM</th><th>Qty</th></tr></thead><tbody>');
  
  alerts.forEach(i => {
    printWindow.document.write(`<tr><td>${i.code}</td><td>${i.desc || '-'}</td><td>${i.uom || 'NOS'}</td><td style="color:red;font-weight:bold;">${i.qty}</td></tr>`);
  });
  
  printWindow.document.write('</tbody></table></body></html>');
  printWindow.document.close();
  printWindow.print();
};

// 6. Daily Motivation Quotes & Initialization
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

console.log("✅ Utils.js loaded (Cost Format + PDF Download)");
