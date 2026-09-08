(()=>{
  const $=id=>document.getElementById(id);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const esc=s=>String(s||'').replace(/\s+/g,' ').trim();
  async function postFinding(f){
    try{
      const existing=await fetch('/api/findings');
      if(existing.ok){
        const data=await existing.json();
        if((data.findings||[]).some(x=>x.title===f.title&&x.source===f.source))return {ok:true,duplicate:true};
      }
      const r=await fetch('/api/findings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(f)});
      if(!r.ok)return {ok:false};
      return {ok:true,duplicate:false};
    }catch{return {ok:false}}
  }
  function severityFor(text){
    if(/high risk|malicious|critical|danger|suspicious|no match/i.test(text))return'high';
    if(/warning|not detected|missing|risk|privacy/i.test(text))return'low';
    return'medium';
  }
  function targetFor(source){
    const ids={
      'IP Intelligence':'ipInput',
      'Domain Intelligence':'domainInput',
      'URL Intelligence':'urlIntelInput',
      'Username OSINT':'usernameInput'
    };
    const input=$(ids[source]);
    return input?.value?.trim()||'';
  }
  function makeTitle(source,text){
    const target=targetFor(source);
    const first=esc(text.split(/\n+/).find(x=>x)&&text.split(/\n+/).find(x=>x))?.slice(0,90);
    return target?`${source}: ${target}`:`${source}: ${first||'Security observation'}`;
  }
  function goFindings(){
    if(typeof window.showView==='function')window.showView('findings');
    else document.querySelector('[data-view="findings"], [data-target="findings"]')?.click();
  }
  async function analyzeDomain(){
    await wait(1400);
    const r=$('dnsResult'),t=r?.textContent||'';
    if(!/DNSSEC\s+Not detected/i.test(t))return;
    const domain=$('domainInput')?.value.trim()||'target domain';
    await postFinding({title:`DNSSEC not detected for ${domain}`,severity:'low',confidence:'Medium',source:'Domain Intelligence',evidence:`Public DNS intelligence did not show a DNSSEC validation signal for ${domain}.`,remediation:'Review whether DNSSEC is appropriate for the domain and enable it through the authoritative DNS provider where supported.'});
  }
  async function analyzeMetadata(){
    await wait(600);
    const r=$('metadataResult'),i=$('metadataInput'),f=i?.files?.[0];
    if(!f||!r)return;
    const t=r.textContent||'',embedded=/Embedded metadata/i.test(t)&&!/No supported embedded EXIF fields detected/i.test(t);
    if(!embedded)return;
    await postFinding({title:`Embedded metadata detected in ${f.name}`,severity:'low',confidence:'High',source:'File Metadata Analyzer',evidence:'The selected local file contains supported embedded metadata fields that may disclose device, software or capture information.',remediation:'Before sharing the file publicly, review and remove unnecessary metadata using a trusted local metadata-cleaning workflow.'});
  }
  function loadUsername(){
    if(!document.querySelector('link[data-username-osint]')){const l=document.createElement('link');l.rel='stylesheet';l.href='/username-osint.css';l.dataset.usernameOsint='1';document.head.appendChild(l)}
    if(!document.querySelector('script[data-username-osint]')){const s=document.createElement('script');s.src='/username-osint.js';s.dataset.usernameOsint='1';document.body.appendChild(s)}
  }
  function addBridgeStyle(){
    if($('findingBridgeStyle'))return;
    const s=document.createElement('style');s.id='findingBridgeStyle';s.textContent='.finding-bridge{margin-top:10px}.finding-send{border:1px solid #b6ff00;background:#101722;color:#b6ff00;padding:9px 13px;font:600 12px JetBrains Mono,monospace;cursor:pointer}.finding-send:hover{background:#b6ff00;color:#071008}.finding-send.sent{border-color:#7fbd00;color:#b6ff00}.finding-send:disabled{opacity:.7;cursor:wait}';document.head.appendChild(s);
  }
  function addSendButton(el,source){
    if(!el||!el.id)return;
    const text=el.textContent.replace(/Send to Investigation Findings/g,'').trim();
    if(!text||/^(Enter|Choose|Select|Output will|Verification result|Hash output|AES-256-GCM output|No findings)/i.test(text))return;
    const parent=el.parentElement;if(!parent)return;
    let bridge=parent.querySelector(`.finding-bridge[data-for="${el.id}"]`);
    if(!bridge){bridge=document.createElement('div');bridge.className='finding-bridge';bridge.dataset.for=el.id;parent.insertBefore(bridge,el.nextSibling)}
    if(bridge.dataset.snapshot===text)return;
    bridge.dataset.snapshot=text;
    bridge.replaceChildren();
    const b=document.createElement('button');b.className='finding-send';b.type='button';b.textContent='Send to Investigation Findings →';
    b.onclick=async e=>{
      e.preventDefault();e.stopPropagation();
      b.disabled=true;b.textContent='Saving finding…';
      const result=await postFinding({title:makeTitle(source,text),severity:severityFor(text),confidence:'Medium',source,evidence:text.slice(0,4000),remediation:'Review this observation in Investigation Findings and apply the recommended defensive action.'});
      if(result.ok){b.textContent=result.duplicate?'✓ Already in Investigation Findings':'✓ Sent to Investigation Findings';b.classList.add('sent');setTimeout(goFindings,350)}
      else{b.disabled=false;b.textContent='Could not save — try again'}
    };
    bridge.appendChild(b);
  }
  function scan(){
    [['ipResult','IP Intelligence'],['dnsResult','Domain Intelligence'],['urlIntelResult','URL Intelligence'],['userResult','Username OSINT'],['metadataResult','File Metadata Analyzer'],['co','Hash & Cryptography']].forEach(([id,name])=>addSendButton($(id),name));
    document.querySelectorAll('#chatLog .bubble.bot').forEach(el=>{
      if(/I can analyze your current Web404 investigation context/i.test(el.textContent))return;
      addSendButton(el,'AI Cyber Assistant');
    });
  }
  let scheduled=false;
  function scheduleScan(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})}
  function startBridge(){addBridgeStyle();scan();new MutationObserver(scheduleScan).observe(document.body,{subtree:true,childList:true})}
  $('dnsButton')?.addEventListener('click',analyzeDomain);
  $('metadataButton')?.addEventListener('click',analyzeMetadata);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{loadUsername();startBridge()});
  else{loadUsername();startBridge()}
  window.web404SendFinding=async({source='Web404 Module',title,evidence,severity='medium',confidence='Medium',remediation='Review this observation in Investigation Findings and apply the recommended defensive action.'}={})=>postFinding({title:title||`${source} observation`,severity,confidence,source,evidence:String(evidence||'').slice(0,4000),remediation});
})();