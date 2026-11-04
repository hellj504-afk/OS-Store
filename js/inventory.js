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
      showToast('Item successfully saved!', 'success');
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
    // Agar same code aur same Sub Inv hai toh merge karein
    const key = item.code + '_' + (item.subInv || 'N/A'); 
    if (mergedData[key]) {
      mergedData[key].qty += Number(item.qty) || 0;
    } else {
      mergedData[key] = { ...item, qty: Number(item.qty) || 0 };
    }
  });

  let finalData = Object.values(mergedData);

  // Filter lagayen
  finalData = finalData.filter(item => {
    const matchesSearch = !query || item.code.toLowerCase().includes(query) || (item.desc || '').toLowerCase().includes(query);
    const matchesSubInv = subInvFilter === 'all' || item.subInv === subInvFilter;
    return matchesSearch && matchesSubInv;
  });

  finalData.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Loading from Firebase...</td></tr>`;
    return;
  }

  if (finalData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No items found.</td></tr>`;
    return;
  }

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
