(() => {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function context() {
    const source = window.aiContext || {};
    return {
      findings: Array.isArray(source.findings) ? source.findings : [],
      observations: {
        headers: source.headers || null,
        email: source.email || null,
        domain: source.domain ? {
          domain: source.domain.domain,
          dnssec: source.domain.dnssec
        } : null
      }
    };
  }

  async function calculateRisk() {
    try {
      const r = await fetch('/api/risk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(context())
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
    if (!score || !label || !status) return;
    score.textContent = `${risk.score}`;
    score.className = risk.score >= 60 ? 'warn' : risk.score >= 40 ? 'warn' : 'good';
    label.textContent = `${risk.rating} investigation risk`;
    status.textContent = risk.score >= 60 ? 'ATTENTION' : risk.score >= 40 ? 'REVIEW' : 'ASSESSED';
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

  document.addEventListener('click', async event => {
    if (event.target?.id === 'generateReportButton') {
      await wait(300);
      await patchReport();
    }
  });

  setTimeout(refreshRisk, 500);
  setInterval(refreshRisk, 5000);
})();
