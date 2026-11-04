// ==========================================
// BOM.JS — BOM View, Failure Calc & Reuse
// ==========================================

window.bomDataCache = [];

// 1. BOM PAGE LOAD
window.renderBOM = async function() {
  const tbody = document.getElementById('bomTable');
  if (!tbody) return;
  
  tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading BOM Data...</td></tr>`;
  
  if (typeof window.loadInventoryFromFirebase !== 'function') return;

  try {
    const allData = await window.loadInventoryFromFirebase();
    // Sirf BOM wala data
    window.bomDataCache = allData.filter(item => item.source && item.source.includes('bom'));

    if (window.bomDataCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No BOM data found. Please upload BOM PDF in PDF Import.</td></tr>`;
      return;
    }

    const query = document.getElementById('bomSearch')?.value.toLowerCase() || '';
    const filtered = window.bomDataCache.filter(item => 
      !query || item.code.toLowerCase().includes(query) || (item.desc || '').toLowerCase().includes(query) || (item.parent || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty">No matching BOM items found.</td></tr>`;
      return;
    }

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
    tbody.innerHTML = `<tr><td colspan="5" class="empty" style="color:red">Error: ${err.message}</td></tr>`;
  }
};

// 2. FAILURE / SCRAP CALCULATION
window.calculateFailure = async function() {
  const fgCode = document.getElementById('failCode').value.trim().toUpperCase();
  const failQty = parseFloat(document.getElementById('failQty').value) || 0;
  
  if (!fgCode || failQty <= 0) return showToast('FG Code aur Qty likhein!', 'error');

  const resultArea = document.getElementById('failureResultArea');
  const resultBody = document.getElementById('failureResultTable');
  resultArea.style.display = 'block';
  resultBody.innerHTML = `<tr><td colspan="7" class="empty">Searching BOM & Inventory...</td></tr>`;

  const allData = await window.loadInventoryFromFirebase();
  
  // 1. FG Code ke children dhoondein BOM mein
  const bomItems = allData.filter(i => i.source?.includes('bom') && i.parent === fgCode);
  
  if (bomItems.length === 0) {
    resultBody.innerHTML = `<tr><td colspan="7" class="empty" style="color:#c93a4d">No BOM found for Parent: ${fgCode}</td></tr>`;
    document.getElementById('failTotalCost').textContent = 'Rs. 0';
    return;
  }

  // 2. Inventory se un children ka Cost nikaalein
  let totalCost = 0;
  const finalRows = bomItems.map(bomItem => {
     const invItem = allData.find(i => i.code === bomItem.code && !i.source?.includes('bom'));
     const unitCost = invItem ? (Number(invItem.cost) || 0) : 0;
     const reqQty = (Number(bomItem.qty) || 0) * failQty;
     const rowCost = reqQty * unitCost;
     totalCost += rowCost;
     
     return { ...bomItem, reqQty, unitCost, rowCost };
  });

  document.getElementById('failTotalCost').textContent = 'Rs. ' + formatNumber(totalCost);

  // 3. Table render karein Reuse button ke sath
  resultBody.innerHTML = finalRows.map((r, index) => `
    <tr>
      <td class="code">${r.code}</td>
      <td>${r.desc}</td>
      <td style="font-weight:bold; color:var(--blue);">${formatNumber(r.reqQty)}</td>
      <td>${r.uom}</td>
      <td>Rs. ${formatNumber(r.unitCost)}</td>
      <td style="font-weight:bold; color:#c93a4d;">Rs. ${formatNumber(r.rowCost)}</td>
      <td><button class="primary" style="padding:5px 10px; font-size:10px;" onclick="reuseMaterial('${r.code}', ${r.reqQty})">♻ Reuse</button></td>
    </tr>
  `).join('');
};

// 3. REUSE LOGIC
window.reuseMaterial = async function(code, qty) {
  if (!confirm(`Kya aap ${qty} qty wapas inventory mein add karna chahte hain?`)) return;
  
  try {
    const allData = await window.loadInventoryFromFirebase();
    const invItem = allData.find(i => i.code === code && !i.source?.includes('bom'));
    
    if (invItem) {
      invItem.qty = (Number(invItem.qty) || 0) + qty;
      await window.saveItemToFirebase(invItem);
      showToast(`${qty} qty successfully reused!`, 'success');
      await window.refreshInventoryData();
    } else {
      showToast('Original inventory item not found to update.', 'error');
    }
  } catch (err) {
    showToast('Reuse failed: ' + err.message, 'error');
  }
};

// Placeholders for other pages
window.renderIssue = function() { document.getElementById('issueTable').innerHTML = `<tr><td colspan="3" class="empty">Issue Voucher data will show here.</td></tr>`; };
window.renderIR = function() { document.getElementById('irTable').innerHTML = `<tr><td colspan="3" class="empty">IR / Move Order data will show here.</td></tr>`; };
window.renderFailure = function() { /* Handled by UI */ };
