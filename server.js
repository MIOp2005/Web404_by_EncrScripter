import express from 'express';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Web404', version: '1.0.0' }));

app.post('/api/dns', async (req, res) => {
  const domain = String(req.body?.domain || '').trim().replace(/^https?:\/\//, '').split('/')[0];
  if (!domain) return res.status(400).json({ error: 'Enter a domain.' });
  try {
    const [a, aaaa, mx, ns, txt] = await Promise.all([
      dns.resolve4(domain).catch(() => []),
      dns.resolve6(domain).catch(() => []),
      dns.resolveMx(domain).catch(() => []),
      dns.resolveNs(domain).catch(() => []),
      dns.resolveTxt(domain).catch(() => [])
    ]);
    res.json({ domain, A: a, AAAA: aaaa, MX: mx, NS: ns, TXT: txt.flat() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/hash', (req, res) => {
  const input = String(req.body?.input ?? '');
  const algorithms = ['md5', 'sha1', 'sha256', 'sha512'];
  const hashes = Object.fromEntries(algorithms.map(a => [a, crypto.createHash(a).update(input).digest('hex')]));
  res.json({ input, hashes });
});

app.post('/api/headers', async (req, res) => {
  let url = String(req.body?.url || '').trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
    const headers = Object.fromEntries(r.headers.entries());
    const security = ['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'];
    const present = security.filter(k => headers[k]);
    res.json({ url, status: r.status, headers, score: Math.round(present.length / security.length * 100), missing: security.filter(k => !headers[k]) });
  } catch (e) { res.status(400).json({ error: `Could not fetch target: ${e.message}` }); }
});

app.listen(PORT, () => console.log(`Web404 running on http://localhost:${PORT}`));
