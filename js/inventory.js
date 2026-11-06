// ==========================================
// INVENTORY.JS — With Store Logic
// ==========================================

window.inventoryData = [];
window.isDataLoaded = false;

window.openManualAdd = function(type) {
  document.getElementById('itemModal').classList.add('open');
  document.getElementById('mType').value = type;
  ['fCode','fSubInv','fUom','fDesc','fQty','fCost','fParent'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('fCode').focus();
};
window.closeItemModal = function() { document.getElementById('itemModal').classList.remove('open'); };

window.saveItemManual = async function() {
  const type = document.getElementById('mType').value;
  const code = document.getElementById('fCode').value.trim().toUpperCase();
  if (!code) return showToast('Item Code likhna zaroori hai!', 'error');

  const item = {
    code: code,
    subInv: document.getElementById('fSubInv').value.trim() || 'N/A',
    desc: document.getElementById('fDesc').value.trim(),
    uom: document.getElementById('fUom').value.trim().toUpperCase() || 'NOS',
    qty: parseFloat(document.getElementById('fQty').value) || 0,
    cost: parseFloat(document.getElementById('fCost').value) || 0,
    parent: document.getElementById('fParent').value.trim() || 'N/A',
    source: `Manual (${type})`
  };

  try {
    if (await window.saveItemToFirebase(item)) {
      showToast('Item saved manually!', 'success');
      closeItemModal();
      await refreshInventoryData();
    }
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
};

window.deleteItem = async function(code) {
  if (!confirm(`Delete "${code}"?`)) return;
  if (await window.deleteItemFromFirebase(code)) { showToast('Deleted!', 'success'); await refreshInventoryData(); }
};

window.clearSection = async function(type, btn) {
  if (!confirm(`Kya aap waqai ${type.toUpperCase()} ka data clear karna chahte hain?`)) return;
  const origText = btn ? btn.textContent : 'Clear';
  if (btn) { btn.disabled = true; btn.textContent = '0%...'; }
  try {
    const allData = await window.loadInventoryFromFirebase();
    let itemsToDelete = allData.filter(item => {
      if (type === 'inventory') return !item.source || (!item.source.includes('bom') && !item.source.includes('assembly') && !item.source.includes('slow_moving') && !item.source.includes('issue') && !item.source.includes('ir') && !item.source.includes('failure') && !item.source.includes('store'));
      if (type === 'store') return item.source && item.source.includes('store');
      if (type === 'slow_moving') return item.source && item.source.includes('slow_moving');
      if (type === 'bom') return item.source && (item.source.includes('bom') || item.source.includes('assembly'));
      return item.source && item.source.includes(type);
    });
    const total = itemsToDelete.length;
    if (total === 0) { showToast('No data found.', 'default'); if (btn) { btn.textContent = origText; btn.disabled = false; } return; }
    let count = 0;
    for (const item of itemsToDelete) {
      await window.deleteItemFromFirebase(item.id || item.code);
      count++;
      if (btn) btn.textContent = `${Math.round((count/total)*100)}%...`;
    }
    showToast(`${total} items cleared!`, 'success');
    await refreshInventoryData();
  } catch (err) { showToast('Clear failed: ' + err.message, 'error'); }
  finally { if (btn) { btn.textContent = origText; btn.disabled = false; } }
};

window.refreshInventoryData = async function() {
  if (!window.loadInventoryFromFirebase) return;
  window.inventoryData = await window.loadInventoryFromFirebase();
  window.isDataLoaded = true;
  if (window.renderInventory) renderInventory();
  if (window.renderStore) renderStore();
  if (window.renderSlowMoving) renderSlowMoving();
  if (window.renderAlerts) renderAlerts();
  if (window.renderDashboardTable) renderDashboardTable();
  if (window.updateDashboardStats) updateDashboardStats();
  if (window.renderBOM) renderBOM();
};

window.renderInventory = function() {
  const tbody = document.getElementById('inventoryTable'); if (!tbody) return;
  const query = document.getElementById('invSearch')?.value.toLowerCase() || '';
  
  // Filter normal inventory (exclude store, bom, slow)
  let data = window.inventoryData.filter(i => !i.source?.includes('slow_moving') && !i.source?.includes('bom') && !i.source?.includes('assembly') && !i.source?.includes('store'));
  const merged = {};
  data.forEach(i => { const k = i.code + '_' + i.subInv; if (merged[k]) merged[k].qty += (Number(i.qty)||0); else merged[k] = { ...i, qty: Number(i.qty)||0 }; });

  let final = Object.values(merged).filter(i => !query || i.code.toLowerCase().includes(query));
  final.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="7" class="empty">Loading...</td></tr>`;
  if (!final.length) return tbody.innerHTML = `<tr><td colspan="7" class="empty">No items found.</td></tr>`;

  tbody.innerHTML = final.map(i => `
    <tr>
      <td class="code">${i.code}</td><td><span class="badge no">${i.subInv}</span></td><td>${i.desc}</td><td>${i.uom}</td>
      <td style="font-weight:bold; color:var(--blue);">${formatNumber(i.qty)}</td>
      <td>Rs. ${formatNumber(i.cost)}</td>
      <td><button class="glass-clear-btn" style="padding:5px 10px; font-size:10px;" onclick="deleteItem('${i.code}')">Del</button></td>
    </tr>
  `).join('');
};

// NEW STORE RENDER FUNCTION
window.renderStore = function() {
  const tbody = document.getElementById('storeTable'); if (!tbody) return;
  const query = document.getElementById('storeSearch')?.value.toLowerCase() || '';
  
  // Filter Store data only
  let data = window.inventoryData.filter(i => i.source && i.source.includes('store'));
  const merged = {};
  data.forEach(i => { if (merged[i.code]) merged[i.code].qty += (Number(i.qty)||0); else merged[i.code] = { ...i, qty: Number(i.qty)||0 }; });

  let final = Object.values(merged).filter(i => !query || i.code.toLowerCase().includes(query));
  final.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading...</td></tr>`;
  if (!final.length) return tbody.innerHTML = `<tr><td colspan="6" class="empty">No store items found.</td></tr>`;

  tbody.innerHTML = final.map(i => `
    <tr>
      <td class="code">${i.code}</td><td>${i.desc}</td><td>${i.uom}</td>
      <td style="font-weight:bold; color:var(--blue);">${formatNumber(i.qty)}</td>
      <td>Rs. ${formatNumber(i.cost)}</td>
      <td><button class="glass-clear-btn" style="padding:5px 10px; font-size:10px;" onclick="deleteItem('${i.code}')">Del</button></td>
    </tr>
  `).join('');
};

window.renderSlowMoving = function() {
  const tbody = document.getElementById('slowTable'); if (!tbody) return;
  const query = document.getElementById('slowSearch')?.value.toLowerCase() || '';
  let data = window.inventoryData.filter(i => i.source && i.source.includes('slow_moving'));
  data = data.filter(i => !query || i.code.toLowerCase().includes(query));
  
  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="7" class="empty">Loading...</td></tr>`;
  if (!data.length) return tbody.innerHTML = `<tr><td colspan="7" class="empty">No slow moving items found.</td></tr>`;

  tbody.innerHTML = data.map(i => {
    const val = (Number(i.qty)||0) * (Number(i.cost)||0);
    return `<tr><td class="code">${i.code}</td><td>${i.desc}</td><td>${i.uom}</td>
    <td style="font-weight:bold;">${formatNumber(i.qty)}</td>
    <td>Rs. ${formatNumber(i.cost)}</td>
    <td style="font-weight:bold; color:#19835a;">Rs. ${formatNumber(val)}</td>
    <td><button class="glass-clear-btn" style="padding:5px 10px; font-size:10px;" onclick="deleteItem('${i.code}')">Del</button></td></tr>`;
  }).join('');
};

window.renderAlerts = function() { /* Same as before */ };
