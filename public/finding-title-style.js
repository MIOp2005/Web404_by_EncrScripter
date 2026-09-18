(()=>{
  const apply=()=>{
    document.querySelectorAll('#findingsResult .finding-card .finding-head h3').forEach(title=>{
      title.style.fontWeight='800';
      title.style.fontStyle='normal';
    });
  };
  const start=()=>{
    const root=document.getElementById('findingsResult');
    if(!root)return;
    apply();
    new MutationObserver(apply).observe(root,{childList:true,subtree:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
