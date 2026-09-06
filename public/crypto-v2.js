(() => {
  const $ = id => document.getElementById(id);
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function ensureUI() {
    const hashPanel = $('hash')?.querySelector('.panel');
    if (!hashPanel || $('cryptoPanel')) return;
    const panel = document.createElement('div');
    panel.id = 'cryptoPanel';
    panel.className = 'crypto-panel';
    panel.innerHTML = '<div class="crypto-heading"><div><span class="eyebrow">CRYPTOGRAPHY</span><h2>Encrypt / Decrypt</h2><p>Browser-side AES-256-GCM encryption. Plaintext and passwords are not sent to the server.</p></div><span class="tag">AES-256-GCM</span></div><div class="crypto-tabs" role="tablist" aria-label="Cryptography mode"><button type="button" class="crypto-tab active" data-crypto-mode="encrypt">Encrypt</button><button type="button" class="crypto-tab" data-crypto-mode="decrypt">Decrypt</button></div><label class="crypto-label" for="cryptoInput">Text / Ciphertext</label><textarea id="cryptoInput" rows="5" placeholder="Enter text to encrypt…"></textarea><label class="crypto-label" for="cryptoPassword">Password</label><input id="cryptoPassword" type="password" autocomplete="new-password" placeholder="Use a strong encryption password" /><div class="crypto-actions"><button type="button" id="cryptoRun">Encrypt</button><button type="button" id="cryptoClear" class="crypto-secondary">Clear</button></div><div id="cryptoResult" class="result empty">Encrypted output will appear here.</div><div class="crypto-note">Format: Web404 AES1 package containing salt, IV and ciphertext. Keep the password safe — it cannot be recovered by Web404.</div>';
    hashPanel.appendChild(panel);

    let mode = 'encrypt';
    const input = $('cryptoInput'), password = $('cryptoPassword'), result = $('cryptoResult'), run = $('cryptoRun');
    const setMode = next => { mode = next; document.querySelectorAll('[data-crypto-mode]').forEach(button => button.classList.toggle('active', button.dataset.cryptoMode === mode)); run.textContent = mode === 'encrypt' ? 'Encrypt' : 'Decrypt'; input.placeholder = mode === 'encrypt' ? 'Enter text to encrypt…' : 'Paste Web404 AES1 ciphertext…'; result.textContent = mode === 'encrypt' ? 'Encrypted output will appear here.' : 'Decrypted plaintext will appear here.'; result.className = 'result empty'; };
    document.querySelectorAll('[data-crypto-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.cryptoMode)));
    $('cryptoClear').addEventListener('click', () => { input.value = ''; password.value = ''; setMode(mode); });
    run.addEventListener('click', async () => {
      const value = input.value, secret = password.value;
      if (!value) { result.textContent = mode === 'encrypt' ? 'Enter text to encrypt.' : 'Paste ciphertext to decrypt.'; result.className = 'result empty'; return; }
      if (!secret || secret.length < 12) { result.textContent = 'Use an encryption password of at least 12 characters.'; result.className = 'result empty'; return; }
      run.disabled = true; result.className = 'result empty'; result.textContent = mode === 'encrypt' ? 'Encrypting locally…' : 'Decrypting locally…';
      try { result.textContent = mode === 'encrypt' ? await encrypt(value, secret) : await decrypt(value, secret); result.className = 'result crypto-output'; }
      catch { result.textContent = mode === 'decrypt' ? 'Decryption failed. Check the password and ciphertext.' : 'Cryptography operation failed.'; result.className = 'result empty'; }
      finally { run.disabled = false; }
    });
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:310000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }
  function toBase64(bytes) { let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); }
  function fromBase64(value) { const binary = atob(value); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes; }
  async function encrypt(plaintext, password) { const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await deriveKey(password, salt), ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(plaintext))); return `Web404-AES1.${toBase64(salt)}.${toBase64(iv)}.${toBase64(ciphertext)}`; }
  async function decrypt(packageText, password) { const parts = packageText.trim().split('.'); if (parts.length !== 4 || parts[0] !== 'Web404-AES1') throw new Error('Invalid Web404 AES1 ciphertext format.'); const salt = fromBase64(parts[1]), iv = fromBase64(parts[2]), ciphertext = fromBase64(parts[3]); if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) throw new Error('Invalid ciphertext package.'); const key = await deriveKey(password, salt), plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ciphertext); return dec.decode(plaintext); }
  function loadStyles() { if (document.querySelector('link[data-web404-crypto]')) return; const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/crypto-v2.css'; link.dataset.web404Crypto = '1'; document.head.appendChild(link); }
  function start() { loadStyles(); ensureUI(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();