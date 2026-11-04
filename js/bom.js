// ==========================================
// BOM.JS — BOM Management Logic
// ==========================================

window.renderBOM = async function() {
  const tbody = document.getElementById('bomTable');
  if (!tbody) return;
  
  tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading BOM Data...</td></tr>`;
  
  if (typeof window.loadInventoryFromFirebase !== 'function') return;

  try {
    const allData = await window.loadInventoryFromFirebase();
    
    // Sirf BOM wala data filter karein
    const bomData = allData.filter(item => item.source && item.source.includes('bom'));

    if (bomData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No BOM data found. Please upload a BOM PDF in PDF Import.</td></tr>`;
      return;
    }

    // Search filter
    const query = document.getElementById('bomSearch')?.value.toLowerCase() || '';
    const filtered = bomData.filter(item => 
      !query || 
      item.code.toLowerCase().includes(query) || 
      (item.desc || '').toLowerCase().includes(query) ||
      (item.parent || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No matching BOM items found.</td></tr>`;
      return;
    }

    // Table render karein
    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td class="code">${item.parent || 'N/A'}</td>
        <td class="code">${item.code}</td>
        <td>${item.desc || '-'}</td>
        <td>${item.uom || 'NOS'}</td>
        <td style="font-weight:bold; color:var(--blue);">${formatNumber(item.qty)}</td>
      </tr>
    `).join('');

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="empty" style="color:red">Error loading BOM: ${err.message}</td></tr>`;
  }
};

// Baaki pages (Abhi khali hain)
window.renderIssue = function() {
  const tbody = document.getElementById('issueTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Issue Voucher data will show here.</td></tr>`;
};

window.renderIR = function() {
  const tbody = document.getElementById('irTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="empty">IR / Move Order data will show here.</td></tr>`;
};

window.renderFailure = function() {
  const tbody = document.getElementById('failureTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Failure Data will show here.</td></tr>`;
};
