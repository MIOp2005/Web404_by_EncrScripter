(() => {
  const $ = id => document.getElementById(id);
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function escapeHtml(value) {
    return String(value).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  }

  function ensureUI() {
    const hashSection = $('hash');
    const hashPanel = hashSection?.querySelector('.panel');
    if (!hashPanel || $('cryptoPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'cryptoPanel';
    panel.className = 'crypto-panel';
    panel.innerHTML = `
      <div class="crypto-heading">
        <div><span class="eyebrow">CRYPTOGRAPHY</span><h2>Encrypt / Decrypt</h2><p>Browser-side AES-256-GCM encryption. Plaintext and passwords are not sent to the server.</p></div>
        <span class="tag">AES-256-GCM</span>
      </div>
      <div class="crypto-tabs" role="tablist" aria-label="Cryptography mode">
        <button type="button" class="crypto-tab active" data-crypto-mode="encrypt">Encrypt</button>
        <button type="button" class="crypto-tab" data-crypto-mode="decrypt">Decrypt</button>
      </div>
      <label class="crypto-label" for="cryptoInput">Text / Ciphertext</label>
      <textarea id="cryptoInput" rows="5" placeholder="Enter text to encrypt…"></textarea>
      <label class="crypto-label" for="cryptoPassword">Password</label>
      <input id="cryptoPassword" type="password" autocomplete="new-password" placeholder="Use a strong encryption password" />
      <div class="crypto-actions"><button type="button" id="cryptoRun">Encrypt</button><button type="button" id="cryptoClear" class="crypto-secondary">Clear</button></div>
      <div id="cryptoResult" class="result empty">Encrypted output will appear here.</div>
      <div class="crypto-note">Format: Web404 AES1 package containing salt, IV and ciphertext. Keep the password safe — it cannot be recovered by Web404.</div>`;
    hashPanel.appendChild(panel);

    let mode = 'encrypt';
    const input = $('cryptoInput');
    const password = $('cryptoPassword');
    const result = $('cryptoResult');
    const run = $('cryptoRun');

    function setMode(next) {
      mode = next;
      document.querySelectorAll('[data-crypto-mode]').forEach(button => button.classList.toggle('active', button.dataset.cryptoMode === mode));
      run.textContent = mode === 'encrypt' ? 'Encrypt' : 'Decrypt';
      input.placeholder = mode === 'encrypt' ? 'Enter text to encrypt…' : 'Paste Web404 AES1 ciphertext…';
      result.textContent = mode === 'encrypt' ? 'Encrypted output will appear here.' : 'Decrypted plaintext will appear here.';
      result.className = 'result empty';
    }

    document.querySelectorAll('[data-crypto-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.cryptoMode)));
    $('cryptoClear').addEventListener('click', () => { input.value = ''; password.value = ''; result.textContent = mode === 'encrypt' ? 'Encrypted output will appear here.' : 'Decrypted plaintext will appear here.'; result.className = 'result empty'; });
    run.addEventListener('click', async () => {
      const value = input.value;
      const secret = password.value;
      if (!value) { result.textContent = mode === 'encrypt' ? 'Enter text to encrypt.' : 'Paste ciphertext to decrypt.'; result.className = 'result empty'; return; }
      if (!secret || secret.length < 12) { result.textContent = 'Use an encryption password of at least 12 characters.'; result.className = 'result empty'; return; }
      run.disabled = true;
      result.className = 'result empty';
      result.textContent = mode === 'encrypt' ? 'Encrypting locally…' : 'Decrypting locally…';
      try {
        result.textContent = mode === 'encrypt' ? await encrypt(value, secret) : await decrypt(value, secret);
        result.className = 'result crypto-output';
      } catch (error) {
        result.textContent = error instanceof DOMException && mode === 'decrypt' ? 'Decryption failed. Check the password and ciphertext.' : (error.message || 'Cryptography operation failed.');
        result.className = 'result empty';
      } finally { run.disabled = false; }
    });
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2', salt, iterations:310000, hash:'SHA-256'}, material, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
  }

  function toBase64(bytes) {
    let binary = ''; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(binary);
  }
  function fromBase64(value) {
    const binary = atob(value); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  async function encrypt(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(plaintext)));
    return `Web404-AES1.${toBase64(salt)}.${toBase64(iv)}.${toBase64(ciphertext)}`;
  }

  async function decrypt(packageText, password) {
    const parts = packageText.trim().split('.');
    if (parts.length !== 4 || parts[0] !== 'Web404-AES1') throw new Error('Invalid Web404 AES1 ciphertext format.');
    const salt = fromBase64(parts[1]);
    const iv = fromBase64(parts[2]);
    const ciphertext = fromBase64(parts[3]);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) throw new Error('Invalid ciphertext package.');
    const key = await deriveKey(password, salt);
    const plaintext = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, ciphertext);
    return dec.decode(plaintext);
  }

  function addStyles() {
    if ($('cryptoV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'cryptoV2Styles';
    style.textContent = `.crypto-panel{margin-top:18px;border:1px solid var(--line);background:#0c1016;padding:24px}.crypto-heading{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.crypto-heading h2{margin:0 0 6px;font-size:18px}.crypto-heading p{margin:0;color:#697486;font-size:11px;line-height:1.5}.crypto-tabs{display:flex;gap:8px;margin:20px 0 14px}.crypto-tab{border:1px solid var(--line);background:#10141b;color:#8792a3;padding:10px 18px;font:600 10px 'JetBrains Mono';cursor:pointer}.crypto-tab.active{background:var(--accent);border-color:var(--accent);color:#0a0d0a}.crypto-label{display:block;margin:12px 0 7px;color:#667083;font:600 9px 'JetBrains Mono';text-transform:uppercase}.crypto-actions{display:flex;gap:8px;margin-top:10px}.crypto-actions button{border:1px solid #b7ff5c;background:var(--accent);color:#0a0d0a;padding:11px 18px;border-radius:4px;font:700 10px 'JetBrains Mono';cursor:pointer}.crypto-actions button:disabled{opacity:.55;cursor:wait}.crypto-actions .crypto-secondary{background:transparent;color:#8993a5;border-color:var(--line)}.crypto-output{font-family:'JetBrains Mono';white-space:pre-wrap;word-break:break-all;color:#cbd4df}.crypto-note{margin-top:12px;color:#596475;font-size:10px;line-height:1.5}@media(max-width:700px){.crypto-heading{flex-direction:column}}`;
    document.head.appendChild(style);
  }

  function start() { addStyles(); ensureUI(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();