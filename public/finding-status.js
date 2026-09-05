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

    const counts = [
      ['ALL', findings.length, 'all'],
      ['ACTIVE', active, 'active'],
      ['RESOLVED', resolved, 'resolved'],
      ['HIGH / CRITICAL', high, 'high']
    ];
    counts.forEach(([name, count, value]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `finding-filter ${filter === value ? 'active' : ''}`;
      button.dataset.filter = value;
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
    const cards = [...root.querySelectorAll('.finding-card')];
    cards.forEach((card, index) => {
      const finding = findings[index];
      if (!finding?.id) return;
      card.hidden = !visibleFinding(finding);
      if (card.querySelector('.finding-status')) return;

      const actions = card.querySelector('.finding-actions') || card;
      const wrap = document.createElement('label');
      wrap.className = 'finding-status-wrap';
      wrap.textContent = 'Status';
      const select = document.createElement('select');
      select.className = 'finding-status';
      select.setAttribute('aria-label', `Status for finding ${index + 1}`);
      allowed.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = labels[value];
        option.selected = (finding.status || 'open') === value;
        select.appendChild(option);
      });
      select.dataset.findingId = finding.id;
      select.addEventListener('change', () => updateStatus(select));
      wrap.appendChild(select);
      actions.prepend(wrap);
    });
  }

  async function updateStatus(select) {
    const id = select.dataset.findingId;
    const status = select.value;
    if (!id || !allowed.includes(status) || busy) return;
    busy = true;
    select.disabled = true;
    try {
      const r = await fetch(`/api/findings/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!r.ok) throw new Error('status update failed');
      await load();
      if (window.web404Risk?.refreshRisk) await window.web404Risk.refreshRisk();
      document.dispatchEvent(new CustomEvent('web404:findings-updated'));
    } catch {
      await load();
    } finally {
      busy = false;
      select.disabled = false;
    }
  }

  async function renderRiskBreakdown() {
    if (!findings.length) return;
    try {
      const r = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ findings, observations: {} })
      });
      if (!r.ok) return;
      const risk = await r.json();
      const dashboard = $('dashboard');
      if (!dashboard) return;
      let panel = $('riskBreakdownPanel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'riskBreakdownPanel';
        panel.className = 'risk-breakdown-panel';
        const overview = dashboard.querySelector('.overview-grid');
        if (overview) overview.parentNode.insertBefore(panel, overview.nextSibling);
      }
      panel.replaceChildren();
      const title = document.createElement('div');
      title.className = 'risk-breakdown-title';
      title.innerHTML = `<div><b>Risk Breakdown</b><span>Finding lifecycle impact</span></div><strong>${risk.score}/100 · ${risk.rating}</strong>`;
      panel.appendChild(title);
      const breakdown = risk.breakdown || {};
      [['Findings', breakdown.findings || 0], ['Headers', breakdown.header || 0], ['Email', breakdown.email || 0], ['DNSSEC', breakdown.dnssec || 0]].forEach(([name, value]) => {
        const row = document.createElement('div');
        row.className = 'risk-row';
        row.innerHTML = `<span>${name}</span><i><em style="width:${Math.min(100, Number(value) * 2)}%"></em></i><b>${value}</b>`;
        panel.appendChild(row);
      });
    } catch {}
  }

  const observer = new MutationObserver(() => renderControls());
  const start = () => {
    const root = $('findingsResult');
    if (root) observer.observe(root, { childList: true, subtree: true });
    load();
  };

  document.addEventListener('web404:findings-updated', load);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  setInterval(load, 10000);
})();