(()=>{
  const modules={
    ipResult:'IP Intelligence',
    dnsResult:'Domain Intelligence',
    urlIntelResult:'URL Intelligence',
    userResult:'Username OSINT',
    metadataResult:'File Metadata Analyzer',
    co:'Hash & Cryptography'
  };
  const inputs={
    'IP Intelligence':'ipInput',
    'Domain Intelligence':'domainInput',
    'URL Intelligence':'urlIntelInput',
    'Username OSINT':'userInput'
  };
  const sourceOf=result=>modules[result?.id]||'Web404 Module';
  const targetOf=source=>source==='File Metadata Analyzer'
    ? document.getElementById('metadataInput')?.files?.[0]?.name||''
    : document.getElementById(inputs[source])?.value?.trim()||'';
  const evidenceOf=result=>{
    const clone=result.cloneNode(true);
    clone.querySelectorAll('button,a,input,select,textarea').forEach(el=>el.remove());
    return (clone.innerText||clone.textContent||'').replace(/\\u00a0/g,' ').trim().slice(0,4000);
  };
  const severityOf=text=>/\\bcritical\\b|\\bmalicious\\b|\\bdangerous\\b/i.test(text)?'critical':/\\bhigh\\b|\\bsuspicious\\b|\\bmalware\\b|\\bphishing\\b|\\bunsafe\\b/i.test(text)?'high':/\\bmedium\\b|\\bmoderate risk\\b/i.test(text)?'medium':/\\blow\\b|\\bwarning\\b|\\bmissing\\b|\\bprivacy\\b/i.test(text)?'low':'info';
  const save=async finding=>{
    const response=await fetch('/api/findings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(finding)});
    return response.ok;
  };
  const send=async button=>{
    const result=button.closest('.finding-bridge')?.previousElementSibling;
    if(!result)return;
    const source=sourceOf(result);
    const evidence=evidenceOf(result);
    if(!evidence)return;
    const target=targetOf(source);
    const title=source+' : '+(target||evidence.split(/\\r?\\n/).find(Boolean)||'Security observation').slice(0,120);
    button.disabled=true;
    const original=button.textContent;
    button.textContent='Saving finding…';
    try{
      const ok=await save({title,severity:severityOf(evidence),confidence:'Medium',source,evidence,remediation:'Review this observation in Investigation Findings and apply the recommended defensive action.'});
      button.textContent=ok?'✓ Sent to Investigation Findings':'Could not save — try again';
      if(ok){button.classList.add('sent');setTimeout(()=>window.showView?.('findings'),350)}else button.disabled=false;
    }catch{
      button.disabled=false;
      button.textContent=original;
    }
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.finding-send');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    send(button);
  },true);
})();
