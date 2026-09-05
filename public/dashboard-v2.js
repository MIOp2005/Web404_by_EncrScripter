(() => {
  const $ = id => document.getElementById(id);
  let lastFindings = [];

  function render(findings) {
    const dashboard = $('dashboard');
    const overview = dashboard?.querySelector('.overview-grid');
    if (!dashboard || !overview) return;

    let panel = $('dashboardInvestigation');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'dashboardInvestigation';
      panel.className = 'dashboard-investigation';
      overview.parentNode.insertBefore(panel, overview.nextSibling);
    }

    const active = findings.filter(f => f.status !== 'resolved');
    const resolved = findings.filter(f => f.status === 'resolved');
    const critical = active.filter(f => f.severity === 'critical').length;
    const high = active.filter(f => f.severity === 'high').length;
    const medium = active.filter(f => f.severity === 'medium').length;

    panel.replaceChildren();
    const head = document.createElement('div');
    head.className = 'dashboard-investigation-head';
    head.innerHTML = '<div><b>Investigation Pulse</b><span>Current browser-session findings</span></div><span class="tag">LIVE</span>';
    panel.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'dashboard-pulse-grid';
    [
      ['ACTIVE', active.length, active.length ? 'Review open work' : 'No active findings'],
      ['CRITICAL', critical, critical ? 'Immediate attention' : 'None active'],
      ['HIGH', high, high ? 'Prioritize remediation' : 'None active'],
      ['MEDIUM', medium, medium ? 'Review when practical' : 'None active'],
      ['RESOLVED', resolved.length, resolved.length ? 'Closed in session' : 'Nothing resolved']
    ].forEach(([label, value, note]) => {
      const card = document.createElement('div');
      card.className = 'dashboard-pulse-card';
      const small = document.createElement('small'); small.textContent = label;
      const strong = document.createElement('strong'); strong.textContent = value;
      const span = document.createElement('span'); span.textContent = note;
      card.append(small, strong, span); grid.appendChild(card);
    });
    panel.appendChild(grid);

    const recent = document.createElement('div');
    recent.className = 'dashboard-recent';
    const title = document.createElement('div');
    title.className = 'dashboard-recent-title';
    title.innerHTML = '<b>Recent findings</b><span>Newest observations first</span>';
    recent.appendChild(title);
    if (!findings.length) {
      const empty = document.createElement('div'); empty.className = 'dashboard-empty'; empty.textContent = 'Run a module or add a finding to start the investigation.'; recent.appendChild(empty);
    } else {
      findings.slice(0, 5).forEach(f => {
        const row = document.createElement('div'); row.className = 'dashboard-finding-row';
        const severity = document.createElement('span'); severity.className = 'severity'; severity.textContent = f.severity;
        const text = document.createElement('div');
        const title = document.createElement('b'); title.textContent = f.title || 'Untitled finding';
        const meta = document.createElement('span'); meta.textContent = `${f.source || 'Unspecified source'} · ${f.status || 'open'}`;
        text.append(title, meta); row.append(severity, text); recent.appendChild(row);
      });
    }
    panel.appendChild(recent);
  }

  async function load() {
    try {
      const r = await fetch('/api/findings');
      if (!r.ok) return;
      lastFindings = (await r.json()).findings || [];
      render(lastFindings);
    } catch {}
  }

  document.addEventListener('web404:findings-updated', load);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();