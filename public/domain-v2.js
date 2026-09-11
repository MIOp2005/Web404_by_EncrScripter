(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list = v => Array.isArray(v) ? v : [];
  const records = (title, values, empty='No records found') => `<div class="domain-section"><h3>${title}</h3><div class="domain-records">${values.length ? values.map(v => `<div class="domain-record"><b>VALUE</b><span>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</span></div>`).join('') : `<div class="domain-muted">${empty}</div>`}</div></div>`;
  async function inspect() {
    const input=$('domainInput'), out=$('dnsResult'), value=input?.value.trim();
    if(!out) return;
    if(!value){out.innerHTML='<div class="empty">Enter a domain name.</div>';return;}
    out.className='result'; out.innerHTML='<div class="empty"><span class="spinner"></span> Collecting DNS, DNSSEC and Certificate Transparency intelligence…</div>';
    try {
      const r=await fetch('/api/domain',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({domain:value})});
      const x=await r.json(); if(!r.ok) throw Error(x.error||'Domain lookup failed.');
      window.web404DomainIntel = { analyzed: true, domain: x.domain, dnssec: x.dnssec === true };
      document.dispatchEvent(new CustomEvent('web404:domain-updated'));
      const A=list(x.A), AAAA=list(x.AAAA), MX=list(x.MX), NS=list(x.NS), TXT=list(x.TXT), subs=list(x.subdomains);
      const mx=MX.map(v=>typeof v==='object' ? `${v.priority ?? ''} ${v.exchange ?? ''}`.trim() : v);
      const certs=Number(x.certificateCount||0); const totalDns=A.length+AAAA.length+MX.length+NS.length+TXT.length;
      out.innerHTML=`<div class="domain-intel"><div class="domain-summary"><div class="domain-kpi"><small>DOMAIN</small><strong>${esc(x.domain)}</strong></div><div class="domain-kpi"><small>DNS RECORDS</small><strong>${totalDns}</strong></div><div class="domain-kpi"><small>CERT NAMES</small><strong>${certs}</strong></div><div class="domain-kpi"><small>SUBDOMAINS</small><strong>${subs.length}</strong></div></div><div class="domain-section"><h3>Security signals</h3><div class="domain-badges"><span class="domain-badge ${x.dnssec?'good':'warn'}">DNSSEC: ${x.dnssec?'DETECTED':'NOT DETECTED'}</span><span class="domain-badge">PUBLIC DNS: AVAILABLE</span><span class="domain-badge">CT: ${certs?'OBSERVED':'NO NAMES RETURNED'}</span></div></div>${records('A Records',A,'No IPv4 addresses returned.')}${records('AAAA Records',AAAA,'No IPv6 addresses returned.')}${records('MX Records',mx,'No mail-exchange records returned.')}${records('NS Records',NS,'No authoritative name servers returned.')}${records('TXT Records',TXT,'No TXT records returned.')}<div class="domain-section"><h3>Certificate Transparency names</h3>${subs.length?`<ul class="domain-list">${subs.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:'<div class="domain-muted">No certificate names were returned for this domain.</div>'}</div><div class="domain-section"><h3>Intelligence notes</h3><div class="domain-muted">DNS records are live public lookups. Certificate names come from Certificate Transparency. DNSSEC status is a public resolver signal and should be independently validated before treating it as authoritative.</div></div></div>`;
    } catch(e){out.innerHTML=`<div class="empty">${esc(e.message)}</div>`;}
  }
  document.addEventListener('DOMContentLoaded',()=>{const b=$('dnsButton');if(!b)return;b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();inspect();},true);const input=$('domainInput');input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inspect();}});});
})();