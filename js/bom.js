// ==========================================
// BOM.JS — Smart Cost for Failure
// ==========================================

window.renderBOM = async function() {
  // Same as before...
  const tbody = document.getElementById('bomTable'); if (!tbody) return;
  if (typeof window.loadInventoryFromFirebase !== 'function') return;
  try {
    const allData = await window.loadInventoryFromFirebase();
    const bomData = allData.filter(item => item.source && (item.source.includes('bom') || item.source.includes('assembly')));
    if (bomData.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="empty">No BOM data found.</td></tr>`; return; }
    const query = document.getElementById('bomSearch')?.value.toUpperCase() || '';
    const filtered = bomData.filter(item => !query || item.code.includes(query) || (item.parent && item.parent.includes(query)));
    if (filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="empty">No matching BOM items.</td></tr>`; return; }
    tbody.innerHTML = filtered.map(item => `
      <tr>
        <td>${item.source.includes('pre_assembly') ? 'Pre Ass' : 'Final'}</td>
        <td class="code">${item.parent || 'N/A'}</td>
        <td class="code" style="font-weight:bold;">${item.code}</td>
        <td>${item.desc || '-'}</td>
        <td>${item.uom || 'NOS'}</td>
        <td style="font-weight:bold; color:var(--blue);">${formatNumber(item.qty)}</td>
      </tr>
    `).join('');
  } catch (err) { tbody.innerHTML = `<tr><td colspan="6" class="empty" style="color:red">Error: ${err.message}</td></tr>`; }
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
  const bomItems = allData.filter(i => i.source && (i.source.includes('bom') || i.source.includes('assembly')) && i.parent === fgCode);
  
  if (bomItems.length === 0) {
    resultBody.innerHTML = `<tr><td colspan="7" class="empty" style="color:#c93a4d">No BOM found for Parent: ${fgCode}</td></tr>`;
    document.getElementById('failTotalCost').textContent = 'Rs. 0';
    return;
  }

  const mergedBom = {};
  bomItems.forEach(item => { if (mergedBom[item.code]) mergedBom[item.code].qty += Number(item.qty) || 0; else mergedBom[item.code] = { ...item, qty: Number(item.qty) || 0 }; });

  let totalCost = 0;
  const finalRows = Object.values(mergedBom).map(bomItem => {
     // 1. Try to find cost in Inventory
     const invItem = allData.find(i => i.code === bomItem.code && (!i.source || (!i.source.includes('bom') && !i.source.includes('assembly'))));
     let unitCost = invItem ? (Number(invItem.cost) || 0) : 0;
     
     // 2. If cost is 0, find it in Slow Moving
     if (unitCost === 0) {
        const slowItem = allData.find(i => i.code === bomItem.code && i.source && i.source.includes('slow_moving'));
        if (slowItem) unitCost = Number(slowItem.cost) || 0;
     }
     
     const reqQty = bomItem.qty * failQty;
     const rowCost = reqQty * unitCost;
     totalCost += rowCost;
     
     return { ...bomItem, reqQty, unitCost, rowCost };
  });

  document.getElementById('failTotalCost').textContent = 'Rs. ' + formatNumber(totalCost);

  resultBody.innerHTML = finalRows.map((r, index) => `
    <tr>
      <td class="code">${r.code}</td>
      <td>${r.desc}</td>
      <td style="font-weight:bold; color:var(--blue);">${formatNumber(r.reqQty)}</td>
      <td>${r.uom}</td>
      <td style="color: ${r.unitCost > 0 ? '#00f2fe' : 'inherit'}; font-weight: ${r.unitCost > 0 ? 'bold' : 'normal'};">Rs. ${formatNumber(r.unitCost)}</td>
      <td style="font-weight:bold; color:#c93a4d;">Rs. ${formatNumber(r.rowCost)}</td>
      <td><button class="primary" style="padding:5px 10px; font-size:10px;" onclick="reuseMaterial('${r.code}', ${r.reqQty})">♻ Reuse</button></td>
    </tr>
  `).join('');
};
