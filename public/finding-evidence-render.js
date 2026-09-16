(()=>{
  const getEvidence=card=>[...card.querySelectorAll('p')].find(p=>/^Evidence/i.test(p.textContent||''));
  const knownLabels=[
    'IP ADDRESS','IP VERSION','IP TYPE','IP CONTENT','COUNTRY','REGION','CITY','LATITUDE','LONGITUDE','TIMEZONE','ISP','ASN','ORGANIZATION','NETWORK','DNS DETAILS','DNSSEC','FIELDS','FILE TYPE','SIZE','CHECKSUM','FILE','SHA-256','SHA-1','MD5','FILE NAME','FILE SIZE','FILE TYPE EXTENSION','TARGET','PLATFORMS','CROSS-WEB SEARCHES','OSINT NOTE','URL','HOSTNAME','PORT','PROTOCOL','PATH','QUERY','FRAGMENT','RISK SCORE','RISK LEVEL'
  ];
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=raw=>{
    let text=String(raw||'').replace(/^Evidence\s*:?\s*/i,'').trim();
    text=text.replace(/<br\s*\/?>/gi,'\n').replace(/\r/g,'');
    knownLabels.forEach(label=>{const re=new RegExp(`(?<!^)(?=${label.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\s*:)`,'gi');text=text.replace(re,'\n')});
    text=text.replace(/\s+(?=[A-Z][A-Z0-9 /_-]{2,50}:)/g,'\n');
    text=text.replace(/\s+(?=(?:file_name|file_size|file_type|file_type_extension|file_path|date_time|host_computer|exif_ifd_pointer|gps_info_ifd_pointer|exposure_time|fnumber|exposure_program|isospeed_ratings|exif_version|date_time_original|date_time_digitized|offset_time|offset_time_original|offset_time_digitized|metering_mode|flash|focal_length|subject_area|maker_note|sub_sec_time_original|orientation|x_resolution|y_resolution|resolution_unit|software|make|model|pixel_x_dimension|pixel_y_dimension|color_space|bits_per_sample|compression|interoperability_index|interoperability_version):)/gi,'\n');
    return text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  };
  const parse=raw=>normalize(raw).map(line=>{
    const colon=line.indexOf(':');
    if(colon>0&&colon<80&&!/^https?:\/\//i.test(line)&&!/^\d{1,2}:\d{2}(?::\d{2})/.test(line)){
      const name=line.slice(0,colon).trim(),value=line.slice(colon+1).trim();
      if(name&&value)return [name,value];
    }
    return ['',line];
  });
  const render=()=>document.querySelectorAll('#findingsResult .finding-card').forEach(card=>{
    const p=getEvidence(card);if(!p||document.activeElement===p)return;
    const raw=p.innerHTML||p.textContent||'';if(!raw.trim())return;
    const signature=raw;if(p.dataset.evidenceSignature===signature)return;
    p.dataset.evidenceSignature=signature;p.replaceChildren();
    const heading=document.createElement('span');heading.textContent='Evidence:';p.appendChild(heading);
    parse(raw).forEach(([name,value])=>{
      p.appendChild(document.createElement('br'));
      if(name){const strong=document.createElement('strong');strong.textContent=name+':';p.appendChild(strong);p.appendChild(document.createTextNode(' '));}
      p.appendChild(document.createTextNode(value));
    });
    p.dataset.evidenceFormatted='1';
  });
  const start=()=>{const root=document.getElementById('findingsResult');if(!root)return;new MutationObserver(()=>setTimeout(render,0)).observe(root,{childList:true,subtree:true,characterData:true});render()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  document.addEventListener('web404:findings-updated',()=>setTimeout(render,0));
})();
