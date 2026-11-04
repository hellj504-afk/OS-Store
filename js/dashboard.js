window.updateDashboardStats = function() {
  if (!window.inventoryData) return;
  const data = window.inventoryData;

  // Unique codes
  const uniqueCodes = new Set(data.map(i => i.code));
  document.getElementById('statItems').textContent = uniqueCodes.size;

  const totalQty = data.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  document.getElementById('statQty').textContent = formatNumber(totalQty);

  const pdfImports = data.filter(item => item.source && item.source.includes('PDF')).length;
  document.getElementById('statImports').textContent = pdfImports;

  document.getElementById('statUpdated').textContent = data.length > 0 ? formatDate(new Date()).split(' ')[0] : '—';
};

window.renderDashboardTable = function() {
  const tbody = document.getElementById('dashTable');
  if (!tbody) return;

  const query = document.getElementById('dashSearch')?.value.toLowerCase() || '';
  const filtered = window.inventoryData.filter(item => !query || item.code.toLowerCase().includes(query) || (item.desc || '').toLowerCase().includes(query));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="5" class="empty">Loading from Firebase...</td></tr>`;
  if (filtered.length === 0) return tbody.innerHTML = `<tr><td colspan="5" class="empty">No items found.</td></tr>`;

  const recent = filtered.slice(0, 10);

  tbody.innerHTML = recent.map(item => `
    <tr>
      <td class="code">${item.code}</td>
      <td>${item.desc || '-'}</td>
      <td>${item.uom || 'NOS'}</td>
      <td>${formatNumber(item.qty)}</td>
      <td><span class="badge ${item.source?.includes('PDF') ? 'yes' : 'no'}">${item.source || 'Manual'}</span></td>
    </tr>
  `).join('');

  if (filtered.length > 10) {
    tbody.innerHTML += `<tr><td colspan="5" class="empty" style="font-size:10px; padding:10px">Showing 10 of ${filtered.length} items.</td></tr>`;
  }
};
