(() => {
  const $ = id => document.getElementById(id);
  const allowed = ['open', 'in-progress', 'resolved'];
  const labels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
  let findings = [];
  let busy = false;

  async function load() {
    try {
      const r = await fetch('/api/findings');
      if (!r.ok) return;
      findings = (await r.json()).findings || [];
      renderControls();
    } catch {}
  }

  function renderControls() {
    const root = $('findingsResult');
    if (!root) return;
    const cards = root.querySelectorAll('.finding-card');
    cards.forEach((card, index) => {
      if (card.querySelector('.finding-status')) return;
      const finding = findings[index];
      if (!finding?.id) return;

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

  const observer = new MutationObserver(() => renderControls());
  const start = () => {
    const root = $('findingsResult');
    if (root) observer.observe(root, { childList: true, subtree: true });
    load();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  setInterval(load, 10000);
})();
