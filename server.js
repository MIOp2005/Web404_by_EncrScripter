import express from 'express';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import net from 'node:net';

const app = express();
const PORT = process.env.PORT || 3000;
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

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Web404', version: '1.1.0' }));

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

app.post('/api/dns', async (req, res) => {
  const domain = cleanDomain(req.body?.domain);
  if (!domain) return res.status(400).json({ error: 'Enter a valid domain name.' });
  try {
    const [A, AAAA, MX, NS, TXT] = await Promise.all([
      dns.resolve4(domain).catch(() => []), dns.resolve6(domain).catch(() => []),
      dns.resolveMx(domain).catch(() => []), dns.resolveNs(domain).catch(() => []), dns.resolveTxt(domain).catch(() => [])
    ]);
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
