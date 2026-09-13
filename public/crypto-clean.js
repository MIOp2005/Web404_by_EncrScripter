(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), x => x.toString(16).padStart(2, '0')).join('');
  }

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let out = '';
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }

  function base64ToBytes(value) {
    const raw = atob(value.trim());
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }

  async function digest(algorithm, data) {
    return bytesToHex(await crypto.subtle.digest(algorithm, data));
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function protectText(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return 'W404-AES1.' + bytesToBase64(salt) + '.' + bytesToBase64(iv) + '.' + bytesToBase64(ciphertext);
  }

  async function unprotectText(packageText, password) {
    const parts = packageText.trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'W404-AES1') throw new Error('Invalid W404-AES1 ciphertext');
    const key = await deriveKey(password, base64ToBytes(parts[1]));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(parts[2]) }, key, base64ToBytes(parts[3]));
    return dec.decode(plain);
  }

  function setOutput(html, className) {
    const out = $('co');
    if (!out) return;
    out.className = 'crypto-output' + (className ? ' ' + className : '');
    out.innerHTML = html;
  }

  function render(tool) {
    const body = $('cryptoCleanBody');
    if (!body) return;

    if (tool === 'hash') {
      body.innerHTML = '<label class="crypto-label">Text</label>' +
        '<textarea id="ct" rows="7" placeholder="Enter text to hash"></textarea>' +
        '<div class="crypto-checks"><label><input id="h256" type="checkbox" checked> SHA-256</label><label><input id="h1" type="checkbox"> SHA-1</label><label><input id="h512" type="checkbox"> SHA-512</label></div>' +
        '<button class="crypto-main" id="goHash">Generate hashes →</button>' +
        '<div id="co" class="crypto-output">Hash output will appear here.</div>' +
        '<p class="crypto-help">A hash is a one-way fingerprint. It cannot be decrypted back into the original text.</p>';
      $('goHash').onclick = async () => {
        const text = $('ct').value;
        if (!text) return setOutput('Enter text first.');
        setOutput('Calculating…');
        let html = '';
        if ($('h1').checked) html += '<div class="crypto-result-row"><b>SHA-1</b><code>' + await digest('SHA-1', enc.encode(text)) + '</code></div>';
        if ($('h256').checked) html += '<div class="crypto-result-row"><b>SHA-256</b><code>' + await digest('SHA-256', enc.encode(text)) + '</code></div>';
        if ($('h512').checked) html += '<div class="crypto-result-row"><b>SHA-512</b><code>' + await digest('SHA-512', enc.encode(text)) + '</code></div>';
        setOutput(html || 'Select at least one algorithm.');
      };
      return;
    }

    if (tool === 'file') {
      body.innerHTML = '<label class="crypto-label">File</label><input id="cf" type="file">' +
        '<div class="crypto-actions"><button class="crypto-main" id="fh">Hash file</button><button class="crypto-secondary" id="fe">Encode file → Base64</button></div>' +
        '<div id="co" class="crypto-output">Select a file. Processing stays in your browser.</div>';
      $('fh').onclick = async () => {
        const file = $('cf').files[0];
        if (!file) return setOutput('Select a file first.');
        setOutput('Hashing locally…');
        const data = await file.arrayBuffer();
        setOutput('<b>' + escapeHtml(file.name) + '</b><br>' + file.size.toLocaleString() + ' bytes' +
          '<div class="crypto-result-row"><b>SHA-256</b><code>' + await digest('SHA-256', data) + '</code></div>' +
          '<div class="crypto-result-row"><b>SHA-512</b><code>' + await digest('SHA-512', data) + '</code></div>');
      };
      $('fe').onclick = async () => {
        const file = $('cf').files[0];
        if (!file) return setOutput('Select a file first.');
        setOutput('Encoding locally…');
        const encoded = bytesToBase64(await file.arrayBuffer());
        setOutput('<b>Base64 encoded file</b><textarea rows="10" readonly>' + escapeHtml(encoded) + '</textarea><button class="crypto-secondary" id="copyEncoded">Copy Base64</button>');
        $('copyEncoded').onclick = () => navigator.clipboard && navigator.clipboard.writeText(encoded);
      };
      return;
    }

    if (tool === 'verify') {
      body.innerHTML = '<label class="crypto-label">File</label><input id="vf" type="file">' +
        '<label class="crypto-label">Expected SHA-256</label><input id="ce" placeholder="Paste trusted SHA-256 checksum">' +
        '<button class="crypto-main" id="goVerify">Verify integrity →</button>' +
        '<div id="co" class="crypto-output">Choose a file and provide its trusted checksum.</div>';
      $('goVerify').onclick = async () => {
        const file = $('vf').files[0];
        const expected = $('ce').value.trim().toLowerCase();
        if (!file || !expected) return setOutput('Choose a file and enter the expected SHA-256.');
        setOutput('Calculating…');
        const actual = await digest('SHA-256', await file.arrayBuffer());
        if (actual === expected) setOutput('<b>MATCH</b><br>SHA-256: <code>' + actual + '</code><br>File integrity verified.', 'success');
        else setOutput('<b>NO MATCH</b><br>Calculated: <code>' + actual + '</code><br>The supplied checksum differs from the file.', 'danger');
      };
      return;
    }

    if (tool === 'encoding') {
      body.innerHTML = '<label class="crypto-label">Input</label><textarea id="edInput" rows="7" placeholder="Enter text or encoded data"></textarea>' +
        '<label class="crypto-label">Encoding</label><select id="edFormat"><option value="base64">Base64</option><option value="hex">Hexadecimal</option><option value="url">URL encoding</option></select>' +
        '<div class="crypto-actions"><button class="crypto-main" id="encodeBtn">Encode →</button><button class="crypto-secondary" id="decodeBtn">Decode →</button></div>' +
        '<div id="co" class="crypto-output">Choose an encoding and operation.</div>';
      $('encodeBtn').onclick = () => {
        const value = $('edInput').value;
        const format = $('edFormat').value;
        try {
          if (format === 'base64') setOutput(bytesToBase64(enc.encode(value)));
          else if (format === 'hex') setOutput(bytesToHex(enc.encode(value)));
          else setOutput(encodeURIComponent(value));
        } catch (e) { setOutput(escapeHtml(e.message)); }
      };
      $('decodeBtn').onclick = () => {
        const value = $('edInput').value;
        const format = $('edFormat').value;
        try {
          if (format === 'base64') setOutput(dec.decode(base64ToBytes(value)));
          else if (format === 'hex') {
            const clean = value.replace(/\s+/g, '');
            if (!clean || clean.length % 2 || !/^[0-9a-f]+$/i.test(clean)) throw new Error('Invalid hexadecimal input.');
            const bytes = new Uint8Array(clean.length / 2);
            for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
            setOutput(dec.decode(bytes));
          } else setOutput(decodeURIComponent(value));
        } catch { setOutput('Invalid input for the selected format.'); }
      };
      return;
    }

    if (tool === 'password') {
      body.innerHTML = '<div class="crypto-mode"><button class="crypto-tool active" id="protectMode">Protect</button><button class="crypto-tool" id="unprotectMode">Unprotect</button></div>' +
        '<label class="crypto-label">Data</label><textarea id="passwordData" rows="7" placeholder="Text to protect"></textarea>' +
        '<label class="crypto-label">Password</label><input id="passwordValue" type="password" placeholder="At least 12 characters">' +
        '<button class="crypto-main" id="passwordGo">Protect →</button><div id="co" class="crypto-output">AES-256-GCM output will appear here.</div>' +
        '<p class="crypto-help">Uses AES-256-GCM with PBKDF2-SHA-256, a random salt and random IV. Processing is local.</p>';
      let decrypt = false;
      $('protectMode').onclick = () => { decrypt = false; $('protectMode').classList.add('active'); $('unprotectMode').classList.remove('active'); $('passwordGo').textContent = 'Protect →'; $('passwordData').placeholder = 'Text to protect'; };
      $('unprotectMode').onclick = () => { decrypt = true; $('unprotectMode').classList.add('active'); $('protectMode').classList.remove('active'); $('passwordGo').textContent = 'Unprotect →'; $('passwordData').placeholder = 'Paste W404-AES1 ciphertext'; };
      $('passwordGo').onclick = async () => {
        const data = $('passwordData').value;
        const password = $('passwordValue').value;
        if (!data) return setOutput('Enter data.');
        if (password.length < 12) return setOutput('Password must be at least 12 characters.');
        setOutput('Processing locally…');
        try {
          if (decrypt) setOutput(escapeHtml(await unprotectText(data, password)));
          else setOutput(escapeHtml(await protectText(data, password)));
        } catch { setOutput('Operation failed. Check the password and W404-AES1 ciphertext.'); }
      };
      return;
    }

    if (tool === 'identify') {
      body.innerHTML = '<label class="crypto-label">Value</label><textarea id="identifyInput" rows="7" placeholder="Paste a hash, encoded value, JWT, W404 ciphertext or token"></textarea>' +
        '<button class="crypto-main" id="identifyBtn">Identify →</button><div id="co" class="crypto-output">Identification is heuristic, not proof of origin.</div>';
      $('identifyBtn').onclick = () => {
        const value = $('identifyInput').value.trim();
        if (!value) return setOutput('Enter a value first.');
        const matches = [];
        if (/^W404-AES1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(value)) matches.push(['W404-AES1', 'Web404 AES-256-GCM password-protected ciphertext']);
        if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) matches.push(['JWT', 'JSON Web Token structure']);
        if (/^[a-f0-9]{32}$/i.test(value)) matches.push(['32 hex characters', 'Could be MD5 or another 128-bit hexadecimal digest']);
        if (/^[a-f0-9]{40}$/i.test(value)) matches.push(['40 hex characters', 'Could be SHA-1 or another 160-bit hexadecimal digest']);
        if (/^[a-f0-9]{64}$/i.test(value)) matches.push(['64 hex characters', 'Could be SHA-256 or another 256-bit hexadecimal digest']);
        if (/^[a-f0-9]{128}$/i.test(value)) matches.push(['128 hex characters', 'Could be SHA-512 or another 512-bit hexadecimal digest']);
        if (/^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0) matches.push(['Base64 candidate', 'Valid-looking Base64 syntax']);
        if (/%[0-9A-F]{2}/i.test(value)) matches.push(['URL encoding', 'Contains percent-encoded bytes']);
        setOutput(matches.length ? matches.map(x => '<div class="crypto-result-row"><b>' + escapeHtml(x[0]) + '</b><span>' + escapeHtml(x[1]) + '</span></div>').join('') : '<b>Unknown</b><br>No supported format matched the supplied value.');
      };
    }
  }

  function setupTabs() {
    const container = document.querySelector('.crypto-tools');
    if (!container) return;
    container.innerHTML = '';
    const tabs = [
      ['hash', 'Text Hash'],
      ['file', 'File Hash / Encode'],
      ['verify', 'Verify Integrity'],
      ['encoding', 'Encoding / Decoding'],
      ['password', 'Password Protect'],
      ['identify', 'Identify Hash / Encryption']
    ];
    tabs.forEach(([id, label], index) => {
      const button = document.createElement('button');
      button.className = 'crypto-tool' + (index === 0 ? ' active' : '');
      button.dataset.cryptoTool = id;
      button.textContent = label;
      button.addEventListener('click', () => {
        container.querySelectorAll('.crypto-tool').forEach(x => x.classList.toggle('active', x === button));
        render(id);
      });
      container.appendChild(button);
    });
    render('hash');
  }

  function init() {
    if ($('cryptoCleanBody')) setupTabs();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();