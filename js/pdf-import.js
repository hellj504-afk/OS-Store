// ==========================================
// PDF-IMPORT.JS — Super Fast & Fixed Import
// ==========================================

window.importedRows = [];

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

window.handlePDF = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusDiv = document.getElementById('pdfStatus');
  const previewArea = document.getElementById('previewArea');
  const importType = document.getElementById('importType').value;
  
  statusDiv.textContent = '⏳ Reading PDF (Fast Mode)...';
  statusDiv.className = 'pdf-status';
  previewArea.style.display = 'none';

  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let allRows = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      const words = content.items.map(function(it) {
        return { text: String(it.str || '').trim(), x: it.transform[4], y: it.transform[5] };
      }).filter(function(w) { return w.text !== ''; });

      const lines = [];
      words.forEach(function(word) {
        let line = lines.find(function(l) { return Math.abs(l.y - word.y) < 5; });
        if (line) line.words.push(word);
        else lines.push({ y: word.y, words: [word] });
      });

      lines.sort(function(a, b) { return b.y - a.y; });
      lines.forEach(function(l) { l.words.sort(function(a, b) { return a.x - b.x; }); });

      let currentItem = null;
      let currentParent = 'N/A'; 

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // FAST FILTER: Agar line mein 'A' se 'Z' tak koi code jesa pattern nahi hai, toh skip karo
        const lineText = line.words.map(function(w) { return w.text; }).join(' ');
        if (!/[A-Z]{2,4}\d{3,4}-/.test(lineText) && !lineText.includes('Description')) continue;

        if (lineText.includes('PAK ELEKTRON') || lineText.includes('Subinventory') || lineText.includes('Page')) continue;
        
        const codeWord = line.words.find(function(w) { return /^[A-Z]{2,4}\d{3,4}-\d{4,10}-\d{2}-\d{3,4}$/.test(w.text); });

        if (importType.includes('bom') || importType.includes('assembly')) {
          if (codeWord) {
             // === FIX: WIP aur FG dono Parent banenge ===
             if (codeWord.text.startsWith('FG') || codeWord.text.startsWith('WIP')) {
                currentParent = codeWord.text;
             } else {
                // Child Material (CM, RM, SS)
                let row = { subInv: 'N/A', code: codeWord.text, desc: '', uom: 'NOS', qty: 0, cost: 0, parent: currentParent };
                processBOMLine(line.words, row);
                if(row.qty > 0) allRows.push(row);
             }
          } else if (currentParent !== 'N/A' && allRows.length > 0) {
             const lastRow = allRows[allRows.length - 1];
             if (lastRow && lastRow.parent === currentParent) {
                processBOMLine(line.words, lastRow);
             }
          }
        } 
        else {
           // === NORMAL INVENTORY / SLOW MOVING ===
           if (codeWord) {
             let subInv = 'N/A';
             const subWord = line.words.find(function(w) { return w.x < codeWord.x && /^'?\d{3}$/.test(w.text); });
             if (subWord) subInv = subWord.text.replace("'", "");

             currentItem = { subInv: subInv, code: codeWord.text, desc: '', uom: 'NOS', qty: 0, cost: 0 };
             allRows.push(currentItem);
             
             if (importType === 'slow_moving') processSlowMoving(line.words, currentItem);
             else processNormalInventory(line.words, currentItem);
           } else if (currentItem) {
             if (importType === 'slow_moving') processSlowMoving(line.words, currentItem);
             else processNormalInventory(line.words, currentItem);
           }
        }
      }
    }

    const map = {};
    allRows.forEach(function(r) { 
      r.desc = r.desc.replace(/\s+/g, ' ').trim();
      
      if (!importType.includes('bom') && !importType.includes('assembly') && r.subInv === 'N/A') {
        const match = r.desc.match(/^'?(\d{3})\s+(.*)/);
        if (match) { r.subInv = match[1]; r.desc = match[2]; }
      }

      const key = r.code + (r.parent && r.parent !== 'N/A' ? '_' + r.parent : '');
      
      if (map[key]) {
        map[key].qty += r.qty;
      } else {
        map[key] = r; 
      }
    });
    
    const finalRows = Object.values(map);
    window.importedRows = finalRows;

    if (!finalRows.length) {
      statusDiv.textContent = '⚠ No valid rows found.';
      return;
    }

    document.getElementById('previewArea').style.display = 'block';
    document.getElementById('previewCount').textContent = finalRows.length;
    
    document.getElementById('previewTable').innerHTML = finalRows.slice(0, 200).map(function(r) {
      return `
      <tr>
        <td>${r.parent || 'N/A'}</td>
        <td class="code">${r.code}</td>
        <td>${r.desc}</td>
        <td>${r.uom}</td>
        <td>${formatNumber(r.qty)}</td>
      </tr>`;
    }).join('');

    statusDiv.textContent = `✓ Extracted ${finalRows.length} rows successfully.`;
    statusDiv.className = 'pdf-status success';

  } catch (err) {
    console.error(err);
    statusDiv.textContent = '❌ Error: ' + err.message;
    statusDiv.className = 'pdf-status error';
  }
};

// ==========================================
// PARSE HELPERS
// ==========================================
function processBOMLine(words, item) {
  const uomRegex = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i;
  const numRegex = /^[\d,]+\.?\d*$/;
  let uomIndex = -1;
  
  for (let i = 0; i < words.length; i++) {
    if (uomRegex.test(words[i].text)) { uomIndex = i; item.uom = words[i].text.toUpperCase(); break; }
  }

  if (uomIndex !== -1) {
    let descWords = words.slice(0, uomIndex).map(function(w) { return w.text; });
    descWords = descWords.filter(function(t) { return !numRegex.test(t) && String(t) !== String(item.code); });
    item.desc = descWords.join(' ');
    
    const nums = [];
    for (let i = uomIndex + 1; i < words.length; i++) {
      if (numRegex.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    }
    if (nums.length > 0) item.qty = nums[0]; 
  } else {
    let extra = words.filter(function(w) { return !numRegex.test(w.text) && String(w.text) !== String(item.code); }).map(function(w) { return w.text; }).join(' ');
    if (extra.trim()) item.desc += ' ' + extra;
  }
}

function processNormalInventory(words, item) {
  const uomRegex = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i;
  const numRegex = /^[\d,]+\.?\d*$/;
  let uomIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (uomRegex.test(words[i].text)) { uomIndex = i; item.uom = words[i].text.toUpperCase(); break; }
  }
  if (uomIndex !== -1) {
    let descWords = words.slice(0, uomIndex).map(function(w) { return w.text; });
    descWords = descWords.filter(function(t) { return String(t) !== String(item.code) && !String(t).startsWith('P02-'); });
    item.desc = descWords.join(' ');
    const nums = [];
    for (let i = uomIndex + 1; i < words.length; i++) {
      if (numRegex.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    }
    if (nums.length > 0) item.qty = nums[nums.length - 1]; 
  } else {
    let extra = words.filter(function(w) { return !numRegex.test(w.text) && String(w.text) !== String(item.code) && !String(w.text).includes(item.subInv) && !String(w.text).startsWith('P02-'); }).map(function(w) { return w.text; }).join(' ');
    if (extra.trim()) item.desc += ' ' + extra;
  }
}

function processSlowMoving(words, item) {
  const uomRegex = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i;
  const numRegex = /^[\d,]+\.?\d*$/;
  let uomIndex = -1;
  for (let i = 0; i < words.length; i++) {
    if (uomRegex.test(words[i].text)) { uomIndex = i; item.uom = words[i].text.toUpperCase(); break; }
  }
  if (uomIndex !== -1) {
    let descWords = words.slice(0, uomIndex).map(function(w) { return w.text; });
    descWords = descWords.filter(function(t) { return String(t) !== String(item.code); });
    item.desc = descWords.join(' ');
    const nums = [];
    for (let i = uomIndex + 1; i < words.length; i++) {
      if (numRegex.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    }
    if (nums.length >= 1) item.qty = nums[0]; 
    if (nums.length >= 2) item.cost = nums[1]; 
  } else {
    let extra = words.filter(function(w) { return !numRegex.test(w.text) && String(w.text) !== String(item.code); }).map(function(w) { return w.text; }).join(' ');
    if (extra.trim()) item.desc += ' ' + extra;
  }
}

// ==========================================
// IMPORT TO FIREBASE (FIXED)
// ==========================================
window.confirmImport = async function() {
  if (!window.importedRows.length) {
    showToast('Koi data nahi hai import ke liye!', 'error');
    return;
  }

  const importType = document.getElementById('importType').value;
  const btn = document.querySelector('#previewArea .primary');
  const originalText = btn.textContent;
  
  btn.textContent = 'Importing... Please wait'; 
  btn.disabled = true;

  try {
    if (document.getElementById('chkDeleteOld')?.checked) {
      btn.textContent = 'Clearing old data...';
      const allData = await window.loadInventoryFromFirebase();
      for (const item of allData) {
        if (item.source && item.source.includes(importType)) {
          await window.deleteItemFromFirebase(item.id || item.code);
        }
      }
    }

    btn.textContent = 'Saving to Database...';
    
    // Batch save logic (Fast import)
    const itemsToSave = window.importedRows.map(function(row) { 
      return Object.assign({}, row, { source: `PDF (${importType})`, updatedAt: new Date().toISOString() });
    });
    
    const savedCount = await window.bulkSaveToFirebase(itemsToSave);
    
    showToast(`Successfully imported ${savedCount} items!`, 'success');
    
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('pdfStatus').textContent = `✓ Import complete: ${savedCount} rows saved.`;
    document.getElementById('pdfFile').value = ''; 
    
    await refreshInventoryData();
    if (window.renderBOM) window.renderBOM();
    
  } catch (err) {
    console.error(err);
    showToast('Import failed: ' + err.message, 'error');
  } finally {
    btn.textContent = originalText; 
    btn.disabled = false;
  }
};
