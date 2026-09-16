(()=>{
  const escapeText=s=>String(s??'');
  const getEvidence=card=>[...card.querySelectorAll('p')].find(p=>/^Evidence/i.test(p.textContent||''));
  const parse=raw=>{
    let text=escapeText(raw).replace(/^Evidence\s*:?\s*/i,'').trim();
    text=text.replace(/<br\s*\/?>/gi,'\n').replace(/<\/?(?:strong|b)>/gi,'');
    const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const rows=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/^[^:]{1,80}:\s*$/.test(line)&&lines[i+1]){rows.push([line.slice(0,-1).trim(),lines[++i]]);continue}
      const colon=line.indexOf(':');
      if(colon>0&&colon<80&&!/^https?:\/\//i.test(line)&&!/^\d{1,2}:\d{2}(?::\d{2})/.test(line)){
        const name=line.slice(0,colon).trim();const value=line.slice(colon+1).trim();
        if(name&&value){rows.push([name,value]);continue}
      }
      rows.push(['',line]);
    }
    return rows;
  };
  const render=()=>document.querySelectorAll('#findingsResult .finding-card').forEach(card=>{
    const p=getEvidence(card);if(!p||document.activeElement===p)return;
    const raw=p.textContent||'';if(!raw.trim())return;
    const signature=raw;
    if(p.dataset.evidenceSignature===signature)return;
    p.dataset.evidenceSignature=signature;
    p.replaceChildren();
    const heading=document.createElement('span');heading.textContent='Evidence:';p.appendChild(heading);
    parse(raw).forEach(([name,value],index)=>{
      p.appendChild(document.createElement('br'));
      if(name){const strong=document.createElement('strong');strong.textContent=name+':';p.appendChild(strong);p.appendChild(document.createTextNode(' '));}
      p.appendChild(document.createTextNode(value));
    });
    p.dataset.evidenceFormatted='1';
  });
  const start=()=>{
    const root=document.getElementById('findingsResult');if(!root)return;
    new MutationObserver(()=>setTimeout(render,0)).observe(root,{childList:true,subtree:true,characterData:true});
    render();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  document.addEventListener('web404:findings-updated',()=>setTimeout(render,0));
})();
