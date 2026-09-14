(() => {
  'use strict';

  const body = () => document.getElementById('cryptoCleanBody');
  const output = () => document.getElementById('encodingOutput');
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>\"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const clean = String(value).trim().replace(/\s+/g, '');
    if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
      throw new Error('Invalid Base64 input.');
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function hexToBytes(value) {
    const clean = String(value).trim().replace(/\s+/g, '');
    if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) {
      throw new Error('Invalid hexadecimal input.');
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  function encodeHtmlEntities(value) {
    return String(value).replace(/[&<>\"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function decodeHtmlEntities(value) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = String(value);
    return textarea.value;
  }

  function convert(value, format, mode) {
    if (mode === 'encode') {
      if (format === 'base64') return bytesToBase64(encoder.encode(value));
      if (format === 'hex') return bytesToHex(encoder.encode(value));
      if (format === 'url') return encodeURIComponent(value);
      if (format === 'html') return encodeHtmlEntities(value);
    } else {
      if (format === 'base64') return decoder.decode(base64ToBytes(value));
      if (format === 'hex') return decoder.decode(hexToBytes(value));
      if (format === 'url') return decodeURIComponent(value);
      if (format === 'html') return decodeHtmlEntities(value);
    }
    throw new Error('Unsupported format.');
  }

  async function copyResult(button) {
    const text = document.getElementById('encodingResult')?.value ?? '';
    try {
      await navigator.clipboard.writeText(text);
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = old; }, 1200);
    } catch {
      button.textContent = 'Copy failed';
      setTimeout(() => { button.textContent = 'Copy result'; }, 1200);
    }
  }

  function renderEncoding() {
    const target = body();
    if (!target) return;

    target.innerHTML = `
      <div class="crypto-section">
        <label class="crypto-label" for="encodingInput">Input</label>
        <textarea id="encodingInput" rows="8" placeholder="Enter text to encode, or paste encoded data to decode"></textarea>

        <label class="crypto-label" for="encodingFormat">Encoding format</label>
        <select id="encodingFormat">
          <option value="base64">Base64</option>
          <option value="hex">Hexadecimal</option>
          <option value="url">URL Encoding</option>
          <option value="html">HTML Entities</option>
        </select>

        <div class="crypto-actions">
          <button type="button" class="crypto-main" id="encodingEncode">Encode →</button>
          <button type="button" class="crypto-secondary" id="encodingDecode">Decode →</button>
        </div>

        <div id="encodingOutput" class="crypto-output">Choose a format and operation.</div>
        <p class="crypto-help">Encoding changes representation and is reversible. It is not encryption and does not provide confidentiality.</p>
      </div>`;

    const run = mode => {
      const input = document.getElementById('encodingInput').value;
      const format = document.getElementById('encodingFormat').value;
      const out = output();
      if (!input) {
        out.textContent = 'Enter input first.';
        return;
      }
      try {
        const result = convert(input, format, mode);
        out.innerHTML = `<textarea id="encodingResult" rows="8" readonly></textarea><button type="button" class="crypto-secondary" id="copyEncodingResult">Copy result</button>`;
        document.getElementById('encodingResult').value = result;
        document.getElementById('copyEncodingResult').onclick = function () { copyResult(this); };
      } catch (error) {
        out.textContent = error?.message || 'Invalid input for the selected format.';
      }
    };

    document.getElementById('encodingEncode').onclick = () => run('encode');
    document.getElementById('encodingDecode').onclick = () => run('decode');
  }

  function init() {
    const nav = document.querySelector('.crypto-tools');
    if (!nav) return;

    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-ctool="encoding"]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      nav.querySelectorAll('.crypto-tool').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      renderEncoding();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
