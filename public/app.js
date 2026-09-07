(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const views = ['dashboard','ip','domain','email','hash','username','headers','findings','ai'];
  const names = {dashboard:'Dashboard',ip:'IP Intelligence',domain:'Domain Intelligence',email:'Email Breach',hash:'Hash Toolkit',username:'Username OSINT',headers:'Header Scanner',findings:'Findings',ai:'AI Assistant'};
  const aiContext = {};

  function showView(view) {
    if (!views.includes(view)) return;
    views.forEach(id => { const el=$(id); if(el) el.classList.toggle('active-view', id===view); });
    document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.view===view));
    const page=$('pageName'); if(page) page.textContent=names[view]||view;
    window.scrollTo({top:0,behavior:'smooth'});
    if(view==='dashboard' && typeof refreshDashboard==='function') refreshDashboard();
    if(view==='findings' && typeof loadFindings==='function') loadFindings();
  }
  window.showView = showView;
  window.web404Navigation = {showView};

  function bindNavigation(){
    document.querySelectorAll('.nav[data-view]').forEach(button => {
      button.onclick = function(e){ e.preventDefault(); e.stopPropagation(); showView(this.dataset.view); };
    });
    document.querySelectorAll('[data-open]').forEach(card => {
      card.onclick = function(e){ e.preventDefault(); e.stopPropagation(); showView(this.dataset.open); };
      card.style.cursor='pointer';
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showView(card.dataset.open)}});
    });
    const initial = document.querySelector('.nav.active[data-view]')?.dataset.view || 'dashboard';
    showView(initial);
  }

  async function post(path,body){
    const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    let d={}; try{d=await r.json()}catch{}
    if(!r.ok) throw Error(d.error||`Request failed (${r.status})`); return d;
  }
  function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}

  async function refreshDashboard(){try{const r=await fetch('/api/findings');const d=await r.json();aiContext.findings=d.findings||[];if($('findingCount'))$('findingCount').textContent=aiContext.findings.length;const n=aiContext.findings.filter(x=>['high','critical'].includes(x.severity)).length;if($('dashboardStatus'))$('dashboardStatus').textContent=n?'ATTENTION':'SESSION';if($('securityScore'))$('securityScore').textContent=n?'RISK':'—';if($('securityScoreLabel'))$('securityScoreLabel').textContent=n?`${n} high-risk finding${n===1?'':'s'} recorded`:'Run an assessment to calculate';}catch{}}

  async function lookupDomain(){const d=$('dnsResult');if(!d)return;d.className='result';d.innerHTML='<div class="empty">Collecting public DNS and certificate intelligence…</div>';try{const x=await post('/api/domain',{domain:$('domainInput')?.value||''});aiContext.domain=x;d.innerHTML=`<div class="result-grid"><div class="stat"><small>DOMAIN</small><b>${esc(x.domain)}</b></div><div class="stat"><small>DNSSEC</small><b>${x.dnssec?'Detected':'Not detected'}</b></div><div class="stat"><small>CERTIFICATES</small><b>${esc(x.certificateCount)}</b></div><div class="stat"><small>PUBLIC SUBDOMAINS</small><b>${esc(x.subdomains?.length||0)}</b></div></div><div class="record">${esc((x.subdomains||[]).join('\n')||'No certificate names found')}</div>`}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function makeHash(){const d=$('hashResult');if(!d)return;try{const x=await post('/api/hash',{input:$('hashInput')?.value||''});aiContext.hash=x;d.innerHTML=Object.entries(x.hashes||{}).map(([k,v])=>`<div class="hash-row"><label>${esc(k)}</label><code>${esc(v)}</code></div>`).join('')}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function lookupIP(){const d=$('ipResult'),v=$('ipInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter an IP address.</div>';return}d.className='result';d.innerHTML='<div class="empty">Inspecting public IP intelligence…</div>';try{const x=await post('/api/ip',{ip:v});aiContext.ip=x;d.innerHTML='<div class="result-grid">'+Object.entries(x).filter(([k])=>['ip','type','country','region','city','isp','organization','asn','timezone'].includes(k)).map(([k,v])=>`<div class="stat"><small>${esc(k)}</small><b>${esc(v??'—')}</b></div>`).join('')+'</div>'}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function checkEmail(){const d=$('emailResult'),v=$('emailInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter an email address.</div>';return}d.className='result';d.innerHTML='<div class="empty">Checking public breach metadata…</div>';try{const x=await post('/api/breach',{email:v});aiContext.email=x;d.innerHTML=x.breached?`<div class="score warn">${esc(x.breachCount)} BREACH${x.breachCount===1?'':'ES'}</div>`:'<div class="score good">NO KNOWN BREACHES</div>'}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  function usernameScan(){const d=$('userResult'),v=$('userInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter a username.</div>';return}const q=encodeURIComponent(v);d.className='result';d.innerHTML=`<div class="record">Search map for: ${esc(v)}</div><div class="link-grid"><a target="_blank" rel="noreferrer" href="https://github.com/${q}">GitHub profile →</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q=%22${q}%22">Web search →</a></div>`}
  async function scanHeaders(){const d=$('headerResult'),v=$('urlInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter a URL.</div>';return}d.className='result';d.innerHTML='<div class="empty">Scanning HTTP security headers…</div>';try{const x=await post('/api/headers',{url:v});aiContext.headers=x;d.innerHTML=`<div class="score ${x.score>=70?'good':'warn'}">${esc(x.score)}/100</div><div class="stat"><small>HTTP STATUS</small><b>${esc(x.status)}</b></div><div class="record">${esc((x.missing||[]).join('\n')||'None — good coverage')}</div>`}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function loadFindings(){const d=$('findingsResult');if(!d)return;try{const x=await fetch('/api/findings');const data=await x.json();aiContext.findings=data.findings||[];d.className='result';d.innerHTML=data.findings.length?data.findings.map(f=>`<article class="finding-card"><div class="finding-head"><span class="severity">${esc(f.severity)}</span><h3>${esc(f.title)}</h3></div><div class="finding-meta">${esc(f.source||'Unspecified')} · ${esc(f.confidence||'Not set')}</div>${f.evidence?`<p><b>Evidence:</b> ${esc(f.evidence)}</p>`:''}${f.remediation?`<p><b>Remediation:</b> ${esc(f.remediation)}</p>`:''}</article>`).join(''):'<div class="empty">No findings recorded in this session.</div>';refreshDashboard()}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function addFinding(){try{await post('/api/findings',{title:$('findingTitle').value,severity:$('findingSeverity').value,confidence:$('findingConfidence').value,source:$('findingSource').value,evidence:$('findingEvidence').value,remediation:$('findingRemediation').value});['findingTitle','findingConfidence','findingSource','findingEvidence','findingRemediation'].forEach(id=>{const el=$(id);if(el)el.value=''});loadFindings()}catch(e){$('findingsResult').innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function clearFindings(){if(!confirm('Clear all findings from this session?'))return;await fetch('/api/findings',{method:'DELETE'});loadFindings()}
  async function askAI(){const i=$('chatInput'),v=i?.value.trim();if(!v)return;const log=$('chatLog');log.insertAdjacentHTML('beforeend',`<div class="bubble user">${esc(v)}</div>`);i.value='';log.scrollTop=log.scrollHeight;try{const x=await post('/api/ai',{message:`User question:\n${v}\n\nWeb404 context:\n${JSON.stringify(aiContext)}`});log.insertAdjacentHTML('beforeend',`<div class="bubble bot"><b>Web404 AI</b><br>${esc(x.reply).replace(/\n/g,'<br>')}</div>`)}catch(e){log.insertAdjacentHTML('beforeend',`<div class="bubble bot"><b>Web404 AI</b><br>${esc(e.message)}</div>`)}log.scrollTop=log.scrollHeight}

  async function runAction(button,fn,label){
    if(!button||button.disabled)return;
    const original=button.innerHTML;
    button.disabled=true;
    button.setAttribute('aria-busy','true');
    button.innerHTML=`<span>${label||'Working'}…</span>`;
    try{return await fn();}
    finally{button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=original;}
  }

  function bindActions(){
    const map={
      ipButton:[lookupIP,'Inspecting'],dnsButton:[lookupDomain,'Inspecting'],hashButton:[makeHash,'Generating'],
      headersButton:[scanHeaders,'Scanning'],emailButton:[checkEmail,'Checking'],usernameButton:[usernameScan,'Building'],
      addFindingButton:[addFinding,'Saving'],clearFindingsButton:[clearFindings,'Clearing'],aiButton:[askAI,'Thinking']
    };
    Object.entries(map).forEach(([id,[fn,label]])=>{const b=$(id);if(b)b.onclick=e=>{e.preventDefault();runAction(b,fn,label).catch(console.error)}});
    $('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('aiButton')?.click()}});
    [['ipInput','ipButton'],['domainInput','dnsButton'],['emailInput','emailButton'],['userInput','usernameButton'],['urlInput','headersButton']].forEach(([input,button])=>{$(input)?.addEventListener('keydown',e=>{if(e.key==='Enter')$(button)?.click()})});
    $('hashInput')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('hashButton')?.click()});
  }

  function bindKeyboard(){
    document.addEventListener('keydown',e=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const tag=document.activeElement?.tagName;
      if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;
      const n=Number(e.key);
      if(n>=1&&n<=9){e.preventDefault();showView(views[n-1]);}
      if(e.key==='Escape')showView('dashboard');
    });
  }

  function init(){bindNavigation();bindActions();bindKeyboard();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
