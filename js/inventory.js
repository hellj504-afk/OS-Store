// ==========================================
// INVENTORY.JS — Item management (Add/Edit/Delete)
// ==========================================

// Global state taake saara data yahan rahe
window.inventoryData = [];
window.isDataLoaded = false;

// ====================
// 1. MODAL OPEN / CLOSE
// ====================
window.openItemModal = function() {
  document.getElementById('itemModal').classList.add('open');
  // Form clear kar dein (agar naya item add kar rahe hain)
  document.getElementById('fCode').value = '';
  document.getElementById('fUom').value = '';
  document.getElementById('fDesc').value = '';
  document.getElementById('fQty').value = '';
  document.getElementById('fSource').value = 'Manual';
  document.getElementById('fCode').focus();
};

window.closeItemModal = function() {
  document.getElementById('itemModal').classList.remove('open');
};

// ====================
// 2. SAVE ITEM (Add/Update)
// ====================
window.saveItem = async function() {
  const code = document.getElementById('fCode').value.trim().toUpperCase();
  const desc = document.getElementById('fDesc').value.trim();
  const uom = document.getElementById('fUom').value.trim().toUpperCase() || 'NOS';
  const qty = parseFloat(document.getElementById('fQty').value) || 0;
  const source = document.getElementById('fSource').value.trim() || 'Manual';

  // Validation
  if (!code) {
    showToast('Item Code likhna zaroori hai!', 'error');
    document.getElementById('fCode').focus();
    return;
  }

  const item = { code, desc, uom, qty, source };

  // Button ko disable karein taake double click na ho
  const saveBtn = document.querySelector('#itemModal .primary');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const success = await window.saveItemToFirebase(item);
    
    if (success) {
      showToast('Item successfully saved!', 'success');
      closeItemModal();
      
      // Data ko dobara load karein taake UI update ho jaye
      await refreshInventoryData();
    } else {
      showToast('Failed to save item. Check console.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
};

// ====================
// 3. DELETE ITEM
// ====================
window.deleteItem = async function(code) {
  if (!confirm(`Kya aap waqai "${code}" delete karna chahte hain?`)) return;

  try {
    const success = await window.deleteItemFromFirebase(code);
    if (success) {
      showToast('Item deleted!', 'success');
      await refreshInventoryData();
    } else {
      showToast('Failed to delete item.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Error: ' + err.message, 'error');
  }
};

// ====================
// 4. REFRESH DATA (Firebase se)
// ====================
window.refreshInventoryData = async function() {
  if (!window.loadInventoryFromFirebase) return;
  
  const data = await window.loadInventoryFromFirebase();
  
  // Sort by code
  data.sort((a, b) => a.code.localeCompare(b.code));
  
  window.inventoryData = data;
  window.isDataLoaded = true;

  // UI update karein
  renderInventory();
  if (window.renderDashboardTable) renderDashboardTable();
  if (window.updateDashboardStats) updateDashboardStats();
};

// ====================
// 5. RENDER TABLE (Inventory Page)
// ====================
window.renderInventory = function() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;

  // Search filter lagayen
  const searchInput = document.getElementById('invSearch');
  const query = searchInput ? searchInput.value.toLowerCase() : '';

  const filtered = window.inventoryData.filter(item => 
    !query || 
    item.code.toLowerCase().includes(query) || 
    (item.desc || '').toLowerCase().includes(query)
  );

  // Agar data load ho raha hai
  if (!window.isDataLoaded) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading from Firebase...</td></tr>`;
    return;
  }

  // Agar data khali hai
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No items found. Add one or import a PDF.</td></tr>`;
    return;
  }

  // Rows generate karein
  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td>${formatNumber(item.qty)}</td>
      <td><span class="badge ${item.source?.includes('PDF') ? 'yes' : 'no'}">${item.source || 'Manual'}</span></td>
      <td>
        <button class="danger" onclick="deleteItem('${item.code}')">Delete</button>
      </td>
    </tr>
  `).join('');
};

console.log("✅ Inventory.js loaded");
