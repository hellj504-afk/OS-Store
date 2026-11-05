// ==========================================
// PDF-IMPORT.JS — With Progress Animation
// ==========================================

window.importedRows = [];

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ==========================================
// FILE UPLOAD HANDLER
// ==========================================
window.handleFileUpload = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.name.toLowerCase().endsWith('.csv')) handleCSV(file);
  else if (file.name.toLowerCase().endsWith('.pdf')) handlePDF(file);
  else showToast('Sirf PDF ya CSV file upload karein!', 'error');
};

function handleCSV(file) {
  const statusDiv = document.getElementById('pdfStatus');
  statusDiv.textContent = '⏳ Reading CSV...';
  statusDiv.className = 'pdf-status';
  document.getElementById('previewArea').style.display = 'none';

  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: function(results) {
      let allRows = [];
      const importType = document.getElementById('importType').value;
      const isBom = importType.includes('bom') || importType.includes('assembly');

      results.data.forEach(row => {
        let code = row['Item Code'] || row['Code'] || row['Component'] || '';
        code = String(code).trim().toUpperCase();
        if (!code) return;

        let item = {
          subInv: row['Sub Inv'] || row['Subinventory'] || 'N/A',
          code: code,
          desc: row['Description'] || row['Desc'] || '',
          uom: row['UOM'] || row['Unit'] || 'NOS',
          qty: parseFloat(row['Qty'] || row['Quantity'] || row['Stock'] || 0),
          cost: parseFloat(row['Rate'] || row['Cost'] || 0),
          parent: 'N/A'
        };

        if (isBom) {
           let p = row['Parent'] || row['FG Code'] || 'N/A';
           if (p === 'N/A' && code.startsWith('FG')) p = code;
           item.parent = p;
        }
        allRows.push(item);
      });
      finalizeData(allRows, importType);
    }
  });
}

async function handlePDF(file) {
  const statusDiv = document.getElementById('pdfStatus');
  const importType = document.getElementById('importType').value;
  statusDiv.textContent = '⏳ Reading PDF...';
  statusDiv.className = 'pdf-status';
  document.getElementById('previewArea').style.display = 'none';

  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let allRows = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const words = content.items.map(it => ({ text: String(it.str || '').trim(), x: it.transform[4], y: it.transform[5] })).filter(w => w.text !== '');
      
      const lines = [];
      words.forEach(word => {
        let line = lines.find(l => Math.abs(l.y - word.y) < 5);
        if (line) line.words.push(word);
        else lines.push({ y: word.y, words: [word] });
      });
      lines.sort((a, b) => b.y - a.y);
      lines.forEach(l => l.words.sort((a, b) => a.x - b.x));

      let currentItem = null, currentParent = 'N/A';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineText = line.words.map(w => w.text).join(' ');
        if (!/[A-Z]{2,4}\d{3,4}-/.test(lineText) && !lineText.includes('Description')) continue;
        if (lineText.includes('PAK ELEKTRON') || lineText.includes('Subinventory') || lineText.includes('Page')) continue;
        
        const codeWord = line.words.find(w => /^[A-Z]{2,4}\d{3,4}-\d{4,10}-\d{2}-\d{3,4}$/.test(w.text));

        if (importType.includes('bom') || importType.includes('assembly')) {
          if (codeWord) {
             if (codeWord.text.startsWith('FG') || codeWord.text.startsWith('WIP')) currentParent = codeWord.text;
             else {
                let row = { subInv: 'N/A', code: codeWord.text, desc: '', uom: 'NOS', qty: 0, cost: 0, parent: currentParent };
                parseBomLine(line.words, row);
                if(row.qty > 0) allRows.push(row);
             }
          } else if (currentParent !== 'N/A' && allRows.length > 0) {
             const last = allRows[allRows.length - 1];
             if (last.parent === currentParent) parseBomLine(line.words, last);
          }
        } else {
           if (codeWord) {
             let subInv = 'N/A';
             const subWord = line.words.find(w => w.x < codeWord.x && /^'?\d{3}$/.test(w.text));
             if (subWord) subInv = subWord.text.replace("'", "");

             currentItem = { subInv: subInv, code: codeWord.text, desc: '', uom: 'NOS', qty: 0, cost: 0 };
             allRows.push(currentItem);
             if (importType === 'slow_moving') parseSlowLine(line.words, currentItem);
             else parseNormalLine(line.words, currentItem);
           } else if (currentItem) {
             if (importType === 'slow_moving') parseSlowLine(line.words, currentItem);
             else parseNormalLine(line.words, currentItem);
           }
        }
      }
    }
    finalizeData(allRows, importType);
  } catch (err) {
    statusDiv.textContent = '❌ Error: ' + err.message;
  }
}

function finalizeData(allRows, importType) {
  const map = {};
  allRows.forEach(r => {
    r.desc = r.desc.replace(/\s+/g, ' ').trim();
    if (!importType.includes('bom') && !importType.includes('assembly') && r.subInv === 'N/A') {
      const m = r.desc.match(/^'?(\d{3})\s+(.*)/);
      if (m) { r.subInv = m[1]; r.desc = m[2]; }
    }
    const key = r.code + (r.parent && r.parent !== 'N/A' ? '_' + r.parent : '');
    if (map[key]) { map[key].qty += r.qty; if(r.cost>0) map[key].cost = r.cost; }
    else map[key] = r;
  });
  
  window.importedRows = Object.values(map);
  const statusDiv = document.getElementById('pdfStatus');

  if (!window.importedRows.length) {
    statusDiv.textContent = '⚠ No valid rows found.'; return;
  }

  document.getElementById('previewArea').style.display = 'block';
  document.getElementById('previewCount').textContent = window.importedRows.length;
  
  document.getElementById('previewTable').innerHTML = window.importedRows.slice(0, 200).map(r => `
    <tr><td>${r.parent || 'N/A'}</td><td class="code">${r.code}</td><td>${r.desc}</td><td>${r.uom}</td><td>${formatNumber(r.qty)}</td><td>${r.cost > 0 ? 'Rs. ' + formatNumber(r.cost) : '-'}</td></tr>
  `).join('');

  statusDiv.textContent = `✓ Extracted ${window.importedRows.length} rows.`;
  statusDiv.className = 'pdf-status success';
}

// ==========================================
// PARSE HELPERS
// ==========================================
function parseBomLine(words, item) {
  const uomR = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i, numR = /^[\d,]+\.?\d*$/;
  let uomI = -1;
  for (let i = 0; i < words.length; i++) if (uomR.test(words[i].text)) { uomI = i; item.uom = words[i].text.toUpperCase(); break; }
  if (uomI !== -1) {
    item.desc = words.slice(0, uomI).map(w => w.text).filter(t => !numR.test(t) && t !== item.code).join(' ');
    let nums = []; for (let i = uomI + 1; i < words.length; i++) if (numR.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    if (nums.length > 0) item.qty = nums[0];
  } else {
    let ex = words.filter(w => !numR.test(w.text) && w.text !== item.code).map(w => w.text).join(' ');
    if (ex.trim()) item.desc += ' ' + ex;
  }
}

function parseNormalLine(words, item) {
  const uomR = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i, numR = /^[\d,]+\.?\d*$/;
  let uomI = -1;
  for (let i = 0; i < words.length; i++) if (uomR.test(words[i].text)) { uomI = i; item.uom = words[i].text.toUpperCase(); break; }
  if (uomI !== -1) {
    item.desc = words.slice(0, uomI).map(w => w.text).filter(t => t !== item.code && !t.startsWith('P02-')).join(' ');
    let nums = []; for (let i = uomI + 1; i < words.length; i++) if (numR.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    if (nums.length > 0) item.qty = nums[nums.length - 1];
  } else {
    let ex = words.filter(w => !numR.test(w.text) && w.text !== item.code && !w.text.includes(item.subInv) && !w.text.startsWith('P02-')).map(w => w.text).join(' ');
    if (ex.trim()) item.desc += ' ' + ex;
  }
}

function parseSlowLine(words, item) {
  const uomR = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i, numR = /^[\d,]+\.?\d*$/;
  let uomI = -1;
  for (let i = 0; i < words.length; i++) if (uomR.test(words[i].text)) { uomI = i; item.uom = words[i].text.toUpperCase(); break; }
  if (uomI !== -1) {
    item.desc = words.slice(0, uomI).map(w => w.text).filter(t => t !== item.code).join(' ');
    let nums = []; for (let i = uomI + 1; i < words.length; i++) if (numR.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    if (nums.length >= 1) item.qty = nums[0];
    if (nums.length >= 2) item.cost = nums[1];
  } else {
    let ex = words.filter(w => !numR.test(w.text) && w.text !== item.code).map(w => w.text).join(' ');
    if (ex.trim()) item.desc += ' ' + ex;
  }
}

// ==========================================
// CONFIRM IMPORT (With 1-100% Animation)
// ==========================================
window.confirmImport = async function(btnElement) {
  if (!window.importedRows.length) return showToast('No data to import!', 'error');

  const importType = document.getElementById('importType').value;
  
  // Progress bar elements
  const progressBar = document.getElementById('importProgressBar');
  const progressFill = document.getElementById('importProgressFill');
  const progressText = document.getElementById('importProgressText');
  
  // Button ko disable karein
  const originalText = btnElement ? btnElement.textContent : 'Import';
  if (btnElement) {
    btnElement.textContent = 'Importing...'; 
    btnElement.disabled = true;
  }

  // Progress bar show karein
  if (progressBar) progressBar.style.display = 'block';
  if (progressText) progressText.style.display = 'block';
  if (progressFill) progressFill.style.width = '0%';
  if (progressText) progressText.textContent = '0%';

  try {
    // Purana data delete karna hai toh
    if (document.getElementById('chkDeleteOld')?.checked) {
      if (progressText) progressText.textContent = 'Clearing old data...';
      const allData = await window.loadInventoryFromFirebase();
      for (const item of allData) {
        if (item.source && item.source.includes(importType)) {
          await window.deleteItemFromFirebase(item.id || item.code);
        }
      }
    }

    // Data save karein (Percentage ke sath)
    const toSave = window.importedRows.map(r => Object.assign({}, r, { source: `PDF (${importType})`, updatedAt: new Date().toISOString() }));
    const total = toSave.length;
    let count = 0;

    for (const item of toSave) {
      // Aapke storage.js ka function
      await window.saveItemToFirebase(item); 
      count++;
      
      // Percentage calculate karein
      const percent = Math.round((count / total) * 100);
      if (progressFill) progressFill.style.width = percent + '%';
      if (progressText) progressText.textContent = percent + '% Importing...';
      
      // Chota sa delay taake animation nazar aaye (optional)
      // await new Promise(r => setTimeout(r, 10)); 
    }
    
    showToast(`Successfully imported ${count} items!`, 'success');
    
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('pdfStatus').textContent = `✓ Import complete: ${count} rows saved.`;
    document.getElementById('pdfFile').value = ''; 
    
    if (progressText) progressText.textContent = '100% Complete!';
    setTimeout(() => {
       if (progressBar) progressBar.style.display = 'none';
       if (progressText) progressText.style.display = 'none';
    }, 1500);

    await refreshInventoryData();

  } catch (err) {
    showToast('Import failed: ' + err.message, 'error');
    if (progressText) progressText.textContent = 'Error occurred!';
  } finally {
    if (btnElement) {
      btnElement.textContent = originalText; 
      btnElement.disabled = false;
    }
  }
};
