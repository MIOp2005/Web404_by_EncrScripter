(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bytesToHex = bytes => Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, '0')).join('');
  const b64ToBytes = value => { const raw = atob(value.trim()); const out = new Uint8Array(raw.length); for (let i=0;i<raw.length;i++) out[i]=raw.charCodeAt(i); return out; };
  const decodeHex = value => { const s=value.replace(/\s+/g,''); if(!s || s.length%2 || !/^[0-9a-f]+$/i.test(s)) throw Error('Invalid hexadecimal input.'); const out=new Uint8Array(s.length/2); for(let i=0;i<out.length;i++) out[i]=parseInt(s.slice(i*2,i*2+2),16); return out; };
  const set = (html, cls='') => { const o=$('cryptoDecodeOutput'); if(o){o.className='crypto-output '+cls;o.innerHTML=html;} };
  function addCopyButtons() {
    const output=$('co'); if(!output || output.dataset.copyReady==='1') return;
    const rows=output.querySelectorAll('.crypto-result-row'); if(!rows.length) return;
    output.dataset.copyReady='1';
    rows.forEach(row=>{
      const code=row.querySelector('code'); if(!code || row.querySelector('.hash-copy')) return;
      const btn=document.createElement('button'); btn.className='hash-copy'; btn.type='button'; btn.textContent='Copy';
      btn.onclick=async()=>{ try { await navigator.clipboard.writeText(code.textContent); btn.textContent='Copied'; setTimeout(()=>btn.textContent='Copy',1200); } catch { btn.textContent='Copy failed'; setTimeout(()=>btn.textContent='Copy',1200); } };
      row.appendChild(btn);
    });
  }
  function installDecode() {
    const body=$('cryptoCleanBody'); if(!body || body.dataset.decodeReady==='1') return;
    if(!$('goHash') || !$('ct')) return;
    body.dataset.decodeReady='1';
    const wrap=document.createElement('div'); wrap.className='hash-decode-box';
    wrap.innerHTML='<div class="hash-decode-title"><b>Decode encoded text</b><span>Hashes cannot be decoded. This only decodes reversible encodings.</span></div><div class="hash-decode-controls"><select id="hashDecodeFormat"><option value="auto">Auto detect</option><option value="base64">Base64</option><option value="hex">Hexadecimal</option><option value="url">URL encoding</option></select><button class="crypto-secondary" id="hashDecodeBtn" type="button">Decode input →</button></div><div id="cryptoDecodeOutput" class="crypto-output">Paste Base64, hexadecimal or URL-encoded text above, then decode it.</div>';
    $('goHash').insertAdjacentElement('afterend',wrap);
    $('hashDecodeBtn').onclick=()=>{
      const value=$('ct').value.trim(); if(!value) return set('Enter encoded text in the Text field first.');
      const format=$('hashDecodeFormat').value;
      const tryDecode=(f)=>{ if(f==='base64') return dec.decode(b64ToBytes(value)); if(f==='hex') return dec.decode(decodeHex(value)); return decodeURIComponent(value); };
      try {
        if(format!=='auto') return set('<b>Decoded text</b><textarea rows="5" readonly>'+esc(tryDecode(format))+'</textarea>');
        const candidates=[];
        try { candidates.push(['Base64',tryDecode('base64')]); } catch {}
        try { candidates.push(['Hexadecimal',tryDecode('hex')]); } catch {}
        try { if(/%[0-9a-f]{2}/i.test(value)) candidates.push(['URL encoding',tryDecode('url')]); } catch {}
        const useful=candidates.filter(([,x])=>x && !/[\uFFFD]/.test(x));
        if(!useful.length) return set('<b>No reversible encoding detected.</b><br>The input may be a hash, encrypted data, or plain text.');
        set(useful.map(([name,text])=>'<div class="crypto-result-row"><b>'+name+'</b><span>'+esc(text)+'</span></div>').join(''));
      } catch(e) { set(esc(e.message)); }
    };
  }
  const observer=new MutationObserver(()=>{installDecode();addCopyButtons();});
  function init(){ const body=$('cryptoCleanBody'); if(!body)return; observer.observe(body,{childList:true,subtree:true}); installDecode(); addCopyButtons(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();