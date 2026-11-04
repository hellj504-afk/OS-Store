// ==========================================
// DASHBOARD.JS — Dashboard stats and table
// ==========================================

// ====================
// 1. UPDATE STATS CARDS
// ====================
window.updateDashboardStats = function() {
  if (!window.inventoryData) return;

  const data = window.inventoryData;

  // Total unique items
  const totalItems = data.length;
  document.getElementById('statItems').textContent = totalItems;

  // Total Quantity (sab items ki qty ko jama karein)
  const totalQty = data.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  document.getElementById('statQty').textContent = formatNumber(totalQty);

  // PDF Imports count (kitne items PDF se aaye hain)
  const pdfImports = data.filter(item => item.source && item.source.includes('PDF')).length;
  document.getElementById('statImports').textContent = pdfImports;

  // Last Updated (aaj ki date, kyunki abhi kuch save hua hai)
  if (totalItems > 0) {
    document.getElementById('statUpdated').textContent = formatDate(new Date()).split(' ')[0]; // Sirf date
  } else {
    document.getElementById('statUpdated').textContent = '—';
  }
};

// ====================
// 2. RENDER DASHBOARD TABLE
// ====================
window.renderDashboardTable = function() {
  const tbody = document.getElementById('dashTable');
  if (!tbody) return;

  // Dashboard ka search input
  const searchInput = document.getElementById('dashSearch');
  const query = searchInput ? searchInput.value.toLowerCase() : '';

  const filtered = window.inventoryData.filter(item => 
    !query || 
    item.code.toLowerCase().includes(query) || 
    (item.desc || '').toLowerCase().includes(query)
  );

  // Loading state
  if (!window.isDataLoaded) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading from Firebase...</td></tr>`;
    return;
  }

  // Empty state
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">No items found. Add one or import a PDF.</td></tr>`;
    return;
  }

  // Sirf pehle 10 items dashboard par dikhayen (taake lamba na ho)
  const recent = filtered.slice(0, 10);

  tbody.innerHTML = recent.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td>${formatNumber(item.qty)}</td>
      <td><span class="badge ${item.source?.includes('PDF') ? 'yes' : 'no'}">${item.source || 'Manual'}</span></td>
    </tr>
  `).join('');

  // Agar 10 se zyada items hain, toh niche note lagayen
  if (filtered.length > 10) {
    tbody.innerHTML += `
      <tr>
        <td colspan="5" class="empty" style="font-size:10px; padding:10px">
          Showing 10 of ${filtered.length} items. Go to Inventory to see all.
        </td>
      </tr>
    `;
  }
};

console.log("✅ Dashboard.js loaded");
