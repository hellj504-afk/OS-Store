// ==========================================
// BOM.JS — Exact BOM View & Failure Detect
// ==========================================

window.renderBOM = async function() {
  const tbody = document.getElementById('bomTable');
  if (!tbody) return;
  
  tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading BOM Data...</td></tr>`;
  
  if (typeof window.loadInventoryFromFirebase !== 'function') return;

  try {
    const allData = await window.loadInventoryFromFirebase();
    
    // Sirf BOM/Assembly data
    const bomData = allData.filter(item => item.source && (item.source.includes('bom') || item.source.includes('assembly')));

    if (bomData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">No BOM data found. Upload PDF in PDF Import.</td></tr>`;
      return;
    }

    const query = document.getElementById('bomSearch')?.value.toUpperCase() || '';
    const filterType = document.getElementById('bomFilterType')?.value || 'all';

    // Filter based on search and type
    const filtered = bomData.filter(item => {
      const matchSearch = !query || item.code.includes(query) || (item.parent && item.parent.includes(query)) || (item.desc || '').toUpperCase().includes(query);
      let matchType = true;
      if (filterType !== 'all') {
         matchType = item.source.includes(filterType);
      }
      return matchSearch && matchType;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty">No matching BOM items found.</td></tr>`;
      return;
    }

    // Render Table
    tbody.innerHTML = filtered.map(item => {
      let typeName = 'BOM';
      if (item.source.includes('pre_assembly')) typeName = 'Pre Ass';
      if (item.source.includes('final_assembly')) typeName = 'Final Ass';
      
      return `
      <tr>
        <td><span class="badge ${typeName === 'Pre Ass' ? 'low' : (typeName === 'Final Ass' ? 'yes' : 'no')}">${typeName}</span></td>
        <td class="code">${item.parent || 'N/A'}</td>
        <td class="code" style="font-weight:bold;">${item.code}</td>
        <td>${item.desc || '-'}</td>
        <td>${item.uom || 'NOS'}</td>
        <td style="font-weight:bold; color:var(--blue);">${formatNumber(item.qty)}</td>
      </tr>
    `}).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty" style="color:red">Error: ${err.message}</td></tr>`;
  }
};

window.calculateFailure = async function() {
  const fgCode = document.getElementById('failCode').value.trim().toUpperCase();
  const failQty = parseFloat(document.getElementById('failQty').value) || 0;
  
  if (!fgCode || failQty <= 0) return showToast('FG Code aur Qty likhein!', 'error');

  const resultArea = document.getElementById('failureResultArea');
  const resultBody = document.getElementById('failureResultTable');
  resultArea.style.display = 'block';
  resultBody.innerHTML = `<tr><td colspan="7" class="empty">Searching BOMs & Calculating...</td></tr>`;

  const allData = await window.loadInventoryFromFirebase();
  
  // 1. FG Code ke saare materials dhoondein
  const bomItems = allData.filter(i => i.source && (i.source.includes('bom') || i.source.includes('assembly')) && i.parent === fgCode);
  
  if (bomItems.length === 0) {
    resultBody.innerHTML = `<tr><td colspan="7" class="empty" style="color:#c93a4d">No BOM found for Parent: ${fgCode}</td></tr>`;
    document.getElementById('failTotalCost').textContent = 'Rs. 0';
    return;
  }

  // 2. Agar same material ek se zyada baar hai, toh qty combine karein
  const mergedBom = {};
  bomItems.forEach(item => {
     if (mergedBom[item.code]) {
        mergedBom[item.code].qty += Number(item.qty) || 0;
     } else {
        mergedBom[item.code] = { ...item, qty: Number(item.qty) || 0 };
     }
  });

  // 3. Har material ki cost inventory se nikaalein aur calculate karein
  let totalCost = 0;
  const finalRows = Object.values(mergedBom).map(bomItem => {
     // Inventory se cost dhoondein
     const invItem = allData.find(i => i.code === bomItem.code && !i.source?.includes('bom') && !i.source?.includes('assembly'));
     const unitCost = invItem ? (Number(invItem.cost) || 0) : 0;
     
     // Formula: BOM Qty * Failure Qty
     const reqQty = bomItem.qty * failQty;
     const rowCost = reqQty * unitCost;
     totalCost += rowCost;
     
     return { ...bomItem, reqQty, unitCost, rowCost };
  });

  // 4. Total Cost dikhayein
  document.getElementById('failTotalCost').textContent = 'Rs. ' + formatNumber(totalCost);

  // 5. Table mein rows bharein
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

window.reuseMaterial = async function(code, qty) {
  if (!confirm(`Kya aap ${qty} qty wapas inventory mein add karna chahte hain?`)) return;
  
  try {
    const allData = await window.loadInventoryFromFirebase();
    const invItem = allData.find(i => i.code === code && !i.source?.includes('bom') && !i.source?.includes('assembly'));
    
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

window.renderIssue = function() { document.getElementById('issueTable').innerHTML = `<tr><td colspan="3" class="empty">Issue Voucher data will show here.</td></tr>`; };
window.renderIR = function() { document.getElementById('irTable').innerHTML = `<tr><td colspan="3" class="empty">IR / Move Order data will show here.</td></tr>`; };
