(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const views = ['dashboard','ip','domain','url','hash','username','metadata','findings','ai'];
  const names = {dashboard:'Dashboard',ip:'IP Intelligence',domain:'Domain Intelligence',url:'URL Intelligence',hash:'Hash Toolkit',username:'Username OSINT',metadata:'File Metadata Analyzer',findings:'Findings',ai:'AI Assistant'};
  const aiContext = {};

  function showView(view, save=true) {
    if (!views.includes(view)) return;
    views.forEach(id => { const el=$(id); if(el) el.classList.toggle('active-view', id===view); });
    document.querySelectorAll('.nav').forEach(b => b.classList.toggle('active', b.dataset.view===view));
    const page=$('pageName'); if(page) page.textContent=names[view]||view;
    if(save) sessionStorage.setItem('web404:view',view);
    window.scrollTo({top:0,behavior:'smooth'});
    if(view==='dashboard') refreshDashboard();
    if(view==='findings') loadFindings();
  }
  window.showView=showView;
  window.web404Navigation={showView};

  function esc(s){return String(s??'').replace(/[&<>\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c]))}
  function loading(text='Working'){return `<div class="empty"><span class="spinner"></span> ${esc(text)}…</div>`}
  function setResult(id,html,mode='result'){const d=$(id);if(d){d.className=mode;d.innerHTML=html}}
  async function post(path,body){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||`Request failed (${r.status})`);return d}

  function installURLModule(){
    const emailNav=document.querySelector('.nav[data-view="email"]'); if(emailNav) emailNav.remove();
    const emailSection=$('email'); if(emailSection) emailSection.remove();
    const oldCard=document.querySelector('.tool-card[data-open="email"]');
    if(oldCard){oldCard.dataset.open='url';oldCard.innerHTML='<span class="tool-icon orange">↗</span><div><h3>URL Intelligence</h3><p>Inspect URL structure, hostname intelligence and HTTP security signals.</p></div><span class="arrow">↗</span>';}
    const headerNav=document.querySelector('.nav[data-view="headers"]'); if(headerNav) headerNav.remove();
    const headerSection=$('headers'); if(headerSection) headerSection.remove();
    const headerCard=document.querySelector('.tool-card[data-open="headers"]');
    if(headerCard){headerCard.dataset.open='metadata';headerCard.innerHTML='<span class="tool-icon cyan">▧</span><div><h3>File Metadata Analyzer</h3><p>Inspect file properties, hashes and embedded metadata locally.</p></div><span class="arrow">↗</span>';}
  }

  function bindNavigation(){
    installURLModule();
    document.querySelectorAll('.nav[data-view]').forEach(b=>b.onclick=e=>{e.preventDefault();showView(b.dataset.view)});
    document.querySelectorAll('[data-open]').forEach(card=>{card.onclick=e=>{e.preventDefault();showView(card.dataset.open)};card.style.cursor='pointer';if(card.matches('.tool-card')){card.setAttribute('role','button');card.setAttribute('tabindex','0');card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showView(card.dataset.open)}})}});
    const saved=sessionStorage.getItem('web404:view');showView(saved&&views.includes(saved)?saved:'dashboard',false);
  }

  async function refreshDashboard(){try{const r=await fetch('/api/findings');const d=await r.json();aiContext.findings=d.findings||[];const count=aiContext.findings.length;const high=aiContext.findings.filter(x=>['high','critical'].includes(x.severity)).length;if($('findingCount'))$('findingCount').textContent=count;if($('navFindingCount'))$('navFindingCount').textContent=count;if($('dashboardStatus'))$('dashboardStatus').textContent=high?'ATTENTION':count?'MONITORING':'SESSION';if($('securityScore'))$('securityScore').textContent=high?'RISK':count?'GOOD':'—';if($('securityScoreLabel'))$('securityScoreLabel').textContent=high?`${high} high-risk finding${high===1?'':'s'} recorded`:count?'No high-risk findings recorded':'Run an assessment to calculate';if($('aiStatus'))$('aiStatus').textContent='READY'}catch{if($('aiStatus'))$('aiStatus').textContent='OFFLINE'}}

  async function lookupIP(){const d=$('ipResult'),v=$('ipInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter an IP address.</div>';return}setResult('ipResult',loading('Inspecting public IP intelligence'));try{const x=await post('/api/ip',{ip:v});aiContext.ip=x;d.innerHTML='<div class="result-grid">'+Object.entries(x).filter(([k])=>['ip','type','country','region','city','isp','organization','asn','timezone'].includes(k)).map(([k,val])=>`<div class="stat"><small>${esc(k)}</small><b>${esc(val??'—')}</b></div>`).join('')+'</div>'}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function lookupDomain(){const d=$('dnsResult');if(!d)return;setResult('dnsResult',loading('Collecting public DNS and certificate intelligence'));try{const x=await post('/api/domain',{domain:$('domainInput')?.value||''});aiContext.domain=x;d.innerHTML=`<div class="result-grid"><div class="stat"><small>DOMAIN</small><b>${esc(x.domain)}</b></div><div class="stat"><small>DNSSEC</small><b>${x.dnssec?'Detected':'Not detected'}</b></div><div class="stat"><small>CERTIFICATES</small><b>${esc(x.certificateCount)}</b></div><div class="stat"><small>PUBLIC SUBDOMAINS</small><b>${esc(x.subdomains?.length||0)}</b></div></div><div class="record">${esc((x.subdomains||[]).join('\n')||'No certificate names found')}</div>`}catch(e){setResult('dnsResult',`<div class="empty">${esc(e.message)}</div>`)} }
  async function lookupURL(){const d=$('urlIntelResult'),v=$('urlIntelInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter a URL.</div>';return}setResult('urlIntelResult',loading('Analyzing URL intelligence'));try{let target;try{target=new URL(/^https?:\/\//i.test(v)?v:`https://${v}`)}catch{throw Error('Enter a valid HTTP(S) URL.')}if(!['http:','https:'].includes(target.protocol))throw Error('Only HTTP(S) URLs are supported.');const host=target.hostname;const domain=await post('/api/domain',{domain:host});let headers=null;try{headers=await post('/api/headers',{url:target.href})}catch(e){headers={error:e.message}}const params=[...target.searchParams.keys()];const sensitiveParams=params.filter(k=>/(token|key|secret|password|passwd|auth|session|code)/i.test(k));aiContext.url={url:target.href,protocol:target.protocol.replace(':','').toUpperCase(),hostname:host,port:target.port||((target.protocol==='https:')?'443':'80'),path:target.pathname||'/',query:target.search,parameters:params,domain,headers};d.innerHTML=`<div class="result-grid"><div class="stat"><small>PROTOCOL</small><b>${esc(target.protocol.replace(':','').toUpperCase())}</b></div><div class="stat"><small>HOSTNAME</small><b>${esc(host)}</b></div><div class="stat"><small>PORT</small><b>${esc(target.port||((target.protocol==='https:')?'443':'80'))}</b></div><div class="stat"><small>PATH</small><b>${esc(target.pathname||'/')}</b></div><div class="stat"><small>QUERY PARAMS</small><b>${esc(params.length)}</b></div><div class="stat"><small>DNSSEC</small><b>${domain.dnssec?'Detected':'Not detected'}</b></div><div class="stat"><small>SUBDOMAINS</small><b>${esc(domain.subdomains?.length||0)}</b></div><div class="stat"><small>HTTP SCORE</small><b>${headers?.score!=null?esc(headers.score)+'/100':'Unavailable'}</b></div></div>${sensitiveParams.length?`<div class="record"><b>Review sensitive-looking query keys:</b> ${esc(sensitiveParams.join(', '))}</div>`:''}<div class="record"><b>Resolved URL</b><br>${esc(target.href)}</div>`}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function makeHash(){const d=$('hashResult');if(!d)return;d.innerHTML=loading('Generating hashes');try{const x=await post('/api/hash',{input:$('hashInput')?.value||''});aiContext.hash=x;d.innerHTML=Object.entries(x.hashes||{}).map(([k,v])=>`<div class="hash-row"><label>${esc(k)}</label><code>${esc(v)}</code></div>`).join('')}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  function usernameScan(){const d=$('userResult'),v=$('userInput')?.value.trim();if(!d)return;if(!v){d.innerHTML='<div class="empty">Enter a username.</div>';return}const q=encodeURIComponent(v);d.className='result';d.innerHTML=`<div class="record">Search map for: ${esc(v)}</div><div class="link-grid"><a target="_blank" rel="noreferrer" href="https://github.com/${q}">GitHub profile →</a><a target="_blank" rel="noreferrer" href="https://www.google.com/search?q=%22${q}%22">Web search →</a></div>`}

  function readU16(view,offset,little){return view.getUint16(offset,little)}
  function readU32(view,offset,little){return view.getUint32(offset,little)}
  function readAscii(view,offset,length){let out='';for(let i=0;i<length;i++){const c=view.getUint8(offset+i);if(!c)break;out+=String.fromCharCode(c)}return out.trim()}
  function parseJpegExif(buffer){
    const view=new DataView(buffer); if(view.byteLength<4||view.getUint16(0)!==0xFFD8)return {};
    let p=2;
    while(p+4<=view.byteLength){
      if(view.getUint8(p)!==0xFF){p++;continue}
      const marker=view.getUint8(p+1); p+=2;
      if(marker===0xDA||marker===0xD9)break;
      if(p+2>view.byteLength)break;
      const len=view.getUint16(p); if(len<2||p+len>view.byteLength)break;
      if(marker===0xE1 && len>=10 && readAscii(view,p+2,6)==='Exif'){
        const t=p+8; const little=readU16(view,t, false)===0x4949; if(readU16(view,t,little)!==0x4949&&readU16(view,t,little)!==0x4D4D) return {};
        if(readU16(view,t+2,little)!==42)return {};
        const ifd0=t+readU32(view,t+4,little); const meta={};
        const parseIfd=(base,allowGps=false)=>{
          if(base<0||base+2>view.byteLength)return null; const count=readU16(view,base,little);
          for(let i=0;i<count;i++){const q=base+2+i*12;if(q+12>view.byteLength)break;const tag=readU16(view,q,little),type=readU16(view,q+2,little),n=readU32(view,q+4,little),size=({1:1,2:1,3:2,4:4,5:8,7:1,9:4,10:8}[type]||0)*n;let off=size<=4?q+8:t+readU32(view,q+8,little);
            if(off<0||off+Math.min(size,view.byteLength-off)>view.byteLength)continue;
            if(tag===0x010F||tag===0x0110||tag===0x0131||tag===0x0132||tag===0x9003){meta[{0x010F:'Make',0x0110:'Model',0x0131:'Software',0x0132:'Date/Time',0x9003:'Date Taken'}[tag]]=type===2?readAscii(view,off,n):String(readU32(view,off,little));}
            if(tag===0x8825&&allowGps)meta.GPS='Embedded GPS metadata detected';
          }
          return meta;
        };
        Object.assign(meta,parseIfd(ifd0,true)||{}); return meta;
      }
      p+=len;
    }
    return {};
  }
  async function analyzeMetadata(){
    const input=$('metadataInput'),d=$('metadataResult'),file=input?.files?.[0];if(!d)return;
    if(!file){d.innerHTML='<div class="empty">Choose a file first.</div>';return}
    setResult('metadataResult',loading('Analyzing file locally'));
    try{
      const buffer=await file.arrayBuffer();
      const hash=await crypto.subtle.digest('SHA-256',buffer);
      const sha=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
      const ext=(file.name.match(/\.([^.]+)$/)?.[1]||'none').toUpperCase();
      const modified=new Date(file.lastModified).toLocaleString();
      let width=null,height=null,embedded={};
      if(file.type.startsWith('image/')){
        try{const blob=URL.createObjectURL(file);const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=blob});width=img.naturalWidth;height=img.naturalHeight;URL.revokeObjectURL(blob)}catch{}
      }
      if(file.type==='image/jpeg'||file.type==='image/jpg'||/\.jpe?g$/i.test(file.name))embedded=parseJpegExif(buffer);
      const metadata={name:file.name,type:file.type||'Unknown',extension:ext,size:file.size,lastModified:file.lastModified,modified,width,height,embeddedMetadata:embedded,sha256:sha};
      aiContext.metadata=metadata;
      const rows=[['FILE NAME',file.name],['MIME TYPE',file.type||'Unknown'],['EXTENSION',ext],['SIZE',`${file.size.toLocaleString()} bytes (${(file.size/1024).toFixed(1)} KB)`],['LAST MODIFIED',modified],['SHA-256',sha]];
      if(width&&height)rows.push(['DIMENSIONS',`${width} × ${height} px`]);
      d.className='result';d.innerHTML=`<div class="result-grid">${rows.map(([k,v])=>`<div class="stat"><small>${esc(k)}</small><b>${esc(v)}</b></div>`).join('')}</div><div class="record"><b>Embedded metadata</b><br>${Object.keys(embedded).length?Object.entries(embedded).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join('<br>'):'No supported embedded EXIF fields detected.'}</div><div class="record"><b>Privacy note</b><br>Analysis was performed locally in your browser. The selected file was not uploaded by this module.</div>`;
    }catch(e){d.innerHTML=`<div class="empty">${esc(e.message||'Could not analyze this file.')}</div>`}
  }

  async function loadFindings(){const d=$('findingsResult');if(!d)return;try{const r=await fetch('/api/findings');const data=await r.json();aiContext.findings=data.findings||[];d.className='result';d.innerHTML=data.findings.length?data.findings.map(f=>`<article class="finding-card"><div class="finding-head"><span class="severity">${esc(f.severity)}</span><h3>${esc(f.title)}</h3></div><div class="finding-meta">${esc(f.source||'Unspecified')} · ${esc(f.confidence||'Not set')}</div>${f.evidence?`<p><b>Evidence:</b> ${esc(f.evidence)}</p>`:''}${f.remediation?`<p><b>Remediation:</b> ${esc(f.remediation)}</p>`:''}</article>`).join(''):'<div class="empty">No findings recorded in this session.</div>';refreshDashboard()}catch(e){d.innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function addFinding(){try{await post('/api/findings',{title:$('findingTitle').value,severity:$('findingSeverity').value,confidence:$('findingConfidence').value,source:$('findingSource').value,evidence:$('findingEvidence').value,remediation:$('findingRemediation').value});['findingTitle','findingConfidence','findingSource','findingEvidence','findingRemediation'].forEach(id=>{const el=$(id);if(el)el.value=''});loadFindings()}catch(e){$('findingsResult').innerHTML=`<div class="empty">${esc(e.message)}</div>`}}
  async function clearFindings(){if(!confirm('Clear all findings from this session?'))return;await fetch('/api/findings',{method:'DELETE'});loadFindings()}
  async function askAI(){const i=$('chatInput'),v=i?.value.trim();if(!v)return;const log=$('chatLog');log.insertAdjacentHTML('beforeend',`<div class="bubble user">${esc(v)}</div>`);i.value='';log.scrollTop=log.scrollHeight;try{const x=await post('/api/ai',{message:`User question:\n${v}\n\nWeb404 context:\n${JSON.stringify(aiContext)}`});log.insertAdjacentHTML('beforeend',`<div class="bubble bot"><b>Web404 AI</b><br>${esc(x.reply).replace(/\n/g,'<br>')}</div>`)}catch(e){log.insertAdjacentHTML('beforeend',`<div class="bubble bot"><b>Web404 AI</b><br>${esc(e.message)}</div>`)}log.scrollTop=log.scrollHeight}
  async function runAction(button,fn,label){if(!button||button.dataset.busy==='1')return;button.dataset.busy='1';button.disabled=true;const original=button.innerHTML;button.innerHTML=`<span class="spinner spinner-dark"></span> ${label}…`;try{return await fn()}finally{button.disabled=false;button.dataset.busy='0';button.innerHTML=original}}
  function bindActions(){const map={ipButton:[lookupIP,'Inspecting'],dnsButton:[lookupDomain,'Inspecting'],urlIntelButton:[lookupURL,'Inspecting'],hashButton:[makeHash,'Generating'],metadataButton:[analyzeMetadata,'Analyzing'],usernameButton:[usernameScan,'Building'],addFindingButton:[addFinding,'Saving'],clearFindingsButton:[clearFindings,'Clearing'],aiButton:[askAI,'Thinking']};Object.entries(map).forEach(([id,[fn,label]])=>{const b=$(id);if(b)b.onclick=e=>{e.preventDefault();runAction(b,fn,label).catch(console.error)}});$('chatInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('aiButton')?.click()}});[['ipInput','ipButton'],['domainInput','dnsButton'],['urlIntelInput','urlIntelButton'],['userInput','usernameButton']].forEach(([i,b])=>$(i)?.addEventListener('keydown',e=>{if(e.key==='Enter')$(b)?.click()}));$('hashInput')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')$('hashButton')?.click()})}
  function bindKeyboard(){document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey)return;const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;const n=Number(e.key);if(n>=1&&n<=9)showView(views[n-1]);if(e.key==='Escape')showView('dashboard')})}
  function init(){bindNavigation();bindActions();bindKeyboard();refreshDashboard()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
