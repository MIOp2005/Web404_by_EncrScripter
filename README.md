# Web404 by EncrScripter

> AI-integrated defensive cybersecurity intelligence toolkit for authorized security research and investigation workflows.

Web404 brings common defensive security utilities into one browser-based workspace. It combines public intelligence lookups, local file analysis, cryptographic utilities, investigation findings, risk context and an AI Cyber Assistant.

## Modules

### 1. IP Intelligence
- Public IPv4 and IPv6 inspection
- Country, region and city context
- ISP, organization and ASN information
- Timezone and reverse-DNS context
- Private and reserved address protection

### 2. Domain & DNS
- A, AAAA, MX, NS and TXT records
- DNSSEC signal
- Certificate Transparency context
- Public certificate names and discovered subdomains

### 3. URL Intelligence
- URL structure inspection
- Hostname, protocol, port and path analysis
- Query-parameter inspection
- Sensitive-looking parameter detection
- Public DNS and HTTP security-header signals

### 4. Hash & Cryptography
- MD5, SHA-1, SHA-256 and SHA-512 hashing
- Encoding and decoding utilities
- File encode/decode utilities
- Password-protection utilities
- Hash/encoding identification
- Client-side cryptographic operations where supported

### 5. Username OSINT
- Username normalization and analysis
- Public-platform search map
- Username variations
- Public web-search links
- GitHub profile checks
- Manual verification workflow

The module is designed for public, authorized research and does not claim a username exists on a service unless the result can be verified.

### 6. File Metadata Analyzer
- Local file property inspection
- MIME type and extension
- File size and modification time
- SHA-256 calculation
- Image dimensions
- Supported embedded JPEG EXIF fields
- Local browser-side analysis

Selected files are not uploaded by the metadata module.

### 7. Investigation Findings
- Create findings from investigation modules
- Severity and confidence
- Evidence and remediation
- Open, In Progress and Resolved status lifecycle
- Evidence editing while a finding is Open
- Individual finding deletion
- Session-based findings storage

Findings are held in server memory and are not intended as permanent storage.

### 8. AI Cyber Assistant
- Gemini-powered defensive analysis
- Uses current Web404 investigation context
- Can analyze findings and module results
- Supports conversational follow-up
- API key remains server-side
- Defensive-use system instructions and input limits
- Does not intentionally invent investigation results when the required evidence is unavailable

## Architecture

Web404 uses a small Node.js/Express backend with a browser-based frontend.

- **Frontend:** HTML, CSS and JavaScript
- **Backend:** Node.js + Express
- **DNS:** Node DNS APIs
- **IP intelligence:** Public IP intelligence provider
- **Certificate intelligence:** Certificate Transparency data
- **Metadata:** Local browser processing
- **AI:** Google Gemini Interactions API
- **Findings:** In-memory server session storage

## AI configuration

The AI assistant requires a Gemini API key on the server.

Create a `.env` file and configure:

```env
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-3.8-flash
```

The API key is used by the backend and is not placed in frontend JavaScript.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

For development with Node's watch mode:

```bash
npm run dev
```

## Security model

Web404 is intended for systems, domains, files and accounts that you own or are explicitly authorized to investigate.

The project is designed around defensive analysis. It does not intentionally provide functionality for credential theft, malware deployment, persistence, evasion, destructive actions, unauthorized access or private personal-data exposure.

Provider/API credentials should remain server-side and should never be committed to the repository.

## Configuration

Current server configuration:

- `GEMINI_API_KEY` — enables the AI Cyber Assistant.
- `GEMINI_MODEL` — Gemini model name; defaults to `gemini-3.8-flash`.
- `PORT` — HTTP port; defaults to `3000`.

There is **no HIBP/Email Breach integration** in the current version.

## Project status

Web404 is an actively developed project by **EncrScripter**. Features may evolve as modules are improved and tested.

## License

Web404 by EncrScripter is distributed under the project's existing license.