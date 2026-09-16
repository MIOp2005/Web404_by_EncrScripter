(()=>{
  const formatEvidence=paragraph=>{
    if(!paragraph||paragraph.dataset.evidenceFormatted==='1')return;
    const raw=paragraph.textContent.replace(/^Evidence\s*:?\s*/i,'').replace(/<br\s*\/?>/gi,'\n').trim();
    if(!raw)return;
    const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);
    const rows=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      const match=line.match(/^([^:]{1,80}):\s*(.+)$/);
      if(match){rows.push([match[1].trim(),match[2].trim()]);continue}
      if(i+1<lines.length && !lines[i+1].includes(':') && /^[A-Za-z0-9][A-Za-z0-9 _./-]{1,79}$/.test(line)){
        rows.push([line,lines[++i]]);
      }else rows.push(['',line]);
    }
    paragraph.replaceChildren();
    const label=document.createElement('span');label.textContent='Evidence: ';paragraph.appendChild(label);
    rows.forEach(([name,value],index)=>{
      if(index)paragraph.appendChild(document.createElement('br'));
      if(name){const strong=document.createElement('strong');strong.textContent=name+':';paragraph.appendChild(strong);paragraph.appendChild(document.createTextNode(' '))}
      paragraph.appendChild(document.createTextNode(value));
    });
    paragraph.dataset.evidenceFormatted='1';
  };
  const scan=()=>document.querySelectorAll('#findingsResult .finding-card p').forEach(p=>{if(/^Evidence/i.test(p.textContent||''))formatEvidence(p)});
  const start=()=>{scan();const root=document.getElementById('findingsResult');if(root)new MutationObserver(scan).observe(root,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
