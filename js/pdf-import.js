// ==========================================
// PDF-IMPORT.JS — Advanced Coordinate-Based Parser
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
  
  statusDiv.textContent = '⏳ Reading PDF structure... Please wait.';
  statusDiv.className = 'pdf-status';
  previewArea.style.display = 'none';

  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    
    let allRows = [];
    const selectedSubInv = document.getElementById('filterSubInv')?.value || 'all';

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      const words = content.items.map(it => ({
        text: it.str.trim(),
        x: it.transform[4],
        y: it.transform[5],
        width: it.width
      })).filter(w => w.text !== '');

      const lines = [];
      words.forEach(word => {
        let line = lines.find(l => Math.abs(l.y - word.y) < 5);
        if (line) {
          line.words.push(word);
        } else {
          lines.push({ y: word.y, words: [word] });
        }
      });

      lines.sort((a, b) => b.y - a.y);
      lines.forEach(l => l.words.sort((a, b) => a.x - b.x));

      let currentItem = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineText = line.words.map(w => w.text).join(' ');
        
        if (lineText.includes('PAK ELEKTRON') || lineText.includes('Subinventory') || lineText.includes('Page')) continue;
        
        const subInvWord = line.words.find(w => w.x < 80 && /^\d{3}$/.test(w.text));
        const codeWord = line.words.find(w => /^[A-Z]{2,4}\d{3,4}-\d{4,10}-\d{2}-\d{3,4}$/.test(w.text));

        if (codeWord) {
          currentItem = {
            subInv: subInvWord ? subInvWord.text : '',
            code: codeWord.text,
            desc: '',
            uom: 'NOS',
            qty: 0
          };
          allRows.push(currentItem);
          processLineWords(line.words, currentItem);
        } else if (currentItem) {
          processLineWords(line.words, currentItem);
        }
      }
    }

    let filteredRows = allRows;
    if (selectedSubInv !== 'all') {
      filteredRows = filteredRows.filter(r => r.subInv === selectedSubInv);
    }
    
    // Deduplicate for preview (combine qty if same code appears)
    const map = {};
    filteredRows.forEach(r => { 
      r.desc = r.desc.replace(/\s+/g, ' ').trim();
      if(r.desc.endsWith(r.uom)) r.desc = r.desc.slice(0, -r.uom.length).trim();
      
      if (map[r.code]) {
         map[r.code].qty += r.qty;
      } else {
         map[r.code] = r; 
      }
    });
    
    const finalRows = Object.values(map);
    window.importedRows = finalRows;

    if (!finalRows.length) {
      statusDiv.textContent = '⚠ No valid rows found. Check PDF or Filter options.';
      statusDiv.className = 'pdf-status error';
      return;
    }

    document.getElementById('previewArea').style.display = 'block';
    document.getElementById('previewCount').textContent = finalRows.length;
    
    document.getElementById('previewTable').innerHTML = finalRows.slice(0, 200).map(r => `
      <tr>
        <td class="code">${r.code}</td>
        <td>${r.desc}</td>
        <td>${r.uom}</td>
        <td>${formatNumber(r.qty)}</td>
      </tr>
    `).join('');

    statusDiv.textContent = `✓ Extracted ${finalRows.length} rows. Review and click Import.`;
    statusDiv.className = 'pdf-status success';

  } catch (err) {
    console.error(err);
    statusDiv.textContent = '❌ Error: ' + err.message;
    statusDiv.className = 'pdf-status error';
  }
};

function processLineWords(words, item) {
  const uomRegex = /^(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)$/i;
  const numRegex = /^[\d,]+\.?\d*$/;
  
  let uomIndex = -1;
  
  for (let i = 0; i < words.length; i++) {
    if (uomRegex.test(words[i].text)) {
      uomIndex = i;
      item.uom = words[i].text.toUpperCase();
      break;
    }
  }

  if (uomIndex !== -1) {
    let descWords = words.slice(0, uomIndex).map(w => w.text);
    descWords = descWords.filter(t => t !== item.code && !/^\d{3}$/.test(t) && !t.startsWith('P02-'));
    item.desc = descWords.join(' ');
    
    const nums = [];
    for (let i = uomIndex + 1; i < words.length; i++) {
      if (numRegex.test(words[i].text)) {
        nums.push(parseFloat(words[i].text.replace(/,/g, '')));
      }
    }
    if (nums.length > 0) {
      item.qty = nums[nums.length - 1];
    }
  } else {
    let extraDesc = words.filter(w => 
      !numRegex.test(w.text) && 
      w.text !== item.code && 
      !/^\d{3}$/.test(w.text) &&
      !w.text.startsWith('P02-')
    ).map(w => w.text).join(' ');
    
    if (extraDesc.trim()) {
      item.desc += ' ' + extraDesc;
    }
  }
}

window.confirmImport = async function() {
  if (!window.importedRows.length) {
    showToast('Nothing to import', 'error');
    return;
  }

  const dest = document.getElementById('importDest').value;
  const btn = document.querySelector('#previewArea .primary');
  const originalText = btn.textContent;
  
  btn.textContent = 'Importing...';
  btn.disabled = true;

  try {
    // === AUTO DELETE PURANA DATA ===
    const shouldDeleteOld = document.getElementById('chkDeleteOld')?.checked;
    if (shouldDeleteOld) {
      btn.textContent = 'Clearing old data...';
      const allData = await window.loadInventoryFromFirebase();
      for (const item of allData) {
        await window.deleteItemFromFirebase(item.id || item.code);
      }
    }

    btn.textContent = 'Importing new data...';
    
    const itemsToSave = window.importedRows.map(row => ({
      ...row,
      source: `PDF (${dest})`,
      updatedAt: new Date().toISOString()
    }));

    const savedCount = await window.bulkSaveToFirebase(itemsToSave);
    showToast(`Successfully imported ${savedCount} items!`, 'success');
    
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('pdfStatus').textContent = `✓ Import complete: ${savedCount} rows saved.`;
    document.getElementById('pdfStatus').className = 'pdf-status success';
    document.getElementById('pdfFile').value = ''; 
    
    await refreshInventoryData();

  } catch (err) {
    console.error(err);
    showToast('Import failed: ' + err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};
