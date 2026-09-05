(() => {
  const $ = id => document.getElementById(id);
  let findings = [];

  function loadCss() {
    if (document.querySelector('link[data-web404-ai-v2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = '/ai-v2.css'; link.dataset.web404AiV2 = '1';
    document.head.appendChild(link);
  }

  function getModules() {
    const checks = [
      ['IP', 'ipResult'], ['DOMAIN', 'domainResult'], ['EMAIL', 'emailResult'],
      ['HASH', 'hashResult'], ['USERNAME', 'usernameResult'], ['HEADERS', 'headersResult']
    ];
    return checks.filter(([, id]) => {
      const el = $(id);
      return el && el.textContent.trim() && !/enter|loading|no data|not run/i.test(el.textContent.trim());
    }).map(([name]) => name);
  }

  async function refresh() {
    try {
      const r = await fetch('/api/findings');
      if (r.ok) findings = (await r.json()).findings || [];
    } catch {}
    renderContext();
  }

  function renderContext() {
    const summary = $('aiContextSummary');
    const modules = $('aiContextModules');
    const active = findings.filter(f => f.status !== 'resolved');
    const critical = active.filter(f => f.severity === 'critical').length;
    const high = active.filter(f => f.severity === 'high').length;
    const score = $('securityScore')?.textContent?.trim();
    const rating = $('securityScoreLabel')?.textContent?.replace(/ investigation risk/i, '').trim();
    if (summary) summary.textContent = `${active.length} active · ${critical + high} high/critical · ${findings.length - active.length} resolved${score ? ` · Risk ${score}/100` : ''}`;
    if (modules) {
      modules.replaceChildren();
      const list = getModules();
      if (!list.length) {
        const empty = document.createElement('span'); empty.textContent = 'No tool results collected yet'; modules.appendChild(empty);
      } else list.forEach(name => { const chip = document.createElement('span'); chip.textContent = name; modules.appendChild(chip); });
      if (rating && rating !== 'INFO') {
        const chip = document.createElement('span'); chip.className = 'ai-risk-chip'; chip.textContent = rating; modules.appendChild(chip);
      }
    }
  }

  function prompt(text) {
    const input = $('chatInput');
    const button = $('aiButton');
    if (!input || !button) return;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
  }

  function init() {
    loadCss();
    const ai = $('ai');
    const chat = ai?.querySelector('.chat.panel');
    if (!chat || chat.querySelector('.ai-v2-context')) return;

    const panel = document.createElement('div');
    panel.className = 'ai-v2-context';
    panel.innerHTML = '<div class="ai-v2-head"><span class="ai-v2-badge">CONTEXT AWARE</span><b>Investigation context</b><span id="aiContextSummary">Loading…</span></div><div id="aiContextModules" class="ai-v2-modules"></div>';
    const log = chat.querySelector('.chat-log');
    if (log) chat.insertBefore(panel, log); else chat.prepend(panel);

    const actions = document.createElement('div');
    actions.className = 'ai-quick-actions';
    [['What matters most?', 'Review the current Web404 investigation context and tell me what matters most. Prioritize active findings by severity, confidence, and likely impact.'], ['Explain active findings', 'Explain the active Web404 findings in plain language, including why each matters and what evidence supports it. Do not invent evidence.'], ['What should I fix first?', 'Based on the current Web404 investigation context, give me a prioritized defensive remediation plan. Start with the highest-risk actionable item.'], ['Summarize investigation', 'Give me a concise defensive summary of the current Web404 investigation: scope of collected context, active findings, risk, key observations, and next validation steps.']].forEach(([label, text]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.dataset.prompt = text;
      b.addEventListener('click', () => prompt(text)); actions.appendChild(b);
    });
    const input = $('chatInput');
    if (input?.parentElement) input.parentElement.insertBefore(actions, input);
    refresh();
    document.addEventListener('web404:findings-updated', refresh);
    setInterval(refresh, 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
