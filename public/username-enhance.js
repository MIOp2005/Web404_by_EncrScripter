(() => {
  'use strict';
  const input = document.getElementById('userInput');
  const button = document.getElementById('usernameButton');
  const result = document.getElementById('userResult');
  if (!input || !button || !result) return;
  const esc = value => String(value ?? '').replace(/[&<>\"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
  const encode = value => encodeURIComponent(value);
  const platforms = [
    ['GitHub', u => `https://github.com/${encode(u)}`],
    ['GitLab', u => `https://gitlab.com/${encode(u)}`],
    ['Reddit', u => `https://www.reddit.com/user/${encode(u)}/`],
    ['X', u => `https://x.com/${encode(u)}`],
    ['Instagram', u => `https://www.instagram.com/${encode(u)}/`],
    ['TikTok', u => `https://www.tiktok.com/@${encode(u)}`],
    ['YouTube', u => `https://www.youtube.com/@${encode(u)}`],
    ['Medium', u => `https://medium.com/@${encode(u)}`]
  ];
  function scan(value) {
    const username = value.replace(/^@+/, '').trim();
    const chars = [...username];
    const letters = chars.filter(c => /[A-Za-z]/.test(c)).length;
    const digits = chars.filter(c => /\d/.test(c)).length;
    const symbols = chars.length - letters - digits;
    const normalized = username.toLowerCase();
    const variations = [...new Set([
      normalized,
      normalized.replace(/[._-]+/g, ''),
      normalized.replace(/[._-]+/g, '_'),
      normalized.replace(/[._-]+/g, '-'),
      normalized.replace(/[._-]+/g, '.')
    ])].filter(Boolean).slice(0, 5);
    const rows = platforms.map(([name, make]) => `<div class="username-platform"><span>${esc(name)}</span><span class="username-status">MANUAL CHECK</span><a target="_blank" rel="noopener noreferrer" href="${make(username)}">Open →</a></div>`).join('');
    const searches = variations.map(v => `<a target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=%22${encode(v)}%22">"${esc(v)}" →</a>`).join('');
    result.className = 'result';
    result.innerHTML = `<div class="record"><b>Digital Footprint Analysis</b><br>Public username research workspace. Web404 does not claim an account exists or belongs to a person without verification.</div><div class="result-grid"><div class="stat"><small>NORMALIZED</small><b>${esc(username)}</b></div><div class="stat"><small>LENGTH</small><b>${chars.length}</b></div><div class="stat"><small>LETTERS</small><b>${letters}</b></div><div class="stat"><small>DIGITS</small><b>${digits}</b></div><div class="stat"><small>SYMBOLS</small><b>${symbols}</b></div></div><div class="record"><b>Platform Checks</b><br><small>MANUAL CHECK = a direct public URL is provided; no false FOUND/NOT FOUND claim is made.</small></div><div class="username-platforms">${rows}</div><div class="record"><b>Username Variations</b><br>Potential formatting variants for public-web research. Similar usernames do not prove common ownership.</div><div class="link-grid">${searches}</div><div class="record"><b>Verification Guidance</b><br>Use independent public evidence such as matching profile details or linked websites before concluding that two accounts are related.</div>`;
    window.web404UsernameIntel = { analyzed: true, username, normalized, length: chars.length, letters, digits, symbols, variations, platformCount: platforms.length };
    document.dispatchEvent(new CustomEvent('web404:username-updated'));
  }
  button.addEventListener('click', e => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) { result.className='result'; result.innerHTML='<div class="empty">Enter a username.</div>'; return; }
    scan(value);
  }, true);
})();
