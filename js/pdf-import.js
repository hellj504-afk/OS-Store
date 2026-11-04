// ==========================================
// PDF-IMPORT.JS — Exact Format Parsers
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
  const importType = document.getElementById('importType').value; // inventory ya slow_moving
  
  statusDiv.textContent = '⏳ Reading PDF...';
  statusDiv.className = 'pdf-status';
  previewArea.style.display = 'none';

  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let allRows = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      // Words extract karein coordinates ke sath
      const words = content.items.map(it => ({ 
        text: it.str.trim(), 
        x: it.transform[4], 
        y: it.transform[5] 
      })).filter(w => w.text !== '');

      const lines = [];
      words.forEach(word => {
        let line = lines.find(l => Math.abs(l.y - word.y) < 5);
        if (line) line.words.push(word);
        else lines.push({ y: word.y, words: [word] });
      });

      lines.sort((a, b) => b.y - a.y); // Top to bottom
      lines.forEach(l => l.words.sort((a, b) => a.x - b.x)); // Left to right

      let currentItem = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineText = line.words.map(w => w.text).join(' ');
        
        if (lineText.includes('PAK ELEKTRON') || lineText.includes('Subinventory') || lineText.includes('Page')) continue;
        
        // Item Code dhoondein (CM0392, RM0141, FG1060)
        const codeWord = line.words.find(w => /^[A-Z]{2,4}\d{3,4}-\d{4,10}-\d{2}-\d{3,4}$/.test(w.text));

        if (codeWord) {
          // Naya item shuru
          let subInv = 'N/A';
          if (importType === 'inventory') {
             const subWord = line.words.find(w => w.x < codeWord.x && /^'?\d{3}$/.test(w.text));
             if (subWord) subInv = subWord.text.replace("'", "");
          }

          currentItem = { subInv: subInv, code: codeWord.text, desc: '', uom: 'NOS', qty: 0, cost: 0 };
          allRows.push(currentItem);
          
          if (importType === 'slow_moving') {
             processSlowMoving(line.words, currentItem);
          } else {
             processNormalInventory(line.words, currentItem);
          }
        } else if (currentItem) {
          // Description ya data ki agli line
          if (importType === 'slow_moving') {
             processSlowMoving(line.words, currentItem);
          } else {
             processNormalInventory(line.words, currentItem);
          }
        }
      }
    }

    // Duplicates merge karein
    const map = {};
    allRows.forEach(r => { 
      r.desc = r.desc.replace(/\s+/g, ' ').trim();
      
      // Sub Inv N/A fix (agar description '002 se shuru ho raha ho)
      if (r.subInv === 'N/A') {
        const match = r.desc.match(/^'?(\d{3})\s+(.*)/);
        if (match) { r.subInv = match[1]; r.desc = match[2]; }
      }

      if (map[r.code]) {
        map[r.code].qty += r.qty;
        if (r.cost > 0) map[r.code].cost = r.cost;
        if (map[r.code].subInv === 'N/A' && r.subInv !== 'N/A') map[r.code].subInv = r.subInv;
      } else {
        map[r.code] = r; 
      }
    });
    
    const finalRows = Object.values(map);
    window.importedRows = finalRows;

    if (!finalRows.length) {
      statusDiv.textContent = '⚠ No valid rows found. Check format.';
      return;
    }

    document.getElementById('previewArea').style.display = 'block';
    document.getElementById('previewCount').textContent = finalRows.length;
    
    document.getElementById('previewTable').innerHTML = finalRows.slice(0, 200).map(r => `
      <tr>
        <td>${r.subInv}</td>
        <td class="code">${r.code}</td>
        <td>${r.desc}</td>
        <td>${r.uom}</td>
        <td>${formatNumber(r.qty)}</td>
        <td>${r.cost > 0 ? 'Rs. ' + formatNumber(r.cost) : '-'}</td>
      </tr>
    `).join('');

    statusDiv.textContent = `✓ Extracted ${finalRows.length} rows.`;
    statusDiv.className = 'pdf-status success';

  } catch (err) {
    statusDiv.textContent = '❌ Error: ' + err.message;
    statusDiv.className = 'pdf-status error';
  }
};

// ==========================================
// 1. NORMAL INVENTORY PARSER (Work in Process)
// Format: 200 | P02-... | CM0392... | Desc | UOM | 14.00 | 0.00 | 0.00 | 14.00
// ==========================================
function processNormalInventory(words, item) {
  const uomRegex = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i;
  const numRegex = /^[\d,]+\.?\d*$/;
  let uomIndex = -1;
  
  for (let i = 0; i < words.length; i++) {
    if (uomRegex.test(words[i].text)) { uomIndex = i; item.uom = words[i].text.toUpperCase(); break; }
  }

  if (uomIndex !== -1) {
    // UOM mil gaya, iske pehle Description hai
    let descWords = words.slice(0, uomIndex).map(w => w.text);
    descWords = descWords.filter(t => t !== item.code && !t.startsWith('P02-'));
    item.desc = descWords.join(' ');
    
    // UOM ke baad sirf numbers hain, aakhri number Closing Qty hai
    const nums = [];
    for (let i = uomIndex + 1; i < words.length; i++) {
      if (numRegex.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    }
    if (nums.length > 0) item.qty = nums[nums.length - 1];
  } else {
    // Agar UOM nahi hai line mein, toh ye description ki continuation hai
    let extra = words.filter(w => !numRegex.test(w.text) && w.text !== item.code && !w.text.includes(item.subInv) && !w.startsWith('P02-')).map(w => w.text).join(' ');
    if (extra.trim()) item.desc += ' ' + extra;
  }
}

// ==========================================
// 2. SLOW MOVING PARSER
// Format: FG1060... | Desc | NOS | Stock | Rate | Value ...
// ==========================================
function processSlowMoving(words, item) {
  const uomRegex = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i;
  const numRegex = /^[\d,]+\.?\d*$/;
  let uomIndex = -1;
  
  for (let i = 0; i < words.length; i++) {
    if (uomRegex.test(words[i].text)) { uomIndex = i; item.uom = words[i].text.toUpperCase(); break; }
  }

  if (uomIndex !== -1) {
    // Description UOM se pehle hoti hai
    let descWords = words.slice(0, uomIndex).map(w => w.text);
    descWords = descWords.filter(t => t !== item.code);
    item.desc = descWords.join(' ');
    
    // UOM ke baad numbers: Stock Qty (pehla), Rate (dusra)
    const nums = [];
    for (let i = uomIndex + 1; i < words.length; i++) {
      if (numRegex.test(words[i].text)) nums.push(parseFloat(words[i].text.replace(/,/g, '')));
    }
    
    // Slow moving mein pehle 2 numbers Stock aur Rate hote hain
    if (nums.length >= 1) item.qty = nums[0]; 
    if (nums.length >= 2) item.cost = nums[1];
  } else {
    // Agar UOM nahi mila, toh description continuation hai (jese 2 line wali desc)
    let extra = words.filter(w => !numRegex.test(w.text) && w.text !== item.code).map(w => w.text).join(' ');
    if (extra.trim()) item.desc += ' ' + extra;
  }
}

// ==========================================
// SAVE TO FIREBASE
// ==========================================
window.confirmImport = async function() {
  if (!window.importedRows.length) return;

  const importType = document.getElementById('importType').value;
  const btn = document.querySelector('#previewArea .primary');
  btn.textContent = 'Importing...'; btn.disabled = true;

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

    btn.textContent = 'Importing new data...';
    const itemsToSave = window.importedRows.map(row => ({ 
      ...row, source: `PDF (${importType})`, updatedAt: new Date().toISOString() 
    }));
    
    const savedCount = await window.bulkSaveToFirebase(itemsToSave);
    showToast(`Imported ${savedCount} items!`, 'success');
    
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('pdfStatus').textContent = `✓ Import complete: ${savedCount} rows saved.`;
    document.getElementById('pdfFile').value = ''; 
    
    await refreshInventoryData();
  } catch (err) {
    showToast('Import failed: ' + err.message, 'error');
  } finally {
    btn.textContent = '✓ Import Now'; btn.disabled = false;
  }
};
