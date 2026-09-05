import express from 'express';
import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import net from 'node:net';

const app = express();
const PORT = process.env.PORT || 3000;
const HIBP_API_KEY = process.env.HIBP_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const buckets = new Map();
const WINDOW = 60_000;
const LIMIT = 60;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb', strict: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  next();
});
app.use(express.static('public', { dotfiles: 'deny' }));
app.use('/api', (req, res, next) => {
  const now = Date.now(); const key = req.ip || req.socket.remoteAddress || 'unknown'; const bucket = buckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= WINDOW) { bucket.start = now; bucket.count = 0; } bucket.count += 1; buckets.set(key, bucket);
  if (bucket.count > LIMIT) return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' }); next();
});
setInterval(() => { const cutoff = Date.now() - WINDOW * 2; for (const [k, v] of buckets) if (v.start < cutoff) buckets.delete(k); }, WINDOW).unref();
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'Web404', version: '1.8.0', integrations: { hibp: Boolean(HIBP_API_KEY), gemini: Boolean(GEMINI_API_KEY) } }));
function cleanDomain(value) { let domain = String(value || '').trim().replace(/^https?:\/\//i, '').split('/')[0].split('?')[0].replace(/\.$/, '').toLowerCase(); if (domain.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(domain)) return null; return domain; }
function isBlockedAddress(hostname) { const h = hostname.toLowerCase().replace(/^\[|\]$/g, ''); if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h === '0.0.0.0') return true; if (net.isIPv4(h)) { const [a,b] = h.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); } if (net.isIPv6(h)) return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:'); return false; }
function isPublicIP(ip) { return net.isIP(ip) > 0 && !isBlockedAddress(ip); }
function validEmail(email) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
async function resolveDNS(domain) { const [A,AAAA,MX,NS,TXT] = await Promise.all([dns.resolve4(domain).catch(()=>[]),dns.resolve6(domain).catch(()=>[]),dns.resolveMx(domain).catch(()=>[]),dns.resolveNs(domain).catch(()=>[]),dns.resolveTxt(domain).catch(()=>[])]); return {A,AAAA,MX,NS,TXT:TXT.flat()}; }
app.post('/api/ip', async (req,res)=>{const ip=String(req.body?.ip||'').trim();if(!net.isIP(ip))return res.status(400).json({error:'Enter a valid IPv4 or IPv6 address.'});if(!isPublicIP(ip))return res.status(400).json({error:'Private or reserved IP addresses are not supported.'});try{const response=await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();const data=await response.json();if(data.success===false)return res.status(400).json({error:data.message||'IP intelligence lookup failed.'});let reverseDns=[];try{reverseDns=await dns.reverse(ip);}catch{}res.json({ip:data.ip||ip,type:data.type||(net.isIPv4(ip)?'IPv4':'IPv6'),continent:data.continent||null,country:data.country||null,region:data.region||null,city:data.city||null,latitude:data.latitude??null,longitude:data.longitude??null,timezone:data.timezone?.id||null,asn:data.connection?.asn||null,organization:data.connection?.org||null,isp:data.connection?.isp||null,reverseDns});}catch{res.status(502).json({error:'IP intelligence provider is unavailable.'});}});
app.post('/api/breach',async(req,res)=>{if(!HIBP_API_KEY)return res.status(503).json({error:'Email breach checking is not configured. Add HIBP_API_KEY to the server environment.'});const email=String(req.body?.email||'').trim().toLowerCase();if(!validEmail(email))return res.status(400).json({error:'Enter a valid email address.'});try{const response=await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,{headers:{'hibp-api-key':HIBP_API_KEY,'user-agent':'Web404-by-EncrScripter/1.4'},signal:AbortSignal.timeout(8000)});if(response.status===404)return res.json({email,breached:false,breaches:[],breachCount:0});if(response.status===401)return res.status(502).json({error:'Breach provider rejected the configured API key.'});if(response.status===403)return res.status(502).json({error:'Breach provider rejected the request. Check API access and user-agent configuration.'});if(response.status===429)return res.status(429).json({error:'Breach provider rate limit reached. Try again later.'});if(!response.ok)return res.status(502).json({error:'Breach provider is temporarily unavailable.'});const breaches=await response.json();res.json({email,breached:breaches.length>0,breachCount:breaches.length,breaches:breaches.map(b=>({name:b.Name,title:b.Title,domain:b.Domain,breachDate:b.BreachDate,dataClasses:b.DataClasses,verified:b.IsVerified,spamList:b.IsSpamList,malware:b.IsMalware}))});}catch{res.status(502).json({error:'Could not reach the breach intelligence provider.'});}});
app.post('/api/dns',async(req,res)=>{const domain=cleanDomain(req.body?.domain);if(!domain)return res.status(400).json({error:'Enter a valid domain name.'});try{res.json({domain,...(await resolveDNS(domain))});}catch{res.status(400).json({error:'DNS lookup failed.'});}});
app.post('/api/domain',async(req,res)=>{const domain=cleanDomain(req.body?.domain);if(!domain)return res.status(400).json({error:'Enter a valid domain name.'});try{const records=await resolveDNS(domain);let subdomains=[];let certificates=0;try{const r=await fetch(`https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json`,{headers:{'user-agent':'Web404-by-EncrScripter/1.4'},signal:AbortSignal.timeout(10000)});if(r.ok){const rows=await r.json();const names=new Set();for(const row of rows){certificates+=1;for(const raw of String(row.name_value||'').split(/\s+/)){const name=raw.trim().toLowerCase().replace(/^\*\./,'');if(name&&(name===domain||name.endsWith(`.${domain}`))&&name.length<=253)names.add(name);}}subdomains=[...names].sort().slice(0,200);}}catch{}let dnssec=false;try{const r=await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=DNSKEY&do=true`,{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(5000)});if(r.ok){const data=await r.json();dnssec=Boolean(data.AD||(data.Answer||[]).length);}}catch{}res.json({domain,...records,dnssec,certificateCount:certificates,subdomains,sources:['Public DNS','Certificate Transparency']});}catch{res.status(400).json({error:'Domain intelligence lookup failed.'});}});
app.post('/api/hash',(req,res)=>{const input=String(req.body?.input??'');if(input.length>1000000)return res.status(400).json({error:'Input is too large.'});const algorithms=['md5','sha1','sha256','sha512'];const hashes=Object.fromEntries(algorithms.map(a=>[a,crypto.createHash(a).update(input).digest('hex')]));res.json({hashes});});
app.post('/api/headers',async(req,res)=>{let url=String(req.body?.url||'').trim();if(!/^https?:\/\//i.test(url))url=`https://${url}`;let target;try{target=new URL(url);}catch{return res.status(400).json({error:'Enter a valid HTTP(S) URL.'});}if(!['http:','https:'].includes(target.protocol)||target.username||target.password||isBlockedAddress(target.hostname))return res.status(400).json({error:'Target URL is not allowed.'});if(!net.isIP(target.hostname)){try{const addresses=await dns.lookup(target.hostname,{all:true,verbatim:true});if(!addresses.length||addresses.some(a=>isBlockedAddress(a.address)))return res.status(400).json({error:'Target resolves to a restricted network address.'});}catch{return res.status(400).json({error:'Target hostname could not be resolved.'});}}try{const r=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(8000)});const headers=Object.fromEntries(r.headers.entries());const security=['content-security-policy','strict-transport-security','x-content-type-options','x-frame-options','referrer-policy','permissions-policy'];const present=security.filter(k=>headers[k]);res.json({url:target.href,status:r.status,headers,score:Math.round(present.length/security.length*100),missing:security.filter(k=>!headers[k])});}catch{res.status(400).json({error:'Could not fetch target.'});}});

const findings=[]; const MAX_FINDINGS=100;
const FINDING_STATUSES=['open','in-progress','resolved'];
const FINDING_TAGS=['web','dns','email','network','osint','configuration','exposure','hardening'];
app.post('/api/findings',(req,res)=>{const {title,severity,evidence,confidence,source,remediation,status,tags,notes}=req.body||{};const allowed=['info','low','medium','high','critical'];if(!String(title||'').trim()||!allowed.includes(String(severity||'').toLowerCase()))return res.status(400).json({error:'Title and a valid severity are required.'});const clean=v=>String(v||'').trim().slice(0,2000);const cleanTags=Array.isArray(tags)?[...new Set(tags.map(x=>String(x).trim().toLowerCase()).filter(x=>FINDING_TAGS.includes(x)))].slice(0,8):[];const finding={id:crypto.randomUUID(),timestamp:new Date().toISOString(),title:clean(title).slice(0,200),severity:String(severity).toLowerCase(),status:FINDING_STATUSES.includes(String(status||'').toLowerCase())?String(status).toLowerCase():'open',tags:cleanTags,evidence:clean(evidence),confidence:clean(confidence).slice(0,50),source:clean(source).slice(0,200),remediation:clean(remediation),notes:clean(notes)};findings.unshift(finding);if(findings.length>MAX_FINDINGS)findings.pop();res.status(201).json(finding);});
app.patch('/api/findings/:id', (req,res)=>{const finding=findings.find(x=>x.id===req.params.id);if(!finding)return res.status(404).json({error:'Finding not found.'});const body=req.body||{};if(body.status!==undefined){const status=String(body.status).toLowerCase();if(!FINDING_STATUSES.includes(status))return res.status(400).json({error:'Invalid finding status.'});finding.status=status;}if(body.tags!==undefined){if(!Array.isArray(body.tags))return res.status(400).json({error:'Tags must be an array.'});finding.tags=[...new Set(body.tags.map(x=>String(x).trim().toLowerCase()).filter(x=>FINDING_TAGS.includes(x)))].slice(0,8);}if(body.notes!==undefined)finding.notes=String(body.notes).trim().slice(0,2000);if(body.severity!==undefined){const severity=String(body.severity).toLowerCase();if(!['info','low','medium','high','critical'].includes(severity))return res.status(400).json({error:'Invalid severity.'});finding.severity=severity;}res.json(finding);});
app.get('/api/findings',(_req,res)=>res.json({findings}));
app.delete('/api/findings',(_req,res)=>{findings.length=0;res.status(204).end();});

const RISK_SEVERITY={critical:35,high:25,medium:15,low:7,info:2};
const RISK_CONFIDENCE={high:1,medium:0.8,low:0.6};
const RISK_STATUS={open:1,'in-progress':0.65,resolved:0.1};
function riskRating(score){if(score>=80)return'CRITICAL';if(score>=60)return'HIGH';if(score>=40)return'MEDIUM';if(score>=20)return'LOW';return'INFO';}
app.post('/api/risk',(req,res)=>{
  const body=req.body||{};
  const supplied=Array.isArray(body.findings)?body.findings.slice(0,MAX_FINDINGS):[];
  const safeFindings=supplied.filter(f=>f&&['info','low','medium','high','critical'].includes(String(f.severity||'').toLowerCase())).map(f=>({severity:String(f.severity).toLowerCase(),confidence:String(f.confidence||'').toLowerCase(),status:String(f.status||'open').toLowerCase(),source:String(f.source||'').slice(0,100)}));
  let findingScore=0;
  const breakdown={findings:0,header:0,email:0,dnssec:0,total:0};
  for(const f of safeFindings){const confidence=RISK_CONFIDENCE[f.confidence]??0.7;const status=RISK_STATUS[f.status]??1;findingScore+=RISK_SEVERITY[f.severity]*confidence*status;}
  breakdown.findings=Math.round(Math.min(85,findingScore));
  const observations=body.observations&&typeof body.observations==='object'?body.observations:{};
  const header=observations.headers;
  if(header&&Number.isFinite(Number(header.score))){const score=Number(header.score);breakdown.header=score<50?10:score<70?5:0;}
  const email=observations.email;
  if(email?.breached===true)breakdown.email=10;
  const domain=observations.domain;
  if(domain&&domain.dnssec===false)breakdown.dnssec=3;
  const total=Math.max(0,Math.min(100,Math.round(breakdown.findings+breakdown.header+breakdown.email+breakdown.dnssec)));
  breakdown.total=total;
  const recommendations=[];
  if(safeFindings.some(f=>f.severity==='critical'||f.severity==='high')||total>=60)recommendations.push('Prioritize open high-impact findings and validate remediation first.');
  if(breakdown.header>0)recommendations.push('Harden missing HTTP security response headers and verify the resulting policy.');
  if(breakdown.email>0)recommendations.push('Review exposed account credentials through the affected service and enforce password reset/MFA procedures as appropriate.');
  if(breakdown.dnssec>0)recommendations.push('Evaluate DNSSEC deployment for the assessed domain.');
  if(!recommendations.length)recommendations.push('Continue validating findings and maintain current security controls.');
  res.json({score:total,rating:riskRating(total),breakdown,recommendations});
});

const AI_SYSTEM = `You are Web404 AI, a defensive cybersecurity analyst inside an authorized security toolkit. Help users understand security findings, logs, DNS, HTTP headers, hashes, IP intelligence, incident-response concepts, secure coding, threat modeling, and remediation. Keep guidance lawful, defensive, and authorization-aware. Do not provide instructions for credential theft, malware deployment, persistence, evasion, destructive actions, unauthorized access, or exposing private personal data. For potentially dual-use requests, provide safe high-level explanation, detection, validation in a lab, or remediation instead. Be concise and practical. Never claim to have scanned a target or accessed data unless the Web404 application actually supplied that data.`;
app.post('/api/ai', async (req,res)=>{
  if(!GEMINI_API_KEY)return res.status(503).json({error:'AI Assistant is not configured. Add GEMINI_API_KEY to the server environment.'});
  const message=String(req.body?.message||'').trim();
  if(!message)return res.status(400).json({error:'Enter a message.'});
  if(message.length>8000)return res.status(400).json({error:'Message is too long. Keep it under 8,000 characters.'});
  try{
    const response=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{
      method:'POST',
      headers:{'content-type':'application/json','x-goog-api-key':GEMINI_API_KEY},
      body:JSON.stringify({model:GEMINI_MODEL,input:message,system_instruction:AI_SYSTEM,store:false}),
      signal:AbortSignal.timeout(30000)
    });
    if(response.status===401||response.status===403)return res.status(502).json({error:'Gemini rejected the configured API key.'});
    if(response.status===429)return res.status(429).json({error:'Gemini rate limit reached. Try again shortly.'});
    if(!response.ok)return res.status(502).json({error:'Gemini AI service is temporarily unavailable.'});
    const data=await response.json();
    const output=String(data.output_text||'').trim();
    if(!output)return res.status(502).json({error:'Gemini returned no text response.'});
    res.json({reply:output,model:data.model||GEMINI_MODEL});
  }catch{res.status(502).json({error:'Could not reach the Gemini AI service.'});}
});

app.listen(PORT,()=>console.log(`Web404 running on http://localhost:${PORT}`));
