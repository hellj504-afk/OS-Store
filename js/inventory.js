// ==========================================
// INVENTORY.JS
// ==========================================

window.inventoryData = [];
window.isDataLoaded = false;

window.openItemModal = function() {
  document.getElementById('itemModal').classList.add('open');
  document.getElementById('fCode').value = '';
  document.getElementById('fSubInv').value = '';
  document.getElementById('fUom').value = '';
  document.getElementById('fDesc').value = '';
  document.getElementById('fQty').value = '';
  document.getElementById('fSource').value = 'Manual';
  document.getElementById('fCode').focus();
};

window.closeItemModal = function() {
  document.getElementById('itemModal').classList.remove('open');
};

window.saveItem = async function() {
  const code = document.getElementById('fCode').value.trim().toUpperCase();
  const subInv = document.getElementById('fSubInv').value.trim();
  const desc = document.getElementById('fDesc').value.trim();
  const uom = document.getElementById('fUom').value.trim().toUpperCase() || 'NOS';
  const qty = parseFloat(document.getElementById('fQty').value) || 0;
  const source = document.getElementById('fSource').value.trim() || 'Manual';

  if (!code) return showToast('Item Code likhna zaroori hai!', 'error');

  const item = { code, subInv, desc, uom, qty, source };
  const saveBtn = document.querySelector('#itemModal .primary');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    if (await window.saveItemToFirebase(item)) {
      showToast('Item saved!', 'success');
      closeItemModal();
      await refreshInventoryData();
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
};

window.deleteItem = async function(code) {
  if (!confirm(`Kya aap waqai "${code}" delete karna chahte hain?`)) return;
  try {
    if (await window.deleteItemFromFirebase(code)) {
      showToast('Item deleted!', 'success');
      await refreshInventoryData();
    }
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.clearSection = async function() {
  if (!confirm('Kya aap waqai SAARA data delete karna chahte hain?')) return;
  try {
    const allData = await window.loadInventoryFromFirebase();
    for (const item of allData) await window.deleteItemFromFirebase(item.id || item.code);
    showToast('Saara data clear ho gaya!', 'success');
    await refreshInventoryData();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.refreshInventoryData = async function() {
  if (!window.loadInventoryFromFirebase) return;
  const data = await window.loadInventoryFromFirebase();
  window.inventoryData = data;
  window.isDataLoaded = true;
  
  renderInventory();
  if (window.renderDashboardTable) renderDashboardTable();
  if (window.updateDashboardStats) updateDashboardStats();
  if (window.renderAlerts) renderAlerts(); // Refresh alerts if on that page
};

window.renderInventory = function() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;

  const searchInput = document.getElementById('invSearch');
  const filterSubInv = document.getElementById('invFilterSubInv');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  const subInvFilter = filterSubInv ? filterSubInv.value : 'all';

  // MERGE LOGIC
  const mergedData = {};
  window.inventoryData.forEach(item => {
    const key = item.code + '_' + (item.subInv || 'N/A'); 
    if (mergedData[key]) {
      mergedData[key].qty += Number(item.qty) || 0;
    } else {
      mergedData[key] = { ...item, qty: Number(item.qty) || 0 };
    }
  });

  let finalData = Object.values(mergedData);

  finalData = finalData.filter(item => {
    const matchesSearch = !query || item.code.toLowerCase().includes(query) || (item.desc || '').toLowerCase().includes(query);
    const matchesSubInv = subInvFilter === 'all' || item.subInv === subInvFilter;
    return matchesSearch && matchesSubInv;
  });

  finalData.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="7" class="empty">Loading...</td></tr>`;
  if (finalData.length === 0) return tbody.innerHTML = `<tr><td colspan="7" class="empty">No items found.</td></tr>`;

  tbody.innerHTML = finalData.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td><span class="badge no">${item.subInv || 'N/A'}</span></td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td style="font-weight:bold; color:var(--blue);">${formatNumber(item.qty)}</td>
      <td><span class="badge ${item.source?.includes('PDF') ? 'yes' : 'no'}">${item.source || 'Manual'}</span></td>
      <td><button class="danger" onclick="deleteItem('${item.code}')">Delete</button></td>
    </tr>
  `).join('');
};

// ==========================================
// NAYA: LOW STOCK ALERTS LOGIC (RED TAGS)
// ==========================================
window.renderAlerts = function() {
  const tbody = document.getElementById('alertTable');
  if (!tbody) return;

  // Pehle data merge karein (sare subinvs mila kar)
  const mergedData = {};
  window.inventoryData.forEach(item => {
    if (mergedData[item.code]) {
      mergedData[item.code].qty += Number(item.qty) || 0;
    } else {
      mergedData[item.code] = { ...item, qty: Number(item.qty) || 0 };
    }
  });

  let alerts = [];
  
  Object.values(mergedData).forEach(item => {
    const qty = Number(item.qty);
    const uom = (item.uom || '').toUpperCase();
    let isAlert = false;
    let statusText = '';

    // Rules Check
    if (qty <= 0) {
      isAlert = true;
      statusText = 'OUT OF STOCK';
    } else if (uom === 'NOS' && qty < 500) {
      isAlert = true;
      statusText = 'LOW (NOS < 500)';
    } else if (uom === 'KGS' && qty < 100) {
      isAlert = true;
      statusText = 'LOW (KGS < 100)';
    }

    if (isAlert) {
      alerts.push({ ...item, statusText });
    }
  });

  // Sort by lowest qty first
  alerts.sort((a, b) => a.qty - b.qty);

  if (alerts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty" style="color:#19835a;">All stock levels are healthy! No alerts.</td></tr>`;
    return;
  }

  tbody.innerHTML = alerts.map(item => {
    // Agar zero hai to dark red, warna light red
    const isZero = item.qty <= 0;
    const rowStyle = isZero ? 'background: rgba(201, 58, 77, 0.15);' : 'background: rgba(255, 100, 100, 0.08);';
    const badgeClass = isZero ? 'danger' : 'low';

    return `
      <tr style="${rowStyle}">
        <td class="code" style="color:#c93a4d; font-weight:bold;">${item.code}</td>
        <td>${item.desc || '-'}</td>
        <td>${item.uom || 'NOS'}</td>
        <td style="font-weight:bold; font-size:14px; color:#c93a4d;">${formatNumber(item.qty)}</td>
        <td><span class="badge ${badgeClass}" style="background:#c93a4d; color:white; padding:5px 10px;">${item.statusText}</span></td>
      </tr>
    `;
  }).join('');
};
