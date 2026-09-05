(() => {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function postFinding(finding) {
    try {
      const r = await fetch('/api/findings');
      if (!r.ok) return;
      const data = await r.json();
      const duplicate = (data.findings || []).some(x => x.title === finding.title && x.source === finding.source);
      if (duplicate) return;
      await fetch('/api/findings', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(finding) });
      if (typeof window.loadFindings === 'function') window.loadFindings();
    } catch {}
  }
  async function analyzeHeaders() {
    await wait(1200);
    const x = window.aiContext?.headers;
    if (!x || !Array.isArray(x.missing) || !x.missing.length) return;
    const severity = x.missing.length >= 4 ? 'high' : x.missing.length >= 2 ? 'medium' : 'low';
    await postFinding({
      title:`Missing web security headers on ${x.url}`,
      severity,
      confidence:'High',
      source:'Header Scanner',
      evidence:`HTTP ${x.status}; missing: ${x.missing.join(', ')}. Header coverage score: ${x.score}/100.`,
      remediation:`Review and configure the missing response headers: ${x.missing.join(', ')}. Test changes in staging before deployment.`
    });
  }
  async function analyzeDomain() {
    await wait(1200);
    const x = window.aiContext?.domain;
    if (!x || x.dnssec) return;
    await postFinding({
      title:`DNSSEC not detected for ${x.domain}`,
      severity:'low',
      confidence:'Medium',
      source:'Domain Intelligence',
      evidence:`Public DNS intelligence did not show a DNSSEC validation signal for ${x.domain}.`,
      remediation:'Review whether DNSSEC is appropriate for the domain and enable it through the authoritative DNS provider where supported.'
    });
  }
  async function analyzeEmail() {
    await wait(1200);
    const x = window.aiContext?.email;
    if (!x || !x.breached) return;
    await postFinding({
      title:`Public breach exposure detected for ${x.email}`,
      severity:(x.breachCount || 0) >= 3 ? 'high' : 'medium',
      confidence:'High',
      source:'Email Breach',
      evidence:`The configured breach provider returned ${x.breachCount} public breach record${x.breachCount === 1 ? '' : 's'} for the supplied address.`,
      remediation:'Review affected accounts, reset credentials through the official service, enable MFA, and investigate suspicious activity. Web404 does not display leaked passwords or secrets.'
    });
  }
  $('headersButton')?.addEventListener('click', analyzeHeaders);
  $('dnsButton')?.addEventListener('click', analyzeDomain);
  $('emailButton')?.addEventListener('click', analyzeEmail);
})();
