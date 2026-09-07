(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const views = ['dashboard','ip','domain','email','hash','username','headers','findings','ai'];
  const names = {dashboard:'Dashboard',ip:'IP Intelligence',domain:'Domain Intelligence',email:'Email Breach',hash:'Hash Toolkit',username:'Username OSINT',headers:'Header Scanner',findings:'Findings',ai:'AI Assistant'};
  const aiContext = {};

  function showView(view, save=true) {
    if (!views.includes(view)) return;
    views.forEach(id => { const el=$(id); if(el) el.classList.toggle('active-view', id===view); });
    document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.view===view));
    const page=$('pageName'); if(page) page.textContent=names[view]||view;
    if(save) sessionStorage.setItem('web404:view',view);
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
      if(card.dataset.navBound)return;
      card.dataset.navBound='1';
      card.onclick = function(e){ e.preventDefault(); e.stopPropagation(); showView(this.dataset.open); };
      card.style.cursor='pointer';
      if(card.matches('.tool-card')){
        card.setAttribute('role','button');
        card.setAttribute('tabindex','0');
        card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showView(card.dataset.open)}});
      }
    });
    const saved=sessionStorage.getItem('web404:view');
    const initial = saved && views.includes(saved) ? saved : (document.querySelector('.nav.active[data-view]')?.dataset.view || 'dashboard');
    showView(initial,false);
  }

  async function post(path,body){
    const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    let d={}; try{d=await r.json()}catch{}
    if(!r.ok) throw Error(d.error||`Request failed (${r.status})`); return d;
  }
  function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function setResult(id,html,mode='result'){const d=$(id);if(d){d.className=mode;d.innerHTML=html}}
  function loading(text='Working'){return `<div class="empty"><span class="spinner"></span> ${esc(text)}…</div>`}

  async function refreshDashboard(){try{const r=await fetch('/api/findings');const d=await r.json();aiContext.findings=d.findings||[];const count=aiContext.findings.length;const n=aiContext.findings.filter(x=>['high','critical'].includes(x.severity)).length;if($('findingCount'))$('findingCount').textContent=count;if($('navFindingCount'))$('navFindingCount').textContent=count;if($('dashboardStatus'))$('dashboardStatus').textContent=n?'ATTENTION':count?'MONITORING':'SESSION';if($('securityScore'))$('securityScore').textContent=n?'RISK':count?'GOOD':'—';if($('securityScoreLabel'))$('securityScoreLabel').textContent=n?`${n} high-risk finding${n===1?'':'s'} recorded`:count?'No high-risk findings recorded':'Run an assessment to calculate';if($('securityMeter'))$('securityMeter').style.width=n?'28%':count?'72%':'0%';if($('aiStatus'))$('aiStatus').textContent='READY'}catch{if($('aiStatus'))$('aiStatus').textContent='OFFLINE'}}

  async function lookupDomain(){const d=$('dnsResult');if(!d)return;setResult('dnsResult',loading('Collecting public DNS and certificate intelligence'));try{const x=await post('/api/domain',{domain:$('domainInput')?.value||''});aiContext.domain=x;d.innerHTML=`<div class="result-grid"><div class="stat"><small>DOMAIN</small><b>${esc(x.domain)}</b></div><div class="stat"><small>DNSSEC</small><b>${x.dnssec?'Detected':'Not detected'}</b></div><div class="stat"><small>CERTIFICATES</small><b>${esc(x.certificateCount)}</b></div><div class="stat"><small>PUBLIC SUBDOMAINS</small><b>${esc(x.subdomains?.length||0)}</b></div></div><div class="record">${esc((x.subdomains||[]).join('\n')||'No certificate names found')}</div>`}catch(e){setResult('dnsResult',`<div class="empty">${esc(e.message)}</div>`)} }
  async function makeHash(){const d=$('hashResult');if(!d)return;d.innerHTML=loading('Generating hashes');try{const x=await post('/api/hash',{input:$('hashInput')?.value||''});aiContext.hash=x;d.innerHTML=Object.entries(x.hashes||{}).map(([k,v])=>`<div class="hash-row"><label>${esc(k)}</label><code>${esc(v)}</code></div>`).join('')}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function lookupIP(){const d=$('ipResult'),v=$('ipInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter an IP address.</div>';return}setResult('ipResult',loading('Inspecting public IP intelligence'));try{const x=await post('/api/ip',{ip:v});aiContext.ip=x;d.innerHTML='<div class="result-grid">'+Object.entries(x).filter(([k])=>['ip','type','country','region','city','isp','organization','asn','timezone'].includes(k)).map(([k,v])=>`<div class="stat"><small>${esc(k)}</small><b>${esc(v??'—')}</b></div>`).join('')+'</div>'}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function checkEmail(){const d=$('emailResult'),v=$('emailInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter an email address.</div>';return}setResult('emailResult',loading('Checking public breach metadata'));try{const x=await post('/api/breach',{email:v});aiContext.email=x;d.innerHTML=x.breached?`<div class="score warn">${esc(x.breachCount)} BREACH${x.breachCount===1?'':'ES'}</div>`:'<div class="score good">NO KNOWN BREACHES</div>'}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  function usernameScan(){const d=$('userResult'),v=$('userInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter a username.</div>';return}const q=encodeURIComponent(v);d.className='result';d.innerHTML=`<div class="record">Search map for: ${esc(v)}</div><div class="link-grid"><a target="_blank" rel="noreferrer" href="https://github.com/${q}">GitHub profile →</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q=%22${q}%22">Web search →</a></div>`}
  async function scanHeaders(){const d=$('headerResult'),v=$('urlInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter a URL.</div>';return}setResult('headerResult',loading('Scanning HTTP security headers'));try{const x=await post('/api/headers',{url:v});aiContext.headers=x;d.innerHTML=`<div class="score ${x.score>=70?'good':'warn'}">${esc(x.score)}/100</div><div class="stat"><small>HTTP STATUS</small><b>${esc(x.status)}</b></div><div class="record">${esc((x.missing||[]).join('\n')||'None — good coverage')}</div>`}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function loadFindings(){const d=$('findingsResult');if(!d)return;try{const x=await fetch('/api/findings');const data=await x.json();aiContext.findings=data.findings||[];d.className='result';d.innerHTML=data.findings.length?data.findings.map(f=>`<article class="finding-card"><div class="finding-head"><span class="severity">${esc(f.severity)}</span><h3>${esc(f.title)}</h3></div><div class="finding-meta">${esc(f.source||'Unspecified')} · ${esc(f.confidence||'Not set')}</div>${f.evidence?`<p><b>Evidence:</b> ${esc(f.evidence)}</p>`:''}${f.remediation?`<p><b>Remediation:</b> ${esc(f.remediation)}</p>`:''}</article>`).join(''):'<div class="empty">No findings recorded in this session.</div>';refreshDashboard()}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function addFinding(){try{await post('/api/findings',{title:$('findingTitle').value,severity:$('findingSeverity').value,confidence:$('findingConfidence').value,source:$('findingSource').value,evidence:$('findingEvidence').value,remediation:$('findingRemediation').value});['findingTitle','findingConfidence','findingSource','findingEvidence','findingRemediation'].forEach(id=>{const el=$(id);if(el)el.value=''});loadFindings()}catch(e){$('findingsResult').innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function clearFindings(){if(!confirm('Clear all findings from this session?'))return;await fetch('/api/findings',{method:'DELETE'});loadFindings()}
  async function askAI(){const i=$('chatInput'),v=i?.value.trim();if(!v)return;const log=$('chatLog');log.insertAdjacentHTML('beforeend',`<div class="bubble user">${esc(v)}</div>`);i.value='';log.scrollTop=log.scrollHeight;try{const x=await post('/api/ai',{message:`User question:\n${v}\n\nWeb404 context:\n${JSON.stringify(aiContext)}`});log.insertAdjacentHTML('beforeend',`<div class="bubble bot"><b>Web404 AI</b><br>${esc(x.reply).replace(/\n/g,'<br>')}</div>`)}catch(e){log.insertAdjacentHTML('beforeend',`<div class="bubble bot"><b>Web404 AI</b><br>${esc(e.message)}</div>`)}log.scrollTop=log.scrollHeight}

  async function runAction(button,fn,label){if(!button||button.dataset.busy==='1')return;button.dataset.busy='1';button.disabled=true;button.setAttribute('aria-busy','true');const original=button.innerHTML;button.innerHTML=`<span class="spinner spinner-dark"></span> ${label}…`;try{return await fn()}finally{button.disabled=false;button.removeAttribute('aria-busy');button.dataset.busy='0';button.innerHTML=original}}
  function bindActions(){
    const map={ipButton:[lookupIP,'Inspecting'],dnsButton:[lookupDomain,'Inspecting'],hashButton:[makeHash,'Generating'],headersButton:[scanHeaders,'Scanning'],emailButton:[checkEmail,'Checking'],usernameButton:[usernameScan,'Building'],addFindingButton:[addFinding,'Saving'],clearFindingsButton:[clearFindings,'Clearing'],aiButton:[askAI,'Thinking']};
    Object.entries(map).forEach(([id,[fn,label]])=>{const b=$(id);if(b)b.onclick=e=>{e.preventDefault();runAction(b,fn,label).catch(console.error)}});
    $('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('aiButton')?.click()}});
    [['ipInput','ipButton'],['domainInput','dnsButton'],['emailInput','emailButton'],['userInput','usernameButton'],['urlInput','headersButton']].forEach(([input,button])=>{$(input)?.addEventListener('keydown',e=>{if(e.key==='Enter')$(button)?.click()})});
    $('hashInput')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('hashButton')?.click()});
  }

  function commandPalette(){
    if($('w4Palette')){$('w4PaletteInput')?.focus();return}
    const wrap=document.createElement('div');wrap.id='w4Palette';wrap.innerHTML=`<div id="w4PaletteBox"><div id="w4PaletteHead"><b>WEB404 COMMAND</b><kbd>ESC</kbd></div><input id="w4PaletteInput" placeholder="Jump to a module…" autocomplete="off"><div id="w4PaletteList"></div><small>Use ↑ ↓ to navigate · Enter to open</small></div>`;
    const style=document.createElement('style');style.textContent=`#w4Palette{position:fixed;inset:0;background:#0009;backdrop-filter:blur(8px);z-index:9999;display:grid;place-items:start center;padding-top:13vh}#w4PaletteBox{width:min(620px,calc(100vw - 32px));background:#0d1219;border:1px solid #303b49;border-radius:12px;box-shadow:0 30px 100px #000b;overflow:hidden}#w4PaletteHead{height:46px;padding:0 15px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #202936;color:#a3ff12;font:700 9px 'JetBrains Mono'}#w4PaletteHead kbd{color:#667285;margin:0}#w4PaletteInput{border:0;border-radius:0;border-bottom:1px solid #202936;background:#080c11;padding:17px 16px;font:500 13px 'JetBrains Mono'}#w4PaletteInput:focus{box-shadow:none;border-color:#3b4655}#w4PaletteList{max-height:390px;overflow:auto;padding:8px}.w4cmd{display:flex;align-items:center;gap:12px;width:100%;padding:12px;border:1px solid transparent;background:transparent;color:#aab4c1;text-align:left;border-radius:7px;cursor:pointer}.w4cmd:hover,.w4cmd.selected{background:#151b24;border-color:#2b3544;color:#f3f6fa}.w4cmd i{width:30px;height:30px;display:grid;place-items:center;border:1px solid #293442;color:#a3ff12;font-style:normal}.w4cmd small{display:block;color:#687588;margin-top:3px}#w4PaletteBox>small{display:block;padding:10px 15px;color:#566274;border-top:1px solid #202936;font:9px 'JetBrains Mono'}`;document.head.appendChild(style);document.body.appendChild(wrap);
    const input=$('w4PaletteInput'),list=$('w4PaletteList');let selected=0;
    function render(){const q=input.value.trim().toLowerCase();const items=views.filter(v=>names[v].toLowerCase().includes(q));list.innerHTML=items.map((v,i)=>`<button class="w4cmd ${i===selected?'selected':''}" data-view="${v}"><i>${i+1}</i><div><b>${names[v]}</b><small>Open ${names[v]}</small></div></button>`).join('');list.querySelectorAll('.w4cmd').forEach(b=>b.onclick=()=>{showView(b.dataset.view);close()});selected=Math.min(selected,Math.max(0,items.length-1))}
    function close(){wrap.remove();document.removeEventListener('keydown',keys)}
    function keys(e){const items=[...list.querySelectorAll('.w4cmd')];if(e.key==='Escape'){e.preventDefault();close()}else if(e.key==='ArrowDown'){e.preventDefault();selected=Math.min(selected+1,items.length-1);render()}else if(e.key==='ArrowUp'){e.preventDefault();selected=Math.max(selected-1,0);render()}else if(e.key==='Enter'){e.preventDefault();items[selected]?.click()}}
    input.addEventListener('input',()=>{selected=0;render()});document.addEventListener('keydown',keys);wrap.addEventListener('click',e=>{if(e.target===wrap)close()});render();input.focus();
  }
  function bindKeyboard(){document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();commandPalette()}return}const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;const n=Number(e.key);if(n>=1&&n<=9){e.preventDefault();showView(views[n-1])}if(e.key==='Escape')showView('dashboard')})}
  function init(){bindNavigation();bindActions();bindKeyboard();refreshDashboard()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
