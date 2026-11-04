// ==========================================
// BOM.JS — Placeholder for BOM, Issue, IR, Failure
// ==========================================

window.renderBOM = function() {
  const tbody = document.getElementById('bomTable');
  if (!tbody) return;
  // Abhi khali table show hoga
  tbody.innerHTML = `<tr><td colspan="5" class="empty">BOM Data imported via PDF will show here.</td></tr>`;
};

window.renderIssue = function() {
  const tbody = document.getElementById('issueTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Issue Voucher data will show here.</td></tr>`;
};

window.renderIR = function() {
  const tbody = document.getElementById('irTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="empty">IR / Move Order data will show here.</td></tr>`;
};

window.renderFailure = function() {
  const tbody = document.getElementById('failureTable');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" class="empty">Failure Data will show here.</td></tr>`;
};
