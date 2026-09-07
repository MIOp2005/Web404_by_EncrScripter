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
    } catch {}
  }

  async function analyzeDomain() {
    await wait(1400);
    const result = $('dnsResult');
    const text = result?.textContent || '';
    if (!/DNSSEC\s+Not detected/i.test(text)) return;
    const domain = $('domainInput')?.value.trim() || 'target domain';
    await postFinding({title:`DNSSEC not detected for ${domain}`,severity:'low',confidence:'Medium',source:'Domain Intelligence',evidence:`Public DNS intelligence did not show a DNSSEC validation signal for ${domain}.`,remediation:'Review whether DNSSEC is appropriate for the domain and enable it through the authoritative DNS provider where supported.'});
  }

  async function analyzeMetadata() {
    await wait(600);
    const result = $('metadataResult');
    const input = $('metadataInput');
    const file = input?.files?.[0];
    if (!file || !result) return;
    const text = result.textContent || '';
    const embedded = /Embedded metadata/i.test(text) && !/No supported embedded EXIF fields detected/i.test(text);
    if (!embedded) return;
    await postFinding({title:`Embedded metadata detected in ${file.name}`,severity:'low',confidence:'High',source:'File Metadata Analyzer',evidence:'The selected local file contains supported embedded metadata fields that may disclose device, software or capture information.',remediation:'Before sharing the file publicly, review and remove unnecessary metadata using a trusted local metadata-cleaning workflow.'});
  }

  $('dnsButton')?.addEventListener('click', analyzeDomain);
  $('metadataButton')?.addEventListener('click', analyzeMetadata);
})();
