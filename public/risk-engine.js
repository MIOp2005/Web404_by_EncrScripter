(() => {
  const $ = id => document.getElementById(id);

  async function context() {
    let findings = [];
    try {
      const r = await fetch('/api/findings');
      if (r.ok) findings = (await r.json()).findings || [];
    } catch {}

    const headerResult = $('headerResult');
    const headerScoreNode = headerResult?.querySelector('.score');
    const headerScore = headerScoreNode ? Number.parseInt(headerScoreNode.textContent, 10) : NaN;
    const emailText = $('emailResult')?.textContent || '';
    const domainText = $('dnsResult')?.textContent || '';

    return {
      findings,
      observations: {
        headers: Number.isFinite(headerScore) ? { score: headerScore } : null,
        email: emailText.includes('BREACH') ? { breached: true } : emailText.includes('NO KNOWN BREACHES') ? { breached: false } : null,
        domain: domainText.includes('DNSSEC') ? { dnssec: /DNSSEC\s+Not detected/i.test(domainText) } : null
      }
    };
  }

  async function calculateRisk() {
    try {
      const payload = await context();
      const r = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }

  function renderDashboard(risk) {
    if (!risk) return;
    const score = $('securityScore');
    const label = $('securityScoreLabel');
    const status = $('dashboardStatus');
    if (!score || !label) return;
    score.textContent = `${risk.score}`;
    score.className = risk.score >= 40 ? 'warn' : 'good';
    label.textContent = `${risk.rating} investigation risk`;
    if (status) status.textContent = risk.score >= 60 ? 'ATTENTION' : risk.score >= 40 ? 'REVIEW' : 'ASSESSED';
  }

  async function refreshRisk() {
    const risk = await calculateRisk();
    renderDashboard(risk);
    return risk;
  }

  async function patchReport() {
    const sheet = $('reportSheet');
    if (!sheet) return;
    const risk = await refreshRisk();
    if (!risk) return;
    let report;
    try { report = JSON.parse(sheet.dataset.report || '{}'); } catch { report = {}; }
    report.riskScore = risk.score;
    report.riskRating = risk.rating;
    report.riskBreakdown = risk.breakdown;
    report.riskRecommendations = risk.recommendations;
    sheet.dataset.report = JSON.stringify(report);
    const riskNode = $('reportRisk');
    if (riskNode) riskNode.textContent = `Risk rating: ${risk.rating} · ${risk.score}/100`;
  }

  window.web404Risk = { calculateRisk, refreshRisk, patchReport };
  document.addEventListener('click', event => {
    if (event.target?.id === 'generateReportButton') setTimeout(patchReport, 500);
  });
  refreshRisk();
  setInterval(refreshRisk, 10000);
})();
