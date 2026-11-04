// ==========================================
// PDF-IMPORT.JS — PDF Parsing & Import
// ==========================================

// Global state taake preview data yahan rahe
window.importedRows = [];

// PDF.js worker setup (CDN se)
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ====================
// 1. HANDLE PDF UPLOAD
// ====================
window.handlePDF = async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusDiv = document.getElementById('pdfStatus');
  const previewArea = document.getElementById('previewArea');
  
  statusDiv.textContent = '⏳ Reading PDF... Please wait.';
  statusDiv.className = 'pdf-status';
  previewArea.style.display = 'none';

  try {
    // PDF ko array buffer mein read karein
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    
    let fullText = '';
    
    // Har page ka text nikalें
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      // Text items ko Y-coordinate ke hisaab se group karein (lines banane ke liye)
      const lines = {};
      content.items.forEach(it => {
        const y = Math.round(it.transform[5]);
        if (!lines[y]) lines[y] = [];
        lines[y].push({ x: it.transform[4], str: it.str });
      });
      
      // Lines ko upar se niche sort karein
      const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
      
      sortedY.forEach(y => {
        const line = lines[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim();
        if (line) fullText += line + '\n';
      });
    }

    statusDiv.textContent = '⏳ Extracting data from text...';

    // Text se rows extract karein
    const rows = parseOracleText(fullText);
    
    if (!rows.length) {
      statusDiv.textContent = '⚠ No valid rows found. Check PDF format.';
      statusDiv.className = 'pdf-status error';
      return;
    }

    // Data preview ke liye save karein
    window.importedRows = rows;
    
    // Preview dikhayen
    document.getElementById('previewArea').style.display = 'block';
    document.getElementById('previewCount').textContent = rows.length;
    
    document.getElementById('previewTable').innerHTML = rows.slice(0, 200).map(r => `
      <tr>
        <td class="code">${r.code}</td>
        <td>${r.desc}</td>
        <td>${r.uom}</td>
        <td>${formatNumber(r.qty)}</td>
      </tr>
    `).join('');

    statusDiv.textContent = `✓ Extracted ${rows.length} rows. Review and click Import.`;
    statusDiv.className = 'pdf-status success';

  } catch (err) {
    console.error(err);
    statusDiv.textContent = '❌ Error: ' + err.message;
    statusDiv.className = 'pdf-status error';
  }
};

// ====================
// 2. SMART PARSER (Oracle PDF ke liye)
// ====================
function parseOracleText(text) {
  const rows = [];
  const lines = text.split('\n');
  
  // Regex: Oracle item codes (jaise CM0392-00030-10-026, RM0141-00045-10-026, WIP002...)
  const codeRe = /\b([A-Z]{2,4}\d{3,4}-\d{4,10}-\d{2}-\d{3,4}|[A-Z]{3}\d{3}-\d{6,10}-\d{2}-\d{3,4})\b/g;

  lines.forEach(line => {
    const codes = [...line.matchAll(codeRe)];
    if (!codes.length) return;

    codes.forEach((m, idx) => {
      const start = m.index;
      const end = idx < codes.length - 1 ? codes[idx + 1].index : line.length;
      let segment = line.slice(start, end).trim();

      // Pattern match: CODE + DESC + UOM + NUMs (Opening, Received, Issued, Closing)
      const segMatch = segment.match(/^([A-Z0-9-]+)\s+(.*?)\s+(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)/i);
      
      if (segMatch) {
        rows.push({
          code: segMatch[1].trim(),
          desc: segMatch[2].trim().replace(/\s+/g, ' '),
          uom: segMatch[3].toUpperCase(),
          qty: parseFloat(segMatch[7].replace(/,/g, '')) || 0 // Last number = Closing Qty
        });
      } else {
        // Fallback: Agar description alag line mein hai
        const numMatch = segment.match(/([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s*$/);
        if (numMatch) {
          const beforeNums = segment.slice(0, segment.lastIndexOf(numMatch[1])).trim();
          const uomMatch = beforeNums.match(/(NOS|KGS|MTR|LTR|SET|PC|PCS|KG|M|EA)\s*$/i);
          
          rows.push({
            code: m[1],
            desc: uomMatch ? beforeNums.slice(0, -uomMatch[0].length).replace(m[1], '').trim() : beforeNums.replace(m[1], '').trim(),
            uom: uomMatch ? uomMatch[1].toUpperCase() : 'NOS',
            qty: parseFloat(numMatch[4].replace(/,/g, '')) || 0
          });
        }
      }
    });
  });

  // Duplicate item codes hata dein (sirf aakhri wala rakhein)
  const map = {};
  rows.forEach(r => { map[r.code] = r; });
  
  return Object.values(map);
}

// ====================
// 3. CONFIRM IMPORT TO FIREBASE
// ====================
window.confirmImport = async function() {
  if (!window.importedRows.length) {
    showToast('Nothing to import', 'error');
    return;
  }

  const dest = document.getElementById('importDest').value;
  const btn = document.querySelector('#previewArea .primary');
  const originalText = btn.textContent;
  
  btn.textContent = 'Importing to Firebase...';
  btn.disabled = true;

  try {
    // Har row mein source add karein
    const itemsToSave = window.importedRows.map(row => ({
      ...row,
      source: `PDF (${dest})`,
      updatedAt: new Date().toISOString()
    }));

    // Firebase mein bulk save karein
    const savedCount = await window.bulkSaveToFirebase(itemsToSave);
    
    showToast(`Successfully imported ${savedCount} items!`, 'success');
    
    // UI reset karein
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('pdfStatus').textContent = `✓ Import complete: ${savedCount} rows saved.`;
    document.getElementById('pdfStatus').className = 'pdf-status success';
    document.getElementById('pdfFile').value = ''; // File input reset
    
    // Data refresh karein taake dashboard aur inventory update ho jaye
    await refreshInventoryData();

  } catch (err) {
    console.error(err);
    showToast('Import failed: ' + err.message, 'error');
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

console.log("✅ PDF-Import.js loaded");
