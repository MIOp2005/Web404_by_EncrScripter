(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const views = ['dashboard','ip','domain','email','hash','username','headers','findings','ai'];
  const names = {
    dashboard:'Dashboard', ip:'IP Intelligence', domain:'Domain Intelligence', email:'Email Breach',
    hash:'Hash Toolkit', username:'Username OSINT', headers:'Header Scanner', findings:'Findings', ai:'AI Assistant'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  }

  function showView(view) {
    if (!views.includes(view)) return;
    views.forEach((id) => $(id)?.classList.toggle('active-view', id === view));
    document.querySelectorAll('.nav').forEach((button) => button.classList.toggle('active', button.dataset.view === view));
    const pageName = $('pageName');
    if (pageName) pageName.textContent = names[view];
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'dashboard' && typeof window.refreshDashboard === 'function') window.refreshDashboard();
    if (view === 'findings' && typeof window.loadFindings === 'function') window.loadFindings();
  }

  async function post(path, body) {
    const response = await fetch(path, {
      method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body)
    });
    let data = {};
    try { data = await response.json(); } catch {}
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  }

  async function fallbackIP() {
    const output = $('ipResult'); const value = $('ipInput')?.value.trim();
    if (!value) { output.innerHTML = '<div class="empty">Enter an IP address.</div>'; return; }
    output.className = 'result'; output.innerHTML = '<div class="empty">Querying IP intelligence…</div>';
    try {
      const x = await post('/api/ip', {ip:value});
      const rows = [['IP ADDRESS',x.ip],['TYPE',x.type],['CONTINENT',x.continent],['COUNTRY',x.country],['REGION',x.region],['CITY',x.city],['ISP',x.isp],['ORGANIZATION',x.organization],['ASN',x.asn],['TIMEZONE',x.timezone]];
      output.innerHTML = '<div class="result-grid">' + rows.map(([k,v]) => `<div class="stat"><small>${k}</small><b>${escapeHtml(v || '—')}</b></div>`).join('') + '</div>';
    } catch (e) { output.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`; }
  }

  async function fallbackDomain() {
    const output = $('dnsResult'); output.className='result'; output.innerHTML='<div class="empty">Collecting public DNS and certificate intelligence…</div>';
    try {
      const x = await post('/api/domain', {domain:$('domainInput')?.value || ''});
      const keys=['A','AAAA','MX','NS','TXT'];
      output.innerHTML = `<div class="result-grid"><div class="stat"><small>DOMAIN</small><b>${escapeHtml(x.domain)}</b></div><div class="stat"><small>DNSSEC</small><b>${x.dnssec?'Detected':'Not detected'}</b></div><div class="stat"><small>CERTIFICATES</small><b>${escapeHtml(x.certificateCount)}</b></div><div class="stat"><small>SUBDOMAINS</small><b>${escapeHtml(x.subdomains?.length || 0)}</b></div>${keys.map(k=>`<div class="stat"><small>${k}</small><b>${escapeHtml((x[k]||[]).join('\n') || '—')}</b></div>`).join('')}</div><div class="record">${escapeHtml((x.subdomains||[]).join('\n') || 'No certificate names found')}</div>`;
    } catch (e) { output.innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`; }
  }

  async function fallbackHash() {
    const output=$('hashResult'); output.innerHTML='<div class="empty">Generating…</div>';
    try { const x=await post('/api/hash',{input:$('hashInput')?.value || ''}); output.innerHTML=Object.entries(x.hashes||{}).map(([k,v])=>`<div class="hash-row"><label>${escapeHtml(k)}</label><code>${escapeHtml(v)}</code></div>`).join(''); }
    catch(e){output.innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`;}
  }

  async function fallbackHeaders() {
    const output=$('headerResult'); output.className='result'; output.innerHTML='<div class="empty">Fetching response headers…</div>';
    try { const x=await post('/api/headers',{url:$('urlInput')?.value || ''}); output.innerHTML=`<div class="score ${x.score>=70?'good':'warn'}">${escapeHtml(x.score)}/100</div><div class="stat"><small>HTTP STATUS</small><b>${escapeHtml(x.status)}</b></div><h3>Missing security headers</h3><div class="record">${escapeHtml((x.missing||[]).join('\n')||'None — good coverage')}</div>`; }
    catch(e){output.innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`;}
  }

  async function fallbackEmail() {
    const output=$('emailResult'); output.className='result'; output.innerHTML='<div class="empty">Checking breach exposure…</div>';
    try { const x=await post('/api/breach',{email:$('emailInput')?.value.trim() || ''}); if(!x.breached){output.innerHTML='<div class="score good">NO KNOWN BREACHES</div><div class="record">No matching public breaches were returned.</div>';return;} output.innerHTML=`<div class="score warn">${escapeHtml(x.breachCount)} BREACH${x.breachCount===1?'':'ES'}</div><div class="result-grid">${(x.breaches||[]).map(b=>`<div class="stat"><small>${escapeHtml(b.title||b.name)}</small><b>${escapeHtml(b.breachDate||'Unknown')}<br>${escapeHtml((b.dataClasses||[]).join(', ')||'Not listed')}</b></div>`).join('')}</div>`; }
    catch(e){output.innerHTML=`<div class="empty">${escapeHtml(e.message)}</div>`;}
  }

  function fallbackUsername() {
    const output=$('userResult'), value=$('userInput')?.value.trim(); if(!value){output.innerHTML='<div class="empty">Enter a username.</div>';return;}
    const q=encodeURIComponent(value); output.className='result'; output.innerHTML=`<div class="record">Search map for: ${escapeHtml(value)}</div><div class="link-grid"><a target="_blank" rel="noreferrer" href="https://github.com/${q}">GitHub profile →</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q=%22${q}%22">Web search →</a><a target="_blank" rel="noreferrer" href="https://www.reddit.com/user/${q}">Reddit profile →</a><a target="_blank" rel="noreferrer" href="https://x.com/${q}">X profile →</a></div>`;
  }

  function bind() {
    document.querySelectorAll('.nav').forEach((button) => {
      button.addEventListener('click', (event) => { event.preventDefault(); showView(button.dataset.view); });
    });
    document.querySelectorAll('[data-open]').forEach((card) => card.addEventListener('click', () => showView(card.dataset.open)));

    const bindings = [
      ['ipButton','lookupIP',fallbackIP], ['dnsButton','lookupDomain',fallbackDomain], ['hashButton','makeHash',fallbackHash],
      ['headersButton','scanHeaders',fallbackHeaders], ['emailButton','checkEmail',fallbackEmail], ['usernameButton','usernameScan',fallbackUsername],
      ['addFindingButton','addFinding',null], ['clearFindingsButton','clearFindings',null], ['aiButton','askAI',null]
    ];
    bindings.forEach(([id, fn, fallback]) => {
      const button=$(id); if(!button) return;
      button.addEventListener('click', () => {
        const handler = typeof window[fn] === 'function' ? window[fn] : fallback;
        if (handler) Promise.resolve(handler()).catch((e)=>console.error(`Web404 ${fn} failed`,e));
      });
    });
    $('chatInput')?.addEventListener('keydown',(event)=>{ if(event.key==='Enter' && !event.shiftKey){event.preventDefault();$('aiButton')?.click();} });
    showView(document.querySelector('.nav.active')?.dataset.view || 'dashboard');
  }

  window.web404Navigation = {showView};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, {once:true}); else bind();
})();
