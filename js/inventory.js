// ==========================================
// INVENTORY.JS — Item management & Merging Logic
// ==========================================

window.inventoryData = [];
window.isDataLoaded = false;

// 1. MODAL
window.openItemModal = function() {
  document.getElementById('itemModal').classList.add('open');
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

// 2. SAVE ITEM
window.saveItem = async function() {
  const code = document.getElementById('fCode').value.trim().toUpperCase();
  const desc = document.getElementById('fDesc').value.trim();
  const uom = document.getElementById('fUom').value.trim().toUpperCase() || 'NOS';
  const qty = parseFloat(document.getElementById('fQty').value) || 0;
  const source = document.getElementById('fSource').value.trim() || 'Manual';

  if (!code) {
    showToast('Item Code likhna zaroori hai!', 'error');
    return;
  }

  const item = { code, desc, uom, qty, source };
  const saveBtn = document.querySelector('#itemModal .primary');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;

  try {
    const success = await window.saveItemToFirebase(item);
    if (success) {
      showToast('Item successfully saved!', 'success');
      closeItemModal();
      await refreshInventoryData();
    } else {
      showToast('Failed to save item.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
  }
};

// 3. DELETE SINGLE ITEM
window.deleteItem = async function(code) {
  if (!confirm(`Kya aap waqai "${code}" delete karna chahte hain?`)) return;

  try {
    // Note: Agar same code ki multiple entries hain Firebase mein, toh wo sab delete ho jayengi
    // kyunki hum code ko as ID use kar rahe hain.
    const success = await window.deleteItemFromFirebase(code);
    if (success) {
      showToast('Item deleted!', 'success');
      await refreshInventoryData();
    } else {
      showToast('Failed to delete item.', 'error');
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
};

// 4. CLEAR ALL DATA (Button click par)
window.clearSection = async function() {
  if (!confirm('Kya aap waqai SAARA data delete karna chahte hain? Ye wapas nahi aayega!')) return;
  
  try {
    // Firebase se sab load karein
    const allData = await window.loadInventoryFromFirebase();
    if(allData.length === 0) {
      showToast('Data pehle se khali hai.', 'default');
      return;
    }

    showToast('Deleting all data...', 'default');

    // Ek ek kar ke delete karein
    for (const item of allData) {
      await window.deleteItemFromFirebase(item.id || item.code);
    }
    
    showToast('Saara data clear ho gaya!', 'success');
    await refreshInventoryData();
  } catch (err) {
    console.error(err);
    showToast('Error: ' + err.message, 'error');
  }
};

// 5. REFRESH DATA
window.refreshInventoryData = async function() {
  if (!window.loadInventoryFromFirebase) return;
  
  const data = await window.loadInventoryFromFirebase();
  window.inventoryData = data;
  window.isDataLoaded = true;

  renderInventory();
  if (window.renderDashboardTable) renderDashboardTable();
  if (window.updateDashboardStats) updateDashboardStats();
};

// 6. RENDER TABLE (MERGING LOGIC YAHAN HAI)
window.renderInventory = function() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;

  const searchInput = document.getElementById('invSearch');
  const query = searchInput ? searchInput.value.toLowerCase() : '';

  // ===== MERGE LOGIC =====
  // Agar ek hi item code multiple baar hai, toh uski qty ko plus kar dein
  const mergedData = {};
  window.inventoryData.forEach(item => {
    if (mergedData[item.code]) {
      mergedData[item.code].qty += Number(item.qty) || 0;
    } else {
      mergedData[item.code] = { ...item, qty: Number(item.qty) || 0 };
    }
  });

  let finalData = Object.values(mergedData);

  // Search Filter
  finalData = finalData.filter(item => 
    !query || 
    item.code.toLowerCase().includes(query) || 
    (item.desc || '').toLowerCase().includes(query)
  );

  // Sort by code
  finalData.sort((a, b) => a.code.localeCompare(b.code));

  // Loading state
  if (!window.isDataLoaded) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading from Firebase...</td></tr>`;
    return;
  }

  // Empty state
  if (finalData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">No items found. Add one or import a PDF.</td></tr>`;
    return;
  }

  // Render Rows
  tbody.innerHTML = finalData.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td style="font-weight:bold; color:var(--blue);">${formatNumber(item.qty)}</td>
      <td><span class="badge ${item.source?.includes('PDF') ? 'yes' : 'no'}">${item.source || 'Manual'}</span></td>
      <td>
        <button class="danger" onclick="deleteItem('${item.code}')">Delete</button>
      </td>
    </tr>
  `).join('');
};
