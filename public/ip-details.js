(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const value=v=>(v===null||v===undefined||v==='')?'Unavailable':esc(v);
  const list=v=>Array.isArray(v)&&v.length?v.map(esc).join('<br>'):'Unavailable';
  const card=(label,val)=>`<div class="stat"><small>${esc(label)}</small><b>${value(val)}</b></div>`;
  async function inspect(e){
    e.preventDefault();e.stopImmediatePropagation();
    const input=$('ipInput'),out=$('ipResult'),ip=input?.value.trim();
    if(!out)return;
    if(!ip){out.className='result empty';out.innerHTML='Enter an IP address.';return;}
    out.className='result';out.innerHTML='<div class="empty"><span class="spinner"></span> Inspecting public IP intelligence…</div>';
    try{
      const r=await fetch('/api/ip',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({ip})});
      let x={};try{x=await r.json()}catch{}
      if(!r.ok)throw Error(x.error||`Request failed (${r.status})`);
      window.web404IPObservation={analyzed:true,data:x};
      document.dispatchEvent(new CustomEvent('web404:ip-updated'));
      const geo=[card('COUNTRY',x.country),card('REGION',x.region),card('CITY',x.city),card('CONTINENT',x.continent),card('LATITUDE',x.latitude),card('LONGITUDE',x.longitude),card('TIMEZONE',x.timezone)];
      const network=[card('ASN',x.asn),card('ISP',x.isp),card('ORGANIZATION',x.organization),card('IP TYPE',x.type),card('IP VERSION',/^:/.test(String(x.ip||''))?'IPv6':String(x.type||'').toLowerCase().includes('6')?'IPv6':'IPv4')];
      out.innerHTML=`<div class="ip-intel-head"><div><small>PUBLIC IP</small><h3>${value(x.ip)}</h3></div><span class="tag">VERIFIED RESPONSE</span></div><div class="ip-intel-section"><div class="ip-intel-section-title">Geolocation</div><div class="result-grid">${geo.join('')}</div></div><div class="ip-intel-section"><div class="ip-intel-section-title">Network & ASN</div><div class="result-grid">${network.join('')}</div></div><div class="ip-intel-section"><div class="ip-intel-section-title">Reverse DNS</div><div class="record">${list(x.reverseDns)}</div></div><div class="record"><b>Data source</b><br>Public IP intelligence provider response plus local reverse-DNS lookup. Fields not returned by the provider are shown as Unavailable.</div>`;
    }catch(err){
      window.web404IPObservation=null;
      document.dispatchEvent(new CustomEvent('web404:ip-updated'));
      out.className='result';out.innerHTML=`<div class="empty">${esc(err.message||'IP intelligence lookup failed.')}</div>`;
    }
  }
  function start(){
    const b=$('ipButton');if(!b)return;
    b.addEventListener('click',inspect,true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();