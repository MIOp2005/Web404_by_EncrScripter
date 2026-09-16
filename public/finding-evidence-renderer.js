(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const evidenceOf=card=>[...card.querySelectorAll('p')].find(p=>/^Evidence/i.test(p.textContent||''));
  const format=raw=>{
    let text=String(raw||'').replace(/^Evidence\s*:?\s*/i,'').trim();
    text=text.replace(/<br\s*\/?>/gi,'\n').replace(/<\/?(?:strong|b)>/gi,'');
    const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const rows=[];
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(/^[^:]{1,60}:\s*$/.test(line)&&lines[i+1]){rows.push([line.slice(0,-1).trim(),lines[++i]]);continue}
      const colon=line.indexOf(':');
      if(colon>0&&colon<60&&!/^https?:\/\//i.test(line)&&!/^\d{1,2}:\d{2}(?::\d{2})/.test(line)){
        const label=line.slice(0,colon).trim();const value=line.slice(colon+1).trim();
        if(label&&value){rows.push([label,value]);continue}
      }
      rows.push([null,line]);
    }
    return rows.map(([label,value])=>label?`<strong>${esc(label)}:</strong> ${esc(value)}`:esc(value)).join('<br>');
  };
  const render=()=>{
    document.querySelectorAll('.finding-card').forEach(card=>{
      const p=evidenceOf(card);if(!p||p.dataset.evidenceFormatting==='active'||document.activeElement===p)return;
      const raw=p.textContent||'';if(!raw.trim())return;
      const signature=raw;
      if(p.dataset.evidenceSignature===signature)return;
      p.dataset.evidenceSignature=signature;
      p.innerHTML='Evidence:<br>'+format(raw);
      p.dataset.evidenceFormatted='1';
    });
  };
  const observer=new MutationObserver(()=>render());
  const start=()=>{
    const root=document.getElementById('findingsResult');
    if(!root)return;
    observer.observe(root,{childList:true,subtree:true,characterData:true});
    render();
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  document.addEventListener('web404:findings-updated',()=>setTimeout(render,0));
})();
