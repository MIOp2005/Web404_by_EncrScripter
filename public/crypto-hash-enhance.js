(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }

  function base64ToBytes(value) {
    const clean = value.replace(/\s+/g, '').trim();
    if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) throw new Error('Invalid Base64 data');
    const raw = atob(clean);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const mime = {
    jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml',
    pdf:'application/pdf', txt:'text/plain', csv:'text/csv', json:'application/json', xml:'application/xml',
    html:'text/html', css:'text/css', js:'text/javascript', zip:'application/zip',
    mp3:'audio/mpeg', mp4:'video/mp4', wav:'audio/wav', mp3:'audio/mpeg',
    doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  function getMime(filename) {
    const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? (mime[match[1]] || 'application/octet-stream') : 'application/octet-stream';
  }

  function renderFileTool() {
    const body = document.getElementById('cryptoCleanBody');
    if (!body) return;

    body.innerHTML = '<div class="crypto-section">' +
      '<label class="crypto-label">Encode File → .base64</label>' +
      '<input id="w404FileEncode" type="file">' +
      '<button class="crypto-main" id="w404EncodeBtn">Encode & download .base64 →</button>' +
      '<div id="w404EncodeOut" class="crypto-output">Select a file. The generated Base64 file keeps the original filename in its .base64 filename.</div>' +
      '</div>' +
      '<div class="crypto-section">' +
      '<label class="crypto-label">Decode .base64 → Original File</label>' +
      '<input id="w404FileDecode" type="file" accept=".base64,.txt">' +
      '<button class="crypto-main" id="w404DecodeBtn">Decode & restore original file →</button>' +
      '<div id="w404DecodeOut" class="crypto-output">Choose the .base64 file created by Web404. Its original extension will be restored automatically.</div>' +
      '</div>';

    document.getElementById('w404EncodeBtn').onclick = async () => {
      const file = document.getElementById('w404FileEncode').files[0];
      const out = document.getElementById('w404EncodeOut');
      if (!file) { out.textContent = 'Select a file first.'; return; }
      out.textContent = 'Encoding locally…';
      try {
        const encoded = bytesToBase64(await file.arrayBuffer());
        download(new Blob([encoded], { type: 'text/plain;charset=utf-8' }), file.name + '.base64');
        out.innerHTML = '<b>Encoded successfully.</b><br>' + esc(file.name) + ' → <code>' + esc(file.name + '.base64') + '</code><br>' + encoded.length.toLocaleString() + ' Base64 characters.';
      } catch {
        out.textContent = 'File encoding failed.';
      }
    };

    document.getElementById('w404DecodeBtn').onclick = async () => {
      const file = document.getElementById('w404FileDecode').files[0];
      const out = document.getElementById('w404DecodeOut');
      if (!file) { out.textContent = 'Select a .base64 file first.'; return; }
      out.textContent = 'Decoding locally…';
      try {
        const encoded = await file.text();
        const bytes = base64ToBytes(encoded);
        const originalName = file.name.toLowerCase().endsWith('.base64') ? file.name.slice(0, -7) : 'decoded-file.bin';
        download(new Blob([bytes], { type: getMime(originalName) }), originalName);
        out.innerHTML = '<b>Decoded successfully.</b><br>Restored as <code>' + esc(originalName) + '</code><br>' + bytes.byteLength.toLocaleString() + ' bytes.';
      } catch {
        out.textContent = 'Invalid Base64 file data.';
      }
    };
  }

  function install() {
    const container = document.querySelector('.crypto-tools');
    if (!container) return;
    const oldButton = container.querySelector('[data-crypto-tool="file"]');
    if (!oldButton) return;
    const button = oldButton.cloneNode(true);
    button.textContent = 'File Encode / Decode';
    button.addEventListener('click', () => {
      container.querySelectorAll('.crypto-tool').forEach(x => x.classList.toggle('active', x === button));
      renderFileTool();
    });
    oldButton.replaceWith(button);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
