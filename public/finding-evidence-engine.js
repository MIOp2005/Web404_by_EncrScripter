(()=>{
  const originalFetch=window.fetch.bind(window);
  const fieldBreaks=[
    'PUBLIC IP','IP ADDRESS','IP VERSION','IP TYPE','CONTINENT','COUNTRY','REGION','CITY','LATITUDE','LONGITUDE','TIMEZONE','ASN','ISP','ORGANIZATION','REVERSE DNS','SOURCE COVERAGE',
    'A RECORD','AAAA RECORD','MX RECORD','NS RECORD','TXT RECORD','CNAME RECORD','DNSSEC','CERTIFICATE NAMES','SUBDOMAINS',
    'URL','SCHEME','HOSTNAME','PORT','PATH','QUERY','FRAGMENT','RISK SCORE','RISK LEVEL','INDICATORS','RECOMMENDATION',
    'USERNAME','NORMALIZED USERNAME','LENGTH','LETTERS','DIGITS','SYMBOLS','PLATFORMS','VARIATIONS','VERIFICATION',
    'FILE NAME','FILE TYPE','FILE SIZE','LAST MODIFIED','MD5','SHA-1','SHA-256','SHA-512','METADATA','EXIF','EMBEDDED METADATA',
    'HASH','ALGORITHM','INPUT','OUTPUT','ENCODED OUTPUT','DECODED OUTPUT','CIPHER','PASSWORD','KEY','RESULT'
  ];
  const fieldPattern=new RegExp(`\\s*(?=(${fieldBreaks.map(x=>x.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')).join('|')})(?:\\s|:|$))`,'gi');

  function formatEvidence(value){
    let text=String(value??'')
      .replace(/Send to Investigation Findings\\s*→?/gi,'')
      .replace(/\\bCopy(?: output| Base64| hash)?\\b/gi,'')
      .replace(/\\bSaving finding…?\\b/gi,'')
      .replace(/\\r\\n?/g,'\\n');

    text=text.replace(fieldPattern,'\\n$1');
    text=text.replace(/\\n{3,}/g,'\\n\\n');
    text=text.replace(/[ \\t]+\\n/g,'\\n');
    text=text.replace(/\\n[ \\t]+/g,'\\n');
    text=text.trim();

    return text.slice(0,4000);
  }

  window.web404FormatFindingEvidence=formatEvidence;

  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input?.url||'');
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(method==='POST'&&url.includes('/api/findings')&&init?.body){
      try{
        const body=JSON.parse(init.body);
        if(body&&body.evidence!==undefined){
          body.evidence=formatEvidence(body.evidence);
          init={...init,body:JSON.stringify(body)};
        }
      }catch{}
    }
    return originalFetch(input,init);
  };
})();
