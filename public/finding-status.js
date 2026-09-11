(() => {
  const $ = id => document.getElementById(id);
  const allowed = ['open', 'in-progress', 'resolved'];
  const labels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
  let findings = [], busy = false, filter = 'all';

  function loadStyles(){
    if(document.querySelector('link[data-finding-status-css]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='/finding-status.css';link.dataset.findingStatusCss='1';document.head.appendChild(link);
  }

  async function load(){
    try{
      const r=await fetch('/api/findings');
      if(!r.ok)return;
      findings=(await r.json()).findings||[];
      renderSummary();renderControls();renderRiskBreakdown();
    }catch{}
  }

  function renderSummary(){
    const root=$('findingsResult');if(!root)return;
    let bar=$('findingLifecycleBar');
    if(!bar){bar=document.createElement('div');bar.id='findingLifecycleBar';bar.className='finding-lifecycle-bar';root.parentNode.insertBefore(bar,root);}
    const active=findings.filter(f=>f.status!=='resolved').length;
    const resolved=findings.filter(f=>f.status==='resolved').length;
    const high=findings.filter(f=>['high','critical'].includes(f.severity)&&f.status!=='resolved').length;
    bar.replaceChildren();
    [['ALL',findings.length,'all'],['ACTIVE',active,'active'],['RESOLVED',resolved,'resolved'],['HIGH / CRITICAL',high,'high']].forEach(([name,count,value])=>{
      const button=document.createElement('button');button.type='button';button.className=`finding-filter ${filter===value?'active':''}`;
      const span=document.createElement('span');span.textContent=name;const b=document.createElement('b');b.textContent=count;button.append(span,b);
      button.addEventListener('click',()=>{filter=value;renderSummary();renderControls()});bar.appendChild(button);
    });
  }

  function visibleFinding(f){
    if(filter==='active')return f.status!=='resolved';
    if(filter==='resolved')return f.status==='resolved';
    if(filter==='high')return ['high','critical'].includes(f.severity)&&f.status!=='resolved';
    return true;
  }

  function linkify(root){
    if(!root)return;
    const urlRe=/\bhttps?:\/\/[^\s<]+/gi;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement?.closest('a')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    const nodes=[];let n;while((n=walker.nextNode()))nodes.push(n);
    nodes.forEach(node=>{
      const text=node.nodeValue||'';urlRe.lastIndex=0;if(!urlRe.test(text)){urlRe.lastIndex=0;return}urlRe.lastIndex=0;
      const frag=document.createDocumentFragment();let last=0,m;
      while((m=urlRe.exec(text))){let raw=m[0],trail='';while(/[),.;!?]$/.test(raw)){trail=raw.slice(-1)+trail;raw=raw.slice(0,-1)}if(m.index>last)frag.appendChild(document.createTextNode(text.slice(last,m.index)));const a=document.createElement('a');a.href=raw;a.target='_blank';a.rel='noopener noreferrer nofollow';a.textContent=raw;a.className='finding-link';frag.appendChild(a);if(trail)frag.appendChild(document.createTextNode(trail));last=m.index+m[0].length}if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));node.parentNode.replaceChild(frag,node);
    });
  }

  function renderControls(){
    const root=$('findingsResult');if(!root)return;
    [...root.querySelectorAll('.finding-card')].forEach((card,index)=>{
      const finding=findings[index];if(!finding?.id)return;card.hidden=!visibleFinding(finding);
      if(!card.querySelector('.finding-status-wrap')){
        const actions=card.querySelector('.finding-actions')||card;const wrap=document.createElement('label');wrap.className='finding-status-wrap';
        const text=document.createElement('span');text.textContent='STATUS';const select=document.createElement('select');select.className='finding-status';
        allowed.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=labels[value];option.selected=(finding.status||'open')===value;select.appendChild(option)});
        select.dataset.findingId=finding.id;select.addEventListener('change',()=>updateStatus(select));wrap.append(text,select);actions.prepend(wrap);
      }
    });
    root.querySelectorAll('.finding-card p').forEach(linkify);
  }

  async function updateStatus(select){
    const id=select.dataset.findingId,status=select.value;if(!id||!allowed.includes(status)||busy)return;busy=true;select.disabled=true;
    try{const r=await fetch(`/api/findings/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});if(!r.ok)throw new Error();await load();document.dispatchEvent(new CustomEvent('web404:findings-updated'));}catch{await load()}finally{busy=false;select.disabled=false;}
  }

  function setRiskRow(barId,valueId,value){
    const n=Math.max(0,Number(value)||0),bar=$(barId),val=$(valueId);
    if(bar)bar.style.width=`${Math.min(100,n*2)}%`;
    if(val)val.textContent=String(n);
  }

  function metadataImpact(){
    const data=window.web404Metadata;
    if(!data||typeof data!=='object')return 0;
    const sensitive=/^(gps|latitude|longitude|location|author|artist|creator|owner|serial|camera|make|model|copyright|software)/i;
    const count=Object.keys(data).filter(k=>sensitive.test(k)).length;
    return Math.min(10,count*2);
  }

  async function renderRiskBreakdown(){
    const panel=$('riskBreakdownPanel');if(!panel)return;
    try{
      const observations={
        headers:window.web404UrlObservations?.headers||null,
        domain:window.web404UrlObservations?.domain||window.web404DomainIntel||null,
        metadata:window.web404Metadata||null
      };
      const r=await fetch('/api/risk',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({findings,observations})});
      if(!r.ok)throw new Error();
      const risk=await r.json();
      const b=risk.breakdown||{};
      const metadata=metadataImpact();
      const baseScore=Number(risk.score)||0;
      const finalScore=Math.min(100,baseScore+metadata);
      const rating=finalScore>=80?'CRITICAL':finalScore>=60?'HIGH':finalScore>=40?'MEDIUM':finalScore>=20?'LOW':'INFO';
      const score=$('riskBreakdownScore');
      if(score)score.textContent=`${finalScore}/100 · ${rating}`;
      setRiskRow('riskFindingsBar','riskFindingsValue',b.findings||0);
      setRiskRow('riskHeaderBar','riskHeaderValue',b.header||0);
      setRiskRow('riskMetadataBar','riskMetadataValue',metadata);
      setRiskRow('riskDnssecBar','riskDnssecValue',b.dnssec||0);
    }catch{
      const score=$('riskBreakdownScore');if(score)score.textContent='0/100 · INFO';
      setRiskRow('riskFindingsBar','riskFindingsValue',0);
      setRiskRow('riskHeaderBar','riskHeaderValue',0);
      setRiskRow('riskMetadataBar','riskMetadataValue',0);
      setRiskRow('riskDnssecBar','riskDnssecValue',0);
    }
  }

  const observer=new MutationObserver(()=>renderControls());
  const start=()=>{loadStyles();const root=$('findingsResult');if(root)observer.observe(root,{childList:true,subtree:true});load();};
  document.addEventListener('web404:findings-updated',load);
  document.addEventListener('web404:url-risk-updated',renderRiskBreakdown);
  document.addEventListener('web404:domain-updated',renderRiskBreakdown);
  document.addEventListener('web404:metadata-updated',renderRiskBreakdown);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  setInterval(load,10000);
})();