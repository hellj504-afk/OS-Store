// ==========================================
// INVENTORY.JS — Fixed Clear & Exact Filter
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
// FIXED: CLEAR SECTION
// ==========================================
window.clearSection = async function(type) {
  if (!confirm(`Kya aap waqai ${type.toUpperCase()} ka data clear karna chahte hain?`)) return;
  
  try {
    const allData = await window.loadInventoryFromFirebase();
    let count = 0;
    
    for (const item of allData) {
      let shouldDelete = false;
      
      // Strict check based on source
      if (type === 'inventory') {
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
         if (item.source && item.source.includes(type)) shouldDelete = true;
      }

      if (shouldDelete) {
        // Await zaroori hai taake delete complete hone ka wait kare
        await window.deleteItemFromFirebase(item.id || item.code); 
        count++;
      }
    }
    
    showToast(`${count} items cleared successfully!`, 'success');
    
    // UI ko update karein
    await refreshInventoryData();
    if (window.renderBOM) window.renderBOM();
    if (window.renderSlowMoving) window.renderSlowMoving();

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
  if (window.renderBOM) renderBOM();
};

window.renderInventory = function() {
  const tbody = document.getElementById('inventoryTable');
  if (!tbody) return;
  const query = document.getElementById('invSearch')?.value.toLowerCase() || '';
  
  // Normal Inventory Filter
  let data = window.inventoryData.filter(i => !i.source?.includes('slow_moving') && !i.source?.includes('bom') && !i.source?.includes('assembly'));
  
  const merged = {};
  data.forEach(i => { 
    const k = i.code + '_' + i.subInv; 
    if (merged[k]) merged[k].qty += (Number(i.qty)||0); 
    else merged[k] = { ...i, qty: Number(i.qty)||0 }; 
  });

  let final = Object.values(merged).filter(i => !query || i.code.toLowerCase().includes(query));
  final.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading...</td></tr>`;
  if (!final.length) return tbody.innerHTML = `<tr><td colspan="6" class="empty">No items found.</td></tr>`;

  tbody.innerHTML = final.map(i => `
    <tr><td class="code">${i.code}</td><td><span class="badge no">${i.subInv}</span></td><td>${i.desc}</td><td>${i.uom}</td>
    <td style="font-weight:bold; color:var(--blue);">${formatNumber(i.qty)}</td>
    <td><button class="danger" onclick="deleteItem('${i.code}')">Del</button></td></tr>
  `).join('');
};

// ==========================================
// FIXED: SLOW MOVING FILTER
// ==========================================
window.renderSlowMoving = function() {
  const tbody = document.getElementById('slowTable');
  if (!tbody) return;
  const query = document.getElementById('slowSearch')?.value.toLowerCase() || '';
  
  // Strict Filter: Sirf slow_moving data
  let data = window.inventoryData.filter(i => i.source && i.source.includes('slow_moving'));
  data = data.filter(i => !query || i.code.toLowerCase().includes(query));
  
  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading...</td></tr>`;
  if (!data.length) return tbody.innerHTML = `<tr><td colspan="6" class="empty">No slow moving items found.</td></tr>`;

  tbody.innerHTML = data.map(i => {
    const val = (Number(i.qty)||0) * (Number(i.cost)||0);
    return `<tr><td class="code">${i.code}</td><td>${i.desc}</td><td>${i.uom}</td>
    <td style="font-weight:bold;">${formatNumber(i.qty)}</td>
    <td>Rs. ${formatNumber(i.cost)}</td>
    <td style="font-weight:bold; color:#19835a;">Rs. ${formatNumber(val)}</td></tr>`;
  }).join('');
};

window.renderAlerts = function() {
  const tbody = document.getElementById('alertTable');
  if (!tbody) return;
  const merged = {};
  window.inventoryData.forEach(i => { if (merged[i.code]) merged[i.code].qty += (Number(i.qty)||0); else merged[i.code] = { ...i, qty: Number(i.qty)||0 }; });

  let alerts = [];
  Object.values(merged).forEach(i => {
    const q = Number(i.qty), u = (i.uom||'NOS').toUpperCase();
    let st = '', alert = false;
    if (q <= 0) { alert = true; st = 'OUT OF STOCK'; }
    else if (u === 'NOS' && q < 500) { alert = true; st = 'LOW (< 500)'; }
    else if ((u === 'KGS' || u === 'KG') && q < 100) { alert = true; st = 'LOW (< 100)'; }
    if (alert) alerts.push({ ...i, st });
  });

  alerts.sort((a, b) => a.qty - b.qty);
  if (!alerts.length) return tbody.innerHTML = `<tr><td colspan="5" class="empty">All stock healthy!</td></tr>`;

  tbody.innerHTML = alerts.map(i => `
    <tr style="${i.qty <= 0 ? 'background: rgba(201,58,77,0.15)' : ''}">
      <td class="code" style="color:#c93a4d;">${i.code}</td><td>${i.desc}</td><td>${i.uom}</td>
      <td style="font-weight:bold; color:#c93a4d;">${formatNumber(i.qty)}</td>
      <td><span class="badge danger" style="padding:5px 10px;">${i.st}</span></td>
    </tr>`).join('');
};
