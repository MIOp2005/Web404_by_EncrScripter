(() => {
  'use strict';

  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const toBase64 = buffer => { const bytes = new Uint8Array(buffer); let s=''; for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); return btoa(s); };
  const fromBase64 = value => { const s=value.replace(/\s+/g,'').trim(); if(!s||s.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw Error(); const raw=atob(s), out=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i); return out; };
  const mime = {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',json:'application/json',zip:'application/zip',mp3:'audio/mpeg',mp4:'video/mp4',wav:'audio/wav',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};
  const fileType = name => { const m=name.match(/\.([^.]+)$/); return mime[m?.[1]?.toLowerCase()] || 'application/octet-stream'; };
  const save = (bytes,name,type) => { const a=document.createElement('a'); const url=URL.createObjectURL(new Blob([bytes],{type:type||fileType(name)})); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); };

  function renderFile() {
    const body=document.getElementById('cryptoCleanBody'); if(!body)return;
    body.innerHTML=`<div class="crypto-section"><label class="crypto-label">File → .base64</label><input id="w404EncodeFile" type="file"><button class="crypto-main" id="w404Encode">Encode & download .base64 →</button><div id="w404EncodeResult" class="crypto-output">Select a file. Web404 will create a .base64 file with the original filename.</div></div><div class="crypto-section"><label class="crypto-label">.base64 → Original File</label><input id="w404DecodeFile" type="file" accept=".base64"><button class="crypto-main" id="w404Decode">Decode & restore original file →</button><div id="w404DecodeResult" class="crypto-output">Select the .base64 file created by Web404.</div></div>`;
    document.getElementById('w404Encode').onclick=async()=>{const f=document.getElementById('w404EncodeFile').files[0],out=document.getElementById('w404EncodeResult');if(!f){out.textContent='Select a file first.';return;}try{const name=f.name+'.base64';save(new TextEncoder().encode(toBase64(await f.arrayBuffer())),name,'text/plain;charset=utf-8');out.innerHTML='<b>Encoded successfully.</b><br>'+esc(f.name)+' → <code>'+esc(name)+'</code>';}catch{out.textContent='File encoding failed.';}};
    document.getElementById('w404Decode').onclick=async()=>{const f=document.getElementById('w404DecodeFile').files[0],out=document.getElementById('w404DecodeResult');if(!f){out.textContent='Select a .base64 file first.';return;}try{if(!f.name.toLowerCase().endsWith('.base64'))throw Error();const name=f.name.slice(0,-7);const bytes=fromBase64(await f.text());if(!name)throw Error();save(bytes,name);out.innerHTML='<b>Decoded successfully.</b><br>Restored as <code>'+esc(name)+'</code>';}catch{out.textContent='Invalid .base64 file or corrupted Base64 data.';}};
  }

  function renderEncoding() {
    const body=document.getElementById('cryptoCleanBody'); if(!body)return;
    body.innerHTML=`<div class="crypto-section"><label class="crypto-label">Input</label><textarea id="w404EncodingInput" rows="8" placeholder="Enter text to encode, or paste encoded data to decode"></textarea><label class="crypto-label">Encoding format</label><select id="w404EncodingFormat"><option value="base64">Base64</option><option value="hex">Hexadecimal</option><option value="url">URL Encoding</option><option value="html">HTML Entities</option></select><div class="crypto-actions"><button type="button" class="crypto-main" id="w404EncodeText">Encode →</button><button type="button" class="crypto-secondary" id="w404DecodeText">Decode →</button></div><div id="w404EncodingResult" class="crypto-output">Choose a format and operation.</div><p class="crypto-help">Encoding changes representation and is reversible. It is not encryption and does not provide confidentiality.</p></div>`;

    const bytesToHex = buffer => Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
    const hexToBytes = value => { const s=value.trim().replace(/\s+/g,''); if(!s||s.length%2||!/^[0-9a-f]+$/i.test(s)) throw Error('Invalid hexadecimal input.'); const out=new Uint8Array(s.length/2); for(let i=0;i<out.length;i++)out[i]=parseInt(s.slice(i*2,i*2+2),16); return out; };
    const encodeHtml = value => String(value).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
    const decodeHtml = value => { const t=document.createElement('textarea'); t.innerHTML=String(value); return t.value; };
    const convert = (value,format,mode) => {
      const textEncoder=new TextEncoder(), textDecoder=new TextDecoder();
      if(mode==='encode') {
        if(format==='base64') return toBase64(textEncoder.encode(value));
        if(format==='hex') return bytesToHex(textEncoder.encode(value));
        if(format==='url') return encodeURIComponent(value);
        if(format==='html') return encodeHtml(value);
      }
      if(format==='base64') return textDecoder.decode(fromBase64(value));
      if(format==='hex') return textDecoder.decode(hexToBytes(value));
      if(format==='url') return decodeURIComponent(value);
      if(format==='html') return decodeHtml(value);
      throw Error('Unsupported encoding format.');
    };
    const run = mode => {
      const input=document.getElementById('w404EncodingInput').value;
      const format=document.getElementById('w404EncodingFormat').value;
      const out=document.getElementById('w404EncodingResult');
      if(!input){out.textContent='Enter input first.';return;}
      try {
        const result=convert(input,format,mode);
        out.innerHTML='<textarea id="w404EncodingValue" rows="8" readonly></textarea><button type="button" class="crypto-secondary" id="w404CopyEncoding">Copy result</button>';
        document.getElementById('w404EncodingValue').value=result;
        document.getElementById('w404CopyEncoding').onclick=async function(){try{await navigator.clipboard.writeText(result);this.textContent='Copied';setTimeout(()=>this.textContent='Copy result',1200);}catch{this.textContent='Copy failed';setTimeout(()=>this.textContent='Copy result',1200);}};
      } catch(error) { out.textContent=error?.message||'Invalid input for the selected format.'; }
    };
    document.getElementById('w404EncodeText').onclick=()=>run('encode');
    document.getElementById('w404DecodeText').onclick=()=>run('decode');
  }

  function install(){
    const nav=document.querySelector('.crypto-tools'); if(!nav)return;
    const oldFile=nav.querySelector('[data-ctool="file"]');
    if(oldFile){const button=oldFile.cloneNode(true);button.addEventListener('click',e=>{e.stopPropagation();nav.querySelectorAll('.crypto-tool').forEach(x=>x.classList.toggle('active',x===button));renderFile();});oldFile.replaceWith(button);}
    const oldEncoding=nav.querySelector('[data-ctool="encoding"]');
    if(oldEncoding){const button=oldEncoding.cloneNode(true);button.addEventListener('click',e=>{e.stopPropagation();nav.querySelectorAll('.crypto-tool').forEach(x=>x.classList.toggle('active',x===button));renderEncoding();});oldEncoding.replaceWith(button);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
