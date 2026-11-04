window.renderSlowMoving = function() {
  const tbody = document.getElementById('slowTable');
  if (!tbody) return;
  
  // Yahan hum sirf slow_moving source wala data filter kar rahe hain
  let data = window.inventoryData.filter(item => item.source && item.source.includes('slow_moving'));
  
  const query = document.getElementById('slowSearch')?.value.toLowerCase() || '';
  data = data.filter(item => !query || item.code.toLowerCase().includes(query) || (item.desc||'').toLowerCase().includes(query));
  data.sort((a, b) => a.code.localeCompare(b.code));

  if (!window.isDataLoaded) return tbody.innerHTML = `<tr><td colspan="6" class="empty">Loading...</td></tr>`;
  if (!data.length) return tbody.innerHTML = `<tr><td colspan="6" class="empty">No slow moving items imported yet.</td></tr>`;

  tbody.innerHTML = data.map(i => {
    const value = (Number(i.qty)||0) * (Number(i.cost)||0);
    return `
      <tr>
        <td class="code">${i.code}</td><td>${i.desc}</td><td>${i.uom}</td>
        <td style="font-weight:bold;">${formatNumber(i.qty)}</td>
        <td>Rs. ${formatNumber(i.cost)}</td>
        <td style="font-weight:bold; color:#19835a;">Rs. ${formatNumber(value)}</td>
      </tr>
    `;
  }).join('');
};
