// ==========================================
// INVENTORY.JS — Clear with Water Fill
// ==========================================

window.inventoryData = [];
window.isDataLoaded = false;

window.openItemModal = function() {
  document.getElementById('itemModal').classList.add('open');
  ['fCode','fSubInv','fUom','fDesc','fQty','fCost'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCode').focus();
};
window.closeItemModal = function() { document.getElementById('itemModal').classList.remove('open'); };

window.saveItem = async function() {
  const code = document.getElementById('fCode').value.trim().toUpperCase();
  if (!code) return showToast('Item Code likhna zaroori hai!', 'error');
  const item = {
    code: code,
    subInv: document.getElementById('fSubInv').value.trim() || 'N/A',
    desc: document.getElementById('fDesc').value.trim(),
    uom: document.getElementById('fUom').value.trim().toUpperCase() || 'NOS',
    qty: parseFloat(document.getElementById('fQty').value) || 0,
    cost: parseFloat(document.getElementById('fCost').value) || 0,
    source: 'Manual'
  };
  try {
    if (await window.saveItemToFirebase(item)) {
      showToast('Item saved!', 'success');
      closeItemModal();
      await refreshInventoryData();
    }
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.deleteItem = async function(code) {
  if (!confirm(`Delete "${code}"?`)) return;
  if (await window.deleteItemFromFirebase(code)) { showToast('Deleted!', 'success'); await refreshInventoryData(); }
};

// ==========================================
// CLEAR SECTION (Glass Water Fill Animation)
// ==========================================
window.clearSection = async function(type, btn) {
  if (!confirm(`Kya aap waqai ${type.toUpperCase()} ka data clear karna chahte hain?`)) return;
  
  const origText = btn ? btn.textContent : 'Clear';
  
  if (btn) {
    btn.disabled = true;
    btn.classList.add('clearing');
    btn.textContent = '0% Clearing...';
  }

  try {
    const allData = await window.loadInventoryFromFirebase();
    let itemsToDelete = [];
    
    for (const item of allData) {
      let shouldDelete = false;
      if (type === 'inventory') {
         if (!item.source || (!item.source.includes('bom') && !item.source.includes('assembly') && !item.source.includes('slow_moving'))) shouldDelete = true;
      } 
      else if (type === 'slow_moving') {
         if (item.source && item.source.includes('slow_moving')) shouldDelete = true;
      }
      else if (type === 'bom') {
         if (item.source && (item.source.includes('bom') || item.source.includes('assembly'))) shouldDelete = true;
      }
      else {
         if (item.source && item.source.includes(type)) shouldDelete = true;
      }
      
      if (shouldDelete) itemsToDelete.push(item);
    }

    const total = itemsToDelete.length;
    if (total === 0) {
      showToast('No data found to clear.', 'default');
      if (btn) { btn.textContent = origText; btn.disabled = false; btn.classList.remove('clearing'); }
      return;
    }

    let count = 0;
    for (const item of itemsToDelete) {
      await window.deleteItemFromFirebase(item.id || item.code);
      count++;
      
      const percent = Math.round((count / total) * 100);
      
      if (btn
