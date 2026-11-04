// ==========================================
// INVENTORY.JS — With Exact Section Clear
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
// CLEAR SECTION (Exact Deletion)
// ==========================================
window.clearSection = async function(type) {
  if (!confirm(`Kya aap waqai ${type.replace('_', ' ').toUpperCase()} ka data clear karna chahte hain?`)) return;
  
  try {
    const allData = await window.loadInventoryFromFirebase();
    let deletedCount = 0;

    for (const item of allData) {
      let shouldDelete = false;
      
      // Condition logic for deleting specific data
      if (type === 'inventory') {
         // Normal inventory (No bom, no assembly, no slow_moving)
         if (!item.source || (!item.source.includes('bom') && !item.source.includes('assembly') && !item.source.includes('slow_moving'))) {
            shouldDelete = true;
         }
      } 
      else if (type === 'slow_moving') {
         if (item.source && item.source.includes('slow_moving')) shouldDelete = true;
      }
      else if (type === 'bom') {
         if (item.source && (item.source.includes('bom') || item.source.includes('assembly'))) shouldDelete = true;
      }
      else {
         // For Issue, IR, Failure
         if (item.source && item.source.includes(type)) shouldDelete = true;
      }

      if (shouldDelete) {
        await window.deleteItemFromFirebase(item.id || item.code);
        deletedCount++;
      }
    }
    
    showToast(`${deletedCount} items cleared from ${type}!`, 'success');
    await refreshInventoryData(); 
    if (window.renderBOM) window.renderBOM();
    if (window.renderSlowMoving) window.renderSlowMoving();
    if (window.renderAlerts) window.renderAlerts();

  } catch (err) {
    showToast('Clear failed: ' + err.message, 'error');
  }
};

window.refreshInventoryData = async function() {
  if (!window.loadInventoryFromFirebase) return;
  window.inventoryData = await window.loadInventoryFromFirebase();
  window.isDataLoaded = true;
  if (window.renderInventory) renderInventory(); 
  if (window.renderSlowMoving) renderSlowMoving(); 
  if (window.renderAlerts) renderAlerts();
  if (window.renderDashboardTable) renderDashboardTable();
  if (window.updateDashboardStats) updateDashboardStats();
};

window.renderInventory = function() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;

  const query = document.getElementById('invSearch')?.value.toLowerCase() || '';
  let data = window.inventoryData.filter(item => !item.source?.includes('slow_moving') && !item.source?.includes('bom') && !item.source?.includes('assembly'));

  const merged = {};
  data.forEach(item => {
    const key = item.code + '_' + item.subInv;
    if (merged[key]) merged[key].qty += (Number(item.qty) || 0);
    else merged[key] = { ...item, qty: Number(item.qty) || 0 };
  });

  let finalData = Object.values(merged).filter(item => !query || item.code.toLowerCase().includes(query) || (item.desc||'').toLowerCase().includes(query));
  finalData.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading...</td></tr>`;
  if (!finalData.length) return tbody.innerHTML = `<tr><td colspan="6" class="empty">No items found.</td></tr>`;

  tbody.innerHTML = finalData.map(i => `
    <tr>
      <td class="code">${i.code}</td><td><span class="badge no">${i.subInv}</span></td>
      <td>${i.desc}</td><td>${i.uom}</td><td style="font-weight:bold; color:var(--blue);">${formatNumber(i.qty)}</td>
      <td><button class="danger" onclick="deleteItem('${i.code}')">Del</button></td>
    </tr>
  `).join('');
};

window.renderSlowMoving = function() {
  const tbody = document.getElementById('slowTable');
  if (!tbody) return;
  const query = document.getElementById('slowSearch')?.value.toLowerCase() || '';
  let data = window.inventoryData.filter(item => item.source?.includes('slow_moving'));
  data = data.filter(item => !query || item.code.toLowerCase().includes(query) || (item.desc||'').toLowerCase().includes(query));
  
  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading...</td></tr>`;
  if (!data.length) return tbody.innerHTML = `<tr><td colspan="6" class="empty">No slow moving items yet.</td></tr>`;

  tbody.innerHTML = data.map(i => {
    const value = (Number(i.qty)||0) * (Number(i.cost)||0);
    return `
      <tr>
        <td class="code">${i.code}</td><td>${i.desc}</td><td>${i.uom}</td>
        <td style="font-weight:bold;">${formatNumber(i.qty)}</td>
        <td>Rs. ${formatNumber(i.cost)}</td>
        <td style="font-weight:bold; color:#19835a;">Rs. ${formatNumber(value)}</td>
      </tr>
    `;
  }).join('');
};

window.renderAlerts = function() {
  const tbody = document.getElementById('alertTable');
  if (!tbody) return;

  const merged = {};
  window.inventoryData.forEach(item => {
    const code = item.code;
    if (merged[code]) merged[code].qty += (Number(item.qty) || 0);
    else merged[code] = { ...item, qty: Number(item.qty) || 0 };
  });

  let alerts = [];
  Object.values(merged).forEach(item => {
    const qty = Number(item.qty);
    const uom = (item.uom || 'NOS').toUpperCase();
    let statusText = '';
    let isAlert = false;

    if (qty <= 0) { isAlert = true; statusText = 'OUT OF STOCK'; }
    else if (uom === 'NOS' && qty < 500) { isAlert = true; statusText = 'LOW (< 500)'; }
    else if ((uom === 'KGS' || uom === 'KG') && qty < 100) { isAlert = true; statusText = 'LOW (< 100)'; }

    if (isAlert) alerts.push({ ...item, statusText });
  });

  alerts.sort((a, b) => a.qty - b.qty);
  if (alerts.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="empty">All stock is healthy!</td></tr>`;

  tbody.innerHTML = alerts.map(item => `
    <tr style="${item.qty <= 0 ? 'background: rgba(201,58,77,0.15)' : ''}">
      <td class="code" style="color:#c93a4d;">${item.code}</td>
      <td>${item.desc}</td>
      <td>${item.uom}</td>
      <td style="font-weight:bold; color:#c93a4d;">${formatNumber(item.qty)}</td>
      <td><span class="badge danger" style="padding:5px 10px;">${item.statusText}</span></td>
    </tr>
  `).join('');
};
