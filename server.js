import express from 'express';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import net from 'node:net';

const app = express();
const PORT = process.env.PORT || 3000;
const HIBP_API_KEY = process.env.HIBP_API_KEY || '';
const buckets = new Map();
const WINDOW = 60_000;
const LIMIT = 60;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.static('public', { dotfiles: 'deny' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});

app.use('/api', (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const bucket = buckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= WINDOW) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > LIMIT) return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
  next();
});
setInterval(() => { const cutoff = Date.now() - WINDOW * 2; for (const [k, v] of buckets) if (v.start < cutoff) buckets.delete(k); }, WINDOW).unref();

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Web404', version: '1.3.0', integrations: { hibp: Boolean(HIBP_API_KEY) } }));

function cleanDomain(value) {
  let domain = String(value || '').trim().replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].replace(/\.$/, '').toLowerCase();
  if (domain.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) return null;
  return domain;
}

function isBlockedAddress(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h === '0.0.0.0') return true;
  if (net.isIPv4(h)) {
    const [a, b] = h.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIPv6(h)) return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:');
  return false;
}

function isPublicIP(ip) { return net.isIP(ip) > 0 && !isBlockedAddress(ip); }

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/api/ip', async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  if (!net.isIP(ip)) return res.status(400).json({ error: 'Enter a valid IPv4 or IPv6 address.' });
  if (!isPublicIP(ip)) return res.status(400).json({ error: 'Private or reserved IP addresses are not supported.' });
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Provider unavailable');
    const data = await response.json();
    if (data.success === false) return res.status(400).json({ error: data.message || 'IP intelligence lookup failed.' });
    let reverseDns = [];
    try { reverseDns = await dns.reverse(ip); } catch {}
    res.json({ ip: data.ip || ip, type: data.type || (net.isIPv4(ip) ? 'IPv4' : 'IPv6'), continent: data.continent || null, country: data.country || null, region: data.region || null, city: data.city || null, latitude: data.latitude ?? null, longitude: data.longitude ?? null, timezone: data.timezone?.id || null, asn: data.connection?.asn || null, organization: data.connection?.org || null, isp: data.connection?.isp || null, reverseDns });
  } catch { res.status(502).json({ error: 'IP intelligence provider is unavailable.' }); }
});

app.post('/api/breach', async (req, res) => {
  if (!HIBP_API_KEY) return res.status(503).json({ error: 'Email breach checking is not configured. Add HIBP_API_KEY to the server environment.' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  try {
    const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
      headers: { 'hibp-api-key': HIBP_API_KEY, 'user-agent': 'Web404-by-EncrScripter/1.3' },
      signal: AbortSignal.timeout(8000)
    });
    if (response.status === 404) return res.json({ email, breached: false, breaches: [] });
    if (response.status === 401) return res.status(502).json({ error: 'Breach provider rejected the configured API key.' });
    if (response.status === 403) return res.status(502).json({ error: 'Breach provider rejected the request. Check API access and user-agent configuration.' });
    if (response.status === 429) return res.status(429).json({ error: 'Breach provider rate limit reached. Try again later.' });
    if (!response.ok) return res.status(502).json({ error: 'Breach provider is temporarily unavailable.' });
    const breaches = await response.json();
    res.json({ email, breached: breaches.length > 0, breachCount: breaches.length, breaches: breaches.map(b => ({ name: b.Name, title: b.Title, domain: b.Domain, breachDate: b.BreachDate, dataClasses: b.DataClasses, verified: b.IsVerified, spamList: b.IsSpamList, malware: b.IsMalware })) });
  } catch { res.status(502).json({ error: 'Could not reach the breach intelligence provider.' }); }
});

app.post('/api/dns', async (req, res) => {
  const domain = cleanDomain(req.body?.domain);
  if (!domain) return res.status(400).json({ error: 'Enter a valid domain name.' });
  try {
    const [A, AAAA, MX, NS, TXT] = await Promise.all([dns.resolve4(domain).catch(() => []), dns.resolve6(domain).catch(() => []), dns.resolveMx(domain).catch(() => []), dns.resolveNs(domain).catch(() => []), dns.resolveTxt(domain).catch(() => [])]);
    res.json({ domain, A, AAAA, MX, NS, TXT: TXT.flat() });
  } catch { res.status(400).json({ error: 'DNS lookup failed.' }); }
});

app.post('/api/hash', (req, res) => {
  const input = String(req.body?.input ?? '');
  if (input.length > 1_000_000) return res.status(400).json({ error: 'Input is too large.' });
  const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];
  const hashes = Object.fromEntries(algorithms.map(a => [a, crypto.createHash(a).update(input).digest('hex')]));
  res.json({ hashes });
});

app.post('/api/headers', async (req, res) => {
  let url = String(req.body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  let target;
  try { target = new URL(url); } catch { return res.status(400).json({ error: 'Enter a valid HTTP(S) URL.' }); }
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || isBlockedAddress(target.hostname)) return res.status(400).json({ error: 'Target URL is not allowed.' });
  if (!net.isIP(target.hostname)) {
    try {
      const addresses = await dns.lookup(target.hostname, { all: true, verbatim: true });
      if (!addresses.length || addresses.some(a => isBlockedAddress(a.address))) return res.status(400).json({ error: 'Target resolves to a restricted network address.' });
    } catch { return res.status(400).json({ error: 'Target hostname could not be resolved.' }); }
  }
  try {
    const r = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    const headers = Object.fromEntries(r.headers.entries());
    const security = ['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'];
    const present = security.filter(k => headers[k]);
    res.json({ url: target.href, status: r.status, headers, score: Math.round(present.length / security.length * 100), missing: security.filter(k => !headers[k]) });
  } catch { res.status(400).json({ error: 'Could not fetch target.' }); }
});

app.listen(PORT, () => console.log(`Web404 running on http://localhost:${PORT}`));
