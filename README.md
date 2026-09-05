# Web404 by EncrScripter

> Defensive cybersecurity intelligence toolkit — a focused workspace for authorized security research.

## Modules

- **Dashboard** — investigation overview, active/resolved findings and risk posture.
- **IP Intelligence** — public IP inspection using a server-side provider integration.
- **Domain & DNS** — live A, AAAA, MX, NS and TXT resolution plus certificate-transparency context.
- **Email Breach** — server-side Have I Been Pwned (HIBP) breached-account lookup when `HIBP_API_KEY` is configured. Only breach metadata is returned; passwords and secrets are never exposed.
- **Hash Toolkit** — MD5, SHA-1, SHA-256 and SHA-512 generation without storing plaintext input.
- **Username OSINT** — structured public-profile search map.
- **Header Scanner** — common HTTP security-header audit with SSRF protections.
- **Findings** — investigation findings with status lifecycle, filtering and remediation notes.
- **AI Cyber Assistant** — context-aware defensive security explanations using a server-side Gemini integration.
- **Investigation Reports** — risk-scored report generation and JSON/print export.

## Email Breach integration

Web404's Email Breach module follows the HIBP v3 API model: the API key remains server-side, requests use a descriptive User-Agent, a missing account is treated as a clean lookup, and provider errors/rate limits are surfaced safely. The project does **not** copy or execute the PowerShell module from `originaluko/haveibeenpwned`; it uses the public API directly from the Web404 backend.

The referenced PowerShell project documents that HIBP v3 account lookups require an API key and User-Agent and that its password lookup is a separate capability. fileciteturn215file0 fileciteturn218file0

The reference project is MIT licensed. Its license requires preservation of the copyright/license notice when distributing copies or substantial portions of its software. Web404 does not vendor its source code. fileciteturn220file0

### Configure HIBP

Create a server-side `.env` file from `.env.example` and set:

```env
HIBP_API_KEY=your_key_here
```

Never commit `.env` or paste API keys into source code, frontend JavaScript, GitHub issues, or chat.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Security model

Web404 is designed for systems, domains and accounts you own or have explicit permission to assess. Provider API keys stay server-side. Lookup results are not intentionally persisted by the application. The Email Breach module returns breach metadata only and never returns passwords, authentication secrets, or private personal-data records.

## Configuration

Optional integrations:

- `HIBP_API_KEY` — enables Email Breach lookups.
- `GEMINI_API_KEY` — enables the AI Cyber Assistant.
- `GEMINI_MODEL` — Gemini model name; defaults to `gemini-3.8-flash`.
- `PORT` — HTTP port; defaults to `3000`.

## CI

The repository includes a GitHub Actions security smoke-test workflow. The project currently has no lockfile, so CI intentionally uses `npm install` rather than `npm ci`.

## License

Web404 by EncrScripter is distributed under the project's existing license. Third-party projects referenced for integration patterns retain their own licenses.
