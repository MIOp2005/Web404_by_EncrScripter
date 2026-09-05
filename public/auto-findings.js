(() => {
  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  const riskScript = document.createElement('script');
  riskScript.src = '/risk-engine.js';
  riskScript.defer = true;
  document.body.appendChild(riskScript);

  async function postFinding(finding) {
    try {
      const r = await fetch('/api/findings');
      if (!r.ok) return;
      const data = await r.json();
      const duplicate = (data.findings || []).some(x => x.title === finding.title && x.source === finding.source);
      if (duplicate) return;
      await fetch('/api/findings', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(finding) });
    } catch {}
  }
  async function analyzeHeaders() {
    await wait(1400);
    const result = $('headerResult');
    const text = result?.textContent || '';
    const match = text.match(/Missing security headers\s+([\s\S]*?)(?:Sources:|$)/i);
    const missing = match ? match[1].trim().split(/\n+/).map(x=>x.trim()).filter(Boolean) : [];
    if (!missing.length || missing[0].startsWith('None')) return;
    const score = result.querySelector('.score')?.textContent?.trim() || 'unknown';
    const status = result.querySelector('.stat b')?.textContent?.trim() || 'unknown';
    const url = $('urlInput')?.value.trim() || 'target';
    const severity = missing.length >= 4 ? 'high' : missing.length >= 2 ? 'medium' : 'low';
    await postFinding({title:`Missing web security headers on ${url}`,severity,confidence:'High',source:'Header Scanner',evidence:`HTTP ${status}; missing: ${missing.join(', ')}. Header coverage score: ${score}.`,remediation:`Review and configure the missing response headers: ${missing.join(', ')}. Test changes in staging before deployment.`});
  }
  async function analyzeDomain() {
    await wait(1400);
    const result = $('dnsResult');
    const text = result?.textContent || '';
    if (!/DNSSEC\s+Not detected/i.test(text)) return;
    const domain = $('domainInput')?.value.trim() || 'target domain';
    await postFinding({title:`DNSSEC not detected for ${domain}`,severity:'low',confidence:'Medium',source:'Domain Intelligence',evidence:`Public DNS intelligence did not show a DNSSEC validation signal for ${domain}.`,remediation:'Review whether DNSSEC is appropriate for the domain and enable it through the authoritative DNS provider where supported.'});
  }
  async function analyzeEmail() {
    await wait(1400);
    const result = $('emailResult');
    const text = result?.textContent || '';
    const match = text.match(/(\d+) BREACH/i);
    if (!match) return;
    const count = Number(match[1]);
    const email = $('emailInput')?.value.trim() || 'supplied address';
    await postFinding({title:`Public breach exposure detected for ${email}`,severity:count>=3?'high':'medium',confidence:'High',source:'Email Breach',evidence:`The configured breach provider returned ${count} public breach record${count===1?'':'s'} for the supplied address.`,remediation:'Review affected accounts, reset credentials through the official service, enable MFA, and investigate suspicious activity. Web404 does not display leaked passwords or secrets.'});
  }
  $('headersButton')?.addEventListener('click', analyzeHeaders);
  $('dnsButton')?.addEventListener('click', analyzeDomain);
  $('emailButton')?.addEventListener('click', analyzeEmail);
})();
