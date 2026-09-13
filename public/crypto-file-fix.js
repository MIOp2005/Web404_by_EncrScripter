(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const b64 = buffer => {
    const bytes = new Uint8Array(buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const fromB64 = value => {
    const s = value.replace(/\s+/g, '').trim();
    if (!s || s.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw Error('Invalid Base64');
    const raw = atob(s), out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  };
  const typeFor = name => ({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',pdf:'application/pdf',txt:'text/plain',csv:'text/csv',json:'application/json',zip:'application/zip',mp3:'audio/mpeg',mp4:'video/mp4',wav:'audio/wav',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}[(name.match(/\.([^.]+)$/)||[])[1]?.toLowerCase()] || 'application/octet-stream');
  const save = (bytes, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], {type:typeFor(name)}));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  function render() {
    const body = document.getElementById('cryptoCleanBody');
    if (!body) return;
    body.innerHTML = '<div class="crypto-section"><label class="crypto-label">File → .base64</label><input id="w404EncodeFile" type="file"><button class="crypto-main" id="w404Encode">Encode & download .base64 →</button><div id="w404EncodeResult" class="crypto-output">Select a file. Web404 creates a .base64 file with the original filename.</div></div><div class="crypto-section"><label class="crypto-label">.base64 → Original File</label><input id="w404DecodeFile" type="file" accept=".base64"><button class="crypto-main" id="w404Decode">Decode & restore original file →</button><div id="w404DecodeResult" class="crypto-output">Select the .base64 file created by Web404.</div></div>';
    document.getElementById('w404Encode').onclick = async () => {
      const f = document.getElementById('w404EncodeFile').files[0], out = document.getElementById('w404EncodeResult');
      if (!f) return out.textContent = 'Select a file first.';
      try { const name = f.name + '.base64'; save(new TextEncoder().encode(b64(await f.arrayBuffer())), name); out.innerHTML = '<b>Encoded successfully.</b><br>' + esc(f.name) + ' → <code>' + esc(name) + '</code>'; } catch { out.textContent = 'File encoding failed.'; }
    };
    document.getElementById('w404Decode').onclick = async () => {
      const f = document.getElementById('w404DecodeFile').files[0], out = document.getElementById('w404DecodeResult');
      if (!f) return out.textContent = 'Select a .base64 file first.';
      try { if (!f.name.toLowerCase().endsWith('.base64')) throw Error(); const name = f.name.slice(0,-7); const bytes = fromB64(await f.text()); save(bytes,name); out.innerHTML = '<b>Decoded successfully.</b><br>Restored as <code>' + esc(name) + '</code>'; } catch { out.textContent = 'Invalid .base64 file or corrupted Base64 data.'; }
    };
  }
  function install() {
    const nav = document.querySelector('.crypto-tools');
    if (!nav) return;
    const old = nav.querySelector('[data-ctool="file"]');
    if (!old) return;
    const button = old.cloneNode(true);
    button.addEventListener('click', e => { e.stopPropagation(); nav.querySelectorAll('.crypto-tool').forEach(x => x.classList.toggle('active', x === button)); render(); });
    old.replaceWith(button);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
