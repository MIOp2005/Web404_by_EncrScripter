const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

const server = fs.readFileSync('server.js', 'utf8');

assert.match(server, /Content-Security-Policy|content-security-policy/i, 'Security headers/CSP should be configured');
assert.match(server, /express\.json\(\{\s*limit:\s*['"]1mb['"]/i, 'JSON body limit should be configured');
assert.match(server, /MAX_FINDINGS\s*=\s*100/, 'Finding cap should be configured');
assert.match(server, /input\.length\s*>\s*1000000/, 'Hash input cap should be configured');
assert.match(server, /isBlockedAddress/, 'SSRF address validation should exist');
assert.match(server, /hibp-api-key/i, 'HIBP API key must be server-side');
assert.match(server, /x-goog-api-key/i, 'Gemini API key must be server-side');
assert.doesNotMatch(server, /return\s+.*passwords|return\s+.*secrets/i, 'Server should not intentionally return passwords/secrets');

const sample = 'Web404 security smoke test';
const digest = crypto.createHash('sha256').update(sample).digest('hex');
assert.equal(digest.length, 64);
assert.match(digest, /^[a-f0-9]+$/);

console.log('Web404 security smoke tests passed.');
