# Web404 by EncrScripter

> Defensive cybersecurity intelligence toolkit — a focused workspace for authorized security research.

## Modules

- **IP Intelligence** — public IP inspection workspace (provider integration point included).
- **Domain & DNS** — live A, AAAA, MX, NS and TXT resolution.
- **Email Breach** — privacy-safe integration placeholder; no breach data is exposed by the demo.
- **Hash Toolkit** — MD5, SHA-1, SHA-256 and SHA-512 generation.
- **Username OSINT** — structured public-profile search map.
- **Header Scanner** — common HTTP security-header audit.
- **AI Cyber Assistant** — guided defensive security explanations.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Security model

Web404 is designed for systems, domains and accounts you own or have explicit permission to assess. Provider API keys should stay server-side and sensitive lookup data should not be logged or persisted by default.

## Roadmap

1. Add server-side IP intelligence provider adapters.
2. Add a configurable HIBP-compatible breach provider.
3. Add DNS history / certificate transparency adapters.
4. Add report export (JSON/PDF) and investigation history.
5. Add authentication, rate limits, audit logging and deployment hardening.
