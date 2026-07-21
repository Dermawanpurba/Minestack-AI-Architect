# Minestack AI Architect — PRD EDITOR (Vercel + GitHub)

Software blueprint generator (PRD, Tech Stack, Architecture, Database, API, Deployment).

## Keamanan (penting)

| Data | Di mana disimpan | Masuk GitHub? |
|------|------------------|---------------|
| `AI_API_KEY` | Vercel Env → `/api/ai` | ❌ Tidak |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Vercel Env → `/api/auth` | ❌ Tidak |
| `SESSION_SECRET` | Vercel Env | ❌ Tidak |
| Project / dokumen user | Browser `localStorage` | ❌ (lokal device) |

Frontend **tidak** berisi API key atau password admin.

## Struktur repo

```
prd-editor/
├── api/
│   ├── auth.js      # Login server-side (env credentials)
│   ├── ai.js        # Proxy AI (env API key)
│   └── config.js    # Status publik non-secret
├── index.html
├── app.js
├── style.css
├── sample_data.js
├── vercel.json
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

Folder `backend/`, `database/`, `proxy.php` opsional (XAMPP/local). Untuk production Vercel cukup file di atas.

## Deploy ke Vercel (langkah)

### 1. Buat repo GitHub
Upload **isi folder ini** (bukan seluruh `htdocs`).

```bash
cd "PRD EDITOR"
git init
git add index.html app.js style.css sample_data.js api vercel.json package.json .env.example .gitignore README.md
git commit -m "Initial Vercel-ready PRD Editor"
git branch -M main
git remote add origin https://github.com/USER/prd-editor.git
git push -u origin main
```

### 2. Import di Vercel
1. [vercel.com](https://vercel.com) → **Add New Project**
2. Pilih repo `prd-editor`
3. Framework Preset: **Other**
4. Root Directory: `.` (atau subfolder jika monorepo)
5. Build Command: *(kosong)*
6. Output Directory: *(kosong)* — static + `/api`

### 3. Environment Variables (wajib)
Project → **Settings → Environment Variables** — isi dari [`.env.example`](.env.example):

```
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
SESSION_SECRET=...   # openssl rand -hex 32
AI_API_KEY=...
AI_BASE_URL=https://siaptuan.my.id/v1
AI_MODEL=combo1
AI_REQUIRE_AUTH=true
```

Centang Production / Preview / Development sesuai kebutuhan → **Save** → **Redeploy**.

### 4. Login di web
Buka URL Vercel → login dengan `ADMIN_EMAIL` / `ADMIN_PASSWORD` yang Anda set di env.

## API routes

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/api/auth` | `{ action: "login", email, password }` → `{ token, data }` |
| POST | `/api/auth` | `{ action: "me" }` + Bearer token |
| POST | `/api/ai` | Chat completions (butuh Bearer session) |
| GET | `/api/config` | Status config (tanpa secret) |

## Local development

```bash
npm i -g vercel
cp .env.example .env.local   # isi nilai dev
vercel dev
```

Buka URL yang diberikan `vercel dev` (biasanya `http://localhost:3000`).

Alternatif XAMPP: static file tetap bisa dibuka, tapi `/api/*` hanya jalan lewat `vercel dev` atau production Vercel.

## User tambahan

Tanpa database, tambahkan user di env `AUTH_USERS` (JSON array):

```json
[{"email":"user@email.com","password":"UserPass123","name":"User Demo","role":"user"}]
```

## Tech stack options di form
Backend: … + **Google Apps Script**  
Database: … + **MariaDB** + **Google Sheet**

## Catatan
- Jangan commit `.env` / `.env.local`
- Rotate `AI_API_KEY` jika pernah ter-push ke Git
- `proxy.php` hanya untuk XAMPP lama; di Vercel diganti `/api/ai`
