(()=>{
  const $=id=>document.getElementById(id);
  const modules={ipResult:'IP Intelligence',dnsResult:'Domain Intelligence',urlIntelResult:'URL Intelligence',userResult:'Username OSINT',metadataResult:'File Metadata Analyzer',co:'Hash & Cryptography'};
  const inputIds={
    'IP Intelligence':'ipInput',
    'Domain Intelligence':'domainInput',
    'URL Intelligence':'urlIntelInput',
    'Username OSINT':'userInput',
    'File Metadata Analyzer':'metadataInput'
  };
  const sourceFor=el=>modules[el?.id]||'Web404 Module';
  const valueFor=source=>{
    if(source==='File Metadata Analyzer')return $('metadataInput')?.files?.[0]?.name||'';
    return $(inputIds[source])?.value?.trim()||'';
  };
  const clean=el=>{
    const clone=el.cloneNode(true);
    clone.querySelectorAll('button,a,input,select').forEach(n=>n.remove());
    clone.querySelectorAll('textarea').forEach(n=>n.replaceWith(document.createTextNode(n.value||'')));
    const lines=[];
    const walker=document.createTreeWalker(clone,NodeFilter.SHOW_TEXT);
    let node;
    while(node=walker.nextNode()){
      const text=(node.nodeValue||'').replace(/\u00a0/g,' ').trim();
      if(text)lines.push(text);
    }
    return [...new Set(lines)].join('\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,4000);
  };
  const severityFor=text=>/\bcritical\b|\bmalicious\b|\bdangerous\b/i.test(text)?'critical':/\bhigh\b|\bsuspicious\b|\bmalware\b|\bphishing\b|\bunsafe\b/i.test(text)?'high':/\bmedium\b|\bmoderate risk\b/i.test(text)?'medium':/\blow\b|\bwarning\b|\bmissing\b|\bprivacy\b/i.test(text)?'low':'info';
  const post=async finding=>{
    const existing=await fetch('/api/findings');
    if(existing.ok){const data=await existing.json();if((data.findings||[]).some(x=>x.title===finding.title&&x.source===finding.source))return true;}
    const r=await fetch('/api/findings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(finding)});
    return r.ok;
  };
  const send=async button=>{
    const bridge=button.closest('.finding-bridge');
    const result=bridge?.previousElementSibling;
    if(!result)return;
    const source=sourceFor(result);
    const evidence=clean(result);
    if(!evidence)return;
    const target=valueFor(source);
    const first=evidence.split('\n').find(Boolean)||'Security observation';
    const title=`${source} : ${target||first.slice(0,90)}`;
    button.disabled=true;button.textContent='Saving finding…';
    try{
      const ok=await post({title,severity:severityFor(evidence),confidence:'Medium',source,evidence,remediation:'Review this observation in Investigation Findings and apply the recommended defensive action.'});
      button.textContent=ok?'✓ Sent to Investigation Findings':'Could not save — try again';
      if(ok){button.classList.add('sent');setTimeout(()=>window.showView?.('findings'),350)}else button.disabled=false;
    }catch{button.disabled=false;button.textContent='Could not save — try again'}
  };
  const intercept=event=>{
    const button=event.target.closest?.('.finding-send');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();send(button);
  };
  document.addEventListener('click',intercept,true);
})();
