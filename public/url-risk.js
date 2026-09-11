(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const ipLoggerHosts = new Set(['grabify.link','grabify.icu','iplogger.org','iplogger.com','iplogger.co','2no.co','yip.su','iplog.co','ps3cfw.com','blasze.com','spoty.link','iplis.ru']);
  const shortenerHosts = new Set(['bit.ly','tinyurl.com','t.co','is.gd','ow.ly','cutt.ly','rb.gy','shorturl.at','rebrand.ly']);
  const suspiciousWords = /(?:login|signin|verify|verification|secure|account|update|password|wallet|crypto|gift|bonus|claim|invoice|payment|recover|unlock|confirm|security-check|session-expired)/i;
  const dangerousExt = /\.(?:exe|scr|msi|bat|cmd|com|jar|apk|dmg|iso|ps1|vbs|hta)(?:$|[?#])/i;
  const redirectParams = /^(?:url|uri|u|target|dest|destination|redirect|redirect_url|next|continue|return|returnurl|link|goto)$/i;
  const trackingParams = /^(?:url|ip|ipaddr|ip_address|ref|referrer|track|tracker|click|cid|sid)$/i;
  function hostMatches(host, set) { return set.has(host) || [...set].some(x => host.endsWith('.' + x)); }
  function assess(target, domain, headers) {
    const reasons = []; let score = 0; let highSignal = false; const host = target.hostname.toLowerCase(); const text = target.href; const pathQuery = target.pathname + target.search; const isIp = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(':'); const params = [...target.searchParams.keys()];
    if (hostMatches(host, ipLoggerHosts)) { score += 90; highSignal = true; reasons.push('Hostname matches a known IP-logging/tracking service pattern.'); }
    if (hostMatches(host, shortenerHosts)) { score += 18; reasons.push('Uses a URL-shortening service, which hides the final destination.'); }
    if (target.protocol === 'http:') { score += 12; reasons.push('Uses unencrypted HTTP rather than HTTPS.'); }
    if (target.username || target.password || /@/.test(target.host)) { score += 25; reasons.push('Contains user-info syntax, which can disguise the real destination.'); }
    if (isIp) { score += 18; reasons.push('Uses a raw IP address instead of a normal domain name.'); }
    if (host.startsWith('xn--') || host.includes('.xn--')) { score += 25; reasons.push('Uses punycode, which can be associated with look-alike domains.'); }
    if (/\d{4,}/.test(host)) { score += 5; reasons.push('Hostname contains an unusually long numeric sequence.'); }
    if (host.split('.').filter(Boolean).length >= 5) { score += 10; reasons.push('Has an unusually deep subdomain structure.'); }
    if (target.href.length > 180) { score += 8; reasons.push('URL is unusually long and complex.'); }
    if (target.search.length > 100) { score += 6; reasons.push('Contains a large query string.'); }
    if (dangerousExt.test(target.pathname)) { score += 25; highSignal = true; reasons.push('Path points to a potentially executable download.'); }
    if (suspiciousWords.test(pathQuery)) { score += 12; reasons.push('Contains common credential/payment/social-engineering keywords.'); }
    if (/%00|%0d|%0a|%2e%2e/i.test(text)) { score += 12; reasons.push('Contains suspicious encoded control/path-traversal sequences.'); }
    if ((text.match(/\?/g)||[]).length > 1 || (text.match(/&/g)||[]).length > 8) { score += 7; reasons.push('Contains an unusually complex query structure.'); }
    const redirectKeys = params.filter(k => redirectParams.test(k)); if (redirectKeys.length) { score += 12; reasons.push(`Contains redirect-style parameter${redirectKeys.length > 1 ? 's' : ''}: ${redirectKeys.join(', ')}.`); }
    const trackingKeys = params.filter(k => trackingParams.test(k)); if (trackingKeys.length >= 2) { score += 10; reasons.push('Contains multiple tracking/IP-related query parameters.'); }
    if (privateHosts(host)) { score += 100; highSignal = true; reasons.push('Targets a local/private hostname.'); }
    if (domain?.dnssec === false) { score += 4; reasons.push('DNSSEC was not detected for the hostname.'); }
    if (headers?.score != null && Number(headers.score) < 50) { score += 8; reasons.push('HTTP security-header score is low.'); }
    if (headers?.status >= 400) { score += 5; reasons.push(`The server returned HTTP ${headers.status}.`); }
    if (headers?.status >= 300 && headers?.status < 400) { score += 8; reasons.push('The destination returned a redirect response.'); }
    score = Math.min(100, score);
    let verdict = 'LOW RISK', cls = 'low', summary = 'No strong malicious indicators were detected by the available URL checks.';
    if (highSignal || score >= 70) { verdict = 'HIGH RISK'; cls = 'high'; summary = highSignal ? 'A high-signal indicator was detected. Treat this URL as potentially malicious or unsafe.' : 'Multiple strong suspicious indicators were detected.'; }
    else if (score >= 35) { verdict = 'SUSPICIOUS'; cls = 'medium'; summary = 'Several suspicious indicators were detected. Verify the destination before opening it.'; }
    return { score, verdict, cls, summary, reasons, highSignal };
  }
  function privateHosts(host) { return /^(localhost|.*\.localhost|.*\.local|0\.0\.0\.0|127(?:\.\d{1,3}){3})$/i.test(host); }
  async function analyze() {
    const input = $('urlIntelInput'), output = $('urlIntelResult'); if (!input || !output) return; const raw = input.value.trim();
    if (!raw) { output.innerHTML = '<div class="empty">Enter a URL first.</div>'; return; }
    let target; try { target = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { output.innerHTML = '<div class="empty">Enter a valid HTTP(S) URL.</div>'; return; }
    if (!['http:', 'https:'].includes(target.protocol)) { output.innerHTML = '<div class="empty">Only HTTP(S) URLs are supported.</div>'; return; }
    output.innerHTML = '<div class="empty"><span class="spinner"></span> Running URL risk assessment…</div>';
    let domain = null, headers = null;
    try { const r = await fetch('/api/domain', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({domain:target.hostname}) }); if (r.ok) domain = await r.json(); } catch {}
    try { const r = await fetch('/api/headers', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({url:target.href}) }); if (r.ok) headers = await r.json(); } catch {}
    const risk = assess(target, domain, headers);
    window.web404UrlRisk = { analyzed: true, url: target.href, hostname: target.hostname, score: risk.score, headers: headers ? { score: Number(headers.score), status: Number(headers.status) } : null };
    window.web404UrlObservations = { headers, domain };
    document.dispatchEvent(new CustomEvent('web404:url-risk-updated'));
    const reasons = risk.reasons.length ? `<ul>${risk.reasons.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : '<p>No notable heuristic indicators.</p>';
    const confidence = risk.highSignal || risk.score >= 70 ? 'High' : risk.score >= 35 ? 'Moderate' : 'Limited';
    output.className = 'result'; output.innerHTML = `<div class="url-risk ${risk.cls}"><div class="url-risk-top"><div><small>URL RISK VERDICT</small><strong>${risk.verdict}</strong><p>${esc(risk.summary)}</p></div><div class="risk-score"><b>${risk.score}</b><span>/ 100</span></div></div><div class="risk-meter"><span style="width:${risk.score}%"></span></div><div class="url-risk-grid"><div class="stat"><small>HOST</small><b>${esc(target.hostname)}</b></div><div class="stat"><small>PROTOCOL</small><b>${esc(target.protocol.replace(':','').toUpperCase())}</b></div><div class="stat"><small>DETECTION CONFIDENCE</small><b>${confidence}</b></div><div class="stat"><small>HTTP SIGNAL</small><b>${headers?.score != null ? `${esc(headers.score)}/100` : 'Unavailable'}</b></div></div><div class="risk-reasons"><h3>Why this verdict?</h3>${reasons}</div><div class="risk-disclaimer"><b>Important:</b> This is a defensive URL-risk engine, not a guaranteed malware/reputation verdict. Known IP-loggers and other high-signal tracking infrastructure are flagged strongly, but a normal-looking URL can still be malicious. Do not enter credentials or download files based on this score alone.</div></div>`;
  }
  function init() { const button = $('urlIntelButton'); if (!button) return; button.textContent = 'Check URL Risk →'; button.onclick = analyze; $('urlIntelInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') analyze(); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();