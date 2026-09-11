(() => {
  const $ = id => document.getElementById(id);
  const allowed = ['open', 'in-progress', 'resolved'];
  const labels = { open: 'Open', 'in-progress': 'In Progress', resolved: 'Resolved' };
  const severityWeight = { critical: 35, high: 25, medium: 15, low: 7, info: 2 };
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

  function riskRows(){
    const grouped=new Map();
    findings.forEach(f=>{
      const source=String(f.source||'Unspecified Module').trim()||'Unspecified Module';
      const weight=severityWeight[String(f.severity||'info').toLowerCase()]||2;
      const status=f.status||'open';
      const statusFactor=status==='resolved'?0.1:status==='in-progress'?0.65:1;
      const impact=weight*statusFactor;
      const current=grouped.get(source)||{count:0,impact:0};
      current.count+=1;current.impact+=impact;grouped.set(source,current);
    });
    return [...grouped.entries()].sort((a,b)=>b[1].impact-a[1].impact);
  }

  function renderRiskBreakdown(){
    const panel=$('riskBreakdownPanel');if(!panel)return;
    const score=$('riskBreakdownScore');
    const active=findings.filter(f=>f.status!=='resolved');
    const totalRaw=active.reduce((sum,f)=>sum+(severityWeight[String(f.severity||'info').toLowerCase()]||2)*(f.status==='in-progress'?0.65:1),0);
    const finalScore=Math.min(100,Math.round(totalRaw));
    const rating=finalScore>=80?'CRITICAL':finalScore>=60?'HIGH':finalScore>=40?'MEDIUM':finalScore>=20?'LOW':'INFO';
    if(score)score.textContent=`${finalScore}/100 · ${rating}`;

    const oldRows=panel.querySelectorAll('.risk-row');oldRows.forEach(row=>row.remove());
    const rows=riskRows();
    const title=panel.querySelector('.risk-breakdown-title');
    rows.forEach(([source,data])=>{
      const row=document.createElement('div');row.className='risk-row';
      const label=document.createElement('span');label.textContent=source;
      label.title='Saved findings from this module';
      const track=document.createElement('i');const bar=document.createElement('em');
      const impact=Math.round(data.impact);bar.style.width=`${Math.min(100,impact*2)}%`;track.appendChild(bar);
      const value=document.createElement('b');value.textContent=String(data.count);value.title=`${data.count} saved finding${data.count===1?'':'s'}`;
      row.append(label,track,value);panel.appendChild(row);
    });

    if(!rows.length){
      const row=document.createElement('div');row.className='risk-row';
      const label=document.createElement('span');label.textContent='No saved findings';
      const track=document.createElement('i');const bar=document.createElement('em');bar.style.width='0%';track.appendChild(bar);
      const value=document.createElement('b');value.textContent='—';row.append(label,track,value);panel.appendChild(row);
    }
  }

  const observer=new MutationObserver(()=>renderControls());
  const start=()=>{loadStyles();const root=$('findingsResult');if(root)observer.observe(root,{childList:true,subtree:true});load();};
  document.addEventListener('web404:findings-updated',load);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  setInterval(load,10000);
})();