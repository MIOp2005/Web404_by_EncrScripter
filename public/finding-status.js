(() => {
  const $ = id => document.getElementById(id);
  const allowed = ['open', 'in-progress', 'resolved'];
  const labels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
  let findings = [];
  let busy = false;
  let filter = 'all';

  async function load() {
    try {
      const r = await fetch('/api/findings');
      if (!r.ok) return;
      findings = (await r.json()).findings || [];
      renderSummary();
      renderControls();
      renderRiskBreakdown();
    } catch {}
  }

  function renderSummary() {
    const root = $('findingsResult');
    if (!root) return;
    let bar = $('findingLifecycleBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'findingLifecycleBar';
      bar.className = 'finding-lifecycle-bar';
      root.parentNode.insertBefore(bar, root);
    }
    const active = findings.filter(f => f.status !== 'resolved').length;
    const resolved = findings.filter(f => f.status === 'resolved').length;
    const high = findings.filter(f => ['high','critical'].includes(f.severity) && f.status !== 'resolved').length;
    bar.replaceChildren();
    [['ALL', findings.length, 'all'], ['ACTIVE', active, 'active'], ['RESOLVED', resolved, 'resolved'], ['HIGH / CRITICAL', high, 'high']].forEach(([name, count, value]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `finding-filter ${filter === value ? 'active' : ''}`;
      button.innerHTML = `<span>${name}</span><b>${count}</b>`;
      button.addEventListener('click', () => { filter = value; renderSummary(); renderControls(); });
      bar.appendChild(button);
    });
  }

  function visibleFinding(f) {
    if (filter === 'active') return f.status !== 'resolved';
    if (filter === 'resolved') return f.status === 'resolved';
    if (filter === 'high') return ['high','critical'].includes(f.severity) && f.status !== 'resolved';
    return true;
  }

  function renderControls() {
    const root = $('findingsResult');
    if (!root) return;
    [...root.querySelectorAll('.finding-card')].forEach((card, index) => {
      const finding = findings[index];
      if (!finding?.id) return;
      card.hidden = !visibleFinding(finding);
      if (card.querySelector('.finding-status')) return;
      const actions = card.querySelector('.finding-actions') || card;
      const wrap = document.createElement('label');
      wrap.className = 'finding-status-wrap'; wrap.textContent = 'Status';
      const select = document.createElement('select'); select.className = 'finding-status';
      allowed.forEach(value => { const option = document.createElement('option'); option.value = value; option.textContent = labels[value]; option.selected = (finding.status || 'open') === value; select.appendChild(option); });
      select.dataset.findingId = finding.id;
      select.addEventListener('change', () => updateStatus(select));
      wrap.appendChild(select); actions.prepend(wrap);
    });
  }

  async function updateStatus(select) {
    const id = select.dataset.findingId, status = select.value;
    if (!id || !allowed.includes(status) || busy) return;
    busy = true; select.disabled = true;
    try {
      const r = await fetch(`/api/findings/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error('status update failed');
      await load();
      if (window.web404Risk?.refreshRisk) await window.web404Risk.refreshRisk();
      document.dispatchEvent(new CustomEvent('web404:findings-updated'));
    } catch { await load(); } finally { busy = false; select.disabled = false; }
  }

  async function renderRiskBreakdown() {
    if (!findings.length) return;
    try {
      const r = await fetch('/api/risk', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ findings, observations: {} }) });
      if (!r.ok) return;
      const risk = await r.json();
      const dashboard = $('dashboard'); if (!dashboard) return;
      let panel = $('riskBreakdownPanel');
      if (!panel) { panel = document.createElement('div'); panel.id = 'riskBreakdownPanel'; panel.className = 'risk-breakdown-panel'; const overview = dashboard.querySelector('.overview-grid'); if (overview) overview.parentNode.insertBefore(panel, overview.nextSibling); }
      panel.replaceChildren();
      const title = document.createElement('div'); title.className = 'risk-breakdown-title';
      title.innerHTML = `<div><b>Risk Breakdown</b><span>Finding lifecycle impact</span></div><strong>${risk.score}/100 · ${risk.rating}</strong>`; panel.appendChild(title);
      const breakdown = risk.breakdown || {};
      [['Findings', breakdown.findings || 0], ['Headers', breakdown.header || 0], ['Email', breakdown.email || 0], ['DNSSEC', breakdown.dnssec || 0]].forEach(([name, value]) => {
        const row = document.createElement('div'); row.className = 'risk-row'; row.innerHTML = `<span>${name}</span><i><em style="width:${Math.min(100, Math.max(0, Number(value) * 2))}%"></em></i><b>${value}</b>`; panel.appendChild(row);
      });
    } catch {}
  }

  const style = document.createElement('style');
  style.textContent = `.finding-lifecycle-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0 10px}.finding-filter{border:1px solid var(--line);background:#10141b;color:#8993a5;padding:12px;text-align:left;cursor:pointer;font:9px 'JetBrains Mono';display:flex;justify-content:space-between}.finding-filter b{color:#eef2f7}.finding-filter.active{border-color:#8cff00;color:#eef2f7}.finding-filter.active b{color:#8cff00}.risk-breakdown-panel,.dashboard-investigation{margin-top:16px;border:1px solid var(--line);background:#0c1016;padding:20px}.risk-breakdown-title,.dashboard-investigation-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}.risk-breakdown-title div,.dashboard-investigation-head div{display:flex;flex-direction:column;gap:4px}.risk-breakdown-title span,.dashboard-investigation-head span,.dashboard-pulse-card span,.dashboard-recent-title span{color:#667083;font-size:10px}.risk-breakdown-title strong{font:700 12px 'JetBrains Mono';color:#8cff00}.risk-row{display:grid;grid-template-columns:85px 1fr 45px;gap:10px;align-items:center;margin:9px 0;font:10px 'JetBrains Mono';color:#8d97a7}.risk-row i{height:5px;background:#1b212c;display:block}.risk-row em{display:block;height:100%;background:#8cff00}.dashboard-pulse-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.dashboard-pulse-card{border:1px solid var(--line);background:#10141b;padding:15px}.dashboard-pulse-card small{display:block;color:#667083;font:9px 'JetBrains Mono';margin-bottom:8px}.dashboard-pulse-card strong{display:block;font-size:24px}.dashboard-recent{margin-top:16px}.dashboard-recent-title{display:flex;justify-content:space-between;margin-bottom:8px;font-size:12px}.dashboard-finding-row{display:flex;align-items:center;gap:10px;border-top:1px solid var(--line);padding:12px 0}.dashboard-finding-row div{display:flex;flex-direction:column;gap:3px}.dashboard-finding-row b{font-size:11px}.dashboard-finding-row span:last-child{color:#667083;font:9px 'JetBrains Mono'}.dashboard-empty{border:1px dashed #252d3a;padding:20px;color:#626d7e;font-size:11px}@media(max-width:800px){.finding-lifecycle-bar{grid-template-columns:repeat(2,1fr)}.dashboard-pulse-grid{grid-template-columns:repeat(2,1fr)}}`;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => renderControls());
  const start = () => { const root = $('findingsResult'); if (root) observer.observe(root, { childList: true, subtree: true }); load(); };
  document.addEventListener('web404:findings-updated', load);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  setInterval(load, 10000);

  const dashboardScript = document.createElement('script');
  dashboardScript.src = '/dashboard-v2.js';
  document.body.appendChild(dashboardScript);
})();